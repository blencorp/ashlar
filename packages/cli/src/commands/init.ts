import type { Command } from "commander";
import { mkdirSync } from "node:fs";
import { writeAgentsContext } from "../lib/agents.js";
import { applyCommandCwd, type CwdOption } from "../lib/cwd.js";
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
    .alias("create")
    .argument("[components...]", "Optional component names. Mirrors shadcn init argument shape.")
    .description("Initialize Ashlar in this project")
    .option("--force", "Overwrite existing Ashlar config files")
    .option("-c, --cwd <path>", "Working directory. Defaults to the current directory.")
    .option("-t, --template <template>", "Template intent. Mirrors shadcn v4 init --template.")
    .option("-b, --base <base>", "Primitive base intent. Mirrors shadcn v4 init --base.")
    .option("-p, --preset [name]", "Preset intent. Mirrors shadcn v4 init --preset.")
    .option("-d, --defaults", "Use Ashlar defaults without prompting.")
    .option("--name <name>", "Create and initialize a named project directory.")
    .option("--monorepo", "Record monorepo intent. Present for shadcn v4 CLI compatibility.")
    .option("-s, --silent", "Mute non-error output.")
    .option("-y, --yes", "Skip confirmation prompts. Present for shadcn CLI compatibility.")
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
      (
        components: string[],
        options: {
          base?: string;
          componentsDir: string;
          entrypoint: string;
          defaults?: boolean;
          force?: boolean;
          monorepo?: boolean;
          name?: string;
          preset?: string | boolean;
          registry: string;
          silent?: boolean;
          template?: string;
        } & CwdOption,
      ) => {
        try {
          applyCommandCwd(options);
          if (options.name) {
            mkdirSync(options.name, { recursive: true });
            process.chdir(options.name);
          }

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
          if (options.silent) {
            return;
          }

          printBrandHeader("Initialized source-owned Ashlar project files");
          printSuccess("Initialized Ashlar");
          printSection("Project files");
          printKeyValue("root", process.cwd());
          printKeyValue("config", "ashlar.config.json");
          printKeyValue("lockfile", "ashlar-lock.json");
          printKeyValue("components", config.componentsDir);
          printKeyValue("entrypoint", config.styles.entrypoint);
          if (
            options.template ||
            options.base ||
            options.preset ||
            options.defaults ||
            options.monorepo
          ) {
            printSection("CLI compatibility");
            printKeyValue(
              "template",
              options.template ?? (options.defaults ? "default" : "current project"),
            );
            printKeyValue("base", options.base ?? "ashlar");
            printKeyValue("preset", typeof options.preset === "string" ? options.preset : "none");
            printKeyValue("monorepo", options.monorepo ? "yes" : "no");
          }
          printSection("Next");
          if (components.length > 0) {
            printCommand(
              `ashlar add ${components.join(" ")}`,
              "Install the components requested during init after reviewing the generated config.",
            );
          }
          printCommand(
            'ashlar search "official website"',
            "Find signed capsules by policy or task.",
          );
          printCommand(
            "ashlar add banner identifier",
            "Install source-owned public-service shell capsules.",
          );
          printCommand(
            "ashlar verify",
            "Check local source against registry hashes and signatures.",
          );
          printFooter();
        } catch (error) {
          console.error(error instanceof Error ? error.message : String(error));
          process.exitCode = 1;
        }
      },
    );
}
