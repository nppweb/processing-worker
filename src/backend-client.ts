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

const INGEST_REGISTRY_MUTATION = `
mutation IngestRegistryRecord($input: IngestRegistryRecordInput!) {
  ingestRegistryRecord(input: $input) {
    accepted
    idempotencyKey
    procurementId
  }
}
`;

const INGEST_SUPPLIER_RISK_SIGNAL_MUTATION = `
mutation IngestSupplierRiskSignal($input: IngestSupplierRiskSignalInput!) {
  ingestSupplierRiskSignal(input: $input) {
    accepted
    idempotencyKey
    procurementId
  }
}
`;

const INGEST_SUPPLIER_COMPANY_PROFILE_MUTATION = `
mutation IngestSupplierCompanyProfile($input: IngestSupplierCompanyProfileInput!) {
  ingestSupplierCompanyProfile(input: $input) {
    accepted
    idempotencyKey
    procurementId
  }
}
`;

const INGEST_AUCTION_ITEM_MUTATION = `
mutation IngestAuctionItem($input: IngestAuctionItemInput!) {
  ingestAuctionItem(input: $input) {
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
  const requestPayload =
    event.entityType === "registry"
      ? createRegistryRequest(event)
      : event.entityType === "risk_signal"
        ? createSupplierRiskSignalRequest(event)
        : event.entityType === "company_profile"
          ? createSupplierCompanyProfileRequest(event)
          : event.entityType === "auction"
            ? createAuctionItemRequest(event)
        : createProcurementRequest(event);
  let response: Response;

  try {
    response = await fetch(graphqlUrl, {
      method: "POST",
      signal: AbortSignal.timeout(10000),
      headers: {
        "content-type": "application/json",
        "x-ingest-token": ingestToken
      },
      body: JSON.stringify(requestPayload)
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

  let responsePayload: { errors?: Array<{ message: string }> };

  try {
    responsePayload = (await response.json()) as {
      errors?: Array<{ message: string }>;
    };
  } catch (error) {
    throw new TransientMessageError("Backend API returned invalid JSON", { cause: error });
  }

  if (responsePayload.errors?.length) {
    const message = `GraphQL ingest failed: ${responsePayload.errors.map((entry) => entry.message).join("; ")}`;
    if (isPoisonGraphqlError(message)) {
      throw new PoisonMessageError(message);
    }

    throw new TransientMessageError(message);
  }
}

function createProcurementRequest(event: NormalizedSourceEvent) {
  return {
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
        rawPayload: {
          rawRef: event.rawRef,
          eventId: event.eventId,
          ...(event.sourceSpecificData ? { sourceSpecificData: event.sourceSpecificData } : {})
        },
        rawEvent: event.rawEvent
      }
    }
  };
}

function createRegistryRequest(event: NormalizedSourceEvent) {
  return {
    query: INGEST_REGISTRY_MUTATION,
    variables: {
      input: {
        externalId: event.externalId,
        source: event.source,
        supplierName: event.supplier ?? event.title,
        supplierInn: event.supplierInn,
        supplierOgrn: event.supplierOgrn,
        registryStatus: event.registryStatus,
        reason: event.description,
        decisionDate: event.decisionDate,
        inclusionDate: event.inclusionDate,
        exclusionDate: event.exclusionDate,
        customerName: event.customer,
        legalBasis: event.legalBasis,
        region: event.region,
        payloadVersion: event.payloadVersion,
        sourceUrl: event.sourceUrl,
        rawPayload: {
          rawRef: event.rawRef,
          eventId: event.eventId,
          ...(event.sourceSpecificData ? { sourceSpecificData: event.sourceSpecificData } : {})
        },
        rawEvent: event.rawEvent
      }
    }
  };
}

function createSupplierRiskSignalRequest(event: NormalizedSourceEvent) {
  return {
    query: INGEST_SUPPLIER_RISK_SIGNAL_MUTATION,
    variables: {
      input: {
        externalId: event.externalId,
        source: event.source,
        supplierName: event.supplier ?? event.title,
        supplierInn: event.supplierInn,
        supplierOgrn: event.supplierOgrn,
        messageType: event.messageType,
        title: event.title,
        description: event.description,
        publishedAt: event.publishedAt,
        eventDate: event.eventDate,
        bankruptcyStage: event.bankruptcyStage,
        caseNumber: event.caseNumber,
        courtName: event.courtName,
        riskLevel: event.riskLevel,
        payloadVersion: event.payloadVersion,
        sourceUrl: event.sourceUrl,
        rawPayload: {
          rawRef: event.rawRef,
          eventId: event.eventId,
          ...(event.sourceSpecificData ? { sourceSpecificData: event.sourceSpecificData } : {})
        },
        rawEvent: event.rawEvent
      }
    }
  };
}

function createSupplierCompanyProfileRequest(event: NormalizedSourceEvent) {
  return {
    query: INGEST_SUPPLIER_COMPANY_PROFILE_MUTATION,
    variables: {
      input: {
        externalId: event.externalId,
        source: event.source,
        companyName: event.supplier ?? event.title,
        shortName: event.shortName,
        inn: event.supplierInn,
        kpp: event.kpp,
        ogrn: event.supplierOgrn,
        companyStatus: event.companyStatus,
        registrationDate: event.registrationDate,
        address: event.address,
        okved: event.okved,
        liquidationMark: event.liquidationMark,
        region: event.region,
        payloadVersion: event.payloadVersion,
        sourceUrl: event.sourceUrl,
        rawPayload: {
          rawRef: event.rawRef,
          eventId: event.eventId,
          ...(event.sourceSpecificData ? { sourceSpecificData: event.sourceSpecificData } : {})
        },
        rawEvent: event.rawEvent
      }
    }
  };
}

function createAuctionItemRequest(event: NormalizedSourceEvent) {
  return {
    query: INGEST_AUCTION_ITEM_MUTATION,
    variables: {
      input: {
        externalId: event.externalId,
        source: event.source,
        title: event.title,
        description: event.description,
        organizerName: event.organizerName,
        organizerInn: event.organizerInn,
        auctionType: event.auctionType,
        status: event.status,
        publishedAt: event.publishedAt,
        applicationDeadline: event.deadlineAt,
        biddingDate: event.biddingDate,
        startPrice: event.startPrice,
        currency: event.currency,
        region: event.region,
        lotInfo: event.lotInfo,
        payloadVersion: event.payloadVersion,
        sourceUrl: event.sourceUrl,
        rawPayload: {
          rawRef: event.rawRef,
          eventId: event.eventId,
          ...(event.sourceSpecificData ? { sourceSpecificData: event.sourceSpecificData } : {})
        },
        rawEvent: event.rawEvent
      }
    }
  };
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
