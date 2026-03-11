import type { NormalizedSourceEvent, RawSourceEvent } from "./types";

export function normalizeRawEvent(input: RawSourceEvent): NormalizedSourceEvent {
  const raw = input.raw;

  const toStringOrUndefined = (value: unknown): string | undefined =>
    typeof value === "string" && value.trim() ? value : undefined;

  const toNumberOrUndefined = (value: unknown): number | undefined =>
    typeof value === "number" && Number.isFinite(value) ? value : undefined;

  const title = toStringOrUndefined(raw.title) ?? "Без названия";

  return {
    eventId: input.eventId,
    source: input.source,
    payloadVersion: "v1",
    externalId: `${input.source}-${input.eventId}`,
    title,
    customer: toStringOrUndefined(raw.customer),
    supplier: toStringOrUndefined(raw.supplier),
    amount: toNumberOrUndefined(raw.amount),
    currency: toStringOrUndefined(raw.currency) ?? "RUB",
    publishedAt: toStringOrUndefined(raw.publishedAt) ?? input.collectedAt,
    normalizedAt: new Date().toISOString(),
    rawRef: input.url
  };
}
