import type { Command } from "commander";
import { readConfig, readLockfile } from "../lib/project.js";
import { syncAshlarProject } from "../lib/styles.js";
import {
  loadThemes,
  themeDirectory,
  validateThemes,
  writeThemeFiles,
  type ThemeProvenanceSummary,
} from "../lib/theme.js";

type ThemeValidateOptions = {
  themesDir?: string;
  json?: boolean;
};

export function registerThemeCommand(program: Command) {
  const theme = program.command("theme").description("Manage Ashlar agency themes");

  theme
    .command("sync")
    .description("Regenerate theme CSS outputs from local agency token JSON")
    .option("--force", "Restore missing stock theme JSON files")
    .action((options: { force?: boolean }) => {
      try {
        const config = readConfig();
        const lockfile = readLockfile();
        writeThemeFiles(config, Boolean(options.force));
        syncAshlarProject(process.cwd(), config, lockfile);
        console.log(`Synced ${config.styles.theme} from ${themeDirectory(config)}/*.tokens.json`);
        console.log(`Synced ${config.styles.tailwindTheme}`);
        console.log(`Synced ${config.styles.tokenTypes}`);
      } catch (error) {
        console.error(error instanceof Error ? error.message : String(error));
        process.exitCode = 1;
      }
    });

  theme
    .command("validate")
    .description("Validate agency theme tokens and contrast gates")
    .option("--themes-dir <path>", "Directory containing *.tokens.json files")
    .option("--json", "Emit JSON")
    .action((options: ThemeValidateOptions) => {
      try {
        const themes = loadThemes(options.themesDir);
        const result = validateThemes(themes);
        const errors = result.findings.filter((finding) => finding.level === "error");
        const warnings = result.findings.filter((finding) => finding.level === "warning");

        if (options.json) {
          console.log(JSON.stringify(result, null, 2));
        } else if (result.findings.length === 0) {
          console.log(`Validated ${result.themes} theme(s) with 0 findings`);
          console.log(renderThemeProvenance(result.provenance));
        } else {
          for (const finding of result.findings) {
            console.log(
              `${finding.level.toUpperCase()} ${finding.theme}/${finding.mode} ${finding.rule}`,
            );
            console.log(`  ${finding.message}`);
            if (finding.path) {
              console.log(`  ${finding.path}`);
            }
          }
          console.log(
            `Validated ${result.themes} theme(s) with ${errors.length} error(s), ${warnings.length} warning(s)`,
          );
          console.log(renderThemeProvenance(result.provenance));
        }

        if (errors.length > 0) {
          process.exitCode = 1;
        }
      } catch (error) {
        console.error(error instanceof Error ? error.message : String(error));
        process.exitCode = 1;
      }
    });
}

function renderThemeProvenance(provenance: ThemeProvenanceSummary[]): string {
  if (provenance.length === 0) {
    return "Source provenance: none";
  }

  const lines = ["Source provenance:"];
  for (const theme of provenance) {
    lines.push(
      `- ${theme.title} (${theme.status}; reviewed ${theme.reviewedAt} by ${theme.reviewedBy})`,
    );
    lines.push(`  ${theme.summary}`);
    for (const source of theme.sources) {
      lines.push(`  - ${source.label} (${source.retrievedAt}): ${source.url}`);
    }
  }
  return lines.join("\n");
}
