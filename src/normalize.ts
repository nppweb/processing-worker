import type { NormalizedSourceEvent, RawSourceEvent } from "./types";

export function normalizeRawEvent(input: RawSourceEvent): NormalizedSourceEvent {
  if (input.source === "easuz") {
    return normalizeEasuzRawEvent(input);
  }
  if (input.source === "gistorgi") {
    return normalizeGistorgiRawEvent(input);
  }
  if (input.source === "fns") {
    return normalizeFnsRawEvent(input);
  }
  if (input.source === "fedresurs") {
    return normalizeFedresursRawEvent(input);
  }
  if (input.source === "eis") {
    return normalizeEisRawEvent(input);
  }
  if (input.source === "rnp") {
    return normalizeRnpRawEvent(input);
  }

  const raw = input.raw;

  const toStringOrUndefined = (value: unknown): string | undefined =>
    typeof value === "string" && value.trim() ? value : undefined;

  const toNumberOrUndefined = (value: unknown): number | undefined =>
    typeof value === "number" && Number.isFinite(value) ? value : undefined;

  const title = toStringOrUndefined(raw.title) ?? "Untitled procurement";
  const externalId =
    toStringOrUndefined(raw.externalId) ??
    toStringOrUndefined(raw.ocid) ??
    toStringOrUndefined(raw.noticeNumber) ??
    `${input.source}-${input.eventId}`;

  return {
    eventId: input.eventId,
    runKey: input.runKey,
    source: input.source,
    entityType: "procurement",
    payloadVersion: "v1",
    externalId,
    title,
    description: toStringOrUndefined(raw.description),
    customer: toStringOrUndefined(raw.customer) ?? toStringOrUndefined(raw.buyer),
    supplier: toStringOrUndefined(raw.supplier),
    amount: toNumberOrUndefined(raw.amount),
    currency: toStringOrUndefined(raw.currency) ?? "RUB",
    publishedAt: toStringOrUndefined(raw.publishedAt) ?? input.collectedAt,
    deadlineAt: toStringOrUndefined(raw.deadlineAt),
    normalizedAt: new Date().toISOString(),
    sourceUrl: input.url,
    status: "ACTIVE",
    rawRef: input.url,
    rawEvent: {
      eventId: input.eventId,
      runKey: input.runKey,
      collectedAt: input.collectedAt,
      url: input.url,
      artifacts: input.artifacts
    }
  };
}

function normalizeEisRawEvent(input: RawSourceEvent): NormalizedSourceEvent {
  const raw = input.raw;
  const externalId =
    toStringOrUndefined(raw.externalId) ??
    toStringOrUndefined(raw.registrationNumber) ??
    `${input.source}-${input.eventId}`;
  const title = toStringOrUndefined(raw.title) ?? "Закупка ЕИС";
  const sourceUrl =
    toStringOrUndefined(raw.externalUrl) ??
    toStringOrUndefined(raw.sourcePageUrl) ??
    input.url;

  return {
    eventId: input.eventId,
    runKey: input.runKey,
    source: input.source,
    entityType: "procurement",
    payloadVersion: "v1",
    externalId,
    title,
    description: toStringOrUndefined(raw.description),
    customer: toStringOrUndefined(raw.customerName),
    supplier: undefined,
    amount: toNumberOrUndefined(raw.initialPrice),
    currency: toStringOrUndefined(raw.currency) ?? "RUB",
    publishedAt: toStringOrUndefined(raw.publishedAt) ?? input.collectedAt,
    deadlineAt: toStringOrUndefined(raw.applicationDeadline),
    normalizedAt: new Date().toISOString(),
    sourceUrl,
    status: normalizeEisStatus(toStringOrUndefined(raw.status)),
    rawRef: toStringOrUndefined(raw.rawArtifactUrl) ?? sourceUrl,
    rawEvent: {
      eventId: input.eventId,
      runKey: input.runKey,
      collectedAt: input.collectedAt,
      url: input.url,
      artifacts: input.artifacts
    }
  };
}

function normalizeEasuzRawEvent(input: RawSourceEvent): NormalizedSourceEvent {
  const raw = input.raw;
  const externalId =
    toStringOrUndefined(raw.externalId) ??
    toStringOrUndefined(raw.registryNumber) ??
    `${input.source}-${input.eventId}`;
  const sourceUrl =
    toStringOrUndefined(raw.externalUrl) ??
    toStringOrUndefined(raw.sourcePageUrl) ??
    input.url;

  return {
    eventId: input.eventId,
    runKey: input.runKey,
    source: input.source,
    entityType: "procurement",
    payloadVersion: "v1",
    externalId,
    title: toStringOrUndefined(raw.title) ?? "Закупка ЕАСУЗ",
    description: toStringOrUndefined(raw.description),
    customer: toStringOrUndefined(raw.customerName),
    supplier: undefined,
    amount: toNumberOrUndefined(raw.initialPrice),
    currency: toStringOrUndefined(raw.currency) ?? "RUB",
    publishedAt: toStringOrUndefined(raw.publishedAt) ?? input.collectedAt,
    deadlineAt: toStringOrUndefined(raw.applicationDeadline),
    normalizedAt: new Date().toISOString(),
    sourceUrl,
    status: normalizeEisStatus(toStringOrUndefined(raw.status)),
    rawRef: toStringOrUndefined(raw.rawArtifactUrl) ?? sourceUrl,
    sourceSpecificData: {
      sourceType: "procurement",
      portalName: "ЕАСУЗ Московской области",
      customerInn: toStringOrUndefined(raw.customerInn),
      registryNumber: toStringOrUndefined(raw.registryNumber),
      eisRegistrationNumber: toStringOrUndefined(raw.eisRegistrationNumber),
      procurementType: toStringOrUndefined(raw.procurementType),
      platformName: toStringOrUndefined(raw.platformName),
      region: toStringOrUndefined(raw.region),
      collectedAt: toStringOrUndefined(raw.collectedAt) ?? input.collectedAt
    },
    rawEvent: {
      eventId: input.eventId,
      runKey: input.runKey,
      collectedAt: input.collectedAt,
      url: input.url,
      artifacts: input.artifacts
    }
  };
}

function toStringOrUndefined(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value : undefined;
}

function toNumberOrUndefined(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function normalizeEisStatus(status: string | undefined): NormalizedSourceEvent["status"] {
  const normalized = (status ?? "").toLowerCase();

  if (normalized.includes("заверш")) {
    return "CLOSED";
  }

  if (normalized.includes("архив")) {
    return "ARCHIVED";
  }

  if (normalized.includes("подготов") || normalized.includes("чернов")) {
    return "DRAFT";
  }

  return "ACTIVE";
}

function normalizeRnpRawEvent(input: RawSourceEvent): NormalizedSourceEvent {
  const raw = input.raw;
  const externalId =
    toStringOrUndefined(raw.externalId) ??
    toStringOrUndefined(raw.registryNumber) ??
    `${input.source}-${input.eventId}`;
  const supplierName = toStringOrUndefined(raw.supplierName);
  const customerName = toStringOrUndefined(raw.customerName);
  const sourceUrl =
    toStringOrUndefined(raw.externalUrl) ??
    toStringOrUndefined(raw.sourcePageUrl) ??
    input.url;
  const inclusionDate = toStringOrUndefined(raw.inclusionDate);
  const exclusionDate = toStringOrUndefined(raw.exclusionDate);
  const decisionDate = toStringOrUndefined(raw.decisionDate);
  const registryStatus = toStringOrUndefined(raw.registryStatus);
  const legalBasis = toStringOrUndefined(raw.legalBasis);
  const region = toStringOrUndefined(raw.region);
  const reason = toStringOrUndefined(raw.reason);

  return {
    eventId: input.eventId,
    runKey: input.runKey,
    source: input.source,
    entityType: "registry",
    payloadVersion: "v1",
    externalId,
    title: supplierName ?? `Запись РНП ${externalId}`,
    description: reason,
    customer: customerName,
    supplier: supplierName,
    supplierInn: toStringOrUndefined(raw.supplierInn),
    supplierOgrn: toStringOrUndefined(raw.supplierOgrn),
    publishedAt: inclusionDate ?? decisionDate ?? input.collectedAt,
    deadlineAt: undefined,
    decisionDate,
    inclusionDate,
    exclusionDate,
    normalizedAt: new Date().toISOString(),
    sourceUrl,
    status: normalizeRegistryStatus(registryStatus, exclusionDate),
    registryStatus,
    legalBasis,
    region,
    rawRef: toStringOrUndefined(raw.rawArtifactUrl) ?? sourceUrl,
    sourceSpecificData: {
      sourceType: "registry",
      reason,
      customerName,
      collectedAt: toStringOrUndefined(raw.collectedAt) ?? input.collectedAt
    },
    rawEvent: {
      eventId: input.eventId,
      runKey: input.runKey,
      collectedAt: input.collectedAt,
      url: input.url,
      artifacts: input.artifacts
    }
  };
}

function normalizeRegistryStatus(
  registryStatus: string | undefined,
  exclusionDate: string | undefined
): NormalizedSourceEvent["status"] {
  const normalized = (registryStatus ?? "").toLowerCase();

  if (normalized.includes("исключ")) {
    return "CLOSED";
  }

  if (exclusionDate) {
    const exclusionAt = new Date(exclusionDate);
    if (Number.isFinite(exclusionAt.getTime()) && exclusionAt.getTime() <= Date.now()) {
      return "CLOSED";
    }
  }

  if (normalized.includes("архив")) {
    return "ARCHIVED";
  }

  return "ACTIVE";
}

function normalizeFedresursRawEvent(input: RawSourceEvent): NormalizedSourceEvent {
  const raw = input.raw;
  const externalId =
    toStringOrUndefined(raw.externalId) ??
    toStringOrUndefined(raw.messageId) ??
    `${input.source}-${input.eventId}`;
  const supplier = toStringOrUndefined(raw.subjectName);
  const messageType = toStringOrUndefined(raw.messageType);
  const bankruptcyStage = toStringOrUndefined(raw.bankruptcyStage);
  const title = toStringOrUndefined(raw.title) ?? messageType ?? `Сигнал Федресурса ${externalId}`;
  const description = toStringOrUndefined(raw.description);
  const sourceUrl =
    toStringOrUndefined(raw.externalUrl) ??
    toStringOrUndefined(raw.sourcePageUrl) ??
    input.url;

  return {
    eventId: input.eventId,
    runKey: input.runKey,
    source: input.source,
    entityType: "risk_signal",
    payloadVersion: "v1",
    externalId,
    title,
    description,
    supplier,
    supplierInn: toStringOrUndefined(raw.subjectInn),
    supplierOgrn: toStringOrUndefined(raw.subjectOgrn),
    messageType,
    publishedAt: toStringOrUndefined(raw.publishedAt) ?? input.collectedAt,
    eventDate: toStringOrUndefined(raw.eventDate),
    normalizedAt: new Date().toISOString(),
    sourceUrl,
    status: "ACTIVE",
    bankruptcyStage,
    caseNumber: toStringOrUndefined(raw.caseNumber),
    courtName: toStringOrUndefined(raw.courtName),
    riskLevel: deriveFedresursRiskLevel({
      messageType,
      bankruptcyStage,
      title,
      description
    }),
    rawRef: toStringOrUndefined(raw.rawArtifactUrl) ?? sourceUrl,
    sourceSpecificData: {
      sourceType: "bankruptcy",
      collectedAt: toStringOrUndefined(raw.collectedAt) ?? input.collectedAt
    },
    rawEvent: {
      eventId: input.eventId,
      runKey: input.runKey,
      collectedAt: input.collectedAt,
      url: input.url,
      artifacts: input.artifacts
    }
  };
}

function deriveFedresursRiskLevel(input: {
  messageType?: string;
  bankruptcyStage?: string;
  title?: string;
  description?: string;
}): NormalizedSourceEvent["riskLevel"] {
  const haystack = [
    input.messageType,
    input.bankruptcyStage,
    input.title,
    input.description
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  if (
    haystack.includes("банкрот") ||
    haystack.includes("несостоятель") ||
    haystack.includes("ликвидац") ||
    haystack.includes("конкурс")
  ) {
    return "CRITICAL";
  }

  if (
    haystack.includes("наблюден") ||
    haystack.includes("внешн") ||
    haystack.includes("финансов") ||
    haystack.includes("торг") ||
    haystack.includes("имуществ")
  ) {
    return "HIGH";
  }

  if (haystack.includes("реорганизац") || haystack.includes("уведомлен")) {
    return "MEDIUM";
  }

  return "MEDIUM";
}

function normalizeFnsRawEvent(input: RawSourceEvent): NormalizedSourceEvent {
  const raw = input.raw;
  const externalId =
    toStringOrUndefined(raw.externalId) ??
    toStringOrUndefined(raw.ogrn) ??
    toStringOrUndefined(raw.inn) ??
    `${input.source}-${input.eventId}`;
  const companyName = toStringOrUndefined(raw.companyName);
  const shortName = toStringOrUndefined(raw.shortName);
  const companyStatus = toStringOrUndefined(raw.status);
  const sourceUrl =
    toStringOrUndefined(raw.externalUrl) ??
    toStringOrUndefined(raw.sourcePageUrl) ??
    input.url;

  return {
    eventId: input.eventId,
    runKey: input.runKey,
    source: input.source,
    entityType: "company_profile",
    payloadVersion: "v1",
    externalId,
    title: companyName ?? shortName ?? `Профиль компании ${externalId}`,
    description: shortName && companyName && shortName !== companyName ? shortName : undefined,
    supplier: companyName ?? shortName,
    supplierInn: toStringOrUndefined(raw.inn),
    supplierOgrn: toStringOrUndefined(raw.ogrn),
    shortName,
    kpp: toStringOrUndefined(raw.kpp),
    normalizedAt: new Date().toISOString(),
    sourceUrl,
    status: raw.liquidationMark === true ? "ARCHIVED" : "ACTIVE",
    registrationDate: toStringOrUndefined(raw.registrationDate),
    companyStatus,
    address: toStringOrUndefined(raw.address),
    okved: toStringOrUndefined(raw.okved),
    liquidationMark: raw.liquidationMark === true,
    region: toStringOrUndefined(raw.region),
    rawRef: toStringOrUndefined(raw.rawArtifactUrl) ?? sourceUrl,
    sourceSpecificData: {
      sourceType: "company",
      collectedAt: toStringOrUndefined(raw.collectedAt) ?? input.collectedAt,
      lookupQuery: toStringOrUndefined(raw.lookupQuery)
    },
    rawEvent: {
      eventId: input.eventId,
      runKey: input.runKey,
      collectedAt: input.collectedAt,
      url: input.url,
      artifacts: input.artifacts
    }
  };
}

function normalizeGistorgiRawEvent(input: RawSourceEvent): NormalizedSourceEvent {
  const raw = input.raw;
  const externalId =
    toStringOrUndefined(raw.externalId) ??
    toStringOrUndefined(raw.noticeNumber) ??
    `${input.source}-${input.eventId}`;
  const title = toStringOrUndefined(raw.title) ?? `Торги ${externalId}`;
  const description = toStringOrUndefined(raw.description);
  const organizerName = toStringOrUndefined(raw.organizerName);
  const organizerInn = toStringOrUndefined(raw.organizerInn);
  const sourceUrl =
    toStringOrUndefined(raw.externalUrl) ??
    toStringOrUndefined(raw.sourcePageUrl) ??
    input.url;

  return {
    eventId: input.eventId,
    runKey: input.runKey,
    source: input.source,
    entityType: "auction",
    payloadVersion: "v1",
    externalId,
    title,
    description,
    organizerName,
    organizerInn,
    publishedAt: toStringOrUndefined(raw.publishedAt) ?? input.collectedAt,
    deadlineAt: toStringOrUndefined(raw.applicationDeadline),
    biddingDate: toStringOrUndefined(raw.biddingDate),
    startPrice: toNumberOrUndefined(raw.startPrice),
    currency: toStringOrUndefined(raw.currency),
    normalizedAt: new Date().toISOString(),
    sourceUrl,
    status: normalizeGistorgiStatus(toStringOrUndefined(raw.status)),
    auctionType: toStringOrUndefined(raw.auctionType),
    region: toStringOrUndefined(raw.region),
    lotInfo: toStringOrUndefined(raw.lotInfo),
    rawRef: toStringOrUndefined(raw.rawArtifactUrl) ?? sourceUrl,
    sourceSpecificData: {
      sourceType: "auctions",
      collectedAt: toStringOrUndefined(raw.collectedAt) ?? input.collectedAt
    },
    rawEvent: {
      eventId: input.eventId,
      runKey: input.runKey,
      collectedAt: input.collectedAt,
      url: input.url,
      artifacts: input.artifacts
    }
  };
}

function normalizeGistorgiStatus(status: string | undefined): NormalizedSourceEvent["status"] {
  const normalized = (status ?? "").toLowerCase();

  if (normalized.includes("заверш") || normalized.includes("состоял")) {
    return "CLOSED";
  }

  if (normalized.includes("отмен") || normalized.includes("аннули")) {
    return "ARCHIVED";
  }

  if (normalized.includes("подготов") || normalized.includes("чернов")) {
    return "DRAFT";
  }

  return "ACTIVE";
}
