import { connect, type Channel, type Connection, type ConsumeMessage } from "amqplib";

export class QueueClient {
  private connection?: Connection;
  private channel?: Channel;

  constructor(private readonly rabbitmqUrl: string) {}

  async init(): Promise<void> {
    this.connection = await connect(this.rabbitmqUrl);
    this.channel = await this.connection.createChannel();
  }

  async assertQueue(queue: string): Promise<void> {
    if (!this.channel) {
      throw new Error("QueueClient не инициализирован");
    }
    await this.channel.assertQueue(queue, { durable: true });
  }

  async publish(queue: string, payload: unknown): Promise<void> {
    if (!this.channel) {
      throw new Error("QueueClient не инициализирован");
    }

    this.channel.sendToQueue(queue, Buffer.from(JSON.stringify(payload)), {
      contentType: "application/json",
      persistent: true
    });
  }

  consume(queue: string, handler: (message: ConsumeMessage) => Promise<void>): void {
    if (!this.channel) {
      throw new Error("QueueClient не инициализирован");
    }

    void this.channel.consume(queue, async (msg) => {
      if (!msg) {
        return;
      }

      try {
        await handler(msg);
        this.channel?.ack(msg);
      } catch (error) {
        console.error("[processing-worker] Ошибка обработки сообщения", error);
        this.channel?.nack(msg, false, false);
      }
    });
  }

  parseMessage<T>(message: ConsumeMessage): T {
    return JSON.parse(message.content.toString("utf-8")) as T;
  }
}
