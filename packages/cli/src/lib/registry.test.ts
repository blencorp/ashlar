import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { getComponent, listComponents, resolveComponentVersion } from "./registry.js";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../../../..");

describe("registry", () => {
  it("lists local registry components from the registry index", () => {
    expect(listComponents(repoRoot).map((item) => item.name)).toEqual(["button"]);
  });

  it("resolves the latest component version from the registry index", () => {
    expect(resolveComponentVersion(repoRoot, "button")).toBe("0.0.1");
  });

  it("loads component detail with evidence and Ashlar metadata", () => {
    const button = getComponent(repoRoot, "button");

    expect(button.name).toBe("button");
    expect(button.version).toBe("0.0.1");
    expect(button.evidence.component).toBe("button");
    expect(button.platformFeatures.map((feature) => feature.feature)).toContain("forced-colors");
    expect(button.policyMappings.map((mapping) => mapping.source)).toContain("Section 508");
    expect(button.files).toContain("button.cem.json");
  });

  it("fails clearly for unknown components", () => {
    expect(() => getComponent(repoRoot, "dialog")).toThrow("Unknown Ashlar component: dialog");
  });
});
