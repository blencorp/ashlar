import type { Command } from "commander";
import { writeAgentsContext } from "../lib/agents.js";
import { writeDesignContext } from "../lib/design-context.js";
import { defaultConfig, writeJson } from "../lib/project.js";
import { syncAshlarProject } from "../lib/styles.js";
import { writeThemeFiles } from "../lib/theme.js";
import {
  printBrandHeader,
  printCommand,
  printFooter,
  printKeyValue,
  printSection,
  printSuccess,
} from "../lib/tui.js";

export function registerInitCommand(program: Command) {
  program
    .command("init")
    .description("Initialize Ashlar in this project")
    .option("--force", "Overwrite existing Ashlar config files")
    .option("--registry <path>", "Registry path or URL", "./registry")
    .option(
      "--components-dir <path>",
      "Installed component source directory",
      "src/ashlar/components",
    )
    .option(
      "--entrypoint <path>",
      "Generated Ashlar stylesheet entrypoint",
      "src/ashlar/ashlar.css",
    )
    .action(
      (options: {
        componentsDir: string;
        entrypoint: string;
        force?: boolean;
        registry: string;
      }) => {
        const force = Boolean(options.force);
        const config = defaultConfig({
          registry: options.registry,
          componentsDir: options.componentsDir,
          indexesDir: "src/ashlar/indexes",
          styles: {
            entrypoint: options.entrypoint,
            theme: "src/ashlar/themes/theme.css",
            tailwindTheme: "src/ashlar/themes/tailwind-theme.css",
            tokenTypes: "src/ashlar/themes/tokens.ts",
          },
        });

        writeJson("ashlar.config.json", config);

        const lockfile = {
          $schema: "https://ashlar.dev/schemas/lock.schema.json",
          version: "1",
          registry: config.registry,
          components: {},
        } as const;

        writeJson("ashlar-lock.json", lockfile);
        writeThemeFiles(config, force);
        syncAshlarProject(process.cwd(), config, lockfile);

        writeAgentsContext("AGENTS.md", config, lockfile);
        writeDesignContext("DESIGN.md", config, lockfile, { cwd: process.cwd(), force });
        printBrandHeader("Initialized source-owned Ashlar project files");
        printSuccess("Initialized Ashlar");
        printSection("Project files");
        printKeyValue("config", "ashlar.config.json");
        printKeyValue("lockfile", "ashlar-lock.json");
        printKeyValue("components", config.componentsDir);
        printKeyValue("entrypoint", config.styles.entrypoint);
        printSection("Next");
        printCommand('ashlar search "official website"', "Find signed capsules by policy or task.");
        printCommand(
          "ashlar add banner identifier",
          "Install source-owned public-service shell capsules.",
        );
        printCommand("ashlar verify", "Check local source against registry hashes and signatures.");
        printFooter();
      },
    );
}
