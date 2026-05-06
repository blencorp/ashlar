import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { runAiEvalSuite } from "./ai-eval.js";
import { checkBundleBudget } from "./bundle-budget.js";
import { checkEvidence } from "./evidence-check.js";
import { buildEvidenceReport } from "./evidence-report.js";
import { prepareStableEvidenceReviewBatch } from "./evidence-review-bundle.js";
import { buildStableEvidenceReviewStatus } from "./evidence-review-status.js";
import { writeDesignPartnerReviewChecklist } from "./external-review-record.js";
import { buildProjectStatus } from "./project-status.js";
import { getComponent, listComponents } from "./registry.js";
import { writeReleaseAttestation } from "./release-attestation.js";
import { checkReleaseReadiness, type ReleaseReadinessReport } from "./release-readiness.js";
import { buildReleaseReadinessReport } from "./release-readiness-report.js";
import { writeReleaseSbom } from "./release-sbom.js";
import {
  writeReleaseTrustBundle,
  writeReleaseTrustReviewChecklist,
} from "./release-trust-bundle.js";
import { describeErrors, validate } from "./schema-validate.js";

export type ReleaseReviewPackInput = {
  aiEvalSuitePath: string;
  cwd: string;
  minL0Components: number;
  minStableL0Components: number;
  outputDir: string;
  registryPath: string;
  stableComponent: string;
};

export type ReleaseReviewPackResult = {
  outputDir: string;
  readiness: Pick<ReleaseReadinessReport, "status" | "summary">;
  stableEvidenceStatus: "blocked" | "ready";
  stableEvidenceTarget: string;
  files: {
    aiEval: string;
    bundleBudget: string;
    designPartnerChecklist: string;
    evidenceReport: string;
    projectStatus: string;
    readme: string;
    releaseReadinessJson: string;
    releaseReadinessMarkdown: string;
    releaseTrustChecklist: string;
    sbom: string;
    stableEvidenceIndex: string;
    stableEvidenceStatus: string;
    trustBundle: string;
  };
};

function packRelative(packRoot: string, path: string): string {
  const value = relative(packRoot, path).replaceAll("\\", "/");
  return value.length === 0 ? "." : value;
}

function writeJson(path: string, value: unknown): void {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`);
}

function reviewPackReadme(input: {
  result: ReleaseReviewPackResult;
  registryPath: string;
}): string {
  const { result } = input;
  const files = Object.entries(result.files)
    .map(([name, path]) => `- ${name}: \`${packRelative(result.outputDir, path)}\``)
    .join("\n");

  return `# Ashlar Release Review Pack

This directory is reviewer intake material for Ashlar's replacement-grade gates. It does not create completed \`docs/reviews/*.md\` proof records and it does not make a stable, public, or replacement-grade claim by itself.

## Gate Snapshot

- Strict readiness: ${result.readiness.status} (${result.readiness.summary.passed} passed, ${result.readiness.summary.warnings} warning, ${result.readiness.summary.failed} failed)
- Stable evidence target: ${result.stableEvidenceTarget} (${result.stableEvidenceStatus})
- Registry: \`${input.registryPath}\`

## Files

${files}

## Reviewer Tracks

1. Stable evidence reviewer: start with \`${packRelative(result.outputDir, result.files.stableEvidenceIndex)}\`, complete the target bundle from real keyboard and screen-reader observations, then run the review-status command in the bundle README.
2. Release trust reviewer: start with \`${packRelative(result.outputDir, result.files.releaseTrustChecklist)}\`; public npm provenance and public capsule Sigstore trust still require GitHub Actions and npm artifacts.
3. Design partner reviewer: start with \`${packRelative(result.outputDir, result.files.designPartnerChecklist)}\` and record actual adoption blockers, not maintainer intent.

## Claim Boundary

- Do not copy templates into \`docs/reviews/\` as proof.
- Do not count this pack as external review.
- Do not strengthen replacement language until strict \`ashlar release readiness\` passes without local-prototype escape hatches.
`;
}

export function writeReleaseReviewPack(input: ReleaseReviewPackInput): ReleaseReviewPackResult {
  const outputDir = resolve(input.cwd, input.outputDir);
  mkdirSync(outputDir, { recursive: true });

  const releaseReadinessJson = join(outputDir, "release-readiness.json");
  const releaseReadinessMarkdown = join(outputDir, "release-readiness.md");
  const projectStatus = join(outputDir, "project-status.json");
  const stableEvidenceDir = join(outputDir, "stable-evidence");
  const stableEvidenceStatus = join(
    stableEvidenceDir,
    `${input.stableComponent}-review-status.json`,
  );
  const evidenceReport = join(outputDir, "evidence-report.md");
  const aiEval = join(outputDir, "ai-eval.json");
  const bundleBudget = join(outputDir, "bundle-budget.json");
  const releaseTrustDir = join(outputDir, "release-trust");
  const sbom = join(releaseTrustDir, "ashlar-sbom.spdx.json");
  const attestation = join(releaseTrustDir, "ashlar-sbom.attestation.json");
  const trustBundle = join(releaseTrustDir, "ashlar-trust-bundle.json");
  const releaseTrustChecklist = join(releaseTrustDir, "ashlar-release-trust-checklist.md");
  const designPartnerChecklist = join(
    outputDir,
    "design-partner",
    "ashlar-design-partner-checklist.md",
  );
  const readme = join(outputDir, "README.md");

  const readiness = checkReleaseReadiness({
    aiEvalSuitePath: input.aiEvalSuitePath,
    cwd: input.cwd,
    minL0Components: input.minL0Components,
    minStableL0Components: input.minStableL0Components,
    registryPath: input.registryPath,
  });
  const readinessValidation = validate("releaseReadiness", readiness);
  if (!readinessValidation.ok) {
    throw new Error(
      `Generated release readiness report is invalid:\n${describeErrors(readinessValidation)}`,
    );
  }
  writeJson(releaseReadinessJson, readiness);
  writeFileSync(releaseReadinessMarkdown, buildReleaseReadinessReport(readiness));
  writeJson(projectStatus, buildProjectStatus({ cwd: input.cwd, registryPath: input.registryPath }));

  const stableBatch = prepareStableEvidenceReviewBatch({
    cwd: input.cwd,
    layer: "L0",
    outputDir: stableEvidenceDir,
    registryPath: input.registryPath,
  });
  const stableTarget = stableBatch.bundles.find(
    (bundle) => bundle.component === input.stableComponent,
  );
  if (!stableTarget) {
    throw new Error(
      `Stable evidence target ${input.stableComponent} was not prepared. Available targets: ${stableBatch.bundles
        .map((bundle) => bundle.component)
        .join(", ")}`,
    );
  }
  const stableStatus = buildStableEvidenceReviewStatus({
    component: stableTarget.component,
    cwd: input.cwd,
    registryPath: input.registryPath,
    reviewDir: stableTarget.outputDir,
  });
  const stableStatusValidation = validate("stableEvidenceReviewStatus", stableStatus);
  if (!stableStatusValidation.ok) {
    throw new Error(
      `Generated stable evidence review status is invalid:\n${describeErrors(stableStatusValidation)}`,
    );
  }
  writeJson(stableEvidenceStatus, stableStatus);

  const components = listComponents(input.cwd, input.registryPath).map((component) =>
    getComponent(input.cwd, component.name, input.registryPath),
  );
  const evidenceCheck = checkEvidence(components, { evidenceRoot: (component) => component.directory });
  writeFileSync(evidenceReport, buildEvidenceReport(components, evidenceCheck, input.registryPath));
  writeJson(
    bundleBudget,
    checkBundleBudget({ components: [], cwd: input.cwd, registryPath: input.registryPath }),
  );
  writeJson(
    aiEval,
    runAiEvalSuite({
      cwd: input.cwd,
      registryPath: input.registryPath,
      suitePath: input.aiEvalSuitePath,
    }),
  );

  writeReleaseSbom(input.cwd, sbom);
  writeReleaseAttestation({ output: attestation, subjectPath: sbom });
  const bundle = writeReleaseTrustBundle({
    attestationPath: attestation,
    cwd: input.cwd,
    output: trustBundle,
    registryPath: input.registryPath,
    sbomPath: sbom,
  });
  writeReleaseTrustReviewChecklist({
    attestationPath: attestation,
    bundle,
    bundlePath: trustBundle,
    output: releaseTrustChecklist,
    registryPath: input.registryPath,
    sbomPath: sbom,
  });
  writeDesignPartnerReviewChecklist({
    legacyFixture: "examples/legacy-federal-project/index.html",
    output: designPartnerChecklist,
    registryPath: input.registryPath,
    serviceFlowFixture: "examples/service-flow/benefit-application.pass.html",
    task: "Build a benefits application form",
  });

  const result: ReleaseReviewPackResult = {
    outputDir,
    readiness: {
      status: readiness.status,
      summary: readiness.summary,
    },
    stableEvidenceStatus: stableStatus.status,
    stableEvidenceTarget: stableTarget.component,
    files: {
      aiEval,
      bundleBudget,
      designPartnerChecklist,
      evidenceReport,
      projectStatus,
      readme,
      releaseReadinessJson,
      releaseReadinessMarkdown,
      releaseTrustChecklist,
      sbom,
      stableEvidenceIndex: stableBatch.index,
      stableEvidenceStatus,
      trustBundle,
    },
  };

  writeFileSync(readme, reviewPackReadme({ registryPath: input.registryPath, result }));

  return result;
}
