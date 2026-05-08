#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = fileURLToPath(new URL("..", import.meta.url));
const outputDir = join(repoRoot, "reports", "doctor");
const pnpm = process.platform === "win32" ? "pnpm.cmd" : "pnpm";
const node = process.execPath;
const knownProofBlockers = new Set([
  "stable-markup-evidence",
  "external-review-proof",
  "npm-provenance-public",
  "sigstore-public-trust",
]);

if (process.argv.includes("--help") || process.argv.includes("-h")) {
  console.log(`Ashlar repo doctor

Runs the local health stack used before PRs and writes review artifacts under reports/doctor.

Usage:
  pnpm repo:doctor

Exit behavior:
  - exits 0 when local checks pass and strict readiness is blocked only by known proof gates
  - exits 1 when a local check fails or strict readiness exposes an unexpected blocker
`);
  process.exit(0);
}

mkdirSync(outputDir, { recursive: true });

const readinessJson = join(outputDir, "release-readiness.json");
const readinessMarkdown = join(outputDir, "release-readiness.md");
const proofPlanMarkdown = join(outputDir, "proof-action-plan.md");
const summaryJson = join(outputDir, "summary.json");
const summaryMarkdown = join(outputDir, "summary.md");

const steps = [
  {
    name: "public-language:check",
    bin: pnpm,
    args: ["public-language:check"],
    type: "local-check",
  },
  {
    name: "format:check",
    bin: pnpm,
    args: ["format:check"],
    type: "local-check",
  },
  {
    name: "check",
    bin: pnpm,
    args: ["check"],
    type: "local-check",
  },
  {
    name: "build",
    bin: pnpm,
    args: ["build"],
    type: "local-check",
  },
  {
    name: "examples:visual",
    bin: pnpm,
    args: ["examples:visual"],
    type: "local-check",
  },
  {
    name: "release:smoke",
    bin: pnpm,
    args: ["release:smoke"],
    type: "local-check",
  },
  {
    name: "release provenance-check",
    bin: node,
    args: ["packages/cli/dist/index.js", "release", "provenance-check"],
    type: "local-check",
  },
  {
    name: "release github-packages-check",
    bin: node,
    args: ["packages/cli/dist/index.js", "release", "github-packages-check"],
    type: "local-check",
  },
  {
    name: "git diff --check",
    bin: "git",
    args: ["diff", "--check"],
    type: "local-check",
  },
  {
    name: "release readiness",
    bin: node,
    args: [
      "packages/cli/dist/index.js",
      "release",
      "readiness",
      "--registry",
      "./registry",
      "--report",
      readinessMarkdown,
      "--json-output",
      readinessJson,
    ],
    allowFailure: true,
    type: "strict-readiness",
  },
  {
    name: "release proof-plan",
    bin: node,
    args: [
      "packages/cli/dist/index.js",
      "release",
      "proof-plan",
      "--registry",
      "./registry",
      "--output",
      proofPlanMarkdown,
    ],
    allowFailure: true,
    type: "proof-plan",
  },
];

const results = [];
let hardFailure = false;

for (const step of steps) {
  const result = runStep(step);
  results.push(result);
  if (result.status !== "pass" && !step.allowFailure) {
    hardFailure = true;
  }
}

let readiness = null;
let unexpectedReadinessFailures = [];
try {
  readiness = JSON.parse(readFileSync(readinessJson, "utf8"));
  unexpectedReadinessFailures = readiness.checks
    .filter((check) => check.status === "fail" && !knownProofBlockers.has(check.id))
    .map((check) => check.id);
  if (unexpectedReadinessFailures.length > 0) {
    hardFailure = true;
  }
} catch (error) {
  hardFailure = true;
  results.push({
    durationMs: 0,
    name: "release readiness parse",
    status: "fail",
    summary: error instanceof Error ? error.message : String(error),
  });
}

const proofPlan = results.find((result) => result.name === "release proof-plan");
if (proofPlan?.status !== "pass") {
  try {
    readFileSync(proofPlanMarkdown, "utf8");
  } catch {
    hardFailure = true;
  }
}

const summary = {
  generatedAt: new Date().toISOString(),
  status: hardFailure ? "fail" : "pass",
  results,
  reports: {
    readinessJson: repoRelative(readinessJson),
    readinessMarkdown: repoRelative(readinessMarkdown),
    proofPlanMarkdown: repoRelative(proofPlanMarkdown),
    summaryJson: repoRelative(summaryJson),
    summaryMarkdown: repoRelative(summaryMarkdown),
  },
  readiness: readiness
    ? {
        status: readiness.status,
        summary: readiness.summary,
        failedChecks: readiness.checks
          .filter((check) => check.status === "fail")
          .map((check) => check.id),
        unexpectedFailures: unexpectedReadinessFailures,
      }
    : null,
};

writeFileSync(summaryJson, `${JSON.stringify(summary, null, 2)}\n`);
writeFileSync(summaryMarkdown, renderMarkdown(summary));

console.log(`\nDoctor summary: ${summary.status}`);
console.log(`Wrote ${repoRelative(summaryMarkdown)}`);
console.log(`Wrote ${repoRelative(summaryJson)}`);
if (readiness) {
  console.log(
    `Strict readiness: ${readiness.status} (${readiness.summary.passed} passed, ${readiness.summary.warnings} warning, ${readiness.summary.failed} failed)`,
  );
  const failedChecks = summary.readiness.failedChecks;
  if (failedChecks.length > 0) {
    console.log(`Readiness blockers: ${failedChecks.join(", ")}`);
  }
}

if (hardFailure) {
  process.exit(1);
}

function runStep(step) {
  const startedAt = Date.now();
  console.log(`\n==> ${step.name}`);
  const result = spawnSync(step.bin, step.args, {
    cwd: repoRoot,
    encoding: "utf8",
    env: process.env,
    stdio: ["ignore", "pipe", "pipe"],
  });
  const output = `${result.stdout ?? ""}${result.stderr ?? ""}`.trim();
  if (output) {
    console.log(output);
  }

  const durationMs = Date.now() - startedAt;
  const exitCode = result.status ?? 1;
  if (exitCode === 0) {
    return {
      command: commandString(step),
      durationMs,
      name: step.name,
      status: "pass",
    };
  }

  const status = step.allowFailure ? "blocked" : "fail";
  console.log(`${step.name} ${status} with exit code ${exitCode}.`);
  return {
    command: commandString(step),
    durationMs,
    exitCode,
    name: step.name,
    status,
  };
}

function commandString(step) {
  const bin = step.bin === node ? "node" : step.bin;
  return [
    bin,
    ...step.args.map((arg) => (arg.startsWith(repoRoot) ? repoRelative(arg) : arg)),
  ].join(" ");
}

function repoRelative(path) {
  return relative(repoRoot, path) || ".";
}

function renderMarkdown(summary) {
  const lines = [
    "# Ashlar Doctor",
    "",
    `Generated: ${summary.generatedAt}`,
    `Status: ${summary.status}`,
    "",
    "## Local Checks",
    "",
    "| Step | Status | Duration |",
    "| --- | --- | ---: |",
  ];

  for (const result of summary.results) {
    lines.push(`| ${result.name} | ${result.status} | ${formatDuration(result.durationMs)} |`);
  }

  lines.push("", "## Strict Readiness", "");
  if (summary.readiness) {
    lines.push(
      `Status: ${summary.readiness.status}`,
      `Checks: ${summary.readiness.summary.passed} passed, ${summary.readiness.summary.warnings} warning, ${summary.readiness.summary.failed} failed`,
      "",
      "Failing checks:",
    );
    for (const check of summary.readiness.failedChecks) {
      lines.push(`- ${check}`);
    }
    if (summary.readiness.unexpectedFailures.length === 0) {
      lines.push(
        "",
        "All strict-readiness failures are expected proof gates. They still block replacement-grade claims.",
      );
    } else {
      lines.push("", "Unexpected readiness failures:");
      for (const check of summary.readiness.unexpectedFailures) {
        lines.push(`- ${check}`);
      }
    }
  } else {
    lines.push("Release readiness output could not be parsed.");
  }

  lines.push(
    "",
    "## Reports",
    "",
    `- Release readiness: \`${summary.reports.readinessMarkdown}\``,
    `- Release readiness JSON: \`${summary.reports.readinessJson}\``,
    `- Proof action plan: \`${summary.reports.proofPlanMarkdown}\``,
    `- Machine summary: \`${summary.reports.summaryJson}\``,
  );

  return `${lines.join("\n")}\n`;
}

function formatDuration(durationMs) {
  if (durationMs < 1000) {
    return `${durationMs}ms`;
  }
  return `${(durationMs / 1000).toFixed(1)}s`;
}
