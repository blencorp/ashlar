import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

const here = fileURLToPath(new URL(".", import.meta.url));
const cliEntry = join(here, "..", "..", "dist", "index.js");
const repoRoot = resolve(here, "..", "..", "..", "..");

let scratch: string;

function runCli(args: string[]): { stdout: string; status: number } {
  const result = spawnSync(process.execPath, [cliEntry, ...args], {
    cwd: scratch,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });

  return {
    stdout: `${result.stdout ?? ""}${result.stderr ?? ""}`,
    status: result.status ?? 1,
  };
}

beforeEach(() => {
  scratch = mkdtempSync(join(tmpdir(), "ashlar-ai-eval-test-"));
  mkdirSync(join(scratch, "generated"), { recursive: true });
});

afterEach(() => {
  rmSync(scratch, { recursive: true, force: true });
});

function writeGeneratedOutputs(): void {
  writeFileSync(
    join(scratch, "generated", "benefit-application.pass.html"),
    `<!doctype html>
<html lang="en">
  <head>
    <title>Apply for emergency housing assistance</title>
    <meta
      name="description"
      content="Start a public-service application flow with required field labels and error guidance."
    />
  </head>
  <body>
    <section class="usa-banner" aria-label="Official government website"></section>
    <main>
      <form class="ashlar-benefit-application">
        <div class="ashlar-form-field">
          <label class="ashlar-form-field__label" for="full-name">Full name</label>
          <input class="ashlar-text-input" id="full-name" name="full-name" autocomplete="name" />
        </div>
        <button class="ashlar-button" type="submit">Continue</button>
      </form>
    </main>
    <footer class="usa-identifier">
      <a href="/about">About</a>
      <a href="/accessibility">Accessibility</a>
      <a href="/privacy">Privacy</a>
      <a href="/foia">FOIA</a>
      <a href="/no-fear-act">No FEAR Act</a>
      <a href="/oig">Office of Inspector General</a>
      <a href="/performance">Performance reports</a>
    </footer>
  </body>
</html>
`,
  );
  writeFileSync(
    join(scratch, "generated", "benefit-application.fail.html"),
    `<!doctype html>
<html lang="en">
  <head>
    <title>Apply</title>
  </head>
  <body>
    <main>
      <input
        class="ashlar-text-input"
        id="case-id"
        aria-invalid="true"
      >
      <button class="ashlar-button" type="button"><svg aria-hidden="true"></svg></button>
    </main>
  </body>
</html>
`,
  );
}

function writeSuite(path: string, cases: unknown[]): void {
  writeFileSync(
    path,
    `${JSON.stringify(
      {
        $schema: "https://ashlar.dev/schemas/ai-eval.schema.json",
        schemaVersion: "1.0",
        cases,
      },
      null,
      2,
    )}\n`,
  );
}

function defaultCases(): unknown[] {
  return [
    {
      id: "service-flow-no-findings",
      prompt: "Generate a simple benefit application form with Ashlar capsules.",
      components: ["form-field", "text-input", "button"],
      outputFile: "generated/benefit-application.pass.html",
      policy: "all",
      expect: {
        errors: 0,
        warnings: 0,
      },
    },
    {
      id: "service-flow-anti-patterns-detected",
      prompt:
        "Generate a broken benefit application form so the eval harness proves Ashlar catches unsafe output.",
      components: ["text-input", "button"],
      outputFile: "generated/benefit-application.fail.html",
      policy: "all",
      expect: {
        includesRuleIds: [
          "ashlar/text-input/invalid-input-needs-describedby",
          "ashlar/button/icon-only-needs-label",
        ],
        minErrors: 2,
      },
    },
  ];
}

describe("ai-eval command", () => {
  it("runs saved generated outputs against expected Ashlar policy findings", () => {
    const suitePath = join(scratch, "ashlar-ai-eval.json");
    writeGeneratedOutputs();
    writeSuite(suitePath, defaultCases());

    const result = runCli([
      "ai-eval",
      "--suite",
      suitePath,
      "--registry",
      join(repoRoot, "registry"),
    ]);

    expect(result.status, result.stdout).toBe(0);
    expect(result.stdout).toContain("AI eval passed: 2 case(s)");
    expect(result.stdout).toContain("service-flow-no-findings");
    expect(result.stdout).toContain("service-flow-anti-patterns-detected");
  });

  it("returns grounding metadata in JSON reports", () => {
    const suitePath = join(scratch, "ashlar-ai-eval.json");
    writeGeneratedOutputs();
    writeSuite(suitePath, defaultCases());

    const result = runCli([
      "ai-eval",
      "--suite",
      suitePath,
      "--registry",
      join(repoRoot, "registry"),
      "--json",
    ]);

    expect(result.status, result.stdout).toBe(0);
    const report = JSON.parse(result.stdout) as {
      cases: Array<{
        grounding: {
          components: Array<{ name: string; antiPatternRuleIds: string[]; evidenceStatus: string }>;
        };
      }>;
    };
    expect(report.cases.at(1)?.grounding.components).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          name: "text-input",
          antiPatternRuleIds: expect.arrayContaining([
            "ashlar/text-input/invalid-input-needs-describedby",
          ]),
          evidenceStatus: "not-reviewed",
        }),
      ]),
    );
  });

  it("fails when generated output does not match expected findings", () => {
    const suitePath = join(scratch, "ashlar-ai-eval.json");
    writeGeneratedOutputs();
    writeSuite(suitePath, [
      {
        id: "missing-expected-rule",
        prompt: "Generate an invalid text input.",
        components: ["text-input"],
        outputFile: "generated/benefit-application.pass.html",
        policy: "components",
        expect: {
          includesRuleIds: ["ashlar/text-input/invalid-input-needs-describedby"],
          minErrors: 1,
        },
      },
    ]);

    const result = runCli([
      "ai-eval",
      "--suite",
      suitePath,
      "--registry",
      join(repoRoot, "registry"),
    ]);

    expect(result.status, result.stdout).toBe(1);
    expect(result.stdout).toContain("AI eval failed: 1 case(s)");
    expect(result.stdout).toContain("missing-expected-rule");
    expect(result.stdout).toContain(
      "missing expected rule ashlar/text-input/invalid-input-needs-describedby",
    );
    expect(result.stdout).toContain("expected at least 1 error finding(s), found 0");
  });

  it("runs the generated-output corpus suite", () => {
    const result = runCli([
      "ai-eval",
      "--suite",
      join(
        repoRoot,
        "examples",
        "ai-eval",
        "generated-output-corpus",
        "ashlar-generated-output-corpus.json",
      ),
      "--registry",
      join(repoRoot, "registry"),
    ]);

    expect(result.status, result.stdout).toBe(0);
    expect(result.stdout).toContain("AI eval passed: 10 case(s)");
    expect(result.stdout).toContain("benefit-eligibility-grounded");
    expect(result.stdout).toContain("error-remediation-ungrounded");
  });

  it("validates the suite shape before running output checks", () => {
    const suitePath = join(scratch, "ashlar-ai-eval.json");
    writeGeneratedOutputs();
    writeSuite(suitePath, [
      {
        id: "missing-output-file",
        prompt: "Generate a text input.",
        components: ["text-input"],
        policy: "components",
        expect: { errors: 0 },
      },
    ]);

    const result = runCli([
      "ai-eval",
      "--suite",
      suitePath,
      "--registry",
      join(repoRoot, "registry"),
    ]);

    expect(result.status, result.stdout).toBe(1);
    expect(result.stdout).toContain("Invalid Ashlar AI eval suite");
    expect(result.stdout).toContain("outputFile");
  });
});
