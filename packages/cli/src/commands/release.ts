import type { Command } from "commander";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import {
  checkExternalReviewRecords,
  writeDesignPartnerReviewChecklist,
  writeExternalReviewRecord,
  type ExternalReviewRecordKind,
} from "../lib/external-review-record.js";
import { verifyReleaseAttestation, writeReleaseAttestation } from "../lib/release-attestation.js";
import {
  checkReleaseProvenanceReadiness,
  verifyPublicNpmProvenance,
} from "../lib/release-provenance.js";
import { verifyPublicCapsuleTrust } from "../lib/release-public-trust.js";
import { checkReleaseReadiness } from "../lib/release-readiness.js";
import { buildReleaseReadinessReport } from "../lib/release-readiness-report.js";
import { writeReleaseReviewPack } from "../lib/release-review-pack.js";
import { signCapsuleBundles } from "../lib/release-sign-capsules.js";
import { writeReleaseSbom } from "../lib/release-sbom.js";
import {
  verifyReleaseTrustBundle,
  writeReleaseTrustBundle,
  writeReleaseTrustReviewChecklist,
} from "../lib/release-trust-bundle.js";
import { describeErrors, validate } from "../lib/schema-validate.js";

type ReleaseSbomOptions = {
  output: string;
};

type ReleaseAttestOptions = {
  output: string;
  subject: string;
};

type ReleaseVerifyAttestationOptions = {
  attestation: string;
  subject: string;
};

type ReleaseTrustBundleOptions = {
  attestation: string;
  checklist?: string;
  output: string;
  registry?: string;
  sbom: string;
};

type ReleaseVerifyTrustBundleOptions = {
  attestation: string;
  bundle: string;
  registry?: string;
  sbom: string;
};

type ReleaseReadinessOptions = {
  aiEvalSuite: string;
  allowLocalSignatures?: boolean;
  allowUnverifiedPublic?: boolean;
  json?: boolean;
  jsonOutput?: string;
  minL0: string;
  minStableL0: string;
  report?: string;
  registry?: string;
};

type ReleaseDesignPartnerChecklistOptions = {
  legacyFixture: string;
  output: string;
  registry?: string;
  serviceFlowFixture: string;
  task: string;
};

type ReleaseReviewPackOptions = {
  aiEvalSuite: string;
  minL0: string;
  minStableL0: string;
  output: string;
  registry?: string;
  stableComponent: string;
};

type ReleaseSignCapsulesOptions = {
  certificateIdentity?: string;
  certificateOidcIssuer?: string;
  cosign?: string;
  registry?: string;
};

type ReleasePublicProvenanceOptions = {
  json?: boolean;
  npm?: string;
  package?: string[];
  registryUrl?: string;
};

type ReleasePublicTrustOptions = {
  cosign?: string;
  json?: boolean;
  registry?: string;
};

type ReleaseReviewRecordOptions = {
  adoptionGoal?: string;
  affiliation?: string;
  attestation?: string;
  blockingFindings?: string;
  commandsRun?: string;
  component?: string;
  demo?: string;
  docsGaps?: string;
  followUp?: string;
  guidance?: string;
  integrationPath?: string;
  missingPrimitives?: string;
  nonBlockingFindings?: string;
  npmProvenance?: string;
  output: string;
  package?: string[];
  publicationReceipt?: string;
  productSurface?: string;
  project?: string;
  rationale?: string;
  registry?: string;
  registryArtifact?: string;
  releaseCandidate?: string;
  reviewChecklist?: string;
  repoCommit?: string;
  reviewDate?: string;
  reviewDir?: string;
  reviewer?: string;
  sbom?: string;
  scenario?: string;
  screensReviewed?: string;
  sigstoreVerification?: string;
  sourceIssue?: string;
  trustBundle?: string;
  unclear?: string;
  userRole?: string;
  validatorOutput?: string;
  whatWorked?: string;
  workflowRun?: string;
  wouldNotAdopt?: string;
  wouldOnlyUseValidator?: string;
  wouldReplaceUswds?: string;
  wouldUseBesideUswds?: string;
};

type ReleaseReviewRecordCheckOptions = {
  json?: boolean;
};

function integerOption(value: string, name: string): number {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed < 0 || String(parsed) !== value) {
    throw new Error(`${name} must be a non-negative integer.`);
  }
  return parsed;
}

function requiredReviewRecordOption(value: string | undefined, name: string): string {
  if (!value) {
    throw new Error(`${name} is required.`);
  }
  return value;
}

function reviewRecordKind(value: string): ExternalReviewRecordKind {
  if (value === "design-partner" || value === "release-trust" || value === "stable-evidence") {
    return value;
  }
  throw new Error(
    "review-record type must be one of: stable-evidence, release-trust, design-partner.",
  );
}

export function registerReleaseCommand(program: Command) {
  const release = program.command("release").description("Prepare Ashlar release artifacts");

  release
    .command("sign-capsules")
    .description("Sign registry capsule manifests with keyless Sigstore bundles")
    .argument("[components...]", "Optional component names to sign")
    .option("--registry <path>", "Registry path (defaults to ./registry)")
    .option("--cosign <path>", "cosign executable path (defaults to cosign)")
    .option("--certificate-identity <identity>", "Expected signing certificate identity")
    .option("--certificate-oidc-issuer <issuer>", "Expected signing OIDC issuer")
    .action((components: string[], options: ReleaseSignCapsulesOptions) => {
      try {
        const result = signCapsuleBundles({
          certificateIdentity: options.certificateIdentity,
          certificateOidcIssuer: options.certificateOidcIssuer,
          components,
          cosignPath: options.cosign,
          cwd: process.cwd(),
          registryPath: options.registry ?? "./registry",
        });
        for (const capsule of result.capsules) {
          console.log(
            `Signed ${capsule.component}@${capsule.version}: ${capsule.bundle} ${capsule.bundleHash}`,
          );
        }
        console.log(`Signed ${result.capsules.length} capsule manifest(s)`);
      } catch (error) {
        console.error(error instanceof Error ? error.message : String(error));
        process.exitCode = 1;
      }
    });

  release
    .command("provenance-check")
    .description("Check local npm provenance publishing readiness")
    .action(() => {
      try {
        const result = checkReleaseProvenanceReadiness(process.cwd());
        if (result.errors.length > 0) {
          console.error("npm provenance readiness failed:");
          for (const error of result.errors) {
            console.error(`  - ${error}`);
          }
          process.exitCode = 1;
          return;
        }

        console.log("npm provenance readiness verified");
        for (const releasePackage of result.packages) {
          console.log(`  - ${releasePackage.name} (${releasePackage.directory})`);
        }
        for (const warning of result.warnings) {
          console.warn(`Warning: ${warning}`);
        }
      } catch (error) {
        console.error(error instanceof Error ? error.message : String(error));
        process.exitCode = 1;
      }
    });

  release
    .command("provenance-verify-public")
    .description("Verify public npm provenance for published release packages")
    .option("--npm <path>", "npm executable path (defaults to npm)")
    .option("--package <spec...>", "Exact package spec(s), for example @ashlar/cli@0.0.0")
    .option("--registry-url <url>", "npm registry URL", "https://registry.npmjs.org")
    .option("--json", "Print JSON verification report")
    .action((options: ReleasePublicProvenanceOptions) => {
      try {
        const result = verifyPublicNpmProvenance({
          cwd: process.cwd(),
          npmPath: options.npm,
          packages: options.package,
          registryUrl: options.registryUrl,
        });

        if (options.json) {
          console.log(JSON.stringify(result, null, 2));
        } else if (result.errors.length > 0) {
          console.error("Public npm provenance verification failed:");
          for (const error of result.errors) {
            console.error(`  - ${error}`);
          }
        } else {
          console.log("Public npm provenance verified");
          for (const releasePackage of result.packages) {
            console.log(`  - ${releasePackage.name}@${releasePackage.version}`);
          }
        }

        if (result.errors.length > 0) {
          process.exitCode = 1;
        }
      } catch (error) {
        console.error(error instanceof Error ? error.message : String(error));
        process.exitCode = 1;
      }
    });

  release
    .command("public-trust-verify")
    .description("Verify public capsule Sigstore trust for a signed registry artifact")
    .argument("[components...]", "Optional component names to verify")
    .option("--registry <path>", "Registry path (defaults to ./registry)")
    .option("--cosign <path>", "cosign executable path (defaults to cosign)")
    .option("--json", "Print JSON verification report")
    .action((components: string[], options: ReleasePublicTrustOptions) => {
      try {
        const result = verifyPublicCapsuleTrust({
          components,
          cosignPath: options.cosign,
          cwd: process.cwd(),
          registryPath: options.registry ?? "./registry",
        });

        if (options.json) {
          console.log(JSON.stringify(result, null, 2));
        } else if (result.errors.length > 0) {
          console.error("Public capsule Sigstore trust verification failed:");
          for (const error of result.errors) {
            console.error(`  - ${error}`);
          }
        } else {
          console.log("Public capsule Sigstore trust verified");
          for (const capsule of result.capsules) {
            console.log(
              `  - ${capsule.component}@${capsule.version} ${capsule.bundle} ${capsule.bundleHash}`,
            );
          }
        }

        if (result.errors.length > 0) {
          process.exitCode = 1;
        }
      } catch (error) {
        console.error(error instanceof Error ? error.message : String(error));
        process.exitCode = 1;
      }
    });

  release
    .command("readiness")
    .description("Check replacement-grade release readiness")
    .option("--registry <path>", "Registry path (defaults to ./registry)")
    .option("--ai-eval-suite <path>", "AI eval suite path", "examples/ai-eval/ashlar-ai-eval.json")
    .option("--min-l0 <count>", "Minimum L0 components required", "5")
    .option("--min-stable-l0 <count>", "Minimum stable-evidence L0 components required", "1")
    .option(
      "--allow-unverified-public",
      "Warn instead of failing on public npm provenance that cannot be verified locally",
    )
    .option(
      "--allow-local-signatures",
      "Warn instead of failing while capsules still use local signatures instead of Sigstore",
    )
    .option("--json", "Print JSON readiness report")
    .option("--json-output <path>", "Write a schema-backed JSON readiness report")
    .option("--report <path>", "Write a Markdown readiness report")
    .action((options: ReleaseReadinessOptions) => {
      try {
        const report = checkReleaseReadiness({
          aiEvalSuitePath: options.aiEvalSuite,
          allowLocalSignatures: options.allowLocalSignatures,
          allowUnverifiedPublic: options.allowUnverifiedPublic,
          cwd: process.cwd(),
          minL0Components: integerOption(options.minL0, "--min-l0"),
          minStableL0Components: integerOption(options.minStableL0, "--min-stable-l0"),
          registryPath: options.registry ?? "./registry",
        });
        const validation = validate("releaseReadiness", report);
        if (!validation.ok) {
          throw new Error(`Generated release readiness report is invalid:\n${describeErrors(validation)}`);
        }

        if (options.jsonOutput) {
          mkdirSync(dirname(options.jsonOutput), { recursive: true });
          writeFileSync(options.jsonOutput, `${JSON.stringify(report, null, 2)}\n`);
          console.log(`Wrote release readiness JSON to ${options.jsonOutput}`);
        }

        if (options.report) {
          mkdirSync(dirname(options.report), { recursive: true });
          writeFileSync(options.report, buildReleaseReadinessReport(report));
          console.log(`Wrote release readiness report to ${options.report}`);
        }

        if (options.json) {
          console.log(JSON.stringify(report, null, 2));
        } else {
          console.log(
            `Release readiness: ${report.status} (${report.summary.passed} passed, ${report.summary.warnings} warning, ${report.summary.failed} failed)`,
          );
          for (const item of report.checks) {
            console.log(`${item.status.toUpperCase()} ${item.id}: ${item.summary}`);
            for (const detail of item.details) {
              console.log(`  - ${detail}`);
            }
          }
        }

        if (report.status === "fail") {
          process.exitCode = 1;
        }
      } catch (error) {
        console.error(error instanceof Error ? error.message : String(error));
        process.exitCode = 1;
      }
    });

  release
    .command("review-pack")
    .description("Write local intake artifacts for external release review")
    .requiredOption("--output <dir>", "Output directory for reviewer intake artifacts")
    .option("--registry <path>", "Registry path (defaults to ./registry)")
    .option("--stable-component <name>", "Stable evidence target component", "button")
    .option("--ai-eval-suite <path>", "AI eval suite path", "examples/ai-eval/ashlar-ai-eval.json")
    .option("--min-l0 <count>", "Minimum L0 components required", "5")
    .option("--min-stable-l0 <count>", "Minimum stable-evidence L0 components required", "1")
    .action((options: ReleaseReviewPackOptions) => {
      try {
        const result = writeReleaseReviewPack({
          aiEvalSuitePath: options.aiEvalSuite,
          cwd: process.cwd(),
          minL0Components: integerOption(options.minL0, "--min-l0"),
          minStableL0Components: integerOption(options.minStableL0, "--min-stable-l0"),
          outputDir: options.output,
          registryPath: options.registry ?? "./registry",
          stableComponent: options.stableComponent,
        });

        console.log(`Wrote release review pack to ${result.outputDir}`);
        console.log(
          `Strict readiness remains ${result.readiness.status}; this pack is intake material, not proof.`,
        );
        console.log(`Stable evidence target: ${result.stableEvidenceTarget}`);
        console.log(`Stable evidence status: ${result.stableEvidenceStatus}`);
        console.log(`Read ${result.files.readme}`);
      } catch (error) {
        console.error(error instanceof Error ? error.message : String(error));
        process.exitCode = 1;
      }
    });

  release
    .command("design-partner-checklist")
    .description("Write a design partner reviewer checklist")
    .requiredOption("--output <path>", "Output Markdown checklist path")
    .option("--registry <path>", "Registry path (defaults to ./registry)")
    .option(
      "--legacy-fixture <path>",
      "Legacy federal fixture path",
      "examples/legacy-federal-project/index.html",
    )
    .option(
      "--service-flow-fixture <path>",
      "Service-flow proof fixture path",
      "examples/service-flow/benefit-application.pass.html",
    )
    .option(
      "--task <text>",
      "Task prompt for suggestion review",
      "Build a benefits application form",
    )
    .action((options: ReleaseDesignPartnerChecklistOptions) => {
      try {
        writeDesignPartnerReviewChecklist({
          legacyFixture: options.legacyFixture,
          output: options.output,
          registryPath: options.registry ?? "./registry",
          serviceFlowFixture: options.serviceFlowFixture,
          task: options.task,
        });
        console.log(`Wrote design partner review checklist to ${options.output}`);
      } catch (error) {
        console.error(error instanceof Error ? error.message : String(error));
        process.exitCode = 1;
      }
    });

  release
    .command("review-record")
    .description("Write a completed external review record for replacement-grade readiness")
    .argument("<type>", "Record type: stable-evidence, release-trust, or design-partner")
    .requiredOption("--output <path>", "Top-level docs/reviews/*.md output path")
    .requiredOption("--reviewer <name>", "Reviewer name")
    .requiredOption("--affiliation <name>", "Reviewer affiliation")
    .requiredOption("--review-date <yyyy-mm-dd>", "Review date")
    .requiredOption("--source-issue <url>", "Source GitHub issue URL")
    .requiredOption("--repo-commit <sha>", "Reviewed repository commit")
    .requiredOption("--rationale <text>", "Decision rationale")
    .option("--blocking-findings <text>", "Blocking findings summary")
    .option("--non-blocking-findings <text>", "Non-blocking findings summary")
    .option("--follow-up <text>", "Follow-up summary or link")
    .option("--registry <path>", "Registry path (defaults to ./registry)")
    .option("--component <name>", "Stable evidence component name")
    .option("--review-dir <path>", "Stable evidence reviewer bundle directory")
    .option("--publication-receipt <path-or-url>", "Stable evidence publication receipt")
    .option("--release-candidate <version>", "Release candidate label or version")
    .option("--package <spec...>", "Published package spec(s) reviewed")
    .option("--registry-artifact <path-or-url>", "Signed registry artifact path or URL")
    .option("--npm-provenance <path-or-url>", "npm provenance verification artifact")
    .option("--sigstore-verification <path-or-url>", "Sigstore verification artifact")
    .option("--sbom <path-or-url>", "Release SBOM artifact")
    .option("--attestation <path-or-url>", "Release SBOM attestation artifact")
    .option("--trust-bundle <path-or-url>", "Release trust bundle artifact")
    .option("--workflow-run <url>", "GitHub Actions workflow run or artifact URL")
    .option("--scenario <text>", "Design partner scenario")
    .option("--product-surface <text>", "Product surface reviewed")
    .option("--integration-path <text>", "Integration path reviewed")
    .option("--project <text>", "Existing project or fixture reviewed")
    .option("--user-role <text>", "Reviewer user role")
    .option("--adoption-goal <text>", "Adoption goal")
    .option("--demo <text>", "Demo branch, URL, or fixture")
    .option("--commands-run <text>", "Commands run during review")
    .option("--screens-reviewed <text>", "Screens, recording, or screenshots reviewed")
    .option("--guidance <text>", "Generated AGENTS/DESIGN guidance reviewed")
    .option("--validator-output <text>", "Validator output reviewed")
    .option("--review-checklist <path-or-url>", "Design partner reviewer checklist used")
    .option("--what-worked <text>", "Design partner feedback: what worked")
    .option("--unclear <text>", "Design partner feedback: what was unclear")
    .option("--missing-primitives <text>", "Design partner feedback: missing primitives")
    .option("--docs-gaps <text>", "Design partner feedback: documentation gaps")
    .option("--would-replace-uswds <answer>", "Adoption assessment answer")
    .option("--would-use-beside-uswds <answer>", "Adoption assessment answer")
    .option("--would-only-use-validator <answer>", "Adoption assessment answer")
    .option("--would-not-adopt <answer>", "Adoption assessment answer")
    .action((type: string, options: ReleaseReviewRecordOptions) => {
      try {
        const kind = reviewRecordKind(type);
        const common = {
          affiliation: requiredReviewRecordOption(options.affiliation, "--affiliation"),
          blockingFindings: options.blockingFindings,
          cwd: process.cwd(),
          followUp: options.followUp,
          nonBlockingFindings: options.nonBlockingFindings,
          output: options.output,
          rationale: requiredReviewRecordOption(options.rationale, "--rationale"),
          repoCommit: requiredReviewRecordOption(options.repoCommit, "--repo-commit"),
          reviewDate: requiredReviewRecordOption(options.reviewDate, "--review-date"),
          reviewer: requiredReviewRecordOption(options.reviewer, "--reviewer"),
          sourceIssue: requiredReviewRecordOption(options.sourceIssue, "--source-issue"),
        };

        const result = writeExternalReviewRecord(
          kind === "stable-evidence"
            ? {
                ...common,
                component: requiredReviewRecordOption(options.component, "--component"),
                kind,
                publicationReceipt: requiredReviewRecordOption(
                  options.publicationReceipt,
                  "--publication-receipt",
                ),
                registryPath: options.registry ?? "./registry",
                reviewDir: requiredReviewRecordOption(options.reviewDir, "--review-dir"),
              }
            : kind === "release-trust"
              ? {
                  ...common,
                  attestation: requiredReviewRecordOption(options.attestation, "--attestation"),
                  kind,
                  npmProvenance: requiredReviewRecordOption(
                    options.npmProvenance,
                    "--npm-provenance",
                  ),
                  packages: options.package ?? [],
                  registryArtifact: requiredReviewRecordOption(
                    options.registryArtifact,
                    "--registry-artifact",
                  ),
                  releaseCandidate: requiredReviewRecordOption(
                    options.releaseCandidate,
                    "--release-candidate",
                  ),
                  sbom: requiredReviewRecordOption(options.sbom, "--sbom"),
                  sigstoreVerification: requiredReviewRecordOption(
                    options.sigstoreVerification,
                    "--sigstore-verification",
                  ),
                  trustBundle: requiredReviewRecordOption(options.trustBundle, "--trust-bundle"),
                  workflowRun: requiredReviewRecordOption(options.workflowRun, "--workflow-run"),
                }
              : {
                  ...common,
                  adoptionGoal: requiredReviewRecordOption(options.adoptionGoal, "--adoption-goal"),
                  commandsRun: requiredReviewRecordOption(options.commandsRun, "--commands-run"),
                  demo: requiredReviewRecordOption(options.demo, "--demo"),
                  docsGaps: requiredReviewRecordOption(options.docsGaps, "--docs-gaps"),
                  guidance: requiredReviewRecordOption(options.guidance, "--guidance"),
                  integrationPath: requiredReviewRecordOption(
                    options.integrationPath,
                    "--integration-path",
                  ),
                  kind,
                  missingPrimitives: requiredReviewRecordOption(
                    options.missingPrimitives,
                    "--missing-primitives",
                  ),
                  productSurface: requiredReviewRecordOption(
                    options.productSurface,
                    "--product-surface",
                  ),
                  project: requiredReviewRecordOption(options.project, "--project"),
                  reviewChecklist: requiredReviewRecordOption(
                    options.reviewChecklist,
                    "--review-checklist",
                  ),
                  scenario: requiredReviewRecordOption(options.scenario, "--scenario"),
                  screensReviewed: requiredReviewRecordOption(
                    options.screensReviewed,
                    "--screens-reviewed",
                  ),
                  unclear: requiredReviewRecordOption(options.unclear, "--unclear"),
                  userRole: requiredReviewRecordOption(options.userRole, "--user-role"),
                  validatorOutput: requiredReviewRecordOption(
                    options.validatorOutput,
                    "--validator-output",
                  ),
                  whatWorked: requiredReviewRecordOption(options.whatWorked, "--what-worked"),
                  wouldNotAdopt: requiredReviewRecordOption(
                    options.wouldNotAdopt,
                    "--would-not-adopt",
                  ),
                  wouldOnlyUseValidator: requiredReviewRecordOption(
                    options.wouldOnlyUseValidator,
                    "--would-only-use-validator",
                  ),
                  wouldReplaceUswds: requiredReviewRecordOption(
                    options.wouldReplaceUswds,
                    "--would-replace-uswds",
                  ),
                  wouldUseBesideUswds: requiredReviewRecordOption(
                    options.wouldUseBesideUswds,
                    "--would-use-beside-uswds",
                  ),
                },
        );

        console.log(`Wrote ${result.kind} review record to ${result.output}`);
      } catch (error) {
        console.error(error instanceof Error ? error.message : String(error));
        process.exitCode = 1;
      }
    });

  release
    .command("review-record-check")
    .description("Validate completed external review records before readiness")
    .argument("[records...]", "Optional top-level docs/reviews/*.md records to validate")
    .option("--json", "Print JSON validation report")
    .action((records: string[] | undefined, options: ReleaseReviewRecordCheckOptions) => {
      try {
        const report = checkExternalReviewRecords({
          cwd: process.cwd(),
          files: records,
        });

        if (options.json) {
          console.log(JSON.stringify(report, null, 2));
        } else {
          console.log(
            `External review records: ${report.status} (${report.records.filter((record) => record.status === "pass").length} passed, ${report.records.filter((record) => record.status === "fail").length} failed, ${report.missing.length} missing)`,
          );
          for (const missing of report.missing) {
            console.log(`MISSING ${missing}`);
          }
          for (const record of report.records) {
            console.log(`${record.status.toUpperCase()} ${record.file}`);
            for (const error of record.errors) {
              console.log(`  - ${error}`);
            }
          }
        }

        if (report.status === "fail") {
          process.exitCode = 1;
        }
      } catch (error) {
        console.error(error instanceof Error ? error.message : String(error));
        process.exitCode = 1;
      }
    });

  release
    .command("sbom")
    .description("Write an SPDX release SBOM")
    .requiredOption("--output <path>", "Output SPDX JSON path")
    .action((options: ReleaseSbomOptions) => {
      try {
        writeReleaseSbom(process.cwd(), options.output);
        console.log(`Wrote release SBOM to ${options.output}`);
      } catch (error) {
        console.error(error instanceof Error ? error.message : String(error));
        process.exitCode = 1;
      }
    });

  release
    .command("attest")
    .description("Write a tamper-evident release artifact attestation")
    .requiredOption("--subject <path>", "Release artifact to attest")
    .requiredOption("--output <path>", "Output attestation JSON path")
    .action((options: ReleaseAttestOptions) => {
      try {
        writeReleaseAttestation({
          output: options.output,
          subjectPath: options.subject,
        });
        console.log(`Wrote release attestation to ${options.output}`);
      } catch (error) {
        console.error(error instanceof Error ? error.message : String(error));
        process.exitCode = 1;
      }
    });

  release
    .command("verify-attestation")
    .description("Verify a release artifact attestation")
    .requiredOption("--subject <path>", "Release artifact to verify")
    .requiredOption("--attestation <path>", "Release artifact attestation JSON path")
    .action((options: ReleaseVerifyAttestationOptions) => {
      try {
        const errors = verifyReleaseAttestation({
          attestationPath: options.attestation,
          subjectPath: options.subject,
        });
        if (errors.length > 0) {
          console.error("Release attestation verification failed:");
          for (const error of errors) {
            console.error(`  - ${error}`);
          }
          process.exitCode = 1;
          return;
        }

        console.log("Release attestation verified");
      } catch (error) {
        console.error(error instanceof Error ? error.message : String(error));
        process.exitCode = 1;
      }
    });

  release
    .command("trust-bundle")
    .description("Write a release trust bundle for offline/procurement review")
    .requiredOption("--sbom <path>", "Release SBOM path")
    .requiredOption("--attestation <path>", "Release SBOM attestation path")
    .requiredOption("--output <path>", "Output trust bundle JSON path")
    .option("--checklist <path>", "Write a Markdown release trust reviewer checklist")
    .option("--registry <path>", "Registry path (defaults to ./registry)")
    .action((options: ReleaseTrustBundleOptions) => {
      try {
        const registryPath = options.registry ?? "./registry";
        const bundle = writeReleaseTrustBundle({
          cwd: process.cwd(),
          registryPath,
          sbomPath: options.sbom,
          attestationPath: options.attestation,
          output: options.output,
        });
        console.log(`Wrote release trust bundle to ${options.output}`);
        if (options.checklist) {
          writeReleaseTrustReviewChecklist({
            attestationPath: options.attestation,
            bundle,
            bundlePath: options.output,
            output: options.checklist,
            registryPath,
            sbomPath: options.sbom,
          });
          console.log(`Wrote release trust review checklist to ${options.checklist}`);
        }
      } catch (error) {
        console.error(error instanceof Error ? error.message : String(error));
        process.exitCode = 1;
      }
    });

  release
    .command("verify-trust-bundle")
    .description("Verify a release trust bundle against local artifacts")
    .requiredOption("--bundle <path>", "Release trust bundle path")
    .requiredOption("--sbom <path>", "Release SBOM path")
    .requiredOption("--attestation <path>", "Release SBOM attestation path")
    .option("--registry <path>", "Registry path (defaults to ./registry)")
    .action((options: ReleaseVerifyTrustBundleOptions) => {
      try {
        const errors = verifyReleaseTrustBundle({
          cwd: process.cwd(),
          registryPath: options.registry ?? "./registry",
          bundlePath: options.bundle,
          sbomPath: options.sbom,
          attestationPath: options.attestation,
        });
        if (errors.length > 0) {
          console.error("Release trust bundle verification failed:");
          for (const error of errors) {
            console.error(`  - ${error}`);
          }
          process.exitCode = 1;
          return;
        }

        console.log("Release trust bundle verified");
      } catch (error) {
        console.error(error instanceof Error ? error.message : String(error));
        process.exitCode = 1;
      }
    });
}
