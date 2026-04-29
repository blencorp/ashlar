import type { PolicyFinding, PolicyRegion } from "./policy/federal.js";

type SarifLevel = "error" | "warning" | "note";

function sarifLevel(level: PolicyFinding["level"]): SarifLevel {
  return level === "error" ? "error" : "warning";
}

function buildRule(finding: PolicyFinding) {
  const rule: Record<string, unknown> = {
    id: finding.ruleId,
    name: finding.ruleId.replace(/[^a-zA-Z0-9]/g, "_"),
    shortDescription: { text: finding.message },
    helpUri: finding.helpUri,
    properties: {
      standardStatus: finding.standardStatus,
      ...(finding.tags && finding.tags.length > 0 ? { tags: finding.tags } : {}),
    },
  };

  if (finding.fullDescription) {
    rule.fullDescription = { text: finding.fullDescription };
    rule.help = { text: finding.fullDescription };
  }

  return rule;
}

function buildLocation(finding: PolicyFinding) {
  const physicalLocation: Record<string, unknown> = {
    artifactLocation: { uri: finding.file },
  };

  if (finding.region) {
    physicalLocation.region = buildRegion(finding.region);
  }

  return { physicalLocation };
}

function buildRegion(region: PolicyRegion) {
  return {
    startLine: region.startLine,
    startColumn: region.startColumn,
    endLine: region.endLine,
    endColumn: region.endColumn,
  };
}

export function toSarif(findings: PolicyFinding[]) {
  const rules = Array.from(
    new Map(findings.map((finding) => [finding.ruleId, finding])).values(),
  ).map(buildRule);

  return {
    version: "2.1.0",
    $schema: "https://json.schemastore.org/sarif-2.1.0.json",
    runs: [
      {
        tool: {
          driver: {
            name: "ashlar",
            informationUri: "https://github.com/blencorp/ashlar",
            rules,
          },
        },
        results: findings.map((finding) => ({
          ruleId: finding.ruleId,
          level: sarifLevel(finding.level),
          message: {
            text: finding.evidence ? `${finding.message} ${finding.evidence}` : finding.message,
          },
          locations: [buildLocation(finding)],
        })),
      },
    ],
  };
}
