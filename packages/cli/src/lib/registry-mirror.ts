import { cpSync, existsSync, mkdirSync, rmSync } from "node:fs";
import { dirname, isAbsolute, relative, resolve } from "node:path";
import { readVerifiedCapsuleManifest } from "./capsule.js";
import { getComponentVersion, listComponents, resolveRegistryRoot } from "./registry.js";

type MirrorRegistryInput = {
  cwd: string;
  registryPath: string;
  output: string;
  force?: boolean;
};

export type MirrorRegistryResult = {
  components: number;
  versions: number;
  output: string;
};

function isSameOrInside(parent: string, child: string): boolean {
  const path = relative(parent, child);
  return path === "" || (!path.startsWith("..") && !isAbsolute(path));
}

function verifyRegistry(
  cwd: string,
  registryPath: string,
): { components: number; versions: number } {
  const components = listComponents(cwd, registryPath);
  let versions = 0;

  for (const component of components) {
    for (const version of component.versions) {
      const detail = getComponentVersion(cwd, component.name, version, registryPath);
      readVerifiedCapsuleManifest({
        directory: detail.directory,
        name: detail.name,
        version: detail.version,
        layer: detail.layer,
        stability: detail.stability,
        registryCapsuleHash: detail.capsuleHash,
        trustRoot: detail.trustRoot,
      });
      versions += 1;
    }
  }

  return { components: components.length, versions };
}

export function mirrorRegistry(input: MirrorRegistryInput): MirrorRegistryResult {
  const source = resolveRegistryRoot(input.cwd, input.registryPath);
  const output = resolve(input.cwd, input.output);

  if (isSameOrInside(source, output)) {
    throw new Error(`Mirror output cannot be inside the source registry: ${output}`);
  }

  const result = verifyRegistry(input.cwd, input.registryPath);

  if (existsSync(output)) {
    if (!input.force) {
      throw new Error(`Mirror output already exists: ${output}`);
    }
    rmSync(output, { recursive: true, force: true });
  }

  mkdirSync(dirname(output), { recursive: true });
  cpSync(source, output, { recursive: true });

  return { ...result, output };
}
