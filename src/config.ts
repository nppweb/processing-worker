import "dotenv/config";

export const config = {
  rabbitmqUrl: process.env.RABBITMQ_URL ?? "amqp://app:app@localhost:5672",
  apiGraphqlUrl: process.env.API_GRAPHQL_URL ?? "http://localhost:3000/graphql",
  queueRaw: process.env.QUEUE_RAW_EVENT ?? "source.raw.v1",
  queueNormalized: process.env.QUEUE_NORMALIZED_EVENT ?? "source.normalized.v1",
  sharedContractsDir: process.env.SHARED_CONTRACTS_DIR ?? "../shared-contracts"
};
