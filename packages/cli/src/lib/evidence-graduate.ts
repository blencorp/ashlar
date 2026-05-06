import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { checkEvidence } from "./evidence-check.js";
import { getComponent, type EvidencePacket } from "./registry.js";
import { describeErrors, validate } from "./schema-validate.js";

type GraduateEvidenceInput = {
  component: string;
  cwd: string;
  evidencePath: string;
  registryPath: string;
};

type GraduateEvidencePacketInput = {
  component: string;
  cwd: string;
  evidence: EvidencePacket;
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

export function graduateEvidence(input: GraduateEvidenceInput): EvidencePacket {
  const evidencePath = resolve(input.cwd, input.evidencePath);
  const evidence = readEvidencePacket(evidencePath);

  return graduateEvidencePacket({
    component: input.component,
    cwd: input.cwd,
    evidence,
    registryPath: input.registryPath,
  });
}

export function graduateEvidencePacket(input: GraduateEvidencePacketInput): EvidencePacket {
  const detail = getComponent(input.cwd, input.component, input.registryPath);
  const evidence = input.evidence;

  if (evidence.component !== detail.name) {
    throw new Error(`Evidence component is ${evidence.component}, expected ${detail.name}.`);
  }
  if (evidence.version !== detail.version) {
    throw new Error(`Evidence version is ${evidence.version}, expected ${detail.version}.`);
  }

  const next = JSON.parse(JSON.stringify(evidence)) as EvidencePacket;
  next.stability = "stable";
  next.accessibilityStatus = "stable-evidence";

  const result = checkEvidence([{ ...detail, evidence: next }], { evidenceRoot: input.cwd });
  const errors = result.findings.filter((finding) => finding.level === "error");
  if (errors.length > 0) {
    throw new Error(
      `Evidence packet is not ready for stable-evidence:\n${errors
        .map((finding) => `  ${finding.rule}: ${finding.message}`)
        .join("\n")}`,
    );
  }

  const validation = validate("evidence", next);
  if (!validation.ok) {
    throw new Error(`Graduated evidence packet is invalid:\n${describeErrors(validation)}`);
  }

  return next;
}
