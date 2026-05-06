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

describe("search command", () => {
  it("prints ranked DX guidance for policy-aware discovery", () => {
    const result = runCli(["search", "official website", "--policy", "Federal Website Standards"]);

    expect(result.status).toBe(0);
    expect(result.stdout).toContain("banner@0.0.1 [L0, primitive, experimental]");
    expect(result.stdout).toContain("Reasons:");
    expect(result.stdout).toContain("policy: Federal Website Standards");
    expect(result.stdout).toContain("Install: ashlar add banner");
  });

  it("emits structured JSON for coding agents", () => {
    const result = runCli(["search", "--feature", "details-summary", "--json"]);
    const payload = JSON.parse(result.stdout) as {
      count: number;
      components: Array<{ name: string; installCommand: string; reasons: string[] }>;
    };

    expect(result.status).toBe(0);
    expect(payload.count).toBe(1);
    expect(payload.components[0]).toMatchObject({
      name: "banner",
      installCommand: "ashlar add banner",
    });
    expect(payload.components[0]?.reasons.join(" ")).toContain("feature: details-summary");
  });
});
