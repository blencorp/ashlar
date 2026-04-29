import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

const here = fileURLToPath(new URL(".", import.meta.url));
const cliEntry = join(here, "..", "..", "dist", "index.js");

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
});
