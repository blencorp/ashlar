import type { Command } from "commander";
import { buildProjectStatus } from "../lib/project-status.js";

type StatusOptions = {
  json?: boolean;
  registry?: string;
};

function printText(report: ReturnType<typeof buildProjectStatus>): void {
  console.log(`Ashlar status: ${report.status}`);
  console.log("");
  console.log("Project:");
  console.log(`  initialized: ${report.project.initialized ? "yes" : "no"}`);
  console.log(`  registry: ${report.project.registry}`);
  console.log(`  components dir: ${report.project.componentsDir}`);
  console.log(`  installed capsules: ${report.project.installedComponents.length}`);
  for (const component of report.project.installedComponents) {
    const stability = component.stability ? ` (${component.stability})` : "";
    console.log(`    - ${component.name}@${component.version}${stability}`);
  }
  console.log("");
  console.log("Registry:");
  console.log(`  available: ${report.registry.available ? "yes" : "no"}`);
  console.log(`  capsules: ${report.registry.componentCount}`);
  console.log(`  L0 capsules: ${report.registry.l0Count}`);
  console.log(`  stable-evidence L0 capsules: ${report.registry.stableEvidenceL0Count}`);
  console.log("");
  console.log("Checks:");
  for (const check of report.checks) {
    console.log(`  ${check.status.toUpperCase()} ${check.id}: ${check.summary}`);
    for (const detail of check.details) {
      console.log(`    - ${detail}`);
    }
  }
  console.log("");
  console.log("Next:");
  for (const action of report.nextActions) {
    console.log(`  ${action.command}`);
    console.log(`    ${action.reason}`);
  }
}

export function registerStatusCommand(program: Command) {
  program
    .command("status")
    .description("Show read-only Ashlar project adoption status and next actions")
    .option("--registry <path>", "Registry path or URL")
    .option("--json", "Print JSON status report")
    .action((options: StatusOptions) => {
      try {
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
