import type { Command } from "commander";
import { applyCommandCwd, type CwdOption } from "../lib/cwd.js";
import { buildProjectStatus } from "../lib/project-status.js";
import {
  formatStatus,
  printBrandHeader,
  printCommand,
  printFooter,
  printKeyValue,
  printListItem,
  printSection,
} from "../lib/tui.js";

type StatusOptions = {
  json?: boolean;
  registry?: string;
} & CwdOption;

function printText(report: ReturnType<typeof buildProjectStatus>): void {
  printBrandHeader("Project status and adoption path");
  console.log(`Ashlar status: ${report.status}`);
  printSection("Project");
  printKeyValue("initialized", report.project.initialized ? "yes" : "no");
  printKeyValue("registry", report.project.registry);
  printKeyValue("components dir", report.project.componentsDir);
  printKeyValue("installed capsules", report.project.installedComponents.length);
  for (const component of report.project.installedComponents) {
    const stability = component.stability ? ` (${component.stability})` : "";
    printListItem(`${component.name}@${component.version}${stability}`);
  }
  printSection("Registry");
  printKeyValue("available", report.registry.available ? "yes" : "no");
  printKeyValue("capsules", report.registry.componentCount);
  printKeyValue("L0 capsules", report.registry.l0Count);
  printKeyValue("stable-evidence L0 capsules", report.registry.stableEvidenceL0Count);
  printSection("Checks");
  for (const check of report.checks) {
    console.log(`  ${formatStatus(check.status)} ${check.id}: ${check.summary}`);
    for (const detail of check.details) {
      printListItem(detail);
    }
  }
  printSection("Next");
  for (const action of report.nextActions) {
    printCommand(action.command, action.reason);
  }
  printFooter();
}

export function registerStatusCommand(program: Command) {
  program
    .command("status")
    .alias("info")
    .description("Show read-only Ashlar project adoption status and next actions")
    .option("-c, --cwd <path>", "Working directory. Defaults to the current directory.")
    .option("--registry <path>", "Registry path or URL")
    .option("--json", "Print JSON status report")
    .action((options: StatusOptions) => {
      try {
        applyCommandCwd(options);
        const report = buildProjectStatus({
          cwd: process.cwd(),
          registryPath: options.registry,
        });

        if (options.json) {
          console.log(JSON.stringify(report, null, 2));
          return;
        }

        printText(report);
      } catch (error) {
        console.error(error instanceof Error ? error.message : String(error));
        process.exitCode = 1;
      }
    });
}
