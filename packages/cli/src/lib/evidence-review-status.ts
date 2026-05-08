import { createHash } from "node:crypto";
import { existsSync, readFileSync, statSync } from "node:fs";
import { isAbsolute, join, relative, resolve } from "node:path";
import { checkEvidence } from "./evidence-check.js";
import { applyManualReview, type ManualEvidenceArtifact } from "./evidence-review.js";
import {
  readManualTranscriptArtifact,
  type ManualTranscriptArtifact,
} from "./evidence-transcript.js";
import { getComponent, type EvidencePacket } from "./registry.js";
import { describeErrors, validate, type SchemaName } from "./schema-validate.js";

type ReviewStatusInput = {
  component: string;
  cwd: string;
  registryPath: string;
  reviewDir: string;
};

export type StableEvidenceReviewBlocker = {
  file: string;
  message: string;
  rule: string;
};

export type StableEvidenceReviewStatusReport = {
  $schema: string;
  schemaVersion: string;
  component: string;
  version: string;
  status: "ready" | "blocked";
  reviewDir: string;
  files: {
    manifest: string;
    proposedEvidence: string;
    manualEvidence: string;
    keyboardTranscript: string;
    reviewHarness: string;
    screenReaderTranscript: string;
    reviewedEvidence: string;
    stableEvidence: string;
  };
  blockers: StableEvidenceReviewBlocker[];
  nextCommands: string[];
};

type ReviewManifestRole =
  | "automated-evidence"
  | "proposed-evidence"
  | "manual-evidence-worksheet"
  | "keyboard-transcript-worksheet"
  | "screen-reader-transcript-worksheet"
  | "reviewer-harness"
  | "github-issue-body"
  | "reviewer-checklist"
  | "reviewer-readme";

type StableEvidenceReviewManifest = {
  component: string;
  version: string;
  stableClaim: false;
  requiresManualReview: true;
  files: Array<{
    bytes: number;
    mutableByReviewer: boolean;
    path: string;
    role: ReviewManifestRole;
    sha256: string;
  }>;
};

function cwdRelative(cwd: string, path: string): string {
  const value = relative(cwd, path).replaceAll("\\", "/");
  return value.startsWith("../") ? path : value;
}

function localAshlarCommand(args: string): string {
  return `pnpm ashlar ${args}`;
}

function resolveFromCwd(cwd: string, path: string): string {
  return isAbsolute(path) ? path : resolve(cwd, path);
}

function fileSet(cwd: string, component: string, reviewDir: string) {
  const absoluteReviewDir = resolveFromCwd(cwd, reviewDir);

  return {
    reviewDir: absoluteReviewDir,
    automatedEvidence: join(absoluteReviewDir, `${component}-automated-evidence.json`),
    issue: join(absoluteReviewDir, "ISSUE.md"),
    manifest: join(absoluteReviewDir, "MANIFEST.json"),
    proposedEvidence: join(absoluteReviewDir, `${component}.evidence.proposed.json`),
    manualEvidence: join(absoluteReviewDir, `${component}-manual-review.json`),
    keyboardTranscript: join(absoluteReviewDir, `${component}-keyboard-transcript.json`),
    reviewHarness: join(absoluteReviewDir, "REVIEW.html"),
    reviewChecklist: join(absoluteReviewDir, "REVIEWER_CHECKLIST.md"),
    screenReaderTranscript: join(absoluteReviewDir, `${component}-screen-reader-transcript.json`),
    reviewedEvidence: join(absoluteReviewDir, `${component}.evidence.reviewed.json`),
    stableEvidence: join(absoluteReviewDir, `${component}.evidence.stable.json`),
  };
}

function sha256File(path: string): string {
  return createHash("sha256").update(readFileSync(path)).digest("hex");
}

function manifestExpectedFiles(
  paths: ReturnType<typeof fileSet>,
): Array<{ mutableByReviewer: boolean; path: string; role: ReviewManifestRole }> {
  return [
    { role: "automated-evidence", path: paths.automatedEvidence, mutableByReviewer: false },
    { role: "proposed-evidence", path: paths.proposedEvidence, mutableByReviewer: false },
    { role: "manual-evidence-worksheet", path: paths.manualEvidence, mutableByReviewer: true },
    {
      role: "keyboard-transcript-worksheet",
      path: paths.keyboardTranscript,
      mutableByReviewer: true,
    },
    {
      role: "screen-reader-transcript-worksheet",
      path: paths.screenReaderTranscript,
      mutableByReviewer: true,
    },
    { role: "reviewer-harness", path: paths.reviewHarness, mutableByReviewer: false },
    { role: "github-issue-body", path: paths.issue, mutableByReviewer: false },
    {
      role: "reviewer-checklist",
      path: paths.reviewChecklist,
      mutableByReviewer: false,
    },
    { role: "reviewer-readme", path: join(paths.reviewDir, "README.md"), mutableByReviewer: false },
  ];
}

function hasPlaceholderText(value: unknown): boolean {
  const normalized = (JSON.stringify(value) ?? "").toLowerCase();
  return /\b(todo|tbd|placeholder)\b/.test(normalized);
}

function isPassingResult(value: string | undefined): boolean {
  return value === "pass" || value === "pass-with-note";
}

function pushMissingFile(
  blockers: StableEvidenceReviewBlocker[],
  file: string,
  label: string,
): boolean {
  if (existsSync(file)) {
    return false;
  }

  blockers.push({
    file,
    rule: "review/file-missing",
    message: `${label} is missing.`,
  });
  return true;
}

function readJson(path: string): unknown {
  return JSON.parse(readFileSync(path, "utf8"));
}

function readValidated<T>(
  path: string,
  schema: SchemaName,
  label: string,
  blockers: StableEvidenceReviewBlocker[],
): T | undefined {
  if (pushMissingFile(blockers, path, label)) {
    return undefined;
  }

  let value: unknown;
  try {
    value = readJson(path);
  } catch (error) {
    blockers.push({
      file: path,
      rule: "review/json",
      message: `${label} is not valid JSON: ${error instanceof Error ? error.message : String(error)}`,
    });
    return undefined;
  }

  const result = validate(schema, value);
  if (!result.ok) {
    blockers.push({
      file: path,
      rule: `review/${schema}-schema`,
      message: `${label} does not match ${schema}: ${describeErrors(result)}`,
    });
    return undefined;
  }

  return value as T;
}

function checkReviewManifest(
  manifest: StableEvidenceReviewManifest | undefined,
  input: ReviewStatusInput,
  version: string,
  paths: ReturnType<typeof fileSet>,
  blockers: StableEvidenceReviewBlocker[],
): void {
  if (!manifest) {
    return;
  }

  if (manifest.component !== input.component || manifest.version !== version) {
    blockers.push({
      file: paths.manifest,
      rule: "review/manifest-component",
      message: `Review manifest describes ${manifest.component}@${manifest.version}, expected ${input.component}@${version}.`,
    });
  }

  const byRole = new Map<ReviewManifestRole, StableEvidenceReviewManifest["files"][number]>();
  for (const entry of manifest.files) {
    if (byRole.has(entry.role)) {
      blockers.push({
        file: paths.manifest,
        rule: "review/manifest-duplicate-role",
        message: `Review manifest contains more than one ${entry.role} entry.`,
      });
      continue;
    }
    byRole.set(entry.role, entry);
  }

  for (const expected of manifestExpectedFiles(paths)) {
    const entry = byRole.get(expected.role);
    if (!entry) {
      blockers.push({
        file: paths.manifest,
        rule: "review/manifest-missing-role",
        message: `Review manifest is missing ${expected.role}.`,
      });
      continue;
    }

    if (entry.mutableByReviewer !== expected.mutableByReviewer) {
      blockers.push({
        file: paths.manifest,
        rule: "review/manifest-mutability",
        message: `Review manifest marks ${expected.role} mutableByReviewer=${entry.mutableByReviewer}, expected ${expected.mutableByReviewer}.`,
      });
    }

    const actualPath = resolveFromCwd(input.cwd, entry.path);
    if (actualPath !== expected.path) {
      blockers.push({
        file: paths.manifest,
        rule: "review/manifest-path",
        message: `Review manifest ${expected.role} path is ${entry.path}, expected ${cwdRelative(
          input.cwd,
          expected.path,
        )}.`,
      });
      continue;
    }

    if (pushMissingFile(blockers, actualPath, `${expected.role} manifest file`)) {
      continue;
    }

    if (!expected.mutableByReviewer) {
      const size = statSync(actualPath).size;
      const digest = sha256File(actualPath);
      if (size !== entry.bytes || digest !== entry.sha256) {
        blockers.push({
          file: actualPath,
          rule: "review/manifest-hash",
          message: `${expected.role} no longer matches MANIFEST.json: expected ${entry.bytes} bytes / ${entry.sha256}, found ${size} bytes / ${digest}.`,
        });
      }
    }
  }
}

function checkManualEvidence(
  manual: ManualEvidenceArtifact | undefined,
  path: string,
  blockers: StableEvidenceReviewBlocker[],
): void {
  if (!manual) {
    return;
  }

  if (hasPlaceholderText(manual)) {
    blockers.push({
      file: path,
      rule: "review/placeholder",
      message: "Manual evidence still contains TODO, TBD, or placeholder text.",
    });
  }

  const blockedManualTests = manual.manualTests.filter((test) =>
    ["blocked", "fail"].includes(test.result),
  );
  if (blockedManualTests.length > 0) {
    blockers.push({
      file: path,
      rule: "review/manual-test-result",
      message: `Manual evidence has ${blockedManualTests.length} blocked or failing manual test(s).`,
    });
  }

  const weakWcag = (manual.wcag ?? []).filter((item) =>
    ["fail", "known-issue"].includes(item.status),
  );
  if (weakWcag.length > 0) {
    blockers.push({
      file: path,
      rule: "review/wcag-status",
      message: `Manual evidence has ${weakWcag.length} WCAG mapping(s) still marked fail or known-issue.`,
    });
  }

  const weakBaseline = (manual.baselineTests ?? []).filter((item) =>
    ["fail", "known-issue"].includes(item.status),
  );
  if (weakBaseline.length > 0) {
    blockers.push({
      file: path,
      rule: "review/baseline-status",
      message: `Manual evidence has ${weakBaseline.length} ICT Baseline mapping(s) still marked fail or known-issue.`,
    });
  }
}

function checkTranscript(
  transcript: ManualTranscriptArtifact | undefined,
  path: string,
  blockers: StableEvidenceReviewBlocker[],
): void {
  if (!transcript) {
    return;
  }

  if (!isPassingResult(transcript.result)) {
    blockers.push({
      file: path,
      rule: `${transcript.transcriptType}-transcript/result`,
      message: `Manual ${transcript.transcriptType} transcript result is ${transcript.result}, expected pass or pass-with-note.`,
    });
  }

  const blockedSteps = transcript.steps.filter((step) => !isPassingResult(step.result));
  if (blockedSteps.length > 0) {
    blockers.push({
      file: path,
      rule: `${transcript.transcriptType}-transcript/steps`,
      message: `Manual ${transcript.transcriptType} transcript has ${blockedSteps.length} step(s) that are not passing.`,
    });
  }

  if (hasPlaceholderText(transcript)) {
    blockers.push({
      file: path,
      rule: `${transcript.transcriptType}-transcript/placeholder`,
      message: `Manual ${transcript.transcriptType} transcript still contains TODO, TBD, or placeholder text.`,
    });
  }
}

function readTranscript(
  input: ReviewStatusInput,
  path: string,
  expectedType: "keyboard" | "screen-reader",
  blockers: StableEvidenceReviewBlocker[],
): ManualTranscriptArtifact | undefined {
  if (pushMissingFile(blockers, path, `${expectedType} transcript`)) {
    return undefined;
  }

  try {
    return readManualTranscriptArtifact({
      component: input.component,
      cwd: input.cwd,
      expectedType,
      path,
      registryPath: input.registryPath,
    });
  } catch (error) {
    blockers.push({
      file: path,
      rule: `${expectedType}-transcript/schema`,
      message: error instanceof Error ? error.message : String(error),
    });
    return undefined;
  }
}

function simulatedStableEvidence(evidence: EvidencePacket): EvidencePacket {
  const next = JSON.parse(JSON.stringify(evidence)) as EvidencePacket;
  next.stability = "stable";
  next.accessibilityStatus = "stable-evidence";
  return next;
}

export function buildStableEvidenceReviewStatus(
  input: ReviewStatusInput,
): StableEvidenceReviewStatusReport {
  const detail = getComponent(input.cwd, input.component, input.registryPath);
  const paths = fileSet(input.cwd, input.component, input.reviewDir);
  const blockers: StableEvidenceReviewBlocker[] = [];

  const manifest = readValidated<StableEvidenceReviewManifest>(
    paths.manifest,
    "stableEvidenceReviewManifest",
    "stable evidence review manifest",
    blockers,
  );
  checkReviewManifest(manifest, input, detail.version, paths, blockers);

  const proposed = readValidated<EvidencePacket>(
    paths.proposedEvidence,
    "evidence",
    "proposed evidence packet",
    blockers,
  );
  const manual = readValidated<ManualEvidenceArtifact>(
    paths.manualEvidence,
    "manualEvidence",
    "manual evidence worksheet",
    blockers,
  );
  const keyboardTranscript = readTranscript(input, paths.keyboardTranscript, "keyboard", blockers);
  const screenReaderTranscript = readTranscript(
    input,
    paths.screenReaderTranscript,
    "screen-reader",
    blockers,
  );

  checkManualEvidence(manual, paths.manualEvidence, blockers);
  checkTranscript(keyboardTranscript, paths.keyboardTranscript, blockers);
  checkTranscript(screenReaderTranscript, paths.screenReaderTranscript, blockers);

  if (proposed && manual) {
    try {
      const reviewed = applyManualReview({
        component: input.component,
        cwd: input.cwd,
        evidencePath: paths.proposedEvidence,
        manualPath: paths.manualEvidence,
        registryPath: input.registryPath,
      });
      const stable = simulatedStableEvidence(reviewed);
      const validation = validate("evidence", stable);

      if (!validation.ok) {
        blockers.push({
          file: paths.stableEvidence,
          rule: "review/stable-schema",
          message: `Simulated stable evidence is invalid: ${describeErrors(validation)}`,
        });
      } else {
        const result = checkEvidence([{ ...detail, evidence: stable }], {
          evidenceRoot: input.cwd,
        });
        const hasPlaceholderBlocker = blockers.some((blocker) =>
          blocker.rule.includes("placeholder"),
        );
        for (const finding of result.findings) {
          if (finding.rule === "evidence/stable-evidence-references" && hasPlaceholderBlocker) {
            continue;
          }
          blockers.push({
            file: paths.stableEvidence,
            rule: finding.rule,
            message: finding.message,
          });
        }
      }
    } catch (error) {
      blockers.push({
        file: paths.manualEvidence,
        rule: "review/apply",
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }

  const files = {
    manifest: cwdRelative(input.cwd, paths.manifest),
    proposedEvidence: cwdRelative(input.cwd, paths.proposedEvidence),
    manualEvidence: cwdRelative(input.cwd, paths.manualEvidence),
    keyboardTranscript: cwdRelative(input.cwd, paths.keyboardTranscript),
    reviewHarness: cwdRelative(input.cwd, paths.reviewHarness),
    screenReaderTranscript: cwdRelative(input.cwd, paths.screenReaderTranscript),
    reviewedEvidence: cwdRelative(input.cwd, paths.reviewedEvidence),
    stableEvidence: cwdRelative(input.cwd, paths.stableEvidence),
  };

  return {
    $schema: "https://ashlar.dev/schemas/stable-evidence-review-status.schema.json",
    schemaVersion: "1.0",
    component: detail.name,
    version: detail.version,
    status: blockers.length === 0 ? "ready" : "blocked",
    reviewDir: cwdRelative(input.cwd, paths.reviewDir),
    files,
    blockers: blockers.map((blocker) => ({
      ...blocker,
      file: cwdRelative(input.cwd, blocker.file),
    })),
    nextCommands: [
      localAshlarCommand(
        `evidence transcript-validate ${detail.name} --registry ${input.registryPath} --type keyboard --transcript ${files.keyboardTranscript}`,
      ),
      localAshlarCommand(
        `evidence transcript-validate ${detail.name} --registry ${input.registryPath} --type screen-reader --transcript ${files.screenReaderTranscript}`,
      ),
      localAshlarCommand(
        `evidence review-status ${detail.name} --registry ${input.registryPath} --review-dir ${cwdRelative(
          input.cwd,
          paths.reviewDir,
        )}`,
      ),
      localAshlarCommand(
        `evidence finalize-stable ${detail.name} --registry ${input.registryPath} --review-dir ${cwdRelative(
          input.cwd,
          paths.reviewDir,
        )}`,
      ),
      localAshlarCommand(
        `evidence ${detail.name} --check --registry ${input.registryPath} --evidence-file ${files.stableEvidence}`,
      ),
    ],
  };
}
