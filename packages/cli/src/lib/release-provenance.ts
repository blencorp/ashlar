import { spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

type PackageManifest = {
  name?: unknown;
  private?: unknown;
  publishConfig?: {
    access?: unknown;
    provenance?: unknown;
  };
  repository?: unknown;
  version?: unknown;
};

export type ReleaseProvenancePackage = {
  directory: string;
  name: string;
  version: string;
};

export type ReleaseProvenanceReadiness = {
  errors: string[];
  packages: ReleaseProvenancePackage[];
  warnings: string[];
};

export type PublicProvenanceVerification = {
  errors: string[];
  packages: Array<{
    name: string;
    version: string;
  }>;
};

type VerifyPublicProvenanceInput = {
  cwd: string;
  npmPath?: string;
  packages?: string[];
  registryUrl?: string;
};

const releasePackageDirs = ["packages/schemas", "packages/cli", "packages/ashlar"];
const expectedRepositoryUrl = "https://github.com/blencorp/ashlar.git";
const ciWorkflowPath = ".github/workflows/ci.yml";
const publishWorkflowPath = ".github/workflows/publish.yml";

function readJson<T>(path: string): T {
  return JSON.parse(readFileSync(path, "utf8")) as T;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function repositoryUrl(repository: unknown): string | undefined {
  if (typeof repository === "string") {
    return repository;
  }
  if (isRecord(repository) && typeof repository.url === "string") {
    return repository.url;
  }
  return undefined;
}

function repositoryDirectory(repository: unknown): string | undefined {
  if (isRecord(repository) && typeof repository.directory === "string") {
    return repository.directory;
  }
  return undefined;
}

function checkReleasePackage(
  cwd: string,
  directory: string,
): {
  errors: string[];
  packageEntry?: ReleaseProvenancePackage;
} {
  const manifestPath = join(cwd, directory, "package.json");
  const label = `${directory}/package.json`;
  const errors: string[] = [];

  if (!existsSync(manifestPath)) {
    return { errors: [`${label}: package manifest is missing`] };
  }

  const manifest = readJson<PackageManifest>(manifestPath);
  const packageName = typeof manifest.name === "string" ? manifest.name : directory;
  const packageVersion = typeof manifest.version === "string" ? manifest.version : "0.0.0";

  if (manifest.private === true) {
    errors.push(`${label}: package must not be private`);
  }
  if (manifest.publishConfig?.access !== "public") {
    errors.push(`${label}: publishConfig.access must be "public"`);
  }
  if (manifest.publishConfig?.provenance !== true) {
    errors.push(`${label}: publishConfig.provenance must be true`);
  }
  if (repositoryUrl(manifest.repository) !== expectedRepositoryUrl) {
    errors.push(`${label}: repository.url must be ${expectedRepositoryUrl}`);
  }
  if (repositoryDirectory(manifest.repository) !== directory) {
    errors.push(`${label}: repository.directory must be ${directory}`);
  }

  return {
    errors,
    packageEntry: {
      directory,
      name: packageName,
      version: packageVersion,
    },
  };
}

function checkCiWorkflow(cwd: string): string[] {
  const path = join(cwd, ciWorkflowPath);
  if (!existsSync(path)) {
    return [`${ciWorkflowPath}: workflow is missing`];
  }

  const workflow = readFileSync(path, "utf8");
  const errors: string[] = [];
  if (!/^\s*id-token:\s*write(?:\s+#.*)?$/m.test(workflow)) {
    errors.push(`${ciWorkflowPath}: permissions.id-token must be write`);
  }
  if (!/^\s*runs-on:\s*ubuntu-latest(?:\s+#.*)?$/m.test(workflow)) {
    errors.push(`${ciWorkflowPath}: release checks must run on a GitHub-hosted runner`);
  }
  if (!/\brelease\s+provenance-check\b/.test(workflow)) {
    errors.push(`${ciWorkflowPath}: must run ashlar release provenance-check in CI`);
  }

  return errors;
}

function checkPublishWorkflow(cwd: string): string[] {
  const path = join(cwd, publishWorkflowPath);
  if (!existsSync(path)) {
    return [`${publishWorkflowPath}: workflow is missing`];
  }

  const workflow = readFileSync(path, "utf8");
  const errors: string[] = [];
  if (!/^\s*workflow_dispatch:\s*$/m.test(workflow)) {
    errors.push(`${publishWorkflowPath}: must be manually dispatchable for controlled releases`);
  }
  if (!/^\s*id-token:\s*write(?:\s+#.*)?$/m.test(workflow)) {
    errors.push(`${publishWorkflowPath}: permissions.id-token must be write`);
  }
  if (!/^\s*contents:\s*read(?:\s+#.*)?$/m.test(workflow)) {
    errors.push(`${publishWorkflowPath}: permissions.contents should be read`);
  }
  if (!/github\.ref\s*==\s*'refs\/heads\/main'/.test(workflow)) {
    errors.push(`${publishWorkflowPath}: workflow must restrict npm publishing to refs/heads/main`);
  }
  if (!/^\s*runs-on:\s*ubuntu-latest(?:\s+#.*)?$/m.test(workflow)) {
    errors.push(`${publishWorkflowPath}: publish job must run on a GitHub-hosted runner`);
  }
  if (!/registry-url:\s*https:\/\/registry\.npmjs\.org(?:\s+#.*)?/.test(workflow)) {
    errors.push(`${publishWorkflowPath}: actions/setup-node must target registry.npmjs.org`);
  }
  if (!/package-manager-cache:\s*false(?:\s+#.*)?/.test(workflow)) {
    errors.push(`${publishWorkflowPath}: release builds must disable package-manager cache`);
  }
  if (!/\brelease\s+provenance-check\b/.test(workflow)) {
    errors.push(`${publishWorkflowPath}: must run ashlar release provenance-check before publish`);
  }
  if (!/\bpnpm\s+release\b/.test(workflow)) {
    errors.push(`${publishWorkflowPath}: must publish with pnpm release`);
  }
  if (!/\brelease\s+provenance-verify-public\b/.test(workflow)) {
    errors.push(`${publishWorkflowPath}: must verify public npm provenance after publish`);
  }
  if (
    !/release\s+provenance-verify-public[^\n]*--json\s*>\s*reports\/ashlar-npm-provenance\.json/.test(
      workflow,
    )
  ) {
    errors.push(`${publishWorkflowPath}: must write public npm provenance JSON after publish`);
  }
  if (!/NPM_CONFIG_PROVENANCE:\s*["']?true["']?/.test(workflow)) {
    errors.push(`${publishWorkflowPath}: must force NPM_CONFIG_PROVENANCE=true`);
  }
  if (/\b(?:NODE_AUTH_TOKEN|NPM_TOKEN)\b/.test(workflow)) {
    errors.push(
      `${publishWorkflowPath}: must not use long-lived npm tokens for trusted publishing`,
    );
  }

  return errors;
}

export function checkReleaseProvenanceReadiness(cwd: string): ReleaseProvenanceReadiness {
  const errors: string[] = [];
  const packages: ReleaseProvenancePackage[] = [];

  for (const directory of releasePackageDirs) {
    const result = checkReleasePackage(cwd, directory);
    errors.push(...result.errors);
    if (result.packageEntry) {
      packages.push(result.packageEntry);
    }
  }

  errors.push(...checkCiWorkflow(cwd));
  errors.push(...checkPublishWorkflow(cwd));

  return {
    errors,
    packages,
    warnings: [
      "npmjs.com trusted publisher settings are manual: configure @blen/ashlar, @blen/ashlar-cli, and @blen/ashlar-schemas with workflow filename publish.yml before release.",
    ],
  };
}

function packageSpec(pkg: { name: string; version: string }): string {
  return `${pkg.name}@${pkg.version}`;
}

function parsePackageSpec(spec: string): { name: string; version: string } {
  const splitAt = spec.lastIndexOf("@");
  if (splitAt <= 0) {
    throw new Error(`Package spec must include an exact version: ${spec}`);
  }

  const name = spec.slice(0, splitAt);
  const version = spec.slice(splitAt + 1);
  if (!name || !version || version === "latest") {
    throw new Error(`Package spec must include an exact version: ${spec}`);
  }

  return { name, version };
}

function collectReleasePackageSpecs(
  cwd: string,
  specs: string[] | undefined,
): Array<{
  name: string;
  version: string;
}> {
  if (specs && specs.length > 0) {
    return specs.map(parsePackageSpec);
  }

  return releasePackageDirs.map((directory) => {
    const result = checkReleasePackage(cwd, directory);
    if (!result.packageEntry) {
      throw new Error(`Release package manifest is missing: ${directory}/package.json`);
    }
    return {
      name: result.packageEntry.name,
      version: result.packageEntry.version,
    };
  });
}

function runNpm(input: { args: string[]; cwd: string; npmPath: string }): {
  output: string;
  status: number;
} {
  const result = spawnSync(input.npmPath, input.args, {
    cwd: input.cwd,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });

  return {
    output: `${result.stdout ?? ""}${result.stderr ?? ""}`,
    status: result.status ?? 1,
  };
}

function allValues(value: unknown): unknown[] {
  if (Array.isArray(value)) {
    return value.flatMap(allValues);
  }
  if (isRecord(value)) {
    return [value, ...Object.values(value).flatMap(allValues)];
  }
  return [value];
}

function decodedPayloads(value: unknown): unknown[] {
  return allValues(value)
    .filter((item): item is string => typeof item === "string")
    .flatMap((item) => {
      try {
        const decoded = Buffer.from(item, "base64").toString("utf8");
        if (!decoded.trim().startsWith("{") && !decoded.trim().startsWith("[")) {
          return [];
        }
        return [JSON.parse(decoded) as unknown];
      } catch {
        return [];
      }
    });
}

function normalizedPackageEvidence(decoded: unknown[]): string {
  return JSON.stringify(decoded).toLowerCase();
}

function packageMentioned(evidence: string, pkg: { name: string; version: string }): boolean {
  const encodedName = pkg.name.replace("/", "%2f").toLowerCase();
  const name = pkg.name.toLowerCase();
  const version = pkg.version.toLowerCase();

  return (
    evidence.includes(`${name}@${version}`) ||
    evidence.includes(`"name":"${name}"`) ||
    evidence.includes(`pkg:npm/${encodedName}@${version}`) ||
    evidence.includes(`pkg:npm/${encodeURIComponent(pkg.name).toLowerCase()}@${version}`)
  );
}

export function verifyPublicNpmProvenance(
  input: VerifyPublicProvenanceInput,
): PublicProvenanceVerification {
  const packages = collectReleasePackageSpecs(input.cwd, input.packages);
  const npmPath = input.npmPath ?? "npm";
  const registryUrl = input.registryUrl ?? "https://registry.npmjs.org";
  const workspace = mkdtempSync(join(tmpdir(), "ashlar-public-provenance-"));
  const errors: string[] = [];

  try {
    writeFileSync(
      join(workspace, "package.json"),
      `${JSON.stringify(
        {
          private: true,
          dependencies: Object.fromEntries(packages.map((pkg) => [pkg.name, pkg.version])),
        },
        null,
        2,
      )}\n`,
    );

    const install = runNpm({
      args: ["install", "--ignore-scripts", "--registry", registryUrl],
      cwd: workspace,
      npmPath,
    });
    if (install.status !== 0) {
      return {
        errors: [`npm install for public provenance verification failed:\n${install.output}`],
        packages,
      };
    }

    const audit = runNpm({
      args: ["audit", "signatures", "--json", "--include-attestations", "--registry", registryUrl],
      cwd: workspace,
      npmPath,
    });
    if (audit.status !== 0) {
      return {
        errors: [`npm audit signatures failed:\n${audit.output}`],
        packages,
      };
    }

    let auditJson: unknown;
    try {
      auditJson = JSON.parse(audit.output);
    } catch (error) {
      return {
        errors: [
          `npm audit signatures did not return JSON: ${
            error instanceof Error ? error.message : String(error)
          }`,
        ],
        packages,
      };
    }

    const decoded = decodedPayloads(auditJson);
    if (decoded.length === 0) {
      errors.push(
        "npm audit signatures output did not include decodable provenance attestation payloads.",
      );
    }

    const evidence = normalizedPackageEvidence(decoded);
    if (!evidence.includes("github.com/blencorp/ashlar")) {
      errors.push("npm provenance output does not reference github.com/blencorp/ashlar.");
    }
    if (!evidence.includes("publish.yml")) {
      errors.push("npm provenance output does not reference the publish.yml workflow.");
    }

    for (const pkg of packages) {
      if (!packageMentioned(evidence, pkg)) {
        errors.push(`npm provenance output does not include ${packageSpec(pkg)}.`);
      }
    }

    return { errors, packages };
  } finally {
    rmSync(workspace, { recursive: true, force: true });
  }
}
