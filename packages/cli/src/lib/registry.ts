import { existsSync, readFileSync, readdirSync } from "node:fs";
import { isAbsolute, join, resolve } from "node:path";

export type RegistryLayer = "L0" | "L1" | "L2" | "L3" | "L4";
export type RegistryStability = "proposal" | "experimental" | "beta" | "stable" | "deprecated";
export type RegistryTier = "foundation" | "primitive" | "composite" | "pattern" | "block";

type RegistryIndexComponent = {
  latest: string;
  versions: string[];
  tier: RegistryTier;
  layer: RegistryLayer;
  stability: RegistryStability;
  description: string;
};

type RegistryIndex = {
  schemaVersion: "1.0";
  registry: string;
  name: string;
  version: string;
  publishedAt?: string;
  components: Record<string, RegistryIndexComponent>;
};

type AshlarMetadata = {
  platformFeatures?: Array<{ feature: string; status: string; fallback: string }>;
  policyMappings?: Array<{ source: string; requirement: string; url?: string }>;
};

type CemDeclaration = {
  _ashlar?: AshlarMetadata;
};

type CemManifest = {
  modules?: Array<{
    declarations?: CemDeclaration[];
  }>;
};

export type EvidencePacket = {
  component: string;
  version: string;
  stability: RegistryStability;
  accessibilityStatus: string;
};

export type RegistryListItem = RegistryIndexComponent & {
  name: string;
};

export type RegistryComponent = RegistryListItem & {
  version: string;
  directory: string;
  files: string[];
  cem: CemManifest;
  evidence: EvidencePacket;
  platformFeatures: NonNullable<AshlarMetadata["platformFeatures"]>;
  policyMappings: NonNullable<AshlarMetadata["policyMappings"]>;
};

function readJson<T>(path: string): T {
  return JSON.parse(readFileSync(path, "utf8")) as T;
}

function resolveRegistryRoot(cwd: string, registryPath: string): string {
  return isAbsolute(registryPath) ? registryPath : resolve(cwd, registryPath);
}

export function readRegistryIndex(cwd: string, registryPath = "./registry"): RegistryIndex {
  const indexPath = join(resolveRegistryRoot(cwd, registryPath), "index.json");

  if (!existsSync(indexPath)) {
    throw new Error(`Ashlar registry index not found: ${indexPath}`);
  }

  return readJson<RegistryIndex>(indexPath);
}

export function listComponents(cwd: string, registryPath = "./registry"): RegistryListItem[] {
  const index = readRegistryIndex(cwd, registryPath);

  return Object.entries(index.components)
    .map(([name, item]) => ({ name, ...item }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

export function resolveComponentVersion(
  cwd: string,
  name: string,
  registryPath = "./registry",
): string {
  const component = listComponents(cwd, registryPath).find((item) => item.name === name);

  if (!component) {
    throw new Error(`Unknown Ashlar component: ${name}`);
  }

  if (!component.versions.includes(component.latest)) {
    throw new Error(
      `Registry index for ${name} points to missing latest version: ${component.latest}`,
    );
  }

  return component.latest;
}

function extractAshlarMetadata(cem: CemManifest): AshlarMetadata {
  return (
    cem.modules?.flatMap((module) => module.declarations ?? []).find((item) => item._ashlar)
      ?._ashlar ?? {}
  );
}

export function getComponent(
  cwd: string,
  name: string,
  registryPath = "./registry",
): RegistryComponent {
  const item = listComponents(cwd, registryPath).find((component) => component.name === name);

  if (!item) {
    throw new Error(`Unknown Ashlar component: ${name}`);
  }

  const version = resolveComponentVersion(cwd, name, registryPath);
  const directory = join(resolveRegistryRoot(cwd, registryPath), "components", name, version);

  if (!existsSync(directory)) {
    throw new Error(`Registry directory not found for ${name}@${version}: ${directory}`);
  }

  const files = readdirSync(directory, { withFileTypes: true })
    .filter((entry) => entry.isFile())
    .map((entry) => entry.name)
    .sort();
  const cem = readJson<CemManifest>(join(directory, `${name}.cem.json`));
  const metadata = extractAshlarMetadata(cem);

  return {
    ...item,
    version,
    directory,
    files,
    cem,
    evidence: readJson<EvidencePacket>(join(directory, `${name}.evidence.json`)),
    platformFeatures: metadata.platformFeatures ?? [],
    policyMappings: metadata.policyMappings ?? [],
  };
}
