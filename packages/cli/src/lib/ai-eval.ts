import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import {
  findAuditTargets,
  isKnownAuditPolicy,
  runAudit,
  type AuditPolicy,
} from "./audit-runner.js";
import type { PolicyFinding } from "./policy/federal.js";
import { getComponent } from "./registry.js";
import { describeErrors, validate } from "./schema-validate.js";

type AiEvalExpectation = {
  errors?: number;
  excludesRuleIds?: string[];
  includesRuleIds?: string[];
  maxErrors?: number;
  minErrors?: number;
  warnings?: number;
};

type AiEvalCase = {
  components?: string[];
  expect?: AiEvalExpectation;
  id: string;
  outputFile: string;
  policy?: AuditPolicy;
  prompt: string;
};

type AiEvalSuite = {
  $schema?: string;
  cases: AiEvalCase[];
  schemaVersion: "1.0";
};

export type AiEvalCaseReport = {
  expected: AiEvalExpectation;
  failures: string[];
  findings: PolicyFinding[];
  grounding: {
    components: Array<{
      antiPatternRuleIds: string[];
      evidenceStatus: string;
      name: string;
      version: string;
    }>;
  };
  id: string;
  outputFile: string;
  policy: AuditPolicy;
  prompt: string;
  status: "pass" | "fail";
  summary: {
    errors: number;
    warnings: number;
  };
};

export type AiEvalReport = {
  cases: AiEvalCaseReport[];
  generatedAt: string;
  schemaVersion: "1.0";
  status: "pass" | "fail";
  suitePath: string;
  summary: {
    failed: number;
    passed: number;
    total: number;
  };
};

export function runAiEvalSuite(input: {
  cwd: string;
  registryPath: string;
  suitePath: string;
}): AiEvalReport {
  const suitePath = resolve(input.cwd, input.suitePath);
  const suite = readAiEvalSuite(suitePath);
  const suiteDirectory = dirname(suitePath);
  const cases = suite.cases.map((testCase) =>
    runAiEvalCase({
      cwd: input.cwd,
      registryPath: input.registryPath,
      suiteDirectory,
      testCase,
    }),
  );
  const failed = cases.filter((item) => item.status === "fail").length;

  return {
    schemaVersion: "1.0",
    suitePath,
    generatedAt: new Date().toISOString(),
    status: failed > 0 ? "fail" : "pass",
    summary: {
      total: cases.length,
      passed: cases.length - failed,
      failed,
    },
    cases,
  };
}

function runAiEvalCase(input: {
  cwd: string;
  registryPath: string;
  suiteDirectory: string;
  testCase: AiEvalCase;
}): AiEvalCaseReport {
  const policy = input.testCase.policy ?? "all";
  if (!isKnownAuditPolicy(policy)) {
    throw new Error(`Unknown Ashlar policy pack in eval case ${input.testCase.id}: ${policy}`);
  }

  const outputPath = resolve(input.suiteDirectory, input.testCase.outputFile);
  const targets = findAuditTargets(input.cwd, outputPath);
  const findings = runAudit({
    cwd: input.cwd,
    files: targets,
    policy,
    registryPath: input.registryPath,
  });
  const expected = input.testCase.expect ?? {};
  const summary = {
    errors: findings.filter((finding) => finding.level === "error").length,
    warnings: findings.filter((finding) => finding.level === "warning").length,
  };
  const failures = compareExpectations(expected, findings, summary);

  return {
    id: input.testCase.id,
    prompt: input.testCase.prompt,
    outputFile: input.testCase.outputFile,
    policy,
    expected,
    summary,
    findings,
    failures,
    grounding: {
      components: (input.testCase.components ?? []).map((name) =>
        componentGrounding(input.cwd, input.registryPath, name),
      ),
    },
    status: failures.length > 0 ? "fail" : "pass",
  };
}

function compareExpectations(
  expected: AiEvalExpectation,
  findings: PolicyFinding[],
  summary: { errors: number; warnings: number },
): string[] {
  const failures: string[] = [];
  const ruleIds = new Set(findings.map((finding) => finding.ruleId));

  if (typeof expected.errors === "number" && summary.errors !== expected.errors) {
    failures.push(`expected ${expected.errors} error finding(s), found ${summary.errors}`);
  }
  if (typeof expected.warnings === "number" && summary.warnings !== expected.warnings) {
    failures.push(`expected ${expected.warnings} warning finding(s), found ${summary.warnings}`);
  }
  if (typeof expected.minErrors === "number" && summary.errors < expected.minErrors) {
    failures.push(`expected at least ${expected.minErrors} error finding(s), found ${summary.errors}`);
  }
  if (typeof expected.maxErrors === "number" && summary.errors > expected.maxErrors) {
    failures.push(`expected at most ${expected.maxErrors} error finding(s), found ${summary.errors}`);
  }
  for (const ruleId of expected.includesRuleIds ?? []) {
    if (!ruleIds.has(ruleId)) {
      failures.push(`missing expected rule ${ruleId}`);
    }
  }
  for (const ruleId of expected.excludesRuleIds ?? []) {
    if (ruleIds.has(ruleId)) {
      failures.push(`unexpected rule ${ruleId}`);
    }
  }

  return failures;
}

function componentGrounding(cwd: string, registryPath: string, name: string) {
  const component = getComponent(cwd, name, registryPath);
  const declarations = component.cem.modules?.flatMap((module) => module.declarations ?? []) ?? [];
  const antiPatternRuleIds = declarations
    .flatMap((declaration) => {
      const ashlar = declaration._ashlar as
        | {
            antiPatterns?: Array<{ id?: unknown }>;
          }
        | undefined;
      return ashlar?.antiPatterns?.map((item) => item.id).filter(isString) ?? [];
    })
    .sort();

  return {
    name: component.name,
    version: component.version,
    evidenceStatus: component.evidence.accessibilityStatus,
    antiPatternRuleIds: antiPatternRuleIds.map((id) => `ashlar/${component.name}/${id}`),
  };
}

function readAiEvalSuite(path: string): AiEvalSuite {
  const value = JSON.parse(readFileSync(path, "utf8")) as unknown;
  const result = validate("aiEval", value);
  if (!result.ok) {
    throw new Error(`Invalid Ashlar AI eval suite at ${path}:\n${describeErrors(result)}`);
  }

  return value as AiEvalSuite;
}

function isString(value: unknown): value is string {
  return typeof value === "string";
}
