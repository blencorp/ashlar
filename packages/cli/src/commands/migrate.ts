import type { Command } from "commander";
import { runUswdsMigration, type UswdsMigrationReport } from "../lib/uswds-migration.js";

type MigrateOptions = {
  json?: boolean;
  registry?: string;
};

function printUswdsMigration(report: UswdsMigrationReport): void {
  console.log(
    `USWDS migration: ${report.status} (${report.summary.available} available, ${report.summary.gaps} gap, ${report.summary.matches} match${report.summary.matches === 1 ? "" : "es"})`,
  );

  if (report.matches.length === 0) {
    console.log("No USWDS component classes found.");
  }

  for (const match of report.matches) {
    console.log(`${match.status.toUpperCase()} ${match.file} ${match.uswds}`);
    console.log(`  Selector: ${match.selector}`);
    if (match.region) {
      console.log(
        `  Location: ${match.file}:${match.region.startLine}:${match.region.startColumn}`,
      );
    }
    if (match.ashlarComponents.length > 0) {
      console.log(`  Ashlar: ${match.ashlarComponents.join(", ")}`);
    }
    if (match.plannedComponent) {
      console.log(`  Planned: ${match.plannedComponent}`);
    }
    console.log(`  ${match.recommendation}`);
  }

  console.log("Next:");
  for (const command of report.nextCommands) {
    console.log(`  ${command}`);
  }
}

export function registerMigrateCommand(program: Command) {
  const migrate = program.command("migrate").description("Plan migrations from existing systems");

  migrate
    .command("uswds")
    .description("Report available Ashlar replacements and gaps for USWDS markup")
    .argument("[files...]", "HTML files or globs to inspect")
    .option("--registry <path>", "Registry path (defaults to ./registry)")
    .option("--json", "Print JSON migration report")
    .action((files: string[] | undefined, options: MigrateOptions) => {
      try {
        const report = runUswdsMigration({
          cwd: process.cwd(),
          files,
          registryPath: options.registry ?? "./registry",
        });

        if (options.json) {
          console.log(JSON.stringify(report, null, 2));
          return;
        }

        printUswdsMigration(report);
      } catch (error) {
        console.error(error instanceof Error ? error.message : String(error));
        process.exitCode = 1;
      }
    });
}
