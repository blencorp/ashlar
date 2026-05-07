export const aiEvalSchemaId = "https://ashlar.dev/schemas/ai-eval.schema.json";
export const capsuleSchemaId = "https://ashlar.dev/schemas/capsule.schema.json";
export const codemodSchemaId = "https://ashlar.dev/schemas/codemod.schema.json";
export const evidenceSchemaId = "https://ashlar.dev/schemas/evidence.schema.json";
export const evidenceArtifactSchemaId = "https://ashlar.dev/schemas/evidence-artifact.schema.json";
export const manualEvidenceSchemaId = "https://ashlar.dev/schemas/manual-evidence.schema.json";
export const manualTranscriptSchemaId = "https://ashlar.dev/schemas/manual-transcript.schema.json";
export const lockSchemaId = "https://ashlar.dev/schemas/lock.schema.json";
export const registryIndexSchemaId = "https://ashlar.dev/schemas/registry-index.schema.json";
export const ashlarCemSchemaId = "https://ashlar.dev/schemas/ashlar-cem.schema.json";
export const configSchemaId = "https://ashlar.dev/schemas/config.schema.json";
export const agencyThemeSchemaId = "https://ashlar.dev/schemas/agency-theme.schema.json";
export const trustRootSchemaId = "https://ashlar.dev/schemas/trust-root.schema.json";
export const releaseTrustBundleSchemaId =
  "https://ashlar.dev/schemas/release-trust-bundle.schema.json";
export const releaseReadinessSchemaId = "https://ashlar.dev/schemas/release-readiness.schema.json";
export const stableEvidenceReviewManifestSchemaId =
  "https://ashlar.dev/schemas/stable-evidence-review-manifest.schema.json";
export const stableEvidenceReviewStatusSchemaId =
  "https://ashlar.dev/schemas/stable-evidence-review-status.schema.json";

export const aiEvalFormatVersion = "1.0";
export const capsuleFormatVersion = "1.0";
export const codemodFormatVersion = "1.0";
export const evidenceFormatVersion = "1.0";
export const evidenceArtifactFormatVersion = "1.0";
export const manualEvidenceFormatVersion = "1.0";
export const manualTranscriptFormatVersion = "1.0";
export const lockfileVersion = "1";
export const registryIndexFormatVersion = "1.0";
export const releaseTrustBundleFormatVersion = "1.0";
export const releaseReadinessFormatVersion = "1.0";
export const stableEvidenceReviewManifestFormatVersion = "1.0";
export const stableEvidenceReviewStatusFormatVersion = "1.0";

export type CapsuleLayer = "L0" | "L1" | "L2" | "L3" | "L4";
export type CapsuleStability = "proposal" | "experimental" | "beta" | "stable" | "deprecated";
export type CapsuleTier = "foundation" | "primitive" | "composite" | "pattern" | "block";
