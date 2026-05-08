import type { EvidenceCheckResult } from "./evidence-check.js";
import { formatRegistryLayer } from "./layers.js";
import type { RegistryComponent } from "./registry.js";

type StatusItem = {
  status: string;
};

function summarizeStatuses(items: StatusItem[] | undefined): string {
  if (!items || items.length === 0) {
    return "0";
  }

  const counts = new Map<string, number>();
  for (const item of items) {
    counts.set(item.status, (counts.get(item.status) ?? 0) + 1);
  }

  const summary = Array.from(counts.entries())
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([status, count]) => `${status}: ${count}`)
    .join(", ");

  return `${items.length} (${summary})`;
}

function countRecordKeys(value: Record<string, unknown> | undefined): number {
  if (!value) {
    return 0;
  }

  return Object.keys(value).length;
}

function formatEvidenceCheck(result: EvidenceCheckResult): string {
  if (result.findings.length === 0) {
    return "passed";
  }

  const errors = result.findings.filter((finding) => finding.level === "error").length;
  const warnings = result.findings.length - errors;
  if (errors === 0) {
    return `passed with ${warnings} warning(s)`;
  }

  return `failed (${errors} error(s), ${warnings} warning(s))`;
}

export function buildEvidenceReport(
  components: RegistryComponent[],
  check: EvidenceCheckResult,
  registry: string,
): string {
  const lines = [
    "# Ashlar Evidence Report",
    "",
    `Generated from registry: \`${registry}\``,
    "",
    "## Summary",
    `- Components: ${components.length}`,
    `- Evidence check: ${formatEvidenceCheck(check)}`,
    "",
    "## Components",
  ];

  for (const component of components) {
    const { evidence } = component;
    lines.push(
      "",
      `### ${component.name}@${component.version}`,
      `- stability: ${evidence.stability}`,
      `- accessibility: ${evidence.accessibilityStatus}`,
      `- family: ${formatRegistryLayer(component.layer)}`,
      `- tier: ${component.tier}`,
      `- WCAG mappings: ${summarizeStatuses(evidence.wcag)}`,
      `- ICT Baseline mappings: ${summarizeStatuses(evidence.baselineTests)}`,
      `- manual tests: ${evidence.manualTests?.length ?? 0}`,
      `- automated result groups: ${countRecordKeys(evidence.automatedResults)}`,
      `- known limitations: ${evidence.knownLimitations?.length ?? 0}`,
    );
  }

  lines.push("", "## Evidence Gate Findings");

  if (check.findings.length === 0) {
    lines.push("", "No evidence gate findings.");
  } else {
    for (const finding of check.findings) {
      lines.push(
        "",
        `- ${finding.level.toUpperCase()} ${finding.component}@${finding.version} ${finding.rule}`,
        `  ${finding.message}`,
      );
    }
  }

  return `${lines.join("\n")}\n`;
}
