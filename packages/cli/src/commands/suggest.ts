import type { Command } from "commander";
import { suggestComponentsForTask } from "../lib/component-suggest.js";
import { readConfig } from "../lib/project.js";

type SuggestOptions = {
  json?: boolean;
  limit?: string;
};

export function registerSuggestCommand(program: Command) {
  program
    .command("suggest")
    .description("Suggest Ashlar capsules for a public-service UI task without modifying files")
    .argument("<task...>", 'Task description, such as "benefits application form"')
    .option("--limit <count>", "Maximum suggestions", "13")
    .option("--json", "Emit JSON")
    .action((taskParts: string[], options: SuggestOptions) => {
      try {
        const limit = Number.parseInt(options.limit ?? "12", 10);
        if (!Number.isInteger(limit) || limit < 1) {
          throw new Error("--limit must be a positive integer");
        }

        const config = readConfig();
        const report = suggestComponentsForTask({
          cwd: process.cwd(),
          registryPath: config.registry,
          task: taskParts.join(" "),
          limit,
        });

        if (options.json) {
          console.log(JSON.stringify(report, null, 2));
          return;
        }

        console.log(`Task: ${report.task}`);
        if (report.suggestions.length === 0) {
          console.log("No Ashlar capsules matched the task metadata.");
          for (const note of report.notes) {
            console.log(`  ${note}`);
          }
          return;
        }

        for (const [index, suggestion] of report.suggestions.entries()) {
          console.log(
            `${index + 1}. ${suggestion.name}@${suggestion.version} [${suggestion.layer}, ${suggestion.tier}, ${suggestion.stability}]`,
          );
          console.log(`   ${suggestion.description}`);
          console.log(`   Evidence: ${suggestion.evidenceStatus}`);
          console.log(`   Reasons: ${suggestion.reasons.join("; ")}`);
        }

        if (report.installCommand) {
          console.log(`Install: ${report.installCommand}`);
        }
        if (report.gaps.length > 0) {
          console.log("Gaps:");
          for (const gap of report.gaps) {
            console.log(`  - ${gap.capability}: ${gap.recommendation}`);
          }
        }
        for (const note of report.notes) {
          console.log(`Note: ${note}`);
        }
      } catch (error) {
        console.error(error instanceof Error ? error.message : String(error));
        process.exitCode = 1;
      }
    });
}
