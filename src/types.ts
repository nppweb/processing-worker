export type RawSourceEvent = {
  eventId: string;
  source: string;
  collectedAt: string;
  url: string;
  payloadVersion: "v1";
  raw: Record<string, unknown>;
};

export type NormalizedSourceEvent = {
  eventId: string;
  source: string;
  payloadVersion: "v1";
  externalId: string;
  title: string;
  customer?: string;
  supplier?: string;
  amount?: number;
  currency?: string;
  publishedAt?: string;
  normalizedAt: string;
  rawRef?: string;
};
