import { readFileSync } from "node:fs";
import { join } from "node:path";
import { getComponent } from "./registry.js";
import type { ReleaseReadinessCheck, ReleaseReadinessReport } from "./release-readiness.js";

export type ReleaseProofPlanTrack = {
  artifacts: string[];
  blockedBy: string[];
  commands: string[];
  description: string;
  issue: string;
  name: string;
  readinessChecks: string[];
  status: "action-needed" | "done";
};

export type ReleaseProofPlan = {
  generatedAt: string;
  readiness: Pick<ReleaseReadinessReport, "status" | "summary">;
  registryPath: string;
  tracks: ReleaseProofPlanTrack[];
};

type ProofPlanInput = {
  cwd: string;
  readiness: ReleaseReadinessReport;
  registryPath: string;
  stableComponent: string;
};

function checkById(report: ReleaseReadinessReport, id: string): ReleaseReadinessCheck | undefined {
  return report.checks.find((check) => check.id === id);
}

function isDone(report: ReleaseReadinessReport, checks: string[]): boolean {
  return checks.every((id) => checkById(report, id)?.status === "pass");
}

function blockingSummaries(report: ReleaseReadinessReport, checks: string[]): string[] {
  return checks
    .map((id) => checkById(report, id))
    .filter((check): check is ReleaseReadinessCheck => Boolean(check))
    .filter((check) => check.status !== "pass")
    .map((check) => `${check.id}: ${check.summary}`);
}

function packageVersion(cwd: string, packagePath: string): string {
  try {
    const manifest = JSON.parse(readFileSync(join(cwd, packagePath, "package.json"), "utf8")) as {
      version?: string;
    };
    return manifest.version ?? "<version>";
  } catch {
    return "<version>";
  }
}

function releasePackageSpecs(cwd: string): string {
  return [
    `@blen/ashlar@${packageVersion(cwd, "packages/ashlar")}`,
    `@blen/ashlar-cli@${packageVersion(cwd, "packages/cli")}`,
    `@blen/ashlar-schemas@${packageVersion(cwd, "packages/schemas")}`,
  ].join(" ");
}

function registryChild(registryPath: string, child: string): string {
  const prefix = registryPath.replace(/\/$/g, "");
  return `${prefix.length === 0 ? "." : prefix}/${child}`;
}

function trackStatus(
  report: ReleaseReadinessReport,
  checks: string[],
): ReleaseProofPlanTrack["status"] {
  return isDone(report, checks) ? "done" : "action-needed";
}

export function buildReleaseProofPlan(input: ProofPlanInput): ReleaseProofPlan {
  const registry = input.registryPath;
  const stableComponent = getComponent(input.cwd, input.stableComponent, input.registryPath);
  const stableReviewDir = `reports/markup-primitive-stable-review/${input.stableComponent}`;
  const stableFixture = registryChild(
    registry,
    `components/${input.stableComponent}/${stableComponent.version}/${input.stableComponent}.html`,
  );
  const packageSpecs = releasePackageSpecs(input.cwd);

  const stableChecks = ["stable-markup-evidence", "external-review-proof"];
  const releaseTrustChecks = [
    "npm-provenance-public",
    "sigstore-public-trust",
    "external-review-proof",
  ];
  const designPartnerChecks = ["external-review-proof"];

  return {
    generatedAt: new Date().toISOString(),
    readiness: {
      status: input.readiness.status,
      summary: input.readiness.summary,
    },
    registryPath: registry,
    tracks: [
      {
        name: "Button stable evidence",
        description:
          "Produce real keyboard, screen-reader, WCAG, and ICT Baseline evidence for one markup primitive capsule.",
        issue: "https://github.com/blencorp/ashlar/issues/22",
        readinessChecks: stableChecks,
        status: trackStatus(input.readiness, stableChecks),
        blockedBy: blockingSummaries(input.readiness, stableChecks),
        artifacts: [
          `${stableReviewDir}/ISSUE.md`,
          `${stableReviewDir}/${input.stableComponent}-manual-review.json`,
          `${stableReviewDir}/${input.stableComponent}-keyboard-transcript.json`,
          `${stableReviewDir}/${input.stableComponent}-screen-reader-transcript.json`,
          `${stableReviewDir}/${input.stableComponent}.evidence.stable.json`,
          "reports/button-evidence-publication.json",
          `docs/reviews/stable-evidence-${input.stableComponent}-<date>.md`,
        ],
        commands: [
          `ashlar evidence prepare-stable ${input.stableComponent} --registry ${registry} --fixture ${stableFixture} --output ${stableReviewDir}`,
          `ashlar evidence review-status ${input.stableComponent} --registry ${registry} --review-dir ${stableReviewDir}`,
          `ashlar evidence finalize-stable ${input.stableComponent} --registry ${registry} --review-dir ${stableReviewDir}`,
          `ashlar evidence ${input.stableComponent} --check --registry ${registry} --evidence-file ${stableReviewDir}/${input.stableComponent}.evidence.stable.json`,
          `ashlar evidence publish ${input.stableComponent} --registry ${registry} --evidence-file ${stableReviewDir}/${input.stableComponent}.evidence.stable.json --signing-key <trusted-local-signing-key> --key-id <trusted-key-id> --output reports/button-evidence-publication.json`,
          `ashlar release review-record stable-evidence --output docs/reviews/stable-evidence-${input.stableComponent}-<date>.md --reviewer <reviewer> --affiliation <organization> --review-date <yyyy-mm-dd> --source-issue https://github.com/blencorp/ashlar/issues/22 --repo-commit <commit-sha> --rationale <why-the-review-passed> --component ${input.stableComponent} --registry ${registry} --review-dir ${stableReviewDir} --publication-receipt reports/button-evidence-publication.json`,
        ],
      },
      {
        name: "Public release trust",
        description:
          "Prove npm trusted publishing, public package provenance, capsule Sigstore bundles, SBOM, and trust bundle verification.",
        issue: "https://github.com/blencorp/ashlar/issues/23",
        readinessChecks: releaseTrustChecks,
        status: trackStatus(input.readiness, releaseTrustChecks),
        blockedBy: blockingSummaries(input.readiness, releaseTrustChecks),
        artifacts: [
          "reports/ashlar-npm-provenance.json",
          "reports/ashlar-public-trust.json",
          "reports/ashlar-sbom.spdx.json",
          "reports/ashlar-sbom.attestation.json",
          "reports/ashlar-trust-bundle.json",
          "reports/ashlar-release-trust-checklist.md",
          "docs/reviews/release-trust-<version>.md",
        ],
        commands: [
          "gh workflow run publish.yml --ref main -f confirm=publish",
          "gh workflow run sigstore.yml --ref main -f confirm=sign",
          `ashlar release provenance-verify-public --package ${packageSpecs} --json > reports/ashlar-npm-provenance.json`,
          "ashlar release public-trust-verify --registry <signed-registry-artifact> --json > reports/ashlar-public-trust.json",
          "ashlar release verify-trust-bundle --registry <signed-registry-artifact> --bundle reports/ashlar-trust-bundle.json --sbom reports/ashlar-sbom.spdx.json --attestation reports/ashlar-sbom.attestation.json",
          `ashlar release review-record release-trust --output docs/reviews/release-trust-<version>.md --reviewer <reviewer> --affiliation <organization> --review-date <yyyy-mm-dd> --source-issue https://github.com/blencorp/ashlar/issues/23 --repo-commit <commit-sha> --rationale <why-the-review-passed> --release-candidate <version> --registry-artifact <signed-registry-artifact> --npm-provenance reports/ashlar-npm-provenance.json --sigstore-verification reports/ashlar-public-trust.json --sbom reports/ashlar-sbom.spdx.json --attestation reports/ashlar-sbom.attestation.json --trust-bundle reports/ashlar-trust-bundle.json --workflow-run <workflow-run-url> --package ${packageSpecs}`,
        ],
      },
      {
        name: "Design partner validation",
        description:
          "Validate whether the validator wedge and service-flow proof make sense to a real public-service delivery team.",
        issue: "https://github.com/blencorp/ashlar/issues/24",
        readinessChecks: designPartnerChecks,
        status: trackStatus(input.readiness, designPartnerChecks),
        blockedBy: blockingSummaries(input.readiness, designPartnerChecks),
        artifacts: [
          "reports/ashlar-design-partner-checklist.md",
          "reports/design-partner-validator-output.txt",
          "review screenshots or recording",
          "docs/reviews/design-partner-<partner>-<date>.md",
        ],
        commands: [
          "ashlar release design-partner-checklist --output reports/ashlar-design-partner-checklist.md",
          "ashlar audit --policy federal --explain examples/legacy-federal-project/index.html",
          `ashlar audit --policy all --registry ${registry} examples/service-flow/benefit-application.pass.html`,
          `ashlar search "benefits application" --registry ${registry}`,
          `ashlar suggest "Build a benefits application form"`,
          `ashlar release review-record design-partner --output docs/reviews/design-partner-<partner>-<date>.md --reviewer <reviewer> --affiliation <organization> --review-date <yyyy-mm-dd> --source-issue https://github.com/blencorp/ashlar/issues/24 --repo-commit <commit-sha> --rationale <why-the-review-passed> --scenario <scenario> --product-surface <surface> --integration-path <path> --project <project-or-fixture> --user-role <role> --adoption-goal <goal> --demo <branch-or-url> --commands-run <commands> --screens-reviewed <screens-or-recording> --guidance <guidance-reviewed> --validator-output reports/design-partner-validator-output.txt --review-checklist reports/ashlar-design-partner-checklist.md --what-worked <feedback> --unclear <feedback> --missing-primitives <feedback> --docs-gaps <feedback> --would-replace-uswds <answer> --would-use-beside-uswds <answer> --would-only-use-validator <answer> --would-not-adopt <answer>`,
        ],
      },
    ],
  };
}

function list(values: string[]): string[] {
  return values.length === 0 ? ["- None."] : values.map((value) => `- ${value}`);
}

export function buildReleaseProofPlanMarkdown(plan: ReleaseProofPlan): string {
  const lines = [
    "# Ashlar Replacement Proof Action Plan",
    "",
    `Generated: ${plan.generatedAt}`,
    `Registry: \`${plan.registryPath}\``,
    "",
    "## Readiness Snapshot",
    "",
    `- Status: ${plan.readiness.status}`,
    `- Checks: ${plan.readiness.summary.passed} passed, ${plan.readiness.summary.warnings} warning, ${plan.readiness.summary.failed} failed, ${plan.readiness.summary.total} total`,
    "",
    "## Claim Boundary",
    "",
    "This plan is not proof and it is not a replacement-grade claim. It is the next-action map for turning the current strict readiness blockers into inspectable external records.",
    "",
    "## Tracks",
  ];

  for (const track of plan.tracks) {
    lines.push(
      "",
      `### ${track.name}`,
      "",
      `- Status: ${track.status}`,
      `- Issue: ${track.issue}`,
      `- Purpose: ${track.description}`,
      "",
      "Blocking readiness checks:",
      "",
      ...list(track.blockedBy),
      "",
      "Required artifacts:",
      "",
      ...list(track.artifacts.map((artifact) => `\`${artifact}\``)),
      "",
      "Commands:",
      "",
      "```bash",
      ...track.commands,
      "```",
    );
  }

  lines.push(
    "",
    "## Completion Gate",
    "",
    "After the three tracks have real reviewer output or workflow artifacts, run:",
    "",
    "```bash",
    "ashlar release review-record-check",
    "ashlar release readiness --registry ./registry",
    "```",
    "",
    "Do not create placeholder `docs/reviews/*.md` records. The record checker must pass against the underlying artifacts.",
  );

  return `${lines.join("\n")}\n`;
}
