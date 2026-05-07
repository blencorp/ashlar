import type { RegistryLayer } from "./registry.js";

export const registryLayerNames: Record<RegistryLayer, string> = {
  L0: "markup primitives",
  L1: "interactive components",
  L2: "framework adapters",
  L3: "service patterns",
  L4: "application blocks",
};

const registryLayerAliases: Record<string, RegistryLayer | "all"> = {
  all: "all",
  l0: "L0",
  base: "L0",
  foundation: "L0",
  markup: "L0",
  "markup-primitive": "L0",
  "markup-primitives": "L0",
  primitive: "L0",
  primitives: "L0",
  l1: "L1",
  interactive: "L1",
  "interactive-component": "L1",
  "interactive-components": "L1",
  stateful: "L1",
  l2: "L2",
  adapter: "L2",
  adapters: "L2",
  "framework-adapter": "L2",
  "framework-adapters": "L2",
  l3: "L3",
  pattern: "L3",
  patterns: "L3",
  "service-pattern": "L3",
  "service-patterns": "L3",
  l4: "L4",
  block: "L4",
  blocks: "L4",
  "application-block": "L4",
  "application-blocks": "L4",
  template: "L4",
  templates: "L4",
};

export function formatRegistryLayer(layer: RegistryLayer): string {
  return `${registryLayerNames[layer]} (${layer})`;
}

export function parseRegistryLayerAlias(value: string | undefined): RegistryLayer | "all" {
  const normalized = (value ?? "markup-primitives").trim().toLowerCase();
  const layer = registryLayerAliases[normalized];
  if (!layer) {
    throw new Error(
      "Unknown Ashlar layer. Use markup-primitives, interactive-components, framework-adapters, service-patterns, application-blocks, all, or the internal aliases L0-L4.",
    );
  }

  return layer;
}
