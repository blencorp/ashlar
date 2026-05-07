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
    env: { ...process.env, FORCE_COLOR: "0", NO_COLOR: "1" },
    stdio: ["ignore", "pipe", "pipe"],
  });

  return {
    stdout: `${result.stdout ?? ""}${result.stderr ?? ""}`,
    status: result.status ?? 1,
  };
}

describe("cli tui", () => {
  it("prints a branded root help surface with BLEN attribution", () => {
    const result = runCli(["--help"]);

    expect(result.status).toBe(0);
    expect(result.stdout).toContain("Ashlar");
    expect(result.stdout).toContain("Core flow:");
    expect(result.stdout).toContain('ashlar search "official website"');
    expect(result.stdout).toContain("Built with love by the good people at BLEN");
    expect(result.stdout).toContain("https://blencorp.com");
  });

  it("keeps structured JSON output free of TUI branding", () => {
    const result = runCli(["search", "--feature", "details-summary", "--json"]);

    expect(result.status).toBe(0);
    expect(result.stdout).not.toContain("Built with love");
    expect(result.stdout).not.toContain("Core flow:");
    expect(() => JSON.parse(result.stdout)).not.toThrow();
  });

  it("supports shadcn-style list and info aliases", () => {
    const list = runCli(["list", "official website", "--policy", "Federal Website Standards"]);
    expect(list.status).toBe(0);
    expect(list.stdout).toContain("Registry search");
    expect(list.stdout).toContain("Install: ashlar add banner");

    const info = runCli(["info"]);
    expect(info.status).toBe(0);
    expect(info.stdout).toContain("Ashlar status:");
    expect(info.stdout).toContain("Built with love by the good people at BLEN");

    const docs = runCli(["docs", "button"]);
    expect(docs.status).toBe(0);
    expect(docs.stdout).toContain("Capsule metadata");
    expect(docs.stdout).toContain("button@0.0.1");
  });
});
