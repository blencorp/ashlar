import { Option, type Command } from "commander";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { applyEvidenceArtifact } from "../lib/evidence-apply.js";
import { collectAutomatedEvidence } from "../lib/evidence-collect.js";
import { graduateEvidence, graduateEvidencePacket } from "../lib/evidence-graduate.js";
import { formatRegistryLayer, parseRegistryLayerAlias } from "../lib/layers.js";
import { buildManualEvidenceTemplate } from "../lib/evidence-manual-template.js";
import { publishEvidence } from "../lib/evidence-publish.js";
import { applyManualReview } from "../lib/evidence-review.js";
import {
  prepareStableEvidenceReviewBatch,
  prepareStableEvidenceReviewBundle,
} from "../lib/evidence-review-bundle.js";
import { buildStableEvidenceReviewStatus } from "../lib/evidence-review-status.js";
import {
  buildManualTranscriptTemplate,
  checkManualTranscriptCompletion,
  isManualTranscriptType,
  readManualTranscriptArtifact,
} from "../lib/evidence-transcript.js";
import { readConfig } from "../lib/project.js";
import { checkEvidence } from "../lib/evidence-check.js";
import { buildEvidenceReport } from "../lib/evidence-report.js";
import {
  getComponent,
  listComponents,
  type EvidencePacket,
  type RegistryLayer,
} from "../lib/registry.js";
import { isKnownAuditPolicy, knownAuditPolicies, type AuditPolicy } from "../lib/audit-runner.js";
import { describeErrors, validate } from "../lib/schema-validate.js";

type EvidenceOptions = {
  artifact?: string;
  check?: boolean;
  evidenceFile?: string;
  fixture?: string;
  format: string;
  family?: string;
  keyId?: string;
  layer?: string;
  manualFile?: string;
  output?: string;
  policy?: string;
  registry?: string;
  report?: string;
  reviewDir?: string;
  signingKey?: string;
  transcript?: string;
  type?: string;
};

function collectComponents(component: string | undefined, registry: string) {
  return component
    ? [getComponent(process.cwd(), component, registry)]
    : listComponents(process.cwd(), registry).map((item) =>
        getComponent(process.cwd(), item.name, registry),
      );
}

function componentWithEvidenceFile(component: string | undefined, registry: string, path: string) {
  if (!component) {
    throw new Error("Component is required when --evidence-file is used.");
  }

  const detail = getComponent(process.cwd(), component, registry);
  const evidence = JSON.parse(readFileSync(path, "utf8")) as EvidencePacket;
  const result = validate("evidence", evidence);
  if (!result.ok) {
    throw new Error(`Invalid Ashlar evidence packet at ${path}:\n${describeErrors(result)}`);
  }

  return [{ ...detail, evidence }];
}

function stableEvidenceBatchLayer(value: string | undefined): RegistryLayer | "all" {
  return parseRegistryLayerAlias(value);
}

export function registerEvidenceCommand(program: Command) {
  program
    .command("evidence")
    .description("Show and collect component accessibility evidence")
    .argument(
      "[args...]",
      "Component name, or: collect/apply/review/review-status/finalize-stable/graduate/manual-template/transcript-template/transcript-validate/prepare-stable <component>/prepare-stable-all",
    )
    .option("--artifact <path>", "Evidence artifact path for evidence apply")
    .option("--check", "Check registry evidence gates for stable claims")
    .option("--evidence-file <path>", "Evidence packet path to check instead of registry packet")
    .option("--fixture <path>", "Fixture file to validate for evidence collect")
    .option("--format <format>", "Output format: text or json", "text")
    .option("--key-id <id>", "Trusted local signing key id for evidence publish")
    .option(
      "--family <family>",
      "Capsule family for evidence prepare-stable-all: foundations, interactive-controls, framework-adapters, service-patterns, application-blocks, or all",
    )
    .addOption(new Option("--layer <layer>", "Deprecated alias for --family").hideHelp())
    .option("--manual-file <path>", "Manual evidence artifact path for evidence review")
    .option(
      "--output <path>",
      "JSON artifact/report output path, or output directory for evidence prepare-stable/prepare-stable-all",
    )
    .option("--policy <name>", "Audit policy to run for evidence collect", "components")
    .option("--registry <path>", "Registry path or URL")
    .option("--report <path>", "Write Markdown evidence report")
    .option("--review-dir <path>", "Prepared stable evidence review bundle directory")
    .option("--signing-key <path>", "Local Ed25519 private key path for evidence publish")
    .option("--transcript <path>", "Manual transcript artifact path for transcript-validate")
    .option("--type <type>", "Manual transcript type: keyboard or screen-reader")
    .action((args: string[] | undefined, options: EvidenceOptions) => {
      try {
        const positional = args ?? [];
        const config = readConfig();
        const registry = options.registry ?? config.registry;

        if (positional[0] === "collect") {
          const component = positional[1];
          if (!component) {
            throw new Error("Component is required for evidence collect.");
          }
          if (!options.fixture) {
            throw new Error("--fixture is required for evidence collect.");
          }
          if (!options.output) {
            throw new Error("--output is required for evidence collect.");
          }
          if (options.policy && !isKnownAuditPolicy(options.policy)) {
            throw new Error(
              `Unknown Ashlar policy pack: ${options.policy}\nKnown policies: ${[
                ...knownAuditPolicies,
              ]
                .sort()
                .join(", ")}`,
            );
          }

          const artifact = collectAutomatedEvidence({
            component,
            cwd: process.cwd(),
            fixture: options.fixture,
            policy: options.policy as AuditPolicy,
            registryPath: registry,
          });

          mkdirSync(dirname(options.output), { recursive: true });
          writeFileSync(options.output, `${JSON.stringify(artifact, null, 2)}\n`);
          console.log(
            `Collected automated evidence for ${artifact.component}@${artifact.version}: ${artifact.status}`,
          );
          console.log(`Wrote ${options.output}`);

          if (artifact.status === "fail") {
            process.exitCode = 1;
          }
          return;
        }

        if (positional[0] === "apply") {
          const component = positional[1];
          if (!component) {
            throw new Error("Component is required for evidence apply.");
          }
          if (!options.artifact) {
            throw new Error("--artifact is required for evidence apply.");
          }
          if (!options.output) {
            throw new Error("--output is required for evidence apply.");
          }

          const evidence = applyEvidenceArtifact({
            artifactPath: options.artifact,
            component,
            cwd: process.cwd(),
            registryPath: registry,
          });

          mkdirSync(dirname(options.output), { recursive: true });
          writeFileSync(options.output, `${JSON.stringify(evidence, null, 2)}\n`);
          console.log(
            `Applied automated evidence for ${evidence.component}@${evidence.version}: ${evidence.accessibilityStatus}`,
          );
          console.log(`Wrote ${options.output}`);
          return;
        }

        if (positional[0] === "prepare-stable-all") {
          if (options.family && options.layer) {
            throw new Error("Use --family instead of combining --family and --layer.");
          }
          if (!options.output) {
            throw new Error("--output is required for evidence prepare-stable-all.");
          }
          if (options.policy && !isKnownAuditPolicy(options.policy)) {
            throw new Error(
              `Unknown Ashlar policy pack: ${options.policy}\nKnown policies: ${[
                ...knownAuditPolicies,
              ]
                .sort()
                .join(", ")}`,
            );
          }

          const batch = prepareStableEvidenceReviewBatch({
            cwd: process.cwd(),
            layer: stableEvidenceBatchLayer(options.layer ?? options.family ?? "foundations"),
            outputDir: options.output,
            policy: options.policy as AuditPolicy,
            registryPath: registry,
          });

          const layerLabel =
            batch.layer === "all" ? "all registry families" : formatRegistryLayer(batch.layer);
          console.log(
            `Prepared ${batch.bundles.length} stable evidence review bundle(s) for ${layerLabel}: ${batch.automatedStatus}`,
          );
          for (const bundle of batch.bundles) {
            console.log(`  - ${bundle.component}@${bundle.version}: ${bundle.automatedStatus}`);
          }
          console.log(`Wrote ${batch.index}`);

          if (batch.automatedStatus === "fail") {
            process.exitCode = 1;
          }
          return;
        }

        if (positional[0] === "prepare-stable") {
          const component = positional[1];
          if (!component) {
            throw new Error("Component is required for evidence prepare-stable.");
          }
          if (!options.fixture) {
            throw new Error("--fixture is required for evidence prepare-stable.");
          }
          if (!options.output) {
            throw new Error("--output is required for evidence prepare-stable.");
          }
          if (options.policy && !isKnownAuditPolicy(options.policy)) {
            throw new Error(
              `Unknown Ashlar policy pack: ${options.policy}\nKnown policies: ${[
                ...knownAuditPolicies,
              ]
                .sort()
                .join(", ")}`,
            );
          }

          const bundle = prepareStableEvidenceReviewBundle({
            component,
            cwd: process.cwd(),
            fixture: options.fixture,
            outputDir: options.output,
            policy: options.policy as AuditPolicy,
            registryPath: registry,
          });

          console.log(
            `Prepared stable evidence review bundle for ${bundle.component}@${bundle.version}: ${bundle.automatedStatus}`,
          );
          console.log(`Wrote ${bundle.files.automatedEvidence}`);
          console.log(`Wrote ${bundle.files.proposedEvidence}`);
          console.log(`Wrote ${bundle.files.manualEvidence}`);
          console.log(`Wrote ${bundle.files.keyboardTranscript}`);
          console.log(`Wrote ${bundle.files.screenReaderTranscript}`);
          console.log(`Wrote ${bundle.files.issue}`);
          console.log(`Wrote ${bundle.files.manifest}`);
          console.log(`Wrote ${bundle.files.reviewChecklist}`);
          console.log(`Wrote ${bundle.files.readme}`);

          if (bundle.automatedStatus === "fail") {
            process.exitCode = 1;
          }
          return;
        }

        if (positional[0] === "review-status") {
          const component = positional[1];
          if (!component) {
            throw new Error("Component is required for evidence review-status.");
          }
          if (!options.reviewDir) {
            throw new Error("--review-dir is required for evidence review-status.");
          }

          const report = buildStableEvidenceReviewStatus({
            component,
            cwd: process.cwd(),
            registryPath: registry,
            reviewDir: options.reviewDir,
          });
          const validation = validate("stableEvidenceReviewStatus", report);
          if (!validation.ok) {
            throw new Error(
              `Generated stable evidence review status is invalid:\n${describeErrors(validation)}`,
            );
          }
          const json = `${JSON.stringify(report, null, 2)}\n`;

          if (options.output) {
            mkdirSync(dirname(options.output), { recursive: true });
            writeFileSync(options.output, json);
          }

          if (options.format === "json") {
            if (!options.output) {
              console.log(json.trimEnd());
            }
          } else {
            console.log(
              `Stable evidence review status for ${report.component}@${report.version}: ${report.status}`,
            );
            if (report.blockers.length > 0) {
              for (const blocker of report.blockers) {
                console.log(`BLOCKED ${blocker.file} ${blocker.rule}`);
                console.log(`  ${blocker.message}`);
              }
            } else {
              console.log("Ready to finalize reviewed and stable evidence proposal artifacts.");
            }
            console.log("Next:");
            for (const command of report.nextCommands) {
              console.log(`  ${command}`);
            }
          }
          if (options.output) {
            console.log(`Wrote stable evidence review status to ${options.output}`);
          }

          if (report.status === "blocked") {
            process.exitCode = 1;
          }
          return;
        }

        if (positional[0] === "review") {
          const component = positional[1];
          if (!component) {
            throw new Error("Component is required for evidence review.");
          }
          if (!options.evidenceFile) {
            throw new Error("--evidence-file is required for evidence review.");
          }
          if (!options.manualFile) {
            throw new Error("--manual-file is required for evidence review.");
          }
          if (!options.output) {
            throw new Error("--output is required for evidence review.");
          }

          const evidence = applyManualReview({
            component,
            cwd: process.cwd(),
            evidencePath: options.evidenceFile,
            manualPath: options.manualFile,
            registryPath: registry,
          });

          mkdirSync(dirname(options.output), { recursive: true });
          writeFileSync(options.output, `${JSON.stringify(evidence, null, 2)}\n`);
          console.log(
            `Applied manual review for ${evidence.component}@${evidence.version}: ${evidence.accessibilityStatus}`,
          );
          console.log(`Wrote ${options.output}`);
          return;
        }

        if (positional[0] === "finalize-stable") {
          const component = positional[1];
          if (!component) {
            throw new Error("Component is required for evidence finalize-stable.");
          }
          if (!options.reviewDir) {
            throw new Error("--review-dir is required for evidence finalize-stable.");
          }

          const report = buildStableEvidenceReviewStatus({
            component,
            cwd: process.cwd(),
            registryPath: registry,
            reviewDir: options.reviewDir,
          });
          if (report.status === "blocked") {
            throw new Error(
              `Stable evidence review bundle is blocked:\n${report.blockers
                .map((blocker) => `  - ${blocker.file} ${blocker.rule}: ${blocker.message}`)
                .join("\n")}`,
            );
          }

          const proposedPath = join(options.reviewDir, `${component}.evidence.proposed.json`);
          const manualPath = join(options.reviewDir, `${component}-manual-review.json`);
          const reviewedPath = join(options.reviewDir, `${component}.evidence.reviewed.json`);
          const stablePath = join(options.reviewDir, `${component}.evidence.stable.json`);
          const reviewed = applyManualReview({
            component,
            cwd: process.cwd(),
            evidencePath: proposedPath,
            manualPath,
            registryPath: registry,
          });
          const stable = graduateEvidencePacket({
            component,
            cwd: process.cwd(),
            evidence: reviewed,
            registryPath: registry,
          });

          mkdirSync(dirname(reviewedPath), { recursive: true });
          writeFileSync(reviewedPath, `${JSON.stringify(reviewed, null, 2)}\n`);
          writeFileSync(stablePath, `${JSON.stringify(stable, null, 2)}\n`);
          console.log(`Finalized stable evidence review for ${stable.component}@${stable.version}`);
          console.log(`Wrote ${reviewedPath}`);
          console.log(`Wrote ${stablePath}`);
          return;
        }

        if (positional[0] === "manual-template") {
          const component = positional[1];
          if (!component) {
            throw new Error("Component is required for evidence manual-template.");
          }
          if (!options.output) {
            throw new Error("--output is required for evidence manual-template.");
          }

          const artifact = buildManualEvidenceTemplate({
            component,
            cwd: process.cwd(),
            registryPath: registry,
          });

          mkdirSync(dirname(options.output), { recursive: true });
          writeFileSync(options.output, `${JSON.stringify(artifact, null, 2)}\n`);
          console.log(
            `Wrote manual evidence template for ${artifact.component}@${artifact.version}`,
          );
          console.log(`Wrote ${options.output}`);
          return;
        }

        if (positional[0] === "transcript-template") {
          const component = positional[1];
          if (!component) {
            throw new Error("Component is required for evidence transcript-template.");
          }
          if (!options.output) {
            throw new Error("--output is required for evidence transcript-template.");
          }
          if (!isManualTranscriptType(options.type)) {
            throw new Error(
              "--type must be keyboard or screen-reader for evidence transcript-template.",
            );
          }

          const artifact = buildManualTranscriptTemplate({
            component,
            cwd: process.cwd(),
            registryPath: registry,
            transcriptType: options.type,
          });

          mkdirSync(dirname(options.output), { recursive: true });
          writeFileSync(options.output, `${JSON.stringify(artifact, null, 2)}\n`);
          console.log(
            `Wrote ${artifact.transcriptType} manual transcript template for ${artifact.component}@${artifact.version}`,
          );
          console.log(`Wrote ${options.output}`);
          return;
        }

        if (positional[0] === "transcript-validate") {
          const component = positional[1];
          if (!component) {
            throw new Error("Component is required for evidence transcript-validate.");
          }
          if (!options.transcript) {
            throw new Error("--transcript is required for evidence transcript-validate.");
          }
          if (options.type && !isManualTranscriptType(options.type)) {
            throw new Error(
              "--type must be keyboard or screen-reader for evidence transcript-validate.",
            );
          }
          const expectedType = isManualTranscriptType(options.type) ? options.type : undefined;

          const artifact = readManualTranscriptArtifact({
            component,
            cwd: process.cwd(),
            expectedType,
            path: options.transcript,
            registryPath: registry,
          });
          const completionFindings = checkManualTranscriptCompletion(artifact);
          if (completionFindings.length > 0) {
            throw new Error(
              `Manual ${artifact.transcriptType} transcript is incomplete:\n${completionFindings
                .map((finding) => `  - ${finding}`)
                .join("\n")}`,
            );
          }

          console.log(
            `Valid ${artifact.transcriptType} manual transcript for ${artifact.component}@${artifact.version}: ${artifact.result}`,
          );
          return;
        }

        if (positional[0] === "graduate") {
          const component = positional[1];
          if (!component) {
            throw new Error("Component is required for evidence graduate.");
          }
          if (!options.evidenceFile) {
            throw new Error("--evidence-file is required for evidence graduate.");
          }
          if (!options.output) {
            throw new Error("--output is required for evidence graduate.");
          }

          const evidence = graduateEvidence({
            component,
            cwd: process.cwd(),
            evidencePath: options.evidenceFile,
            registryPath: registry,
          });

          mkdirSync(dirname(options.output), { recursive: true });
          writeFileSync(options.output, `${JSON.stringify(evidence, null, 2)}\n`);
          console.log(
            `Graduated evidence for ${evidence.component}@${evidence.version}: ${evidence.accessibilityStatus}`,
          );
          console.log(`Wrote ${options.output}`);
          return;
        }

        if (positional[0] === "publish") {
          const component = positional[1];
          if (!component) {
            throw new Error("Component is required for evidence publish.");
          }
          if (!options.evidenceFile) {
            throw new Error("--evidence-file is required for evidence publish.");
          }
          if (!options.signingKey) {
            throw new Error("--signing-key is required for evidence publish.");
          }
          if (!options.keyId) {
            throw new Error("--key-id is required for evidence publish.");
          }

          const result = publishEvidence({
            component,
            cwd: process.cwd(),
            evidencePath: options.evidenceFile,
            keyId: options.keyId,
            registryPath: registry,
            signingKeyPath: options.signingKey,
          });
          const json = `${JSON.stringify(result, null, 2)}\n`;
          if (options.output) {
            mkdirSync(dirname(options.output), { recursive: true });
            writeFileSync(options.output, json);
          }
          if (options.format === "json") {
            if (!options.output) {
              console.log(json.trimEnd());
            }
          } else {
            console.log(`Published stable evidence for ${result.component}@${result.version}`);
            console.log(`Updated capsule hash: ${result.capsuleHash}`);
            if (options.output) {
              console.log(`Wrote evidence publication receipt to ${options.output}`);
            }
          }
          return;
        }

        const component = positional[0];
        if (positional.length > 1) {
          throw new Error(`Unexpected evidence arguments: ${positional.slice(1).join(" ")}`);
        }

        if (options.report) {
          const components = options.evidenceFile
            ? componentWithEvidenceFile(component, registry, options.evidenceFile)
            : collectComponents(component, registry);
          const result = checkEvidence(components, {
            evidenceRoot: options.evidenceFile ? process.cwd() : (item) => item.directory,
          });
          mkdirSync(dirname(options.report), { recursive: true });
          writeFileSync(options.report, buildEvidenceReport(components, result, registry));
          console.log(`Wrote evidence report to ${options.report}`);

          if (result.findings.some((finding) => finding.level === "error")) {
            process.exitCode = 1;
          }
          return;
        }

        if (options.check) {
          const components = options.evidenceFile
            ? componentWithEvidenceFile(component, registry, options.evidenceFile)
            : collectComponents(component, registry);
          const result = checkEvidence(components, {
            evidenceRoot: options.evidenceFile ? process.cwd() : (item) => item.directory,
          });

          if (options.format === "json") {
            console.log(JSON.stringify(result, null, 2));
          } else if (result.findings.length === 0) {
            console.log(`Evidence check passed for ${result.components} component(s)`);
          } else {
            for (const finding of result.findings) {
              console.log(
                `${finding.level.toUpperCase()} ${finding.component}@${finding.version} ${finding.rule}`,
              );
              console.log(`  ${finding.message}`);
            }
            console.log(
              `Evidence check failed with ${result.findings.length} finding(s) across ${result.components} component(s)`,
            );
          }

          if (result.findings.some((finding) => finding.level === "error")) {
            process.exitCode = 1;
          }
          return;
        }

        if (!component) {
          throw new Error("Component is required unless --check is used.");
        }

        const detail = getComponent(process.cwd(), component, registry);

        if (options.format === "json") {
          console.log(JSON.stringify(detail.evidence, null, 2));
          return;
        }

        console.log(`${detail.evidence.component}@${detail.evidence.version}`);
        console.log(`stability: ${detail.evidence.stability}`);
        console.log(`accessibility: ${detail.evidence.accessibilityStatus}`);
      } catch (error) {
        console.error(error instanceof Error ? error.message : String(error));
        process.exitCode = 1;
      }
    });
}
