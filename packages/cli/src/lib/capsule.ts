import { spawnSync } from "node:child_process";
import { createPrivateKey, createPublicKey, sign, verify } from "node:crypto";
import { existsSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { isAbsolute, join, relative, resolve, sep } from "node:path";
import { sha256File, sha256Text } from "./hash.js";
import { describeErrors, validate } from "./schema-validate.js";
import type { RegistryLayer } from "./registry.js";

export type CapsuleSignature = {
  keyId: string;
  algorithm: "ed25519";
  value: string;
};

export type CapsuleSigstoreBundle = {
  bundle: string;
  bundleHash: string;
  signedPayloadHash: string;
  certificateIdentity: string;
  certificateOidcIssuer: string;
  transparencyLog?: {
    logId?: string;
    logIndex?: number;
    integratedTime?: string;
  };
};

export type CapsuleTrustRoot = {
  schemaVersion: "1.0";
  keys: Array<{
    keyId: string;
    algorithm: "ed25519";
    publicKey: string;
  }>;
  sigstore?: {
    certificateIdentities: string[];
    certificateOidcIssuers: string[];
    bundleVerification?: "metadata" | "cosign";
  };
};

export type CapsuleBundleBudget = {
  cssGzipBytes?: number;
  jsGzipBytes?: number;
};

export type CapsuleManifest = {
  schemaVersion: "1.0";
  name: string;
  version: string;
  layer: RegistryLayer;
  stability: "proposal" | "experimental" | "beta" | "stable" | "deprecated";
  files: Record<string, string>;
  capsule_hash: string;
  signature?: CapsuleSignature;
  sigstore?: CapsuleSigstoreBundle;
  codemods?: string[];
  bundleBudget?: CapsuleBundleBudget;
};

const ignoredCapsuleFiles = [".lock.json", ".capsule.json", ".sigstore.json"] as const;

function capsuleSourceFiles(directory: string, current = directory): string[] {
  return readdirSync(current, { withFileTypes: true })
    .flatMap((entry) => {
      const path = join(current, entry.name);
      if (entry.isDirectory()) {
        return capsuleSourceFiles(directory, path);
      }
      if (!entry.isFile() || ignoredCapsuleFiles.some((suffix) => entry.name.endsWith(suffix))) {
        return [];
      }

      return relative(directory, path).split(sep).join("/");
    })
    .sort();
}

export function buildCapsuleManifest(input: {
  directory: string;
  name: string;
  version: string;
  layer: CapsuleManifest["layer"];
  stability: CapsuleManifest["stability"];
  codemods?: string[];
  bundleBudget?: CapsuleBundleBudget;
  fileTextOverrides?: Record<string, string>;
}): CapsuleManifest {
  const sourceFiles = Array.from(
    new Set([
      ...capsuleSourceFiles(input.directory),
      ...Object.keys(input.fileTextOverrides ?? {}),
    ]),
  ).sort();
  const files = Object.fromEntries(
    sourceFiles.map((file) => [
      file,
      sha256Text(
        input.fileTextOverrides?.[file] ?? readFileSync(join(input.directory, file), "utf8"),
      ),
    ]),
  );
  const codemods = input.codemods && input.codemods.length > 0 ? input.codemods : undefined;

  const capsule_hash = sha256Text(
    JSON.stringify({
      name: input.name,
      version: input.version,
      files,
      ...(codemods ? { codemods } : {}),
      ...(input.bundleBudget ? { bundleBudget: input.bundleBudget } : {}),
    }),
  );

  return {
    schemaVersion: "1.0",
    name: input.name,
    version: input.version,
    layer: input.layer,
    stability: input.stability,
    files,
    ...(codemods ? { codemods } : {}),
    ...(input.bundleBudget ? { bundleBudget: input.bundleBudget } : {}),
    capsule_hash,
  };
}

export function signCapsuleManifest(input: {
  manifest: CapsuleManifest;
  keyId: string;
  privateKey: Buffer | string;
}): CapsuleManifest {
  const privateKey = createPrivateKey(input.privateKey);

  return {
    ...input.manifest,
    signature: {
      keyId: input.keyId,
      algorithm: "ed25519",
      value: sign(null, Buffer.from(capsuleSignaturePayload(input.manifest)), privateKey).toString(
        "base64",
      ),
    },
  };
}

export function capsuleSignaturePayload(manifest: CapsuleManifest): string {
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

export function readCapsuleManifest(directory: string, name: string): CapsuleManifest {
  const manifestPath = join(directory, `${name}.capsule.json`);
  if (!existsSync(manifestPath)) {
    throw new Error(`Ashlar capsule manifest not found: ${manifestPath}`);
  }

  const manifest = JSON.parse(readFileSync(manifestPath, "utf8")) as CapsuleManifest;
  const result = validate("capsule", manifest);
  if (!result.ok) {
    throw new Error(
      `Invalid Ashlar capsule manifest at ${manifestPath}:\n${describeErrors(result)}`,
    );
  }

  return manifest;
}

export function readVerifiedCapsuleManifest(input: {
  directory: string;
  name: string;
  version: string;
  layer: CapsuleManifest["layer"];
  stability: CapsuleManifest["stability"];
  registryCapsuleHash?: string;
  trustRoot?: CapsuleTrustRoot;
  cosignPath?: string;
}): CapsuleManifest {
  const manifest = readCapsuleManifest(input.directory, input.name);
  const expected = buildCapsuleManifest({
    ...input,
    codemods: manifest.codemods,
    bundleBudget: manifest.bundleBudget,
  });
  const errors = verifyCapsuleManifest(manifest, expected);

  if (input.registryCapsuleHash && manifest.capsule_hash !== input.registryCapsuleHash) {
    errors.push(
      `registry index capsule hash mismatch: expected ${input.registryCapsuleHash}, found ${manifest.capsule_hash}`,
    );
  }

  if (errors.length > 0) {
    throw new Error(
      `Ashlar capsule manifest integrity failed for ${input.name}@${input.version}:\n${errors
        .map((error) => `  - ${error}`)
        .join("\n")}`,
    );
  }

  const signatureErrors = verifyCapsuleSignature(manifest, input.trustRoot, {
    cosignPath: input.cosignPath,
    directory: input.directory,
  });
  if (signatureErrors.length > 0) {
    throw new Error(
      `Ashlar capsule signature verification failed for ${input.name}@${input.version}:\n${signatureErrors
        .map((error) => `  - ${error}`)
        .join("\n")}`,
    );
  }

  return manifest;
}

export function verifyCapsuleSignature(
  manifest: CapsuleManifest,
  trustRoot: CapsuleTrustRoot | undefined,
  options: { cosignPath?: string; directory?: string } = {},
): string[] {
  if (!trustRoot) {
    return ["capsule trust root is required"];
  }

  if (!manifest.signature && !manifest.sigstore) {
    return ["missing capsule signature or Sigstore bundle"];
  }

  const errors: string[] = [];
  if (manifest.signature) {
    errors.push(...verifyEd25519CapsuleSignature(manifest, trustRoot));
  }

  if (manifest.sigstore) {
    errors.push(...verifySigstoreCapsuleBundle(manifest, trustRoot, options));
  }

  return errors;
}

function verifyEd25519CapsuleSignature(
  manifest: CapsuleManifest,
  trustRoot: CapsuleTrustRoot,
): string[] {
  if (!manifest.signature) {
    return ["missing capsule signature"];
  }
  if (manifest.signature.algorithm !== "ed25519") {
    return [`unsupported signature algorithm: ${manifest.signature.algorithm}`];
  }

  const key = trustRoot.keys.find((item) => item.keyId === manifest.signature?.keyId);
  if (!key) {
    return [`signature key is not trusted: ${manifest.signature.keyId}`];
  }
  if (key.algorithm !== manifest.signature.algorithm) {
    return [
      `trusted key algorithm mismatch for ${key.keyId}: expected ${manifest.signature.algorithm}, found ${key.algorithm}`,
    ];
  }

  try {
    const publicKey = createPublicKey({
      key: Buffer.from(key.publicKey, "base64"),
      format: "der",
      type: "spki",
    });
    const ok = verify(
      null,
      Buffer.from(capsuleSignaturePayload(manifest)),
      publicKey,
      Buffer.from(manifest.signature.value, "base64"),
    );

    return ok ? [] : [`signature does not match capsule manifest payload for key ${key.keyId}`];
  } catch (error) {
    return [
      `signature could not be verified for key ${key.keyId}: ${
        error instanceof Error ? error.message : String(error)
      }`,
    ];
  }
}

function verifySigstoreCapsuleBundle(
  manifest: CapsuleManifest,
  trustRoot: CapsuleTrustRoot,
  options: { cosignPath?: string; directory?: string },
): string[] {
  if (!manifest.sigstore) {
    return [];
  }

  const errors: string[] = [];
  const sigstore = manifest.sigstore;
  if (!trustRoot.sigstore) {
    errors.push("Sigstore trust policy is not configured in the registry trust root");
  } else {
    if (trustRoot.sigstore.bundleVerification !== "cosign") {
      errors.push("Sigstore bundle verification must use cosign for capsule Sigstore bundles");
    }
    if (!trustRoot.sigstore.certificateIdentities.includes(sigstore.certificateIdentity)) {
      errors.push(`Sigstore certificate identity is not trusted: ${sigstore.certificateIdentity}`);
    }
    if (!trustRoot.sigstore.certificateOidcIssuers.includes(sigstore.certificateOidcIssuer)) {
      errors.push(`Sigstore OIDC issuer is not trusted: ${sigstore.certificateOidcIssuer}`);
    }
  }

  const expectedPayloadHash = sha256Text(capsuleSignaturePayload(manifest));
  if (sigstore.signedPayloadHash !== expectedPayloadHash) {
    errors.push(
      `Sigstore signed payload hash mismatch: expected ${expectedPayloadHash}, found ${sigstore.signedPayloadHash}`,
    );
  }

  if (!isSafeCapsuleRelativePath(sigstore.bundle)) {
    errors.push(`Sigstore bundle path must be a safe capsule-relative path: ${sigstore.bundle}`);
    return errors;
  }

  if (!options.directory) {
    errors.push("capsule directory is required to verify Sigstore bundle material");
    return errors;
  }

  const bundlePath = resolve(options.directory, sigstore.bundle);
  const directoryRoot = `${resolve(options.directory)}${sep}`;
  if (!bundlePath.startsWith(directoryRoot)) {
    errors.push(`Sigstore bundle path escapes capsule directory: ${sigstore.bundle}`);
    return errors;
  }

  if (!existsSync(bundlePath)) {
    errors.push(`Sigstore bundle file is missing: ${sigstore.bundle}`);
    return errors;
  }

  const currentBundleHash = sha256File(bundlePath);
  if (sigstore.bundleHash !== currentBundleHash) {
    errors.push(
      `Sigstore bundle hash mismatch: expected ${sigstore.bundleHash}, found ${currentBundleHash}`,
    );
  }

  if (errors.length === 0 && trustRoot.sigstore?.bundleVerification === "cosign") {
    errors.push(
      ...verifySigstoreBundleWithCosign({
        bundlePath,
        certificateIdentity: sigstore.certificateIdentity,
        certificateOidcIssuer: sigstore.certificateOidcIssuer,
        cosignPath: options.cosignPath ?? "cosign",
        payload: capsuleSignaturePayload(manifest),
      }),
    );
  }

  return errors;
}

function verifySigstoreBundleWithCosign(input: {
  bundlePath: string;
  certificateIdentity: string;
  certificateOidcIssuer: string;
  cosignPath: string;
  payload: string;
}): string[] {
  const scratch = mkdtempSync(join(tmpdir(), "ashlar-cosign-"));
  const payloadPath = join(scratch, "capsule-payload.json");

  try {
    writeFileSync(payloadPath, input.payload);
    const result = spawnSync(
      input.cosignPath,
      [
        "verify-blob",
        "--bundle",
        input.bundlePath,
        "--certificate-identity",
        input.certificateIdentity,
        "--certificate-oidc-issuer",
        input.certificateOidcIssuer,
        payloadPath,
      ],
      {
        encoding: "utf8",
        stdio: ["ignore", "pipe", "pipe"],
      },
    );

    if (result.error) {
      return [`Sigstore cosign verification could not start: ${result.error.message}`];
    }
    if (result.status !== 0) {
      const output = `${result.stdout ?? ""}${result.stderr ?? ""}`.trim();
      return [`Sigstore cosign verification failed${output ? `: ${output}` : ""}`];
    }

    return [];
  } finally {
    rmSync(scratch, { recursive: true, force: true });
  }
}

function isSafeCapsuleRelativePath(path: string): boolean {
  return path.length > 0 && !isAbsolute(path) && !path.split(/[\\/]/).includes("..");
}

export function verifyCapsuleManifest(
  manifest: CapsuleManifest,
  expected: CapsuleManifest,
): string[] {
  const errors: string[] = [];

  for (const key of ["name", "version", "layer", "stability", "capsule_hash"] as const) {
    if (manifest[key] !== expected[key]) {
      errors.push(`${key} mismatch: expected ${expected[key]}, found ${manifest[key]}`);
    }
  }

  const expectedFiles = Object.entries(expected.files).sort(([a], [b]) => a.localeCompare(b));
  const manifestFiles = Object.entries(manifest.files).sort(([a], [b]) => a.localeCompare(b));
  if (JSON.stringify(manifestFiles) !== JSON.stringify(expectedFiles)) {
    errors.push("files hash map does not match the registry directory contents");
  }

  for (const codemod of manifest.codemods ?? []) {
    if (isAbsolute(codemod) || codemod.split(/[\\/]+/).includes("..")) {
      errors.push(`codemod path must stay inside the capsule: ${codemod}`);
    }
    if (!codemod.endsWith(".codemods.json")) {
      errors.push(`codemod path must end with .codemods.json: ${codemod}`);
    }
    if (!Object.hasOwn(manifest.files, codemod)) {
      errors.push(`codemod file is not listed in capsule files: ${codemod}`);
    }
  }

  return errors;
}
