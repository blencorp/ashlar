import { describeErrors, validate } from "./schema-validate.js";
import { getComponent } from "./registry.js";
import type { ManualEvidenceArtifact } from "./evidence-review.js";

type ManualTemplateInput = {
  component: string;
  cwd: string;
  registryPath: string;
  reviewedAt?: Date;
};

function today(value: Date): string {
  return value.toISOString().slice(0, 10);
}

export function buildManualEvidenceTemplate(input: ManualTemplateInput): ManualEvidenceArtifact {
  const detail = getComponent(input.cwd, input.component, input.registryPath);
  const reviewedAt = input.reviewedAt ?? new Date();

  const artifact: ManualEvidenceArtifact = {
    $schema: "https://ashlar.dev/schemas/manual-evidence.schema.json",
    schemaVersion: "1.0",
    component: detail.name,
    version: detail.version,
    reviewedAt: reviewedAt.toISOString(),
    reviewer: "TODO: reviewer name or email",
    wcag: (detail.evidence.wcag ?? []).map((item) => ({
      criterion: item.criterion,
      evidence: `TODO: document manual evidence for WCAG ${item.criterion} (${item.title}).`,
      notes: "TODO: replace this placeholder with observed behavior and reviewer notes.",
      status: "known-issue",
    })),
    baselineTests: (detail.evidence.baselineTests ?? []).map((item) => ({
      source: item.source,
      test: item.test,
      evidence: `TODO: document manual evidence for ICT Baseline test: ${item.test}.`,
      status: "known-issue",
    })),
    manualTests: [
      {
        tech: "Keyboard",
        browser: "TODO: browser",
        os: "TODO: operating system",
        date: today(reviewedAt),
        tester: "TODO: tester name or email",
        result: "blocked",
        evidence: "TODO: path or URL to keyboard transcript or test notes.",
        notes:
          "TODO: replace this blocked placeholder after real Tab, Shift+Tab, Enter, Space, focus visibility, and disabled-state review.",
      },
      {
        tech: "TODO: screen reader (NVDA, JAWS, VoiceOver, Narrator, or equivalent)",
        browser: "TODO: browser",
        os: "TODO: operating system",
        date: today(reviewedAt),
        tester: "TODO: tester name or email",
        result: "blocked",
        evidence: "TODO: path or URL to screen-reader transcript.",
        notes:
          "TODO: replace this blocked placeholder after real screen-reader name, role, state, and activation review.",
      },
    ],
    knownLimitations: [],
  };

  const result = validate("manualEvidence", artifact);
  if (!result.ok) {
    throw new Error(`Generated manual evidence template is invalid:\n${describeErrors(result)}`);
  }

  return artifact;
}
