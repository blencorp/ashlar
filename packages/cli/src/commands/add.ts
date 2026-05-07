import { copyFileSync, existsSync, mkdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import type { Command } from "commander";
import { writeAgentsContext } from "../lib/agents.js";
import { readVerifiedCapsuleManifest } from "../lib/capsule.js";
import { applyCommandCwd, type CwdOption } from "../lib/cwd.js";
import { writeDesignContext } from "../lib/design-context.js";
import { sha256File } from "../lib/hash.js";
import { formatRegistryLayer } from "../lib/layers.js";
import { readConfig, readLockfile, writeJson } from "../lib/project.js";
import { getComponent, listComponents } from "../lib/registry.js";
import { syncAshlarProject } from "../lib/styles.js";
import {
  printBrandHeader,
  printCommand,
  printFooter,
  printKeyValue,
  printListItem,
  printSection,
  printSuccess,
} from "../lib/tui.js";

type AddOptions = CwdOption & {
  all?: boolean;
  diff?: boolean | string;
  dryRun?: boolean;
  overwrite?: boolean;
  path?: string;
  silent?: boolean;
  yes?: boolean;
  view?: boolean | string;
};

type InstallPlan = {
  detail: ReturnType<typeof getComponent>;
  files: Array<{
    criticalForA11y: boolean;
    expectedHash: string;
    source: string;
    target: string;
  }>;
  manifest: ReturnType<typeof readVerifiedCapsuleManifest>;
};

function buildInstallPlan(component: string, config: ReturnType<typeof readConfig>): InstallPlan {
  const detail = getComponent(process.cwd(), component, config.registry);
  const manifest = readVerifiedCapsuleManifest({
    directory: detail.directory,
    name: component,
    version: detail.version,
    layer: detail.layer,
    stability: detail.stability,
    registryCapsuleHash: detail.capsuleHash,
    trustRoot: detail.trustRoot,
  });

  return {
    detail,
    manifest,
    files: Object.entries(manifest.files)
      .map(([file, expectedHash]) => ({
        criticalForA11y: file.endsWith(".css") || file.endsWith(".html"),
        expectedHash,
        source: join(detail.directory, file),
        target: join(config.componentsDir, component, file),
      }))
      .sort((a, b) => a.target.localeCompare(b.target)),
  };
}

function renderDryRun(plans: InstallPlan[]): void {
  printBrandHeader("Previewing source-owned capsule installs");
  for (const plan of plans) {
    printSection(`${plan.detail.name}@${plan.detail.version}`);
    printKeyValue("tier", plan.detail.tier);
    printKeyValue("layer", formatRegistryLayer(plan.detail.layer));
    printKeyValue("stability", plan.detail.stability);
    printKeyValue("capsule hash", plan.manifest.capsule_hash);
    for (const file of plan.files) {
      const action = existsSync(file.target) ? "update" : "create";
      printListItem(`${action} ${file.target}`);
    }
  }

  printSection("No files changed on disk");
  printCommand(
    `ashlar add ${plans.map((plan) => plan.detail.name).join(" ")}`,
    "Run without preview flags when the planned writes look correct.",
  );
}

function renderView(plans: InstallPlan[]): void {
  printBrandHeader("Capsule install preview");
  for (const plan of plans) {
    printSection(`${plan.detail.name}@${plan.detail.version}`);
    printKeyValue("Tier", plan.detail.tier);
    printKeyValue("Layer", formatRegistryLayer(plan.detail.layer));
    printKeyValue("Stability", plan.detail.stability);
    printKeyValue("Evidence", plan.detail.evidence.accessibilityStatus);
    printKeyValue("Capsule hash", plan.manifest.capsule_hash);
    printKeyValue(
      "Platform features",
      plan.detail.platformFeatures.map((feature) => feature.feature).join(", ") || "none",
    );
    printKeyValue(
      "Policy mappings",
      plan.detail.policyMappings.map((mapping) => mapping.source).join(", ") || "none",
    );
    printKeyValue("Files", plan.files.length);
    for (const file of plan.files) {
      printListItem(file.target);
    }
  }
}

function splitLines(value: string): string[] {
  const lines = value.split("\n");
  if (lines.at(-1) === "") {
    lines.pop();
  }
  return lines;
}

function renderUnifiedDiff(target: string, before: string | undefined, after: string): string {
  if (before === after) {
    return [
      `diff --ashlar a/${target} b/${target}`,
      `--- a/${target}`,
      `+++ b/${target}`,
      "@@",
      " no changes",
    ].join("\n");
  }

  const beforePath = before === undefined ? "/dev/null" : `a/${target}`;
  const beforeLines = before === undefined ? [] : splitLines(before).map((line) => `-${line}`);
  const afterLines = splitLines(after).map((line) => `+${line}`);

  return [
    `diff --ashlar ${beforePath} b/${target}`,
    `--- ${beforePath}`,
    `+++ b/${target}`,
    "@@",
    ...beforeLines,
    ...afterLines,
  ].join("\n");
}

function renderDiff(plans: InstallPlan[]): void {
  printBrandHeader("Capsule install diff");
  for (const plan of plans) {
    printSection(`${plan.detail.name}@${plan.detail.version}`);
    for (const file of plan.files) {
      const before = existsSync(file.target) ? readFileSync(file.target, "utf8") : undefined;
      const after = readFileSync(file.source, "utf8");
      console.log(renderUnifiedDiff(file.target, before, after));
    }
  }

  printSection("No files changed on disk");
}

export function registerAddCommand(program: Command) {
  program
    .command("add")
    .argument("[components...]", "Component names")
    .description("Add component capsules from the configured registry")
    .option("-a, --all", "Add every available component in the configured registry")
    .option("-c, --cwd <path>", "Working directory. Defaults to the current directory.")
    .option("-o, --overwrite", "Overwrite existing component files")
    .option("-p, --path <path>", "Directory where component source should be installed")
    .option("-s, --silent", "Mute non-error output")
    .option("--dry-run", "Preview verified install writes without changing files")
    .option(
      "--diff [path]",
      "Show a source diff for verified install writes without changing files",
    )
    .option("--view [path]", "Show verified capsule metadata and target files before install")
    .option("-y, --yes", "Skip confirmation prompts. Present for shadcn CLI compatibility.")
    .action((components: string[], options: AddOptions) => {
      try {
        applyCommandCwd(options);
        const baseConfig = readConfig();
        const config = options.path ? { ...baseConfig, componentsDir: options.path } : baseConfig;
        const selectedComponents = options.all
          ? listComponents(process.cwd(), config.registry).map((component) => component.name)
          : components;

        if (selectedComponents.length === 0) {
          throw new Error("No Ashlar components requested. Pass component names or --all.");
        }

        const plans: InstallPlan[] = [];
        for (const component of selectedComponents) {
          plans.push(buildInstallPlan(component, config));
        }

        if (options.view || options.dryRun || options.diff) {
          if (options.silent) {
            return;
          }
          if (options.view) {
            renderView(plans);
          }
          if (options.dryRun) {
            renderDryRun(plans);
          }
          if (options.diff) {
            renderDiff(plans);
          }
          printFooter();
          return;
        }

        if (!options.silent) {
          printBrandHeader("Installing source-owned capsules");
        }
        const lockfile = readLockfile();

        for (const plan of plans) {
          const installedFiles: Record<
            string,
            { original_hash: string; current_hash: string; critical_for_a11y: boolean }
          > = {};

          for (const file of plan.files) {
            const target = file.target;
            if (existsSync(target) && !options.overwrite) {
              throw new Error(
                `Refusing to overwrite existing Ashlar source file: ${target}. Pass --overwrite to replace it.`,
              );
            }
            mkdirSync(dirname(target), { recursive: true });
            copyFileSync(file.source, target);
            const hash = sha256File(target);
            if (hash !== file.expectedHash) {
              throw new Error(
                `Installed file hash mismatch for ${plan.detail.name}@${plan.detail.version}: ${target}`,
              );
            }
            installedFiles[target] = {
              original_hash: file.expectedHash,
              current_hash: file.expectedHash,
              critical_for_a11y: file.criticalForA11y,
            };
          }

          lockfile.components[plan.detail.name] = {
            version: plan.detail.version,
            capsule_hash: plan.manifest.capsule_hash,
            stability: plan.manifest.stability,
            installed_at: new Date().toISOString(),
            installed_via: "ashlar-cli@0.0.0",
            files: installedFiles,
          };

          if (!options.silent) {
            printSuccess(`Added ${plan.detail.name}@${plan.detail.version}`);
            for (const file of Object.keys(installedFiles).sort()) {
              console.log(`  ${file}`);
            }
          }
        }

        if (options.path) {
          writeJson("ashlar.config.json", config);
        }
        writeJson("ashlar-lock.json", lockfile);
        syncAshlarProject(process.cwd(), config, lockfile);
        writeAgentsContext("AGENTS.md", config, lockfile);
        writeDesignContext("DESIGN.md", config, lockfile, { cwd: process.cwd(), force: true });
        if (!options.silent) {
          printSection("Next");
          printCommand(
            "ashlar verify",
            "Check installed files against registry hashes and signatures.",
          );
          printCommand(
            "ashlar status",
            "Review adoption gates, evidence status, and next actions.",
          );
          printFooter();
        }
      } catch (error) {
        console.error(error instanceof Error ? error.message : String(error));
        process.exitCode = 1;
      }
    });
}
