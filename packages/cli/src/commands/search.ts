import type { Command } from "commander";
import { listComponents } from "../lib/registry.js";
import { readConfig } from "../lib/project.js";

export function registerSearchCommand(program: Command) {
  program
    .command("search")
    .description("Search the local Ashlar registry")
    .argument("[query]", "Component name or description text")
    .option("--json", "Emit JSON")
    .action((query = "", options: { json?: boolean }) => {
      const config = readConfig();
      const normalized = query.toLowerCase();
      const components = listComponents(process.cwd(), config.registry).filter(
        (item) =>
          !normalized ||
          item.name.toLowerCase().includes(normalized) ||
          item.description.toLowerCase().includes(normalized),
      );

      if (options.json) {
        console.log(JSON.stringify(components, null, 2));
        return;
      }

      for (const item of components) {
        console.log(
          `${item.name}@${item.latest} [${item.layer}, ${item.stability}] ${item.description}`,
        );
      }
    });
}
