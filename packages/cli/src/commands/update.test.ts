import { spawnSync } from "node:child_process";
import { generateKeyPairSync } from "node:crypto";
import { cpSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { buildCapsuleManifest, signCapsuleManifest, type CapsuleManifest } from "../lib/capsule.js";

const here = fileURLToPath(new URL(".", import.meta.url));
const cliEntry = join(here, "..", "..", "dist", "index.js");
const repoRoot = resolve(here, "..", "..", "..", "..");
const sourceButton = join(repoRoot, "registry", "components", "button", "0.0.1");
const registrySigningKeyId = "ashlar-update-test-key";
const registrySigningKey = generateKeyPairSync("ed25519");
const registrySigningPrivateKey = registrySigningKey.privateKey.export({
  format: "pem",
  type: "pkcs8",
});

let scratch: string;
let registry: string;

function runCli(args: string[], cwd = scratch, input?: string): { stdout: string; status: number } {
  const result = spawnSync(process.execPath, [cliEntry, ...args], {
    cwd,
    encoding: "utf8",
    input,
    stdio: ["pipe", "pipe", "pipe"],
  });

  return {
    stdout: `${result.stdout ?? ""}${result.stderr ?? ""}`,
    status: result.status ?? 1,
  };
}

function writeJson(path: string, value: unknown): void {
  writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`);
}

function writeTrustRoot(registryPath: string): void {
  writeJson(join(registryPath, "trust-root.json"), {
    $schema: "https://ashlar.dev/schemas/trust-root.schema.json",
    schemaVersion: "1.0",
    keys: [
      {
        keyId: registrySigningKeyId,
        algorithm: "ed25519",
        publicKey: registrySigningKey.publicKey
          .export({ format: "der", type: "spki" })
          .toString("base64"),
      },
    ],
  });
}

function signManifest(manifest: CapsuleManifest): CapsuleManifest {
  return signCapsuleManifest({
    manifest,
    keyId: registrySigningKeyId,
    privateKey: registrySigningPrivateKey,
  });
}

function writeSignedManifest(
  directory: string,
  component: string,
  manifest: CapsuleManifest,
): void {
  writeJson(join(directory, `${component}.capsule.json`), signManifest(manifest));
}

function createRegistry(): void {
  registry = join(scratch, "registry");
  const buttonV1 = join(registry, "components", "button", "0.0.1");
  cpSync(sourceButton, buttonV1, { recursive: true });
  writeTrustRoot(registry);
  const manifest = JSON.parse(
    readFileSync(join(buttonV1, "button.capsule.json"), "utf8"),
  ) as CapsuleManifest;
  writeSignedManifest(buttonV1, "button", manifest);
  writeJson(join(registry, "index.json"), {
    $schema: "https://ashlar.dev/schemas/registry-index.schema.json",
    schemaVersion: "1.0",
    registry: "./registry",
    name: "ashlar-update-test",
    version: "0.0.1",
    components: {
      button: {
        latest: "0.0.1",
        versions: ["0.0.1"],
        capsuleHashes: {
          "0.0.1": manifest.capsule_hash,
        },
        tier: "primitive",
        layer: "L0",
        stability: "experimental",
        description: "Accessible semantic action control for forms and workflows.",
      },
    },
  });
}

function publishButtonV2(cssTransform: (css: string) => string): void {
  const buttonV2 = join(registry, "components", "button", "0.0.2");
  cpSync(sourceButton, buttonV2, { recursive: true });

  const cssPath = join(buttonV2, "button.css");
  writeFileSync(cssPath, cssTransform(readFileSync(cssPath, "utf8")));

  for (const file of ["button.cem.json", "button.evidence.json"]) {
    const path = join(buttonV2, file);
    writeFileSync(path, readFileSync(path, "utf8").replaceAll("0.0.1", "0.0.2"));
  }
  const manifest = buildCapsuleManifest({
    directory: buttonV2,
    name: "button",
    version: "0.0.2",
    layer: "L0",
    stability: "experimental",
  });
  writeSignedManifest(buttonV2, "button", manifest);

  const indexPath = join(registry, "index.json");
  const index = JSON.parse(readFileSync(indexPath, "utf8")) as {
    components: {
      button: { latest: string; versions: string[]; capsuleHashes: Record<string, string> };
    };
  };
  index.components.button.latest = "0.0.2";
  index.components.button.versions = ["0.0.1", "0.0.2"];
  index.components.button.capsuleHashes["0.0.2"] = manifest.capsule_hash;
  writeJson(indexPath, index);
}

function publishButtonV2WithCodemod(cssTransform: (css: string) => string): void {
  const buttonV2 = join(registry, "components", "button", "0.0.2");
  cpSync(sourceButton, buttonV2, { recursive: true });

  const cssPath = join(buttonV2, "button.css");
  writeFileSync(cssPath, cssTransform(readFileSync(cssPath, "utf8")));
  writeJson(join(buttonV2, "button.codemods.json"), {
    schemaVersion: "1.0",
    component: "button",
    from: "0.0.1",
    to: "0.0.2",
    rules: [
      {
        id: "rename-primary-bg-token",
        target: "button.css",
        language: "css",
        pattern: "color: var(--ashlar-color-action-primary-bg);",
        rewrite: "color: var(--ashlar-color-action-primary-surface);",
      },
    ],
  });

  for (const file of ["button.cem.json", "button.evidence.json"]) {
    const path = join(buttonV2, file);
    writeFileSync(path, readFileSync(path, "utf8").replaceAll("0.0.1", "0.0.2"));
  }
  const manifest = buildCapsuleManifest({
    directory: buttonV2,
    name: "button",
    version: "0.0.2",
    layer: "L0" as const,
    stability: "experimental" as const,
    codemods: ["button.codemods.json"],
  });
  writeSignedManifest(buttonV2, "button", manifest);

  const indexPath = join(registry, "index.json");
  const index = JSON.parse(readFileSync(indexPath, "utf8")) as {
    components: {
      button: { latest: string; versions: string[]; capsuleHashes: Record<string, string> };
    };
  };
  index.components.button.latest = "0.0.2";
  index.components.button.versions = ["0.0.1", "0.0.2"];
  index.components.button.capsuleHashes["0.0.2"] = manifest.capsule_hash;
  writeJson(indexPath, index);
}

function publishButtonVersionWithCodemod(input: {
  version: string;
  previousVersion: string;
  versions: string[];
  cssTransform: (css: string) => string;
  codemod: {
    pattern: string;
    rewrite: string;
  };
}): void {
  const buttonVersion = join(registry, "components", "button", input.version);
  cpSync(sourceButton, buttonVersion, { recursive: true });

  const cssPath = join(buttonVersion, "button.css");
  writeFileSync(cssPath, input.cssTransform(readFileSync(cssPath, "utf8")));
  writeJson(join(buttonVersion, "button.codemods.json"), {
    schemaVersion: "1.0",
    component: "button",
    from: input.previousVersion,
    to: input.version,
    rules: [
      {
        id: `button-token-${input.version.replaceAll(".", "-")}`,
        target: "button.css",
        language: "css",
        pattern: input.codemod.pattern,
        rewrite: input.codemod.rewrite,
      },
    ],
  });

  for (const file of ["button.cem.json", "button.evidence.json"]) {
    const path = join(buttonVersion, file);
    writeFileSync(path, readFileSync(path, "utf8").replaceAll("0.0.1", input.version));
  }

  const manifest = buildCapsuleManifest({
    directory: buttonVersion,
    name: "button",
    version: input.version,
    layer: "L0" as const,
    stability: "experimental" as const,
    codemods: ["button.codemods.json"],
  });
  writeSignedManifest(buttonVersion, "button", manifest);

  const indexPath = join(registry, "index.json");
  const index = JSON.parse(readFileSync(indexPath, "utf8")) as {
    components: {
      button: { latest: string; versions: string[]; capsuleHashes: Record<string, string> };
    };
  };
  index.components.button.latest = input.version;
  index.components.button.versions = input.versions;
  index.components.button.capsuleHashes[input.version] = manifest.capsule_hash;
  writeJson(indexPath, index);
}

function installedButtonCss(): string {
  return join(scratch, "src", "ashlar", "components", "button", "button.css");
}

beforeEach(() => {
  scratch = mkdtempSync(join(tmpdir(), "ashlar-update-test-"));
  createRegistry();
  expect(runCli(["init", "--registry", registry]).status).toBe(0);
  expect(runCli(["add", "button"]).status).toBe(0);
});

afterEach(() => {
  rmSync(scratch, { recursive: true, force: true });
});

describe("update command", () => {
  it("requires explicit approval before touching accessibility-critical files", () => {
    const before = readFileSync(installedButtonCss(), "utf8");
    publishButtonV2((css) => css.replace("font-weight: 700;", "font-weight: 800;"));

    const result = runCli(["update", "button"]);

    expect(result.status).toBe(1);
    expect(result.stdout).toContain("Ashlar update requires review for button: 0.0.1 -> 0.0.2");
    expect(result.stdout).toContain("Accessibility-critical files:");
    expect(result.stdout).toContain("src/ashlar/components/button/button.css");
    expect(result.stdout).toContain("src/ashlar/components/button/button.html");
    expect(result.stdout).toContain("Why review matters:");
    expect(result.stdout).toContain("Review preview:");
    expect(result.stdout).toContain("src/ashlar/components/button/button.css");
    expect(result.stdout).toContain("-    font-weight: 700;");
    expect(result.stdout).toContain("+    font-weight: 800;");
    expect(result.stdout).toContain("Run after review: ashlar update button --yes");
    expect(readFileSync(installedButtonCss(), "utf8")).toBe(before);
  });

  it("replaces clean files when upstream publishes a new version", () => {
    publishButtonV2((css) => css.replace("font-weight: 700;", "font-weight: 800;"));

    const result = runCli(["update", "button", "--yes"]);

    expect(result.status).toBe(0);
    expect(result.stdout).toContain("Updated button: 0.0.1 -> 0.0.2");
    expect(readFileSync(installedButtonCss(), "utf8")).toContain("font-weight: 800;");

    const lockfile = JSON.parse(readFileSync(join(scratch, "ashlar-lock.json"), "utf8")) as {
      components: { button: { version: string } };
    };
    expect(lockfile.components.button.version).toBe("0.0.2");
  });

  it("applies a reviewed accessibility-critical update after interactive approval", () => {
    publishButtonV2((css) => css.replace("font-weight: 700;", "font-weight: 800;"));

    const result = runCli(["update", "button", "--prompt"], scratch, "y\n");

    expect(result.status).toBe(0);
    expect(result.stdout).toContain("Apply this update after review? [y/N]");
    expect(result.stdout).toContain("Updated button: 0.0.1 -> 0.0.2");
    expect(readFileSync(installedButtonCss(), "utf8")).toContain("font-weight: 800;");
  });

  it("does not apply an accessibility-critical update when interactive approval is declined", () => {
    const before = readFileSync(installedButtonCss(), "utf8");
    publishButtonV2((css) => css.replace("font-weight: 700;", "font-weight: 800;"));

    const result = runCli(["update", "button", "--prompt"], scratch, "n\n");

    expect(result.status).toBe(1);
    expect(result.stdout).toContain("Apply this update after review? [y/N]");
    expect(result.stdout).toContain("Update not applied");
    expect(readFileSync(installedButtonCss(), "utf8")).toBe(before);
  });

  it("refuses to update from a stale registry manifest", () => {
    const before = readFileSync(installedButtonCss(), "utf8");
    publishButtonV2((css) => css.replace("font-weight: 700;", "font-weight: 800;"));
    writeFileSync(
      join(registry, "components", "button", "0.0.2", "button.css"),
      "\n/* tampered after manifest */\n",
      { flag: "a" },
    );

    const result = runCli(["update", "button", "--yes"]);

    expect(result.status).toBe(1);
    expect(result.stdout).toContain("capsule manifest integrity failed");
    expect(readFileSync(installedButtonCss(), "utf8")).toBe(before);
  });

  it("refuses to update when the registry index points to a different capsule hash", () => {
    const before = readFileSync(installedButtonCss(), "utf8");
    publishButtonV2((css) => css.replace("font-weight: 700;", "font-weight: 800;"));
    const indexPath = join(registry, "index.json");
    const index = JSON.parse(readFileSync(indexPath, "utf8")) as {
      components: { button: { capsuleHashes: Record<string, string> } };
    };
    index.components.button.capsuleHashes["0.0.2"] =
      "sha256:cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc";
    writeJson(indexPath, index);

    const result = runCli(["update", "button", "--yes"]);

    expect(result.status).toBe(1);
    expect(result.stdout).toContain("registry index capsule hash mismatch");
    expect(readFileSync(installedButtonCss(), "utf8")).toBe(before);
  });

  it("three-way merges local edits with non-overlapping upstream changes", () => {
    writeFileSync(
      installedButtonCss(),
      readFileSync(installedButtonCss(), "utf8").replace("font-weight: 700;", "font-weight: 800;"),
    );
    publishButtonV2((css) =>
      css.replace(
        "background: var(--ashlar-color-action-primary-hover, #1a4480);",
        "background: var(--ashlar-color-action-primary-hover, #005ea8);",
      ),
    );

    const result = runCli(["update", "button", "--yes"]);
    const css = readFileSync(installedButtonCss(), "utf8");

    expect(result.status).toBe(0);
    expect(result.stdout).toContain("merged");
    expect(css).toContain("font-weight: 800;");
    expect(css).toContain("background: var(--ashlar-color-action-primary-hover, #005ea8);");
  });

  it("applies capsule codemods before merging upstream changes", () => {
    writeFileSync(
      installedButtonCss(),
      `${readFileSync(installedButtonCss(), "utf8")}\n.local-action { color: var(--ashlar-color-action-primary-bg); }\n`,
    );
    publishButtonV2WithCodemod((css) =>
      css.replaceAll("--ashlar-color-action-primary-bg", "--ashlar-color-action-primary-surface"),
    );

    const result = runCli(["update", "button", "--yes"]);
    const css = readFileSync(installedButtonCss(), "utf8");

    expect(result.status).toBe(0);
    expect(result.stdout).toContain("codemod");
    expect(result.stdout).toContain("Updated button: 0.0.1 -> 0.0.2");
    expect(css).toContain(".local-action { color: var(--ashlar-color-action-primary-surface); }");
    expect(css).not.toContain(".local-action { color: var(--ashlar-color-action-primary-bg); }");
  });

  it("writes a structured update survival report", () => {
    writeFileSync(
      installedButtonCss(),
      `${readFileSync(installedButtonCss(), "utf8")}\n.local-action { color: var(--ashlar-color-action-primary-bg); }\n`,
    );
    publishButtonV2WithCodemod((css) =>
      css.replaceAll("--ashlar-color-action-primary-bg", "--ashlar-color-action-primary-surface"),
    );

    const result = runCli([
      "update",
      "button",
      "--yes",
      "--survival-report",
      "update-survival.json",
    ]);
    const report = JSON.parse(readFileSync(join(scratch, "update-survival.json"), "utf8")) as {
      totals: {
        codemodReplacements: number;
        conflictRate: number;
        files: number;
        merged: number;
      };
      updates: Array<{
        codemods: { replacements: number };
        component: string;
        files: { conflicts: number; merged: number };
        status: string;
      }>;
    };

    expect(result.status).toBe(0);
    expect(report.updates).toHaveLength(1);
    expect(report.updates[0]).toMatchObject({
      component: "button",
      status: "updated",
      codemods: { replacements: 1 },
      files: { conflicts: 0, merged: 1 },
    });
    expect(report.totals).toMatchObject({
      codemodReplacements: 1,
      conflictRate: 0,
      files: 5,
      merged: 1,
    });
  });

  it("applies intermediate capsule codemods in version order when skipping versions", () => {
    writeFileSync(
      installedButtonCss(),
      `${readFileSync(installedButtonCss(), "utf8")}\n.local-action { color: var(--ashlar-color-action-primary-bg); }\n`,
    );

    publishButtonVersionWithCodemod({
      version: "0.0.2",
      previousVersion: "0.0.1",
      versions: ["0.0.1", "0.0.2"],
      cssTransform: (css) =>
        css.replaceAll("--ashlar-color-action-primary-bg", "--ashlar-color-action-primary-surface"),
      codemod: {
        pattern: "color: var(--ashlar-color-action-primary-bg);",
        rewrite: "color: var(--ashlar-color-action-primary-surface);",
      },
    });
    publishButtonVersionWithCodemod({
      version: "0.0.3",
      previousVersion: "0.0.2",
      versions: ["0.0.1", "0.0.2", "0.0.3"],
      cssTransform: (css) =>
        css.replaceAll("--ashlar-color-action-primary-bg", "--ashlar-color-action-primary-fill"),
      codemod: {
        pattern: "color: var(--ashlar-color-action-primary-surface);",
        rewrite: "color: var(--ashlar-color-action-primary-fill);",
      },
    });

    const result = runCli(["update", "button", "--yes"]);
    const css = readFileSync(installedButtonCss(), "utf8");

    expect(result.status).toBe(0);
    expect(result.stdout).toContain("Updated button: 0.0.1 -> 0.0.3");
    expect(css).toContain(".local-action { color: var(--ashlar-color-action-primary-fill); }");
    expect(css).not.toContain("ashlar-color-action-primary-bg");
    expect(css).not.toContain("ashlar-color-action-primary-surface");
  });

  it("writes conflict markers and finalizes after --resolved", () => {
    writeFileSync(
      installedButtonCss(),
      readFileSync(installedButtonCss(), "utf8").replace("font-weight: 700;", "font-weight: 800;"),
    );
    publishButtonV2((css) => css.replace("font-weight: 700;", "font-weight: 600;"));

    const update = runCli(["update", "button", "--yes"]);
    expect(update.status).toBe(1);
    expect(update.stdout).toContain("conflict");
    expect(readFileSync(installedButtonCss(), "utf8")).toContain("<<<<<<<");

    writeFileSync(
      installedButtonCss(),
      readFileSync(installedButtonCss(), "utf8").replace(
        /<<<<<<<[\s\S]*?>>>>>>>[^\n]*\n?/,
        "    font-weight: 800;\n",
      ),
    );

    const resolved = runCli(["update", "--resolved", "button"]);
    expect(resolved.status).toBe(0);
    expect(resolved.stdout).toContain("Resolved button@0.0.2");
    expect(readFileSync(installedButtonCss(), "utf8")).not.toContain("<<<<<<<");
  });

  it("refreshes current_hash through verify after local edits", () => {
    writeFileSync(installedButtonCss(), "\n/* local */\n", { flag: "a" });
    const verify = runCli(["verify"]);
    const lockfile = JSON.parse(readFileSync(join(scratch, "ashlar-lock.json"), "utf8")) as {
      components: { button: { files: Record<string, { current_hash: string }> } };
    };
    const installedPath = Object.keys(lockfile.components.button.files).find((file) =>
      file.endsWith("button.css"),
    );

    expect(verify.status).toBe(0);
    expect(verify.stdout).toContain("local edits");
    expect(installedPath).toBeDefined();
    expect(lockfile.components.button.files[installedPath as string]?.current_hash).toMatch(
      /^sha256:/,
    );
  });
});
