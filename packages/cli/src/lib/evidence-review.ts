import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describeErrors, validate } from "./schema-validate.js";
import { getComponent, type EvidencePacket } from "./registry.js";

type ManualEvidenceStatus = "pass" | "fail" | "not-applicable" | "known-issue";
type ManualTestResult = "pass" | "pass-with-note" | "fail" | "blocked";

type ManualWcagReview = {
  criterion: string;
  status: ManualEvidenceStatus;
  evidence: string;
  notes?: string;
};

type ManualBaselineReview = {
  source: string;
  test: string;
  status: ManualEvidenceStatus;
  evidence: string;
};

export type ManualEvidenceArtifact = {
  $schema: "https://ashlar.dev/schemas/manual-evidence.schema.json";
  schemaVersion: "1.0";
  component: string;
  version: string;
  reviewedAt: string;
  reviewer: string;
  wcag?: ManualWcagReview[];
  baselineTests?: ManualBaselineReview[];
  manualTests: Array<{
    tech: string;
    version?: string;
    browser: string;
    browserVersion?: string;
    os: string;
    date: string;
    tester: string;
    result: ManualTestResult;
    evidence?: string;
    notes?: string;
  }>;
  knownLimitations: unknown[];
};

type ApplyManualReviewInput = {
  component: string;
  cwd: string;
  evidencePath: string;
  manualPath: string;
  registryPath: string;
};

function readEvidencePacket(path: string): EvidencePacket {
  const evidence = JSON.parse(readFileSync(path, "utf8")) as EvidencePacket;
  const result = validate("evidence", evidence);
  if (!result.ok) {
    throw new Error(`Invalid Ashlar evidence packet at ${path}:\n${describeErrors(result)}`);
  }

  return evidence;
}

function readManualEvidence(path: string): ManualEvidenceArtifact {
  const artifact = JSON.parse(readFileSync(path, "utf8")) as ManualEvidenceArtifact;
  const result = validate("manualEvidence", artifact);
  if (!result.ok) {
    throw new Error(`Invalid Ashlar manual evidence artifact at ${path}:\n${describeErrors(result)}`);
  }

  return artifact;
}

function reviewDate(value: string): string {
  return value.slice(0, 10);
}

function mergeWcag(
  existing: NonNullable<EvidencePacket["wcag"]>,
  updates: ManualWcagReview[] | undefined,
): NonNullable<EvidencePacket["wcag"]> {
  if (!updates || updates.length === 0) {
    return existing;
  }

  return existing.map((item) => {
    const update = updates.find((candidate) => candidate.criterion === item.criterion);
    if (!update) {
      return item;
    }

    return {
      ...item,
      evidence: update.evidence,
      notes: update.notes ?? item.notes,
      status: update.status,
    };
  });
}

function assertKnownWcagMappings(
  existing: NonNullable<EvidencePacket["wcag"]>,
  updates: ManualWcagReview[] | undefined,
): void {
  if (!updates) {
    return;
  }

  const known = new Set(existing.map((item) => item.criterion));
  const unknown = updates.filter((item) => !known.has(item.criterion));
  if (unknown.length > 0) {
    throw new Error(
      `Manual review references unknown WCAG mapping(s): ${unknown
        .map((item) => item.criterion)
        .join(", ")}`,
    );
  }
}

function baselineKey(item: { source: string; test: string }): string {
  return `${item.source}\u0000${item.test}`;
}

function assertKnownBaselineMappings(
  existing: NonNullable<EvidencePacket["baselineTests"]>,
  updates: ManualBaselineReview[] | undefined,
): void {
  if (!updates) {
    return;
  }

  const known = new Set(existing.map(baselineKey));
  const unknown = updates.filter((item) => !known.has(baselineKey(item)));
  if (unknown.length > 0) {
    throw new Error(
      `Manual review references unknown ICT Baseline mapping(s): ${unknown
        .map((item) => `${item.source} / ${item.test}`)
        .join(", ")}`,
    );
  }
}

function mergeBaselineTests(
  existing: NonNullable<EvidencePacket["baselineTests"]>,
  updates: ManualBaselineReview[] | undefined,
): NonNullable<EvidencePacket["baselineTests"]> {
  if (!updates || updates.length === 0) {
    return existing;
  }

  return existing.map((item) => {
    const update = updates.find((candidate) => baselineKey(candidate) === baselineKey(item));
    if (!update) {
      return item;
    }

    return {
      ...item,
      evidence: update.evidence,
      status: update.status,
    };
  });
}

function hasFailingManualTest(artifact: ManualEvidenceArtifact): boolean {
  return artifact.manualTests.some((item) => item.result === "fail" || item.result === "blocked");
}

function hasPassingManualTest(artifact: ManualEvidenceArtifact): boolean {
  return artifact.manualTests.some((item) => item.result.startsWith("pass"));
}

function applyManualStatus(
  currentStatus: EvidencePacket["accessibilityStatus"],
  artifact: ManualEvidenceArtifact,
): EvidencePacket["accessibilityStatus"] {
  if (hasFailingManualTest(artifact)) {
    return "known-issue";
  }

  if (hasPassingManualTest(artifact)) {
    return currentStatus === "stable-evidence" ? "stable-evidence" : "manual-tested";
  }

  return currentStatus;
}

export function applyManualReview(input: ApplyManualReviewInput): EvidencePacket {
  const detail = getComponent(input.cwd, input.component, input.registryPath);
  const evidencePath = resolve(input.cwd, input.evidencePath);
  const manualPath = resolve(input.cwd, input.manualPath);
  const evidence = readEvidencePacket(evidencePath);
  const artifact = readManualEvidence(manualPath);

  for (const value of [evidence, artifact]) {
    if (value.component !== detail.name) {
      throw new Error(`Evidence component is ${value.component}, expected ${detail.name}.`);
    }
    if (value.version !== detail.version) {
      throw new Error(`Evidence version is ${value.version}, expected ${detail.version}.`);
    }
  }

  const next = JSON.parse(JSON.stringify(evidence)) as EvidencePacket;
  const wcag = next.wcag ?? [];
  const baselineTests = next.baselineTests ?? [];
  assertKnownWcagMappings(wcag, artifact.wcag);
  assertKnownBaselineMappings(baselineTests, artifact.baselineTests);

  next.wcag = mergeWcag(wcag, artifact.wcag);
  next.baselineTests = mergeBaselineTests(baselineTests, artifact.baselineTests);
  next.manualTests = [...(next.manualTests ?? []), ...artifact.manualTests];
  next.knownLimitations = artifact.knownLimitations;
  next.lastReviewed = reviewDate(artifact.reviewedAt);
  next.reviewer = artifact.reviewer;
  next.accessibilityStatus = applyManualStatus(next.accessibilityStatus, artifact);

  const result = validate("evidence", next);
  if (!result.ok) {
    throw new Error(`Reviewed evidence packet is invalid:\n${describeErrors(result)}`);
  }

  return next;
}
