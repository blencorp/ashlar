import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

const here = fileURLToPath(new URL(".", import.meta.url));
const cliEntry = join(here, "..", "..", "dist", "index.js");
const repoRoot = resolve(here, "..", "..", "..", "..");

let scratch: string;

beforeEach(() => {
  scratch = mkdtempSync(join(tmpdir(), "ashlar-status-test-"));
});

afterEach(() => {
  rmSync(scratch, { recursive: true, force: true });
});

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

describe("status command", () => {
  it("reports a read-only adoption path before initialization", () => {
    const result = runCli(["status", "--registry", join(repoRoot, "registry")]);

    expect(result.status).toBe(0);
    expect(result.stdout).toContain("Ashlar status: blocked");
    expect(result.stdout).toContain("ACTION project-initialized");
    expect(result.stdout).toContain("ACTION installed-capsules");
    expect(result.stdout).toContain("PASS registry-available");
    expect(result.stdout).toContain("markup primitives");
    expect(result.stdout).toContain("BLOCKED stable-l0-evidence");
    expect(result.stdout).toContain("ashlar init --registry");
    expect(result.stdout).toContain('ashlar suggest "Build a benefits application form"');
    expect(result.stdout).toContain("ashlar migrate uswds <legacy-file-or-glob>");
    expect(result.stdout).toContain("ashlar evidence prepare-stable-all");
  });

  it("emits structured status after capsules are installed", () => {
    const registry = join(repoRoot, "registry");
    expect(runCli(["init", "--registry", registry]).status).toBe(0);
    expect(runCli(["add", "button", "banner"]).status).toBe(0);

    const result = runCli(["status", "--registry", registry, "--json"]);

    expect(result.status).toBe(0);
    const report = JSON.parse(result.stdout) as {
      status: string;
      project: { initialized: boolean; installedComponents: Array<{ name: string }> };
      registry: {
        l0Count: number;
        markupPrimitiveCount: number;
        stableEvidenceL0Count: number;
        stableEvidenceMarkupPrimitiveCount: number;
      };
      checks: Array<{ id: string; status: string }>;
      nextActions: Array<{ command: string }>;
    };
    expect(report.status).toBe("blocked");
    expect(report.project.initialized).toBe(true);
    expect(report.project.installedComponents.map((component) => component.name)).toEqual([
      "banner",
      "button",
    ]);
    expect(report.registry.l0Count).toBe(12);
    expect(report.registry.markupPrimitiveCount).toBe(12);
    expect(report.registry.stableEvidenceL0Count).toBe(0);
    expect(report.registry.stableEvidenceMarkupPrimitiveCount).toBe(0);
    expect(report.checks).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: "installed-capsules", status: "pass" }),
        expect.objectContaining({ id: "stable-l0-evidence", status: "blocked" }),
        expect.objectContaining({ id: "external-review-proof", status: "blocked" }),
      ]),
    );
    expect(report.nextActions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ command: "ashlar verify" }),
        expect.objectContaining({
          command: `ashlar release readiness --registry ${registry} --report reports/release-readiness.md --json-output reports/release-readiness.json`,
        }),
      ]),
    );

    const agents = readFileSync(join(scratch, "AGENTS.md"), "utf8");
    expect(agents).toContain("Use only installed Ashlar capsules");
  });
});
