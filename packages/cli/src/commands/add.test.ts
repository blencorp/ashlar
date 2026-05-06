import { spawnSync } from "node:child_process";
import { cpSync, existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

const here = fileURLToPath(new URL(".", import.meta.url));
const cliEntry = join(here, "..", "..", "dist", "index.js");
const repoRoot = resolve(here, "..", "..", "..", "..");

let scratch: string;

beforeAll(() => {
  scratch = mkdtempSync(join(tmpdir(), "ashlar-add-test-"));
});

afterAll(() => {
  rmSync(scratch, { recursive: true, force: true });
});

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

describe("add command", () => {
  it("installs service-flow capsules, syncs AGENTS.md, and verify detects tampering", () => {
    const registry = join(repoRoot, "registry");

    expect(runCli(["init", "--registry", registry], scratch).status).toBe(0);
    const add = runCli(
      ["add", "form-field", "text-input", "button", "alert", "error-summary"],
      scratch,
    );
    expect(add.status).toBe(0);
    expect(add.stdout).toContain("Added form-field@0.0.1");
    expect(add.stdout).toContain("src/ashlar/components/text-input/text-input.css");

    const agents = readFileSync(join(scratch, "AGENTS.md"), "utf8");
    expect(agents).toContain("alert@0.0.1 (experimental)");
    expect(agents).toContain("button@0.0.1 (experimental)");
    expect(agents).toContain("form-field@0.0.1 (experimental)");
    expect(agents).toContain("ashlar audit --policy all");
    expect(readFileSync(join(scratch, ".cursor/rules/ashlar.mdc"), "utf8")).toContain(
      "form-field@0.0.1 (experimental)",
    );
    expect(readFileSync(join(scratch, ".github/copilot-instructions.md"), "utf8")).toContain(
      "Use only installed Ashlar capsules",
    );
    const design = readFileSync(join(scratch, "DESIGN.md"), "utf8");
    expect(design).toContain("form-field@0.0.1");
    expect(design).toContain("--ashlar-color-action-primary-bg");
    expect(design).toContain("validate_usage");

    expect(existsSync(join(scratch, "src/ashlar/indexes/components.json"))).toBe(true);

    const verifyClean = runCli(["verify"], scratch);
    expect(verifyClean.status).toBe(0);
    expect(verifyClean.stdout).toContain("Verified with 0 warning(s)");

    writeFileSync(
      join(scratch, "src/ashlar/components/button/button.css"),
      "\n/* local tamper */\n",
      { flag: "a" },
    );
    const verifyTampered = runCli(["verify"], scratch);
    expect(verifyTampered.status).toBe(0);
    expect(verifyTampered.stdout).toContain("! button: local edits");
    expect(verifyTampered.stdout).toContain("Verified with 1 warning(s)");
  });

  it("refuses to install a capsule with a stale registry manifest", () => {
    const localScratch = mkdtempSync(join(tmpdir(), "ashlar-add-test-"));
    const registry = join(localScratch, "registry");

    try {
      cpSync(join(repoRoot, "registry"), registry, { recursive: true });
      const manifestPath = join(
        registry,
        "components",
        "button",
        "0.0.1",
        "button.capsule.json",
      );
      const manifest = JSON.parse(readFileSync(manifestPath, "utf8")) as {
        files: Record<string, string>;
      };
      manifest.files["button.css"] =
        "sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";
      writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);

      expect(runCli(["init", "--registry", registry], localScratch).status).toBe(0);
      const add = runCli(["add", "button"], localScratch);

      expect(add.status).toBe(1);
      expect(add.stdout).toContain("capsule manifest integrity failed for button@0.0.1");
    } finally {
      rmSync(localScratch, { recursive: true, force: true });
    }
  });

  it("refuses to install a capsule whose manifest hash does not match the registry index", () => {
    const localScratch = mkdtempSync(join(tmpdir(), "ashlar-add-index-test-"));
    const registry = join(localScratch, "registry");

    try {
      cpSync(join(repoRoot, "registry"), registry, { recursive: true });
      const indexPath = join(registry, "index.json");
      const index = JSON.parse(readFileSync(indexPath, "utf8")) as {
        components: { button: { capsuleHashes: Record<string, string> } };
      };
      index.components.button.capsuleHashes["0.0.1"] =
        "sha256:bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb";
      writeFileSync(indexPath, `${JSON.stringify(index, null, 2)}\n`);

      expect(runCli(["init", "--registry", registry], localScratch).status).toBe(0);
      const add = runCli(["add", "button"], localScratch);

      expect(add.status).toBe(1);
      expect(add.stdout).toContain("registry index capsule hash mismatch");
    } finally {
      rmSync(localScratch, { recursive: true, force: true });
    }
  });

  it("refuses to install a capsule with an invalid registry signature", () => {
    const localScratch = mkdtempSync(join(tmpdir(), "ashlar-add-signature-test-"));
    const registry = join(localScratch, "registry");

    try {
      cpSync(join(repoRoot, "registry"), registry, { recursive: true });
      const manifestPath = join(
        registry,
        "components",
        "button",
        "0.0.1",
        "button.capsule.json",
      );
      const manifest = JSON.parse(readFileSync(manifestPath, "utf8")) as {
        signature?: { value: string };
      };
      manifest.signature = {
        ...(manifest.signature ?? { keyId: "ashlar-local-dev-2026-05-05", algorithm: "ed25519" }),
        value: "not-a-valid-signature",
      };
      writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);

      expect(runCli(["init", "--registry", registry], localScratch).status).toBe(0);
      const add = runCli(["add", "button"], localScratch);

      expect(add.status).toBe(1);
      expect(add.stdout).toContain("capsule signature verification failed");
    } finally {
      rmSync(localScratch, { recursive: true, force: true });
    }
  });

  it("verify rejects a lockfile capsule hash that no longer matches the registry index", () => {
    const localScratch = mkdtempSync(join(tmpdir(), "ashlar-verify-index-test-"));
    const registry = join(localScratch, "registry");

    try {
      cpSync(join(repoRoot, "registry"), registry, { recursive: true });
      expect(runCli(["init", "--registry", registry], localScratch).status).toBe(0);
      expect(runCli(["add", "button"], localScratch).status).toBe(0);

      const indexPath = join(registry, "index.json");
      const index = JSON.parse(readFileSync(indexPath, "utf8")) as {
        components: { button: { capsuleHashes: Record<string, string> } };
      };
      index.components.button.capsuleHashes["0.0.1"] =
        "sha256:dddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddd";
      writeFileSync(indexPath, `${JSON.stringify(index, null, 2)}\n`);

      const verify = runCli(["verify"], localScratch);

      expect(verify.status).toBe(1);
      expect(verify.stdout).toContain("lockfile capsule hash");
      expect(verify.stdout).toContain("does not match registry index");
    } finally {
      rmSync(localScratch, { recursive: true, force: true });
    }
  });

  it("verify rejects a stale registry capsule manifest after install", () => {
    const localScratch = mkdtempSync(join(tmpdir(), "ashlar-verify-manifest-test-"));
    const registry = join(localScratch, "registry");

    try {
      cpSync(join(repoRoot, "registry"), registry, { recursive: true });
      expect(runCli(["init", "--registry", registry], localScratch).status).toBe(0);
      expect(runCli(["add", "button"], localScratch).status).toBe(0);

      writeFileSync(
        join(registry, "components", "button", "0.0.1", "button.css"),
        "\n/* tampered registry source */\n",
        { flag: "a" },
      );

      const verify = runCli(["verify"], localScratch);

      expect(verify.status).toBe(1);
      expect(verify.stdout).toContain("capsule manifest integrity failed");
    } finally {
      rmSync(localScratch, { recursive: true, force: true });
    }
  });

  it("verify rejects a registry capsule signature that no longer validates", () => {
    const localScratch = mkdtempSync(join(tmpdir(), "ashlar-verify-signature-test-"));
    const registry = join(localScratch, "registry");

    try {
      cpSync(join(repoRoot, "registry"), registry, { recursive: true });
      expect(runCli(["init", "--registry", registry], localScratch).status).toBe(0);
      expect(runCli(["add", "button"], localScratch).status).toBe(0);

      const manifestPath = join(
        registry,
        "components",
        "button",
        "0.0.1",
        "button.capsule.json",
      );
      const manifest = JSON.parse(readFileSync(manifestPath, "utf8")) as {
        signature?: { value: string };
      };
      manifest.signature = {
        ...(manifest.signature ?? { keyId: "ashlar-local-dev-2026-05-05", algorithm: "ed25519" }),
        value: "not-a-valid-signature",
      };
      writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);

      const verify = runCli(["verify"], localScratch);

      expect(verify.status).toBe(1);
      expect(verify.stdout).toContain("capsule signature verification failed");
    } finally {
      rmSync(localScratch, { recursive: true, force: true });
    }
  });

  it("verify rejects a missing registry capsule manifest after install", () => {
    const localScratch = mkdtempSync(join(tmpdir(), "ashlar-verify-missing-manifest-test-"));
    const registry = join(localScratch, "registry");

    try {
      cpSync(join(repoRoot, "registry"), registry, { recursive: true });
      expect(runCli(["init", "--registry", registry], localScratch).status).toBe(0);
      expect(runCli(["add", "button"], localScratch).status).toBe(0);

      rmSync(join(registry, "components", "button", "0.0.1", "button.capsule.json"), {
        force: true,
      });

      const verify = runCli(["verify"], localScratch);

      expect(verify.status).toBe(1);
      expect(verify.stdout).toContain("Ashlar capsule manifest not found");
    } finally {
      rmSync(localScratch, { recursive: true, force: true });
    }
  });

  it("verify rejects an invalid registry capsule manifest after install", () => {
    const localScratch = mkdtempSync(join(tmpdir(), "ashlar-verify-invalid-manifest-test-"));
    const registry = join(localScratch, "registry");

    try {
      cpSync(join(repoRoot, "registry"), registry, { recursive: true });
      expect(runCli(["init", "--registry", registry], localScratch).status).toBe(0);
      expect(runCli(["add", "button"], localScratch).status).toBe(0);

      writeFileSync(
        join(registry, "components", "button", "0.0.1", "button.capsule.json"),
        "{}\n",
      );

      const verify = runCli(["verify"], localScratch);

      expect(verify.status).toBe(1);
      expect(verify.stdout).toContain("Invalid Ashlar capsule manifest");
    } finally {
      rmSync(localScratch, { recursive: true, force: true });
    }
  });

  it("verify rejects a missing registry index entry after install", () => {
    const localScratch = mkdtempSync(join(tmpdir(), "ashlar-verify-missing-index-test-"));
    const registry = join(localScratch, "registry");

    try {
      cpSync(join(repoRoot, "registry"), registry, { recursive: true });
      expect(runCli(["init", "--registry", registry], localScratch).status).toBe(0);
      expect(runCli(["add", "button"], localScratch).status).toBe(0);

      const indexPath = join(registry, "index.json");
      const index = JSON.parse(readFileSync(indexPath, "utf8")) as {
        components: Record<string, unknown>;
      };
      delete index.components.button;
      writeFileSync(indexPath, `${JSON.stringify(index, null, 2)}\n`);

      const verify = runCli(["verify"], localScratch);

      expect(verify.status).toBe(1);
      expect(verify.stdout).toContain("Unknown Ashlar component: button");
    } finally {
      rmSync(localScratch, { recursive: true, force: true });
    }
  });

  it("verify rejects lockfiles with missing file hashes", () => {
    const localScratch = mkdtempSync(join(tmpdir(), "ashlar-verify-invalid-lockfile-test-"));
    const registry = join(localScratch, "registry");

    try {
      cpSync(join(repoRoot, "registry"), registry, { recursive: true });
      expect(runCli(["init", "--registry", registry], localScratch).status).toBe(0);
      expect(runCli(["add", "button"], localScratch).status).toBe(0);

      const lockfilePath = join(localScratch, "ashlar-lock.json");
      const lockfile = JSON.parse(readFileSync(lockfilePath, "utf8")) as {
        components: {
          button: {
            files: Record<string, { original_hash?: string }>;
          };
        };
      };
      const installedFile = Object.keys(lockfile.components.button.files)[0];
      if (!installedFile) {
        throw new Error("Expected button to install at least one file");
      }
      delete lockfile.components.button.files[installedFile]?.original_hash;
      writeFileSync(lockfilePath, `${JSON.stringify(lockfile, null, 2)}\n`);

      const verify = runCli(["verify"], localScratch);

      expect(verify.status).toBe(1);
      expect(verify.stdout).toContain("Invalid Ashlar lockfile");
      expect(verify.stdout).toContain("original_hash");
    } finally {
      rmSync(localScratch, { recursive: true, force: true });
    }
  });

  it("verify does not persist current hashes when verification fails", () => {
    const localScratch = mkdtempSync(join(tmpdir(), "ashlar-verify-no-failed-write-test-"));
    const registry = join(localScratch, "registry");

    try {
      cpSync(join(repoRoot, "registry"), registry, { recursive: true });
      expect(runCli(["init", "--registry", registry], localScratch).status).toBe(0);
      expect(runCli(["add", "button"], localScratch).status).toBe(0);

      const lockfilePath = join(localScratch, "ashlar-lock.json");
      const before = JSON.parse(readFileSync(lockfilePath, "utf8")) as {
        components: {
          button: {
            files: Record<string, { current_hash: string }>;
          };
        };
      };
      const installedFile = Object.keys(before.components.button.files)[0];
      if (!installedFile) {
        throw new Error("Expected button to install at least one file");
      }
      const beforeCurrentHash = before.components.button.files[installedFile]?.current_hash;

      writeFileSync(join(localScratch, installedFile), "\n/* local tamper */\n", { flag: "a" });

      const indexPath = join(registry, "index.json");
      const index = JSON.parse(readFileSync(indexPath, "utf8")) as {
        components: { button: { capsuleHashes: Record<string, string> } };
      };
      index.components.button.capsuleHashes["0.0.1"] =
        "sha256:eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee";
      writeFileSync(indexPath, `${JSON.stringify(index, null, 2)}\n`);

      const verify = runCli(["verify"], localScratch);
      const after = JSON.parse(readFileSync(lockfilePath, "utf8")) as {
        components: {
          button: {
            files: Record<string, { current_hash: string }>;
          };
        };
      };

      expect(verify.status).toBe(1);
      expect(after.components.button.files[installedFile]?.current_hash).toBe(beforeCurrentHash);
    } finally {
      rmSync(localScratch, { recursive: true, force: true });
    }
  });
});
