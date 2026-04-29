export const capsuleSchemaId = "https://ashlar.dev/schemas/capsule.schema.json";
export const evidenceSchemaId = "https://ashlar.dev/schemas/evidence.schema.json";
export const lockSchemaId = "https://ashlar.dev/schemas/lock.schema.json";
export const registryIndexSchemaId = "https://ashlar.dev/schemas/registry-index.schema.json";
export const ashlarCemSchemaId = "https://ashlar.dev/schemas/ashlar-cem.schema.json";
export const configSchemaId = "https://ashlar.dev/schemas/config.schema.json";

export const capsuleFormatVersion = "1.0";
export const evidenceFormatVersion = "1.0";
export const lockfileVersion = "1";
export const registryIndexFormatVersion = "1.0";

export type CapsuleLayer = "L0" | "L1" | "L2" | "L3" | "L4";
export type CapsuleStability = "proposal" | "experimental" | "beta" | "stable" | "deprecated";
export type CapsuleTier = "foundation" | "primitive" | "composite" | "pattern" | "block";
