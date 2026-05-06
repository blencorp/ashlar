import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { basename, dirname } from "node:path";

export type ReleaseArtifactAttestation = {
  type: "https://in-toto.io/Statement/v1";
  predicateType: "https://ashlar.dev/attestations/release-artifact/v1";
  subject: {
    name: string;
    digest: {
      sha256: string;
    };
    size: number;
  };
  predicate: {
    generatedAt: string;
    tool: "ashlar release attest";
  };
};

function sha256FileBytes(path: string): string {
  return createHash("sha256").update(readFileSync(path)).digest("hex");
}

export function buildReleaseAttestation(
  subjectPath: string,
  generatedAt = new Date(),
): ReleaseArtifactAttestation {
  return {
    type: "https://in-toto.io/Statement/v1",
    predicateType: "https://ashlar.dev/attestations/release-artifact/v1",
    subject: {
      name: basename(subjectPath),
      digest: {
        sha256: sha256FileBytes(subjectPath),
      },
      size: statSync(subjectPath).size,
    },
    predicate: {
      generatedAt: generatedAt.toISOString(),
      tool: "ashlar release attest",
    },
  };
}

export function writeReleaseAttestation(input: {
  output: string;
  subjectPath: string;
}): ReleaseArtifactAttestation {
  const attestation = buildReleaseAttestation(input.subjectPath);
  mkdirSync(dirname(input.output), { recursive: true });
  writeFileSync(input.output, `${JSON.stringify(attestation, null, 2)}\n`);
  return attestation;
}

export function verifyReleaseAttestation(input: {
  attestationPath: string;
  subjectPath: string;
}): string[] {
  const attestation = JSON.parse(
    readFileSync(input.attestationPath, "utf8"),
  ) as ReleaseArtifactAttestation;
  const errors: string[] = [];

  if (attestation.type !== "https://in-toto.io/Statement/v1") {
    errors.push(`unsupported attestation type: ${attestation.type}`);
  }
  if (attestation.predicateType !== "https://ashlar.dev/attestations/release-artifact/v1") {
    errors.push(`unsupported predicate type: ${attestation.predicateType}`);
  }
  if (attestation.subject.name !== basename(input.subjectPath)) {
    errors.push(
      `subject name mismatch: expected ${basename(input.subjectPath)}, found ${attestation.subject.name}`,
    );
  }

  const actualHash = sha256FileBytes(input.subjectPath);
  if (attestation.subject.digest.sha256 !== actualHash) {
    errors.push(
      `subject sha256 mismatch: expected ${attestation.subject.digest.sha256}, found ${actualHash}`,
    );
  }

  const actualSize = statSync(input.subjectPath).size;
  if (attestation.subject.size !== actualSize) {
    errors.push(`subject size mismatch: expected ${attestation.subject.size}, found ${actualSize}`);
  }

  return errors;
}
