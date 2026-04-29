import { findMatches, type AstGrepLanguage, type NapiConfig } from "../astgrep.js";
import type { PolicyFinding, PolicyRegion } from "./federal.js";
import { isSupported, languageForFile, unsupportedReason } from "./languages.js";

/**
 * The CEM `_ashlar.antiPatterns` shape, validated by ashlar-cem.schema.json.
 * Authors write rules in a slim wrapper over ast-grep's NapiConfig — the
 * compiler in this file translates to ast-grep at audit time.
 */
export type ComponentAntiPattern = {
  id: string;
  pattern: string;
  regex?: string;
  has?: { pattern: string; stopBy?: "neighbor" | "end" };
  inside?: { pattern: string; stopBy?: "neighbor" | "end" };
  not?: {
    pattern?: string;
    regex?: string;
    has?: { pattern: string; stopBy?: "neighbor" | "end" };
  };
  message?: string;
  fix?: string;
  wcag?: string;
  severity?: "error" | "warning" | "note";
  languages: string[];
  reason?: string;
};

export type ComponentRule = {
  componentName: string;
  componentVersion: string;
  antiPattern: ComponentAntiPattern;
};

const firstPartyAstGrepLanguages: ReadonlyArray<AstGrepLanguage> = ["html", "tsx", "jsx", "css"];

function asAstGrepLanguage(language: string): AstGrepLanguage | undefined {
  return (firstPartyAstGrepLanguages as ReadonlyArray<string>).includes(language)
    ? (language as AstGrepLanguage)
    : undefined;
}

/**
 * Translate a CEM antiPattern into an ast-grep NapiConfig. The wrapper format
 * is intentionally narrower than ast-grep's full Rule API so authors face a
 * smaller surface; richer rules can be expressed by extending the schema.
 */
export function compileToNapiConfig(antiPattern: ComponentAntiPattern): NapiConfig {
  const rule: Record<string, unknown> = {
    pattern: antiPattern.pattern,
  };

  if (antiPattern.regex) {
    rule.regex = antiPattern.regex;
  }
  if (antiPattern.has) {
    rule.has = { pattern: antiPattern.has.pattern, stopBy: antiPattern.has.stopBy ?? "end" };
  }
  if (antiPattern.inside) {
    rule.inside = {
      pattern: antiPattern.inside.pattern,
      stopBy: antiPattern.inside.stopBy ?? "end",
    };
  }
  if (antiPattern.not) {
    const not: Record<string, unknown> = {};
    if (antiPattern.not.pattern) {
      not.pattern = antiPattern.not.pattern;
    }
    if (antiPattern.not.regex) {
      not.regex = antiPattern.not.regex;
    }
    if (antiPattern.not.has) {
      not.has = {
        pattern: antiPattern.not.has.pattern,
        stopBy: antiPattern.not.has.stopBy ?? "end",
      };
    }
    rule.not = not;
  }

  return { rule } as NapiConfig;
}

export type AuditComponentOptions = {
  rules: ComponentRule[];
  configuredLanguages: Set<string>;
};

/**
 * Run all matching component anti-pattern rules against a single source file.
 * Returns findings in PolicyFinding shape so they share SARIF translation
 * with the federal policy pack.
 */
export function auditFile(
  source: string,
  file: string,
  options: AuditComponentOptions,
): PolicyFinding[] {
  const detectedLanguage = languageForFile(file);
  if (!detectedLanguage) {
    return [];
  }

  if (!isSupported(detectedLanguage, options.configuredLanguages)) {
    return [
      {
        ruleId: "ashlar/language-unsupported",
        message: `Language "${detectedLanguage}" is not supported by the Ashlar component validator.`,
        file,
        level: "warning",
        standardStatus: "guidance",
        helpUri: "https://github.com/blencorp/ashlar/blob/main/docs/architecture/validation.md",
        evidence: unsupportedReason(detectedLanguage),
        tags: ["language-coverage"],
      },
    ];
  }

  const language = asAstGrepLanguage(detectedLanguage);
  if (!language) {
    return [];
  }

  const findings: PolicyFinding[] = [];

  for (const componentRule of options.rules) {
    const { antiPattern, componentName } = componentRule;

    if (!antiPattern.languages.includes(detectedLanguage)) {
      continue;
    }

    const napiConfig = compileToNapiConfig(antiPattern);
    const matches = findMatches(language, source, napiConfig);

    for (const match of matches) {
      findings.push({
        ruleId: `ashlar/${componentName}/${antiPattern.id}`,
        message: antiPattern.message ?? `Ashlar ${componentName} anti-pattern: ${antiPattern.id}`,
        file,
        level: antiPattern.severity === "warning" ? "warning" : "error",
        standardStatus: "guidance",
        helpUri: "https://github.com/blencorp/ashlar/blob/main/docs/architecture/validation.md",
        evidence: antiPattern.fix,
        tags: ["accessibility", ...(antiPattern.wcag ? [`wcag-${antiPattern.wcag}`] : [])],
        fullDescription: antiPattern.reason ?? antiPattern.fix,
        region: matchRegion(match.region),
      });
    }
  }

  return findings;
}

function matchRegion(region: {
  startLine: number;
  startColumn: number;
  endLine: number;
  endColumn: number;
}): PolicyRegion {
  return {
    startLine: region.startLine,
    startColumn: region.startColumn,
    endLine: region.endLine,
    endColumn: region.endColumn,
  };
}
