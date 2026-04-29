import type { Command } from "commander";
import { readConfig } from "../lib/project.js";
import { getComponent } from "../lib/registry.js";

export function registerEvidenceCommand(program: Command) {
  program
    .command("evidence")
    .argument("<component>")
    .description("Show component accessibility evidence")
    .option("--format <format>", "Output format: text or json", "text")
    .action((component: string, options: { format: string }) => {
      const config = readConfig();

      try {
        const detail = getComponent(process.cwd(), component, config.registry);

        if (options.format === "json") {
          console.log(JSON.stringify(detail.evidence, null, 2));
          return;
        }

        console.log(`${detail.evidence.component}@${detail.evidence.version}`);
        console.log(`stability: ${detail.evidence.stability}`);
        console.log(`accessibility: ${detail.evidence.accessibilityStatus}`);
      } catch (error) {
        console.error(error instanceof Error ? error.message : String(error));
        process.exitCode = 1;
      }
    });
}
