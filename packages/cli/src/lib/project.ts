import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";

export type AtriumConfig = {
  $schema?: string;
  registry: string;
  componentsDir: string;
};

export type AtriumLockfile = {
  $schema?: string;
  version: "1";
  registry: string;
  components: Record<
    string,
    {
      version: string;
      capsule_hash: string;
      stability?: string;
      installed_at?: string;
      installed_via?: string;
      files: Record<
        string,
        {
          original_hash: string;
          current_hash: string;
          critical_for_a11y?: boolean;
        }
      >;
    }
  >;
};

export function readConfig(): AtriumConfig {
  if (!existsSync("atrium.config.json")) {
    return { registry: "./registry", componentsDir: "src/atrium" };
  }

  return JSON.parse(readFileSync("atrium.config.json", "utf8")) as AtriumConfig;
}

export function readLockfile(): AtriumLockfile {
  if (!existsSync("atrium-lock.json")) {
    return { version: "1", registry: "./registry", components: {} };
  }

  return JSON.parse(readFileSync("atrium-lock.json", "utf8")) as AtriumLockfile;
}

export function writeJson(path: string, value: unknown): void {
  const parent = dirname(path);
  if (parent !== ".") {
    mkdirSync(parent, { recursive: true });
  }

  writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`);
}

export function writeFileIfMissing(path: string, contents: string, force: boolean): boolean {
  if (existsSync(path) && !force) {
    return false;
  }

  const parent = dirname(path);
  if (parent !== ".") {
    mkdirSync(parent, { recursive: true });
  }

  writeFileSync(path, contents);
  return true;
}
