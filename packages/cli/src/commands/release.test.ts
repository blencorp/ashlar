import { spawnSync } from "node:child_process";
import { generateKeyPairSync, sign } from "node:crypto";
import {
  chmodSync,
  cpSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

const here = fileURLToPath(new URL(".", import.meta.url));
const cliEntry = join(here, "..", "..", "dist", "index.js");
const repoRoot = resolve(here, "..", "..", "..", "..");
const slowReleaseTestTimeout = 30_000;

let scratch: string;
let createdReviewFiles: string[] = [];
let originalPath: string | undefined;

type TestCapsuleManifest = {
  schemaVersion: "1.0";
  name: string;
  version: string;
  layer: string;
  stability: string;
  files: Record<string, string>;
  capsule_hash: string;
  bundleBudget?: {
    cssGzipBytes?: number;
    jsGzipBytes?: number;
  };
  signature?: {
    keyId: string;
    algorithm: "ed25519";
    value: string;
  };
  codemods?: string[];
};

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

function copyRegistry(): string {
  const registry = join(scratch, "registry");
  cpSync(join(repoRoot, "registry"), registry, { recursive: true });
  return registry;
}

function capsuleSignaturePayload(manifest: TestCapsuleManifest): string {
  return JSON.stringify({
    schemaVersion: manifest.schemaVersion,
    name: manifest.name,
    version: manifest.version,
    layer: manifest.layer,
    stability: manifest.stability,
    files: manifest.files,
    capsule_hash: manifest.capsule_hash,
    ...(manifest.bundleBudget ? { bundleBudget: manifest.bundleBudget } : {}),
    ...(manifest.codemods && manifest.codemods.length > 0 ? { codemods: manifest.codemods } : {}),
  });
}

function writeLocalSigningKey(registry: string): { keyId: string; signingKeyPath: string } {
  const { privateKey, publicKey } = generateKeyPairSync("ed25519");
  const keyId = "ashlar-release-test-local-key";
  const signingKeyPath = join(scratch, "ashlar-release-test-signing-key.pem");

  writeFileSync(
    join(registry, "trust-root.json"),
    `${JSON.stringify(
      {
        $schema: "https://ashlar.dev/schemas/trust-root.schema.json",
        schemaVersion: "1.0",
        keys: [
          {
            keyId,
            algorithm: "ed25519",
            publicKey: publicKey.export({ format: "der", type: "spki" }).toString("base64"),
          },
        ],
      },
      null,
      2,
    )}\n`,
  );
  writeFileSync(signingKeyPath, privateKey.export({ format: "pem", type: "pkcs8" }));

  const index = JSON.parse(readFileSync(join(registry, "index.json"), "utf8")) as {
    components: Record<string, { versions: string[] }>;
  };
  for (const [name, component] of Object.entries(index.components)) {
    for (const version of component.versions) {
      const manifestPath = join(registry, "components", name, version, `${name}.capsule.json`);
      const manifest = JSON.parse(readFileSync(manifestPath, "utf8")) as TestCapsuleManifest;
      manifest.signature = {
        keyId,
        algorithm: "ed25519",
        value: sign(null, Buffer.from(capsuleSignaturePayload(manifest)), privateKey).toString(
          "base64",
        ),
      };
      writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
    }
  }

  return { keyId, signingKeyPath };
}

function writeReviewRecord(file: string, content: string): void {
  const path = join(repoRoot, "docs", "reviews", file);
  writeFileSync(path, content);
  createdReviewFiles.push(path);
}

function reviewFileSuffix(): string {
  return scratch.split("/").at(-1) ?? "release-test";
}

function writeReadyStableEvidenceBundle(registryPath = "./registry"): string {
  const reviewDir = join(scratch, "button-stable-review");
  const fixturePath = join(registryPath, "components", "button", "0.0.1", "button.html");
  const prepared = runCli([
    "evidence",
    "prepare-stable",
    "button",
    "--registry",
    registryPath,
    "--fixture",
    fixturePath,
    "--output",
    reviewDir,
  ]);
  if (prepared.status !== 0) {
    throw new Error(prepared.stdout);
  }

  const keyboardPath = join(reviewDir, "button-keyboard-transcript.json");
  const screenReaderPath = join(reviewDir, "button-screen-reader-transcript.json");
  const manualPath = join(reviewDir, "button-manual-review.json");

  writeFileSync(
    keyboardPath,
    `${JSON.stringify(
      {
        $schema: "https://ashlar.dev/schemas/manual-transcript.schema.json",
        schemaVersion: "1.0",
        component: "button",
        version: "0.0.1",
        transcriptType: "keyboard",
        reviewedAt: "2026-05-05T14:00:00.000Z",
        reviewer: "a11y-reviewer@example.gov",
        environment: {
          browser: "Firefox",
          browserVersion: "145",
          os: "Windows 11",
          inputDevice: "Keyboard",
        },
        steps: [
          {
            id: "keyboard-focus",
            action: "Tab to the button, activate with Enter, then activate with Space.",
            expected: "Focus is visible and native button activation fires for Enter and Space.",
            observed:
              "Focus remained visible and both keyboard activation keys triggered the button.",
            result: "pass",
          },
        ],
        result: "pass",
        summary: "Keyboard focus visibility and activation passed for the native Button capsule.",
        knownLimitations: [],
      },
      null,
      2,
    )}\n`,
  );
  writeFileSync(
    screenReaderPath,
    `${JSON.stringify(
      {
        $schema: "https://ashlar.dev/schemas/manual-transcript.schema.json",
        schemaVersion: "1.0",
        component: "button",
        version: "0.0.1",
        transcriptType: "screen-reader",
        reviewedAt: "2026-05-05T14:00:00.000Z",
        reviewer: "a11y-reviewer@example.gov",
        environment: {
          browser: "Firefox",
          browserVersion: "145",
          os: "Windows 11",
          assistiveTechnology: "NVDA",
          assistiveTechnologyVersion: "2025.4",
        },
        steps: [
          {
            id: "screen-reader-name-role",
            action: "Move to the button with NVDA browse mode and activate it.",
            expected: "NVDA announces the button name and role before activation.",
            observed: "NVDA announced the visible label and button role before activation.",
            result: "pass",
          },
        ],
        result: "pass",
        summary:
          "NVDA and Firefox announced name, role, and activation for the native Button capsule.",
        knownLimitations: [],
      },
      null,
      2,
    )}\n`,
  );

  const manual = JSON.parse(readFileSync(manualPath, "utf8")) as {
    baselineTests?: Array<{ evidence: string; source: string; status: string; test: string }>;
    knownLimitations: unknown[];
    manualTests: Array<unknown>;
    reviewedAt: string;
    reviewer: string;
    wcag?: Array<{ criterion: string; evidence: string; notes?: string; status: string }>;
  };
  manual.reviewedAt = "2026-05-05T14:00:00.000Z";
  manual.reviewer = "a11y-reviewer@example.gov";
  manual.wcag = (manual.wcag ?? []).map((item) => ({
    ...item,
    status: "pass",
    evidence:
      item.criterion === "2.4.7"
        ? `${keyboardPath}#keyboard-focus`
        : `${screenReaderPath}#screen-reader-name-role`,
    notes:
      item.criterion === "2.4.7"
        ? "Visible focus was observed."
        : "Name, role, and activation were observed.",
  }));
  manual.baselineTests = (manual.baselineTests ?? []).map((item) => ({
    ...item,
    status: "pass",
    evidence: item.test.toLowerCase().includes("keyboard")
      ? `${keyboardPath}#keyboard-focus`
      : `${screenReaderPath}#screen-reader-name-role`,
  }));
  manual.manualTests = [
    {
      tech: "Keyboard",
      browser: "Firefox",
      browserVersion: "145",
      os: "Windows 11",
      date: "2026-05-05",
      tester: "a11y-reviewer@example.gov",
      result: "pass",
      evidence: `${keyboardPath}#keyboard-focus`,
      notes: "Tab, Shift+Tab, Enter, Space, and focus visibility passed.",
    },
    {
      tech: "NVDA",
      version: "2025.4",
      browser: "Firefox",
      browserVersion: "145",
      os: "Windows 11",
      date: "2026-05-05",
      tester: "a11y-reviewer@example.gov",
      result: "pass",
      evidence: `${screenReaderPath}#screen-reader-name-role`,
      notes: "Name, role, and activation were announced as expected.",
    },
  ];
  manual.knownLimitations = [];
  writeFileSync(manualPath, `${JSON.stringify(manual, null, 2)}\n`);

  const status = runCli([
    "evidence",
    "review-status",
    "button",
    "--registry",
    registryPath,
    "--review-dir",
    reviewDir,
  ]);
  if (status.status !== 0) {
    throw new Error(status.stdout);
  }

  return reviewDir;
}

function writePublishedStableEvidenceArtifacts(): {
  publicationReceipt: string;
  registryPath: string;
  reviewDir: string;
} {
  const registryPath = join(scratch, "stable-registry");
  cpSync(join(repoRoot, "registry"), registryPath, { recursive: true });
  const { keyId, signingKeyPath } = writeLocalSigningKey(registryPath);
  const reviewDir = writeReadyStableEvidenceBundle(registryPath);
  const finalized = runCli([
    "evidence",
    "finalize-stable",
    "button",
    "--registry",
    registryPath,
    "--review-dir",
    reviewDir,
  ]);
  if (finalized.status !== 0) {
    throw new Error(finalized.stdout);
  }
  const publicationReceipt = join(scratch, "button-publication-receipt.json");
  const published = runCli([
    "evidence",
    "publish",
    "button",
    "--registry",
    registryPath,
    "--evidence-file",
    join(reviewDir, "button.evidence.stable.json"),
    "--signing-key",
    signingKeyPath,
    "--key-id",
    keyId,
    "--output",
    publicationReceipt,
  ]);
  if (published.status !== 0) {
    throw new Error(published.stdout);
  }

  return { publicationReceipt, registryPath, reviewDir };
}

function writeReadyReleaseTrustArtifacts(): {
  attestation: string;
  npmProvenance: string;
  registryArtifact: string;
  sbom: string;
  sigstoreVerification: string;
  trustBundle: string;
} {
  const releaseDir = join(scratch, "release");
  mkdirSync(releaseDir, { recursive: true });
  const registryArtifact = join(releaseDir, "signed-registry");
  const sbom = join(releaseDir, "ashlar-sbom.spdx.json");
  const attestation = join(releaseDir, "ashlar-sbom.attestation.json");
  const trustBundle = join(releaseDir, "ashlar-trust-bundle.json");
  const npmProvenance = join(releaseDir, "ashlar-npm-provenance.json");
  const sigstoreVerification = join(releaseDir, "ashlar-public-trust.json");
  const npmPath = writeFakeNpm();

  cpSync(join(repoRoot, "registry"), registryArtifact, { recursive: true });
  expect(runCli(["release", "sign-capsules", "--registry", registryArtifact]).status).toBe(0);
  const publicProvenance = runCli([
    "release",
    "provenance-verify-public",
    "--npm",
    npmPath,
    "--package",
    "ashlar@0.1.0",
    "@ashlar/cli@0.1.0",
    "@ashlar/schemas@0.1.0",
    "--json",
  ]);
  expect(publicProvenance.status, publicProvenance.stdout).toBe(0);
  const publicTrust = runCli([
    "release",
    "public-trust-verify",
    "--registry",
    registryArtifact,
    "--json",
  ]);
  expect(publicTrust.status, publicTrust.stdout).toBe(0);
  expect(runCli(["release", "sbom", "--output", sbom]).status).toBe(0);
  expect(runCli(["release", "attest", "--subject", sbom, "--output", attestation]).status).toBe(
    0,
  );
  expect(
    runCli([
      "release",
      "trust-bundle",
      "--registry",
      registryArtifact,
      "--sbom",
      sbom,
      "--attestation",
      attestation,
      "--output",
      trustBundle,
    ]).status,
  ).toBe(0);
  writeFileSync(npmProvenance, publicProvenance.stdout);
  writeFileSync(sigstoreVerification, publicTrust.stdout);

  return {
    attestation,
    npmProvenance,
    registryArtifact,
    sbom,
    sigstoreVerification,
    trustBundle,
  };
}

function writeReadyDesignPartnerArtifacts(): {
  reviewChecklist: string;
  screensReviewed: string;
  validatorOutput: string;
} {
  const designDir = join(scratch, "design-partner");
  mkdirSync(designDir, { recursive: true });
  const validatorOutput = join(designDir, "validator-output.txt");
  const reviewChecklist = join(designDir, "ashlar-design-partner-checklist.md");

  writeFileSync(
    validatorOutput,
    [
      "ashlar audit --policy federal --explain examples/legacy-federal-project/index.html",
      "ashlar audit --policy all --registry ./registry examples/service-flow/benefit-application.pass.html",
      "ashlar search benefits application --registry ./registry",
      "ashlar suggest Build a benefits application form",
    ].join("\n"),
  );
  expect(runCli(["release", "design-partner-checklist", "--output", reviewChecklist]).status).toBe(
    0,
  );

  return {
    reviewChecklist,
    screensReviewed: "examples/service-flow/benefit-application.pass.html",
    validatorOutput,
  };
}

function writeCompletedReviewRecords(): void {
  const suffix = reviewFileSuffix();
  const stableArtifacts = writePublishedStableEvidenceArtifacts();
  const releaseArtifacts = writeReadyReleaseTrustArtifacts();
  const designArtifacts = writeReadyDesignPartnerArtifacts();
  writeReviewRecord(
    `stable-evidence-${suffix}.md`,
    `# Stable Evidence Review: button@0.0.1

Record status: completed external review only

Reviewer: Ada Example
Reviewer affiliation: Independent accessibility reviewer
Review date: 2026-05-05
Source issue: https://github.com/blencorp/ashlar/issues/100
Repo commit: 0123456789abcdef0123456789abcdef01234567
Registry path: ${stableArtifacts.registryPath}
Evidence bundle path: ${stableArtifacts.reviewDir}

## Scope

- Component: button
- Capsule version: 0.0.1
- Stability target: stable-evidence
- Supported interaction modes: keyboard, screen reader, pointer
- Browsers and assistive technology reviewed: Chrome 124 and VoiceOver

## Evidence Artifacts

- Automated evidence: ${stableArtifacts.reviewDir}/button-automated-evidence.json
- Reviewer harness: ${stableArtifacts.reviewDir}/REVIEW.html
- Manual review: ${stableArtifacts.reviewDir}/button-manual-review.json
- Keyboard transcript: ${stableArtifacts.reviewDir}/button-keyboard-transcript.json
- Screen-reader transcript: ${stableArtifacts.reviewDir}/button-screen-reader-transcript.json
- Proposed evidence packet: ${stableArtifacts.reviewDir}/button.evidence.proposed.json
- Publication receipt: ${stableArtifacts.publicationReceipt}
- Review status command: ashlar evidence review-status button --registry ${stableArtifacts.registryPath} --review-dir ${stableArtifacts.reviewDir}

## Command Output

\`\`\`text
ashlar evidence review-status button --registry ${stableArtifacts.registryPath} --review-dir ${stableArtifacts.reviewDir}
\`\`\`

Result: pass

## Findings

- Blocking findings: none
- Non-blocking findings: none
- Follow-up required: publish reviewed evidence packet

## Decision

Decision: pass

Rationale: Reviewer artifacts describe observed behavior and the review-status command passed.

## Links

- GitHub issue: https://github.com/blencorp/ashlar/issues/100
- Pull request: https://github.com/blencorp/ashlar/pull/100
- CI run: https://github.com/blencorp/ashlar/actions/runs/100
`,
  );
  writeReviewRecord(
    `release-trust-${suffix}.md`,
    `# Release Trust Review: 0.1.0

Record status: completed external review only

Reviewer: Grace Example
Reviewer affiliation: Independent supply-chain reviewer
Review date: 2026-05-05
Source issue: https://github.com/blencorp/ashlar/issues/101
Repo commit: 0123456789abcdef0123456789abcdef01234567
Release candidate: 0.1.0

## Scope

- Packages reviewed: ashlar@0.1.0, @ashlar/cli@0.1.0, and @ashlar/schemas@0.1.0
- Registry artifacts reviewed: ${releaseArtifacts.registryArtifact}
- Workflows reviewed: publish.yml and sigstore.yml
- Trust-root policy reviewed: registry/trust-root.json

## Evidence Artifacts

- npm provenance verification: ${releaseArtifacts.npmProvenance}
- Capsule Sigstore verification: ${releaseArtifacts.sigstoreVerification}
- Release SBOM: ${releaseArtifacts.sbom}
- Release SBOM attestation: ${releaseArtifacts.attestation}
- Release trust bundle: ${releaseArtifacts.trustBundle}
- Supply-chain incident playbook: docs/security/supply-chain-incident-playbook.md
- GitHub workflow run: https://github.com/blencorp/ashlar/actions/runs/101

## Command Output

\`\`\`text
ashlar release provenance-verify-public --package ashlar@0.1.0 @ashlar/cli@0.1.0 @ashlar/schemas@0.1.0
ashlar release public-trust-verify --registry ${releaseArtifacts.registryArtifact}
ashlar release verify-trust-bundle --bundle ${releaseArtifacts.trustBundle} --registry ${releaseArtifacts.registryArtifact} --sbom ${releaseArtifacts.sbom} --attestation ${releaseArtifacts.attestation}
\`\`\`

Result: pass

## Findings

- Blocking findings: none
- Non-blocking findings: none
- Follow-up required: attach public artifact URLs to launch notes

## Decision

Decision: pass

Rationale: Public provenance, capsule signing, and trust-bundle verification all passed for the reviewed release candidate.

## Links

- GitHub issue: https://github.com/blencorp/ashlar/issues/101
- Pull request: https://github.com/blencorp/ashlar/pull/101
- Published npm package: https://www.npmjs.com/package/@ashlar/cli/v/0.1.0
- Workflow artifact: https://github.com/blencorp/ashlar/actions/runs/101
`,
  );
  writeReviewRecord(
    `design-partner-${suffix}.md`,
    `# Design Partner Review: benefits application flow

Record status: completed external review only

Reviewer: Katherine Example
Reviewer affiliation: Public-service delivery consultant
Review date: 2026-05-05
Source issue: https://github.com/blencorp/ashlar/issues/102
Repo commit: 0123456789abcdef0123456789abcdef01234567
Scenario: benefits application flow in a legacy federal project

## Scope

- Product surface reviewed: validator wedge and service-flow proof
- Integration path reviewed: add, audit, search, suggest, and generated guidance
- Existing project or fixture: examples/legacy-federal-project
- User role: agency delivery engineer
- Adoption goal: determine whether validator-first adoption is credible

## Review Inputs

- Demo or branch: codex/standards-evidence-slice
- Commands run: ashlar audit, ashlar search, ashlar suggest, ashlar add
- Screens reviewed: ${designArtifacts.screensReviewed}
- Generated AGENTS/DESIGN guidance: .ashlar/AGENTS.md and .ashlar/DESIGN.md
- Validator output: ${designArtifacts.validatorOutput}
- Design partner reviewer checklist: ${designArtifacts.reviewChecklist}

## Feedback

- What worked: validator-first adoption was understandable
- What was unclear: capsule naming needs launch-copy support
- Integration blockers: procurement proof links need to be easier to find
- Missing primitives: authenticated account settings flow
- Documentation gaps: quickstart should lead with audit-before-add

## Adoption Assessment

- Would replace USWDS directly: yes for a pilot after stable evidence is published
- Would use beside USWDS: yes for validator and update tooling
- Would only use validator/tooling: no
- Would not adopt: no

## Decision

Decision: pass

Rationale: The reviewer found the wedge credible for a public-service pilot after the evidence and trust gates complete.

## Links

- GitHub issue: https://github.com/blencorp/ashlar/issues/102
- Pull request: https://github.com/blencorp/ashlar/pull/102
- Demo recording or screenshots: https://github.com/blencorp/ashlar/actions/runs/102
`,
  );
}

function releaseTrustRecordArgs(output: string): string[] {
  const releaseArtifacts = writeReadyReleaseTrustArtifacts();
  return [
    "release",
    "review-record",
    "release-trust",
    "--output",
    output,
    "--reviewer",
    "Grace Example",
    "--affiliation",
    "Independent supply-chain reviewer",
    "--review-date",
    "2026-05-05",
    "--source-issue",
    "https://github.com/blencorp/ashlar/issues/101",
    "--repo-commit",
    "0123456789abcdef0123456789abcdef01234567",
    "--rationale",
    "The reviewed release artifacts passed public provenance and trust verification.",
    "--release-candidate",
    "0.1.0",
    "--registry-artifact",
    releaseArtifacts.registryArtifact,
    "--npm-provenance",
    releaseArtifacts.npmProvenance,
    "--sigstore-verification",
    releaseArtifacts.sigstoreVerification,
    "--sbom",
    releaseArtifacts.sbom,
    "--attestation",
    releaseArtifacts.attestation,
    "--trust-bundle",
    releaseArtifacts.trustBundle,
    "--workflow-run",
    "https://github.com/blencorp/ashlar/actions/runs/101",
    "--package",
    "ashlar@0.1.0",
    "@ashlar/cli@0.1.0",
    "@ashlar/schemas@0.1.0",
  ];
}

function writeFakeCosign(mode: "pass" | "sign-fail" | "verify-fail" = "pass"): string {
  const cosignPath = join(scratch, `fake-cosign-${mode}.mjs`);
  writeFakeCosignScript(cosignPath, mode);
  return cosignPath;
}

function writeFakeCosignScript(
  cosignPath: string,
  mode: "pass" | "sign-fail" | "verify-fail" = "pass",
): void {
  writeFileSync(
    cosignPath,
    `#!/usr/bin/env node
import { readFileSync, writeFileSync } from "node:fs";
const args = process.argv.slice(2);
if (args[0] === "sign-blob") {
  if (${JSON.stringify(mode)} === "sign-fail") {
    console.error("sign failed");
    process.exit(1);
  }
  const bundlePath = args[args.indexOf("--bundle") + 1];
  const payloadPath = args.at(-1);
  writeFileSync(bundlePath, JSON.stringify({
    mediaType: "application/vnd.dev.sigstore.bundle+json;version=0.3",
    signedPayload: readFileSync(payloadPath, "utf8")
  }));
  process.exit(0);
}
if (args[0] === "verify-blob") {
  if (${JSON.stringify(mode)} === "verify-fail") {
    console.error("verify failed");
    process.exit(1);
  }
  process.exit(0);
}
console.error("unexpected cosign command: " + args.join(" "));
process.exit(1);
`,
  );
  chmodSync(cosignPath, 0o755);
}

function installDefaultFakeCosign(): void {
  const binDir = join(scratch, "bin");
  mkdirSync(binDir, { recursive: true });
  writeFakeCosignScript(join(binDir, "cosign"));
  process.env.PATH = `${binDir}:${originalPath ?? ""}`;
}

function writeFakeNpm(
  mode: "pass" | "missing-provenance" | "install-fail" | "untrusted-metadata" = "pass",
): string {
  const npmPath = join(scratch, `fake-npm-${mode}.mjs`);
  writeFileSync(
    npmPath,
    `#!/usr/bin/env node
import { readFileSync } from "node:fs";
const args = process.argv.slice(2);
if (args[0] === "install") {
  if (${JSON.stringify(mode)} === "install-fail") {
    console.error("package not found");
    process.exit(1);
  }
  process.exit(0);
}
if (args[0] === "audit" && args[1] === "signatures") {
  const manifest = JSON.parse(readFileSync("package.json", "utf8"));
  const dependencies = Object.entries(manifest.dependencies ?? {});
  const payload = ${JSON.stringify(mode)} === "untrusted-metadata" ? {
    _type: "https://in-toto.io/Statement/v1",
    predicateType: "https://slsa.dev/provenance/v1",
    subject: [],
    predicate: {
      builder: {
        id: "https://github.com/other/repo/.github/workflows/untrusted.yml@refs/heads/main"
      },
      buildDefinition: {
        externalParameters: {
          workflow: "untrusted.yml",
          repository: "https://github.com/other/repo"
        }
      }
    }
  } : {
    _type: "https://in-toto.io/Statement/v1",
    predicateType: "https://slsa.dev/provenance/v1",
    subject: (${JSON.stringify(mode)} === "missing-provenance"
      ? dependencies.slice(0, 1)
      : dependencies
    ).map(([name, version]) => ({
      name: "pkg:npm/" + encodeURIComponent(name).replace("%2F", "%2f") + "@" + version
    })),
    predicate: {
      builder: {
        id: "https://github.com/blencorp/ashlar/.github/workflows/publish.yml@refs/heads/main"
      },
      buildDefinition: {
        externalParameters: {
          workflow: "publish.yml",
          repository: "https://github.com/blencorp/ashlar"
        }
      }
    }
  };
  console.log(JSON.stringify({
    untrustedMetadata: {
      repository: "https://github.com/blencorp/ashlar",
      workflow: "publish.yml",
      packages: dependencies.map(([name, version]) => name + "@" + version)
    },
    verified: [
      {
        name: "@ashlar/cli",
        version: "0.0.0",
        attestation: {
          bundle: {
            dsseEnvelope: {
              payload: Buffer.from(JSON.stringify(payload)).toString("base64")
            }
          }
        }
      }
    ]
  }));
  process.exit(0);
}
console.error("unexpected npm command: " + args.join(" "));
process.exit(1);
`,
  );
  chmodSync(npmPath, 0o755);
  return npmPath;
}

beforeEach(() => {
  scratch = mkdtempSync(join(tmpdir(), "ashlar-release-test-"));
  createdReviewFiles = [];
  originalPath = process.env.PATH;
  installDefaultFakeCosign();
});

afterEach(() => {
  process.env.PATH = originalPath;
  for (const file of createdReviewFiles) {
    rmSync(file, { force: true });
  }
  rmSync(scratch, { recursive: true, force: true });
});

describe("release command", { timeout: slowReleaseTestTimeout }, () => {
  it("signs registry capsules with Sigstore bundle metadata and verifies the bundle path", () => {
    const registry = copyRegistry();
    const cosignPath = writeFakeCosign();

    const result = runCli([
      "release",
      "sign-capsules",
      "button",
      "--registry",
      registry,
      "--cosign",
      cosignPath,
    ]);

    expect(result.status, result.stdout).toBe(0);
    expect(result.stdout).toContain("Signed button@0.0.1: button.sigstore.json sha256:");
    expect(result.stdout).toContain("Signed 1 capsule manifest(s)");

    const manifest = JSON.parse(
      readFileSync(join(registry, "components", "button", "0.0.1", "button.capsule.json"), "utf8"),
    ) as {
      capsule_hash: string;
      sigstore?: {
        bundle: string;
        bundleHash: string;
        certificateIdentity: string;
        certificateOidcIssuer: string;
        signedPayloadHash: string;
      };
    };
    expect(manifest.sigstore).toMatchObject({
      bundle: "button.sigstore.json",
      certificateIdentity:
        "https://github.com/blencorp/ashlar/.github/workflows/sigstore.yml@refs/heads/main",
      certificateOidcIssuer: "https://token.actions.githubusercontent.com",
    });
    expect(manifest.sigstore?.bundleHash).toMatch(/^sha256:[a-f0-9]{64}$/);
    expect(manifest.sigstore?.signedPayloadHash).toMatch(/^sha256:[a-f0-9]{64}$/);
    expect(
      existsSync(join(registry, "components", "button", "0.0.1", "button.sigstore.json")),
    ).toBe(true);
  });

  it("verifies public capsule Sigstore trust for signed registry artifacts", () => {
    const registry = copyRegistry();
    const cosignPath = writeFakeCosign();

    expect(
      runCli(["release", "sign-capsules", "button", "--registry", registry, "--cosign", cosignPath])
        .status,
    ).toBe(0);

    const result = runCli([
      "release",
      "public-trust-verify",
      "button",
      "--registry",
      registry,
      "--cosign",
      cosignPath,
    ]);

    expect(result.status, result.stdout).toBe(0);
    expect(result.stdout).toContain("Public capsule Sigstore trust verified");
    expect(result.stdout).toContain("button@0.0.1 button.sigstore.json sha256:");
  });

  it("does not report verified capsules when the trust policy cannot require cosign", () => {
    const registry = copyRegistry();
    const trustRootPath = join(registry, "trust-root.json");
    const trustRoot = JSON.parse(readFileSync(trustRootPath, "utf8")) as {
      sigstore?: { bundleVerification?: string };
    };
    if (!trustRoot.sigstore) {
      throw new Error("Expected test registry to include a Sigstore trust policy");
    }
    trustRoot.sigstore.bundleVerification = "metadata";
    writeFileSync(trustRootPath, `${JSON.stringify(trustRoot, null, 2)}\n`);

    const result = runCli([
      "release",
      "public-trust-verify",
      "button",
      "--registry",
      registry,
      "--json",
    ]);
    const report = JSON.parse(result.stdout) as { capsules: unknown[]; errors: string[] };

    expect(result.status).toBe(1);
    expect(report.capsules).toEqual([]);
    expect(report.errors).toContain('registry trust root must set sigstore.bundleVerification to "cosign"');
  });

  it("fails public capsule Sigstore trust when a capsule has not been signed", () => {
    const registry = copyRegistry();
    const cosignPath = writeFakeCosign();

    const result = runCli([
      "release",
      "public-trust-verify",
      "button",
      "--registry",
      registry,
      "--cosign",
      cosignPath,
    ]);

    expect(result.status).toBe(1);
    expect(result.stdout).toContain("Public capsule Sigstore trust verification failed");
    expect(result.stdout).toContain("button@0.0.1: missing capsule Sigstore bundle metadata");
  });

  it("does not mutate a capsule manifest when cosign signing fails", () => {
    const registry = copyRegistry();
    const manifestPath = join(registry, "components", "button", "0.0.1", "button.capsule.json");
    const before = readFileSync(manifestPath, "utf8");
    const cosignPath = writeFakeCosign("sign-fail");

    const result = runCli([
      "release",
      "sign-capsules",
      "button",
      "--registry",
      registry,
      "--cosign",
      cosignPath,
    ]);

    expect(result.status).toBe(1);
    expect(result.stdout).toContain("cosign sign-blob failed");
    expect(readFileSync(manifestPath, "utf8")).toBe(before);
    expect(
      existsSync(join(registry, "components", "button", "0.0.1", "button.sigstore.json")),
    ).toBe(false);
  });

  it("writes an SPDX SBOM for the release packages and dependencies", () => {
    const outputPath = join(scratch, "ashlar-sbom.spdx.json");

    const result = runCli(["release", "sbom", "--output", outputPath]);

    expect(result.status).toBe(0);
    expect(result.stdout).toContain(`Wrote release SBOM to ${outputPath}`);

    const sbom = JSON.parse(readFileSync(outputPath, "utf8")) as {
      SPDXID: string;
      creationInfo: { creators: string[] };
      dataLicense: string;
      documentNamespace: string;
      name: string;
      packages: Array<{
        SPDXID: string;
        downloadLocation: string;
        filesAnalyzed: boolean;
        name: string;
        supplier: string;
        versionInfo?: string;
      }>;
      relationships: Array<{
        spdxElementId: string;
        relationshipType: string;
        relatedSpdxElement: string;
      }>;
      spdxVersion: string;
    };

    expect(sbom).toMatchObject({
      SPDXID: "SPDXRef-DOCUMENT",
      dataLicense: "CC0-1.0",
      name: "Ashlar release SBOM",
      spdxVersion: "SPDX-2.3",
    });
    expect(sbom.documentNamespace).toMatch(/^https:\/\/ashlar\.dev\/sbom\/ashlar-/);
    expect(sbom.creationInfo.creators).toContain("Tool: ashlar release sbom");
    expect(sbom.packages).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          SPDXID: "SPDXRef-Package-ashlar",
          name: "ashlar",
          supplier: "Organization: BLEN",
          versionInfo: "0.0.0",
        }),
        expect.objectContaining({
          SPDXID: "SPDXRef-Package-ashlar-cli",
          name: "@ashlar/cli",
          supplier: "Organization: BLEN",
          versionInfo: "0.0.0",
        }),
        expect.objectContaining({
          SPDXID: "SPDXRef-Package-ashlar-schemas",
          name: "@ashlar/schemas",
          versionInfo: "0.0.0",
        }),
        expect.objectContaining({
          name: "commander",
          versionInfo: "14.0.3",
        }),
      ]),
    );
    expect(sbom.relationships).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          relationshipType: "DESCRIBES",
          spdxElementId: "SPDXRef-DOCUMENT",
        }),
        expect.objectContaining({
          relationshipType: "DEPENDS_ON",
          spdxElementId: "SPDXRef-Package-ashlar-cli",
        }),
      ]),
    );
  });

  it("attests and verifies the release SBOM hash", () => {
    const sbomPath = join(scratch, "ashlar-sbom.spdx.json");
    const attestationPath = join(scratch, "ashlar-sbom.attestation.json");

    expect(runCli(["release", "sbom", "--output", sbomPath]).status).toBe(0);

    const attest = runCli([
      "release",
      "attest",
      "--subject",
      sbomPath,
      "--output",
      attestationPath,
    ]);

    expect(attest.status).toBe(0);
    expect(attest.stdout).toContain(`Wrote release attestation to ${attestationPath}`);

    const attestation = JSON.parse(readFileSync(attestationPath, "utf8")) as {
      predicateType: string;
      subject: { digest: { sha256: string }; name: string; size: number };
      type: string;
    };
    expect(attestation).toMatchObject({
      predicateType: "https://ashlar.dev/attestations/release-artifact/v1",
      type: "https://in-toto.io/Statement/v1",
    });
    expect(attestation.subject.name).toBe("ashlar-sbom.spdx.json");
    expect(attestation.subject.digest.sha256).toMatch(/^[a-f0-9]{64}$/);
    expect(attestation.subject.size).toBeGreaterThan(0);

    const verify = runCli([
      "release",
      "verify-attestation",
      "--subject",
      sbomPath,
      "--attestation",
      attestationPath,
    ]);
    expect(verify.status).toBe(0);
    expect(verify.stdout).toContain("Release attestation verified");

    writeFileSync(sbomPath, `${readFileSync(sbomPath, "utf8").trim()}\n `);

    const tampered = runCli([
      "release",
      "verify-attestation",
      "--subject",
      sbomPath,
      "--attestation",
      attestationPath,
    ]);
    expect(tampered.status).toBe(1);
    expect(tampered.stdout).toContain("Release attestation verification failed");
  });

  it("checks npm provenance publishing readiness", () => {
    const result = runCli(["release", "provenance-check"]);

    expect(result.status).toBe(0);
    expect(result.stdout).toContain("npm provenance readiness verified");
    expect(result.stdout).toContain("ashlar");
    expect(result.stdout).toContain("@ashlar/cli");
    expect(result.stdout).toContain("@ashlar/schemas");
  });

  it("verifies public npm provenance for exact published package versions", () => {
    const npmPath = writeFakeNpm();

    const result = runCli([
      "release",
      "provenance-verify-public",
      "--npm",
      npmPath,
      "--package",
      "ashlar@0.0.0",
      "@ashlar/cli@0.0.0",
      "@ashlar/schemas@0.0.0",
    ]);

    expect(result.status, result.stdout).toBe(0);
    expect(result.stdout).toContain("Public npm provenance verified");
    expect(result.stdout).toContain("ashlar@0.0.0");
    expect(result.stdout).toContain("@ashlar/cli@0.0.0");
    expect(result.stdout).toContain("@ashlar/schemas@0.0.0");
  });

  it("fails public npm provenance verification when an expected package is missing", () => {
    const npmPath = writeFakeNpm("missing-provenance");

    const result = runCli([
      "release",
      "provenance-verify-public",
      "--npm",
      npmPath,
      "--package",
      "ashlar@0.0.0",
      "@ashlar/cli@0.0.0",
      "@ashlar/schemas@0.0.0",
    ]);

    expect(result.status).toBe(1);
    expect(result.stdout).toContain("Public npm provenance verification failed");
    expect(result.stdout).toContain("npm provenance output does not include @ashlar/schemas@0.0.0");
  });

  it("ignores untrusted npm audit metadata when checking public provenance", () => {
    const npmPath = writeFakeNpm("untrusted-metadata");

    const result = runCli([
      "release",
      "provenance-verify-public",
      "--npm",
      npmPath,
      "--package",
      "@ashlar/cli@0.0.0",
      "@ashlar/schemas@0.0.0",
    ]);

    expect(result.status).toBe(1);
    expect(result.stdout).toContain("Public npm provenance verification failed");
    expect(result.stdout).toContain(
      "npm provenance output does not reference github.com/blencorp/ashlar.",
    );
    expect(result.stdout).toContain("npm provenance output does not reference the publish.yml workflow.");
    expect(result.stdout).toContain("npm provenance output does not include @ashlar/cli@0.0.0.");
  });

  it("reports replacement-grade readiness blockers for the current prototype", () => {
    const result = runCli(["release", "readiness", "--registry", "./registry", "--json"]);

    expect(result.status).toBe(1);
    const report = JSON.parse(result.stdout) as {
      $schema: string;
      checks: Array<{ details: string[]; id: string; status: string; summary: string }>;
      status: string;
      summary: { failed: number };
    };

    expect(report.$schema).toBe("https://ashlar.dev/schemas/release-readiness.schema.json");
    expect(report.status).toBe("fail");
    expect(report.summary.failed).toBeGreaterThanOrEqual(1);
    expect(report.checks).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: "stable-l0-evidence",
          status: "fail",
        }),
        expect.objectContaining({
          id: "npm-provenance-public",
          status: "fail",
        }),
        expect.objectContaining({
          id: "external-review-process",
          status: "pass",
        }),
        expect.objectContaining({
          id: "external-review-proof",
          status: "fail",
        }),
        expect.objectContaining({
          id: "sigstore-public-trust",
          status: "fail",
        }),
      ]),
    );
    expect(report.checks.find((check) => check.id === "external-review-proof")?.details).toContain(
      "Templates under docs/reviews/templates/ do not count as completed records.",
    );
  });

  it("writes a Markdown replacement-grade readiness report for external review", () => {
    const reportPath = join(scratch, "reports", "release-readiness.md");

    const result = runCli([
      "release",
      "readiness",
      "--registry",
      "./registry",
      "--report",
      reportPath,
    ]);

    expect(result.status).toBe(1);
    expect(result.stdout).toContain(`Wrote release readiness report to ${reportPath}`);
    const report = readFileSync(reportPath, "utf8");
    expect(report).toContain("# Ashlar Release Readiness Report");
    expect(report).toContain("## Summary");
    expect(report).toContain("- Status: fail");
    expect(report).toContain("## Blocking Checks");
    expect(report).toContain(
      "- stable-l0-evidence: Requires at least 1 stable-evidence L0 component(s); found 0.",
    );
    expect(report).toContain(
      "- external-review-proof: External review proof records are incomplete.",
    );
    expect(report).toContain(
      "- npm-provenance-public: Public npm trusted publishing and provenance cannot be proven from the local repository.",
    );
    expect(report).toContain(
      "- sigstore-public-trust: 0/13 capsule manifest(s) include Sigstore bundle metadata; remaining capsules use local Ed25519 signatures.",
    );
    expect(report).toContain("## Replacement Claim Rule");
  });

  it("writes a schema-backed JSON replacement-grade readiness report for automation", () => {
    const reportPath = join(scratch, "reports", "release-readiness.json");

    const result = runCli([
      "release",
      "readiness",
      "--registry",
      "./registry",
      "--json-output",
      reportPath,
    ]);

    expect(result.status).toBe(1);
    expect(result.stdout).toContain(`Wrote release readiness JSON to ${reportPath}`);
    const report = JSON.parse(readFileSync(reportPath, "utf8")) as {
      $schema: string;
      checks: Array<{ id: string; status: string }>;
      status: string;
      summary: { failed: number };
    };
    expect(report.$schema).toBe("https://ashlar.dev/schemas/release-readiness.schema.json");
    expect(report.status).toBe("fail");
    expect(report.summary.failed).toBeGreaterThanOrEqual(1);
    expect(report.checks).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: "stable-l0-evidence", status: "fail" }),
        expect.objectContaining({ id: "external-review-proof", status: "fail" }),
        expect.objectContaining({ id: "npm-provenance-public", status: "fail" }),
        expect.objectContaining({ id: "sigstore-public-trust", status: "fail" }),
      ]),
    );
  });

  it("writes a release review pack without creating completed proof records", () => {
    const output = join(scratch, "review-pack");

    const result = runCli(["release", "review-pack", "--registry", "./registry", "--output", output]);

    expect(result.status, result.stdout).toBe(0);
    expect(result.stdout).toContain(`Wrote release review pack to ${output}`);
    expect(result.stdout).toContain("this pack is intake material, not proof");

    const readiness = JSON.parse(readFileSync(join(output, "release-readiness.json"), "utf8")) as {
      checks: Array<{ id: string; status: string }>;
      status: string;
    };
    expect(readiness.status).toBe("fail");
    expect(readiness.checks).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: "external-review-proof", status: "fail" }),
        expect.objectContaining({ id: "stable-l0-evidence", status: "fail" }),
      ]),
    );

    const reviewStatus = JSON.parse(
      readFileSync(join(output, "stable-evidence", "button-review-status.json"), "utf8"),
    ) as { status: string };
    expect(reviewStatus.status).toBe("blocked");
    expect(existsSync(join(output, "stable-evidence", "INDEX.md"))).toBe(true);
    expect(existsSync(join(output, "stable-evidence", "button", "ISSUE.md"))).toBe(true);
    expect(existsSync(join(output, "release-trust", "ashlar-release-trust-checklist.md"))).toBe(
      true,
    );
    expect(existsSync(join(output, "design-partner", "ashlar-design-partner-checklist.md"))).toBe(
      true,
    );

    const readme = readFileSync(join(output, "README.md"), "utf8");
    expect(readme).toContain("It does not create completed `docs/reviews/*.md` proof records");
    expect(readme).toContain("Do not count this pack as external review");
    expect(readme).toContain("Using A CI Artifact");
    expect(readme).toContain("gh run download <run-id> -n ashlar-release-review-pack");
    expect(readme).toContain("extract its contents into `reports/review-pack/`");
    expect(readme).toContain("stable-evidence/INDEX.md");
    expect(readme).toContain("release-trust/ashlar-release-trust-checklist.md");
    expect(readme).toContain("design-partner/ashlar-design-partner-checklist.md");
    expect(readme).not.toContain(output);
  });

  it("writes checkout-relative release-trust checklist paths for relative review pack output", () => {
    const outputArg = `reports/review-pack-${reviewFileSuffix()}`;
    const output = join(repoRoot, outputArg);

    try {
      rmSync(output, { recursive: true, force: true });
      const result = runCli([
        "release",
        "review-pack",
        "--registry",
        "./registry",
        "--output",
        outputArg,
      ]);

      expect(result.status, result.stdout).toBe(0);
      const checklist = readFileSync(
        join(output, "release-trust", "ashlar-release-trust-checklist.md"),
        "utf8",
      );
      expect(checklist).toContain(
        `ashlar release verify-trust-bundle --registry ./registry --bundle ${outputArg}/release-trust/ashlar-trust-bundle.json --sbom ${outputArg}/release-trust/ashlar-sbom.spdx.json --attestation ${outputArg}/release-trust/ashlar-sbom.attestation.json`,
      );
      expect(checklist).not.toContain(repoRoot);
    } finally {
      rmSync(output, { recursive: true, force: true });
    }
  });

  it("writes a design partner reviewer checklist for external product validation", () => {
    const checklistPath = join(scratch, "ashlar-design-partner-checklist.md");

    const result = runCli(["release", "design-partner-checklist", "--output", checklistPath]);

    expect(result.status, result.stdout).toBe(0);
    expect(result.stdout).toContain(`Wrote design partner review checklist to ${checklistPath}`);
    const checklist = readFileSync(checklistPath, "utf8");
    expect(checklist).toContain("# Design Partner Reviewer Checklist");
    expect(checklist).toContain(
      "ashlar audit --policy federal --explain examples/legacy-federal-project/index.html",
    );
    expect(checklist).toContain(
      "ashlar audit --policy all --registry ./registry examples/service-flow/benefit-application.pass.html",
    );
    expect(checklist).toContain('ashlar search "benefits application" --registry ./registry');
    expect(checklist).toContain('ashlar suggest "Build a benefits application form"');
    expect(checklist).toContain("ashlar view button --registry ./registry");
    expect(checklist).toContain("does not count toward release readiness");
    expect(checklist).toContain("official USWDS, GSA, NDS, or federal guidance");
    expect(checklist).toContain("records actual reactions and blockers");
  });

  it("checks external review records without running full release readiness", () => {
    const result = runCli(["release", "review-record-check", "--json"]);

    expect(result.status).toBe(1);
    const report = JSON.parse(result.stdout) as {
      missing: string[];
      records: Array<{ file: string; status: string }>;
      status: string;
    };

    expect(report.status).toBe("fail");
    expect(report.records).toEqual([]);
    expect(report.missing).toEqual(
      expect.arrayContaining([
        "missing completed stable evidence review (stable-evidence-*.md)",
        "missing completed release trust review (release-trust-*.md)",
        "missing completed design partner review (design-partner-*.md)",
      ]),
    );
  });

  it("does not count copied review templates as completed external proof", () => {
    const suffix = reviewFileSuffix();
    writeReviewRecord(
      `stable-evidence-${suffix}.md`,
      readFileSync(
        join(repoRoot, "docs", "reviews", "templates", "stable-evidence-review.md"),
        "utf8",
      ),
    );
    writeReviewRecord(
      `release-trust-${suffix}.md`,
      readFileSync(
        join(repoRoot, "docs", "reviews", "templates", "release-trust-review.md"),
        "utf8",
      ),
    );
    writeReviewRecord(
      `design-partner-${suffix}.md`,
      readFileSync(
        join(repoRoot, "docs", "reviews", "templates", "design-partner-review.md"),
        "utf8",
      ),
    );

    const result = runCli([
      "release",
      "readiness",
      "--registry",
      "./registry",
      "--min-stable-l0",
      "0",
      "--allow-unverified-public",
      "--allow-local-signatures",
      "--json",
    ]);

    expect(result.status, result.stdout).toBe(0);
    const report = JSON.parse(result.stdout) as {
      checks: Array<{ details: string[]; id: string; status: string }>;
    };
    const proof = report.checks.find((check) => check.id === "external-review-proof");
    expect(proof?.status).toBe("warning");
    expect(proof?.details).toEqual(
      expect.arrayContaining([
        "missing completed stable evidence review (stable-evidence-*.md)",
        "missing completed release trust review (release-trust-*.md)",
        "missing completed design partner review (design-partner-*.md)",
        expect.stringContaining("contains angle-bracket placeholder text"),
        expect.stringContaining("decision must be pass"),
      ]),
    );
  });

  it("rejects placeholder review records in the direct review-record checker", () => {
    const file = `release-trust-${reviewFileSuffix()}-template.md`;
    writeReviewRecord(
      file,
      readFileSync(
        join(repoRoot, "docs", "reviews", "templates", "release-trust-review.md"),
        "utf8",
      ),
    );

    const result = runCli([
      "release",
      "review-record-check",
      join("docs", "reviews", file),
      "--json",
    ]);

    expect(result.status).toBe(1);
    const report = JSON.parse(result.stdout) as {
      records: Array<{ errors: string[]; file: string; status: string }>;
      status: string;
    };
    expect(report.status).toBe("fail");
    expect(report.records).toEqual([
      expect.objectContaining({
        file: `docs/reviews/${file}`,
        status: "fail",
      }),
    ]);
    expect(report.records[0]?.errors).toEqual(
      expect.arrayContaining([
        "contains angle-bracket placeholder text",
        "decision must be pass; blocked or undecided reviews do not count as proof",
      ]),
    );
  });

  it("rejects stable evidence records that point at a blocked reviewer bundle", () => {
    const reviewDir = join(scratch, "button-stable-review");
    expect(
      runCli([
        "evidence",
        "prepare-stable",
        "button",
        "--registry",
        "./registry",
        "--fixture",
        "registry/components/button/0.0.1/button.html",
        "--output",
        reviewDir,
      ]).status,
    ).toBe(0);

    const file = `stable-evidence-${reviewFileSuffix()}-blocked.md`;
    writeReviewRecord(
      file,
      `# Stable Evidence Review: button@0.0.1

Record status: completed external review only

Reviewer: Ada Example
Reviewer affiliation: Independent accessibility reviewer
Review date: 2026-05-05
Source issue: https://github.com/blencorp/ashlar/issues/100
Repo commit: 0123456789abcdef0123456789abcdef01234567
Registry path: ./registry
Evidence bundle path: ${reviewDir}
Publication receipt: https://example.gov/button-publication-receipt.json

## Scope

- Component: button
- Capsule version: 0.0.1
- Stability target: stable-evidence
- Supported interaction modes: keyboard, screen reader, pointer
- Browsers and assistive technology reviewed: Chrome 124 and VoiceOver

## Evidence Artifacts

- Automated evidence: ${reviewDir}/button-automated-evidence.json
- Reviewer harness: ${reviewDir}/REVIEW.html
- Manual review: ${reviewDir}/button-manual-review.json
- Keyboard transcript: ${reviewDir}/button-keyboard-transcript.json
- Screen-reader transcript: ${reviewDir}/button-screen-reader-transcript.json
- Proposed evidence packet: ${reviewDir}/button.evidence.proposed.json
- Publication receipt: https://example.gov/button-publication-receipt.json
- Review status command: ashlar evidence review-status button --registry ./registry --review-dir ${reviewDir}

## Command Output

\`\`\`text
ashlar evidence review-status button --registry ./registry --review-dir ${reviewDir}
\`\`\`

Result: pass

## Findings

- Blocking findings: none
- Non-blocking findings: none
- Follow-up required: publish reviewed evidence packet

## Decision

Decision: pass

Rationale: Reviewer artifacts describe observed behavior and the review-status command passed.
`,
    );

    const result = runCli(["release", "review-record-check", join("docs", "reviews", file), "--json"]);

    expect(result.status).toBe(1);
    const report = JSON.parse(result.stdout) as {
      records: Array<{ errors: string[]; file: string; status: string }>;
      status: string;
    };
    expect(report.status).toBe("fail");
    expect(report.records[0]?.errors).toEqual(
      expect.arrayContaining([
        expect.stringContaining("referenced stable evidence bundle is blocked"),
        expect.stringContaining("review/placeholder"),
      ]),
    );
  });

  it("rejects stable evidence records when the publication receipt drifts", () => {
    const stableArtifacts = writePublishedStableEvidenceArtifacts();
    const receipt = JSON.parse(readFileSync(stableArtifacts.publicationReceipt, "utf8")) as {
      capsuleHash: string;
    };
    receipt.capsuleHash = `sha256:${"0".repeat(64)}`;
    writeFileSync(stableArtifacts.publicationReceipt, `${JSON.stringify(receipt, null, 2)}\n`);

    const file = `stable-evidence-${reviewFileSuffix()}-stale-publication.md`;
    writeReviewRecord(
      file,
      `# Stable Evidence Review: button@0.0.1

Record status: completed external review only

Reviewer: Ada Example
Reviewer affiliation: Independent accessibility reviewer
Review date: 2026-05-05
Source issue: https://github.com/blencorp/ashlar/issues/100
Repo commit: 0123456789abcdef0123456789abcdef01234567
Registry path: ${stableArtifacts.registryPath}
Evidence bundle path: ${stableArtifacts.reviewDir}
Publication receipt: ${stableArtifacts.publicationReceipt}

## Scope

- Component: button
- Capsule version: 0.0.1
- Stability target: stable-evidence
- Supported interaction modes: keyboard, screen reader, pointer
- Browsers and assistive technology reviewed: Firefox and NVDA

## Evidence Artifacts

- Automated evidence: ${stableArtifacts.reviewDir}/button-automated-evidence.json
- Reviewer harness: ${stableArtifacts.reviewDir}/REVIEW.html
- Manual review: ${stableArtifacts.reviewDir}/button-manual-review.json
- Keyboard transcript: ${stableArtifacts.reviewDir}/button-keyboard-transcript.json
- Screen-reader transcript: ${stableArtifacts.reviewDir}/button-screen-reader-transcript.json
- Proposed evidence packet: ${stableArtifacts.reviewDir}/button.evidence.proposed.json
- Publication receipt: ${stableArtifacts.publicationReceipt}
- Review status command: ashlar evidence review-status button --registry ${stableArtifacts.registryPath} --review-dir ${stableArtifacts.reviewDir}

## Command Output

\`\`\`text
ashlar evidence review-status button --registry ${stableArtifacts.registryPath} --review-dir ${stableArtifacts.reviewDir}
\`\`\`

Result: pass

## Findings

- Blocking findings: none
- Non-blocking findings: none
- Follow-up required: publish reviewed evidence packet

## Decision

Decision: pass

Rationale: Reviewer artifacts describe observed behavior, the review-status command passed, and the stable evidence packet was published into the signed registry.
`,
    );

    const result = runCli(["release", "review-record-check", join("docs", "reviews", file), "--json"]);

    expect(result.status).toBe(1);
    const report = JSON.parse(result.stdout) as {
      records: Array<{ errors: string[]; status: string }>;
      status: string;
    };
    expect(report.status).toBe("fail");
    expect(report.records[0]?.errors).toEqual(
      expect.arrayContaining([
        expect.stringContaining("Publication receipt capsule hash does not match registry index"),
      ]),
    );
  });

  it("rejects release trust records when referenced local trust artifacts drift", () => {
    const artifacts = writeReadyReleaseTrustArtifacts();
    const file = `release-trust-${reviewFileSuffix()}-stale.md`;
    writeReviewRecord(
      file,
      `# Release Trust Review: 0.1.0

Record status: completed external review only

Reviewer: Grace Example
Reviewer affiliation: Independent supply-chain reviewer
Review date: 2026-05-05
Source issue: https://github.com/blencorp/ashlar/issues/101
Repo commit: 0123456789abcdef0123456789abcdef01234567
Release candidate: 0.1.0

## Scope

- Packages reviewed: ashlar@0.1.0, @ashlar/cli@0.1.0, and @ashlar/schemas@0.1.0
- Registry artifacts reviewed: ${artifacts.registryArtifact}
- Workflows reviewed: publish.yml and sigstore.yml
- Trust-root policy reviewed: registry/trust-root.json

## Evidence Artifacts

- npm provenance verification: ${artifacts.npmProvenance}
- Capsule Sigstore verification: ${artifacts.sigstoreVerification}
- Release SBOM: ${artifacts.sbom}
- Release SBOM attestation: ${artifacts.attestation}
- Release trust bundle: ${artifacts.trustBundle}
- Supply-chain incident playbook: docs/security/supply-chain-incident-playbook.md
- GitHub workflow run: https://github.com/blencorp/ashlar/actions/runs/101

## Command Output

\`\`\`text
ashlar release provenance-verify-public --package ashlar@0.1.0 @ashlar/cli@0.1.0 @ashlar/schemas@0.1.0
ashlar release public-trust-verify --registry ${artifacts.registryArtifact}
ashlar release verify-trust-bundle --bundle ${artifacts.trustBundle} --registry ${artifacts.registryArtifact} --sbom ${artifacts.sbom} --attestation ${artifacts.attestation}
\`\`\`

Result: pass

## Findings

- Blocking findings: none
- Non-blocking findings: none
- Follow-up required: attach public artifact URLs to launch notes

## Decision

Decision: pass

Rationale: Public provenance, capsule signing, and trust-bundle verification all passed for the reviewed release candidate.
`,
    );
    writeFileSync(artifacts.sbom, `${readFileSync(artifacts.sbom, "utf8")}\n`);

    const result = runCli(["release", "review-record-check", join("docs", "reviews", file), "--json"]);

    expect(result.status).toBe(1);
    const report = JSON.parse(result.stdout) as {
      records: Array<{ errors: string[]; file: string; status: string }>;
      status: string;
    };
    expect(report.status).toBe("fail");
    expect(report.records[0]?.errors).toEqual(
      expect.arrayContaining([
        expect.stringContaining("referenced release trust bundle verification failed"),
      ]),
    );
  });

  it("rejects release trust records when local Sigstore verification output drifts", () => {
    const artifacts = writeReadyReleaseTrustArtifacts();
    const report = JSON.parse(readFileSync(artifacts.sigstoreVerification, "utf8")) as {
      capsules: Array<{ bundleHash: string }>;
    };
    const firstCapsule = report.capsules[0];
    if (!firstCapsule) {
      throw new Error("Expected public-trust fixture to include at least one capsule.");
    }
    firstCapsule.bundleHash = `sha256:${"0".repeat(64)}`;
    writeFileSync(artifacts.sigstoreVerification, `${JSON.stringify(report, null, 2)}\n`);

    const file = `release-trust-${reviewFileSuffix()}-stale-sigstore.md`;
    writeReviewRecord(
      file,
      `# Release Trust Review: 0.1.0

Record status: completed external review only

Reviewer: Grace Example
Reviewer affiliation: Independent supply-chain reviewer
Review date: 2026-05-05
Source issue: https://github.com/blencorp/ashlar/issues/101
Repo commit: 0123456789abcdef0123456789abcdef01234567
Release candidate: 0.1.0

## Scope

- Packages reviewed: ashlar@0.1.0, @ashlar/cli@0.1.0, and @ashlar/schemas@0.1.0
- Registry artifacts reviewed: ${artifacts.registryArtifact}
- Workflows reviewed: publish.yml and sigstore.yml
- Trust-root policy reviewed: registry/trust-root.json

## Evidence Artifacts

- npm provenance verification: ${artifacts.npmProvenance}
- Capsule Sigstore verification: ${artifacts.sigstoreVerification}
- Release SBOM: ${artifacts.sbom}
- Release SBOM attestation: ${artifacts.attestation}
- Release trust bundle: ${artifacts.trustBundle}
- Supply-chain incident playbook: docs/security/supply-chain-incident-playbook.md
- GitHub workflow run: https://github.com/blencorp/ashlar/actions/runs/101

## Command Output

\`\`\`text
ashlar release provenance-verify-public --package ashlar@0.1.0 @ashlar/cli@0.1.0 @ashlar/schemas@0.1.0
ashlar release public-trust-verify --registry ${artifacts.registryArtifact}
ashlar release verify-trust-bundle --bundle ${artifacts.trustBundle} --registry ${artifacts.registryArtifact} --sbom ${artifacts.sbom} --attestation ${artifacts.attestation}
\`\`\`

Result: pass

## Findings

- Blocking findings: none
- Non-blocking findings: none
- Follow-up required: attach public artifact URLs to launch notes

## Decision

Decision: pass

Rationale: Public provenance, capsule signing, and trust-bundle verification all passed for the reviewed release candidate.
`,
    );

    const result = runCli(["release", "review-record-check", join("docs", "reviews", file), "--json"]);

    expect(result.status).toBe(1);
    const check = JSON.parse(result.stdout) as {
      records: Array<{ errors: string[]; file: string; status: string }>;
      status: string;
    };
    expect(check.status).toBe("fail");
    expect(check.records[0]?.errors).toEqual(
      expect.arrayContaining([
        expect.stringContaining("referenced capsule Sigstore verification failed"),
        expect.stringContaining("Sigstore bundleHash mismatch"),
      ]),
    );
  });

  it("rejects release trust records when local npm provenance output drifts", () => {
    const artifacts = writeReadyReleaseTrustArtifacts();
    const report = JSON.parse(readFileSync(artifacts.npmProvenance, "utf8")) as {
      packages: Array<{ version: string }>;
    };
    const firstPackage = report.packages[0];
    if (!firstPackage) {
      throw new Error("Expected npm provenance fixture to include at least one package.");
    }
    firstPackage.version = "9.9.9";
    writeFileSync(artifacts.npmProvenance, `${JSON.stringify(report, null, 2)}\n`);

    const file = `release-trust-${reviewFileSuffix()}-stale-provenance.md`;
    writeReviewRecord(
      file,
      `# Release Trust Review: 0.1.0

Record status: completed external review only

Reviewer: Grace Example
Reviewer affiliation: Independent supply-chain reviewer
Review date: 2026-05-05
Source issue: https://github.com/blencorp/ashlar/issues/101
Repo commit: 0123456789abcdef0123456789abcdef01234567
Release candidate: 0.1.0

## Scope

- Packages reviewed: ashlar@0.1.0, @ashlar/cli@0.1.0, and @ashlar/schemas@0.1.0
- Registry artifacts reviewed: ${artifacts.registryArtifact}
- Workflows reviewed: publish.yml and sigstore.yml
- Trust-root policy reviewed: registry/trust-root.json

## Evidence Artifacts

- npm provenance verification: ${artifacts.npmProvenance}
- Capsule Sigstore verification: ${artifacts.sigstoreVerification}
- Release SBOM: ${artifacts.sbom}
- Release SBOM attestation: ${artifacts.attestation}
- Release trust bundle: ${artifacts.trustBundle}
- Supply-chain incident playbook: docs/security/supply-chain-incident-playbook.md
- GitHub workflow run: https://github.com/blencorp/ashlar/actions/runs/101

## Command Output

\`\`\`text
ashlar release provenance-verify-public --package ashlar@0.1.0 @ashlar/cli@0.1.0 @ashlar/schemas@0.1.0
ashlar release public-trust-verify --registry ${artifacts.registryArtifact}
ashlar release verify-trust-bundle --bundle ${artifacts.trustBundle} --registry ${artifacts.registryArtifact} --sbom ${artifacts.sbom} --attestation ${artifacts.attestation}
\`\`\`

Result: pass

## Findings

- Blocking findings: none
- Non-blocking findings: none
- Follow-up required: attach public artifact URLs to launch notes

## Decision

Decision: pass

Rationale: Public provenance, capsule signing, and trust-bundle verification all passed for the reviewed release candidate.
`,
    );

    const result = runCli(["release", "review-record-check", join("docs", "reviews", file), "--json"]);

    expect(result.status).toBe(1);
    const check = JSON.parse(result.stdout) as {
      records: Array<{ errors: string[]; file: string; status: string }>;
      status: string;
    };
    expect(check.status).toBe("fail");
    expect(check.records[0]?.errors).toEqual(
      expect.arrayContaining([
        expect.stringContaining("referenced npm provenance verification failed"),
        expect.stringContaining("npm provenance verification report includes unreviewed package"),
      ]),
    );
  });

  it("rejects design partner records that point at missing local review artifacts", () => {
    const file = `design-partner-${reviewFileSuffix()}-missing-artifacts.md`;
    writeReviewRecord(
      file,
      `# Design Partner Review: benefits application flow

Record status: completed external review only

Reviewer: Katherine Example
Reviewer affiliation: Public-service delivery consultant
Review date: 2026-05-05
Source issue: https://github.com/blencorp/ashlar/issues/102
Repo commit: 0123456789abcdef0123456789abcdef01234567
Scenario: benefits application flow in a legacy federal project

## Scope

- Product surface reviewed: validator wedge and service-flow proof
- Integration path reviewed: add, audit, search, suggest, and generated guidance
- Existing project or fixture: examples/legacy-federal-project
- User role: agency delivery engineer
- Adoption goal: determine whether validator-first adoption is credible

## Review Inputs

- Demo or branch: codex/standards-evidence-slice
- Commands run: ashlar audit, ashlar search, ashlar suggest, ashlar add
- Screens reviewed: examples/service-flow/benefit-application.pass.html
- Generated AGENTS/DESIGN guidance: .ashlar/AGENTS.md and .ashlar/DESIGN.md
- Validator output: reports/design-partner/missing-validator-output.txt
- Design partner reviewer checklist: reports/missing-design-partner-checklist.md

## Feedback

- What worked: validator-first adoption was understandable
- What was unclear: capsule naming needs launch-copy support
- Integration blockers: procurement proof links need to be easier to find
- Missing primitives: authenticated account settings flow
- Documentation gaps: quickstart should lead with audit-before-add

## Adoption Assessment

- Would replace USWDS directly: yes for a pilot after stable evidence is published
- Would use beside USWDS: yes for validator and update tooling
- Would only use validator/tooling: no
- Would not adopt: no

## Decision

Decision: pass

Rationale: The reviewer found the wedge credible for a public-service pilot after the evidence and trust gates complete.
`,
    );

    const result = runCli(["release", "review-record-check", join("docs", "reviews", file), "--json"]);

    expect(result.status).toBe(1);
    const report = JSON.parse(result.stdout) as {
      records: Array<{ errors: string[]; file: string; status: string }>;
      status: string;
    };
    expect(report.status).toBe("fail");
    expect(report.records[0]?.errors).toEqual(
      expect.arrayContaining([
        "Validator output artifact does not exist: reports/design-partner/missing-validator-output.txt",
        "Design partner reviewer checklist artifact does not exist: reports/missing-design-partner-checklist.md",
      ]),
    );
  });

  it("counts completed external review records after placeholder fields are resolved", () => {
    writeCompletedReviewRecords();

    const result = runCli([
      "release",
      "readiness",
      "--registry",
      "./registry",
      "--min-stable-l0",
      "0",
      "--allow-unverified-public",
      "--allow-local-signatures",
      "--json",
    ]);

    expect(result.status, result.stdout).toBe(0);
    const report = JSON.parse(result.stdout) as {
      checks: Array<{ details: string[]; id: string; status: string; summary: string }>;
      status: string;
      summary: { warnings: number };
    };
    const proof = report.checks.find((check) => check.id === "external-review-proof");
    expect(report.status).toBe("pass");
    expect(proof).toMatchObject({
      id: "external-review-proof",
      status: "pass",
      summary:
        "Completed external review proof records exist for stable evidence, release trust, and design partner review.",
    });
    expect(proof?.details).toEqual(
      expect.arrayContaining([
        expect.stringContaining("docs/reviews/stable-evidence-"),
        expect.stringContaining("docs/reviews/release-trust-"),
        expect.stringContaining("docs/reviews/design-partner-"),
      ]),
    );
    expect(report.summary.warnings).toBeGreaterThanOrEqual(2);
  });

  it("passes direct review-record checking for completed records", () => {
    writeCompletedReviewRecords();

    const result = runCli(["release", "review-record-check", "--json"]);

    expect(result.status, result.stdout).toBe(0);
    const report = JSON.parse(result.stdout) as {
      missing: string[];
      records: Array<{ errors: string[]; file: string; kind: string; status: string }>;
      status: string;
    };
    expect(report.status).toBe("pass");
    expect(report.missing).toEqual([]);
    expect(report.records).toHaveLength(3);
    expect(report.records).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ kind: "stable-evidence", status: "pass" }),
        expect.objectContaining({ kind: "release-trust", status: "pass" }),
        expect.objectContaining({ kind: "design-partner", status: "pass" }),
      ]),
    );
  });

  it("writes a completed release trust review record from explicit reviewer artifacts", () => {
    const output = join(
      repoRoot,
      "docs",
      "reviews",
      `release-trust-${reviewFileSuffix()}-generated.md`,
    );
    createdReviewFiles.push(output);

    const result = runCli(releaseTrustRecordArgs(output));

    expect(result.status, result.stdout).toBe(0);
    expect(result.stdout).toContain("Wrote release-trust review record");
    const record = readFileSync(output, "utf8");
    expect(record).toContain("Record status: completed external review only");
    expect(record).toContain("Decision: pass");
    expect(record).toContain(
      "ashlar release provenance-verify-public --package ashlar@0.1.0 @ashlar/cli@0.1.0 @ashlar/schemas@0.1.0",
    );
    expect(record).toContain("- Release SBOM attestation:");
    expect(record).toContain("ashlar release verify-trust-bundle --bundle");
  });

  it("writes a completed design partner review record from explicit reviewer feedback", () => {
    const output = join(
      repoRoot,
      "docs",
      "reviews",
      `design-partner-${reviewFileSuffix()}-generated.md`,
    );
    createdReviewFiles.push(output);
    const designArtifacts = writeReadyDesignPartnerArtifacts();

    const result = runCli([
      "release",
      "review-record",
      "design-partner",
      "--output",
      output,
      "--reviewer",
      "Katherine Example",
      "--affiliation",
      "Public-service delivery consultant",
      "--review-date",
      "2026-05-05",
      "--source-issue",
      "https://github.com/blencorp/ashlar/issues/102",
      "--repo-commit",
      "0123456789abcdef0123456789abcdef01234567",
      "--rationale",
      "The validator wedge was credible for a pilot after evidence and trust gates complete.",
      "--scenario",
      "benefits application flow in a legacy federal project",
      "--product-surface",
      "validator wedge and service-flow proof",
      "--integration-path",
      "audit, search, suggest, add, and generated guidance",
      "--project",
      "examples/legacy-federal-project",
      "--user-role",
      "agency delivery engineer",
      "--adoption-goal",
      "determine whether validator-first adoption is credible",
      "--demo",
      "codex/standards-evidence-slice",
      "--commands-run",
      "ashlar audit, ashlar search, ashlar suggest, ashlar add",
      "--screens-reviewed",
      designArtifacts.screensReviewed,
      "--guidance",
      ".ashlar/AGENTS.md and .ashlar/DESIGN.md",
      "--validator-output",
      designArtifacts.validatorOutput,
      "--review-checklist",
      designArtifacts.reviewChecklist,
      "--what-worked",
      "validator-first adoption was understandable",
      "--unclear",
      "capsule naming needs launch-copy support",
      "--blocking-findings",
      "procurement proof links need to be easier to find",
      "--missing-primitives",
      "authenticated account settings flow",
      "--docs-gaps",
      "quickstart should lead with audit-before-add",
      "--would-replace-uswds",
      "yes for a pilot after stable evidence is published",
      "--would-use-beside-uswds",
      "yes for validator and update tooling",
      "--would-only-use-validator",
      "no",
      "--would-not-adopt",
      "no",
      "--follow-up",
      "https://github.com/blencorp/ashlar/pull/102",
      "--non-blocking-findings",
      "capsule vocabulary needs clearer launch copy",
    ]);

    expect(result.status, result.stdout).toBe(0);
    expect(result.stdout).toContain("Wrote design-partner review record");
    const record = readFileSync(output, "utf8");
    expect(record).toContain("Record status: completed external review only");
    expect(record).toContain("## Adoption Assessment");
    expect(record).toContain(`- Design partner reviewer checklist: ${designArtifacts.reviewChecklist}`);
    expect(record).toContain(
      "- Would replace USWDS directly: yes for a pilot after stable evidence is published",
    );
    expect(record).toContain("Decision: pass");
    expect(record).not.toMatch(/<[^>\n]+>|TODO|TBD/);
  });

  it("refuses to write review records outside top-level docs/reviews", () => {
    const output = join(scratch, `release-trust-${reviewFileSuffix()}-outside.md`);

    const result = runCli(releaseTrustRecordArgs(output));

    expect(result.status).toBe(1);
    expect(result.stdout).toContain(
      "--output must be a top-level Markdown file under docs/reviews/.",
    );
    expect(existsSync(output)).toBe(false);
  });

  it("refuses to write a stable evidence review record while the reviewer bundle is blocked", () => {
    const reviewDir = join(scratch, "button-stable-review");
    expect(
      runCli([
        "evidence",
        "prepare-stable",
        "button",
        "--registry",
        "./registry",
        "--fixture",
        "registry/components/button/0.0.1/button.html",
        "--output",
        reviewDir,
      ]).status,
    ).toBe(0);

    const output = join(
      repoRoot,
      "docs",
      "reviews",
      `stable-evidence-${reviewFileSuffix()}-blocked.md`,
    );
    createdReviewFiles.push(output);

    const result = runCli([
      "release",
      "review-record",
      "stable-evidence",
      "--output",
      output,
      "--reviewer",
      "Ada Example",
      "--affiliation",
      "Independent accessibility reviewer",
      "--review-date",
      "2026-05-05",
      "--source-issue",
      "https://github.com/blencorp/ashlar/issues/100",
      "--repo-commit",
      "0123456789abcdef0123456789abcdef01234567",
      "--rationale",
      "The reviewer bundle passed stable evidence review.",
      "--component",
      "button",
      "--registry",
      "./registry",
      "--review-dir",
      reviewDir,
      "--publication-receipt",
      "https://example.gov/button-publication-receipt.json",
    ]);

    expect(result.status).toBe(1);
    expect(result.stdout).toContain("Cannot write a completed stable evidence record");
    expect(result.stdout).toContain("review/placeholder");
    expect(existsSync(output)).toBe(false);
  });

  it("passes the local prototype readiness checks when replacement-grade external gates are relaxed", () => {
    const result = runCli([
      "release",
      "readiness",
      "--registry",
      "./registry",
      "--min-stable-l0",
      "0",
      "--allow-unverified-public",
      "--allow-local-signatures",
      "--json",
    ]);

    expect(result.status, result.stdout).toBe(0);
    const report = JSON.parse(result.stdout) as {
      checks: Array<{ id: string; status: string }>;
      status: string;
      summary: { failed: number; warnings: number };
    };

    expect(report.status).toBe("pass");
    expect(report.summary.failed).toBe(0);
    expect(report.summary.warnings).toBeGreaterThanOrEqual(2);
    expect(report.checks).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: "registry-capsules", status: "pass" }),
        expect.objectContaining({ id: "component-coverage", status: "pass" }),
        expect.objectContaining({ id: "bundle-budget", status: "pass" }),
        expect.objectContaining({ id: "ai-eval", status: "pass" }),
        expect.objectContaining({ id: "npm-provenance-local", status: "pass" }),
        expect.objectContaining({ id: "incident-playbook", status: "pass" }),
        expect.objectContaining({ id: "external-review-process", status: "pass" }),
        expect.objectContaining({ id: "external-review-proof", status: "warning" }),
        expect.objectContaining({ id: "npm-provenance-public", status: "warning" }),
        expect.objectContaining({ id: "sigstore-workflow-local", status: "pass" }),
        expect.objectContaining({ id: "sigstore-public-trust", status: "warning" }),
      ]),
    );
  });

  it("writes and verifies a release trust bundle", () => {
    const sbomPath = join(scratch, "ashlar-sbom.spdx.json");
    const attestationPath = join(scratch, "ashlar-sbom.attestation.json");
    const trustBundlePath = join(scratch, "ashlar-trust-bundle.json");
    const trustChecklistPath = join(scratch, "ashlar-release-trust-checklist.md");

    expect(runCli(["release", "sbom", "--output", sbomPath]).status).toBe(0);
    expect(
      runCli(["release", "attest", "--subject", sbomPath, "--output", attestationPath]).status,
    ).toBe(0);

    const writeBundle = runCli([
      "release",
      "trust-bundle",
      "--registry",
      "./registry",
      "--sbom",
      sbomPath,
      "--attestation",
      attestationPath,
      "--output",
      trustBundlePath,
      "--checklist",
      trustChecklistPath,
    ]);

    expect(writeBundle.status, writeBundle.stdout).toBe(0);
    expect(writeBundle.stdout).toContain(`Wrote release trust bundle to ${trustBundlePath}`);
    expect(writeBundle.stdout).toContain(
      `Wrote release trust review checklist to ${trustChecklistPath}`,
    );

    const trustBundle = JSON.parse(readFileSync(trustBundlePath, "utf8")) as {
      $schema: string;
      artifacts: Array<{ name: string; sha256: string; size: number; type: string }>;
      registry: {
        capsuleCount: number;
        indexHash: string;
        trustRootHash: string;
      };
      verification: { npmProvenance: string; sigstore: string };
    };
    expect(trustBundle.$schema).toBe("https://ashlar.dev/schemas/release-trust-bundle.schema.json");
    expect(trustBundle.registry.indexHash).toMatch(/^sha256:[a-f0-9]{64}$/);
    expect(trustBundle.registry.trustRootHash).toMatch(/^sha256:[a-f0-9]{64}$/);
    expect(trustBundle.registry.capsuleCount).toBeGreaterThanOrEqual(7);
    expect(trustBundle.artifacts).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          name: "ashlar-sbom.spdx.json",
          sha256: expect.stringMatching(/^sha256:[a-f0-9]{64}$/),
          size: expect.any(Number),
          type: "spdx-sbom",
        }),
        expect.objectContaining({
          name: "ashlar-sbom.attestation.json",
          type: "release-artifact-attestation",
        }),
      ]),
    );
    expect(trustBundle.verification).toMatchObject({
      npmProvenance: "not-included",
      sigstore: "not-included",
    });
    const checklist = readFileSync(trustChecklistPath, "utf8");
    expect(checklist).toContain("# Release Trust Reviewer Checklist");
    expect(checklist).toContain("ashlar release provenance-verify-public");
    expect(checklist).toContain("ashlar release public-trust-verify");
    expect(checklist).toContain("ashlar release verify-trust-bundle");
    expect(checklist).toContain("does not replace npm provenance");
    expect(checklist).toContain("Replacement-grade language waits");

    const verifyBundle = runCli([
      "release",
      "verify-trust-bundle",
      "--bundle",
      trustBundlePath,
      "--registry",
      "./registry",
      "--sbom",
      sbomPath,
      "--attestation",
      attestationPath,
    ]);
    expect(verifyBundle.status, verifyBundle.stdout).toBe(0);
    expect(verifyBundle.stdout).toContain("Release trust bundle verified");
  });

  it("rejects a stale release trust bundle after artifact tampering", () => {
    const sbomPath = join(scratch, "ashlar-sbom.spdx.json");
    const attestationPath = join(scratch, "ashlar-sbom.attestation.json");
    const trustBundlePath = join(scratch, "ashlar-trust-bundle.json");

    expect(runCli(["release", "sbom", "--output", sbomPath]).status).toBe(0);
    expect(
      runCli(["release", "attest", "--subject", sbomPath, "--output", attestationPath]).status,
    ).toBe(0);
    expect(
      runCli([
        "release",
        "trust-bundle",
        "--registry",
        "./registry",
        "--sbom",
        sbomPath,
        "--attestation",
        attestationPath,
        "--output",
        trustBundlePath,
      ]).status,
    ).toBe(0);

    writeFileSync(sbomPath, `${readFileSync(sbomPath, "utf8").trim()}\n `);

    const result = runCli([
      "release",
      "verify-trust-bundle",
      "--bundle",
      trustBundlePath,
      "--registry",
      "./registry",
      "--sbom",
      sbomPath,
      "--attestation",
      attestationPath,
    ]);

    expect(result.status).toBe(1);
    expect(result.stdout).toContain("Release trust bundle verification failed");
    expect(result.stdout).toContain("artifact sha256 mismatch");
  });
});
