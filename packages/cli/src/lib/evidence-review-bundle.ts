import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { join, relative, resolve } from "node:path";
import type { AuditPolicy } from "./audit-runner.js";
import { applyEvidenceArtifact } from "./evidence-apply.js";
import { collectAutomatedEvidence } from "./evidence-collect.js";
import { buildManualEvidenceTemplate } from "./evidence-manual-template.js";
import { buildManualTranscriptTemplate } from "./evidence-transcript.js";
import { formatRegistryLayer, formatRegistryLayerCapsules } from "./layers.js";
import { getComponent, listComponents, type RegistryLayer } from "./registry.js";
import { describeErrors, validate } from "./schema-validate.js";

type PrepareStableEvidenceInput = {
  component: string;
  cwd: string;
  fixture: string;
  outputDir: string;
  policy?: AuditPolicy;
  registryPath: string;
};

type PrepareStableEvidenceBatchInput = {
  cwd: string;
  layer?: RegistryLayer | "all";
  outputDir: string;
  policy?: AuditPolicy;
  registryPath: string;
};

export type StableEvidenceReviewBundle = {
  component: string;
  version: string;
  outputDir: string;
  files: {
    automatedEvidence: string;
    issue: string;
    manifest: string;
    proposedEvidence: string;
    manualEvidence: string;
    keyboardTranscript: string;
    reviewHarness: string;
    reviewChecklist: string;
    screenReaderTranscript: string;
    readme: string;
  };
  automatedStatus: "pass" | "fail";
};

export type StableEvidenceReviewBatch = {
  automatedStatus: "pass" | "fail";
  bundles: StableEvidenceReviewBundle[];
  index: string;
  layer: RegistryLayer | "all";
  outputDir: string;
};

function cwdRelative(cwd: string, path: string): string {
  const value = relative(cwd, path).replaceAll("\\", "/");
  return value.startsWith("../") ? path : value;
}

function localAshlarCommand(args: string): string {
  return `pnpm ashlar ${args}`;
}

function cliCommandNote(): string {
  return "Commands below use the repository-local `pnpm ashlar` entrypoint. External reviewers using an installed CLI can replace `pnpm ashlar` with `ashlar` or `npx @blen/ashlar`.";
}

function reviewerReadme(
  bundle: StableEvidenceReviewBundle,
  cwd: string,
  registryPath: string,
): string {
  const files = {
    automatedEvidence: cwdRelative(cwd, bundle.files.automatedEvidence),
    issue: cwdRelative(cwd, bundle.files.issue),
    manifest: cwdRelative(cwd, bundle.files.manifest),
    proposedEvidence: cwdRelative(cwd, bundle.files.proposedEvidence),
    manualEvidence: cwdRelative(cwd, bundle.files.manualEvidence),
    keyboardTranscript: cwdRelative(cwd, bundle.files.keyboardTranscript),
    reviewHarness: cwdRelative(cwd, bundle.files.reviewHarness),
    reviewChecklist: cwdRelative(cwd, bundle.files.reviewChecklist),
    screenReaderTranscript: cwdRelative(cwd, bundle.files.screenReaderTranscript),
    stableEvidence: cwdRelative(
      cwd,
      join(bundle.outputDir, `${bundle.component}.evidence.stable.json`),
    ),
    reviewedEvidence: cwdRelative(
      cwd,
      join(bundle.outputDir, `${bundle.component}.evidence.reviewed.json`),
    ),
    publicationReceipt: `reports/${bundle.component}-evidence-publication.json`,
    reviewRecord: `docs/reviews/stable-evidence-${bundle.component}-<yyyy-mm-dd>.md`,
  };

  return `# ${bundle.component}@${bundle.version} Stable Evidence Review

This directory is a non-mutating reviewer bundle. It does not publish stable evidence and it does not update the registry.

## Files

- Automated evidence: \`${files.automatedEvidence}\`
- Review packet manifest: \`${files.manifest}\`
- GitHub issue body: \`${files.issue}\`
- Proposed evidence packet: \`${files.proposedEvidence}\`
- Reviewer HTML harness: \`${files.reviewHarness}\`
- Manual evidence worksheet: \`${files.manualEvidence}\`
- Keyboard transcript worksheet: \`${files.keyboardTranscript}\`
- Screen-reader transcript worksheet: \`${files.screenReaderTranscript}\`
- Reviewer checklist: \`${files.reviewChecklist}\`

## Reviewer Steps

${cliCommandNote()}

1. Open \`${files.reviewHarness}\` in the browser and assistive technology environment under review. The harness is test instrumentation only; do not treat its surrounding controls as component evidence.
2. Replace all reviewer placeholders in the keyboard and screen-reader transcript JSON files with observed results from real manual runs.
3. Validate the completed transcript artifacts:

\`\`\`bash
${localAshlarCommand(`evidence transcript-validate ${bundle.component} --registry ${registryPath} --type keyboard --transcript ${files.keyboardTranscript}`)}
${localAshlarCommand(`evidence transcript-validate ${bundle.component} --registry ${registryPath} --type screen-reader --transcript ${files.screenReaderTranscript}`)}
\`\`\`

4. Replace all placeholders in the manual evidence worksheet, keeping its manual test evidence references pointed at the completed transcript JSON files.
5. Check whether the bundle is ready:

\`\`\`bash
${localAshlarCommand(`evidence review-status ${bundle.component} --registry ${registryPath} --review-dir ${cwdRelative(cwd, bundle.outputDir)}`)}
\`\`\`

6. Finalize reviewed and stable proposal artifacts. This refuses to write anything until WCAG mappings, ICT Baseline mappings, automated evidence, manual keyboard evidence, manual screen-reader evidence, limitations, and review metadata all pass the stable gate.

\`\`\`bash
${localAshlarCommand(`evidence finalize-stable ${bundle.component} --registry ${registryPath} --review-dir ${cwdRelative(cwd, bundle.outputDir)}`)}
${localAshlarCommand(`evidence ${bundle.component} --check --registry ${registryPath} --evidence-file ${files.stableEvidence}`)}
\`\`\`

## Maintainer Publication Handoff

Do not run these commands until the reviewer bundle is complete, \`review-status\` reports ready, and the stable proposal check above passes. These commands mutate registry source or create completed proof records, so they belong in a maintainer PR after reviewer sign-off.

\`\`\`bash
${localAshlarCommand(`evidence publish ${bundle.component} --registry ${registryPath} --evidence-file ${files.stableEvidence} --signing-key <trusted-local-signing-key> --key-id <trusted-key-id> --output ${files.publicationReceipt}`)}
${localAshlarCommand(`release review-record stable-evidence --output ${files.reviewRecord} --reviewer "<reviewer>" --affiliation "<organization>" --review-date <yyyy-mm-dd> --source-issue https://github.com/blencorp/ashlar/issues/22 --repo-commit <commit-sha> --rationale "<why the review passed>" --component ${bundle.component} --registry ${registryPath} --review-dir ${cwdRelative(cwd, bundle.outputDir)} --publication-receipt ${files.publicationReceipt}`)}
${localAshlarCommand("release review-record-check")}
\`\`\`
`;
}

function reviewerChecklist(
  bundle: StableEvidenceReviewBundle,
  cwd: string,
  registryPath: string,
): string {
  const files = {
    manualEvidence: cwdRelative(cwd, bundle.files.manualEvidence),
    keyboardTranscript: cwdRelative(cwd, bundle.files.keyboardTranscript),
    reviewHarness: cwdRelative(cwd, bundle.files.reviewHarness),
    screenReaderTranscript: cwdRelative(cwd, bundle.files.screenReaderTranscript),
    reviewedEvidence: cwdRelative(
      cwd,
      join(bundle.outputDir, `${bundle.component}.evidence.reviewed.json`),
    ),
    stableEvidence: cwdRelative(
      cwd,
      join(bundle.outputDir, `${bundle.component}.evidence.stable.json`),
    ),
    publicationReceipt: `reports/${bundle.component}-evidence-publication.json`,
    reviewRecord: `docs/reviews/stable-evidence-${bundle.component}-<yyyy-mm-dd>.md`,
  };

  return `# Stable Evidence Reviewer Checklist

Capsule: ${bundle.component}@${bundle.version}

This checklist is for the human reviewer. It is not stable evidence by itself and should not be edited to bypass the JSON worksheets.

## Required Observations

- [ ] Reviewer opens \`${files.reviewHarness}\` in the tested browser and treats it as instrumentation around the target fixture, not as part of the component claim.
- [ ] Keyboard run records environment, focus order, activation behavior, unavailable states, result, steps, and limitations in \`${files.keyboardTranscript}\`.
- [ ] Screen-reader run records reader, browser, OS, version, name/role/state output, activation behavior, surrounding context, result, steps, and limitations in \`${files.screenReaderTranscript}\`.
- [ ] Manual evidence worksheet \`${files.manualEvidence}\` references the completed transcript JSON files.
- [ ] WCAG mappings are reviewed as pass, pass-with-note, or not-applicable with evidence.
- [ ] ICT Baseline mappings are reviewed as pass, pass-with-note, or not-applicable with evidence.
- [ ] Known limitations are explicit, even if the reviewer observed none.
- [ ] No TODO, TBD, placeholder, blocked, fail, or known-issue value remains in reviewer-completed artifacts.

## Validation Commands

${cliCommandNote()}

\`\`\`bash
${localAshlarCommand(`evidence transcript-validate ${bundle.component} --registry ${registryPath} --type keyboard --transcript ${files.keyboardTranscript}`)}
${localAshlarCommand(`evidence transcript-validate ${bundle.component} --registry ${registryPath} --type screen-reader --transcript ${files.screenReaderTranscript}`)}
${localAshlarCommand(`evidence review-status ${bundle.component} --registry ${registryPath} --review-dir ${cwdRelative(cwd, bundle.outputDir)}`)}
${localAshlarCommand(`evidence finalize-stable ${bundle.component} --registry ${registryPath} --review-dir ${cwdRelative(cwd, bundle.outputDir)}`)}
${localAshlarCommand(`evidence ${bundle.component} --check --registry ${registryPath} --evidence-file ${files.stableEvidence}`)}
\`\`\`

## Maintainer Handoff

- [ ] \`${files.stableEvidence}\` passes the stable evidence check before registry mutation.
- [ ] Maintainer publishes the graduated packet with \`${localAshlarCommand(`evidence publish ${bundle.component} --registry ${registryPath} --evidence-file ${files.stableEvidence} --signing-key <trusted-local-signing-key> --key-id <trusted-key-id> --output ${files.publicationReceipt}`)}\`.
- [ ] Maintainer creates \`${files.reviewRecord}\` with \`${localAshlarCommand(`release review-record stable-evidence --component ${bundle.component} --registry ${registryPath} --review-dir ${cwdRelative(cwd, bundle.outputDir)} --publication-receipt ${files.publicationReceipt}`)}\` and the real reviewer metadata.
- [ ] \`${localAshlarCommand("release review-record-check")}\` passes after the completed record is added.

## Claim Boundary

- [ ] The review covers this capsule fixture and does not claim whole-application 508 compliance.
- [ ] The review records observed behavior, not intent or design expectations.
- [ ] Stable publication waits for maintainer review and registry signing.
`;
}

function batchReviewerIndex(batch: StableEvidenceReviewBatch, cwd: string, registryPath: string) {
  const layerLabel =
    batch.layer === "all" ? "all registry families" : formatRegistryLayerCapsules(batch.layer);
  const rows = batch.bundles
    .map((bundle) => {
      const reviewDir = cwdRelative(cwd, bundle.outputDir);
      return `| ${bundle.component}@${bundle.version} | ${bundle.automatedStatus} | \`${reviewDir}\` | \`${localAshlarCommand(`evidence review-status ${bundle.component} --registry ${registryPath} --review-dir ${reviewDir}`)}\` |`;
    })
    .join("\n");

  return `# Stable Evidence Review Batch

This directory is a review intake aid for ${layerLabel}. It is not stable evidence, it does not publish evidence, and it does not update the registry.

## Bundles

| Capsule | Automated status | Review directory | Status command |
| --- | --- | --- | --- |
${rows}

## Review Flow

${cliCommandNote()}

1. Assign a reviewer to one capsule bundle.
2. Complete the keyboard and screen-reader transcript JSON files from real manual observations.
3. Complete the manual evidence worksheet and keep its evidence references pointed at the transcript JSON files.
4. Run the bundle's status command until it reports ready.
5. Run \`${localAshlarCommand(`evidence finalize-stable <component> --registry ${registryPath} --review-dir <bundle-dir>`)}\`.
6. Hand the completed bundle, ready status output, and stable proposal artifact to a maintainer for \`${localAshlarCommand(`evidence publish <component> --registry ${registryPath} --evidence-file <bundle-dir>/<component>.evidence.stable.json --signing-key <trusted-local-signing-key> --key-id <trusted-key-id> --output reports/<component>-evidence-publication.json`)}\`.
7. After publication, create a completed \`docs/reviews/stable-evidence-*.md\` record with \`${localAshlarCommand(`release review-record stable-evidence`)}\` and run \`${localAshlarCommand("release review-record-check")}\`.

Do not create a top-level \`docs/reviews/stable-evidence-*.md\` record from this index alone. Strict readiness only counts completed external review records backed by reviewer output.
`;
}

function reviewIssueBody(
  bundle: StableEvidenceReviewBundle,
  cwd: string,
  registryPath: string,
  fixture: string,
): string {
  const files = {
    automatedEvidence: cwdRelative(cwd, bundle.files.automatedEvidence),
    manifest: cwdRelative(cwd, bundle.files.manifest),
    proposedEvidence: cwdRelative(cwd, bundle.files.proposedEvidence),
    manualEvidence: cwdRelative(cwd, bundle.files.manualEvidence),
    keyboardTranscript: cwdRelative(cwd, bundle.files.keyboardTranscript),
    reviewHarness: cwdRelative(cwd, bundle.files.reviewHarness),
    reviewChecklist: cwdRelative(cwd, bundle.files.reviewChecklist),
    screenReaderTranscript: cwdRelative(cwd, bundle.files.screenReaderTranscript),
  };
  const relativeFixture = cwdRelative(cwd, resolve(cwd, fixture));

  return `# Stable Evidence Review: ${bundle.component}@${bundle.version}

Template: \`.github/ISSUE_TEMPLATE/stable_evidence_review.yml\`

## Capsule

${bundle.component}@${bundle.version}

## Review bundle

${cliCommandNote()}

Generated with:

\`\`\`bash
${localAshlarCommand(`evidence prepare-stable ${bundle.component} --registry ${registryPath} --fixture ${relativeFixture} --output ${cwdRelative(cwd, bundle.outputDir)}`)}
${localAshlarCommand(`evidence review-status ${bundle.component} --registry ${registryPath} --review-dir ${cwdRelative(cwd, bundle.outputDir)}`)}
\`\`\`

Bundle files:

- Automated evidence: \`${files.automatedEvidence}\`
- Review packet manifest: \`${files.manifest}\`
- Proposed evidence packet: \`${files.proposedEvidence}\`
- Reviewer HTML harness: \`${files.reviewHarness}\`
- Manual evidence worksheet: \`${files.manualEvidence}\`
- Keyboard transcript worksheet: \`${files.keyboardTranscript}\`
- Screen-reader transcript worksheet: \`${files.screenReaderTranscript}\`
- Reviewer checklist: \`${files.reviewChecklist}\`

Current automated status: \`${bundle.automatedStatus}\`

## Keyboard transcript

Reviewer to complete \`${files.keyboardTranscript}\` with observed keyboard focus order, activation behavior, unavailable states, environment, result, and known limitations.

Open \`${files.reviewHarness}\` for the target fixture and use the activation log only as test instrumentation.

## Screen-reader transcript

Reviewer to complete \`${files.screenReaderTranscript}\` with screen reader, browser, OS, version, name/role/state output, activation behavior, surrounding context, result, and known limitations.

## WCAG and ICT Baseline mapping

Reviewer to complete \`${files.manualEvidence}\` by replacing all known-issue, blocked, TODO, TBD, or placeholder values with observed results and evidence references.

## Graduation gates

- [ ] Manual review artifacts contain no TODO, TBD, placeholder, or blocked result.
- [ ] \`${localAshlarCommand("evidence transcript-validate")}\` passes for each local transcript reference.
- [ ] \`${localAshlarCommand("evidence review-status")}\` reports ready before finalization.
- [ ] \`${localAshlarCommand("evidence finalize-stable")}\` writes reviewed and stable proposal artifacts.
- [ ] \`${localAshlarCommand("evidence --check --evidence-file <stable proposal>")}\` passes before any registry publication.
- [ ] Maintainer runs \`${localAshlarCommand("evidence publish")}\` only after reviewer sign-off and keeps the publication receipt.
- [ ] Maintainer creates a completed \`${localAshlarCommand("release review-record stable-evidence")}\` record backed by the ready bundle and publication receipt.
- [ ] \`${localAshlarCommand("release review-record-check")}\` passes after the completed record is added.
- [ ] No application-level compliance claim is added.
`;
}

function reviewBundleManifest(
  bundle: StableEvidenceReviewBundle,
  cwd: string,
  registryPath: string,
  fixture: string,
): {
  $schema: string;
  schemaVersion: string;
  artifactType: string;
  component: string;
  version: string;
  automatedStatus: "pass" | "fail";
  stableClaim: false;
  requiresManualReview: true;
  generatedBy: {
    command: string;
    registry: string;
    fixture: string;
  };
  files: Array<{
    role: string;
    path: string;
    bytes: number;
    mutableByReviewer: boolean;
    sha256: string;
  }>;
} {
  const relativeFixture = cwdRelative(cwd, resolve(cwd, fixture));
  const fileEntries: Array<[string, string, boolean]> = [
    ["automated-evidence", bundle.files.automatedEvidence, false],
    ["proposed-evidence", bundle.files.proposedEvidence, false],
    ["manual-evidence-worksheet", bundle.files.manualEvidence, true],
    ["keyboard-transcript-worksheet", bundle.files.keyboardTranscript, true],
    ["screen-reader-transcript-worksheet", bundle.files.screenReaderTranscript, true],
    ["reviewer-harness", bundle.files.reviewHarness, false],
    ["github-issue-body", bundle.files.issue, false],
    ["reviewer-checklist", bundle.files.reviewChecklist, false],
    ["reviewer-readme", bundle.files.readme, false],
  ];

  return {
    $schema: "https://ashlar.dev/schemas/stable-evidence-review-manifest.schema.json",
    schemaVersion: "1.0",
    artifactType: "stable-evidence-review-bundle",
    component: bundle.component,
    version: bundle.version,
    automatedStatus: bundle.automatedStatus,
    stableClaim: false,
    requiresManualReview: true,
    generatedBy: {
      command: localAshlarCommand(`evidence prepare-stable ${bundle.component}`),
      registry: registryPath,
      fixture: relativeFixture,
    },
    files: fileEntries.map(([role, path, mutableByReviewer]) => ({
      role,
      path: cwdRelative(cwd, path),
      bytes: statSync(path).size,
      mutableByReviewer,
      sha256: createHash("sha256").update(readFileSync(path)).digest("hex"),
    })),
  };
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function safeStyleContent(value: string): string {
  return value.replaceAll("</style", "<\\/style");
}

function reviewerHarness(input: PrepareStableEvidenceInput): string {
  const detail = getComponent(input.cwd, input.component, input.registryPath);
  const fixturePath = resolve(input.cwd, input.fixture);
  const fixture = readFileSync(fixturePath, "utf8");
  const cssPath = join(detail.directory, `${detail.name}.css`);
  const componentCss = existsSync(cssPath) ? readFileSync(cssPath, "utf8") : "";
  const escapedFixture = escapeHtml(fixture.trim());

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Ashlar ${detail.name}@${detail.version} Stable Evidence Harness</title>
    <style>
      :root {
        color-scheme: light;
        font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        line-height: 1.5;
      }

      body {
        margin: 0;
        color: #1b1b1b;
        background: #ffffff;
      }

      main {
        max-width: 64rem;
        margin: 0 auto;
        padding: 2rem;
      }

      .ashlar-review-section {
        border-block-start: 1px solid #dfe1e2;
        margin-block-start: 1.5rem;
        padding-block-start: 1.5rem;
      }

      .ashlar-review-target {
        display: flex;
        align-items: flex-start;
        gap: 1rem;
        margin-block: 1rem;
        padding: 1rem;
        border: 1px solid #8d9297;
        background: #f7f9fa;
      }

      .ashlar-review-log {
        min-height: 2.75rem;
        padding: 0.75rem;
        border: 1px solid #dfe1e2;
        background: #ffffff;
      }

      pre {
        overflow: auto;
        padding: 1rem;
        border: 1px solid #dfe1e2;
        background: #f7f9fa;
      }

      ${safeStyleContent(componentCss)}
    </style>
  </head>
  <body>
    <main>
      <h1>Ashlar ${detail.name}@${detail.version} Stable Evidence Harness</h1>
      <p>This page is generated review instrumentation for one capsule fixture. Use the target fixture for observations; surrounding controls exist only to verify focus order and activation.</p>

      <section class="ashlar-review-section" aria-labelledby="review-target-heading">
        <h2 id="review-target-heading">Target Fixture</h2>
        <button type="button" id="before-target">Before target</button>
        <div class="ashlar-review-target" data-ashlar-review-target>
${fixture
  .split("\n")
  .map((line) => `          ${line}`)
  .join("\n")}
        </div>
        <button type="button" id="after-target">After target</button>
      </section>

      <section class="ashlar-review-section" aria-labelledby="activation-log-heading">
        <h2 id="activation-log-heading">Activation Log</h2>
        <p id="activation-log" class="ashlar-review-log" aria-live="polite">No target activation recorded.</p>
      </section>

      <section class="ashlar-review-section" aria-labelledby="fixture-source-heading">
        <h2 id="fixture-source-heading">Fixture Source</h2>
        <pre><code>${escapedFixture}</code></pre>
      </section>
    </main>
    <script>
      const target = document.querySelector("[data-ashlar-review-target]");
      const log = document.querySelector("#activation-log");
      let count = 0;

      target?.addEventListener("click", (event) => {
        const control = event.target instanceof Element
          ? event.target.closest("button, a, input, select, textarea")
          : null;
        if (!control || !target.contains(control)) {
          return;
        }
        count += 1;
        const name = control.textContent?.trim() || control.getAttribute("aria-label") || control.getAttribute("name") || control.tagName.toLowerCase();
        log.textContent = \`Target activation \${count}: \${name}\`;
      });
    </script>
  </body>
</html>
`;
}

export function prepareStableEvidenceReviewBundle(
  input: PrepareStableEvidenceInput,
): StableEvidenceReviewBundle {
  const outputDir = resolve(input.cwd, input.outputDir);
  mkdirSync(outputDir, { recursive: true });

  const automatedEvidencePath = join(outputDir, `${input.component}-automated-evidence.json`);
  const proposedEvidencePath = join(outputDir, `${input.component}.evidence.proposed.json`);
  const manualEvidencePath = join(outputDir, `${input.component}-manual-review.json`);
  const keyboardTranscriptPath = join(outputDir, `${input.component}-keyboard-transcript.json`);
  const screenReaderTranscriptPath = join(
    outputDir,
    `${input.component}-screen-reader-transcript.json`,
  );
  const reviewHarnessPath = join(outputDir, "REVIEW.html");
  const issuePath = join(outputDir, "ISSUE.md");
  const manifestPath = join(outputDir, "MANIFEST.json");
  const reviewChecklistPath = join(outputDir, "REVIEWER_CHECKLIST.md");
  const readmePath = join(outputDir, "README.md");

  const automatedEvidence = collectAutomatedEvidence({
    component: input.component,
    cwd: input.cwd,
    fixture: input.fixture,
    policy: input.policy,
    registryPath: input.registryPath,
  });
  writeFileSync(automatedEvidencePath, `${JSON.stringify(automatedEvidence, null, 2)}\n`);

  const proposedEvidence = applyEvidenceArtifact({
    artifactPath: automatedEvidencePath,
    component: input.component,
    cwd: input.cwd,
    registryPath: input.registryPath,
  });
  writeFileSync(proposedEvidencePath, `${JSON.stringify(proposedEvidence, null, 2)}\n`);

  const keyboardTranscript = buildManualTranscriptTemplate({
    component: input.component,
    cwd: input.cwd,
    registryPath: input.registryPath,
    transcriptType: "keyboard",
  });
  writeFileSync(keyboardTranscriptPath, `${JSON.stringify(keyboardTranscript, null, 2)}\n`);

  const screenReaderTranscript = buildManualTranscriptTemplate({
    component: input.component,
    cwd: input.cwd,
    registryPath: input.registryPath,
    transcriptType: "screen-reader",
  });
  writeFileSync(screenReaderTranscriptPath, `${JSON.stringify(screenReaderTranscript, null, 2)}\n`);

  const manualEvidence = buildManualEvidenceTemplate({
    component: input.component,
    cwd: input.cwd,
    registryPath: input.registryPath,
  });
  const keyboardReview = manualEvidence.manualTests.find((item) =>
    item.tech.toLowerCase().includes("keyboard"),
  );
  if (keyboardReview) {
    keyboardReview.evidence = cwdRelative(input.cwd, keyboardTranscriptPath);
  }
  const screenReaderReview = manualEvidence.manualTests.find((item) =>
    item.tech.toLowerCase().includes("screen reader"),
  );
  if (screenReaderReview) {
    screenReaderReview.evidence = cwdRelative(input.cwd, screenReaderTranscriptPath);
  }
  writeFileSync(manualEvidencePath, `${JSON.stringify(manualEvidence, null, 2)}\n`);

  const bundle: StableEvidenceReviewBundle = {
    component: automatedEvidence.component,
    version: automatedEvidence.version,
    outputDir,
    files: {
      automatedEvidence: automatedEvidencePath,
      issue: issuePath,
      manifest: manifestPath,
      proposedEvidence: proposedEvidencePath,
      manualEvidence: manualEvidencePath,
      keyboardTranscript: keyboardTranscriptPath,
      reviewHarness: reviewHarnessPath,
      reviewChecklist: reviewChecklistPath,
      screenReaderTranscript: screenReaderTranscriptPath,
      readme: readmePath,
    },
    automatedStatus: automatedEvidence.status,
  };
  writeFileSync(reviewHarnessPath, reviewerHarness(input));
  writeFileSync(issuePath, reviewIssueBody(bundle, input.cwd, input.registryPath, input.fixture));
  writeFileSync(readmePath, reviewerReadme(bundle, input.cwd, input.registryPath));
  writeFileSync(reviewChecklistPath, reviewerChecklist(bundle, input.cwd, input.registryPath));
  const manifest = reviewBundleManifest(bundle, input.cwd, input.registryPath, input.fixture);
  const manifestValidation = validate("stableEvidenceReviewManifest", manifest);
  if (!manifestValidation.ok) {
    throw new Error(
      `Generated stable evidence review manifest is invalid:\n${describeErrors(manifestValidation)}`,
    );
  }
  writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);

  return bundle;
}

export function prepareStableEvidenceReviewBatch(
  input: PrepareStableEvidenceBatchInput,
): StableEvidenceReviewBatch {
  const layer = input.layer ?? "markup-primitives";
  const outputDir = resolve(input.cwd, input.outputDir);
  mkdirSync(outputDir, { recursive: true });

  const components = listComponents(input.cwd, input.registryPath).filter(
    (component) => layer === "all" || component.layer === layer,
  );
  if (components.length === 0) {
    throw new Error(
      `No Ashlar components found for stable evidence review family: ${
        layer === "all" ? "all" : formatRegistryLayer(layer)
      }`,
    );
  }

  const bundles = components.map((component) => {
    const detail = getComponent(input.cwd, component.name, input.registryPath);
    return prepareStableEvidenceReviewBundle({
      component: detail.name,
      cwd: input.cwd,
      fixture: join(detail.directory, `${detail.name}.html`),
      outputDir: join(outputDir, detail.name),
      policy: input.policy,
      registryPath: input.registryPath,
    });
  });
  const index = join(outputDir, "INDEX.md");
  const batch: StableEvidenceReviewBatch = {
    automatedStatus: bundles.some((bundle) => bundle.automatedStatus === "fail") ? "fail" : "pass",
    bundles,
    index,
    layer,
    outputDir,
  };
  writeFileSync(index, batchReviewerIndex(batch, input.cwd, input.registryPath));

  return batch;
}
