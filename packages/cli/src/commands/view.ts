import type { Command } from "commander";
import { getComponent } from "../lib/registry.js";
import { readConfig } from "../lib/project.js";

export function registerViewCommand(program: Command) {
  program
    .command("view")
    .description("Show component registry metadata before install")
    .argument("<components...>", "Component names")
    .option("--json", "Emit JSON")
    .action((components: string[], options: { json?: boolean }) => {
      const config = readConfig();

      try {
        const details = components.map((component) =>
          getComponent(process.cwd(), component, config.registry),
        );

        if (options.json) {
          console.log(JSON.stringify(details, null, 2));
          return;
        }

        for (const detail of details) {
          console.log(`${detail.name}@${detail.version}`);
          console.log(`  Tier: ${detail.tier}`);
          console.log(`  Layer: ${detail.layer}`);
          console.log(`  Stability: ${detail.stability}`);
          console.log(`  Evidence: ${detail.evidence.accessibilityStatus}`);
          console.log(
            `  Platform features: ${
              detail.platformFeatures.map((feature) => feature.feature).join(", ") || "none"
            }`,
          );
          console.log(
            `  Policy mappings: ${
              detail.policyMappings.map((mapping) => mapping.source).join(", ") || "none"
            }`,
          );
          console.log(`  Files: ${detail.files.join(", ")}`);
          console.log(`  Path: ${detail.directory}`);
        }
      } catch (error) {
        console.error(error instanceof Error ? error.message : String(error));
        process.exitCode = 1;
      }
    });
}
