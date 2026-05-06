import { existsSync } from "node:fs";
import type { Command } from "commander";
import { readVerifiedCapsuleManifest } from "../lib/capsule.js";
import { sha256File } from "../lib/hash.js";
import { readConfig, readLockfile, writeJson } from "../lib/project.js";
import { getComponentVersion } from "../lib/registry.js";

export function registerVerifyCommand(program: Command) {
  program
    .command("verify")
    .description("Verify installed capsule hashes")
    .action(() => {
      if (!existsSync("ashlar-lock.json")) {
        console.error("ashlar-lock.json not found. Run `ashlar init` first.");
        process.exitCode = 1;
        return;
      }

      const lockfile = readLockfile();
      const config = readConfig();
      const componentEntries = Object.entries(lockfile.components);

      if (componentEntries.length === 0) {
        console.log("No installed components; lockfile present");
        return;
      }

      let errors = 0;
      let warnings = 0;

      for (const [name, component] of componentEntries) {
        try {
          const registryComponent = getComponentVersion(
            process.cwd(),
            name,
            component.version,
            config.registry,
          );
          if (registryComponent.capsuleHash !== component.capsule_hash) {
            console.error(
              `x ${name}: lockfile capsule hash ${component.capsule_hash} does not match registry index ${registryComponent.capsuleHash}`,
            );
            errors += 1;
          } else {
            console.log(`ok ${name}: registry capsule hash`);
          }

          readVerifiedCapsuleManifest({
            directory: registryComponent.directory,
            name,
            version: registryComponent.version,
            layer: registryComponent.layer,
            stability: registryComponent.stability,
            registryCapsuleHash: registryComponent.capsuleHash,
            trustRoot: registryComponent.trustRoot,
          });
          if (registryComponent.trustRoot) {
            console.log(`ok ${name}: registry capsule signature`);
          }
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          if (
            message.includes("signature verification failed") ||
            message.includes("manifest integrity failed")
          ) {
            console.error(`x ${name}: ${message}`);
            errors += 1;
            continue;
          }

          console.warn(
            `! ${name}: registry provenance not checked (${
              error instanceof Error ? error.message : String(error)
            })`,
          );
          warnings += 1;
        }

        for (const [file, hashes] of Object.entries(component.files)) {
          if (!existsSync(file)) {
            console.error(`x ${name}: missing ${file}`);
            errors += 1;
            continue;
          }

          const currentHash = sha256File(file);
          hashes.current_hash = currentHash;
          if (currentHash !== hashes.original_hash) {
            console.warn(`! ${name}: local edits in ${file}`);
            warnings += 1;
            continue;
          }

          console.log(`ok ${name}: ${file}`);
        }
      }

      if (errors > 0) {
        writeJson("ashlar-lock.json", lockfile);
        process.exitCode = 1;
        return;
      }

      writeJson("ashlar-lock.json", lockfile);
      console.log(`Verified with ${warnings} warning(s)`);
    });
}
