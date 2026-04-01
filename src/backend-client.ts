import { PoisonMessageError, TransientMessageError, toErrorMessage } from "./errors";
import type { NormalizedSourceEvent } from "./types";

const INGEST_MUTATION = `
mutation IngestNormalizedItem($input: IngestNormalizedItemInput!) {
  ingestNormalizedItem(input: $input) {
    accepted
    idempotencyKey
    procurementId
  }
}
`;

export async function sendToBackend(
  graphqlUrl: string,
  ingestToken: string,
  event: NormalizedSourceEvent
): Promise<void> {
  let response: Response;

  try {
    response = await fetch(graphqlUrl, {
      method: "POST",
      signal: AbortSignal.timeout(10000),
      headers: {
        "content-type": "application/json",
        "x-ingest-token": ingestToken
      },
      body: JSON.stringify({
        query: INGEST_MUTATION,
        variables: {
          input: {
            externalId: event.externalId,
            source: event.source,
            title: event.title,
            description: event.description,
            customer: event.customer,
            supplier: event.supplier,
            amount: event.amount,
            currency: event.currency,
            publishedAt: event.publishedAt,
            deadlineAt: event.deadlineAt,
            payloadVersion: event.payloadVersion,
            sourceUrl: event.sourceUrl,
            status: event.status,
            rawPayload: { rawRef: event.rawRef, eventId: event.eventId },
            rawEvent: event.rawEvent
          }
        }
      })
    });
  } catch (error) {
    throw new TransientMessageError(
      `Backend API is unavailable at ${graphqlUrl}: ${toErrorMessage(error)}`,
      { cause: error }
    );
  }

  if (!response.ok) {
    const message = `Backend API responded with HTTP ${response.status}`;
    if (response.status >= 500 || response.status === 429 || response.status === 408) {
      throw new TransientMessageError(message);
    }

    throw new PoisonMessageError(message);
  }

  let payload: { errors?: Array<{ message: string }> };

  try {
    payload = (await response.json()) as {
      errors?: Array<{ message: string }>;
    };
  } catch (error) {
    throw new TransientMessageError("Backend API returned invalid JSON", { cause: error });
  }

  if (payload.errors?.length) {
    const message = `GraphQL ingest failed: ${payload.errors.map((entry) => entry.message).join("; ")}`;
    if (isPoisonGraphqlError(message)) {
      throw new PoisonMessageError(message);
    }

    throw new TransientMessageError(message);
  }
}

function isPoisonGraphqlError(message: string): boolean {
  const normalized = message.toLowerCase();

  return (
    normalized.includes("unauthorized") ||
    normalized.includes("forbidden") ||
    normalized.includes("invalid") ||
    normalized.includes("bad request") ||
    normalized.includes("validation")
  );
}
