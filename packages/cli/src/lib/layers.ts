import type { RegistryLayer } from "./registry.js";

export const registryLayerNames: Record<RegistryLayer, string> = {
  "markup-primitives": "markup primitives",
  "interactive-components": "interactive components",
  "framework-adapters": "framework adapters",
  "service-patterns": "service patterns",
  "application-blocks": "application blocks",
};

export const registryLayerCapsuleNames: Record<RegistryLayer, string> = {
  "markup-primitives": "markup primitive capsules",
  "interactive-components": "interactive component capsules",
  "framework-adapters": "framework adapter capsules",
  "service-patterns": "service pattern capsules",
  "application-blocks": "application block capsules",
};

const registryLayerAliases: Record<string, RegistryLayer | "all"> = {
  all: "all",
  base: "markup-primitives",
  foundation: "markup-primitives",
  markup: "markup-primitives",
  "markup-primitive": "markup-primitives",
  "markup-primitives": "markup-primitives",
  primitive: "markup-primitives",
  primitives: "markup-primitives",
  interactive: "interactive-components",
  "interactive-component": "interactive-components",
  "interactive-components": "interactive-components",
  stateful: "interactive-components",
  adapter: "framework-adapters",
  adapters: "framework-adapters",
  "framework-adapter": "framework-adapters",
  "framework-adapters": "framework-adapters",
  pattern: "service-patterns",
  patterns: "service-patterns",
  "service-pattern": "service-patterns",
  "service-patterns": "service-patterns",
  block: "application-blocks",
  blocks: "application-blocks",
  "application-block": "application-blocks",
  "application-blocks": "application-blocks",
  template: "application-blocks",
  templates: "application-blocks",
};

export function formatRegistryLayer(layer: RegistryLayer): string {
  return registryLayerNames[layer];
}

export function formatRegistryLayerCapsules(layer: RegistryLayer): string {
  return registryLayerCapsuleNames[layer];
}

export function parseRegistryLayerAlias(value: string | undefined): RegistryLayer | "all" {
  const normalized = (value ?? "markup-primitives").trim().toLowerCase();
  const layer = registryLayerAliases[normalized];
  if (!layer) {
    throw new Error(
      "Unknown Ashlar layer. Use markup-primitives, interactive-components, framework-adapters, service-patterns, application-blocks, or all.",
    );
  }

  return layer;
}
