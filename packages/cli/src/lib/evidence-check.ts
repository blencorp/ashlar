import { existsSync, readFileSync } from "node:fs";
import { isAbsolute, resolve } from "node:path";
import type { RegistryComponent } from "./registry.js";
import { describeErrors, validate } from "./schema-validate.js";

export type EvidenceCheckFinding = {
  component: string;
  version: string;
  level: "error" | "warning";
  rule: string;
  message: string;
};

export type EvidenceCheckResult = {
  components: number;
  findings: EvidenceCheckFinding[];
};

export type EvidenceCheckOptions = {
  evidenceRoot?: string | ((component: RegistryComponent) => string);
};

const passingStatuses = new Set(["pass", "not-applicable"]);

type ReferenceItem = {
  external: boolean;
  path: string;
};

function finding(
  component: RegistryComponent,
  rule: string,
  message: string,
): EvidenceCheckFinding {
  return {
    component: component.name,
    version: component.version,
    level: "error",
    rule,
    message,
  };
}

function claimsStableEvidence(component: RegistryComponent): boolean {
  return (
    component.evidence.stability === "stable" ||
    component.evidence.accessibilityStatus === "stable-evidence"
  );
}

function isObjectWithKeys(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && Object.keys(value).length > 0;
}

function isScreenReaderTech(value: unknown): boolean {
  if (typeof value !== "string") {
    return false;
  }

  const normalized = value.toLowerCase();
  return [
    "nvda",
    "jaws",
    "voiceover",
    "voice over",
    "talkback",
    "talk back",
    "narrator",
    "orca",
    "chromevox",
    "chrome vox",
    "screen reader",
    "screen-reader",
  ].some((name) => normalized.includes(name));
}

function isKeyboardTech(value: unknown): boolean {
  if (typeof value !== "string") {
    return false;
  }

  const normalized = value.toLowerCase();
  return normalized.includes("keyboard");
}

function hasActionableEvidenceReference(value: unknown): boolean {
  if (typeof value !== "string") {
    return false;
  }

  const normalized = value.trim().toLowerCase();
  return (
    normalized.length > 0 &&
    !normalized.startsWith("todo") &&
    !normalized.startsWith("tbd") &&
    !normalized.includes("placeholder")
  );
}

function isExternalReference(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "https:";
  } catch {
    return false;
  }
}

function referenceTokens(value: unknown): string[] {
  return referenceItems(value)
    .filter((item) => !item.external)
    .map((item) => item.path);
}

function referenceItems(value: unknown): ReferenceItem[] {
  if (typeof value !== "string") {
    return [];
  }

  return value
    .trim()
    .split(/\s+/)
    .map((token) => token.replace(/[),.;]+$/g, ""))
    .map((token) => token.split("#")[0] ?? "")
    .filter((token) => token.length > 0)
    .map((token) => ({
      external: isExternalReference(token),
      path: token,
    }));
}

function missingEvidenceReferences(component: RegistryComponent, evidenceRoot: string): string[] {
  const references = new Set<string>();
  const { evidence } = component;

  for (const item of evidence.wcag ?? []) {
    for (const token of referenceTokens(item.evidence)) {
      references.add(token);
    }
  }
  for (const item of evidence.baselineTests ?? []) {
    for (const token of referenceTokens(item.evidence)) {
      references.add(token);
    }
  }
  if (Array.isArray(evidence.manualTests)) {
    for (const item of evidence.manualTests) {
      if (!isObjectWithKeys(item)) {
        continue;
      }
      for (const token of referenceTokens(item.evidence)) {
        references.add(token);
      }
    }
  }

  return Array.from(references)
    .filter((token) => {
      const path = isAbsolute(token) ? token : resolve(evidenceRoot, token);
      return !existsSync(path);
    })
    .sort();
}

function hasPassingScreenReaderTest(value: unknown): boolean {
  if (!Array.isArray(value)) {
    return false;
  }

  return value.some((item) => {
    if (!isObjectWithKeys(item)) {
      return false;
    }

    return (
      typeof item.result === "string" &&
      item.result.startsWith("pass") &&
      isScreenReaderTech(item.tech) &&
      hasActionableEvidenceReference(item.evidence)
    );
  });
}

function hasPassingKeyboardTest(value: unknown): boolean {
  if (!Array.isArray(value)) {
    return false;
  }

  return value.some((item) => {
    if (!isObjectWithKeys(item)) {
      return false;
    }

    return (
      typeof item.result === "string" &&
      item.result.startsWith("pass") &&
      isKeyboardTech(item.tech) &&
      hasActionableEvidenceReference(item.evidence)
    );
  });
}

function hasPlaceholderText(value: unknown): boolean {
  const normalized = JSON.stringify(value).toLowerCase();
  return (
    normalized.includes("todo") || normalized.includes("tbd") || normalized.includes("placeholder")
  );
}

function transcriptTypeForManualTest(
  item: Record<string, unknown>,
): "keyboard" | "screen-reader" | null {
  if (isKeyboardTech(item.tech)) {
    return "keyboard";
  }
  if (isScreenReaderTech(item.tech)) {
    return "screen-reader";
  }

  return null;
}

function validateManualTranscriptReferences(
  component: RegistryComponent,
  evidenceRoot: string,
): EvidenceCheckFinding[] {
  if (!Array.isArray(component.evidence.manualTests)) {
    return [];
  }

  const findings: EvidenceCheckFinding[] = [];

  for (const item of component.evidence.manualTests) {
    if (
      !isObjectWithKeys(item) ||
      typeof item.result !== "string" ||
      !item.result.startsWith("pass")
    ) {
      continue;
    }

    const expectedType = transcriptTypeForManualTest(item);
    if (!expectedType) {
      continue;
    }

    const references = referenceItems(item.evidence);
    if (references.some((reference) => reference.external)) {
      continue;
    }

    for (const reference of references) {
      const path = isAbsolute(reference.path)
        ? reference.path
        : resolve(evidenceRoot, reference.path);
      if (!existsSync(path)) {
        continue;
      }

      if (!reference.path.endsWith(".json")) {
        findings.push(
          finding(
            component,
            "evidence/stable-manual-transcript-schema",
            `Stable manual ${expectedType} evidence must point to a schema-backed JSON transcript or HTTPS URL: ${reference.path}`,
          ),
        );
        continue;
      }

      let transcript: unknown;
      try {
        transcript = JSON.parse(readFileSync(path, "utf8"));
      } catch (error) {
        findings.push(
          finding(
            component,
            "evidence/stable-manual-transcript-schema",
            `Manual transcript is not valid JSON: ${reference.path} (${
              error instanceof Error ? error.message : String(error)
            })`,
          ),
        );
        continue;
      }

      const validation = validate("manualTranscript", transcript);
      if (!validation.ok) {
        findings.push(
          finding(
            component,
            "evidence/stable-manual-transcript-schema",
            `Manual transcript does not match manual-transcript.schema.json: ${reference.path}\n${describeErrors(
              validation,
            )}`,
          ),
        );
        continue;
      }

      const record = transcript as {
        component: string;
        environment: { assistiveTechnology?: string };
        result: string;
        transcriptType: string;
        version: string;
      };
      if (record.component !== component.name || record.version !== component.version) {
        findings.push(
          finding(
            component,
            "evidence/stable-manual-transcript-schema",
            `Manual transcript ${reference.path} is for ${record.component}@${record.version}, expected ${component.name}@${component.version}.`,
          ),
        );
      }
      if (record.transcriptType !== expectedType) {
        findings.push(
          finding(
            component,
            "evidence/stable-manual-transcript-schema",
            `Manual transcript ${reference.path} has type ${record.transcriptType}, expected ${expectedType}.`,
          ),
        );
      }
      if (!record.result.startsWith("pass")) {
        findings.push(
          finding(
            component,
            "evidence/stable-manual-transcript-schema",
            `Manual transcript ${reference.path} result is ${record.result}, expected pass or pass-with-note.`,
          ),
        );
      }
      if (
        expectedType === "screen-reader" &&
        !isScreenReaderTech(record.environment.assistiveTechnology)
      ) {
        findings.push(
          finding(
            component,
            "evidence/stable-manual-transcript-schema",
            `Manual transcript ${reference.path} must identify a real screen-reader technology.`,
          ),
        );
      }
      if (hasPlaceholderText(transcript)) {
        findings.push(
          finding(
            component,
            "evidence/stable-manual-transcript-schema",
            `Manual transcript ${reference.path} contains TODO, TBD, or placeholder text.`,
          ),
        );
      }
    }
  }

  return findings;
}

function checkComponentEvidence(
  component: RegistryComponent,
  options: EvidenceCheckOptions,
): EvidenceCheckFinding[] {
  const findings: EvidenceCheckFinding[] = [];
  const { evidence } = component;

  if (evidence.component !== component.name) {
    findings.push(
      finding(
        component,
        "evidence/component-mismatch",
        `Evidence packet component is ${evidence.component}, expected ${component.name}.`,
      ),
    );
  }

  if (evidence.version !== component.version) {
    findings.push(
      finding(
        component,
        "evidence/version-mismatch",
        `Evidence packet version is ${evidence.version}, expected ${component.version}.`,
      ),
    );
  }

  if (!claimsStableEvidence(component)) {
    return findings;
  }

  if (!Array.isArray(evidence.wcag) || evidence.wcag.length === 0) {
    findings.push(
      finding(component, "evidence/stable-wcag-status", "Stable evidence requires WCAG mappings."),
    );
  } else {
    const weakWcag = evidence.wcag.filter(
      (item) => !passingStatuses.has(item.status) || !hasActionableEvidenceReference(item.evidence),
    );
    if (weakWcag.length > 0) {
      findings.push(
        finding(
          component,
          "evidence/stable-wcag-status",
          "Stable evidence requires every WCAG mapping to pass or be not-applicable with actionable evidence references.",
        ),
      );
    }
  }

  if (!Array.isArray(evidence.baselineTests) || evidence.baselineTests.length === 0) {
    findings.push(
      finding(
        component,
        "evidence/stable-baseline-tests",
        "Stable evidence requires ICT Baseline mappings.",
      ),
    );
  } else {
    const weakBaseline = evidence.baselineTests.filter(
      (item) => !passingStatuses.has(item.status) || !hasActionableEvidenceReference(item.evidence),
    );
    if (weakBaseline.length > 0) {
      findings.push(
        finding(
          component,
          "evidence/stable-baseline-tests",
          "Stable evidence requires every ICT Baseline mapping to pass or be not-applicable with actionable evidence references.",
        ),
      );
    }
  }

  if (!isObjectWithKeys(evidence.automatedResults)) {
    findings.push(
      finding(
        component,
        "evidence/stable-automated-results",
        "Stable evidence requires recorded automated accessibility results.",
      ),
    );
  }

  if (!hasPassingKeyboardTest(evidence.manualTests)) {
    findings.push(
      finding(
        component,
        "evidence/stable-keyboard-tests",
        "Stable evidence requires at least one passing manual keyboard test with an evidence reference; screen-reader notes do not substitute for keyboard evidence.",
      ),
    );
  }

  if (!hasPassingScreenReaderTest(evidence.manualTests)) {
    findings.push(
      finding(
        component,
        "evidence/stable-manual-tests",
        "Stable evidence requires at least one passing manual screen-reader test with an evidence reference; TODO placeholders are not actionable evidence references.",
      ),
    );
  }

  if (!Array.isArray(evidence.knownLimitations)) {
    findings.push(
      finding(
        component,
        "evidence/stable-known-limitations",
        "Stable evidence requires known limitations to be explicitly listed or empty.",
      ),
    );
  }

  if (!evidence.lastReviewed || !evidence.reviewer) {
    findings.push(
      finding(
        component,
        "evidence/stable-review-metadata",
        "Stable evidence requires lastReviewed and reviewer metadata.",
      ),
    );
  }

  const evidenceRoot =
    typeof options.evidenceRoot === "function"
      ? options.evidenceRoot(component)
      : options.evidenceRoot;
  if (evidenceRoot) {
    const missingReferences = missingEvidenceReferences(component, evidenceRoot);
    if (missingReferences.length > 0) {
      findings.push(
        finding(
          component,
          "evidence/stable-evidence-references",
          `Stable evidence references must resolve to local files or HTTPS URLs: ${missingReferences.join(", ")}`,
        ),
      );
    }
    findings.push(...validateManualTranscriptReferences(component, evidenceRoot));
  }

  return findings;
}

export function checkEvidence(
  components: RegistryComponent[],
  options: EvidenceCheckOptions = {},
): EvidenceCheckResult {
  return {
    components: components.length,
    findings: components.flatMap((component) => checkComponentEvidence(component, options)),
  };
}
