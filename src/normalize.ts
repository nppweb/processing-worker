import { resolveNppStationNameFromText } from "./npp-stations";
import type { NormalizedSourceEvent, RawSourceEvent } from "./types";

const ENTITY_BOILERPLATE_MARKERS = [
  "поделитесь мнением о качестве работы",
  "единая информационная система в сфере закупок",
  "официальные ресурсы",
  "техническая поддержка",
  "ваши идеи по улучшению сайта",
  "отчет о посещаемости",
  "карта сайта",
  "часто задаваемые вопросы",
  "новости поставщикам заказчикам органам контроля",
  "версия hotfix",
  "федеральное казначейство"
];

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
  if (isEisLikeSource(input.source)) {
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
  const publishedAt = toStringOrUndefined(raw.publishedAt) ?? input.collectedAt;
  const customerName = sanitizeEntityName(toStringOrUndefined(raw.customerName));
  const supplierName = sanitizeEntityName(toStringOrUndefined(raw.supplierName));
  const targetStationName =
    toStringOrUndefined(raw.targetStationName) ??
    resolveNppStationNameFromText([
      toStringOrUndefined(raw.title),
      toStringOrUndefined(raw.description),
      customerName,
      supplierName,
      toStringOrUndefined(raw.matchedQuery)
    ]);
  const sourceType = toStringOrUndefined(raw.sourceType) ?? "procurement";

  return {
    eventId: input.eventId,
    runKey: input.runKey,
    source: input.source,
    entityType: "procurement",
    payloadVersion: "v1",
    externalId,
    title,
    description: toStringOrUndefined(raw.description),
    customer: customerName,
    supplier: supplierName,
    amount: toNumberOrUndefined(raw.initialPrice),
    currency: toStringOrUndefined(raw.currency) ?? "RUB",
    publishedAt,
    deadlineAt: toStringOrUndefined(raw.applicationDeadline),
    normalizedAt: new Date().toISOString(),
    sourceUrl,
    status: normalizeEisStatus(toStringOrUndefined(raw.status)),
    rawRef: toStringOrUndefined(raw.rawArtifactUrl) ?? sourceUrl,
    sourceSpecificData: {
      sourceType,
      portalName: toStringOrUndefined(raw.portalName) ?? resolveEisPortalName(input.source),
      matchedQuery: toStringOrUndefined(raw.matchedQuery),
      targetStationName,
      region: toStringOrUndefined(raw.region),
      customerName,
      supplierName,
      collectedAt: toStringOrUndefined(raw.collectedAt) ?? input.collectedAt,
      isNppRelated: Boolean(targetStationName),
      publishedMonth: toMonthKey(publishedAt),
      customerNormalized: normalizeEntityName(customerName),
      supplierNormalized: normalizeEntityName(supplierName),
      analyticsCategory: sourceType === "contract" ? "contract_execution" : "procurement_notice"
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

function isEisLikeSource(source: string): boolean {
  return source === "eis" || source === "eis_contracts" || source === "eis_contracts_223";
}

function resolveEisPortalName(source: string): string {
  if (source === "eis_contracts") {
    return "ЕИС / реестр контрактов 44-ФЗ";
  }

  if (source === "eis_contracts_223") {
    return "ЕИС / реестр договоров 223-ФЗ";
  }

  return "ЕИС / zakupki.gov.ru";
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
  const activeRegistryEntry = normalizeRegistryStatus(registryStatus, exclusionDate) === "ACTIVE";

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
      collectedAt: toStringOrUndefined(raw.collectedAt) ?? input.collectedAt,
      activeRegistryEntry,
      reasonCategory: deriveRegistryReasonCategory(reason, legalBasis),
      supplierNormalized: normalizeEntityName(supplierName),
      customerNormalized: normalizeEntityName(customerName),
      daysUntilExclusion: calculateDaysUntil(exclusionDate)
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
      collectedAt: toStringOrUndefined(raw.collectedAt) ?? input.collectedAt,
      supplierNormalized: normalizeEntityName(supplier),
      riskDomain: deriveFedresursRiskDomain({
        messageType,
        bankruptcyStage,
        title,
        description
      }),
      severityScore: toSeverityScore(
        deriveFedresursRiskLevel({
          messageType,
          bankruptcyStage,
          title,
          description
        })
      )
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
  const registrationDate = toStringOrUndefined(raw.registrationDate);
  const companyAgeYears = calculateCompanyAgeYears(registrationDate);

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
    registrationDate,
    companyStatus,
    address: toStringOrUndefined(raw.address),
    okved: toStringOrUndefined(raw.okved),
    liquidationMark: raw.liquidationMark === true,
    region: toStringOrUndefined(raw.region),
    rawRef: toStringOrUndefined(raw.rawArtifactUrl) ?? sourceUrl,
    sourceSpecificData: {
      sourceType: "company",
      collectedAt: toStringOrUndefined(raw.collectedAt) ?? input.collectedAt,
      lookupQuery: toStringOrUndefined(raw.lookupQuery),
      companyNameNormalized: normalizeEntityName(companyName),
      shortNameNormalized: normalizeEntityName(shortName),
      isActiveCompany: companyStatus ? !companyStatus.toLowerCase().includes("прекращ") : !raw.liquidationMark,
      companyAgeYears,
      profileCompleteness: calculateProfileCompleteness({
        inn: toStringOrUndefined(raw.inn),
        ogrn: toStringOrUndefined(raw.ogrn),
        address: toStringOrUndefined(raw.address),
        okved: toStringOrUndefined(raw.okved),
        region: toStringOrUndefined(raw.region),
        companyStatus
      })
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

function normalizeEntityName(value: string | undefined): string | undefined {
  if (!value) {
    return undefined;
  }

  const normalized = value
    .toLowerCase()
    .replace(/[\"'`«»().,]/g, " ")
    .replace(/\b(ооо|ао|пао|зао|ип|оао|нпо|фгуп|муп|гуп)\b/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  return normalized || undefined;
}

function sanitizeEntityName(value: string | undefined): string | undefined {
  const cleaned = toStringOrUndefined(value)?.replace(/\s+/g, " ").trim();

  if (!cleaned) {
    return undefined;
  }

  const normalized = cleaned.toLowerCase();
  const urlMatches = cleaned.match(/\b(?:https?:\/\/|www\.|[a-z0-9.-]+\.[a-z]{2,})/gi) ?? [];
  const hasBoilerplateMarker = ENTITY_BOILERPLATE_MARKERS.some((marker) =>
    normalized.includes(marker)
  );

  if (
    cleaned.length > 220 ||
    urlMatches.length >= 3 ||
    hasBoilerplateMarker ||
    normalized.includes("официальный сайт единой информационной системы") ||
    normalized.includes("контрактной системе в сфере закупок")
  ) {
    return undefined;
  }

  return cleaned;
}

function toMonthKey(value: string | undefined): string | undefined {
  if (!value) {
    return undefined;
  }

  const parsed = new Date(value);

  if (!Number.isFinite(parsed.getTime())) {
    return undefined;
  }

  return `${parsed.getUTCFullYear()}-${String(parsed.getUTCMonth() + 1).padStart(2, "0")}`;
}

function calculateDaysUntil(value: string | undefined): number | undefined {
  if (!value) {
    return undefined;
  }

  const parsed = new Date(value);

  if (!Number.isFinite(parsed.getTime())) {
    return undefined;
  }

  return Math.ceil((parsed.getTime() - Date.now()) / (24 * 60 * 60 * 1000));
}

function deriveRegistryReasonCategory(reason: string | undefined, legalBasis: string | undefined): string {
  const haystack = [reason, legalBasis].filter(Boolean).join(" ").toLowerCase();

  if (haystack.includes("уклон")) {
    return "EVASION";
  }

  if (haystack.includes("расторж")) {
    return "TERMINATION";
  }

  if (haystack.includes("недостовер")) {
    return "MISREPRESENTATION";
  }

  return "OTHER";
}

function deriveFedresursRiskDomain(input: {
  messageType?: string;
  bankruptcyStage?: string;
  title?: string;
  description?: string;
}): string {
  const haystack = [input.messageType, input.bankruptcyStage, input.title, input.description]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  if (haystack.includes("банкрот") || haystack.includes("несостоятель")) {
    return "BANKRUPTCY";
  }

  if (haystack.includes("ликвидац")) {
    return "LIQUIDATION";
  }

  if (haystack.includes("торг") || haystack.includes("имуществ")) {
    return "ASSET_SALE";
  }

  return "GENERAL";
}

function toSeverityScore(level: NormalizedSourceEvent["riskLevel"] | undefined): number {
  switch (level) {
    case "CRITICAL":
      return 100;
    case "HIGH":
      return 75;
    case "MEDIUM":
      return 50;
    case "LOW":
      return 25;
    default:
      return 0;
  }
}

function calculateCompanyAgeYears(registrationDate: string | undefined): number | undefined {
  if (!registrationDate) {
    return undefined;
  }

  const parsed = new Date(registrationDate);

  if (!Number.isFinite(parsed.getTime())) {
    return undefined;
  }

  return Math.max(0, Math.floor((Date.now() - parsed.getTime()) / (365.25 * 24 * 60 * 60 * 1000)));
}

function calculateProfileCompleteness(input: {
  inn?: string;
  ogrn?: string;
  address?: string;
  okved?: string;
  region?: string;
  companyStatus?: string;
}): number {
  const fields = [input.inn, input.ogrn, input.address, input.okved, input.region, input.companyStatus];
  const filled = fields.filter((item) => Boolean(item)).length;

  return Math.round((filled / fields.length) * 100);
}
