import type { Command } from "commander";
import { mirrorRegistry } from "../lib/registry-mirror.js";

type RegistryMirrorOptions = {
  force?: boolean;
  output: string;
  registry: string;
};

export function registerRegistryCommand(program: Command) {
  const registry = program.command("registry").description("Work with Ashlar registries");

  registry
    .command("mirror")
    .description("Verify and copy a registry for offline use")
    .requiredOption("--output <path>", "Output directory")
    .option("--registry <path>", "Registry path or URL", "./registry")
    .option("--force", "Replace an existing mirror directory")
    .action((options: RegistryMirrorOptions) => {
      try {
        const result = mirrorRegistry({
          cwd: process.cwd(),
          registryPath: options.registry,
          output: options.output,
          force: Boolean(options.force),
        });

        console.log(`Mirrored ${result.components} component(s) to ${result.output}`);
      } catch (error) {
        console.error(error instanceof Error ? error.message : String(error));
        process.exitCode = 1;
      }
    });
}
