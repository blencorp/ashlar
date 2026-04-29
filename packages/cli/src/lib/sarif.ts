import type { PolicyFinding } from "./policy/federal.js";

type SarifLevel = "error" | "warning" | "note";

function sarifLevel(level: PolicyFinding["level"]): SarifLevel {
  return level === "error" ? "error" : "warning";
}

export function toSarif(findings: PolicyFinding[]) {
  const rules = Array.from(
    new Map(findings.map((finding) => [finding.ruleId, finding])).values(),
  ).map((finding) => ({
    id: finding.ruleId,
    shortDescription: {
      text: finding.message,
    },
    helpUri: finding.helpUri,
    properties: {
      standardStatus: finding.standardStatus,
    },
  }));

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
          locations: [
            {
              physicalLocation: {
                artifactLocation: {
                  uri: finding.file,
                },
              },
            },
          ],
        })),
      },
    ],
  };
}
