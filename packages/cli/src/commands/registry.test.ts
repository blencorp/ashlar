import { spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

const here = fileURLToPath(new URL(".", import.meta.url));
const cliEntry = join(here, "..", "..", "dist", "index.js");
const repoRoot = resolve(here, "..", "..", "..", "..");

let scratch: string;

function runCli(args: string[], cwd = scratch): { stdout: string; status: number } {
  const result = spawnSync(process.execPath, [cliEntry, ...args], {
    cwd,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });

  return {
    stdout: `${result.stdout ?? ""}${result.stderr ?? ""}`,
    status: result.status ?? 1,
  };
}

beforeEach(() => {
  scratch = mkdtempSync(join(tmpdir(), "ashlar-registry-test-"));
});

afterEach(() => {
  rmSync(scratch, { recursive: true, force: true });
});

describe("registry command", () => {
  it("mirrors a verified registry for offline install and verify", () => {
    const mirror = join(scratch, "mirror");
    const result = runCli([
      "registry",
      "mirror",
      "--registry",
      join(repoRoot, "registry"),
      "--output",
      mirror,
    ]);

    expect(result.status).toBe(0);
    expect(result.stdout).toContain("Mirrored 13 component(s)");
    expect(existsSync(join(mirror, "index.json"))).toBe(true);
    expect(existsSync(join(mirror, "trust-root.json"))).toBe(true);
    expect(existsSync(join(mirror, "components", "button", "0.0.1", "button.capsule.json"))).toBe(
      true,
    );

    expect(runCli(["init", "--registry", mirror]).status).toBe(0);
    expect(runCli(["add", "button"]).status).toBe(0);
    const verify = runCli(["verify"]);

    expect(verify.status).toBe(0);
    expect(verify.stdout).toContain("ok button: registry capsule signature");
  });

  it("refuses to mirror a registry with an invalid capsule signature", () => {
    const registry = join(scratch, "registry");
    const mirror = join(scratch, "mirror");
    runCli(["registry", "mirror", "--registry", join(repoRoot, "registry"), "--output", registry]);

    const manifestPath = join(registry, "components", "button", "0.0.1", "button.capsule.json");
    const manifest = JSON.parse(readFileSync(manifestPath, "utf8")) as {
      signature?: { value: string };
    };
    manifest.signature = {
      ...(manifest.signature ?? { keyId: "ashlar-local-dev-2026-05-05", algorithm: "ed25519" }),
      value: "not-a-valid-signature",
    };
    writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);

    const result = runCli(["registry", "mirror", "--registry", registry, "--output", mirror]);

    expect(result.status).toBe(1);
    expect(result.stdout).toContain("capsule signature verification failed");
    expect(existsSync(mirror)).toBe(false);
  });
});
