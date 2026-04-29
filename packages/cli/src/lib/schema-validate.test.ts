import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { describeErrors, validate } from "./schema-validate.js";

const repoRoot = join(__dirname, "..", "..", "..", "..");

function readJson<T>(...segments: string[]): T {
  return JSON.parse(readFileSync(join(repoRoot, ...segments), "utf8"));
}

describe("schema-validate", () => {
  it("validates the Button CEM against ashlar-cem.schema.json", () => {
    const cem = readJson<unknown>("registry", "components", "button", "0.0.1", "button.cem.json");
    const result = validate("ashlarCem", cem);

    if (!result.ok) {
      throw new Error(`Expected Button CEM to be valid:\n${describeErrors(result)}`);
    }
    expect(result.ok).toBe(true);
  });

  it("validates the Button evidence packet against evidence.schema.json", () => {
    const evidence = readJson<unknown>(
      "registry",
      "components",
      "button",
      "0.0.1",
      "button.evidence.json",
    );
    const result = validate("evidence", evidence);

    if (!result.ok) {
      throw new Error(`Expected Button evidence to be valid:\n${describeErrors(result)}`);
    }
    expect(result.ok).toBe(true);
  });

  it("validates the registry index against registry-index.schema.json", () => {
    const index = readJson<unknown>("registry", "index.json");
    const result = validate("registryIndex", index);

    if (!result.ok) {
      throw new Error(`Expected registry index to be valid:\n${describeErrors(result)}`);
    }
    expect(result.ok).toBe(true);
  });

  it("rejects a config missing required fields", () => {
    const result = validate("config", { registry: "./registry" });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.map((error) => error.message).join("\n")).toContain("componentsDir");
    }
  });

  it("validates a minimal valid config", () => {
    const result = validate("config", {
      $schema: "https://ashlar.dev/schemas/config.schema.json",
      registry: "./registry",
      componentsDir: "src/ashlar/components",
    });
    expect(result.ok).toBe(true);
  });

  it("rejects a CEM with an unknown _ashlar.layer", () => {
    const result = validate("ashlarCem", {
      schemaVersion: "2.1.0",
      modules: [
        {
          kind: "javascript-module",
          declarations: [
            {
              kind: "class",
              name: "Bad",
              _ashlar: { version: "0.0.1", layer: "L99", stability: "experimental" },
            },
          ],
        },
      ],
    });
    expect(result.ok).toBe(false);
  });
});
