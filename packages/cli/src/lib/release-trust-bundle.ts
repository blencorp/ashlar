import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { basename, dirname, join } from "node:path";
import { readVerifiedCapsuleManifest } from "./capsule.js";
import { sha256File } from "./hash.js";
import { writeJson } from "./project.js";
import {
  getComponentVersion,
  listComponents,
  readRegistryIndex,
  readRegistryTrustRoot,
  resolveRegistryRoot,
} from "./registry.js";
import { verifyReleaseAttestation } from "./release-attestation.js";
import { describeErrors, validate } from "./schema-validate.js";

type TrustBundleArtifactType = "spdx-sbom" | "release-artifact-attestation";

type TrustBundleArtifact = {
  name: string;
  sha256: string;
  size: number;
  type: TrustBundleArtifactType;
};

type TrustBundleCapsule = {
  capsuleHash: string;
  layer: string;
  name: string;
  signatureKeyId: string | null;
  stability: string;
  version: string;
};

export type ReleaseTrustBundle = {
  $schema: "https://ashlar.dev/schemas/release-trust-bundle.schema.json";
  artifacts: TrustBundleArtifact[];
  generatedAt: string;
  registry: {
    capsuleCount: number;
    capsules: TrustBundleCapsule[];
    indexHash: string;
    name: string;
    path: string;
    trustRoot: ReturnType<typeof readRegistryTrustRoot> | null;
    trustRootHash: string | null;
    version: string;
  };
  schemaVersion: "1.0";
  tool: "ashlar release trust-bundle";
  verification: {
    npmProvenance: "not-included";
    notes: string[];
    sigstore: "not-included";
  };
};

export function buildReleaseTrustBundle(input: {
  attestationPath: string;
  cwd: string;
  generatedAt?: Date;
  registryPath: string;
  sbomPath: string;
  skipAttestationValidation?: boolean;
}): ReleaseTrustBundle {
  if (!input.skipAttestationValidation) {
    const attestationErrors = verifyReleaseAttestation({
      attestationPath: input.attestationPath,
      subjectPath: input.sbomPath,
    });
    if (attestationErrors.length > 0) {
      throw new Error(
        `Cannot build release trust bundle from an invalid attestation:\n${attestationErrors
          .map((error) => `  - ${error}`)
          .join("\n")}`,
      );
    }
  }

  const registryRoot = resolveRegistryRoot(input.cwd, input.registryPath);
  const index = readRegistryIndex(input.cwd, input.registryPath);
  const trustRoot = readRegistryTrustRoot(input.cwd, input.registryPath) ?? null;
  const capsules = verifiedCapsules(input.cwd, input.registryPath);
  const trustRootPath = join(registryRoot, "trust-root.json");

  return {
    $schema: "https://ashlar.dev/schemas/release-trust-bundle.schema.json",
    schemaVersion: "1.0",
    tool: "ashlar release trust-bundle",
    generatedAt: (input.generatedAt ?? new Date()).toISOString(),
    registry: {
      path: input.registryPath,
      name: index.name,
      version: index.version,
      indexHash: sha256File(join(registryRoot, "index.json")),
      trustRootHash: existsSync(trustRootPath) ? sha256File(trustRootPath) : null,
      trustRoot,
      capsuleCount: capsules.length,
      capsules,
    },
    artifacts: [
      artifactSummary(input.sbomPath, "spdx-sbom"),
      artifactSummary(input.attestationPath, "release-artifact-attestation"),
    ],
    verification: {
      npmProvenance: "not-included",
      sigstore: "not-included",
      notes: [
        "This bundle records local registry signatures, capsule hashes, SBOM hash, and attestation hash.",
        "It is not an npm provenance record and does not replace Sigstore signing.",
      ],
    },
  };
}

export function writeReleaseTrustBundle(input: {
  attestationPath: string;
  cwd: string;
  output: string;
  registryPath: string;
  sbomPath: string;
}): ReleaseTrustBundle {
  const bundle = buildReleaseTrustBundle(input);
  assertValidTrustBundle(bundle, "Generated release trust bundle is invalid");
  writeJson(input.output, bundle);
  return bundle;
}

export function buildReleaseTrustReviewChecklist(input: {
  attestationPath: string;
  bundle: ReleaseTrustBundle;
  bundlePath: string;
  registryPath: string;
  sbomPath: string;
}): string {
  const artifacts = input.bundle.artifacts
    .map(
      (artifact) =>
        `- ${artifact.type}: ${artifact.name} (${artifact.size} bytes, ${artifact.sha256})`,
    )
    .join("\n");
  const notes = input.bundle.verification.notes.map((note) => `- ${note}`).join("\n");

  return `# Release Trust Reviewer Checklist

Registry: ${input.bundle.registry.name}@${input.bundle.registry.version}
Capsules: ${input.bundle.registry.capsuleCount}
Registry index: ${input.bundle.registry.indexHash}
Trust root: ${input.bundle.registry.trustRootHash ?? "missing"}

This checklist is for external release-trust review. It does not replace npm provenance, Sigstore verification, or \`pnpm ashlar release verify-trust-bundle\`.

## Artifacts

${artifacts}

## Verification Commands

\`\`\`bash
pnpm ashlar release readiness --registry ${input.registryPath}
pnpm ashlar release provenance-verify-public --package @blen/ashlar@<version> @blen/ashlar-cli@<version> @blen/ashlar-schemas@<version>
pnpm ashlar release provenance-verify-public --package @blen/ashlar@<version> @blen/ashlar-cli@<version> @blen/ashlar-schemas@<version> --json > reports/ashlar-npm-provenance.json
pnpm ashlar release public-trust-verify --registry ${input.registryPath}
pnpm ashlar release public-trust-verify --registry ${input.registryPath} --json > reports/ashlar-public-trust.json
pnpm ashlar release verify-trust-bundle --registry ${input.registryPath} --bundle ${input.bundlePath} --sbom ${input.sbomPath} --attestation ${input.attestationPath}
\`\`\`

## Required Checks

- [ ] npm trusted publisher settings are configured for \`@blen/ashlar\`, \`@blen/ashlar-cli\`, and \`@blen/ashlar-schemas\` without long-lived npm tokens.
- [ ] Public npm provenance verification passes for the exact published package versions.
- [ ] The local \`npm provenance verification\` review-record artifact is JSON from \`pnpm ashlar release provenance-verify-public --json\` and matches the reviewed package versions.
- [ ] Capsule Sigstore bundles verify with the expected GitHub Actions workflow identity and OIDC issuer.
- [ ] \`pnpm ashlar release public-trust-verify\` passes against the downloaded signed registry artifact.
- [ ] The local \`Capsule Sigstore verification\` review-record artifact is JSON from \`pnpm ashlar release public-trust-verify --json\` and matches the signed registry artifact.
- [ ] \`pnpm ashlar release verify-trust-bundle\` passes against the downloaded registry, SBOM, attestation, and trust bundle.
- [ ] SBOM, attestation, trust bundle, and signed-registry artifacts are attached to the review record or linked from immutable workflow artifacts.
- [ ] No private keys, long-lived tokens, or private infrastructure details appear in the release artifacts.

## Bundle Notes

${notes}

## Claim Boundary

- [ ] The review does not treat this checklist as proof by itself.
- [ ] The review distinguishes local readiness from public npm provenance and public Sigstore trust.
- [ ] Replacement-grade language waits for strict \`pnpm ashlar release readiness\` without local-prototype escape hatches.
`;
}

export function writeReleaseTrustReviewChecklist(input: {
  attestationPath: string;
  bundle: ReleaseTrustBundle;
  bundlePath: string;
  output: string;
  registryPath: string;
  sbomPath: string;
}): string {
  const checklist = buildReleaseTrustReviewChecklist(input);
  mkdirSync(dirname(input.output), { recursive: true });
  writeFileSync(input.output, checklist);
  return checklist;
}

export function verifyReleaseTrustBundle(input: {
  attestationPath: string;
  bundlePath: string;
  cwd: string;
  registryPath: string;
  sbomPath: string;
}): string[] {
  const rawBundle = JSON.parse(readFileSync(input.bundlePath, "utf8")) as unknown;
  const errors: string[] = [];
  const schemaResult = validate("releaseTrustBundle", rawBundle);
  if (!schemaResult.ok) {
    return [`release trust bundle schema validation failed:\n${describeErrors(schemaResult)}`];
  }
  const bundle = rawBundle as ReleaseTrustBundle;

  if (bundle.schemaVersion !== "1.0") {
    errors.push(`unsupported trust bundle schema version: ${bundle.schemaVersion}`);
  }
  if (bundle.tool !== "ashlar release trust-bundle") {
    errors.push(`unsupported trust bundle tool: ${bundle.tool}`);
  }

  const attestationErrors = verifyReleaseAttestation({
    attestationPath: input.attestationPath,
    subjectPath: input.sbomPath,
  });
  errors.push(...attestationErrors.map((error) => `attestation verification failed: ${error}`));

  const current = buildReleaseTrustBundle({
    attestationPath: input.attestationPath,
    cwd: input.cwd,
    generatedAt: new Date(bundle.generatedAt),
    registryPath: input.registryPath,
    sbomPath: input.sbomPath,
    skipAttestationValidation: true,
  });

  compareRegistry(bundle, current, errors);
  compareArtifact(bundle, artifactSummary(input.sbomPath, "spdx-sbom"), errors);
  compareArtifact(
    bundle,
    artifactSummary(input.attestationPath, "release-artifact-attestation"),
    errors,
  );

  return errors;
}

function assertValidTrustBundle(bundle: ReleaseTrustBundle, message: string): void {
  const result = validate("releaseTrustBundle", bundle);
  if (!result.ok) {
    throw new Error(`${message}:\n${describeErrors(result)}`);
  }
}

function verifiedCapsules(cwd: string, registryPath: string): TrustBundleCapsule[] {
  return listComponents(cwd, registryPath)
    .flatMap((component) =>
      component.versions.map((version) =>
        getComponentVersion(cwd, component.name, version, registryPath),
      ),
    )
    .map((component) => {
      const manifest = readVerifiedCapsuleManifest({
        directory: component.directory,
        name: component.name,
        version: component.version,
        layer: component.layer,
        stability: component.stability,
        registryCapsuleHash: component.capsuleHash,
        trustRoot: component.trustRoot,
      });

      return {
        name: component.name,
        version: component.version,
        layer: component.layer,
        stability: component.stability,
        capsuleHash: manifest.capsule_hash,
        signatureKeyId: manifest.signature?.keyId ?? null,
      };
    })
    .sort((left, right) =>
      `${left.name}@${left.version}`.localeCompare(`${right.name}@${right.version}`),
    );
}

function artifactSummary(path: string, type: TrustBundleArtifactType): TrustBundleArtifact {
  return {
    type,
    name: basename(path),
    sha256: sha256FileBytes(path),
    size: statSync(path).size,
  };
}

function sha256FileBytes(path: string): string {
  return `sha256:${createHash("sha256").update(readFileSync(path)).digest("hex")}`;
}

function compareRegistry(
  bundle: ReleaseTrustBundle,
  current: ReleaseTrustBundle,
  errors: string[],
): void {
  for (const key of ["indexHash", "trustRootHash", "capsuleCount"] as const) {
    if (bundle.registry[key] !== current.registry[key]) {
      errors.push(
        `registry ${key} mismatch: expected ${bundle.registry[key]}, found ${current.registry[key]}`,
      );
    }
  }

  if (JSON.stringify(bundle.registry.capsules) !== JSON.stringify(current.registry.capsules)) {
    errors.push("registry capsule summary mismatch");
  }
}

function compareArtifact(
  bundle: ReleaseTrustBundle,
  current: TrustBundleArtifact,
  errors: string[],
): void {
  const expected = bundle.artifacts.find((artifact) => artifact.type === current.type);
  if (!expected) {
    errors.push(`missing trust bundle artifact entry: ${current.type}`);
    return;
  }

  for (const key of ["name", "sha256", "size"] as const) {
    if (expected[key] !== current[key]) {
      errors.push(
        `artifact ${key} mismatch for ${current.type}: expected ${expected[key]}, found ${current[key]}`,
      );
    }
  }
}
