import type { Command } from "commander";
import { writeDesignContext } from "../lib/design-context.js";

export function registerDesignCommand(program: Command) {
  const design = program.command("design").description("Manage Ashlar design context exports");

  design
    .command("sync")
    .description("Regenerate DESIGN.md from Ashlar metadata")
    .action(() => {
      writeDesignContext("DESIGN.md", true);
      console.log("Synced DESIGN.md");
    });
}
