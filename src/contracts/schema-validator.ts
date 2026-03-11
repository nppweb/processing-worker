import { readFileSync } from "node:fs";
import { join } from "node:path";
import Ajv from "ajv";
import type { NormalizedSourceEvent, RawSourceEvent } from "../types";

export function createSchemaValidators(sharedContractsDir: string) {
  const rawSchema = JSON.parse(
    readFileSync(join(sharedContractsDir, "events", "source-raw.v1.json"), "utf-8")
  );
  const normalizedSchema = JSON.parse(
    readFileSync(join(sharedContractsDir, "events", "source-normalized.v1.json"), "utf-8")
  );

  const ajv = new Ajv({ allErrors: true });
  const rawValidate = ajv.compile<RawSourceEvent>(rawSchema);
  const normalizedValidate = ajv.compile<NormalizedSourceEvent>(normalizedSchema);

  return {
    validateRaw(event: RawSourceEvent): void {
      if (rawValidate(event)) {
        return;
      }
      throw new Error(
        `Raw schema validation failed: ${(rawValidate.errors ?? [])
          .map((err) => `${err.instancePath || "/"} ${err.message}`)
          .join("; ")}`
      );
    },
    validateNormalized(event: NormalizedSourceEvent): void {
      if (normalizedValidate(event)) {
        return;
      }
      throw new Error(
        `Normalized schema validation failed: ${(normalizedValidate.errors ?? [])
          .map((err) => `${err.instancePath || "/"} ${err.message}`)
          .join("; ")}`
      );
    }
  };
}
