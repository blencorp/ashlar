import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { getComponent, listComponents, resolveComponentVersion } from "./registry.js";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../../../..");

describe("registry", () => {
  it("lists local registry components from the registry index", () => {
    expect(listComponents(repoRoot).map((item) => item.name)).toEqual([
      "alert",
      "banner",
      "benefit-application",
      "button",
      "checkbox",
      "date-input",
      "error-summary",
      "form-field",
      "identifier",
      "radio-group",
      "select",
      "text-input",
      "textarea",
    ]);
  });

  it("resolves the latest component version from the registry index", () => {
    expect(resolveComponentVersion(repoRoot, "button")).toBe("0.0.1");
  });

  it("loads component detail with evidence and Ashlar metadata", () => {
    const button = getComponent(repoRoot, "button");

    expect(button.name).toBe("button");
    expect(button.version).toBe("0.0.1");
    expect(button.capsuleHash).toMatch(/^sha256:/);
    expect(button.evidence.component).toBe("button");
    expect(button.platformFeatures.map((feature) => feature.feature)).toContain("forced-colors");
    expect(button.policyMappings.map((mapping) => mapping.source)).toContain("Section 508");
    expect(button.files).toContain("button.cem.json");
  });

  it("loads the first service-flow proof capsules", () => {
    const names = [
      "alert",
      "banner",
      "form-field",
      "text-input",
      "checkbox",
      "date-input",
      "radio-group",
      "error-summary",
      "identifier",
      "select",
      "textarea",
      "benefit-application",
    ];
    const expectedVersions = new Map<string, string>([["banner", "0.0.2"]]);

    for (const name of names) {
      const detail = getComponent(repoRoot, name);
      expect(detail.version).toBe(expectedVersions.get(name) ?? "0.0.1");
      expect(detail.evidence.component).toBe(name);
      expect(detail.files).toContain(`${name}.cem.json`);
      expect(detail.files).toContain(`${name}.evidence.json`);
      expect(detail.files).toContain(`${name}.css`);
      expect(detail.files).toContain(`${name}.html`);
    }
  });

  it("fails clearly for unknown components", () => {
    expect(() => getComponent(repoRoot, "dialog")).toThrow("Unknown Ashlar component: dialog");
  });
});
