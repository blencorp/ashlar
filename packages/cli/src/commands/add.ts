import { copyFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import type { Command } from "commander";
import { buildCapsuleManifest } from "../lib/capsule.js";
import { sha256File } from "../lib/hash.js";
import { readConfig, readLockfile, writeJson } from "../lib/project.js";
import { getComponent } from "../lib/registry.js";
import { syncAshlarProject } from "../lib/styles.js";

export function registerAddCommand(program: Command) {
  program
    .command("add")
    .argument("<components...>")
    .description("Add component capsules from the configured registry")
    .action((components: string[]) => {
      const config = readConfig();
      const lockfile = readLockfile();

      for (const component of components) {
        let detail: ReturnType<typeof getComponent>;
        try {
          detail = getComponent(process.cwd(), component, config.registry);
        } catch (error) {
          console.error(error instanceof Error ? error.message : String(error));
          process.exitCode = 1;
          return;
        }

        const manifest = buildCapsuleManifest({
          directory: detail.directory,
          name: component,
          version: detail.version,
          layer: detail.layer,
          stability: detail.stability,
        });

        const installedFiles: Record<
          string,
          { original_hash: string; current_hash: string; critical_for_a11y: boolean }
        > = {};

        for (const file of Object.keys(manifest.files)) {
          const source = join(detail.directory, file);
          const target = join(config.componentsDir, component, file);
          mkdirSync(dirname(target), { recursive: true });
          copyFileSync(source, target);
          const hash = sha256File(target);
          installedFiles[target] = {
            original_hash: hash,
            current_hash: hash,
            critical_for_a11y: file.endsWith(".css") || file.endsWith(".html"),
          };
        }

        lockfile.components[component] = {
          version: detail.version,
          capsule_hash: manifest.capsule_hash,
          stability: manifest.stability,
          installed_at: new Date().toISOString(),
          installed_via: "ashlar-cli@0.0.0",
          files: installedFiles,
        };

        console.log(`Added ${component}@${detail.version}`);
      }

      writeJson("ashlar-lock.json", lockfile);
      syncAshlarProject(process.cwd(), config, lockfile);
    });
}
