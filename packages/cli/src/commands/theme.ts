import type { Command } from "commander";
import { readConfig, readLockfile } from "../lib/project.js";
import { syncAshlarProject } from "../lib/styles.js";
import { loadThemes, themeDirectory, validateThemes, writeThemeFiles } from "../lib/theme.js";

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
