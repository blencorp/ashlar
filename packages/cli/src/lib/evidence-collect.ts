import { resolve } from "node:path";
import { runAudit, type AuditPolicy } from "./audit-runner.js";
import type { PolicyFinding } from "./policy/federal.js";
import { getComponent } from "./registry.js";
import { describeErrors, validate } from "./schema-validate.js";

export type EvidenceCollectionArtifact = {
  $schema: "https://ashlar.dev/schemas/evidence-artifact.schema.json";
  schemaVersion: "1.0";
  component: string;
  version: string;
  generatedAt: string;
  fixture: string;
  status: "pass" | "fail";
  automatedResults: {
    ashlarAudit: {
      tool: "ashlar audit";
      policy: AuditPolicy;
      status: "pass" | "fail";
      findings: PolicyFinding[];
    };
  };
};

export function collectAutomatedEvidence(input: {
  component: string;
  cwd: string;
  fixture: string;
  policy?: AuditPolicy;
  registryPath: string;
}): EvidenceCollectionArtifact {
  const detail = getComponent(input.cwd, input.component, input.registryPath);
  const policy = input.policy ?? "components";
  const fixture = resolve(input.cwd, input.fixture);
  const findings = runAudit({
    cwd: input.cwd,
    files: [fixture],
    policy,
    registryPath: input.registryPath,
  });
  const status = findings.some((finding) => finding.level === "error") ? "fail" : "pass";

  const artifact: EvidenceCollectionArtifact = {
    $schema: "https://ashlar.dev/schemas/evidence-artifact.schema.json",
    schemaVersion: "1.0",
    component: detail.name,
    version: detail.version,
    generatedAt: new Date().toISOString(),
    fixture,
    status,
    automatedResults: {
      ashlarAudit: {
        tool: "ashlar audit",
        policy,
        status,
        findings,
      },
    },
  };
  const validation = validate("evidenceArtifact", artifact);
  if (!validation.ok) {
    throw new Error(`Generated evidence artifact is invalid:\n${describeErrors(validation)}`);
  }

  return artifact;
}
