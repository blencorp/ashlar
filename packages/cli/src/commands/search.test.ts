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
    expect(result.stdout).toContain("banner@0.0.3 [foundations, experimental]");
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

  it("supports shadcn-style search offsets", () => {
    const result = runCli(["search", "--limit", "1", "--offset", "1", "--json"]);
    const payload = JSON.parse(result.stdout) as {
      count: number;
      components: Array<{ name: string }>;
    };

    expect(result.status).toBe(0);
    expect(payload.count).toBe(1);
    expect(payload.components[0]?.name).not.toBe("alert");
  });

  it("accepts human-readable family aliases", () => {
    const result = runCli(["search", "--family", "service-patterns", "--json"]);
    const payload = JSON.parse(result.stdout) as {
      components: Array<{ layer: string; name: string }>;
    };

    expect(result.status).toBe(0);
    expect(payload.components).toEqual([
      expect.objectContaining({ layer: "service-patterns", name: "benefit-application" }),
    ]);
  });

  it("keeps the deprecated layer filter working for existing scripts", () => {
    const result = runCli(["search", "--layer", "service-patterns", "--json"]);
    const payload = JSON.parse(result.stdout) as {
      components: Array<{ layer: string; name: string }>;
    };

    expect(result.status).toBe(0);
    expect(payload.components).toEqual([
      expect.objectContaining({ layer: "service-patterns", name: "benefit-application" }),
    ]);
  });

  it("keeps the deprecated layer option out of normal help", () => {
    const result = runCli(["search", "--help"]);

    expect(result.status).toBe(0);
    expect(result.stdout).toContain("--family <family>");
    expect(result.stdout).not.toContain("--layer");
    expect(result.stdout).not.toContain("--tier");
  });
});
