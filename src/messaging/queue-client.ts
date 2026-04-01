import { connect, type Channel, type ChannelModel, type ConsumeMessage, type Options } from "amqplib";
import { logger } from "../logger";
import { PoisonMessageError } from "../errors";

export class QueueClient {
  private connection?: ChannelModel;
  private channel?: Channel;
  private readonly settledMessages = new WeakSet<ConsumeMessage>();

  constructor(private readonly rabbitmqUrl: string) {}

  async init(prefetch = 10): Promise<void> {
    this.connection = await connect(this.rabbitmqUrl);
    this.channel = await this.connection.createChannel();
    await this.channel.prefetch(prefetch);

    this.connection.on("error", (error) => {
      logger.error({ err: error }, "rabbitmq connection error");
    });
    this.connection.on("close", () => {
      logger.warn("rabbitmq connection closed");
    });
    this.channel.on("error", (error) => {
      logger.error({ err: error }, "rabbitmq channel error");
    });
    this.channel.on("close", () => {
      logger.warn("rabbitmq channel closed");
    });
  }

  async assertQueue(queue: string): Promise<void> {
    await this.getChannel().assertQueue(queue, { durable: true });
  }

  async assertRetryTopology(mainQueue: string, retryQueue: string, deadLetterQueue: string): Promise<void> {
    const channel = this.getChannel();

    await channel.assertQueue(deadLetterQueue, { durable: true });
    await channel.assertQueue(retryQueue, {
      durable: true,
      deadLetterExchange: "",
      deadLetterRoutingKey: mainQueue
    });
    await channel.assertQueue(mainQueue, { durable: true });
  }

  async publish(queue: string, payload: unknown, options?: Options.Publish): Promise<void> {
    const published = this.getChannel().sendToQueue(queue, Buffer.from(JSON.stringify(payload)), {
      contentType: "application/json",
      persistent: true,
      ...options
    });

    if (!published) {
      logger.warn({ queue }, "rabbitmq publish returned false");
    }
  }

  consume(queue: string, handler: (message: ConsumeMessage) => Promise<void>): void {
    const channel = this.getChannel();

    void channel.consume(queue, async (msg) => {
      if (!msg) {
        return;
      }

      try {
        await handler(msg);
      } catch (error) {
        logger.error(
          { err: error, deliveryTag: msg.fields.deliveryTag },
          "message handler threw before settlement"
        );

        if (!this.isSettled(msg)) {
          channel.nack(msg, false, true);
          this.settledMessages.add(msg);
          logger.warn(
            { deliveryTag: msg.fields.deliveryTag },
            "message nacked with requeue after unhandled handler error"
          );
        }
      }
    });
  }

  parseMessage<T>(message: ConsumeMessage): T {
    try {
      return JSON.parse(message.content.toString("utf-8")) as T;
    } catch (error) {
      throw new PoisonMessageError("Invalid JSON payload in RabbitMQ message", { cause: error });
    }
  }

  ack(message: ConsumeMessage): boolean {
    if (this.isSettled(message)) {
      logger.warn({ deliveryTag: message.fields.deliveryTag }, "duplicate message settlement skipped");
      return false;
    }

    this.getChannel().ack(message);
    this.settledMessages.add(message);
    return true;
  }

  async retry(
    message: ConsumeMessage,
    retryQueue: string,
    attempt: number,
    baseDelayMs: number
  ): Promise<boolean> {
    if (this.isSettled(message)) {
      logger.warn({ deliveryTag: message.fields.deliveryTag }, "duplicate retry settlement skipped");
      return false;
    }

    await this.publish(retryQueue, this.getMessagePayload(message), {
      expiration: String(baseDelayMs * 2 ** attempt),
      headers: {
        ...(message.properties.headers ?? {}),
        "x-retry-count": attempt
      }
    });

    return this.ack(message);
  }

  async deadLetter(
    message: ConsumeMessage,
    deadLetterQueue: string,
    reason: string
  ): Promise<boolean> {
    if (this.isSettled(message)) {
      logger.warn({ deliveryTag: message.fields.deliveryTag }, "duplicate dead-letter settlement skipped");
      return false;
    }

    await this.publish(deadLetterQueue, {
      reason,
      failedAt: new Date().toISOString(),
      payload: this.getMessagePayload(message)
    });

    return this.ack(message);
  }

  getRetryCount(message: ConsumeMessage): number {
    const raw = message.properties.headers?.["x-retry-count"];
    return typeof raw === "number" ? raw : Number(raw ?? 0);
  }

  isSettled(message: ConsumeMessage): boolean {
    return this.settledMessages.has(message);
  }

  private getChannel(): Channel {
    if (!this.channel) {
      throw new Error("QueueClient не инициализирован");
    }

    return this.channel;
  }

  private getMessagePayload(message: ConsumeMessage): unknown {
    const body = message.content.toString("utf-8");

    try {
      return JSON.parse(body) as unknown;
    } catch {
      return body;
    }
  }
}
