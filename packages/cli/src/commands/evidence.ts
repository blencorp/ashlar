import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import type { Command } from "commander";
import { readConfig } from "../lib/project.js";

export function registerEvidenceCommand(program: Command) {
  program
    .command("evidence")
    .argument("<component>")
    .description("Show component accessibility evidence")
    .option("--format <format>", "Output format: text or json", "text")
    .action((component: string, options: { format: string }) => {
      const config = readConfig();
      const componentRoot = join(config.registry, "components", component);

      if (!existsSync(componentRoot)) {
        console.error(`Component not found in local registry: ${component}`);
        process.exitCode = 1;
        return;
      }

      const version = existsSync(join(componentRoot, "0.0.1")) ? "0.0.1" : undefined;
      if (!version) {
        console.error(`No evidence found for component: ${component}`);
        process.exitCode = 1;
        return;
      }

      const evidencePath = join(componentRoot, version, `${component}.evidence.json`);
      if (!existsSync(evidencePath)) {
        console.error(`Evidence file not found: ${evidencePath}`);
        process.exitCode = 1;
        return;
      }

      const evidence = readFileSync(evidencePath, "utf8");
      if (options.format === "json") {
        console.log(evidence.trim());
        return;
      }

      const parsed = JSON.parse(evidence) as {
        component: string;
        version: string;
        stability: string;
        accessibilityStatus: string;
      };
      console.log(`${parsed.component}@${parsed.version}`);
      console.log(`stability: ${parsed.stability}`);
      console.log(`accessibility: ${parsed.accessibilityStatus}`);
    });
}
