import { copyFileSync, existsSync, mkdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import type { Command } from "commander";
import { writeAgentsContext } from "../lib/agents.js";
import { readVerifiedCapsuleManifest } from "../lib/capsule.js";
import { writeDesignContext } from "../lib/design-context.js";
import { sha256File } from "../lib/hash.js";
import { readConfig, readLockfile, writeJson } from "../lib/project.js";
import { getComponent } from "../lib/registry.js";
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

type AddOptions = {
  diff?: boolean;
  dryRun?: boolean;
  view?: boolean;
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
    printKeyValue("layer", plan.detail.layer);
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
    printKeyValue("Layer", plan.detail.layer);
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
    .argument("<components...>")
    .description("Add component capsules from the configured registry")
    .option("--dry-run", "Preview verified install writes without changing files")
    .option("--diff", "Show a source diff for verified install writes without changing files")
    .option("--view", "Show verified capsule metadata and target files before install")
    .action((components: string[], options: AddOptions) => {
      const config = readConfig();
      const plans: InstallPlan[] = [];

      for (const component of components) {
        try {
          plans.push(buildInstallPlan(component, config));
        } catch (error) {
          console.error(error instanceof Error ? error.message : String(error));
          process.exitCode = 1;
          return;
        }
      }

      if (options.view || options.dryRun || options.diff) {
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

      printBrandHeader("Installing source-owned capsules");
      const lockfile = readLockfile();

      for (const plan of plans) {
        const installedFiles: Record<
          string,
          { original_hash: string; current_hash: string; critical_for_a11y: boolean }
        > = {};

        for (const file of plan.files) {
          const target = file.target;
          mkdirSync(dirname(target), { recursive: true });
          copyFileSync(file.source, target);
          const hash = sha256File(target);
          if (hash !== file.expectedHash) {
            console.error(
              `Installed file hash mismatch for ${plan.detail.name}@${plan.detail.version}: ${target}`,
            );
            process.exitCode = 1;
            return;
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

        printSuccess(`Added ${plan.detail.name}@${plan.detail.version}`);
        for (const file of Object.keys(installedFiles).sort()) {
          console.log(`  ${file}`);
        }
      }

      writeJson("ashlar-lock.json", lockfile);
      syncAshlarProject(process.cwd(), config, lockfile);
      writeAgentsContext("AGENTS.md", config, lockfile);
      writeDesignContext("DESIGN.md", config, lockfile, { cwd: process.cwd(), force: true });
      printSection("Next");
      printCommand(
        "ashlar verify",
        "Check installed files against registry hashes and signatures.",
      );
      printCommand("ashlar status", "Review adoption gates, evidence status, and next actions.");
      printFooter();
    });
}
