import { readFileSync } from "node:fs";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);

// Ajv 8 ships CommonJS with a quirky default-export shape; createRequire
// gives us a stable runtime handle without fighting the TS module-resolution
// rules required by NodeNext + verbatimModuleSyntax.
type AjvErrorObject = { instancePath?: string; message?: string; keyword: string };
type AjvValidateFunction = ((value: unknown) => boolean) & {
  errors?: AjvErrorObject[] | null;
};
type AjvInstance = {
  compile(schema: unknown): AjvValidateFunction;
};
type AjvConstructor = new (options?: Record<string, unknown>) => AjvInstance;

const Ajv2020 = require("ajv/dist/2020.js") as AjvConstructor;
const addFormats = require("ajv-formats") as (instance: AjvInstance) => unknown;

const ajv: AjvInstance = new Ajv2020({
  allErrors: true,
  strict: false,
});
addFormats(ajv);

function readSchema(specifier: string): unknown {
  const schemaPath = require.resolve(`@ashlar/schemas/${specifier}`);
  return JSON.parse(readFileSync(schemaPath, "utf8"));
}

function compile(specifier: string): AjvValidateFunction {
  return ajv.compile(readSchema(specifier));
}

const validators = {
  capsule: compile("capsule.schema.json"),
  evidence: compile("evidence.schema.json"),
  lock: compile("lock.schema.json"),
  registryIndex: compile("registry-index.schema.json"),
  ashlarCem: compile("ashlar-cem.schema.json"),
  config: compile("config.schema.json"),
} as const;

export type SchemaName = keyof typeof validators;

export type ValidationResult =
  | { ok: true }
  | {
      ok: false;
      errors: Array<{ path: string; message: string; keyword: string }>;
    };

export function validate(name: SchemaName, value: unknown): ValidationResult {
  const validator = validators[name];
  const valid = validator(value);

  if (valid) {
    return { ok: true };
  }

  return {
    ok: false,
    errors: (validator.errors ?? []).map((error) => ({
      path: error.instancePath || "/",
      message: error.message ?? "validation failed",
      keyword: error.keyword,
    })),
  };
}

export function describeErrors(result: ValidationResult): string {
  if (result.ok) {
    return "ok";
  }

  return result.errors
    .map((error) => `  ${error.path} ${error.keyword}: ${error.message}`)
    .join("\n");
}
