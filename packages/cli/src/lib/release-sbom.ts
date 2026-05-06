import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

type PackageJson = {
  name: string;
  version: string;
  dependencies?: Record<string, string>;
};

type SpdxPackage = {
  SPDXID: string;
  name: string;
  versionInfo?: string;
  supplier: string;
  downloadLocation: string;
  filesAnalyzed: boolean;
  externalRefs?: Array<{
    referenceCategory: "PACKAGE-MANAGER";
    referenceType: "purl";
    referenceLocator: string;
  }>;
};

type SpdxRelationship = {
  spdxElementId: string;
  relationshipType: "DESCRIBES" | "DEPENDS_ON";
  relatedSpdxElement: string;
};

export type ReleaseSbom = {
  spdxVersion: "SPDX-2.3";
  dataLicense: "CC0-1.0";
  SPDXID: "SPDXRef-DOCUMENT";
  name: "Ashlar release SBOM";
  documentNamespace: string;
  creationInfo: {
    created: string;
    creators: string[];
  };
  packages: SpdxPackage[];
  relationships: SpdxRelationship[];
};

type ReleasePackage = {
  directory: string;
  manifest: PackageJson;
};

const releasePackageDirs = ["packages/schemas", "packages/cli", "packages/ashlar"];

function readJson<T>(path: string): T {
  return JSON.parse(readFileSync(path, "utf8")) as T;
}

function spdxPackageId(name: string): string {
  return `SPDXRef-Package-${name.replace(/^@/, "").replace(/[^a-zA-Z0-9]+/g, "-")}`;
}

function packageUrl(name: string, version: string | undefined): string {
  const encodedName = name.startsWith("@")
    ? name.replace("/", "%2F").replace("@", "%40")
    : name;
  return `pkg:npm/${encodedName}${version ? `@${version}` : ""}`;
}

function readReleasePackages(cwd: string): ReleasePackage[] {
  return releasePackageDirs.map((directory) => ({
    directory,
    manifest: readJson<PackageJson>(join(cwd, directory, "package.json")),
  }));
}

function importerBlock(lockfile: string, importer: string): string {
  const marker = `  ${importer}:`;
  const start = lockfile.indexOf(marker);
  if (start === -1) {
    return "";
  }

  const rest = lockfile.slice(start + marker.length);
  const nextImporter = rest.search(/\n {2}[^\s][^:\n]*:/);
  return nextImporter === -1 ? rest : rest.slice(0, nextImporter);
}

function dependencySection(block: string): string {
  const start = block.indexOf("\n    dependencies:");
  if (start === -1) {
    return "";
  }

  const rest = block.slice(start + "\n    dependencies:".length);
  const nextSection = rest.search(/\n {4}[^\s][^:\n]*:/);
  return nextSection === -1 ? rest : rest.slice(0, nextSection);
}

function resolvedLockVersions(cwd: string, importer: string): Map<string, string> {
  const lockfile = readFileSync(join(cwd, "pnpm-lock.yaml"), "utf8");
  const section = dependencySection(importerBlock(lockfile, importer));
  const versions = new Map<string, string>();
  const dependencyBlocks = section.split(/\n(?= {6}['"@a-zA-Z0-9_.-][^:\n]*:)/);

  for (const block of dependencyBlocks) {
    const nameMatch = block.match(/^\s{6}['"]?([^:'"\n]+(?:\/[^:'"\n]+)?)['"]?:/);
    const versionMatch = block.match(/\n\s{8}version:\s+([^\s\n]+)/);
    if (!nameMatch || !versionMatch) {
      continue;
    }

    const name = nameMatch[1];
    const rawVersion = versionMatch[1];
    if (!name || !rawVersion) {
      continue;
    }

    const version = rawVersion.replace(/\(.+\)$/, "");
    versions.set(name, version);
  }

  return versions;
}

function packageEntry(name: string, version: string | undefined, supplier: string): SpdxPackage {
  return {
    SPDXID: spdxPackageId(name),
    name,
    versionInfo: version,
    supplier,
    downloadLocation: "NOASSERTION",
    filesAnalyzed: false,
    externalRefs: version
      ? [
          {
            referenceCategory: "PACKAGE-MANAGER",
            referenceType: "purl",
            referenceLocator: packageUrl(name, version),
          },
        ]
      : undefined,
  };
}

export function buildReleaseSbom(cwd: string, created = new Date()): ReleaseSbom {
  const releasePackages = readReleasePackages(cwd);
  const workspaceVersions = new Map(
    releasePackages.map(({ manifest }) => [manifest.name, manifest.version]),
  );
  const packages = new Map<string, SpdxPackage>();
  const relationships: SpdxRelationship[] = [];

  for (const { directory, manifest } of releasePackages) {
    const id = spdxPackageId(manifest.name);
    packages.set(id, packageEntry(manifest.name, manifest.version, "Organization: BLEN"));
    relationships.push({
      spdxElementId: "SPDXRef-DOCUMENT",
      relationshipType: "DESCRIBES",
      relatedSpdxElement: id,
    });

    const lockVersions = resolvedLockVersions(cwd, directory);
    for (const dependency of Object.keys(manifest.dependencies ?? {}).sort()) {
      const version = workspaceVersions.get(dependency) ?? lockVersions.get(dependency);
      const dependencyId = spdxPackageId(dependency);
      if (!packages.has(dependencyId)) {
        packages.set(dependencyId, packageEntry(dependency, version, "NOASSERTION"));
      }
      relationships.push({
        spdxElementId: id,
        relationshipType: "DEPENDS_ON",
        relatedSpdxElement: dependencyId,
      });
    }
  }

  const stamp = created.toISOString();
  return {
    spdxVersion: "SPDX-2.3",
    dataLicense: "CC0-1.0",
    SPDXID: "SPDXRef-DOCUMENT",
    name: "Ashlar release SBOM",
    documentNamespace: `https://ashlar.dev/sbom/ashlar-${stamp}`,
    creationInfo: {
      created: stamp,
      creators: ["Tool: ashlar release sbom", "Organization: BLEN"],
    },
    packages: Array.from(packages.values()).sort((left, right) =>
      left.name.localeCompare(right.name),
    ),
    relationships: relationships.sort((left, right) =>
      `${left.spdxElementId}:${left.relatedSpdxElement}`.localeCompare(
        `${right.spdxElementId}:${right.relatedSpdxElement}`,
      ),
    ),
  };
}

export function writeReleaseSbom(cwd: string, output: string): ReleaseSbom {
  const sbom = buildReleaseSbom(cwd);
  mkdirSync(dirname(output), { recursive: true });
  writeFileSync(output, `${JSON.stringify(sbom, null, 2)}\n`);
  return sbom;
}
