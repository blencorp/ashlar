import { existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

export const DEFAULT_REGISTRY_ALIAS = "@blen/ashlar";

export function isDefaultRegistryAlias(registryPath: string): boolean {
  return (
    registryPath === DEFAULT_REGISTRY_ALIAS ||
    registryPath === "default" ||
    registryPath === "builtin"
  );
}

export function defaultRegistryPath(): string {
  return DEFAULT_REGISTRY_ALIAS;
}

export function resolveBundledRegistryRoot(cwd: string): string {
  const currentModuleDir = dirname(fileURLToPath(import.meta.url));
  const candidates = [
    resolve(currentModuleDir, "..", "registry"),
    resolve(currentModuleDir, "..", "..", "registry"),
    resolve(currentModuleDir, "..", "..", "..", "..", "registry"),
    resolve(cwd, "registry"),
  ];

  const bundledRegistry = candidates.find((candidate) =>
    existsSync(resolve(candidate, "index.json")),
  );
  return bundledRegistry ?? resolve(cwd, "registry");
}
