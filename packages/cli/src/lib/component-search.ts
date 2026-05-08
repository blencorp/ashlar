import {
  getComponent,
  listComponents,
  type RegistryComponent,
  type RegistryLayer,
  type RegistryStability,
  type RegistryTier,
} from "./registry.js";
import { formatRegistryLayer } from "./layers.js";

export type ComponentSearchInput = {
  cwd: string;
  registryPath?: string;
  query?: string;
  layer?: RegistryLayer;
  tier?: RegistryTier;
  stability?: RegistryStability;
  evidence?: string;
  policy?: string;
  feature?: string;
  token?: string;
  limit?: number;
};

export type ComponentSearchResult = {
  name: string;
  version: string;
  description: string;
  tier: RegistryTier;
  layer: RegistryLayer;
  stability: RegistryStability;
  evidenceStatus: string;
  score: number;
  reasons: string[];
  installCommand: string;
  policyMappings: RegistryComponent["policyMappings"];
  platformFeatures: RegistryComponent["platformFeatures"];
};

type WeightedField = {
  label: string;
  text: string;
  weight: number;
};

const layerOrder: Record<RegistryLayer, number> = {
  "markup-primitives": 0,
  "interactive-components": 1,
  "framework-adapters": 2,
  "service-patterns": 3,
  "application-blocks": 4,
};

function normalize(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function includesNormalized(text: string, needle: string): boolean {
  return normalize(text).includes(normalize(needle));
}

function compactText(values: Array<string | undefined>): string {
  return values.filter((value): value is string => Boolean(value)).join(" ");
}

function metadataFields(component: RegistryComponent): WeightedField[] {
  const declarationText = compactText(
    component.cem.modules?.flatMap((module) =>
      (module.declarations ?? []).flatMap((declaration) => [
        declaration.name,
        declaration.tagName,
        declaration.description,
      ]),
    ) ?? [],
  );
  const policyText = compactText(
    component.policyMappings.flatMap((mapping) => [
      mapping.source,
      mapping.requirement,
      mapping.url,
    ]),
  );
  const featureText = compactText(
    component.platformFeatures.flatMap((feature) => [
      feature.feature,
      feature.status,
      feature.fallback,
    ]),
  );
  const a11yText = compactText(
    component.ashlar.a11yRequirements?.flatMap((requirement) => [
      requirement.id,
      requirement.wcag,
      requirement.severity,
      requirement.description,
    ]) ?? [],
  );
  const antiPatternText = compactText(
    component.ashlar.antiPatterns?.flatMap((pattern) => [
      pattern.id,
      pattern.message,
      pattern.fix,
      pattern.wcag,
      pattern.reason,
      ...(pattern.languages ?? []),
    ]) ?? [],
  );
  const tokenText = compactText(component.ashlar.tokensConsumed ?? []);

  return [
    { label: "name", text: component.name, weight: 100 },
    { label: "description", text: component.description, weight: 40 },
    { label: "declaration", text: declarationText, weight: 30 },
    { label: "policy", text: policyText, weight: 28 },
    { label: "platform feature", text: featureText, weight: 24 },
    { label: "accessibility rule", text: a11yText, weight: 20 },
    { label: "anti-pattern", text: antiPatternText, weight: 18 },
    { label: "token", text: tokenText, weight: 16 },
    {
      label: "metadata",
      text: compactText([
        component.tier,
        component.layer,
        component.stability,
        component.evidence.accessibilityStatus,
        component.ashlar.selector,
        component.ashlar.rendering,
        component.ashlar.hydrationCost,
        ...(component.ashlar.doNot ?? []),
      ]),
      weight: 12,
    },
  ];
}

function matchesFilter(text: string, filter: string | undefined): boolean {
  return !filter || includesNormalized(text, filter);
}

function filterReasons(component: RegistryComponent, input: ComponentSearchInput): string[] | null {
  const reasons: string[] = [];
  if (input.layer && component.layer !== input.layer) {
    return null;
  }
  if (input.layer) {
    reasons.push(`family: ${formatRegistryLayer(component.layer)}`);
  }
  if (input.tier && component.tier !== input.tier) {
    return null;
  }
  if (input.tier) {
    reasons.push(`tier: ${component.tier}`);
  }
  if (input.stability && component.stability !== input.stability) {
    return null;
  }
  if (input.stability) {
    reasons.push(`stability: ${component.stability}`);
  }
  if (input.evidence && component.evidence.accessibilityStatus !== input.evidence) {
    return null;
  }
  if (input.evidence) {
    reasons.push(`evidence: ${component.evidence.accessibilityStatus}`);
  }

  const policyText = compactText(
    component.policyMappings.flatMap((mapping) => [
      mapping.source,
      mapping.requirement,
      mapping.url,
    ]),
  );
  if (!matchesFilter(policyText, input.policy)) {
    return null;
  }
  if (input.policy) {
    reasons.push(`policy: ${matchingPolicyLabel(component, input.policy)}`);
  }

  const featureText = compactText(
    component.platformFeatures.flatMap((feature) => [
      feature.feature,
      feature.status,
      feature.fallback,
    ]),
  );
  if (!matchesFilter(featureText, input.feature)) {
    return null;
  }
  if (input.feature) {
    reasons.push(`feature: ${matchingFeatureLabel(component, input.feature)}`);
  }

  const tokenText = compactText(component.ashlar.tokensConsumed ?? []);
  if (!matchesFilter(tokenText, input.token)) {
    return null;
  }
  if (input.token) {
    reasons.push(`token: ${input.token}`);
  }

  return reasons;
}

function matchingPolicyLabel(component: RegistryComponent, filter: string): string {
  return (
    component.policyMappings.find((mapping) =>
      includesNormalized(`${mapping.source} ${mapping.requirement} ${mapping.url ?? ""}`, filter),
    )?.source ?? filter
  );
}

function matchingFeatureLabel(component: RegistryComponent, filter: string): string {
  return (
    component.platformFeatures.find((feature) =>
      includesNormalized(`${feature.feature} ${feature.status} ${feature.fallback}`, filter),
    )?.feature ?? filter
  );
}

function scoreQuery(
  component: RegistryComponent,
  query: string | undefined,
): {
  score: number;
  reasons: string[];
} | null {
  const normalizedQuery = normalize(query ?? "");
  if (!normalizedQuery) {
    return { score: 0, reasons: [] };
  }

  const terms = normalizedQuery.split(/\s+/).filter(Boolean);
  const fields = metadataFields(component);
  let score = 0;
  const matchedLabels = new Set<string>();

  for (const term of terms) {
    const match = fields
      .filter((field) => includesNormalized(field.text, term))
      .sort((a, b) => b.weight - a.weight)
      .at(0);

    if (!match) {
      return null;
    }

    score += match.weight;
    matchedLabels.add(match.label);
  }

  if (normalize(component.name) === normalizedQuery) {
    score += 120;
    matchedLabels.add("exact name");
  }

  return {
    score,
    reasons: [...matchedLabels].map((label) => `matched ${label}`),
  };
}

function toResult(
  component: RegistryComponent,
  score: number,
  reasons: string[],
): ComponentSearchResult {
  return {
    name: component.name,
    version: component.version,
    description: component.description,
    tier: component.tier,
    layer: component.layer,
    stability: component.stability,
    evidenceStatus: component.evidence.accessibilityStatus,
    score,
    reasons: reasons.length > 0 ? reasons : ["registry component"],
    installCommand: `ashlar add ${component.name}`,
    policyMappings: component.policyMappings,
    platformFeatures: component.platformFeatures,
  };
}

export function searchRegistryComponents(input: ComponentSearchInput): ComponentSearchResult[] {
  const limit = input.limit ?? 20;
  const results: ComponentSearchResult[] = [];

  for (const item of listComponents(input.cwd, input.registryPath)) {
    const component = getComponent(input.cwd, item.name, input.registryPath);
    const filterReasonList = filterReasons(component, input);
    if (!filterReasonList) {
      continue;
    }

    const queryScore = scoreQuery(component, input.query);
    if (!queryScore) {
      continue;
    }

    const filterScore = filterReasonList.length * 25;
    results.push(
      toResult(component, queryScore.score + filterScore, [
        ...queryScore.reasons,
        ...filterReasonList,
      ]),
    );
  }

  return results
    .sort((a, b) => {
      if (b.score !== a.score) {
        return b.score - a.score;
      }
      if (layerOrder[a.layer] !== layerOrder[b.layer]) {
        return layerOrder[a.layer] - layerOrder[b.layer];
      }
      return a.name.localeCompare(b.name);
    })
    .slice(0, limit);
}
