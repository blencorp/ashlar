import { describe, expect, it } from "vitest";
import { toSarif } from "./sarif.js";

describe("toSarif", () => {
  it("emits SARIF rules and results for findings", () => {
    const sarif = toSarif([
      {
        ruleId: "federal/banner-required",
        message: "Federal banner missing.",
        file: "index.html",
        level: "warning",
        standardStatus: "pending",
        helpUri: "https://standards.digital.gov/standards/banner/",
      },
    ]);

    expect(sarif.runs[0]?.tool.driver.rules).toHaveLength(1);
    expect(sarif.runs[0]?.results).toHaveLength(1);
    expect(sarif.runs[0]?.results[0]?.ruleId).toBe("federal/banner-required");
  });

  it("includes region (line/column) when the finding carries one", () => {
    const sarif = toSarif([
      {
        ruleId: "federal/page-title-min-length",
        message: "Title too short.",
        file: "index.html",
        level: "warning",
        standardStatus: "pending",
        helpUri: "https://standards.digital.gov/standards/html-page-title/",
        region: { startLine: 4, startColumn: 5, endLine: 4, endColumn: 30 },
      },
    ]);

    const result = sarif.runs[0]?.results[0];
    const location = (result?.locations[0] as { physicalLocation: { region?: unknown } })
      ?.physicalLocation;
    expect(location?.region).toEqual({
      startLine: 4,
      startColumn: 5,
      endLine: 4,
      endColumn: 30,
    });
  });

  it("attaches fullDescription, help, and tags to the rule entry when provided", () => {
    const sarif = toSarif([
      {
        ruleId: "federal/banner-required",
        message: "Federal banner missing.",
        file: "index.html",
        level: "warning",
        standardStatus: "pending",
        helpUri: "https://standards.digital.gov/standards/banner/",
        fullDescription: "The banner is required by the pending Federal Web Standard.",
        tags: ["federal-standard", "trust-marker"],
      },
    ]);

    const rule = sarif.runs[0]?.tool.driver.rules[0] as {
      fullDescription?: { text: string };
      help?: { text: string };
      properties?: { tags?: string[]; standardStatus?: string };
    };
    expect(rule.fullDescription?.text).toContain("Federal Web Standard");
    expect(rule.help?.text).toContain("Federal Web Standard");
    expect(rule.properties?.tags).toEqual(["federal-standard", "trust-marker"]);
    expect(rule.properties?.standardStatus).toBe("pending");
  });
});
