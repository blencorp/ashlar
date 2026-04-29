import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { sha256Text } from "./hash.js";

export type CapsuleManifest = {
  schemaVersion: "1.0";
  name: string;
  version: string;
  layer: "L0" | "L1" | "L2" | "L3" | "L4";
  stability: "proposal" | "experimental" | "beta" | "stable" | "deprecated";
  files: Record<string, string>;
  capsule_hash: string;
};

export function buildCapsuleManifest(input: {
  directory: string;
  name: string;
  version: string;
  layer: CapsuleManifest["layer"];
  stability: CapsuleManifest["stability"];
}): CapsuleManifest {
  const files = Object.fromEntries(
    readdirSync(input.directory, { withFileTypes: true })
      .filter((entry) => entry.isFile() && !entry.name.endsWith(".lock.json"))
      .map((entry) => entry.name)
      .sort()
      .map((file) => [file, sha256Text(readFileSync(join(input.directory, file), "utf8"))]),
  );

  const capsule_hash = sha256Text(
    JSON.stringify({
      name: input.name,
      version: input.version,
      files,
    }),
  );

  return {
    schemaVersion: "1.0",
    name: input.name,
    version: input.version,
    layer: input.layer,
    stability: input.stability,
    files,
    capsule_hash,
  };
}
