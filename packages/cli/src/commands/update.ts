import { execFileSync } from "node:child_process";
import {
  existsSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
  copyFileSync,
  mkdirSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { createInterface } from "node:readline/promises";
import type { Command } from "commander";
import { writeAgentsContext } from "../lib/agents.js";
import { readVerifiedCapsuleManifest } from "../lib/capsule.js";
import { applyCapsuleCodemods } from "../lib/codemod.js";
import { writeDesignContext } from "../lib/design-context.js";
import { sha256File, sha256Text } from "../lib/hash.js";
import { readConfig, readLockfile, writeJson, type AshlarLockfile } from "../lib/project.js";
import {
  getComponent,
  getComponentVersion,
  readRegistryIndex,
  type RegistryComponent,
} from "../lib/registry.js";
import { syncAshlarProject } from "../lib/styles.js";

type UpdateOptions = {
  prompt?: boolean;
  resolved?: string;
  survivalReport?: string;
  yes?: boolean;
};

type MergeResult = { status: "clean"; contents: string } | { status: "conflict"; contents: string };

type UpdateFileCounts = {
  added: number;
  conflicts: number;
  files: number;
  merged: number;
  replaced: number;
};

type UpdateCodemodCounts = {
  filesChanged: number;
  replacements: number;
  rulesApplied: number;
};

type UpdateSurvivalEntry = {
  codemods: UpdateCodemodCounts;
  component: string;
  files: UpdateFileCounts;
  fromVersion: string;
  status: "current" | "updated" | "conflicted";
  toVersion: string;
  touchedCriticalFiles: string[];
};

type UpdateComponentResult = {
  code: number;
  report?: UpdateSurvivalEntry;
};

type UpdateReviewPreview = {
  file: string;
  lines: string[];
};

function emptyFileCounts(): UpdateFileCounts {
  return {
    added: 0,
    conflicts: 0,
    files: 0,
    merged: 0,
    replaced: 0,
  };
}

function summarizeSurvival(updates: UpdateSurvivalEntry[]) {
  const totals = updates.reduce(
    (next, update) => {
      next.added += update.files.added;
      next.codemodFilesChanged += update.codemods.filesChanged;
      next.codemodReplacements += update.codemods.replacements;
      next.codemodRulesApplied += update.codemods.rulesApplied;
      next.conflicts += update.files.conflicts;
      next.files += update.files.files;
      next.merged += update.files.merged;
      next.replaced += update.files.replaced;
      return next;
    },
    {
      added: 0,
      codemodFilesChanged: 0,
      codemodReplacements: 0,
      codemodRulesApplied: 0,
      conflicts: 0,
      conflictRate: 0,
      files: 0,
      merged: 0,
      replaced: 0,
    },
  );

  totals.conflictRate = totals.files === 0 ? 0 : totals.conflicts / totals.files;

  return {
    schemaVersion: "1.0",
    totals: {
      components: updates.length,
      ...totals,
    },
    updates,
  };
}

function updateReviewMessage(input: {
  component: string;
  fromVersion: string;
  previews?: UpdateReviewPreview[];
  toVersion: string;
  touchedCriticalFiles: string[];
}): string {
  const previewLines =
    input.previews && input.previews.length > 0
      ? [
          "",
          "Review preview:",
          ...input.previews.flatMap((preview) => [
            `  ${preview.file}`,
            ...preview.lines.map((line) => `    ${line}`),
          ]),
        ]
      : [];

  return [
    `Ashlar update requires review for ${input.component}: ${input.fromVersion} -> ${input.toVersion}`,
    "",
    "Accessibility-critical files:",
    ...input.touchedCriticalFiles.map((file) => `  - ${file}`),
    "",
    "Why review matters:",
    "  These files can change focus visibility, forced-colors behavior, accessible names, or semantic markup.",
    ...previewLines,
    "",
    `Run after review: ashlar update ${input.component} --yes`,
  ].join("\n");
}

async function confirmReviewedUpdate(forcePrompt: boolean): Promise<boolean> {
  if (!forcePrompt && !process.stdin.isTTY) {
    return false;
  }

  const prompt = createInterface({ input: process.stdin, output: process.stdout });
  try {
    const answer = await prompt.question("Apply this update after review? [y/N] ");
    return /^(y|yes)$/i.test(answer.trim());
  } finally {
    prompt.close();
  }
}

function diffPreview(basePath: string, upstreamPath: string): string[] {
  try {
    execFileSync(
      "git",
      ["diff", "--no-index", "--no-color", "--unified=3", basePath, upstreamPath],
      {
        encoding: "utf8",
        stdio: ["ignore", "pipe", "pipe"],
      },
    );
    return [];
  } catch (error) {
    const failed = error as { status?: number; stdout?: Buffer | string };
    if (failed.status !== 1) {
      throw error;
    }

    const stdout = Buffer.isBuffer(failed.stdout)
      ? failed.stdout.toString("utf8")
      : (failed.stdout ?? "");

    return stdout
      .split("\n")
      .filter(
        (line) =>
          line !== "" &&
          !line.startsWith("diff --git ") &&
          !line.startsWith("index ") &&
          !line.startsWith("--- ") &&
          !line.startsWith("+++ "),
      )
      .slice(0, 24);
  }
}

function containsConflictMarkers(path: string): boolean {
  return readFileSync(path, "utf8").includes("<<<<<<<");
}

function threeWayMerge(local: string, base: string, upstream: string): MergeResult {
  const dir = mkdtempSync(join(tmpdir(), "ashlar-merge-"));
  const localPath = join(dir, "local");
  const basePath = join(dir, "base");
  const upstreamPath = join(dir, "upstream");

  try {
    writeFileSync(localPath, local);
    writeFileSync(basePath, base);
    writeFileSync(upstreamPath, upstream);

    try {
      const contents = execFileSync(
        "git",
        ["merge-file", "--diff3", "-p", localPath, basePath, upstreamPath],
        { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] },
      );
      return { status: "clean", contents };
    } catch (error) {
      const failed = error as { status?: number; stdout?: Buffer | string };
      const contents = Buffer.isBuffer(failed.stdout)
        ? failed.stdout.toString("utf8")
        : (failed.stdout ?? "");

      if (failed.status === 1) {
        return { status: "conflict", contents };
      }

      throw error;
    }
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

function refreshCurrentHashes(lockfile: AshlarLockfile): void {
  for (const component of Object.values(lockfile.components)) {
    for (const [file, hashes] of Object.entries(component.files)) {
      if (existsSync(file)) {
        hashes.current_hash = sha256File(file);
      }
    }
  }
}

function targetPathFor(configComponentsDir: string, name: string, file: string): string {
  return join(configComponentsDir, name, file);
}

function updateVersionPath(input: {
  component: string;
  cwd: string;
  fromVersion: string;
  registry: string;
  toVersion: string;
}): string[] {
  const index = readRegistryIndex(input.cwd, input.registry);
  const component = index.components[input.component];

  if (!component) {
    throw new Error(`Unknown Ashlar component: ${input.component}`);
  }

  const fromIndex = component.versions.indexOf(input.fromVersion);
  const toIndex = component.versions.indexOf(input.toVersion);

  if (fromIndex === -1) {
    throw new Error(
      `Registry index for ${input.component} does not include installed version: ${input.fromVersion}`,
    );
  }
  if (toIndex === -1) {
    throw new Error(
      `Registry index for ${input.component} does not include target version: ${input.toVersion}`,
    );
  }
  if (toIndex < fromIndex) {
    throw new Error(
      `Registry index for ${input.component} orders target version ${input.toVersion} before installed version ${input.fromVersion}`,
    );
  }

  return component.versions.slice(fromIndex + 1, toIndex + 1);
}

type VerifiedUpdateStep = {
  component: RegistryComponent;
  manifest: ReturnType<typeof readVerifiedCapsuleManifest>;
};

function verifiedUpdateSteps(input: {
  component: string;
  cwd: string;
  fromVersion: string;
  registry: string;
  toVersion: string;
}): VerifiedUpdateStep[] {
  return updateVersionPath(input).map((version) => {
    const component = getComponentVersion(input.cwd, input.component, version, input.registry);
    const manifest = readVerifiedCapsuleManifest({
      directory: component.directory,
      name: input.component,
      version: component.version,
      layer: component.layer,
      stability: component.stability,
      registryCapsuleHash: component.capsuleHash,
      trustRoot: component.trustRoot,
    });

    return { component, manifest };
  });
}

function finalizeResolved(componentName: string, options: { cwd: string }): number {
  const config = readConfig();
  const lockfile = readLockfile();
  const installed = lockfile.components[componentName];

  if (!installed) {
    console.error(`Ashlar component is not installed: ${componentName}`);
    return 1;
  }

  const latest = getComponent(options.cwd, componentName, config.registry);
  const manifest = readVerifiedCapsuleManifest({
    directory: latest.directory,
    name: componentName,
    version: latest.version,
    layer: latest.layer,
    stability: latest.stability,
    registryCapsuleHash: latest.capsuleHash,
    trustRoot: latest.trustRoot,
  });

  for (const [file, originalHash] of Object.entries(manifest.files)) {
    const target = targetPathFor(config.componentsDir, componentName, file);
    if (!existsSync(target)) {
      console.error(`Cannot resolve ${componentName}; installed file is missing: ${target}`);
      return 1;
    }
    if (containsConflictMarkers(target)) {
      console.error(`Conflict markers remain in ${target}`);
      return 1;
    }

    installed.files[target] = {
      original_hash: originalHash,
      current_hash: sha256File(target),
      critical_for_a11y: file.endsWith(".css") || file.endsWith(".html"),
    };
  }

  installed.version = latest.version;
  installed.capsule_hash = manifest.capsule_hash;
  installed.stability = manifest.stability;
  refreshCurrentHashes(lockfile);
  writeJson("ashlar-lock.json", lockfile);
  syncAshlarProject(options.cwd, config, lockfile);
  writeAgentsContext("AGENTS.md", config, lockfile);
  writeDesignContext("DESIGN.md", config, lockfile, { cwd: options.cwd, force: true });
  console.log(`Resolved ${componentName}@${latest.version}`);
  return 0;
}

async function updateComponent(
  componentName: string,
  options: { cwd: string; prompt: boolean; yes: boolean },
): Promise<UpdateComponentResult> {
  const config = readConfig();
  const lockfile = readLockfile();
  const installed = lockfile.components[componentName];

  if (!installed) {
    console.error(`Ashlar component is not installed: ${componentName}`);
    return { code: 1 };
  }

  const locked = getComponentVersion(
    options.cwd,
    componentName,
    installed.version,
    config.registry,
  );
  const latest = getComponent(options.cwd, componentName, config.registry);

  refreshCurrentHashes(lockfile);

  if (latest.version === installed.version) {
    console.log(`${componentName}@${installed.version} is current`);
    writeJson("ashlar-lock.json", lockfile);
    return {
      code: 0,
      report: {
        codemods: { filesChanged: 0, replacements: 0, rulesApplied: 0 },
        component: componentName,
        files: emptyFileCounts(),
        fromVersion: installed.version,
        status: "current",
        toVersion: installed.version,
        touchedCriticalFiles: [],
      },
    };
  }

  const steps = verifiedUpdateSteps({
    component: componentName,
    cwd: options.cwd,
    fromVersion: installed.version,
    registry: config.registry,
    toVersion: latest.version,
  });
  const latestStep = steps.at(-1);
  if (!latestStep) {
    console.log(`${componentName}@${installed.version} is current`);
    writeJson("ashlar-lock.json", lockfile);
    return {
      code: 0,
      report: {
        codemods: { filesChanged: 0, replacements: 0, rulesApplied: 0 },
        component: componentName,
        files: emptyFileCounts(),
        fromVersion: installed.version,
        status: "current",
        toVersion: installed.version,
        touchedCriticalFiles: [],
      },
    };
  }
  const latestManifest = latestStep.manifest;

  const criticalFiles = Object.keys(latestManifest.files).filter(
    (file) => file.endsWith(".css") || file.endsWith(".html"),
  );
  const touchedCriticalFiles = criticalFiles.map((file) =>
    targetPathFor(config.componentsDir, componentName, file),
  );

  if (touchedCriticalFiles.length > 0 && !options.yes) {
    console.error(
      updateReviewMessage({
        component: componentName,
        fromVersion: installed.version,
        previews: criticalFiles
          .map((file) => ({
            file: targetPathFor(config.componentsDir, componentName, file),
            lines: diffPreview(join(locked.directory, file), join(latest.directory, file)),
          }))
          .filter((preview) => preview.lines.length > 0),
        toVersion: latest.version,
        touchedCriticalFiles,
      }),
    );
    if (!(await confirmReviewedUpdate(options.prompt))) {
      console.error(
        "Update not applied. Re-run with --yes after review or answer yes at the prompt.",
      );
      return { code: 1 };
    }
  }

  const codemods: UpdateCodemodCounts = { filesChanged: 0, replacements: 0, rulesApplied: 0 };
  let codemodFromVersion = installed.version;
  for (const step of steps) {
    const applied = applyCapsuleCodemods({
      approveConfirmedRules: options.yes,
      component: componentName,
      componentsDir: config.componentsDir,
      fromVersion: codemodFromVersion,
      manifest: step.manifest,
      registryDirectory: step.component.directory,
    });
    codemods.filesChanged += applied.filesChanged;
    codemods.replacements += applied.replacements;
    codemods.rulesApplied += applied.rulesApplied;
    codemodFromVersion = step.component.version;
  }
  if (codemods.replacements > 0) {
    console.log(
      `✓ ${componentName}: applied ${codemods.replacements} codemod replacement(s) in ${codemods.filesChanged} file(s)`,
    );
  }

  const files = emptyFileCounts();

  for (const [file, upstreamHash] of Object.entries(latestManifest.files)) {
    files.files += 1;
    const target = targetPathFor(config.componentsDir, componentName, file);
    const basePath = join(locked.directory, file);
    const upstreamPath = join(latest.directory, file);
    const upstream = readFileSync(upstreamPath, "utf8");
    const critical = file.endsWith(".css") || file.endsWith(".html");

    mkdirSync(dirname(target), { recursive: true });

    if (!existsSync(target) || !existsSync(basePath)) {
      copyFileSync(upstreamPath, target);
      installed.files[target] = {
        original_hash: upstreamHash,
        current_hash: upstreamHash,
        critical_for_a11y: critical,
      };
      files.added += 1;
      console.log(`+ ${componentName}: ${target}`);
      continue;
    }

    const currentHash = sha256File(target);
    const tracked = installed.files[target] ?? {
      original_hash: sha256File(basePath),
      current_hash: currentHash,
      critical_for_a11y: critical,
    };
    const local = readFileSync(target, "utf8");
    const base = readFileSync(basePath, "utf8");

    if (currentHash === tracked.original_hash) {
      writeFileSync(target, upstream);
      installed.files[target] = {
        original_hash: upstreamHash,
        current_hash: upstreamHash,
        critical_for_a11y: critical,
      };
      files.replaced += 1;
      console.log(`✓ ${componentName}: replaced ${target}`);
      continue;
    }

    const merge = threeWayMerge(local, base, upstream);
    writeFileSync(target, merge.contents);
    installed.files[target] = {
      original_hash: upstreamHash,
      current_hash: sha256Text(merge.contents),
      critical_for_a11y: critical,
    };

    if (merge.status === "conflict") {
      files.conflicts += 1;
      console.warn(`! ${componentName}: conflict in ${target}`);
    } else {
      files.merged += 1;
      console.log(`✓ ${componentName}: merged ${target}`);
    }
  }

  installed.version = latest.version;
  installed.capsule_hash = latestManifest.capsule_hash;
  installed.stability = latestManifest.stability;
  refreshCurrentHashes(lockfile);
  writeJson("ashlar-lock.json", lockfile);
  syncAshlarProject(options.cwd, config, lockfile);
  writeAgentsContext("AGENTS.md", config, lockfile);
  writeDesignContext("DESIGN.md", config, lockfile, { cwd: options.cwd, force: true });

  const report: UpdateSurvivalEntry = {
    codemods,
    component: componentName,
    files,
    fromVersion: locked.version,
    status: files.conflicts > 0 ? "conflicted" : "updated",
    toVersion: latest.version,
    touchedCriticalFiles,
  };

  if (files.conflicts > 0) {
    console.error(
      `Update wrote ${files.conflicts} conflicted file(s). Resolve markers and run \`ashlar update --resolved ${componentName}\`.`,
    );
    return { code: 1, report };
  }

  console.log(`Updated ${componentName}: ${locked.version} -> ${latest.version}`);
  return { code: 0, report };
}

export function registerUpdateCommand(program: Command) {
  program
    .command("update")
    .description("Update installed Ashlar capsules from the configured registry")
    .argument("[components...]", "Installed component names")
    .option("--prompt", "Prompt for approval after showing review output")
    .option("--resolved <component>", "Finalize a component after resolving merge conflicts")
    .option("--survival-report <path>", "Write a JSON update survival report")
    .option("--yes", "Confirm accessibility-critical file updates")
    .action(async (components: string[] | undefined, options: UpdateOptions) => {
      if (!existsSync("ashlar-lock.json")) {
        console.error("ashlar-lock.json not found. Run `ashlar init` first.");
        process.exitCode = 1;
        return;
      }

      if (options.resolved) {
        process.exitCode = finalizeResolved(options.resolved, { cwd: process.cwd() });
        return;
      }

      const lockfile = readLockfile();
      const targets =
        components && components.length > 0 ? components : Object.keys(lockfile.components).sort();

      if (targets.length === 0) {
        console.log("No installed components to update");
        return;
      }

      let failures = 0;
      const reports: UpdateSurvivalEntry[] = [];
      for (const component of targets) {
        const result = await updateComponent(component, {
          cwd: process.cwd(),
          prompt: Boolean(options.prompt),
          yes: Boolean(options.yes),
        });
        failures += result.code;
        if (result.report) {
          reports.push(result.report);
        }
      }

      if (options.survivalReport) {
        writeJson(options.survivalReport, summarizeSurvival(reports));
      }

      if (failures > 0) {
        process.exitCode = 1;
      }
    });
}
