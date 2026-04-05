import { describe, expect, it } from "vitest";
import { normalizeRawEvent } from "./normalize";
import type { RawSourceEvent } from "./types";

describe("normalizeRawEvent", () => {
  it("normalizes eis payload using procurement-specific fields", () => {
    const input: RawSourceEvent = {
      eventId: "evt-3",
      runKey: "eis-run",
      source: "eis",
      collectedAt: "2026-04-04T10:00:00.000Z",
      url: "https://zakupki.gov.ru/epz/order/notice/ea44/view/common-info.html?regNumber=0373100137626000001",
      payloadVersion: "v1",
      artifacts: [
        {
          kind: "RAW_HTML",
          bucket: "artifacts",
          objectKey: "eis/eis-run/evt-3/notice.html",
          checksum: "abc123"
        }
      ],
      raw: {
        externalId: "0373100137626000001",
        externalUrl:
          "https://zakupki.gov.ru/epz/order/notice/ea44/view/common-info.html?regNumber=0373100137626000001",
        title: "Поставка серверного оборудования",
        customerName: "ФГБУ «Центр цифрового развития»",
        matchedQuery: "Ленинградская атомная станция",
        targetStationName: "Ленинградская атомная станция",
        status: "Подача заявок",
        publishedAt: "2026-04-01T10:15:00+03:00",
        applicationDeadline: "2026-04-10T09:00:00+03:00",
        initialPrice: 1250000,
        currency: "RUB",
        rawArtifactUrl: "http://minio:9000/artifacts/eis/eis-run/evt-3/notice.html"
      }
    };

    const normalized = normalizeRawEvent(input);

    expect(normalized.externalId).toBe("0373100137626000001");
    expect(normalized.title).toBe("Поставка серверного оборудования");
    expect(normalized.customer).toBe("ФГБУ «Центр цифрового развития»");
    expect(normalized.amount).toBe(1250000);
    expect(normalized.deadlineAt).toBe("2026-04-10T09:00:00+03:00");
    expect(normalized.rawRef).toBe("http://minio:9000/artifacts/eis/eis-run/evt-3/notice.html");
    expect(normalized.status).toBe("ACTIVE");
    expect(normalized.sourceSpecificData).toMatchObject({
      portalName: "ЕИС / zakupki.gov.ru",
      matchedQuery: "Ленинградская атомная станция",
      targetStationName: "Ленинградская атомная станция",
      customerName: "ФГБУ «Центр цифрового развития»"
    });
  });

  it("normalizes easuz payload using procurement-specific fields", () => {
    const input: RawSourceEvent = {
      eventId: "evt-easuz-1",
      runKey: "easuz-run",
      source: "easuz",
      collectedAt: "2026-04-04T16:00:00.000Z",
      url: "https://easuz.mosreg.ru/tenders/385716",
      payloadVersion: "v1",
      artifacts: [
        {
          kind: "RAW_HTML",
          bucket: "artifacts",
          objectKey: "easuz/easuz-run/evt-easuz-1/detail.html",
          checksum: "eas123"
        }
      ],
      raw: {
        externalId: "385716",
        externalUrl: "https://easuz.mosreg.ru/tenders/385716",
        title:
          "Поставка расходных материалов для внутрисосудистых ультразвуковых исследований (лот 1)",
        description: "Одноразовые расходные материалы для внутрисосудистых исследований.",
        customerName: "КОМИТЕТ ПО КОНКУРЕНТНОЙ ПОЛИТИКЕ МОСКОВСКОЙ ОБЛАСТИ",
        customerInn: "5024139723",
        status: "Закупка завершена",
        publishedAt: "2024-08-21T15:46:00+03:00",
        applicationDeadline: "2024-08-29T10:00:00+03:00",
        initialPrice: 13658140.27,
        currency: "RUB",
        region: "Московская область",
        registryNumber: "060502-24",
        eisRegistrationNumber: "0148200005424000983",
        procurementType: "Иное по 44-ФЗ",
        platformName: "РТС-тендер",
        rawArtifactUrl: "http://minio:9000/artifacts/easuz/easuz-run/evt-easuz-1/detail.html"
      }
    };

    const normalized = normalizeRawEvent(input);

    expect(normalized.entityType).toBe("procurement");
    expect(normalized.externalId).toBe("385716");
    expect(normalized.customer).toBe("КОМИТЕТ ПО КОНКУРЕНТНОЙ ПОЛИТИКЕ МОСКОВСКОЙ ОБЛАСТИ");
    expect(normalized.amount).toBe(13658140.27);
    expect(normalized.deadlineAt).toBe("2024-08-29T10:00:00+03:00");
    expect(normalized.status).toBe("CLOSED");
    expect(normalized.rawRef).toBe(
      "http://minio:9000/artifacts/easuz/easuz-run/evt-easuz-1/detail.html"
    );
    expect(normalized.sourceSpecificData).toMatchObject({
      portalName: "ЕАСУЗ Московской области",
      customerInn: "5024139723",
      registryNumber: "060502-24",
      eisRegistrationNumber: "0148200005424000983",
      procurementType: "Иное по 44-ФЗ",
      platformName: "РТС-тендер"
    });
  });

  it("normalizes rnp payload using registry-specific fields", () => {
    const input: RawSourceEvent = {
      eventId: "evt-4",
      runKey: "rnp-run",
      source: "rnp",
      collectedAt: "2026-04-04T11:00:00.000Z",
      url: "https://zakupki.gov.ru/epz/dishonestsupplier/view/info.html?dishonestSupplierId=12345678",
      payloadVersion: "v1",
      artifacts: [
        {
          kind: "RAW_HTML",
          bucket: "artifacts",
          objectKey: "rnp/rnp-run/evt-4/detail.html",
          checksum: "def456"
        }
      ],
      raw: {
        externalId: "12345678",
        externalUrl:
          "https://zakupki.gov.ru/epz/dishonestsupplier/view/info.html?dishonestSupplierId=12345678",
        supplierName: 'ООО "Недобросовестный поставщик"',
        supplierInn: "7701234567",
        supplierOgrn: "1027700123456",
        registryStatus: "Включен в реестр",
        reason: "Односторонний отказ заказчика от исполнения контракта.",
        decisionDate: "2026-03-12T00:00:00+03:00",
        inclusionDate: "2026-03-15T00:00:00+03:00",
        exclusionDate: "2028-03-15T00:00:00+03:00",
        customerName: 'ГБУ "Городской заказчик"',
        legalBasis: "44-ФЗ, статья 104",
        region: "г. Москва",
        rawArtifactUrl: "http://minio:9000/artifacts/rnp/rnp-run/evt-4/detail.html"
      }
    };

    const normalized = normalizeRawEvent(input);

    expect(normalized.entityType).toBe("registry");
    expect(normalized.externalId).toBe("12345678");
    expect(normalized.supplier).toBe('ООО "Недобросовестный поставщик"');
    expect(normalized.supplierInn).toBe("7701234567");
    expect(normalized.registryStatus).toBe("Включен в реестр");
    expect(normalized.legalBasis).toBe("44-ФЗ, статья 104");
    expect(normalized.rawRef).toBe("http://minio:9000/artifacts/rnp/rnp-run/evt-4/detail.html");
    expect(normalized.status).toBe("ACTIVE");
  });

  it("normalizes fedresurs payload into supplier risk signal", () => {
    const input: RawSourceEvent = {
      eventId: "evt-5",
      runKey: "fedresurs-run",
      source: "fedresurs",
      collectedAt: "2026-04-04T12:00:00.000Z",
      url: "https://bankrot.fedresurs.ru/MessageWindow.aspx?ID=12345678",
      payloadVersion: "v1",
      artifacts: [
        {
          kind: "RAW_HTML",
          bucket: "artifacts",
          objectKey: "fedresurs/fedresurs-run/evt-5/detail.html",
          checksum: "fed123"
        }
      ],
      raw: {
        externalId: "12345678",
        externalUrl: "https://bankrot.fedresurs.ru/MessageWindow.aspx?ID=12345678",
        messageType: "Сообщение о банкротстве",
        subjectName: 'ООО "Стройресурс"',
        subjectInn: "7701234567",
        subjectOgrn: "1027700123456",
        publishedAt: "2026-04-03T12:30:00+03:00",
        eventDate: "2026-04-01T00:00:00+03:00",
        title: "Сообщение о введении процедуры наблюдения",
        description: "Суд ввел процедуру наблюдения в отношении должника.",
        bankruptcyStage: "Наблюдение",
        caseNumber: "А40-12345/2026",
        courtName: "Арбитражный суд города Москвы",
        rawArtifactUrl: "http://minio:9000/artifacts/fedresurs/fedresurs-run/evt-5/detail.html"
      }
    };

    const normalized = normalizeRawEvent(input);

    expect(normalized.entityType).toBe("risk_signal");
    expect(normalized.externalId).toBe("12345678");
    expect(normalized.supplier).toBe('ООО "Стройресурс"');
    expect(normalized.supplierInn).toBe("7701234567");
    expect(normalized.messageType).toBe("Сообщение о банкротстве");
    expect(normalized.bankruptcyStage).toBe("Наблюдение");
    expect(normalized.caseNumber).toBe("А40-12345/2026");
    expect(normalized.courtName).toBe("Арбитражный суд города Москвы");
    expect(normalized.riskLevel).toBe("CRITICAL");
    expect(normalized.rawRef).toBe(
      "http://minio:9000/artifacts/fedresurs/fedresurs-run/evt-5/detail.html"
    );
  });

  it("normalizes fns payload into supplier company profile", () => {
    const input: RawSourceEvent = {
      eventId: "evt-6",
      runKey: "fns-run",
      source: "fns",
      collectedAt: "2026-04-04T13:00:00.000Z",
      url: "https://egrul.nalog.ru/vyp-download/TOKEN123",
      payloadVersion: "v1",
      artifacts: [
        {
          kind: "RAW_JSON",
          bucket: "artifacts",
          objectKey: "fns/fns-run/evt-6/company.json",
          checksum: "fns123"
        }
      ],
      raw: {
        externalId: "1027700132195",
        externalUrl: "https://egrul.nalog.ru/vyp-download/TOKEN123",
        companyName: 'ПУБЛИЧНОЕ АКЦИОНЕРНОЕ ОБЩЕСТВО "СБЕРБАНК РОССИИ"',
        shortName: "ПАО СБЕРБАНК",
        inn: "7707083893",
        kpp: "773601001",
        ogrn: "1027700132195",
        status: "ACTIVE",
        registrationDate: "2002-08-16T00:00:00+03:00",
        region: "Г.Москва",
        liquidationMark: false,
        rawArtifactUrl: "http://minio:9000/artifacts/fns/fns-run/evt-6/company.json"
      }
    };

    const normalized = normalizeRawEvent(input);

    expect(normalized.entityType).toBe("company_profile");
    expect(normalized.externalId).toBe("1027700132195");
    expect(normalized.supplier).toBe('ПУБЛИЧНОЕ АКЦИОНЕРНОЕ ОБЩЕСТВО "СБЕРБАНК РОССИИ"');
    expect(normalized.supplierInn).toBe("7707083893");
    expect(normalized.kpp).toBe("773601001");
    expect(normalized.companyStatus).toBe("ACTIVE");
    expect(normalized.registrationDate).toBe("2002-08-16T00:00:00+03:00");
    expect(normalized.region).toBe("Г.Москва");
    expect(normalized.status).toBe("ACTIVE");
  });

  it("normalizes gistorgi payload into auction item", () => {
    const input: RawSourceEvent = {
      eventId: "evt-7",
      runKey: "gistorgi-run",
      source: "gistorgi",
      collectedAt: "2026-04-04T15:00:00.000Z",
      url: "https://torgi.gov.ru/new/public/lots/lot/22000057000000000046_2/(lotInfo:info)",
      payloadVersion: "v1",
      artifacts: [
        {
          kind: "RAW_HTML",
          bucket: "artifacts",
          objectKey: "gistorgi/gistorgi-run/evt-7/detail.html",
          checksum: "gst123"
        }
      ],
      raw: {
        externalId: "22000057000000000046_2",
        externalUrl: "https://torgi.gov.ru/new/public/lots/lot/22000057000000000046_2/(lotInfo:info)",
        title: "Продажа нежилого помещения в г. Москве",
        description: "Продажа объекта недвижимости площадью 120 кв.м.",
        organizerName: "Департамент городского имущества",
        organizerInn: "7701234567",
        auctionType: "Приватизация",
        status: "Прием заявок",
        publishedAt: "2026-04-01T10:00:00+03:00",
        applicationDeadline: "2026-04-15T18:00:00+03:00",
        biddingDate: "2026-04-20T11:00:00+03:00",
        startPrice: 12500000,
        currency: "RUB",
        region: "г. Москва",
        lotInfo: "Нежилое помещение, этаж 1, отдельный вход.",
        rawArtifactUrl: "http://minio:9000/artifacts/gistorgi/gistorgi-run/evt-7/detail.html"
      }
    };

    const normalized = normalizeRawEvent(input);

    expect(normalized.entityType).toBe("auction");
    expect(normalized.externalId).toBe("22000057000000000046_2");
    expect(normalized.organizerName).toBe("Департамент городского имущества");
    expect(normalized.organizerInn).toBe("7701234567");
    expect(normalized.auctionType).toBe("Приватизация");
    expect(normalized.deadlineAt).toBe("2026-04-15T18:00:00+03:00");
    expect(normalized.biddingDate).toBe("2026-04-20T11:00:00+03:00");
    expect(normalized.startPrice).toBe(12500000);
    expect(normalized.lotInfo).toBe("Нежилое помещение, этаж 1, отдельный вход.");
    expect(normalized.status).toBe("ACTIVE");
  });
});
