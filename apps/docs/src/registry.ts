type JsonRecord = Record<string, unknown>;

export type ComponentDoc = {
  name: string;
  version: string;
  tagName: string;
  description: string;
  family: string;
  layer: string;
  stability: string;
  selector: string;
  evidenceStatus: string;
  tokens: string[];
  platformFeatures: string[];
  policyMappings: string[];
};

const cemModules = import.meta.glob<JsonRecord>("../../../registry/components/*/0.0.1/*.cem.json", {
  eager: true,
  import: "default",
});

const evidenceModules = import.meta.glob<JsonRecord>(
  "../../../registry/components/*/0.0.1/*.evidence.json",
  {
    eager: true,
    import: "default",
  },
);

export const components: ComponentDoc[] = Object.entries(cemModules)
  .map(([path, cem]) => {
    const pathMatch = path.match(/registry\/components\/([^/]+)\/([^/]+)/);
    const name = pathMatch?.[1] ?? "unknown";
    const version = pathMatch?.[2] ?? "unknown";
    const declaration = firstDeclaration(cem);
    const ashlar = record(declaration?._ashlar);
    const evidence = evidenceFor(name);

    return {
      name,
      version,
      tagName: stringValue(declaration?.tagName, "n/a"),
      description: stringValue(declaration?.description, "No description provided."),
      family: familyLabel(stringValue(ashlar?.layer, "unknown")),
      layer: stringValue(ashlar?.layer, "unknown"),
      stability: stringValue(ashlar?.stability, "unknown"),
      selector: stringValue(ashlar?.selector, "n/a"),
      evidenceStatus: stringValue(evidence.accessibilityStatus, "not-reviewed"),
      tokens: stringArray(ashlar?.tokensConsumed),
      platformFeatures: featureNames(ashlar?.platformFeatures),
      policyMappings: mappingNames(ashlar?.policyMappings),
    };
  })
  .sort((a, b) => a.family.localeCompare(b.family) || a.name.localeCompare(b.name));

function familyLabel(layer: string): string {
  const labels: Record<string, string> = {
    "application-blocks": "application blocks",
    "framework-adapters": "framework adapters",
    "interactive-components": "interactive controls",
    "markup-primitives": "foundations",
    "service-patterns": "service patterns",
  };
  return labels[layer] ?? layer;
}

function evidenceFor(name: string): JsonRecord {
  const entry = Object.entries(evidenceModules).find(([path]) =>
    path.includes(`/registry/components/${name}/`),
  );
  return record(entry?.[1]) ?? {};
}

function firstDeclaration(cem: JsonRecord): JsonRecord | undefined {
  const modules = array(cem.modules);
  for (const moduleValue of modules) {
    const declarations = array(record(moduleValue)?.declarations);
    const declaration = declarations.find((value) => record(value));
    if (declaration) {
      return record(declaration);
    }
  }
  return undefined;
}

function featureNames(value: unknown): string[] {
  return array(value)
    .map((item) => stringValue(record(item)?.feature, ""))
    .filter(Boolean);
}

function mappingNames(value: unknown): string[] {
  return array(value)
    .map((item) => stringValue(record(item)?.source, ""))
    .filter(Boolean);
}

function stringArray(value: unknown): string[] {
  return array(value)
    .map((item) => stringValue(item, ""))
    .filter(Boolean);
}

function record(value: unknown): JsonRecord | undefined {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as JsonRecord)
    : undefined;
}

function array(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function stringValue(value: unknown, fallback: string): string {
  return typeof value === "string" && value.trim() ? value : fallback;
}
