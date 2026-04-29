import type { Command } from "commander";
import { writeFileIfMissing, writeJson } from "../lib/project.js";

const agentsTemplate = `# Atrium - Agent Instructions

This project uses Atrium components. When generating UI code:

- Use installed Atrium capsules from atrium-lock.json.
- Preserve semantic HTML and accessible names.
- Use Button for actions and Link for navigation.
- Do not remove focus-visible styles.
- Use Atrium CSS variables for styling.
- Run atrium audit before considering generated UI complete.
`;

export function registerInitCommand(program: Command) {
  program
    .command("init")
    .description("Initialize Atrium in this project")
    .option("--force", "Overwrite existing Atrium config files")
    .action((options: { force?: boolean }) => {
      const force = Boolean(options.force);

      writeJson("atrium.config.json", {
        $schema: "https://atrium.dev/schemas/config.schema.json",
        registry: "./registry",
        componentsDir: "src/atrium",
      });

      writeJson("atrium-lock.json", {
        $schema: "https://atrium.dev/schemas/lock.schema.json",
        version: "1",
        registry: "./registry",
        components: {},
      });

      writeFileIfMissing("AGENTS.md", agentsTemplate, force);
      console.log("Initialized Atrium");
    });
}
