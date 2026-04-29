import type { Command } from "commander";
import { writeFileIfMissing, writeJson } from "../lib/project.js";

const agentsTemplate = `# Ashlar - Agent Instructions

This project uses Ashlar components. When generating UI code:

- Use installed Ashlar capsules from ashlar-lock.json.
- Preserve semantic HTML and accessible names.
- Use Button for actions and Link for navigation.
- Do not remove focus-visible styles.
- Use Ashlar CSS variables for styling.
- Run ashlar audit before considering generated UI complete.
`;

export function registerInitCommand(program: Command) {
  program
    .command("init")
    .description("Initialize Ashlar in this project")
    .option("--force", "Overwrite existing Ashlar config files")
    .action((options: { force?: boolean }) => {
      const force = Boolean(options.force);

      writeJson("ashlar.config.json", {
        $schema: "https://ashlar.dev/schemas/config.schema.json",
        registry: "./registry",
        componentsDir: "src/ashlar",
      });

      writeJson("ashlar-lock.json", {
        $schema: "https://ashlar.dev/schemas/lock.schema.json",
        version: "1",
        registry: "./registry",
        components: {},
      });

      writeFileIfMissing("AGENTS.md", agentsTemplate, force);
      console.log("Initialized Ashlar");
    });
}
