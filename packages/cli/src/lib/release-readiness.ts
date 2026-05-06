import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { readCapsuleManifest, readVerifiedCapsuleManifest } from "./capsule.js";
import { checkBundleBudget } from "./bundle-budget.js";
import { checkEvidence } from "./evidence-check.js";
import {
  checkExternalReviewRecords,
} from "./external-review-record.js";
import { runAiEvalSuite } from "./ai-eval.js";
import { checkReleaseProvenanceReadiness } from "./release-provenance.js";
import {
  getComponent,
  listComponents,
  readRegistryTrustRoot,
  type RegistryComponent,
} from "./registry.js";

type ReadinessStatus = "pass" | "warning" | "fail";

export type ReleaseReadinessCheck = {
  details: string[];
  id: string;
  status: ReadinessStatus;
  summary: string;
};

export type ReleaseReadinessReport = {
  $schema: string;
  checks: ReleaseReadinessCheck[];
  generatedAt: string;
  schemaVersion: "1.0";
  status: "pass" | "fail";
  summary: {
    failed: number;
    passed: number;
    total: number;
    warnings: number;
  };
};

type ReleaseReadinessInput = {
  aiEvalSuitePath: string;
  allowLocalSignatures?: boolean;
  allowUnverifiedPublic?: boolean;
  cwd: string;
  minL0Components: number;
  minStableL0Components: number;
  registryPath: string;
};

function check(
  id: string,
  status: ReadinessStatus,
  summary: string,
  details: string[] = [],
): ReleaseReadinessCheck {
  return { id, status, summary, details };
}

function componentDetails(components: RegistryComponent[]): string[] {
  return components.map(
    (component) =>
      `${component.name}@${component.version} ${component.layer} ${component.stability} evidence:${component.evidence.accessibilityStatus}`,
  );
}

function registryCapsuleCheck(input: {
  components: RegistryComponent[];
  cwd: string;
  registryPath: string;
}): ReleaseReadinessCheck {
  const trustRoot = readRegistryTrustRoot(input.cwd, input.registryPath);
  if (!trustRoot) {
    return check("registry-capsules", "fail", "Registry trust root is missing.");
  }

  const errors: string[] = [];
  for (const component of input.components) {
    try {
      readVerifiedCapsuleManifest({
        directory: component.directory,
        name: component.name,
        version: component.version,
        layer: component.layer,
        stability: component.stability,
        registryCapsuleHash: component.capsuleHash,
        trustRoot: component.trustRoot,
      });
    } catch (error) {
      errors.push(
        `${component.name}@${component.version}: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  }

  if (errors.length > 0) {
    return check("registry-capsules", "fail", "One or more capsule manifests failed verification.", errors);
  }

  return check(
    "registry-capsules",
    "pass",
    `Verified ${input.components.length} capsule manifest(s) against the registry trust root.`,
  );
}

function componentCoverageCheck(input: {
  components: RegistryComponent[];
  minL0Components: number;
}): ReleaseReadinessCheck {
  const l0 = input.components.filter((component) => component.layer === "L0");
  if (l0.length < input.minL0Components) {
    return check(
      "component-coverage",
      "fail",
      `Requires at least ${input.minL0Components} L0 component(s); found ${l0.length}.`,
      componentDetails(l0),
    );
  }

  return check(
    "component-coverage",
    "pass",
    `Found ${l0.length} L0 component(s), meeting the ${input.minL0Components} component gate.`,
    componentDetails(l0),
  );
}

function stableEvidenceCheck(input: {
  components: RegistryComponent[];
  minStableL0Components: number;
}): ReleaseReadinessCheck {
  const stableL0 = input.components.filter(
    (component) =>
      component.layer === "L0" &&
      component.evidence.stability === "stable" &&
      component.evidence.accessibilityStatus === "stable-evidence",
  );

  if (stableL0.length < input.minStableL0Components) {
    return check(
      "stable-l0-evidence",
      "fail",
      `Requires at least ${input.minStableL0Components} stable-evidence L0 component(s); found ${stableL0.length}.`,
      componentDetails(input.components.filter((component) => component.layer === "L0")),
    );
  }

  return check(
    "stable-l0-evidence",
    "pass",
    `Found ${stableL0.length} stable-evidence L0 component(s).`,
    componentDetails(stableL0),
  );
}

function evidenceGateCheck(components: RegistryComponent[]): ReleaseReadinessCheck {
  const result = checkEvidence(components, { evidenceRoot: (component) => component.directory });
  const failures = result.findings.filter((finding) => finding.level === "error");
  if (failures.length > 0) {
    return check(
      "evidence-gate",
      "fail",
      `Evidence gate found ${failures.length} blocking finding(s).`,
      failures.map((finding) => `${finding.component}@${finding.version} ${finding.rule}: ${finding.message}`),
    );
  }

  return check(
    "evidence-gate",
    "pass",
    `Evidence gate passed for ${result.components} component(s).`,
  );
}

function bundleBudgetCheck(input: {
  cwd: string;
  registryPath: string;
}): ReleaseReadinessCheck {
  try {
    const report = checkBundleBudget({
      components: [],
      cwd: input.cwd,
      registryPath: input.registryPath,
    });
    const details = [
      `${report.summary.componentCount} L0 component(s)`,
      `${report.summary.cssGzipBytes} B CSS gzip / ${report.summary.maxCssGzipBytes} B budget`,
      `${report.summary.jsGzipBytes} B JS gzip / ${report.summary.maxJsGzipBytes ?? "unbounded"} B budget`,
    ];
    return check(
      "bundle-budget",
      report.status === "pass" ? "pass" : "fail",
      `Bundle budget ${report.status}.`,
      details,
    );
  } catch (error) {
    return check(
      "bundle-budget",
      "fail",
      "Bundle budget check could not run.",
      [error instanceof Error ? error.message : String(error)],
    );
  }
}

function aiEvalCheck(input: {
  aiEvalSuitePath: string;
  cwd: string;
  registryPath: string;
}): ReleaseReadinessCheck {
  const suitePath = resolve(input.cwd, input.aiEvalSuitePath);
  if (!existsSync(suitePath)) {
    return check("ai-eval", "fail", `AI eval suite is missing: ${suitePath}`);
  }

  try {
    const report = runAiEvalSuite({
      cwd: input.cwd,
      registryPath: input.registryPath,
      suitePath: input.aiEvalSuitePath,
    });
    return check(
      "ai-eval",
      report.status === "pass" ? "pass" : "fail",
      `AI eval suite ${report.status}: ${report.summary.passed}/${report.summary.total} case(s) passed.`,
      report.cases
        .filter((testCase) => testCase.status === "fail")
        .flatMap((testCase) => testCase.failures.map((failure) => `${testCase.id}: ${failure}`)),
    );
  } catch (error) {
    return check(
      "ai-eval",
      "fail",
      "AI eval suite could not run.",
      [error instanceof Error ? error.message : String(error)],
    );
  }
}

function provenanceCheck(cwd: string): ReleaseReadinessCheck {
  const result = checkReleaseProvenanceReadiness(cwd);
  if (result.errors.length > 0) {
    return check(
      "npm-provenance-local",
      "fail",
      "Local npm provenance prerequisites are incomplete.",
      result.errors,
    );
  }

  return check(
    "npm-provenance-local",
    "pass",
    `Local npm provenance prerequisites passed for ${result.packages.length} package(s).`,
    result.warnings,
  );
}

function publicProvenanceCheck(allowUnverifiedPublic: boolean | undefined): ReleaseReadinessCheck {
  const details = [
    "Verify npmjs.com trusted publisher settings for ashlar, @ashlar/cli, and @ashlar/schemas.",
    "Publish a real release from GitHub-hosted CI.",
    "Run ashlar release provenance-verify-public against the published package versions.",
  ];
  return check(
    "npm-provenance-public",
    allowUnverifiedPublic ? "warning" : "fail",
    "Public npm trusted publishing and provenance cannot be proven from the local repository.",
    details,
  );
}

function sigstoreCheck(input: {
  allowLocalSignatures?: boolean;
  components: RegistryComponent[];
  trustRoot?: ReturnType<typeof readRegistryTrustRoot>;
}): ReleaseReadinessCheck {
  const errors: string[] = [];
  const sigstoreCapsules: string[] = [];
  const localSignatureCapsules: string[] = [];

  for (const component of input.components) {
    try {
      const manifest = readCapsuleManifest(component.directory, component.name);
      if (manifest.sigstore) {
        sigstoreCapsules.push(`${component.name}@${component.version}`);
      } else {
        localSignatureCapsules.push(`${component.name}@${component.version}`);
      }
    } catch (error) {
      errors.push(
        `${component.name}@${component.version}: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  }

  if (errors.length > 0) {
    return check(
      "sigstore-public-trust",
      "fail",
      "Capsule Sigstore metadata could not be inspected.",
      errors,
    );
  }

  const bundleVerification = input.trustRoot?.sigstore?.bundleVerification ?? "metadata";
  const cosignPolicyDetail =
    bundleVerification === "cosign"
      ? "Registry trust root requires cosign verification for declared capsule Sigstore bundles."
      : "Registry trust root does not require cosign verification for declared capsule Sigstore bundles yet.";

  if (localSignatureCapsules.length === 0 && bundleVerification === "cosign") {
    return check(
      "sigstore-public-trust",
      "pass",
      `All ${sigstoreCapsules.length} capsule manifest(s) include Sigstore bundle metadata and require cosign verification by registry reads.`,
      [
        cosignPolicyDetail,
        "add/update/verify/mirror registry reads validate bundle hash, signed payload hash, certificate identity, OIDC issuer, and cosign verify-blob success.",
        "release public-trust-verify can verify the signed registry artifact before public distribution.",
        ...sigstoreCapsules,
      ],
    );
  }

  if (localSignatureCapsules.length === 0) {
    return check(
      "sigstore-public-trust",
      input.allowLocalSignatures ? "warning" : "fail",
      `All ${sigstoreCapsules.length} capsule manifest(s) include Sigstore bundle metadata, but public cryptographic verification is not required yet.`,
      [
        cosignPolicyDetail,
        "Set registry/trust-root.json sigstore.bundleVerification to cosign before public release.",
        "Run ashlar release public-trust-verify against the signed registry artifact.",
        "Publish public trust material for offline procurement review.",
      ],
    );
  }

  return check(
    "sigstore-public-trust",
    input.allowLocalSignatures ? "warning" : "fail",
    `${sigstoreCapsules.length}/${input.components.length} capsule manifest(s) include Sigstore bundle metadata; remaining capsules use local Ed25519 signatures.`,
    [
      "Replace local registry signing with CI keyless signing.",
      "Publish capsule Sigstore bundle files generated by CI keyless signing.",
      cosignPolicyDetail,
      "add/update/verify/mirror registry reads now validate Sigstore bundle hash, signed payload hash, certificate identity, OIDC issuer, and cosign verify-blob success when bundle metadata is present and the trust root requires cosign.",
      "Run ashlar release public-trust-verify against the signed registry artifact.",
      "Publish public trust material for offline procurement review.",
      ...localSignatureCapsules.map((item) => `local signature only: ${item}`),
    ],
  );
}

const sigstoreWorkflowPath = ".github/workflows/sigstore.yml";
const sigstoreCertificateIdentity =
  "https://github.com/blencorp/ashlar/.github/workflows/sigstore.yml@refs/heads/main";
const sigstoreOidcIssuer = "https://token.actions.githubusercontent.com";

function sigstoreWorkflowCheck(cwd: string): ReleaseReadinessCheck {
  const path = resolve(cwd, sigstoreWorkflowPath);
  if (!existsSync(path)) {
    return check("sigstore-workflow-local", "fail", `Sigstore workflow is missing: ${sigstoreWorkflowPath}`);
  }

  const workflow = readFileSync(path, "utf8");
  const errors: string[] = [];
  if (!/^\s*workflow_dispatch:\s*$/m.test(workflow)) {
    errors.push("workflow must be manually dispatchable for controlled signing");
  }
  if (!/^\s*id-token:\s*write(?:\s+#.*)?$/m.test(workflow)) {
    errors.push("permissions.id-token must be write for keyless signing");
  }
  if (!/^\s*contents:\s*read(?:\s+#.*)?$/m.test(workflow)) {
    errors.push("permissions.contents should be read");
  }
  if (!/github\.ref\s*==\s*'refs\/heads\/main'/.test(workflow)) {
    errors.push("workflow must restrict signing to refs/heads/main");
  }
  if (!/^\s*runs-on:\s*ubuntu-latest(?:\s+#.*)?$/m.test(workflow)) {
    errors.push("signing job must run on a GitHub-hosted runner");
  }
  if (!/uses:\s*sigstore\/cosign-installer@/.test(workflow)) {
    errors.push("workflow must install cosign via sigstore/cosign-installer");
  }
  if (!/\brelease\s+trust-bundle\b/.test(workflow)) {
    errors.push("workflow must create the Ashlar release trust bundle before signing");
  }
  if (!/\brelease\s+sign-capsules\b/.test(workflow)) {
    errors.push("workflow must create capsule Sigstore bundles before the trust bundle");
  }
  if (!/\brelease\s+public-trust-verify\b/.test(workflow)) {
    errors.push("workflow must verify capsule Sigstore bundles before upload");
  }
  if (!/release\s+public-trust-verify[^\n]*--json\s*>\s*reports\/ashlar-public-trust\.json/.test(workflow)) {
    errors.push("workflow must write public-trust verification JSON for release-trust review records");
  }
  if (!/cosign\s+sign-blob\s+--yes\s+--bundle/.test(workflow)) {
    errors.push("workflow must create Sigstore bundles with cosign sign-blob --yes --bundle");
  }
  if (!/cosign\s+verify-blob\b/.test(workflow)) {
    errors.push("workflow must verify generated Sigstore bundles");
  }
  if (!workflow.includes(`--certificate-identity "${sigstoreCertificateIdentity}"`)) {
    errors.push(`workflow must verify certificate identity ${sigstoreCertificateIdentity}`);
  }
  if (!workflow.includes(`--certificate-oidc-issuer "${sigstoreOidcIssuer}"`)) {
    errors.push(`workflow must verify OIDC issuer ${sigstoreOidcIssuer}`);
  }
  if (/\b(?:COSIGN_PRIVATE_KEY|COSIGN_PASSWORD|NODE_AUTH_TOKEN|NPM_TOKEN)\b/.test(workflow)) {
    errors.push("workflow must not use long-lived signing or npm secrets");
  }

  if (errors.length > 0) {
    return check(
      "sigstore-workflow-local",
      "fail",
      "Local Sigstore workflow prerequisites are incomplete.",
      errors,
    );
  }

  return check(
    "sigstore-workflow-local",
    "pass",
    "Local keyless Sigstore workflow is present for release-review artifacts.",
    [
      sigstoreWorkflowPath,
      `certificate identity: ${sigstoreCertificateIdentity}`,
      `OIDC issuer: ${sigstoreOidcIssuer}`,
    ],
  );
}

const incidentPlaybookPath = "docs/security/supply-chain-incident-playbook.md";
const incidentPlaybookSections = [
  "## Triage Triggers",
  "## Severity Levels",
  "## Immediate Containment",
  "## Consumer Detection",
  "## Credential And Key Rotation",
  "## Revocation And Trust Root Updates",
  "## Public Disclosure Timeline",
  "## Consumer Remediation",
  "## Post-Incident Review",
];

function incidentPlaybookCheck(cwd: string): ReleaseReadinessCheck {
  const path = resolve(cwd, incidentPlaybookPath);
  if (!existsSync(path)) {
    return check("incident-playbook", "fail", `Supply-chain incident playbook is missing: ${incidentPlaybookPath}`);
  }

  const content = readFileSync(path, "utf8");
  const missing = incidentPlaybookSections.filter((section) => !content.includes(section));
  if (missing.length > 0) {
    return check(
      "incident-playbook",
      "fail",
      "Supply-chain incident playbook is missing required operational sections.",
      missing,
    );
  }

  return check(
    "incident-playbook",
    "pass",
    "Supply-chain incident playbook covers triage, containment, detection, rotation, revocation, disclosure, remediation, and post-incident review.",
    [incidentPlaybookPath],
  );
}

const externalReviewPlanPath = "docs/roadmap/external-review-plan.md";
const externalReviewTemplates = [
  ".github/ISSUE_TEMPLATE/stable_evidence_review.yml",
  ".github/ISSUE_TEMPLATE/release_trust_review.yml",
  ".github/ISSUE_TEMPLATE/design_partner_review.yml",
];
const externalReviewRecordTemplates = [
  "docs/reviews/templates/stable-evidence-review.md",
  "docs/reviews/templates/release-trust-review.md",
  "docs/reviews/templates/design-partner-review.md",
];
const externalReviewPlanSections = [
  "## Track 1: Stable Evidence Review",
  "## Track 2: Release Trust Review",
  "## Track 3: Design Partner Review",
  "## Replacement Claim Rule",
];

function externalReviewProcessCheck(cwd: string): ReleaseReadinessCheck {
  const errors: string[] = [];
  const planPath = resolve(cwd, externalReviewPlanPath);
  if (!existsSync(planPath)) {
    errors.push(`external review plan is missing: ${externalReviewPlanPath}`);
  } else {
    const content = readFileSync(planPath, "utf8");
    for (const section of externalReviewPlanSections) {
      if (!content.includes(section)) {
        errors.push(`external review plan is missing section: ${section}`);
      }
    }
    for (const template of externalReviewTemplates) {
      if (!content.includes(template.split("/").at(-1) ?? template)) {
        errors.push(`external review plan does not reference template: ${template}`);
      }
    }
  }

  for (const template of externalReviewTemplates) {
    const templatePath = resolve(cwd, template);
    if (!existsSync(templatePath)) {
      errors.push(`external review issue template is missing: ${template}`);
      continue;
    }
    const content = readFileSync(templatePath, "utf8");
    if (!/^\s*labels:\s*\[/m.test(content)) {
      errors.push(`external review issue template must declare labels: ${template}`);
    }
    if (!/status: blocked/.test(content)) {
      errors.push(`external review issue template must start as blocked: ${template}`);
    }
  }

  for (const template of externalReviewRecordTemplates) {
    const templatePath = resolve(cwd, template);
    if (!existsSync(templatePath)) {
      errors.push(`external review record template is missing: ${template}`);
      continue;
    }
    const content = readFileSync(templatePath, "utf8");
    if (!content.includes("Record status: completed external review only")) {
      errors.push(`external review record template must reject placeholder records: ${template}`);
    }
    if (!content.includes("Decision: pass | blocked")) {
      errors.push(`external review record template must capture a pass or blocked decision: ${template}`);
    }
  }

  if (errors.length > 0) {
    return check(
      "external-review-process",
      "fail",
      "External review process artifacts are incomplete.",
      errors,
    );
  }

  return check(
    "external-review-process",
    "pass",
    "External review plan, issue templates, and record templates exist for stable evidence, release trust, and design partner review.",
    [externalReviewPlanPath, ...externalReviewTemplates, ...externalReviewRecordTemplates],
  );
}

function externalReviewProofCheck(
  cwd: string,
  allowUnverifiedPublic: boolean | undefined,
): ReleaseReadinessCheck {
  const details = [
    "Record completed external review artifacts under docs/reviews/.",
    "Required record prefixes: stable-evidence-, release-trust-, design-partner-.",
    "Templates under docs/reviews/templates/ do not count as completed records.",
    "Do not create placeholder review records; review records must reference real reviewer output or workflow artifacts.",
  ];
  const report = checkExternalReviewRecords({ cwd });
  const invalid = report.records.flatMap((record) =>
    record.errors.map((error) => `${record.file}: ${error}`),
  );

  if (report.status === "fail") {
    return check(
      "external-review-proof",
      allowUnverifiedPublic ? "warning" : "fail",
      "External review proof records are incomplete.",
      [...report.missing, ...invalid, ...details],
    );
  }

  return check(
    "external-review-proof",
    "pass",
    "Completed external review proof records exist for stable evidence, release trust, and design partner review.",
    report.records.map((record) => record.file),
  );
}

export function checkReleaseReadiness(input: ReleaseReadinessInput): ReleaseReadinessReport {
  const components = listComponents(input.cwd, input.registryPath).map((component) =>
    getComponent(input.cwd, component.name, input.registryPath),
  );
  const checks = [
    registryCapsuleCheck({ components, cwd: input.cwd, registryPath: input.registryPath }),
    componentCoverageCheck({ components, minL0Components: input.minL0Components }),
    stableEvidenceCheck({ components, minStableL0Components: input.minStableL0Components }),
    evidenceGateCheck(components),
    bundleBudgetCheck({ cwd: input.cwd, registryPath: input.registryPath }),
    aiEvalCheck({
      aiEvalSuitePath: input.aiEvalSuitePath,
      cwd: input.cwd,
      registryPath: input.registryPath,
    }),
    provenanceCheck(input.cwd),
    incidentPlaybookCheck(input.cwd),
    externalReviewProcessCheck(input.cwd),
    externalReviewProofCheck(input.cwd, input.allowUnverifiedPublic),
    publicProvenanceCheck(input.allowUnverifiedPublic),
    sigstoreWorkflowCheck(input.cwd),
    sigstoreCheck({
      allowLocalSignatures: input.allowLocalSignatures,
      components,
      trustRoot: readRegistryTrustRoot(input.cwd, input.registryPath),
    }),
  ];
  const failed = checks.filter((item) => item.status === "fail").length;
  const warnings = checks.filter((item) => item.status === "warning").length;
  const passed = checks.filter((item) => item.status === "pass").length;

  return {
    $schema: "https://ashlar.dev/schemas/release-readiness.schema.json",
    schemaVersion: "1.0",
    generatedAt: new Date().toISOString(),
    status: failed > 0 ? "fail" : "pass",
    summary: {
      total: checks.length,
      passed,
      warnings,
      failed,
    },
    checks,
  };
}
