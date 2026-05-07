import type { Command } from "commander";
import { applyCommandCwd, type CwdOption } from "../lib/cwd.js";
import { formatRegistryLayer } from "../lib/layers.js";
import { getComponent } from "../lib/registry.js";
import { readConfig } from "../lib/project.js";
import {
  printBrandHeader,
  printCommand,
  printFooter,
  printKeyValue,
  printSection,
} from "../lib/tui.js";

export function registerViewCommand(program: Command) {
  program
    .command("view")
    .alias("docs")
    .description("Show component registry metadata before install")
    .argument("<components...>", "Component names")
    .option("-c, --cwd <path>", "Working directory. Defaults to the current directory.")
    .option("--json", "Emit JSON")
    .action((components: string[], options: { json?: boolean } & CwdOption) => {
      try {
        applyCommandCwd(options);
        const config = readConfig();
        const details = components.map((component) =>
          getComponent(process.cwd(), component, config.registry),
        );

        if (options.json) {
          console.log(JSON.stringify(details, null, 2));
          return;
        }

        printBrandHeader("Capsule metadata");
        for (const detail of details) {
          printSection(`${detail.name}@${detail.version}`);
          printKeyValue("Tier", detail.tier);
          printKeyValue("Layer", formatRegistryLayer(detail.layer));
          printKeyValue("Stability", detail.stability);
          printKeyValue("Evidence", detail.evidence.accessibilityStatus);
          printKeyValue(
            "Platform features",
            detail.platformFeatures.map((feature) => feature.feature).join(", ") || "none",
          );
          printKeyValue(
            "Policy mappings",
            detail.policyMappings.map((mapping) => mapping.source).join(", ") || "none",
          );
          printKeyValue("Files", detail.files.join(", "));
          printKeyValue("Path", detail.directory);
        }
        printSection("Next");
        printCommand(
          `ashlar add ${details.map((detail) => detail.name).join(" ")}`,
          "Install source after reviewing evidence and policy mappings.",
        );
        printFooter();
      } catch (error) {
        console.error(error instanceof Error ? error.message : String(error));
        process.exitCode = 1;
      }
    });
}
