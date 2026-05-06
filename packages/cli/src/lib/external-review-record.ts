import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { basename, dirname, isAbsolute, relative, resolve, sep } from "node:path";
import { readCapsuleManifest } from "./capsule.js";
import { buildStableEvidenceReviewStatus } from "./evidence-review-status.js";
import { sha256File } from "./hash.js";
import { getComponent, listComponents } from "./registry.js";
import { verifyReleaseTrustBundle } from "./release-trust-bundle.js";
import type { PublicCapsuleTrustCapsule, PublicCapsuleTrustResult } from "./release-public-trust.js";
import type { PublicProvenanceVerification } from "./release-provenance.js";

export type ExternalReviewRecordKind = "design-partner" | "release-trust" | "stable-evidence";

export type ExternalReviewRecordDefinition = {
  kind: ExternalReviewRecordKind;
  label: string;
  prefix: string;
  requiredFields: string[];
  requiredSnippets: string[];
};

export const externalReviewRecordDefinitions: ExternalReviewRecordDefinition[] = [
  {
    kind: "stable-evidence",
    label: "stable evidence review",
    prefix: "stable-evidence-",
    requiredFields: [
      "Reviewer",
      "Reviewer affiliation",
      "Review date",
      "Source issue",
      "Repo commit",
      "Registry path",
      "Evidence bundle path",
      "Reviewer harness",
      "Manual review",
      "Keyboard transcript",
      "Screen-reader transcript",
      "Publication receipt",
      "Review status command",
      "Result",
    ],
    requiredSnippets: ["ashlar evidence review-status"],
  },
  {
    kind: "release-trust",
    label: "release trust review",
    prefix: "release-trust-",
    requiredFields: [
      "Reviewer",
      "Reviewer affiliation",
      "Review date",
      "Source issue",
      "Repo commit",
      "Release candidate",
      "Registry artifacts reviewed",
      "npm provenance verification",
      "Capsule Sigstore verification",
      "Release SBOM",
      "Release SBOM attestation",
      "Release trust bundle",
      "GitHub workflow run",
      "Result",
    ],
    requiredSnippets: [
      "ashlar release provenance-verify-public",
      "ashlar release public-trust-verify",
      "ashlar release verify-trust-bundle",
    ],
  },
  {
    kind: "design-partner",
    label: "design partner review",
    prefix: "design-partner-",
    requiredFields: [
      "Reviewer",
      "Reviewer affiliation",
      "Review date",
      "Source issue",
      "Repo commit",
      "Scenario",
      "Product surface reviewed",
      "Commands run",
      "Screens reviewed",
      "Validator output",
      "Design partner reviewer checklist",
      "Would replace USWDS directly",
      "Would use beside USWDS",
      "Would only use validator/tooling",
      "Would not adopt",
    ],
    requiredSnippets: ["## Feedback", "## Adoption Assessment"],
  },
];

type CommonReviewRecordInput = {
  affiliation: string;
  blockingFindings?: string;
  cwd: string;
  followUp?: string;
  nonBlockingFindings?: string;
  output: string;
  rationale: string;
  repoCommit: string;
  reviewDate: string;
  reviewer: string;
  sourceIssue: string;
};

export type StableEvidenceReviewRecordInput = CommonReviewRecordInput & {
  component: string;
  kind: "stable-evidence";
  publicationReceipt: string;
  registryPath: string;
  reviewDir: string;
};

export type ReleaseTrustReviewRecordInput = CommonReviewRecordInput & {
  attestation: string;
  kind: "release-trust";
  npmProvenance: string;
  packages: string[];
  registryArtifact: string;
  releaseCandidate: string;
  sbom: string;
  sigstoreVerification: string;
  trustBundle: string;
  workflowRun: string;
};

export type DesignPartnerReviewRecordInput = CommonReviewRecordInput & {
  adoptionGoal: string;
  commandsRun: string;
  demo: string;
  docsGaps: string;
  guidance: string;
  integrationPath: string;
  kind: "design-partner";
  missingPrimitives: string;
  productSurface: string;
  project: string;
  reviewChecklist: string;
  scenario: string;
  screensReviewed: string;
  unclear: string;
  userRole: string;
  validatorOutput: string;
  whatWorked: string;
  wouldNotAdopt: string;
  wouldOnlyUseValidator: string;
  wouldReplaceUswds: string;
  wouldUseBesideUswds: string;
};

export type ExternalReviewRecordInput =
  | DesignPartnerReviewRecordInput
  | ReleaseTrustReviewRecordInput
  | StableEvidenceReviewRecordInput;

export type ExternalReviewRecordResult = {
  kind: ExternalReviewRecordKind;
  output: string;
};

export type DesignPartnerReviewChecklistInput = {
  legacyFixture: string;
  output: string;
  registryPath: string;
  serviceFlowFixture: string;
  task: string;
};

export type ExternalReviewRecordCheck = {
  errors: string[];
  file: string;
  kind?: ExternalReviewRecordKind;
  status: "pass" | "fail";
};

export type ExternalReviewRecordCheckReport = {
  missing: string[];
  records: ExternalReviewRecordCheck[];
  status: "pass" | "fail";
};

export function externalReviewRecordDefinition(
  kind: ExternalReviewRecordKind,
): ExternalReviewRecordDefinition {
  const definition = externalReviewRecordDefinitions.find((item) => item.kind === kind);
  if (!definition) {
    throw new Error(`Unknown external review record kind: ${kind}`);
  }
  return definition;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function externalReviewFieldValue(content: string, field: string): string | undefined {
  const pattern = new RegExp(`^\\s*(?:-\\s*)?${escapeRegExp(field)}:\\s*(.*)$`, "im");
  return content.match(pattern)?.[1]?.trim();
}

function hasPlaceholderValue(value: string): boolean {
  return (
    value.length === 0 ||
    /<[^>\n]+>/.test(value) ||
    /\b(?:TODO|TBD)\b/i.test(value) ||
    /^pass\s*\|\s*blocked$/i.test(value)
  );
}

export function externalReviewRecordErrors(
  definition: ExternalReviewRecordDefinition,
  content: string,
): string[] {
  const errors: string[] = [];

  if (/<[^>\n]+>/.test(content)) {
    errors.push("contains angle-bracket placeholder text");
  }
  if (/\b(?:TODO|TBD)\b/i.test(content)) {
    errors.push("contains TODO/TBD placeholder text");
  }
  if (!/^Record status:\s*completed external review only\s*$/im.test(content)) {
    errors.push("missing completed external review status line");
  }
  if (!/^Decision:\s*pass\s*$/im.test(content)) {
    errors.push("decision must be pass; blocked or undecided reviews do not count as proof");
  }

  for (const field of definition.requiredFields) {
    const value = externalReviewFieldValue(content, field);
    if (value === undefined) {
      errors.push(`missing required field: ${field}`);
    } else if (hasPlaceholderValue(value)) {
      errors.push(`required field is blank or placeholder: ${field}`);
    }
  }

  for (const snippet of definition.requiredSnippets) {
    if (!content.includes(snippet)) {
      errors.push(`missing required evidence reference: ${snippet}`);
    }
  }

  return errors;
}

function stableEvidenceArtifactErrors(cwd: string, content: string): string[] {
  const component = externalReviewFieldValue(content, "Component");
  const registryPath = externalReviewFieldValue(content, "Registry path");
  const reviewDir = externalReviewFieldValue(content, "Evidence bundle path");
  const publicationReceipt = externalReviewFieldValue(content, "Publication receipt");
  const errors: string[] = [];

  if (hasPlaceholderValue(component ?? "")) {
    errors.push("stable evidence record is missing a concrete Component field");
  }
  if (hasPlaceholderValue(registryPath ?? "")) {
    errors.push("stable evidence record is missing a concrete Registry path field");
  }
  if (hasPlaceholderValue(reviewDir ?? "")) {
    errors.push("stable evidence record is missing a concrete Evidence bundle path field");
  }
  if (hasPlaceholderValue(publicationReceipt ?? "")) {
    errors.push("stable evidence record is missing a concrete Publication receipt field");
  }
  if (errors.length > 0 || !component || !registryPath || !reviewDir) {
    return errors;
  }

  try {
    const report = buildStableEvidenceReviewStatus({
      component,
      cwd,
      registryPath,
      reviewDir,
    });
    if (report.status !== "ready") {
      errors.push(
        `referenced stable evidence bundle is ${report.status}; run ashlar evidence review-status ${component} --registry ${registryPath} --review-dir ${reviewDir}`,
      );
      for (const blocker of report.blockers.slice(0, 5)) {
        errors.push(`${blocker.file} ${blocker.rule}: ${blocker.message}`);
      }
      if (report.blockers.length > 5) {
        errors.push(`${report.blockers.length - 5} additional stable evidence blocker(s) omitted`);
      }
    }
  } catch (error) {
    errors.push(
      `referenced stable evidence bundle cannot be validated: ${
        error instanceof Error ? error.message : String(error)
      }`,
    );
  }

  errors.push(...stableEvidencePublicationReceiptErrors(cwd, content));

  return errors;
}

type EvidencePublicationReceipt = {
  accessibilityStatus: string;
  capsuleHash: string;
  capsuleManifest: string;
  component: string;
  evidenceFile: string;
  evidenceReferences: Array<{
    reference: string;
    sha256: string;
    source: string;
    target: string;
  }>;
  previousCapsuleHash: string;
  registryIndex: string;
  registryPath: string;
  signatureKeyId: string;
  sourceEvidence: string;
  stability: string;
  tool: "ashlar evidence publish";
  version: string;
};

function evidencePublicationReceipt(value: unknown): EvidencePublicationReceipt | undefined {
  if (
    !isObject(value) ||
    value.tool !== "ashlar evidence publish" ||
    typeof value.component !== "string" ||
    typeof value.version !== "string" ||
    typeof value.registryPath !== "string" ||
    typeof value.sourceEvidence !== "string" ||
    typeof value.evidenceFile !== "string" ||
    typeof value.capsuleManifest !== "string" ||
    typeof value.registryIndex !== "string" ||
    typeof value.previousCapsuleHash !== "string" ||
    typeof value.capsuleHash !== "string" ||
    typeof value.signatureKeyId !== "string" ||
    typeof value.stability !== "string" ||
    typeof value.accessibilityStatus !== "string" ||
    !Array.isArray(value.evidenceReferences)
  ) {
    return undefined;
  }
  if (
    !value.evidenceReferences.every(
      (item) =>
        isObject(item) &&
        typeof item.reference === "string" &&
        typeof item.source === "string" &&
        typeof item.target === "string" &&
        typeof item.sha256 === "string",
    )
  ) {
    return undefined;
  }
  return value as EvidencePublicationReceipt;
}

function stableEvidencePublicationReceiptErrors(cwd: string, content: string): string[] {
  const component = externalReviewFieldValue(content, "Component");
  const registryPath = externalReviewFieldValue(content, "Registry path");
  const receiptValue = externalReviewFieldValue(content, "Publication receipt");
  if (
    hasPlaceholderValue(component ?? "") ||
    hasPlaceholderValue(registryPath ?? "") ||
    hasPlaceholderValue(receiptValue ?? "")
  ) {
    return [];
  }

  const receiptPath = localArtifactPath(cwd, receiptValue ?? "");
  if (receiptPath === undefined) {
    return [];
  }
  if (!receiptPath) {
    return ["Publication receipt must be an HTTPS URL or local artifact path"];
  }
  if (!existsSync(receiptPath)) {
    return [`Publication receipt artifact does not exist: ${receiptValue}`];
  }

  let receipt: EvidencePublicationReceipt;
  try {
    const parsed = JSON.parse(readFileSync(receiptPath, "utf8")) as unknown;
    const next = evidencePublicationReceipt(parsed);
    if (!next) {
      return [
        "Publication receipt artifact must be JSON output from ashlar evidence publish --output",
      ];
    }
    receipt = next;
  } catch (error) {
    return [
      `Publication receipt artifact cannot be parsed as evidence publish JSON: ${
        error instanceof Error ? error.message : String(error)
      }`,
    ];
  }

  const errors: string[] = [];
  if (receipt.component !== component) {
    errors.push(`Publication receipt component mismatch: expected ${component}, found ${receipt.component}`);
  }
  if (resolve(cwd, receipt.registryPath) !== resolve(cwd, registryPath ?? "")) {
    errors.push(
      `Publication receipt registry path mismatch: expected ${registryPath}, found ${receipt.registryPath}`,
    );
  }
  if (receipt.stability !== "stable" || receipt.accessibilityStatus !== "stable-evidence") {
    errors.push("Publication receipt must publish stable/stable-evidence.");
  }
  if (receipt.previousCapsuleHash === receipt.capsuleHash) {
    errors.push("Publication receipt did not change the capsule hash.");
  }

  try {
    const detail = getComponent(cwd, component ?? "", registryPath);
    const manifest = readCapsuleManifest(detail.directory, detail.name);
    if (detail.evidence.stability !== "stable" || detail.evidence.accessibilityStatus !== "stable-evidence") {
      errors.push(`${detail.name}@${detail.version}: registry evidence is not stable-evidence`);
    }
    if (detail.version !== receipt.version) {
      errors.push(`Publication receipt version mismatch: expected ${detail.version}, found ${receipt.version}`);
    }
    if (detail.capsuleHash !== receipt.capsuleHash) {
      errors.push(
        `Publication receipt capsule hash does not match registry index: expected ${detail.capsuleHash}, found ${receipt.capsuleHash}`,
      );
    }
    if (manifest.capsule_hash !== receipt.capsuleHash) {
      errors.push(
        `Publication receipt capsule hash does not match capsule manifest: expected ${manifest.capsule_hash}, found ${receipt.capsuleHash}`,
      );
    }
    if (manifest.signature?.keyId !== receipt.signatureKeyId) {
      errors.push(
        `Publication receipt signature key mismatch: expected ${manifest.signature?.keyId ?? "none"}, found ${receipt.signatureKeyId}`,
      );
    }
    for (const reference of receipt.evidenceReferences) {
      const target = resolve(reference.target);
      if (!existsSync(target)) {
        errors.push(`Publication receipt evidence reference target is missing: ${reference.target}`);
        continue;
      }
      const currentHash = sha256File(target);
      if (currentHash !== reference.sha256) {
        errors.push(
          `Publication receipt evidence reference hash mismatch for ${reference.reference}: expected ${reference.sha256}, found ${currentHash}`,
        );
      }
    }
  } catch (error) {
    errors.push(
      `Publication receipt registry state cannot be validated: ${
        error instanceof Error ? error.message : String(error)
      }`,
    );
  }

  return errors;
}

function isHttpsUrl(value: string): boolean {
  try {
    return new URL(value).protocol === "https:";
  } catch {
    return false;
  }
}

function localArtifactPath(cwd: string, value: string): string | undefined {
  if (isHttpsUrl(value)) {
    return undefined;
  }
  if (/\s/.test(value.trim())) {
    return "";
  }
  return isAbsolute(value) ? value : resolve(cwd, value);
}

function reviewArtifactReferenceErrors(cwd: string, content: string, field: string): string[] {
  const value = externalReviewFieldValue(content, field);
  if (hasPlaceholderValue(value ?? "")) {
    return [];
  }
  const artifactPath = localArtifactPath(cwd, value ?? "");
  if (artifactPath === undefined) {
    return [];
  }
  if (!artifactPath) {
    return [`${field} must be an HTTPS URL or local artifact path`];
  }
  return existsSync(artifactPath) ? [] : [`${field} artifact does not exist: ${value}`];
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function publicTrustCapsule(value: unknown): PublicCapsuleTrustCapsule | undefined {
  if (!isObject(value)) {
    return undefined;
  }
  const capsule = value as Record<keyof PublicCapsuleTrustCapsule, unknown>;
  return typeof capsule.component === "string" &&
    typeof capsule.version === "string" &&
    typeof capsule.bundle === "string" &&
    typeof capsule.bundleHash === "string" &&
    typeof capsule.certificateIdentity === "string" &&
    typeof capsule.certificateOidcIssuer === "string" &&
    typeof capsule.signedPayloadHash === "string"
    ? (value as PublicCapsuleTrustCapsule)
    : undefined;
}

function publicTrustReport(value: unknown): PublicCapsuleTrustResult | undefined {
  if (!isObject(value) || !Array.isArray(value.capsules) || !Array.isArray(value.errors)) {
    return undefined;
  }
  if (!value.capsules.every((item) => publicTrustCapsule(item))) {
    return undefined;
  }
  if (!value.errors.every((item) => typeof item === "string")) {
    return undefined;
  }
  return value as PublicCapsuleTrustResult;
}

function publicTrustVerificationArtifactErrors(input: {
  cwd: string;
  registryPath: string;
  sigstoreVerificationPath: string;
}): string[] {
  let report: PublicCapsuleTrustResult;
  try {
    const parsed = JSON.parse(readFileSync(input.sigstoreVerificationPath, "utf8")) as unknown;
    const next = publicTrustReport(parsed);
    if (!next) {
      return [
        "Capsule Sigstore verification artifact must be JSON output from ashlar release public-trust-verify --json",
      ];
    }
    report = next;
  } catch (error) {
    return [
      `Capsule Sigstore verification artifact cannot be parsed as public-trust JSON: ${
        error instanceof Error ? error.message : String(error)
      }`,
    ];
  }

  const errors = report.errors.map(
    (error) => `Capsule Sigstore verification report contains error: ${error}`,
  );
  const expected = listComponents(input.cwd, input.registryPath).map((component) =>
    getComponent(input.cwd, component.name, input.registryPath),
  );
  const expectedKeys = new Set(expected.map((component) => `${component.name}@${component.version}`));
  const actualKeys = new Set(
    report.capsules.map((capsule) => `${capsule.component}@${capsule.version}`),
  );

  for (const capsule of expected) {
    const key = `${capsule.name}@${capsule.version}`;
    const manifest = readCapsuleManifest(capsule.directory, capsule.name);
    const actual = report.capsules.find(
      (item) => item.component === capsule.name && item.version === capsule.version,
    );
    if (!actual) {
      errors.push(`Capsule Sigstore verification report is missing ${key}`);
      continue;
    }
    if (!manifest.sigstore) {
      errors.push(`${key}: registry manifest is missing Sigstore bundle metadata`);
      continue;
    }

    for (const field of [
      "bundle",
      "bundleHash",
      "certificateIdentity",
      "certificateOidcIssuer",
      "signedPayloadHash",
    ] as const) {
      if (actual[field] !== manifest.sigstore[field]) {
        errors.push(
          `${key}: Sigstore ${field} mismatch: expected ${manifest.sigstore[field]}, found ${actual[field]}`,
        );
      }
    }

    const bundlePath = resolve(capsule.directory, manifest.sigstore.bundle);
    if (!bundlePath.startsWith(`${resolve(capsule.directory)}${sep}`)) {
      errors.push(`${key}: Sigstore bundle path escapes capsule directory`);
    } else if (!existsSync(bundlePath)) {
      errors.push(`${key}: Sigstore bundle artifact is missing: ${manifest.sigstore.bundle}`);
    } else {
      const currentBundleHash = sha256File(bundlePath);
      if (currentBundleHash !== manifest.sigstore.bundleHash) {
        errors.push(
          `${key}: Sigstore bundle hash mismatch: expected ${manifest.sigstore.bundleHash}, found ${currentBundleHash}`,
        );
      }
    }
  }

  for (const key of actualKeys) {
    if (!expectedKeys.has(key)) {
      errors.push(`Capsule Sigstore verification report includes unknown capsule ${key}`);
    }
  }

  return errors;
}

function publicProvenanceReport(value: unknown): PublicProvenanceVerification | undefined {
  if (!isObject(value) || !Array.isArray(value.packages) || !Array.isArray(value.errors)) {
    return undefined;
  }
  if (
    !value.packages.every(
      (item) =>
        isObject(item) && typeof item.name === "string" && typeof item.version === "string",
    )
  ) {
    return undefined;
  }
  if (!value.errors.every((item) => typeof item === "string")) {
    return undefined;
  }
  return value as PublicProvenanceVerification;
}

function reviewedPackageSpecs(content: string): string[] {
  const value = externalReviewFieldValue(content, "Packages reviewed") ?? "";
  return Array.from(value.matchAll(/(?:ashlar|@ashlar\/(?:cli|schemas))@[0-9A-Za-z.+-]+/g))
    .map((match) => match[0])
    .sort();
}

function publicProvenanceVerificationArtifactErrors(input: {
  npmProvenancePath: string;
  packageSpecs: string[];
}): string[] {
  let report: PublicProvenanceVerification;
  try {
    const parsed = JSON.parse(readFileSync(input.npmProvenancePath, "utf8")) as unknown;
    const next = publicProvenanceReport(parsed);
    if (!next) {
      return [
        "npm provenance verification artifact must be JSON output from ashlar release provenance-verify-public --json",
      ];
    }
    report = next;
  } catch (error) {
    return [
      `npm provenance verification artifact cannot be parsed as provenance JSON: ${
        error instanceof Error ? error.message : String(error)
      }`,
    ];
  }

  const errors = report.errors.map(
    (error) => `npm provenance verification report contains error: ${error}`,
  );
  const expectedSpecs = [...input.packageSpecs].sort();
  const actualSpecs = report.packages
    .map((releasePackage) => `${releasePackage.name}@${releasePackage.version}`)
    .sort();

  if (expectedSpecs.length === 0) {
    errors.push("release trust record does not list concrete Ashlar package specs");
  }
  for (const spec of expectedSpecs) {
    if (!actualSpecs.includes(spec)) {
      errors.push(`npm provenance verification report is missing ${spec}`);
    }
  }
  for (const spec of actualSpecs) {
    if (!expectedSpecs.includes(spec)) {
      errors.push(`npm provenance verification report includes unreviewed package ${spec}`);
    }
  }

  return errors;
}

function releaseTrustArtifactErrors(cwd: string, content: string): string[] {
  const errors = [
    ...reviewArtifactReferenceErrors(cwd, content, "Registry artifacts reviewed"),
    ...reviewArtifactReferenceErrors(cwd, content, "npm provenance verification"),
    ...reviewArtifactReferenceErrors(cwd, content, "Capsule Sigstore verification"),
    ...reviewArtifactReferenceErrors(cwd, content, "Release SBOM"),
    ...reviewArtifactReferenceErrors(cwd, content, "Release SBOM attestation"),
    ...reviewArtifactReferenceErrors(cwd, content, "Release trust bundle"),
  ];

  const registry = externalReviewFieldValue(content, "Registry artifacts reviewed");
  const sbom = externalReviewFieldValue(content, "Release SBOM");
  const attestation = externalReviewFieldValue(content, "Release SBOM attestation");
  const trustBundle = externalReviewFieldValue(content, "Release trust bundle");
  const sigstoreVerification = externalReviewFieldValue(content, "Capsule Sigstore verification");
  const npmProvenance = externalReviewFieldValue(content, "npm provenance verification");
  if ([registry, sbom, attestation, trustBundle].some((value) => hasPlaceholderValue(value ?? ""))) {
    return errors;
  }

  const registryPath = localArtifactPath(cwd, registry ?? "");
  const sbomPath = localArtifactPath(cwd, sbom ?? "");
  const attestationPath = localArtifactPath(cwd, attestation ?? "");
  const trustBundlePath = localArtifactPath(cwd, trustBundle ?? "");
  const sigstoreVerificationPath = localArtifactPath(cwd, sigstoreVerification ?? "");
  const npmProvenancePath = localArtifactPath(cwd, npmProvenance ?? "");
  if (!registryPath || !sbomPath || !attestationPath || !trustBundlePath) {
    return errors;
  }

  const verification = verifyReleaseTrustBundle({
    attestationPath,
    bundlePath: trustBundlePath,
    cwd,
    registryPath,
    sbomPath,
  });
  errors.push(
    ...verification.map((error) => `referenced release trust bundle verification failed: ${error}`),
  );
  if (sigstoreVerificationPath && existsSync(sigstoreVerificationPath)) {
    errors.push(
      ...publicTrustVerificationArtifactErrors({
        cwd,
        registryPath,
        sigstoreVerificationPath,
      }).map((error) => `referenced capsule Sigstore verification failed: ${error}`),
    );
  }
  if (npmProvenancePath && existsSync(npmProvenancePath)) {
    errors.push(
      ...publicProvenanceVerificationArtifactErrors({
        npmProvenancePath,
        packageSpecs: reviewedPackageSpecs(content),
      }).map((error) => `referenced npm provenance verification failed: ${error}`),
    );
  }

  return errors;
}

function designPartnerArtifactErrors(cwd: string, content: string): string[] {
  return [
    ...reviewArtifactReferenceErrors(cwd, content, "Screens reviewed"),
    ...reviewArtifactReferenceErrors(cwd, content, "Validator output"),
    ...reviewArtifactReferenceErrors(cwd, content, "Design partner reviewer checklist"),
  ];
}

function reviewRecordArtifactErrors(
  cwd: string,
  definition: ExternalReviewRecordDefinition,
  content: string,
): string[] {
  if (definition.kind === "stable-evidence") {
    return stableEvidenceArtifactErrors(cwd, content);
  }
  if (definition.kind === "release-trust") {
    return releaseTrustArtifactErrors(cwd, content);
  }
  if (definition.kind === "design-partner") {
    return designPartnerArtifactErrors(cwd, content);
  }
  return [];
}

function requireCompletedValue(value: string | undefined, name: string): string {
  const next = value?.trim() ?? "";
  if (hasPlaceholderValue(next)) {
    throw new Error(`${name} is required and cannot be blank, TODO/TBD, or placeholder text.`);
  }
  return next;
}

function requireCommon(input: CommonReviewRecordInput): CommonReviewRecordInput {
  const reviewDate = requireCompletedValue(input.reviewDate, "--review-date");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(reviewDate)) {
    throw new Error("--review-date must use YYYY-MM-DD.");
  }

  return {
    ...input,
    affiliation: requireCompletedValue(input.affiliation, "--affiliation"),
    rationale: requireCompletedValue(input.rationale, "--rationale"),
    repoCommit: requireCompletedValue(input.repoCommit, "--repo-commit"),
    reviewDate,
    reviewer: requireCompletedValue(input.reviewer, "--reviewer"),
    sourceIssue: requireCompletedValue(input.sourceIssue, "--source-issue"),
  };
}

function optionalFinding(value: string | undefined): string {
  return value && value.trim().length > 0 ? value.trim() : "none";
}

function outputPath(input: ExternalReviewRecordInput): string {
  const definition = externalReviewRecordDefinition(input.kind);
  const output = resolve(input.cwd, input.output);
  const recordsDir = resolve(input.cwd, "docs/reviews");
  const relativeToRecords = relative(recordsDir, output);
  if (
    relativeToRecords.startsWith("..") ||
    relativeToRecords.startsWith("/") ||
    relativeToRecords.includes("/")
  ) {
    throw new Error("--output must be a top-level Markdown file under docs/reviews/.");
  }

  const file = basename(output);
  if (!file.startsWith(definition.prefix) || !file.endsWith(".md")) {
    throw new Error(
      `--output must be a Markdown file whose name starts with ${definition.prefix}.`,
    );
  }

  return output;
}

function recordsDir(cwd: string): string {
  return resolve(cwd, "docs/reviews");
}

function relativeReviewRecordPath(cwd: string, path: string): string {
  const output = resolve(cwd, path);
  const relativeToRecords = relative(recordsDir(cwd), output);
  if (
    relativeToRecords.startsWith("..") ||
    relativeToRecords.startsWith("/") ||
    relativeToRecords.includes("/")
  ) {
    throw new Error(`${path} must be a top-level Markdown file under docs/reviews/.`);
  }
  if (!relativeToRecords.endsWith(".md") || relativeToRecords === "README.md") {
    throw new Error(`${path} must be a review Markdown file under docs/reviews/.`);
  }
  return relativeToRecords;
}

function definitionForFile(file: string): ExternalReviewRecordDefinition | undefined {
  return externalReviewRecordDefinitions.find((definition) => file.startsWith(definition.prefix));
}

function defaultReviewRecordFiles(cwd: string): string[] {
  const directory = recordsDir(cwd);
  if (!existsSync(directory)) {
    return [];
  }
  return readdirSync(directory)
    .filter((file) => file.endsWith(".md") && file !== "README.md")
    .sort();
}

export function checkExternalReviewRecords(input: {
  cwd: string;
  files?: string[];
}): ExternalReviewRecordCheckReport {
  const explicit = (input.files ?? []).length > 0;
  const files = explicit
    ? (input.files ?? []).map((file) => relativeReviewRecordPath(input.cwd, file))
    : defaultReviewRecordFiles(input.cwd);

  const records: ExternalReviewRecordCheck[] = files.map((file) => {
    const definition = definitionForFile(file);
    const path = resolve(recordsDir(input.cwd), file);
    const errors: string[] = [];
    if (!definition) {
      errors.push("filename does not match a known review record prefix");
    }
    if (!existsSync(path)) {
      errors.push("record file does not exist");
    }
    if (definition && existsSync(path)) {
      const content = readFileSync(path, "utf8");
      errors.push(...externalReviewRecordErrors(definition, content));
      errors.push(...reviewRecordArtifactErrors(input.cwd, definition, content));
    }

    return {
      errors,
      file: `docs/reviews/${file}`,
      kind: definition?.kind,
      status: errors.length === 0 ? "pass" : "fail",
    };
  });

  const missing = explicit
    ? []
    : externalReviewRecordDefinitions
        .filter(
          (definition) =>
            !records.some((record) => record.kind === definition.kind && record.status === "pass"),
        )
        .map((definition) => `missing completed ${definition.label} (${definition.prefix}*.md)`);

  return {
    missing,
    records,
    status:
      missing.length === 0 && records.every((record) => record.status === "pass") ? "pass" : "fail",
  };
}

function commonHeader(input: CommonReviewRecordInput, title: string): string {
  return `# ${title}

Record status: completed external review only

Reviewer: ${input.reviewer}
Reviewer affiliation: ${input.affiliation}
Review date: ${input.reviewDate}
Source issue: ${input.sourceIssue}
Repo commit: ${input.repoCommit}
`;
}

function findings(input: CommonReviewRecordInput): string {
  return `## Findings

- Blocking findings: ${optionalFinding(input.blockingFindings)}
- Non-blocking findings: ${optionalFinding(input.nonBlockingFindings)}
- Follow-up required: ${optionalFinding(input.followUp)}
`;
}

function decision(input: CommonReviewRecordInput): string {
  return `## Decision

Decision: pass

Rationale: ${input.rationale}
`;
}

function stableEvidenceRecord(input: StableEvidenceReviewRecordInput): string {
  const common = requireCommon(input);
  const component = requireCompletedValue(input.component, "--component");
  const registryPath = requireCompletedValue(input.registryPath, "--registry");
  const reviewDir = requireCompletedValue(input.reviewDir, "--review-dir");
  const publicationReceipt = requireCompletedValue(
    input.publicationReceipt,
    "--publication-receipt",
  );
  const report = buildStableEvidenceReviewStatus({
    component,
    cwd: input.cwd,
    registryPath,
    reviewDir,
  });

  if (report.status !== "ready") {
    const blockers = report.blockers.map((blocker) => `${blocker.file} ${blocker.rule}: ${blocker.message}`);
    throw new Error(
      `Cannot write a completed stable evidence record while review-status is ${report.status}:\n${blockers
        .map((blocker) => `  - ${blocker}`)
        .join("\n")}`,
    );
  }

  return `${commonHeader(common, `Stable Evidence Review: ${report.component}@${report.version}`)}
Registry path: ${registryPath}
Evidence bundle path: ${report.reviewDir}

## Scope

- Component: ${report.component}
- Capsule version: ${report.version}
- Stability target: stable-evidence
- Supported interaction modes: keyboard, screen reader, pointer
- Browsers and assistive technology reviewed: recorded in ${report.files.keyboardTranscript} and ${report.files.screenReaderTranscript}

## Evidence Artifacts

- Automated evidence: ${report.reviewDir}/${report.component}-automated-evidence.json
- Reviewer harness: ${report.files.reviewHarness}
- Manual review: ${report.files.manualEvidence}
- Keyboard transcript: ${report.files.keyboardTranscript}
- Screen-reader transcript: ${report.files.screenReaderTranscript}
- Proposed evidence packet: ${report.files.proposedEvidence}
- Publication receipt: ${publicationReceipt}
- Review status command: ashlar evidence review-status ${report.component} --registry ${registryPath} --review-dir ${report.reviewDir}

## Command Output

\`\`\`text
ashlar evidence review-status ${report.component} --registry ${registryPath} --review-dir ${report.reviewDir}
\`\`\`

Result: pass

${findings(common)}
${decision(common)}
## Links

- GitHub issue: ${common.sourceIssue}
- Pull request: ${optionalFinding(input.followUp)}
- CI run: ${optionalFinding(input.nonBlockingFindings)}
`;
}

function releaseTrustRecord(input: ReleaseTrustReviewRecordInput): string {
  const common = requireCommon(input);
  const releaseCandidate = requireCompletedValue(input.releaseCandidate, "--release-candidate");
  const packages = input.packages.map((item) => requireCompletedValue(item, "--package"));
  if (packages.length === 0) {
    throw new Error("--package is required for release-trust records.");
  }
  const registryArtifact = requireCompletedValue(input.registryArtifact, "--registry-artifact");
  const sbom = requireCompletedValue(input.sbom, "--sbom");
  const attestation = requireCompletedValue(input.attestation, "--attestation");
  const trustBundle = requireCompletedValue(input.trustBundle, "--trust-bundle");
  const workflowRun = requireCompletedValue(input.workflowRun, "--workflow-run");

  return `${commonHeader(common, `Release Trust Review: ${releaseCandidate}`)}
Release candidate: ${releaseCandidate}

## Scope

- Packages reviewed: ${packages.join(", ")}
- Registry artifacts reviewed: ${registryArtifact}
- Workflows reviewed: publish.yml and sigstore.yml
- Trust-root policy reviewed: registry/trust-root.json

## Evidence Artifacts

- npm provenance verification: ${requireCompletedValue(input.npmProvenance, "--npm-provenance")}
- Capsule Sigstore verification: ${requireCompletedValue(input.sigstoreVerification, "--sigstore-verification")}
- Release SBOM: ${sbom}
- Release SBOM attestation: ${attestation}
- Release trust bundle: ${trustBundle}
- Supply-chain incident playbook: docs/security/supply-chain-incident-playbook.md
- GitHub workflow run: ${workflowRun}

## Command Output

\`\`\`text
ashlar release provenance-verify-public --package ${packages.join(" ")}
ashlar release provenance-verify-public --package ${packages.join(" ")} --json > ${requireCompletedValue(input.npmProvenance, "--npm-provenance")}
ashlar release public-trust-verify --registry ${registryArtifact} --json > ${requireCompletedValue(input.sigstoreVerification, "--sigstore-verification")}
ashlar release verify-trust-bundle --bundle ${trustBundle} --registry ${registryArtifact} --sbom ${sbom} --attestation ${attestation}
\`\`\`

Result: pass

${findings(common)}
${decision(common)}
## Links

- GitHub issue: ${common.sourceIssue}
- Pull request: ${optionalFinding(input.followUp)}
- Published npm package: ${packages.join(", ")}
- Workflow artifact: ${workflowRun}
`;
}

function designPartnerRecord(input: DesignPartnerReviewRecordInput): string {
  const common = requireCommon(input);
  const scenario = requireCompletedValue(input.scenario, "--scenario");

  return `${commonHeader(common, `Design Partner Review: ${scenario}`)}
Scenario: ${scenario}

## Scope

- Product surface reviewed: ${requireCompletedValue(input.productSurface, "--product-surface")}
- Integration path reviewed: ${requireCompletedValue(input.integrationPath, "--integration-path")}
- Existing project or fixture: ${requireCompletedValue(input.project, "--project")}
- User role: ${requireCompletedValue(input.userRole, "--user-role")}
- Adoption goal: ${requireCompletedValue(input.adoptionGoal, "--adoption-goal")}

## Review Inputs

- Demo or branch: ${requireCompletedValue(input.demo, "--demo")}
- Commands run: ${requireCompletedValue(input.commandsRun, "--commands-run")}
- Screens reviewed: ${requireCompletedValue(input.screensReviewed, "--screens-reviewed")}
- Generated AGENTS/DESIGN guidance: ${requireCompletedValue(input.guidance, "--guidance")}
- Validator output: ${requireCompletedValue(input.validatorOutput, "--validator-output")}
- Design partner reviewer checklist: ${requireCompletedValue(input.reviewChecklist, "--review-checklist")}

## Feedback

- What worked: ${requireCompletedValue(input.whatWorked, "--what-worked")}
- What was unclear: ${requireCompletedValue(input.unclear, "--unclear")}
- Integration blockers: ${requireCompletedValue(input.blockingFindings, "--blocking-findings")}
- Missing primitives: ${requireCompletedValue(input.missingPrimitives, "--missing-primitives")}
- Documentation gaps: ${requireCompletedValue(input.docsGaps, "--docs-gaps")}

## Adoption Assessment

- Would replace USWDS directly: ${requireCompletedValue(input.wouldReplaceUswds, "--would-replace-uswds")}
- Would use beside USWDS: ${requireCompletedValue(input.wouldUseBesideUswds, "--would-use-beside-uswds")}
- Would only use validator/tooling: ${requireCompletedValue(input.wouldOnlyUseValidator, "--would-only-use-validator")}
- Would not adopt: ${requireCompletedValue(input.wouldNotAdopt, "--would-not-adopt")}

${findings(common)}
${decision(common)}
## Links

- GitHub issue: ${common.sourceIssue}
- Pull request: ${optionalFinding(input.followUp)}
- Demo recording or screenshots: ${requireCompletedValue(input.screensReviewed, "--screens-reviewed")}
`;
}

export function writeExternalReviewRecord(
  input: ExternalReviewRecordInput,
): ExternalReviewRecordResult {
  const output = outputPath(input);
  const definition = externalReviewRecordDefinition(input.kind);
  const content =
    input.kind === "stable-evidence"
      ? stableEvidenceRecord(input)
      : input.kind === "release-trust"
        ? releaseTrustRecord(input)
        : designPartnerRecord(input);
  const errors = externalReviewRecordErrors(definition, content);
  errors.push(...reviewRecordArtifactErrors(input.cwd, definition, content));
  if (errors.length > 0) {
    throw new Error(`Generated external review record is incomplete:\n${errors.map((error) => `  - ${error}`).join("\n")}`);
  }

  mkdirSync(dirname(output), { recursive: true });
  writeFileSync(output, `${content.trimEnd()}\n`);

  return {
    kind: input.kind,
    output,
  };
}

export function buildDesignPartnerReviewChecklist(
  input: Omit<DesignPartnerReviewChecklistInput, "output">,
): string {
  return `# Design Partner Reviewer Checklist

Scenario: validator wedge and first service-flow proof

This checklist is for an external design partner reviewing Ashlar's product direction. It is not a completed review record and does not count toward release readiness until a real \`design-partner-*.md\` record is written under \`docs/reviews/\`.

## Review Commands

\`\`\`bash
ashlar audit --policy federal --explain ${input.legacyFixture}
ashlar audit --policy all --registry ${input.registryPath} ${input.serviceFlowFixture}
ashlar search "benefits application" --registry ${input.registryPath}
ashlar suggest "${input.task}"
ashlar view button --registry ${input.registryPath}
\`\`\`

## Product Questions

- [ ] The reviewer can explain "evidence-backed source UI for public services" without maintainer coaching.
- [ ] The reviewer understands a capsule as source plus evidence, policy mappings, audit rules, update metadata, and provenance.
- [ ] The reviewer sees a credible first adoption path that does not require replacing the whole UI stack.
- [ ] The reviewer can identify when they would use Ashlar beside USWDS versus instead of USWDS.
- [ ] The reviewer names at least one concrete blocker before stronger replacement claims.

## DX Checks

- [ ] Validator-only adoption feels useful on an existing non-Ashlar project.
- [ ] Service-flow proof feels closer to real public-service work than a component gallery.
- [ ] Search, suggest, and view output make capsule discovery understandable.
- [ ] AGENTS.md / DESIGN.md guidance would help a coding agent avoid invalid UI.
- [ ] The reviewer can tell which parts are prototype, experimental, or not reviewed.

## Claim Boundary

- [ ] The reviewer does not interpret Ashlar as official USWDS, GSA, NDS, or federal guidance.
- [ ] The review does not claim application-level 508 compliance.
- [ ] The review records actual reactions and blockers, not intended positioning.
- [ ] Replacement-grade language waits for strict \`ashlar release readiness\` and completed external review records.
`;
}

export function writeDesignPartnerReviewChecklist(
  input: DesignPartnerReviewChecklistInput,
): string {
  const checklist = buildDesignPartnerReviewChecklist(input);
  mkdirSync(dirname(input.output), { recursive: true });
  writeFileSync(input.output, checklist);
  return checklist;
}
