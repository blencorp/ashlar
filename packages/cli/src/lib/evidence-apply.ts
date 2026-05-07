import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describeErrors, validate } from "./schema-validate.js";
import type { EvidenceCollectionArtifact } from "./evidence-collect.js";
import { getComponent, type EvidencePacket } from "./registry.js";

type ApplyEvidenceArtifactInput = {
  artifactPath: string;
  component: string;
  cwd: string;
  registryPath: string;
};

type AppliedAshlarAuditResult = EvidenceCollectionArtifact["automatedResults"]["ashlarAudit"] & {
  artifact: {
    schema: EvidenceCollectionArtifact["$schema"];
    generatedAt: string;
    fixture: string;
  };
};

function readEvidenceArtifact(path: string): EvidenceCollectionArtifact {
  const artifact = JSON.parse(readFileSync(path, "utf8")) as EvidenceCollectionArtifact;
  const result = validate("evidenceArtifact", artifact);
  if (!result.ok) {
    throw new Error(`Invalid Ashlar evidence artifact at ${path}:\n${describeErrors(result)}`);
  }

  return artifact;
}

export function applyEvidenceArtifact(input: ApplyEvidenceArtifactInput): EvidencePacket {
  const detail = getComponent(input.cwd, input.component, input.registryPath);
  const artifactPath = resolve(input.cwd, input.artifactPath);
  const artifact = readEvidenceArtifact(artifactPath);

  if (artifact.component !== detail.name) {
    throw new Error(
      `Evidence artifact component is ${artifact.component}, expected ${detail.name}.`,
    );
  }
  if (artifact.version !== detail.version) {
    throw new Error(
      `Evidence artifact version is ${artifact.version}, expected ${detail.version}.`,
    );
  }

  const auditResult: AppliedAshlarAuditResult = {
    ...artifact.automatedResults.ashlarAudit,
    artifact: {
      schema: artifact.$schema,
      generatedAt: artifact.generatedAt,
      fixture: artifact.fixture,
    },
  };
  const evidence = JSON.parse(JSON.stringify(detail.evidence)) as EvidencePacket;
  evidence.automatedResults = {
    ...(evidence.automatedResults ?? {}),
    ashlarAudit: auditResult,
  };
  evidence.accessibilityStatus = artifact.status === "pass" ? "automated-tested" : "known-issue";

  const result = validate("evidence", evidence);
  if (!result.ok) {
    throw new Error(`Applied evidence packet is invalid:\n${describeErrors(result)}`);
  }

  return evidence;
}
