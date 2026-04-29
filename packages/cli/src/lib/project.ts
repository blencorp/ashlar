import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";

export type AshlarConfig = {
  $schema?: string;
  registry: string;
  componentsDir: string;
};

export type AshlarLockfile = {
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

export function readConfig(): AshlarConfig {
  if (!existsSync("ashlar.config.json")) {
    return { registry: "./registry", componentsDir: "src/ashlar" };
  }

  return JSON.parse(readFileSync("ashlar.config.json", "utf8")) as AshlarConfig;
}

export function readLockfile(): AshlarLockfile {
  if (!existsSync("ashlar-lock.json")) {
    return { version: "1", registry: "./registry", components: {} };
  }

  return JSON.parse(readFileSync("ashlar-lock.json", "utf8")) as AshlarLockfile;
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
