import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { describeErrors, validate } from "./schema-validate.js";

export type AshlarConfig = {
  $schema?: string;
  registry: string;
  componentsDir: string;
  indexesDir?: string;
  styles?: {
    entrypoint: string;
    theme: string;
    tailwindTheme?: string;
    tokenTypes?: string;
  };
};

export type ResolvedAshlarConfig = Required<Omit<AshlarConfig, "$schema" | "styles">> & {
  $schema?: string;
  styles: Required<NonNullable<AshlarConfig["styles"]>>;
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

export function readConfig(): ResolvedAshlarConfig {
  if (!existsSync("ashlar.config.json")) {
    return defaultConfig();
  }

  return normalizeConfig(JSON.parse(readFileSync("ashlar.config.json", "utf8")) as AshlarConfig);
}

export function defaultConfig(overrides: Partial<AshlarConfig> = {}): ResolvedAshlarConfig {
  return normalizeConfig({
    $schema: "https://ashlar.dev/schemas/config.schema.json",
    registry: "./registry",
    componentsDir: "src/ashlar/components",
    indexesDir: "src/ashlar/indexes",
    styles: {
      entrypoint: "src/ashlar/ashlar.css",
      theme: "src/ashlar/themes/theme.css",
      tailwindTheme: "src/ashlar/themes/tailwind-theme.css",
      tokenTypes: "src/ashlar/themes/tokens.ts",
    },
    ...overrides,
  });
}

export function normalizeConfig(config: AshlarConfig): ResolvedAshlarConfig {
  return {
    $schema: config.$schema,
    registry: config.registry ?? "./registry",
    componentsDir: config.componentsDir ?? "src/ashlar/components",
    indexesDir: config.indexesDir ?? "src/ashlar/indexes",
    styles: {
      entrypoint: config.styles?.entrypoint ?? "src/ashlar/ashlar.css",
      theme: config.styles?.theme ?? "src/ashlar/themes/theme.css",
      tailwindTheme: config.styles?.tailwindTheme ?? "src/ashlar/themes/tailwind-theme.css",
      tokenTypes: config.styles?.tokenTypes ?? "src/ashlar/themes/tokens.ts",
    },
  };
}

export function readLockfile(): AshlarLockfile {
  if (!existsSync("ashlar-lock.json")) {
    return { version: "1", registry: "./registry", components: {} };
  }

  const lockfile = JSON.parse(readFileSync("ashlar-lock.json", "utf8")) as AshlarLockfile;
  const result = validate("lock", lockfile);
  if (!result.ok) {
    throw new Error(`Invalid Ashlar lockfile at ashlar-lock.json:\n${describeErrors(result)}`);
  }

  return lockfile;
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
