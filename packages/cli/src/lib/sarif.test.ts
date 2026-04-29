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
});
