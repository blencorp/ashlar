import { spawnSync } from "node:child_process";
import { generateKeyPairSync } from "node:crypto";
import { cpSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { buildCapsuleManifest, signCapsuleManifest, type CapsuleManifest } from "../lib/capsule.js";
import { writeJson } from "../lib/project.js";

const here = fileURLToPath(new URL(".", import.meta.url));
const cliEntry = resolve(here, "..", "..", "dist", "index.js");
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

function writeTestTrustRoot(registry: string): {
  keyId: string;
  privateKey: string;
} {
  const { privateKey, publicKey } = generateKeyPairSync("ed25519");
  const keyId = "ashlar-bundle-budget-test-key";
  const privateKeyPem = privateKey.export({ format: "pem", type: "pkcs8" }).toString();

  writeJson(join(registry, "trust-root.json"), {
    $schema: "https://ashlar.dev/schemas/trust-root.schema.json",
    schemaVersion: "1.0",
    keys: [
      {
        keyId,
        algorithm: "ed25519",
        publicKey: publicKey.export({ format: "der", type: "spki" }).toString("base64"),
      },
    ],
  });

  return { keyId, privateKey: privateKeyPem };
}

function signManifest(
  manifest: CapsuleManifest,
  signing: { keyId: string; privateKey: string },
): CapsuleManifest {
  return signCapsuleManifest({
    manifest,
    keyId: signing.keyId,
    privateKey: signing.privateKey,
  });
}

describe("bundle command", () => {
  it("checks component CSS gzip size against a bundle budget", () => {
    const result = runCli([
      "bundle",
      "budget",
      "button",
      "--registry",
      "./registry",
      "--max-css-gzip",
      "4096",
    ]);

    expect(result.status, result.stdout).toBe(0);
    expect(result.stdout).toContain("Bundle budget passed");
    expect(result.stdout).toContain("button@0.0.1");
    expect(result.stdout).toContain("css gzip");
  });

  it("uses capsule manifest budgets when no CLI budget flags are provided", () => {
    const result = runCli(["bundle", "budget", "button", "--registry", "./registry", "--json"]);

    expect(result.status, result.stdout).toBe(0);
    const report = JSON.parse(result.stdout) as {
      components: Array<{ bundleBudget?: { cssGzipBytes?: number; jsGzipBytes?: number } }>;
      status: string;
      summary: { maxCssGzipBytes: number; maxJsGzipBytes: number | null };
    };
    expect(report.status).toBe("pass");
    expect(report.summary.maxCssGzipBytes).toBe(4096);
    expect(report.summary.maxJsGzipBytes).toBe(0);
    expect(report.components[0]?.bundleBudget).toEqual({
      cssGzipBytes: 4096,
      jsGzipBytes: 0,
    });
  });

  it("fails when component CSS exceeds the configured gzip budget", () => {
    const result = runCli([
      "bundle",
      "budget",
      "button",
      "--registry",
      "./registry",
      "--max-css-gzip",
      "1",
    ]);

    expect(result.status, result.stdout).toBe(1);
    expect(result.stdout).toContain("Bundle budget failed");
    expect(result.stdout).toContain("exceeds 1 B");
  });

  it("prints a JSON budget report for CI artifacts", () => {
    const result = runCli([
      "bundle",
      "budget",
      "button",
      "--registry",
      "./registry",
      "--max-css-gzip",
      "4096",
      "--json",
    ]);

    expect(result.status, result.stdout).toBe(0);
    const report = JSON.parse(result.stdout) as {
      components: Array<{
        cssFiles: string[];
        cssGzipBytes: number;
        jsFiles: string[];
        jsGzipBytes: number;
        name: string;
      }>;
      status: string;
      summary: {
        cssGzipBytes: number;
        jsGzipBytes: number;
        maxCssGzipBytes: number;
        maxJsGzipBytes: number | null;
      };
    };
    expect(report.status).toBe("pass");
    expect(report.summary.maxCssGzipBytes).toBe(4096);
    expect(report.summary.cssGzipBytes).toBeGreaterThan(0);
    expect(report.summary.jsGzipBytes).toBe(0);
    expect(report.summary.maxJsGzipBytes).toBe(0);
    expect(report.components).toEqual([
      expect.objectContaining({
        name: "button",
        cssFiles: ["button.css"],
        cssGzipBytes: expect.any(Number),
        jsFiles: [],
        jsGzipBytes: 0,
      }),
    ]);
  });

  it("accepts a JavaScript gzip budget for future behavior components", () => {
    const result = runCli([
      "bundle",
      "budget",
      "button",
      "--registry",
      "./registry",
      "--max-css-gzip",
      "4096",
      "--max-js-gzip",
      "512",
      "--json",
    ]);

    expect(result.status, result.stdout).toBe(0);
    const report = JSON.parse(result.stdout) as {
      status: string;
      summary: { jsFiles: number; jsGzipBytes: number; maxJsGzipBytes: number };
    };
    expect(report.status).toBe("pass");
    expect(report.summary.jsFiles).toBe(0);
    expect(report.summary.jsGzipBytes).toBe(0);
    expect(report.summary.maxJsGzipBytes).toBe(512);
  });

  it("fails when manifest-listed JavaScript exceeds the configured gzip budget", () => {
    const scratch = join(tmpdir(), `ashlar-bundle-budget-${Date.now()}`);
    const registry = join(scratch, "registry");

    try {
      cpSync(join(repoRoot, "registry"), registry, { recursive: true });
      const signing = writeTestTrustRoot(registry);

      const componentDirectory = join(registry, "components", "button", "0.0.1");
      writeFileSync(
        join(componentDirectory, "button.js"),
        "export function enhanceButton(button) { button.dataset.ashlarEnhanced = 'true'; }\n".repeat(
          20,
        ),
      );
      const manifest = buildCapsuleManifest({
        directory: componentDirectory,
        name: "button",
        version: "0.0.1",
        layer: "L0",
        stability: "experimental",
      });
      writeJson(join(componentDirectory, "button.capsule.json"), signManifest(manifest, signing));

      const indexPath = join(registry, "index.json");
      const index = JSON.parse(readFileSync(indexPath, "utf8")) as {
        components: { button: { capsuleHashes: Record<string, string> } };
      };
      index.components.button.capsuleHashes["0.0.1"] = manifest.capsule_hash;
      writeJson(indexPath, index);

      const result = runCli([
        "bundle",
        "budget",
        "button",
        "--registry",
        registry,
        "--max-css-gzip",
        "4096",
        "--max-js-gzip",
        "1",
      ]);

      expect(result.status, result.stdout).toBe(1);
      expect(result.stdout).toContain("Bundle budget failed");
      expect(result.stdout).toContain("Combined JavaScript exceeds 1 B");
    } finally {
      rmSync(scratch, { recursive: true, force: true });
    }
  });
});
