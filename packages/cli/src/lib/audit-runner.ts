import { existsSync, readFileSync } from "node:fs";
import { isAbsolute, join } from "node:path";
import fg from "fast-glob";
import { auditFile, type ComponentRule } from "./policy/component.js";
import { auditFederalHtml, type PolicyFinding } from "./policy/federal.js";
import { getComponent, listComponents } from "./registry.js";

export type AuditPolicy = "federal" | "components" | "all";

export type RunAuditOptions = {
  cwd: string;
  files?: string[];
  policy: AuditPolicy;
  registryPath: string;
};

const ignoredAuditPaths = [
  "**/.git/**",
  "**/node_modules/**",
  "**/dist/**",
  "**/.turbo/**",
  "**/coverage/**",
];

export const knownAuditPolicies = new Set<AuditPolicy>(["federal", "components", "all"]);

export function isKnownAuditPolicy(value: string): value is AuditPolicy {
  return knownAuditPolicies.has(value as AuditPolicy);
}

export function findHtmlFiles(cwd: string): string[] {
  return fg.sync("**/*.html", {
    cwd,
    onlyFiles: true,
    ignore: ignoredAuditPaths,
  });
}

export function findComponentTargetFiles(cwd: string): string[] {
  return fg.sync("**/*.{html,tsx,jsx,css}", {
    cwd,
    onlyFiles: true,
    ignore: ignoredAuditPaths,
  });
}

export function findAuditTargets(cwd: string, fileOrGlob: string): string[] {
  const matches = fg.sync(fileOrGlob, {
    cwd,
    onlyFiles: true,
    ignore: ignoredAuditPaths,
  });

  return matches.length > 0 ? matches : [fileOrGlob];
}

export function auditFederalFiles(cwd: string, files: string[]): PolicyFinding[] {
  const findings: PolicyFinding[] = [];

  for (const file of files) {
    const readPath = resolveAuditFilePath(cwd, file);
    if (!existsSync(readPath)) {
      findings.push(fileNotFoundFinding(file));
      continue;
    }

    findings.push(...auditFederalHtml(readFileSync(readPath, "utf8"), file));
  }

  return findings;
}

export function loadComponentRules(cwd: string, registryPath: string): ComponentRule[] {
  const rules: ComponentRule[] = [];

  let components: ReturnType<typeof listComponents>;
  try {
    components = listComponents(cwd, registryPath);
  } catch {
    return rules;
  }

  for (const item of components) {
    let detail: ReturnType<typeof getComponent>;
    try {
      detail = getComponent(cwd, item.name, registryPath);
    } catch {
      continue;
    }

    const declarations = detail.cem.modules?.flatMap((module) => module.declarations ?? []) ?? [];
    for (const declaration of declarations) {
      const ashlar = declaration._ashlar as
        | { antiPatterns?: ComponentRule["antiPattern"][] }
        | undefined;
      if (!ashlar?.antiPatterns) {
        continue;
      }

      for (const antiPattern of ashlar.antiPatterns) {
        if (!antiPattern || typeof antiPattern !== "object") {
          continue;
        }
        if (!Array.isArray(antiPattern.languages) || antiPattern.languages.length === 0) {
          continue;
        }
        rules.push({
          componentName: item.name,
          componentVersion: detail.version,
          antiPattern,
        });
      }
    }
  }

  return rules;
}

export function auditComponentFiles(
  cwd: string,
  registryPath: string,
  files: string[],
): PolicyFinding[] {
  const rules = loadComponentRules(cwd, registryPath);
  if (rules.length === 0) {
    return [];
  }

  const findings: PolicyFinding[] = [];
  for (const file of files) {
    const readPath = resolveAuditFilePath(cwd, file);
    if (!existsSync(readPath)) {
      findings.push(fileNotFoundFinding(file));
      continue;
    }

    findings.push(
      ...auditFile(readFileSync(readPath, "utf8"), file, {
        rules,
        configuredLanguages: new Set(),
      }),
    );
  }

  return findings;
}

export function runAudit(options: RunAuditOptions): PolicyFinding[] {
  const findings: PolicyFinding[] = [];
  const files = options.files && options.files.length > 0 ? options.files : undefined;

  if (options.policy === "federal" || options.policy === "all") {
    findings.push(...auditFederalFiles(options.cwd, files ?? findHtmlFiles(options.cwd)));
  }

  if (options.policy === "components" || options.policy === "all") {
    findings.push(
      ...auditComponentFiles(
        options.cwd,
        options.registryPath,
        files ?? findComponentTargetFiles(options.cwd),
      ),
    );
  }

  return findings;
}

function fileNotFoundFinding(file: string): PolicyFinding {
  return {
    ruleId: "ashlar/file-not-found",
    message: `Audit target not found: ${file}`,
    file,
    level: "error",
    standardStatus: "required",
    helpUri: "https://ashlar.dev/docs/audit",
  };
}

function resolveAuditFilePath(cwd: string, file: string): string {
  return isAbsolute(file) ? file : join(cwd, file);
}
