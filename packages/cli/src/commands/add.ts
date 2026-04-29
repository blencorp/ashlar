import { copyFileSync, existsSync, mkdirSync, readdirSync } from "node:fs";
import { basename, join } from "node:path";
import type { Command } from "commander";
import { buildCapsuleManifest } from "../lib/capsule.js";
import { sha256File } from "../lib/hash.js";
import { readConfig, readLockfile, writeJson } from "../lib/project.js";

function latestVersion(componentRoot: string): string | undefined {
  return readdirSync(componentRoot, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort()
    .at(-1);
}

export function registerAddCommand(program: Command) {
  program
    .command("add")
    .argument("<components...>")
    .description("Add component capsules from the configured registry")
    .action((components: string[]) => {
      const config = readConfig();
      const lockfile = readLockfile();

      for (const component of components) {
        const componentRoot = join(config.registry, "components", component);
        if (!existsSync(componentRoot)) {
          console.error(`Component not found in local registry: ${component}`);
          process.exitCode = 1;
          return;
        }

        const version = latestVersion(componentRoot);
        if (!version) {
          console.error(`No versions found for component: ${component}`);
          process.exitCode = 1;
          return;
        }

        const capsuleDir = join(componentRoot, version);
        const manifest = buildCapsuleManifest({
          directory: capsuleDir,
          name: component,
          version,
          layer: "L0",
          stability: "experimental",
        });

        const installedFiles: Record<
          string,
          { original_hash: string; current_hash: string; critical_for_a11y: boolean }
        > = {};

        mkdirSync(config.componentsDir, { recursive: true });

        for (const file of Object.keys(manifest.files)) {
          const source = join(capsuleDir, file);
          const target = join(config.componentsDir, basename(file));
          copyFileSync(source, target);
          const hash = sha256File(target);
          installedFiles[target] = {
            original_hash: hash,
            current_hash: hash,
            critical_for_a11y: file.endsWith(".css") || file.endsWith(".html"),
          };
        }

        lockfile.components[component] = {
          version,
          capsule_hash: manifest.capsule_hash,
          stability: manifest.stability,
          installed_at: new Date().toISOString(),
          installed_via: "ashlar-cli@0.0.0",
          files: installedFiles,
        };

        console.log(`Added ${component}@${version}`);
      }

      writeJson("ashlar-lock.json", lockfile);
    });
}
