import { generateKeyPairSync, sign } from "node:crypto";
import { chmodSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  buildCapsuleManifest,
  readVerifiedCapsuleManifest,
  verifyCapsuleManifest,
  type CapsuleManifest,
} from "./capsule.js";
import { sha256File, sha256Text } from "./hash.js";
import { writeJson } from "./project.js";

function signedPayload(manifest: CapsuleManifest): string {
  return JSON.stringify({
    schemaVersion: manifest.schemaVersion,
    name: manifest.name,
    version: manifest.version,
    layer: manifest.layer,
    stability: manifest.stability,
    files: manifest.files,
    capsule_hash: manifest.capsule_hash,
    ...(manifest.codemods && manifest.codemods.length > 0 ? { codemods: manifest.codemods } : {}),
    ...(manifest.bundleBudget ? { bundleBudget: manifest.bundleBudget } : {}),
  });
}

describe("buildCapsuleManifest", () => {
  it("hashes files in deterministic order", () => {
    const dir = join(tmpdir(), `ashlar-capsule-${Date.now()}`);
    mkdirSync(dir, { recursive: true });

    try {
      writeFileSync(join(dir, "b.txt"), "b\n");
      writeFileSync(join(dir, "a.txt"), "a\n");
      writeFileSync(join(dir, "button.capsule.json"), "{}\n");

      const manifest = buildCapsuleManifest({
        directory: dir,
        name: "button",
        version: "0.0.1",
        layer: "markup-primitives",
        stability: "experimental",
      });

      expect(Object.keys(manifest.files)).toEqual(["a.txt", "b.txt"]);
      expect(manifest.capsule_hash).toMatch(/^sha256:[a-f0-9]{64}$/);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("requires a trust root before treating a capsule manifest as verified", () => {
    const dir = join(tmpdir(), `ashlar-capsule-${Date.now()}`);
    mkdirSync(dir, { recursive: true });

    try {
      writeFileSync(join(dir, "button.css"), ".ashlar-button {}\n");
      const manifest = buildCapsuleManifest({
        directory: dir,
        name: "button",
        version: "0.0.1",
        layer: "markup-primitives",
        stability: "experimental",
      });
      writeJson(join(dir, "button.capsule.json"), manifest);

      expect(() =>
        readVerifiedCapsuleManifest({
          directory: dir,
          name: "button",
          version: "0.0.1",
          layer: "markup-primitives",
          stability: "experimental",
        }),
      ).toThrow(/capsule trust root is required/i);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("covers bundle budget metadata in the capsule hash", () => {
    const dir = join(tmpdir(), `ashlar-capsule-${Date.now()}`);
    mkdirSync(dir, { recursive: true });

    try {
      writeFileSync(join(dir, "button.css"), ".ashlar-button {}\n");
      const manifest = buildCapsuleManifest({
        directory: dir,
        name: "button",
        version: "0.0.1",
        layer: "markup-primitives",
        stability: "experimental",
        bundleBudget: {
          cssGzipBytes: 4096,
          jsGzipBytes: 0,
        },
      });
      const stale = {
        ...manifest,
        bundleBudget: {
          cssGzipBytes: 1,
          jsGzipBytes: 0,
        },
      };
      writeJson(join(dir, "button.capsule.json"), stale);

      expect(() =>
        readVerifiedCapsuleManifest({
          directory: dir,
          name: "button",
          version: "0.0.1",
          layer: "markup-primitives",
          stability: "experimental",
        }),
      ).toThrow(/capsule_hash mismatch/i);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("verifies Ed25519 capsule signatures against a registry trust root", () => {
    const dir = join(tmpdir(), `ashlar-capsule-${Date.now()}`);
    mkdirSync(dir, { recursive: true });

    try {
      const { publicKey, privateKey } = generateKeyPairSync("ed25519");
      const keyId = "ashlar-test-key";
      const publicKeyDer = publicKey.export({ type: "spki", format: "der" }).toString("base64");
      const trustRoot = {
        schemaVersion: "1.0" as const,
        keys: [{ keyId, algorithm: "ed25519" as const, publicKey: publicKeyDer }],
      };

      writeFileSync(join(dir, "button.css"), ".ashlar-button {}\n");
      const manifest = buildCapsuleManifest({
        directory: dir,
        name: "button",
        version: "0.0.1",
        layer: "markup-primitives",
        stability: "experimental",
      });
      const signature = sign(null, Buffer.from(signedPayload(manifest)), privateKey).toString(
        "base64",
      );
      writeJson(join(dir, "button.capsule.json"), {
        ...manifest,
        signature: { keyId, algorithm: "ed25519", value: signature },
      });

      expect(
        readVerifiedCapsuleManifest({
          directory: dir,
          name: "button",
          version: "0.0.1",
          layer: "markup-primitives",
          stability: "experimental",
          trustRoot,
        }),
      ).toMatchObject({
        name: "button",
        signature: { keyId, algorithm: "ed25519" },
      });

      writeJson(join(dir, "button.capsule.json"), {
        ...manifest,
        signature: { keyId, algorithm: "ed25519", value: "not-a-valid-signature" },
      });

      expect(() =>
        readVerifiedCapsuleManifest({
          directory: dir,
          name: "button",
          version: "0.0.1",
          layer: "markup-primitives",
          stability: "experimental",
          trustRoot,
        }),
      ).toThrow(/capsule signature verification failed/i);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("rejects Sigstore capsule bundles unless the trust policy requires cosign", () => {
    const dir = join(tmpdir(), `ashlar-capsule-${Date.now()}`);
    mkdirSync(dir, { recursive: true });

    try {
      const certificateIdentity =
        "https://github.com/blencorp/ashlar/.github/workflows/sigstore.yml@refs/heads/main";
      const certificateOidcIssuer = "https://token.actions.githubusercontent.com";
      const trustRoot = {
        schemaVersion: "1.0" as const,
        keys: [],
        sigstore: {
          certificateIdentities: [certificateIdentity],
          certificateOidcIssuers: [certificateOidcIssuer],
          bundleVerification: "metadata" as const,
        },
      };

      writeFileSync(join(dir, "button.css"), ".ashlar-button {}\n");
      const manifest = buildCapsuleManifest({
        directory: dir,
        name: "button",
        version: "0.0.1",
        layer: "markup-primitives",
        stability: "experimental",
      });
      writeFileSync(
        join(dir, "button.sigstore.json"),
        JSON.stringify({ mediaType: "application/vnd.dev.sigstore.bundle+json;version=0.3" }),
      );
      const sigstore = {
        bundle: "button.sigstore.json",
        bundleHash: sha256File(join(dir, "button.sigstore.json")),
        signedPayloadHash: sha256Text(signedPayload(manifest)),
        certificateIdentity,
        certificateOidcIssuer,
        transparencyLog: {
          logId: "rekor-test-log",
          logIndex: 42,
          integratedTime: "2026-05-05T21:00:00.000Z",
        },
      };
      writeJson(join(dir, "button.capsule.json"), { ...manifest, sigstore });

      expect(() =>
        readVerifiedCapsuleManifest({
          directory: dir,
          name: "button",
          version: "0.0.1",
          layer: "markup-primitives",
          stability: "experimental",
          trustRoot,
        }),
      ).toThrow(/Sigstore bundle verification must use cosign/i);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("runs cosign verification when the Sigstore trust policy requires it", () => {
    const dir = join(tmpdir(), `ashlar-capsule-${Date.now()}`);
    mkdirSync(dir, { recursive: true });
    const toolDir = join(tmpdir(), `ashlar-cosign-tool-${Date.now()}`);
    mkdirSync(toolDir, { recursive: true });

    try {
      const certificateIdentity =
        "https://github.com/blencorp/ashlar/.github/workflows/sigstore.yml@refs/heads/main";
      const certificateOidcIssuer = "https://token.actions.githubusercontent.com";
      const trustRoot = {
        schemaVersion: "1.0" as const,
        keys: [],
        sigstore: {
          certificateIdentities: [certificateIdentity],
          certificateOidcIssuers: [certificateOidcIssuer],
          bundleVerification: "cosign" as const,
        },
      };

      writeFileSync(join(dir, "button.css"), ".ashlar-button {}\n");
      writeFileSync(join(dir, "button.sigstore.json"), JSON.stringify({ bundle: true }));
      const manifest = buildCapsuleManifest({
        directory: dir,
        name: "button",
        version: "0.0.1",
        layer: "markup-primitives",
        stability: "experimental",
      });
      const sigstore = {
        bundle: "button.sigstore.json",
        bundleHash: sha256File(join(dir, "button.sigstore.json")),
        signedPayloadHash: sha256Text(signedPayload(manifest)),
        certificateIdentity,
        certificateOidcIssuer,
      };
      writeJson(join(dir, "button.capsule.json"), { ...manifest, sigstore });

      const cosignArgsPath = join(dir, "cosign-args.json");
      const cosignPayloadPath = join(dir, "cosign-payload.txt");
      const fakeCosignPath = join(toolDir, "fake-cosign.mjs");
      writeFileSync(
        fakeCosignPath,
        `#!/usr/bin/env node
import { readFileSync, writeFileSync } from "node:fs";
const args = process.argv.slice(2);
writeFileSync(${JSON.stringify(cosignArgsPath)}, JSON.stringify(args, null, 2));
writeFileSync(${JSON.stringify(cosignPayloadPath)}, readFileSync(args.at(-1), "utf8"));
process.exit(0);
`,
      );
      chmodSync(fakeCosignPath, 0o755);

      readVerifiedCapsuleManifest({
        directory: dir,
        name: "button",
        version: "0.0.1",
        layer: "markup-primitives",
        stability: "experimental",
        trustRoot,
        cosignPath: fakeCosignPath,
      });

      const args = JSON.parse(readFileSync(cosignArgsPath, "utf8")) as string[];
      expect(args).toEqual(
        expect.arrayContaining([
          "verify-blob",
          "--bundle",
          join(dir, "button.sigstore.json"),
          "--certificate-identity",
          certificateIdentity,
          "--certificate-oidc-issuer",
          certificateOidcIssuer,
        ]),
      );
      expect(readFileSync(cosignPayloadPath, "utf8")).toBe(signedPayload(manifest));
    } finally {
      rmSync(dir, { recursive: true, force: true });
      rmSync(toolDir, { recursive: true, force: true });
    }
  });

  it("rejects codemod metadata that is not covered by capsule integrity", () => {
    const dir = join(tmpdir(), `ashlar-capsule-${Date.now()}`);
    mkdirSync(dir, { recursive: true });

    try {
      const { publicKey, privateKey } = generateKeyPairSync("ed25519");
      const keyId = "ashlar-test-key";
      const publicKeyDer = publicKey.export({ type: "spki", format: "der" }).toString("base64");
      const trustRoot = {
        schemaVersion: "1.0" as const,
        keys: [{ keyId, algorithm: "ed25519" as const, publicKey: publicKeyDer }],
      };

      writeFileSync(join(dir, "button.css"), ".ashlar-button {}\n");
      writeFileSync(
        join(dir, "button.codemods.json"),
        JSON.stringify({
          schemaVersion: "1.0",
          component: "button",
          from: "0.0.1",
          to: "0.0.2",
          rules: [],
        }),
      );
      const manifest = buildCapsuleManifest({
        directory: dir,
        name: "button",
        version: "0.0.1",
        layer: "markup-primitives",
        stability: "experimental",
      });
      const signature = sign(null, Buffer.from(signedPayload(manifest)), privateKey).toString(
        "base64",
      );

      writeJson(join(dir, "button.capsule.json"), {
        ...manifest,
        codemods: ["button.codemods.json"],
        signature: { keyId, algorithm: "ed25519", value: signature },
      });

      expect(() =>
        readVerifiedCapsuleManifest({
          directory: dir,
          name: "button",
          version: "0.0.1",
          layer: "markup-primitives",
          stability: "experimental",
          trustRoot,
        }),
      ).toThrow(/capsule (manifest integrity|signature verification) failed/i);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("detects stale manifest file hashes", () => {
    const expected: CapsuleManifest = {
      schemaVersion: "1.0",
      name: "button",
      version: "0.0.1",
      layer: "markup-primitives",
      stability: "experimental",
      files: {
        "button.css": "sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
      },
      capsule_hash: "sha256:bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
    };
    const stale = {
      ...expected,
      files: {
        "button.css": "sha256:cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc",
      },
    };

    expect(verifyCapsuleManifest(stale, expected)).toContain(
      "files hash map does not match the registry directory contents",
    );
  });
});
