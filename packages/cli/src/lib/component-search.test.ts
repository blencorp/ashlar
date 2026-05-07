import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { searchRegistryComponents } from "./component-search.js";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../../../..");

describe("component search", () => {
  it("ranks matches across policy and CEM metadata, not only names", () => {
    const results = searchRegistryComponents({
      cwd: repoRoot,
      query: "official website",
      registryPath: "./registry",
    });

    expect(results.at(0)?.name).toBe("banner");
    expect(results.at(0)?.reasons.join(" ")).toContain("matched");
    expect(results.at(0)?.installCommand).toBe("ashlar add banner");
  });

  it("filters components by federal policy mapping", () => {
    const results = searchRegistryComponents({
      cwd: repoRoot,
      policy: "Federal Website Standards",
      registryPath: "./registry",
    });

    expect(results.map((result) => result.name)).toEqual(["banner", "benefit-application"]);
    expect(
      results.every((result) => result.reasons.some((reason) => reason.startsWith("policy:"))),
    ).toBe(true);
  });

  it("filters by platform feature and layer for AI planning", () => {
    const results = searchRegistryComponents({
      cwd: repoRoot,
      feature: "details-summary",
      layer: "markup-primitives",
      registryPath: "./registry",
    });

    expect(results.map((result) => result.name)).toEqual(["banner"]);
    expect(results.at(0)?.platformFeatures.map((feature) => feature.feature)).toContain(
      "details-summary",
    );
  });
});
