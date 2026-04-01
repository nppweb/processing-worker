import "dotenv/config";
import { z } from "zod";

const envSchema = z.object({
  RABBITMQ_URL: z.string().default("amqp://app:app@localhost:5672"),
  API_BASE_URL: z.string().url().optional(),
  API_GRAPHQL_URL: z.string().url().optional(),
  GRAPHQL_PATH: z.string().default("/graphql"),
  API_INGEST_TOKEN: z.string().default("replace_me_ingest_token"),
  QUEUE_RAW_EVENT: z.string().default("source.raw.v1"),
  QUEUE_RETRY_EVENT: z.string().default("source.raw.retry.v1"),
  QUEUE_DEAD_LETTER_EVENT: z.string().default("source.raw.dlq.v1"),
  QUEUE_NORMALIZED_EVENT: z.string().default("source.normalized.v1"),
  SHARED_CONTRACTS_DIR: z.string().default("../shared-contracts"),
  RETRY_ATTEMPTS: z.coerce.number().int().positive().default(5),
  RETRY_BASE_DELAY_MS: z.coerce.number().int().positive().default(5000),
  PREFETCH: z.coerce.number().int().positive().default(10)
});

const parsedEnv = envSchema.parse(process.env);

const apiBaseUrl = parsedEnv.API_BASE_URL ?? "http://localhost:3000";
const graphqlPath = parsedEnv.GRAPHQL_PATH.startsWith("/")
  ? parsedEnv.GRAPHQL_PATH
  : `/${parsedEnv.GRAPHQL_PATH}`;

export const config = {
  ...parsedEnv,
  API_BASE_URL: apiBaseUrl,
  API_GRAPHQL_URL: parsedEnv.API_GRAPHQL_URL ?? new URL(graphqlPath, apiBaseUrl).toString()
};
