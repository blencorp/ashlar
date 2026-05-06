import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const here = fileURLToPath(new URL(".", import.meta.url));
const repoRoot = resolve(here, "..", "..", "..", "..");

describe("CI workflow", () => {
  it("runs the registry evidence gate before publishing SARIF", () => {
    const workflow = readFileSync(resolve(repoRoot, ".github", "workflows", "ci.yml"), "utf8");
    const evidenceCheck = "node packages/cli/dist/index.js evidence --check --registry ./registry";
    const evidenceReport =
      "node packages/cli/dist/index.js evidence --report reports/ashlar-evidence.md --registry ./registry";
    const evidenceCollect =
      "node packages/cli/dist/index.js evidence collect button --registry ./registry --fixture registry/components/button/0.0.1/button.html --output reports/button-evidence.json";
    const evidenceApply =
      "node packages/cli/dist/index.js evidence apply button --registry ./registry --artifact reports/button-evidence.json --output reports/button.evidence.proposed.json";
    const proposedEvidenceCheck =
      "node packages/cli/dist/index.js evidence button --check --registry ./registry --evidence-file reports/button.evidence.proposed.json";
    const stableReviewBundle =
      "node packages/cli/dist/index.js evidence prepare-stable-all --registry ./registry --output reports/l0-stable-review";
    const stableReviewStatus =
      "node packages/cli/dist/index.js evidence review-status button --registry ./registry --review-dir reports/l0-stable-review/button --format json --output reports/button-stable-review-status.json";
    const stableReviewStatusStep = `- run: ${stableReviewStatus}
        continue-on-error: true`;
    const releaseSmoke = "pnpm release:smoke";
    const reportsDir = "mkdir -p reports";
    const projectStatus =
      "node packages/cli/dist/index.js status --registry ./registry --json > reports/ashlar-status.json";
    const releaseSbom =
      "node packages/cli/dist/index.js release sbom --output reports/ashlar-sbom.spdx.json";
    const releaseAttestation =
      "node packages/cli/dist/index.js release attest --subject reports/ashlar-sbom.spdx.json --output reports/ashlar-sbom.attestation.json";
    const verifyReleaseAttestation =
      "node packages/cli/dist/index.js release verify-attestation --subject reports/ashlar-sbom.spdx.json --attestation reports/ashlar-sbom.attestation.json";
    const releaseTrustBundle =
      "node packages/cli/dist/index.js release trust-bundle --registry ./registry --sbom reports/ashlar-sbom.spdx.json --attestation reports/ashlar-sbom.attestation.json --output reports/ashlar-trust-bundle.json --checklist reports/ashlar-release-trust-checklist.md";
    const designPartnerChecklist =
      "node packages/cli/dist/index.js release design-partner-checklist --output reports/ashlar-design-partner-checklist.md";
    const releaseReadinessReport =
      "node packages/cli/dist/index.js release readiness --registry ./registry --report reports/ashlar-release-readiness.md --json-output reports/ashlar-release-readiness.json";
    const releaseReadinessAdvisoryStep = `- run: ${releaseReadinessReport}
        continue-on-error: true`;
    const releaseReviewPack =
      "node packages/cli/dist/index.js release review-pack --registry ./registry --output reports/review-pack";
    const uswdsMigration =
      'node packages/cli/dist/index.js migrate uswds --registry ./registry --json "examples/uswds-project/**/*.{html,tsx,jsx}" > reports/ashlar-uswds-migration.json';
    const sarifAudit =
      "node packages/cli/dist/index.js audit --policy all --registry ./registry --sarif examples/plain-html/index.html > ashlar.sarif";

    expect(workflow).toContain(evidenceCheck);
    expect(workflow).toContain(evidenceCollect);
    expect(workflow).toContain(evidenceApply);
    expect(workflow).toContain(proposedEvidenceCheck);
    expect(workflow).toContain(stableReviewBundle);
    expect(workflow).toContain(stableReviewStatus);
    expect(workflow).toContain(stableReviewStatusStep);
    expect(workflow).toContain(reportsDir);
    expect(workflow).toContain(projectStatus);
    expect(workflow).toContain(releaseSmoke);
    expect(workflow).toContain(releaseSbom);
    expect(workflow).toContain(releaseAttestation);
    expect(workflow).toContain(verifyReleaseAttestation);
    expect(workflow).toContain(releaseTrustBundle);
    expect(workflow).toContain(designPartnerChecklist);
    expect(workflow).toContain(releaseReadinessReport);
    expect(workflow).toContain(releaseReadinessAdvisoryStep);
    expect(workflow).toContain(releaseReviewPack);
    expect(workflow).toContain(evidenceReport);
    expect(workflow).toContain(uswdsMigration);
    expect(workflow).toContain("name: ashlar-status");
    expect(workflow).toContain("path: reports/ashlar-status.json");
    expect(workflow).toContain("name: ashlar-evidence-report");
    expect(workflow).toContain("path: reports/ashlar-evidence.md");
    expect(workflow).toContain("name: ashlar-button-evidence");
    expect(workflow).toContain("path: reports/button-evidence.json");
    expect(workflow).toContain("name: ashlar-button-evidence-proposal");
    expect(workflow).toContain("path: reports/button.evidence.proposed.json");
    expect(workflow).toContain("name: ashlar-l0-stable-review");
    expect(workflow).toContain("path: reports/l0-stable-review");
    expect(workflow).toContain("name: ashlar-button-stable-review-status");
    expect(workflow).toContain("path: reports/button-stable-review-status.json");
    expect(workflow).toContain("name: ashlar-sbom");
    expect(workflow).toContain("path: reports/ashlar-sbom.spdx.json");
    expect(workflow).toContain("name: ashlar-sbom-attestation");
    expect(workflow).toContain("path: reports/ashlar-sbom.attestation.json");
    expect(workflow).toContain("name: ashlar-trust-bundle");
    expect(workflow).toContain("path: reports/ashlar-trust-bundle.json");
    expect(workflow).toContain("name: ashlar-release-trust-checklist");
    expect(workflow).toContain("path: reports/ashlar-release-trust-checklist.md");
    expect(workflow).toContain("name: ashlar-design-partner-checklist");
    expect(workflow).toContain("path: reports/ashlar-design-partner-checklist.md");
    expect(workflow).toContain("name: ashlar-release-readiness");
    expect(workflow).toContain("path: reports/ashlar-release-readiness.md");
    expect(workflow).toContain("name: ashlar-release-readiness-json");
    expect(workflow).toContain("path: reports/ashlar-release-readiness.json");
    expect(workflow).toContain("name: ashlar-release-review-pack");
    expect(workflow).toContain("path: reports/review-pack");
    expect(workflow).toContain("name: ashlar-uswds-migration");
    expect(workflow).toContain("path: reports/ashlar-uswds-migration.json");
    expect(workflow.indexOf(evidenceCheck)).toBeLessThan(workflow.indexOf(sarifAudit));
    expect(workflow.indexOf(evidenceCollect)).toBeLessThan(workflow.indexOf(sarifAudit));
    expect(workflow.indexOf(evidenceApply)).toBeLessThan(workflow.indexOf(sarifAudit));
    expect(workflow.indexOf(proposedEvidenceCheck)).toBeLessThan(workflow.indexOf(sarifAudit));
    expect(workflow.indexOf(reportsDir)).toBeLessThan(workflow.indexOf(projectStatus));
    expect(workflow.indexOf(projectStatus)).toBeLessThan(workflow.indexOf(sarifAudit));
    expect(workflow.indexOf(stableReviewBundle)).toBeLessThan(workflow.indexOf(sarifAudit));
    expect(workflow.indexOf(stableReviewStatus)).toBeLessThan(workflow.indexOf(sarifAudit));
    expect(workflow.indexOf(releaseSmoke)).toBeLessThan(workflow.indexOf(sarifAudit));
    expect(workflow.indexOf(releaseSbom)).toBeLessThan(workflow.indexOf(sarifAudit));
    expect(workflow.indexOf(releaseAttestation)).toBeLessThan(workflow.indexOf(sarifAudit));
    expect(workflow.indexOf(verifyReleaseAttestation)).toBeLessThan(workflow.indexOf(sarifAudit));
    expect(workflow.indexOf(releaseTrustBundle)).toBeLessThan(workflow.indexOf(sarifAudit));
    expect(workflow.indexOf(designPartnerChecklist)).toBeLessThan(workflow.indexOf(sarifAudit));
    expect(workflow.indexOf(releaseReadinessReport)).toBeLessThan(workflow.indexOf(sarifAudit));
    expect(workflow.indexOf(releaseReviewPack)).toBeLessThan(workflow.indexOf(sarifAudit));
    expect(workflow.indexOf(evidenceReport)).toBeLessThan(workflow.indexOf(sarifAudit));
    expect(workflow.indexOf(uswdsMigration)).toBeLessThan(workflow.indexOf(sarifAudit));
  });

  it("keeps npm publishing on a tokenless trusted-publishing path", () => {
    const workflow = readFileSync(resolve(repoRoot, ".github", "workflows", "publish.yml"), "utf8");

    expect(workflow).toContain("workflow_dispatch:");
    expect(workflow).toContain("id-token: write");
    expect(workflow).toContain("contents: read");
    expect(workflow).toContain("runs-on: ubuntu-latest");
    expect(workflow).toContain("registry-url: https://registry.npmjs.org");
    expect(workflow).toContain("package-manager-cache: false");
    expect(workflow).toContain("node packages/cli/dist/index.js release provenance-check");
    expect(workflow).toContain("node packages/cli/dist/index.js release provenance-verify-public");
    expect(workflow).toContain(
      "node packages/cli/dist/index.js release provenance-verify-public --json > reports/ashlar-npm-provenance.json",
    );
    expect(workflow).toContain("name: ashlar-npm-provenance");
    expect(workflow).toContain("path: reports/ashlar-npm-provenance.json");
    expect(workflow).toContain('NPM_CONFIG_PROVENANCE: "true"');
    expect(workflow).toContain("pnpm release");
    expect(workflow.indexOf("pnpm release")).toBeLessThan(
      workflow.indexOf("node packages/cli/dist/index.js release provenance-verify-public"),
    );
    expect(workflow).not.toMatch(/\b(?:NODE_AUTH_TOKEN|NPM_TOKEN)\b/);
  });

  it("keeps release artifact signing on a keyless Sigstore path", () => {
    const workflow = readFileSync(
      resolve(repoRoot, ".github", "workflows", "sigstore.yml"),
      "utf8",
    );

    expect(workflow).toContain("workflow_dispatch:");
    expect(workflow).toContain("id-token: write");
    expect(workflow).toContain("contents: read");
    expect(workflow).toContain("github.ref == 'refs/heads/main'");
    expect(workflow).toContain("runs-on: ubuntu-latest");
    expect(workflow).toContain("uses: sigstore/cosign-installer@");
    expect(workflow).toContain(
      "node packages/cli/dist/index.js release sign-capsules --registry ./registry",
    );
    expect(workflow).toContain(
      "node packages/cli/dist/index.js release public-trust-verify --registry ./registry",
    );
    expect(workflow).toContain(
      "node packages/cli/dist/index.js release public-trust-verify --registry ./registry --json > reports/ashlar-public-trust.json",
    );
    expect(workflow).toContain("node packages/cli/dist/index.js release trust-bundle");
    expect(workflow).toContain("--checklist reports/ashlar-release-trust-checklist.md");
    expect(
      workflow.indexOf(
        "node packages/cli/dist/index.js release sign-capsules --registry ./registry",
      ),
    ).toBeLessThan(
      workflow.indexOf(
        "node packages/cli/dist/index.js release public-trust-verify --registry ./registry",
      ),
    );
    expect(
      workflow.indexOf(
        "node packages/cli/dist/index.js release public-trust-verify --registry ./registry",
      ),
    ).toBeLessThan(workflow.indexOf("node packages/cli/dist/index.js release trust-bundle"));
    expect(workflow).toContain("cosign sign-blob --yes --bundle");
    expect(workflow).toContain("cosign verify-blob");
    expect(workflow).toContain("reports/ashlar-release-trust-checklist.md");
    expect(workflow).toContain("reports/ashlar-public-trust.json");
    expect(workflow).toContain("registry/**/*.sigstore.json");
    expect(workflow).toContain(
      "https://github.com/blencorp/ashlar/.github/workflows/sigstore.yml@refs/heads/main",
    );
    expect(workflow).toContain("https://token.actions.githubusercontent.com");
    expect(workflow).not.toMatch(
      /\b(?:COSIGN_PRIVATE_KEY|COSIGN_PASSWORD|NODE_AUTH_TOKEN|NPM_TOKEN)\b/,
    );
  });
});
