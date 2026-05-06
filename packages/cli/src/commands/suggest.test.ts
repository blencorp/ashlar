import { spawnSync } from "node:child_process";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
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

describe("suggest command", () => {
  it("prints task suggestions without modifying files", () => {
    const result = runCli(["suggest", "Build", "a", "benefits", "application", "form"]);

    expect(result.status).toBe(0);
    expect(result.stdout).toContain("Task: Build a benefits application form");
    expect(result.stdout).toContain("benefit-application@0.0.1");
    expect(result.stdout).toContain("Install: ashlar add");
    expect(result.stdout).toContain("Deterministic metadata suggestion");
  });

  it("suggests the signed radio-group capsule without a missing-capability warning", () => {
    const result = runCli(["suggest", "Ask", "yes", "or", "no", "eligibility", "questions"]);

    expect(result.status).toBe(0);
    expect(result.stdout).toContain("benefit-application@0.0.1");
    expect(result.stdout).toContain("radio-group@0.0.1");
    expect(result.stdout).not.toContain("No signed Ashlar radio-group capsule exists yet");
  });

  it("emits structured JSON suggestions for agents", () => {
    const result = runCli(["suggest", "official", "government", "banner", "--json"]);
    const payload = JSON.parse(result.stdout) as {
      installCommand?: string;
      gaps: unknown[];
      suggestions: Array<{ name: string; reasons: string[] }>;
    };

    expect(result.status).toBe(0);
    expect(payload.suggestions.at(0)?.name).toBe("banner");
    expect(payload.installCommand).toContain("ashlar add banner");
    expect(payload.suggestions.at(0)?.reasons.join(" ")).toContain("official-site trust marker");
    expect(payload.gaps).toEqual([]);
  });

  it("suggests the signed date-input capsule for simple date fields", () => {
    const result = runCli([
      "suggest",
      "Collect",
      "date",
      "of",
      "birth",
      "with",
      "a",
      "select",
      "--json",
    ]);
    const payload = JSON.parse(result.stdout) as {
      installCommand?: string;
      gaps: Array<{ capability: string; plannedComponent?: string; recommendation: string }>;
      suggestions: Array<{ name: string }>;
    };

    expect(result.status).toBe(0);
    expect(payload.suggestions.at(0)?.name).toBe("date-input");
    expect(payload.installCommand).toContain("ashlar add date-input");
    expect(payload.gaps.map((gap) => gap.plannedComponent)).not.toContain("date-input");
    expect(payload.gaps.map((gap) => gap.plannedComponent)).not.toContain("select");
  });

  it("emits structured capability gaps for complex date pickers", () => {
    const result = runCli([
      "suggest",
      "Build",
      "a",
      "restricted",
      "date",
      "picker",
      "with",
      "a",
      "date",
      "range",
      "--json",
    ]);
    const payload = JSON.parse(result.stdout) as {
      gaps: Array<{ capability: string; plannedComponent?: string; recommendation: string }>;
      suggestions: Array<{ name: string }>;
    };

    expect(result.status).toBe(0);
    expect(payload.suggestions.map((suggestion) => suggestion.name)).toContain("date-input");
    expect(payload.gaps).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          capability: "Date picker",
          plannedComponent: "date-picker",
        }),
      ]),
    );
    expect(payload.gaps.map((gap) => gap.recommendation).join(" ")).toContain("date-picker");
  });

  it("suggests the signed checkbox capsule without a missing-capability warning", () => {
    const result = runCli(["suggest", "Collect", "consent", "with", "a", "checkbox", "--json"]);
    const payload = JSON.parse(result.stdout) as {
      gaps: Array<{ plannedComponent?: string }>;
      installCommand?: string;
      suggestions: Array<{ name: string }>;
    };

    expect(result.status).toBe(0);
    expect(payload.suggestions.at(0)?.name).toBe("checkbox");
    expect(payload.installCommand).toContain("ashlar add checkbox");
    expect(payload.gaps.map((gap) => gap.plannedComponent)).not.toContain("checkbox");
  });

  it("suggests the signed identifier capsule for required agency links", () => {
    const result = runCli(["suggest", "Add", "a", "government", "identifier", "footer", "--json"]);
    const payload = JSON.parse(result.stdout) as {
      installCommand?: string;
      suggestions: Array<{ name: string }>;
    };

    expect(result.status).toBe(0);
    expect(payload.suggestions.map((suggestion) => suggestion.name)).toContain("identifier");
    expect(payload.installCommand).toContain("identifier");
  });

  it("suggests the signed select capsule without a missing-capability warning", () => {
    const result = runCli(["suggest", "Choose", "one", "state", "from", "a", "select", "--json"]);
    const payload = JSON.parse(result.stdout) as {
      gaps: Array<{ plannedComponent?: string }>;
      installCommand?: string;
      suggestions: Array<{ name: string }>;
    };

    expect(result.status).toBe(0);
    expect(payload.suggestions.at(0)?.name).toBe("select");
    expect(payload.installCommand).toContain("ashlar add select");
    expect(payload.gaps.map((gap) => gap.plannedComponent)).not.toContain("select");
  });

  it("suggests the signed textarea capsule without a missing-capability warning", () => {
    const result = runCli(["suggest", "Collect", "long", "answer", "comments", "--json"]);
    const payload = JSON.parse(result.stdout) as {
      gaps: Array<{ plannedComponent?: string }>;
      installCommand?: string;
      suggestions: Array<{ name: string }>;
    };

    expect(result.status).toBe(0);
    expect(payload.suggestions.at(0)?.name).toBe("textarea");
    expect(payload.installCommand).toContain("ashlar add textarea");
    expect(payload.gaps.map((gap) => gap.plannedComponent)).not.toContain("textarea");
  });
});
