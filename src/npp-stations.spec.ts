import { describe, expect, it } from "vitest";
import { resolveNppStationNameFromText } from "./npp-stations";

describe("resolveNppStationNameFromText", () => {
  it("maps EIS titles with inflected station names to canonical station labels", () => {
    expect(
      resolveNppStationNameFromText([
        "Выполнение работ для Калининской атомной станции"
      ])
    ).toBe("Калининская атомная станция");

    expect(
      resolveNppStationNameFromText([
        "Поставка оборудования для нужд Белоярской АЭС"
      ])
    ).toBe("Белоярская атомная станция");
  });
});
