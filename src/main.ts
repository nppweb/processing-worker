import type { ConsumeMessage } from "amqplib";
import { sendToBackend } from "./backend-client";
import { config } from "./config";
import { createSchemaValidators } from "./contracts/schema-validator";
import { QueueClient } from "./messaging/queue-client";
import { normalizeRawEvent } from "./normalize";
import type { RawSourceEvent } from "./types";

async function bootstrap(): Promise<void> {
  const queue = new QueueClient(config.rabbitmqUrl);
  const validators = createSchemaValidators(config.sharedContractsDir);

  await queue.init();
  await queue.assertQueue(config.queueRaw);
  await queue.assertQueue(config.queueNormalized);

  console.log("[processing-worker] запущен", {
    queueRaw: config.queueRaw,
    queueNormalized: config.queueNormalized,
    apiGraphqlUrl: config.apiGraphqlUrl
  });

  queue.consume(config.queueRaw, async (message: ConsumeMessage) => {
    const raw = queue.parseMessage<RawSourceEvent>(message);
    validators.validateRaw(raw);

    const normalized = normalizeRawEvent(raw);
    validators.validateNormalized(normalized);

    await queue.publish(config.queueNormalized, normalized);
    await sendToBackend(config.apiGraphqlUrl, normalized);

    console.log(`[processing-worker] обработано событие ${raw.eventId}`);
  });
}

void bootstrap().catch((error) => {
  console.error("[processing-worker] фатальная ошибка", error);
  process.exit(1);
});
