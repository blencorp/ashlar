import { existsSync } from "node:fs";
import type { Command } from "commander";
import { sha256File } from "../lib/hash.js";
import { readLockfile } from "../lib/project.js";

export function registerVerifyCommand(program: Command) {
  program
    .command("verify")
    .description("Verify installed capsule hashes")
    .action(() => {
      if (!existsSync("atrium-lock.json")) {
        console.error("atrium-lock.json not found. Run `atrium init` first.");
        process.exitCode = 1;
        return;
      }

      const lockfile = readLockfile();
      const componentEntries = Object.entries(lockfile.components);

      if (componentEntries.length === 0) {
        console.log("No installed components; lockfile present");
        return;
      }

      let errors = 0;
      let warnings = 0;

      for (const [name, component] of componentEntries) {
        for (const [file, hashes] of Object.entries(component.files)) {
          if (!existsSync(file)) {
            console.error(`x ${name}: missing ${file}`);
            errors += 1;
            continue;
          }

          const currentHash = sha256File(file);
          if (currentHash !== hashes.original_hash) {
            console.warn(`! ${name}: local edits in ${file}`);
            warnings += 1;
            continue;
          }

          console.log(`ok ${name}: ${file}`);
        }
      }

      if (errors > 0) {
        process.exitCode = 1;
        return;
      }

      console.log(`Verified with ${warnings} warning(s)`);
    });
}
