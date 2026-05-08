import { existsSync, readFileSync, readdirSync } from "node:fs";
import { isAbsolute, join, resolve } from "node:path";
import type { CapsuleTrustRoot } from "./capsule.js";
import {
  DEFAULT_REGISTRY_ALIAS,
  isDefaultRegistryAlias,
  resolveBundledRegistryRoot,
} from "./default-registry.js";
import { describeErrors, validate } from "./schema-validate.js";

export type RegistryLayer =
  | "markup-primitives"
  | "interactive-components"
  | "framework-adapters"
  | "service-patterns"
  | "application-blocks";
export type RegistryStability = "proposal" | "experimental" | "beta" | "stable" | "deprecated";
export type RegistryTier = "foundation" | "primitive" | "composite" | "pattern" | "block";

export type RegistryIndexComponent = {
  latest: string;
  versions: string[];
  capsuleHashes: Record<string, string>;
  tier: RegistryTier;
  layer: RegistryLayer;
  stability: RegistryStability;
  description: string;
};

export type RegistryIndex = {
  schemaVersion: "1.0";
  registry: string;
  name: string;
  version: string;
  publishedAt?: string;
  components: Record<string, RegistryIndexComponent>;
};

export type AshlarMetadata = {
  selector?: string;
  variants?: string[];
  sizes?: string[];
  a11yRequirements?: Array<{
    id: string;
    wcag: string;
    severity: string;
    description?: string;
  }>;
  antiPatterns?: Array<{
    id: string;
    message?: string;
    fix?: string;
    wcag?: string;
    severity?: string;
    reason?: string;
    languages?: string[];
  }>;
  tokensConsumed?: string[];
  platformFeatures?: Array<{ feature: string; status: string; fallback: string }>;
  policyMappings?: Array<{ source: string; requirement: string; url?: string }>;
  rendering?: string;
  hydrationCost?: string;
  criticalForA11y?: boolean;
  examples?: Record<string, string>;
  doNot?: string[];
};

type CemDeclaration = {
  kind?: string;
  name?: string;
  tagName?: string;
  description?: string;
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
  wcag?: Array<{
    criterion: string;
    level: string;
    title: string;
    status: string;
    evidence?: string;
    notes?: string;
  }>;
  baselineTests?: Array<{
    source: string;
    test: string;
    status: string;
    evidence?: string;
  }>;
  manualTests?: Array<Record<string, unknown>>;
  automatedResults?: Record<string, unknown>;
  knownLimitations?: unknown[];
  lastReviewed?: string;
  reviewer?: string;
};

export type RegistryListItem = RegistryIndexComponent & {
  name: string;
};

export type RegistryComponent = RegistryListItem & {
  version: string;
  capsuleHash: string;
  directory: string;
  trustRoot?: CapsuleTrustRoot;
  files: string[];
  cem: CemManifest;
  ashlar: AshlarMetadata;
  evidence: EvidencePacket;
  platformFeatures: NonNullable<AshlarMetadata["platformFeatures"]>;
  policyMappings: NonNullable<AshlarMetadata["policyMappings"]>;
};

function readJson<T>(path: string): T {
  return JSON.parse(readFileSync(path, "utf8")) as T;
}

export function resolveRegistryRoot(cwd: string, registryPath: string): string {
  if (isDefaultRegistryAlias(registryPath)) {
    return resolveBundledRegistryRoot(cwd);
  }

  return isAbsolute(registryPath) ? registryPath : resolve(cwd, registryPath);
}

export function readRegistryIndex(
  cwd: string,
  registryPath = DEFAULT_REGISTRY_ALIAS,
): RegistryIndex {
  const indexPath = join(resolveRegistryRoot(cwd, registryPath), "index.json");

  if (!existsSync(indexPath)) {
    throw new Error(`Ashlar registry index not found: ${indexPath}`);
  }

  const index = readJson<RegistryIndex>(indexPath);
  const result = validate("registryIndex", index);
  if (!result.ok) {
    throw new Error(`Invalid Ashlar registry index at ${indexPath}:\n${describeErrors(result)}`);
  }

  return index;
}

export function readRegistryTrustRoot(
  cwd: string,
  registryPath = DEFAULT_REGISTRY_ALIAS,
): CapsuleTrustRoot | undefined {
  const trustRootPath = join(resolveRegistryRoot(cwd, registryPath), "trust-root.json");

  if (!existsSync(trustRootPath)) {
    return undefined;
  }

  const trustRoot = readJson<CapsuleTrustRoot>(trustRootPath);
  const result = validate("trustRoot", trustRoot);
  if (!result.ok) {
    throw new Error(
      `Invalid Ashlar registry trust root at ${trustRootPath}:\n${describeErrors(result)}`,
    );
  }

  return trustRoot;
}

export function listComponents(
  cwd: string,
  registryPath = DEFAULT_REGISTRY_ALIAS,
): RegistryListItem[] {
  const index = readRegistryIndex(cwd, registryPath);

  return Object.entries(index.components)
    .map(([name, item]) => ({ name, ...item }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

export function resolveComponentVersion(
  cwd: string,
  name: string,
  registryPath = DEFAULT_REGISTRY_ALIAS,
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
  registryPath = DEFAULT_REGISTRY_ALIAS,
): RegistryComponent {
  const item = listComponents(cwd, registryPath).find((component) => component.name === name);

  if (!item) {
    throw new Error(`Unknown Ashlar component: ${name}`);
  }

  const version = resolveComponentVersion(cwd, name, registryPath);
  return getComponentVersion(cwd, name, version, registryPath);
}

export function getComponentVersion(
  cwd: string,
  name: string,
  version: string,
  registryPath = DEFAULT_REGISTRY_ALIAS,
): RegistryComponent {
  const item = listComponents(cwd, registryPath).find((component) => component.name === name);

  if (!item) {
    throw new Error(`Unknown Ashlar component: ${name}`);
  }

  if (!item.versions.includes(version)) {
    throw new Error(`Registry index for ${name} does not include version: ${version}`);
  }

  const capsuleHash = item.capsuleHashes[version];
  if (!capsuleHash) {
    throw new Error(`Registry index for ${name} is missing capsule hash for version: ${version}`);
  }

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
    capsuleHash,
    directory,
    trustRoot: readRegistryTrustRoot(cwd, registryPath),
    files,
    cem,
    ashlar: metadata,
    evidence: readJson<EvidencePacket>(join(directory, `${name}.evidence.json`)),
    platformFeatures: metadata.platformFeatures ?? [],
    policyMappings: metadata.policyMappings ?? [],
  };
}
