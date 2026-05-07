import { existsSync, statSync } from "node:fs";
import { resolve } from "node:path";

export type CwdOption = {
  cwd?: string;
};

export function applyCommandCwd(options: CwdOption): string {
  const cwd = options.cwd ? resolve(options.cwd) : process.cwd();

  if (!existsSync(cwd)) {
    throw new Error(`Ashlar working directory does not exist: ${cwd}`);
  }
  if (!statSync(cwd).isDirectory()) {
    throw new Error(`Ashlar working directory is not a directory: ${cwd}`);
  }

  process.chdir(cwd);
  return cwd;
}
