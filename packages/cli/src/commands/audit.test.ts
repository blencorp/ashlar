import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

const here = fileURLToPath(new URL(".", import.meta.url));
const cliEntry = join(here, "..", "..", "dist", "index.js");
const repoRoot = resolve(here, "..", "..", "..", "..");

let scratch: string;

beforeAll(() => {
  scratch = mkdtempSync(join(tmpdir(), "ashlar-audit-test-"));
});

afterAll(() => {
  rmSync(scratch, { recursive: true, force: true });
});

function runCli(args: string[], cwd: string): { stdout: string; status: number } {
  try {
    const stdout = execFileSync(process.execPath, [cliEntry, ...args], {
      cwd,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    });
    return { stdout, status: 0 };
  } catch (err) {
    const e = err as { status?: number; stdout?: Buffer; stderr?: Buffer };
    return {
      stdout: `${e.stdout?.toString() ?? ""}${e.stderr?.toString() ?? ""}`,
      status: e.status ?? 1,
    };
  }
}

describe("standalone audit posture", () => {
  it("audit --policy federal works in a directory with no config or lockfile", () => {
    const file = join(scratch, "index.html");
    writeFileSync(
      file,
      `<!doctype html>
<html lang="en">
  <head><title>Short</title></head>
  <body><usa-banner></usa-banner></body>
</html>`,
    );

    const result = runCli(["audit", "--policy", "federal", file], scratch);

    // Warning-only findings, exit code 0 (the federal contractor wedge).
    expect(result.status).toBe(0);
    expect(result.stdout).toContain("federal/page-title-min-length");
    expect(result.stdout).toContain("federal/meta-description-required");
  });

  it("audit --policy federal --sarif emits valid SARIF without config", () => {
    const file = join(scratch, "compliant.html");
    writeFileSync(
      file,
      `<!doctype html>
<html lang="en">
  <head>
    <title>Apply for federal benefits | Example Agency</title>
    <meta name="description" content="Apply for federal benefits online through this example public-service flow.">
  </head>
  <body>
    <usa-banner></usa-banner>
    <footer class="ashlar-identifier">
      <a href="/about">About</a>
      <a href="/accessibility">Accessibility</a>
      <a href="/foia">FOIA</a>
      <a href="/no-fear-act">No FEAR Act</a>
      <a href="/oig">OIG</a>
      <a href="/performance">Performance</a>
      <a href="/privacy">Privacy</a>
    </footer>
  </body>
</html>`,
    );

    const result = runCli(["audit", "--policy", "federal", "--sarif", file], scratch);
    expect(result.status).toBe(0);

    const sarif = JSON.parse(result.stdout) as {
      version: string;
      runs: Array<{ results: unknown[] }>;
    };
    expect(sarif.version).toBe("2.1.0");
    expect(sarif.runs[0]?.results).toHaveLength(0);
  });

  it("flags a checked-in legacy federal fixture before Ashlar components are installed", () => {
    const fixture = join(repoRoot, "examples", "legacy-federal-project", "index.html");
    const source = readFileSync(fixture, "utf8");
    expect(source).not.toContain("ashlar");

    const result = runCli(["audit", "--policy", "federal", "--explain", fixture], repoRoot);

    expect(result.status).toBe(0);
    expect(result.stdout).toContain("federal/page-title-min-length");
    expect(result.stdout).toContain("federal/meta-description-required");
    expect(result.stdout).toContain("federal/banner-required");
    expect(result.stdout).toContain("federal/identifier-required");
    expect(result.stdout).not.toContain("ashlar/button");
    expect(result.stdout).toMatch(/Location: .*legacy-federal-project\/index\.html:\d+:\d+/);
  });
});

describe("first service-flow proof audit", () => {
  it("flags an Ashlar Checkbox missing an associated label contract", () => {
    const file = join(scratch, "checkbox-bad.html");
    writeFileSync(file, `<input class="ashlar-checkbox" type="checkbox">\n`);

    const result = runCli(
      ["audit", "--policy", "components", "--registry", join(repoRoot, "registry"), file],
      repoRoot,
    );

    expect(result.status).toBe(1);
    expect(result.stdout).toContain("ashlar/checkbox/checkbox-needs-associated-label");
  });

  it("flags an Ashlar Radio Group missing a legend contract", () => {
    const file = join(scratch, "radio-group-bad.html");
    writeFileSync(
      file,
      `<fieldset class="ashlar-radio-group"><input class="ashlar-radio" type="radio"></fieldset>\n`,
    );

    const result = runCli(
      ["audit", "--policy", "components", "--registry", join(repoRoot, "registry"), file],
      repoRoot,
    );

    expect(result.status).toBe(1);
    expect(result.stdout).toContain("ashlar/radio-group/radio-group-needs-legend");
    expect(result.stdout).toContain("ashlar/radio-group/radio-needs-name");
  });

  it("flags an Ashlar Identifier missing an accessible region label", () => {
    const file = join(scratch, "identifier-bad.html");
    writeFileSync(
      file,
      `<footer class="ashlar-identifier"><a href="/privacy">Privacy</a></footer>\n`,
    );

    const result = runCli(
      ["audit", "--policy", "components", "--registry", join(repoRoot, "registry"), file],
      repoRoot,
    );

    expect(result.status).toBe(1);
    expect(result.stdout).toContain("ashlar/identifier/identifier-needs-label");
  });

  it("flags an Ashlar Select missing label and invalid-state contracts", () => {
    const file = join(scratch, "select-bad.html");
    writeFileSync(file, `<select class="ashlar-select" aria-invalid="true"></select>\n`);

    const result = runCli(
      ["audit", "--policy", "components", "--registry", join(repoRoot, "registry"), file],
      repoRoot,
    );

    expect(result.status).toBe(1);
    expect(result.stdout).toContain("ashlar/select/select-needs-associated-label");
    expect(result.stdout).toContain("ashlar/select/invalid-select-needs-describedby");
  });

  it("flags an Ashlar Textarea missing label and invalid-state contracts", () => {
    const file = join(scratch, "textarea-bad.html");
    writeFileSync(file, `<textarea class="ashlar-textarea" aria-invalid="true"></textarea>\n`);

    const result = runCli(
      ["audit", "--policy", "components", "--registry", join(repoRoot, "registry"), file],
      repoRoot,
    );

    expect(result.status).toBe(1);
    expect(result.stdout).toContain("ashlar/textarea/textarea-needs-associated-label");
    expect(result.stdout).toContain("ashlar/textarea/invalid-textarea-needs-describedby");
  });

  it("passes an Ashlar Textarea with label and invalid-state contracts", () => {
    const file = join(scratch, "textarea-good.html");
    writeFileSync(
      file,
      `<label for="comments">Comments</label><textarea class="ashlar-textarea" id="comments" name="comments" aria-invalid="true" aria-describedby="comments-error"></textarea><p id="comments-error">Enter comments.</p>\n`,
    );

    const result = runCli(
      ["audit", "--policy", "components", "--registry", join(repoRoot, "registry"), file],
      repoRoot,
    );

    expect(result.status).toBe(0);
    expect(result.stdout).toContain("No findings");
  });

  it("flags an Ashlar Date Input missing label and invalid-state contracts", () => {
    const file = join(scratch, "date-input-bad.html");
    writeFileSync(file, `<input class="ashlar-date-input" type="date" aria-invalid="true">\n`);

    const result = runCli(
      ["audit", "--policy", "components", "--registry", join(repoRoot, "registry"), file],
      repoRoot,
    );

    expect(result.status).toBe(1);
    expect(result.stdout).toContain("ashlar/date-input/date-input-needs-associated-label");
    expect(result.stdout).toContain("ashlar/date-input/invalid-date-input-needs-describedby");
  });

  it("passes an Ashlar Date Input with label and invalid-state contracts", () => {
    const file = join(scratch, "date-input-good.html");
    writeFileSync(
      file,
      `<label for="birth-date">Date of birth</label><input class="ashlar-date-input" id="birth-date" name="birth-date" type="date" aria-invalid="true" aria-describedby="birth-date-error"><p id="birth-date-error">Enter a date.</p>\n`,
    );

    const result = runCli(
      ["audit", "--policy", "components", "--registry", join(repoRoot, "registry"), file],
      repoRoot,
    );

    expect(result.status).toBe(0);
    expect(result.stdout).toContain("No findings");
  });

  it("passes the composed service-flow fixture", () => {
    const result = runCli(
      [
        "audit",
        "--policy",
        "all",
        "--registry",
        join(repoRoot, "registry"),
        join(repoRoot, "examples", "service-flow", "benefit-application.pass.html"),
      ],
      repoRoot,
    );

    expect(result.status).toBe(0);
    expect(result.stdout).toContain("No findings");
  });

  it("flags the intentionally broken service-flow fixture with line locations", () => {
    const result = runCli(
      [
        "audit",
        "--policy",
        "all",
        "--explain",
        "--registry",
        join(repoRoot, "registry"),
        join(repoRoot, "examples", "service-flow", "benefit-application.fail.html"),
      ],
      repoRoot,
    );

    expect(result.status).toBe(1);
    expect(result.stdout).toContain("federal/page-title-min-length");
    expect(result.stdout).toContain("federal/meta-description-required");
    expect(result.stdout).toContain("ashlar/form-field/field-missing-label");
    expect(result.stdout).toContain("ashlar/text-input/invalid-input-needs-describedby");
    expect(result.stdout).toContain("ashlar/error-summary/summary-link-missing-target");
    expect(result.stdout).toContain("ashlar/alert/empty-alert");
    expect(result.stdout).toContain("ashlar/button/icon-only-needs-label");
    expect(result.stdout).toMatch(/Location: .*benefit-application\.fail\.html:\d+:\d+/);
  });
});
