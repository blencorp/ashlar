import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { join, resolve } from "node:path";
import { describe, expect, it } from "vitest";

const here = fileURLToPath(new URL(".", import.meta.url));
const cliEntry = join(here, "..", "..", "dist", "index.js");
const repoRoot = resolve(here, "..", "..", "..", "..");

function runCli(args: string[]): { stdout: string; status: number } {
  const result = spawnSync(process.execPath, [cliEntry, ...args], {
    cwd: repoRoot,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });

  return {
    stdout: `${result.stdout ?? ""}${result.stderr ?? ""}`,
    status: result.status ?? 1,
  };
}

describe("migrate command", () => {
  it("reports available Ashlar replacements for USWDS markup", () => {
    const fixture = "examples/uswds-project/index.html";
    const result = runCli(["migrate", "uswds", "--registry", "./registry", fixture]);

    expect(result.status).toBe(0);
    expect(result.stdout).toContain("USWDS migration: ready");
    expect(result.stdout).toContain("AVAILABLE examples/uswds-project/index.html USWDS Button");
    expect(result.stdout).toContain("Ashlar: button");
    expect(result.stdout).toContain("AVAILABLE examples/uswds-project/index.html USWDS Form Group");
    expect(result.stdout).toContain("Ashlar: form-field");
    expect(result.stdout).toContain("AVAILABLE examples/uswds-project/index.html USWDS Radio");
    expect(result.stdout).toContain("Ashlar: radio-group");
    expect(result.stdout).toContain("AVAILABLE examples/uswds-project/index.html USWDS Identifier");
    expect(result.stdout).toContain("Ashlar: identifier");
    expect(result.stdout).toContain("AVAILABLE examples/uswds-project/index.html USWDS Select");
    expect(result.stdout).toContain("Ashlar: select");
    expect(result.stdout).toContain("AVAILABLE examples/uswds-project/index.html USWDS Textarea");
    expect(result.stdout).toContain("Ashlar: textarea");
    expect(result.stdout).toContain(
      "AVAILABLE examples/uswds-project/index.html USWDS Date Picker",
    );
    expect(result.stdout).toContain("Ashlar: date-input");
    expect(result.stdout).toContain(
      "ashlar add alert banner button date-input error-summary form-field identifier radio-group select text-input textarea",
    );
    expect(result.stdout).toMatch(/Location: examples\/uswds-project\/index\.html:\d+:\d+/);
  });

  it("emits structured migration reports for CI and agents", () => {
    const result = runCli([
      "migrate",
      "uswds",
      "--registry",
      "./registry",
      "--json",
      "examples/uswds-project/index.html",
    ]);

    expect(result.status).toBe(0);
    const report = JSON.parse(result.stdout) as {
      schemaVersion: string;
      status: string;
      summary: { available: number; gaps: number; matches: number };
      matches: Array<{
        uswds: string;
        status: string;
        ashlarComponents: string[];
        plannedComponent?: string;
      }>;
      nextCommands: string[];
    };

    expect(report.schemaVersion).toBe("1.0");
    expect(report.status).toBe("ready");
    expect(report.summary.available).toBeGreaterThan(0);
    expect(report.summary.gaps).toBe(0);
    expect(report.summary.matches).toBe(report.summary.available + report.summary.gaps);
    expect(report.matches).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          uswds: "USWDS Alert",
          status: "available",
          ashlarComponents: ["alert"],
        }),
        expect.objectContaining({
          uswds: "USWDS Radio",
          status: "available",
          ashlarComponents: ["radio-group"],
        }),
        expect.objectContaining({
          uswds: "USWDS Identifier",
          status: "available",
          ashlarComponents: ["identifier"],
        }),
        expect.objectContaining({
          uswds: "USWDS Select",
          status: "available",
          ashlarComponents: ["select"],
        }),
        expect.objectContaining({
          uswds: "USWDS Textarea",
          status: "available",
          ashlarComponents: ["textarea"],
        }),
        expect.objectContaining({
          uswds: "USWDS Date Picker",
          status: "available",
          ashlarComponents: ["date-input"],
        }),
      ]),
    );
    expect(report.nextCommands).toContain(
      "ashlar add alert banner button date-input error-summary form-field identifier radio-group select text-input textarea",
    );
  });

  it("detects static USWDS className usage in TSX markup", () => {
    const fixture = "examples/uswds-project/src/EligibilityForm.tsx";
    const result = runCli(["migrate", "uswds", "--registry", "./registry", fixture]);

    expect(result.status).toBe(0);
    expect(result.stdout).toContain(
      "AVAILABLE examples/uswds-project/src/EligibilityForm.tsx USWDS Alert",
    );
    expect(result.stdout).toContain("Ashlar: alert");
    expect(result.stdout).toContain(
      "AVAILABLE examples/uswds-project/src/EligibilityForm.tsx USWDS Text Input",
    );
    expect(result.stdout).toContain("Ashlar: text-input");
    expect(result.stdout).toContain(
      "AVAILABLE examples/uswds-project/src/EligibilityForm.tsx USWDS Checkbox",
    );
    expect(result.stdout).toContain("Ashlar: checkbox");
    expect(result.stdout).toMatch(
      /Location: examples\/uswds-project\/src\/EligibilityForm\.tsx:\d+:\d+/,
    );
  });
});
