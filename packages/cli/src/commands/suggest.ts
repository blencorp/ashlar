import type { Command } from "commander";
import { suggestComponentsForTask } from "../lib/component-suggest.js";
import { readConfig } from "../lib/project.js";
import {
  printBrandHeader,
  printCommand,
  printFooter,
  printListItem,
  printSection,
} from "../lib/tui.js";

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

        printBrandHeader("Task-to-capsule suggestions");
        console.log(`Task: ${report.task}`);
        if (report.suggestions.length === 0) {
          console.log("No Ashlar capsules matched the task metadata.");
          for (const note of report.notes) {
            printListItem(note);
          }
          printFooter();
          return;
        }

        for (const [index, suggestion] of report.suggestions.entries()) {
          printSection(`${index + 1}. ${suggestion.name}@${suggestion.version}`);
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
          printSection("Gaps");
          for (const gap of report.gaps) {
            printListItem(`${gap.capability}: ${gap.recommendation}`);
          }
        }
        for (const note of report.notes) {
          console.log(`Note: ${note}`);
        }
        if (report.installCommand) {
          printSection("Next");
          printCommand(report.installCommand, "Install the suggested source-owned capsules.");
          printCommand("ashlar verify", "Check hashes, signatures, and local edits after install.");
        }
        printFooter();
      } catch (error) {
        console.error(error instanceof Error ? error.message : String(error));
        process.exitCode = 1;
      }
    });
}
