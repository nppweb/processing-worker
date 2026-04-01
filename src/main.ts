import { setTimeout as delay } from "node:timers/promises";
import type { ConsumeMessage } from "amqplib";
import { sendToBackend } from "./backend-client";
import { config } from "./config";
import { createSchemaValidators } from "./contracts/schema-validator";
import { isPoisonMessageError, toErrorMessage } from "./errors";
import { logger } from "./logger";
import { QueueClient } from "./messaging/queue-client";
import { normalizeRawEvent } from "./normalize";
import type { RawSourceEvent } from "./types";

async function bootstrap(): Promise<void> {
  const queue = new QueueClient(config.RABBITMQ_URL);
  const validators = createSchemaValidators(config.SHARED_CONTRACTS_DIR);

  await connectRabbitMq(queue);
  await queue.assertRetryTopology(
    config.QUEUE_RAW_EVENT,
    config.QUEUE_RETRY_EVENT,
    config.QUEUE_DEAD_LETTER_EVENT
  );
  await queue.assertQueue(config.QUEUE_NORMALIZED_EVENT);

  logger.info(
    {
      queueRaw: config.QUEUE_RAW_EVENT,
      queueRetry: config.QUEUE_RETRY_EVENT,
      queueDeadLetter: config.QUEUE_DEAD_LETTER_EVENT,
      queueNormalized: config.QUEUE_NORMALIZED_EVENT,
      apiBaseUrl: config.API_BASE_URL,
      apiGraphqlUrl: config.API_GRAPHQL_URL
    },
    "processing-worker started"
  );

  logger.info({ queue: config.QUEUE_RAW_EVENT }, "consuming queue");

  queue.consume(config.QUEUE_RAW_EVENT, async (message: ConsumeMessage) => {
    const attempt = queue.getRetryCount(message);
    const deliveryTag = message.fields.deliveryTag;

    try {
      const raw = queue.parseMessage<RawSourceEvent>(message);
      validators.validateRaw(raw);
      logger.info(
        { eventId: raw.eventId, source: raw.source, deliveryTag, attempt },
        "raw event validated"
      );

      const normalized = normalizeRawEvent(raw);
      validators.validateNormalized(normalized);
      logger.info(
        {
          eventId: raw.eventId,
          externalId: normalized.externalId,
          source: raw.source,
          deliveryTag,
          attempt
        },
        "normalized event created"
      );

      try {
        await sendToBackend(config.API_GRAPHQL_URL, config.API_INGEST_TOKEN, normalized);
      } catch (error) {
        logger.error(
          {
            err: error,
            eventId: raw.eventId,
            externalId: normalized.externalId,
            source: raw.source,
            deliveryTag,
            attempt
          },
          "ingest failed"
        );
        throw error;
      }

      logger.info(
        { eventId: raw.eventId, externalId: normalized.externalId, source: raw.source, deliveryTag },
        "ingest success"
      );

      await queue.publish(config.QUEUE_NORMALIZED_EVENT, normalized);
      logger.info(
        {
          queue: config.QUEUE_NORMALIZED_EVENT,
          eventId: raw.eventId,
          externalId: normalized.externalId,
          source: raw.source,
          deliveryTag
        },
        "published normalized event"
      );

      queue.ack(message);
      logger.info(
        { eventId: raw.eventId, source: raw.source, externalId: normalized.externalId, deliveryTag },
        "message acknowledged"
      );
    } catch (error) {
      const reason = toErrorMessage(error);
      const deliveryContext = { deliveryTag, attempt, reason };

      if (isPoisonMessageError(error)) {
        await queue.deadLetter(message, config.QUEUE_DEAD_LETTER_EVENT, reason);
        logger.error(
          { err: error, ...deliveryContext, queue: config.QUEUE_DEAD_LETTER_EVENT },
          "message dead-lettered"
        );
        return;
      }

      if (attempt < config.RETRY_ATTEMPTS) {
        const retryAttempt = attempt + 1;
        const delayMs = config.RETRY_BASE_DELAY_MS * 2 ** retryAttempt;
        await queue.retry(message, config.QUEUE_RETRY_EVENT, retryAttempt, config.RETRY_BASE_DELAY_MS);
        logger.warn(
          {
            err: error,
            ...deliveryContext,
            retryAttempt,
            delayMs,
            queue: config.QUEUE_RETRY_EVENT
          },
          "retry scheduled"
        );
        return;
      }

      await queue.deadLetter(message, config.QUEUE_DEAD_LETTER_EVENT, reason);
      logger.error(
        { err: error, ...deliveryContext, queue: config.QUEUE_DEAD_LETTER_EVENT },
        "message dead-lettered"
      );
    }
  });
}

async function connectRabbitMq(queue: QueueClient): Promise<void> {
  let attempt = 0;

  while (true) {
    attempt += 1;

    try {
      await queue.init(config.PREFETCH);
      logger.info(
        { rabbitmqUrl: config.RABBITMQ_URL, prefetch: config.PREFETCH },
        "connected to rabbitmq"
      );
      return;
    } catch (error) {
      const delayMs = Math.min(config.RETRY_BASE_DELAY_MS * 2 ** (attempt - 1), 30000);
      logger.warn(
        { err: error, rabbitmqUrl: config.RABBITMQ_URL, attempt, delayMs },
        "failed to connect to rabbitmq, retrying"
      );
      await delay(delayMs);
    }
  }
}

void bootstrap().catch((error) => {
  logger.error({ err: error }, "processing-worker crashed");
  process.exit(1);
});
