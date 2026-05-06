import type { ReleaseReadinessCheck, ReleaseReadinessReport } from "./release-readiness.js";

function statusLabel(status: ReleaseReadinessCheck["status"]): string {
  return status.toUpperCase();
}

function formatDetails(details: string[]): string[] {
  if (details.length === 0) {
    return ["No additional details."];
  }
  return details.map((detail) => `- ${detail}`);
}

function checkSection(check: ReleaseReadinessCheck): string[] {
  return [
    "",
    `### ${check.id}`,
    "",
    `- Status: ${statusLabel(check.status)}`,
    `- Summary: ${check.summary}`,
    "",
    ...formatDetails(check.details),
  ];
}

export function buildReleaseReadinessReport(report: ReleaseReadinessReport): string {
  const failedChecks = report.checks.filter((check) => check.status === "fail");
  const warningChecks = report.checks.filter((check) => check.status === "warning");
  const lines = [
    "# Ashlar Release Readiness Report",
    "",
    `Generated: ${report.generatedAt}`,
    "",
    "## Summary",
    "",
    `- Status: ${report.status}`,
    `- Checks: ${report.summary.passed} passed, ${report.summary.warnings} warning, ${report.summary.failed} failed, ${report.summary.total} total`,
    "",
    "## Blocking Checks",
  ];

  if (failedChecks.length === 0) {
    lines.push("", "No blocking checks.");
  } else {
    for (const check of failedChecks) {
      lines.push("", `- ${check.id}: ${check.summary}`);
    }
  }

  lines.push("", "## Warning Checks");
  if (warningChecks.length === 0) {
    lines.push("", "No warning checks.");
  } else {
    for (const check of warningChecks) {
      lines.push("", `- ${check.id}: ${check.summary}`);
    }
  }

  lines.push("", "## Checks");
  for (const check of report.checks) {
    lines.push(...checkSection(check));
  }

  lines.push(
    "",
    "## Replacement Claim Rule",
    "",
    "Do not strengthen public replacement-grade language until this report passes without `--allow-unverified-public`, `--allow-local-signatures`, or relaxed stable-evidence thresholds.",
  );

  return `${lines.join("\n")}\n`;
}
