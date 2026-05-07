import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { describeErrors, validate } from "./schema-validate.js";

const repoRoot = join(__dirname, "..", "..", "..", "..");

function readJson<T>(...segments: string[]): T {
  return JSON.parse(readFileSync(join(repoRoot, ...segments), "utf8"));
}

describe("schema-validate", () => {
  const capsuleNames = [
    "alert",
    "benefit-application",
    "button",
    "checkbox",
    "date-input",
    "error-summary",
    "form-field",
    "identifier",
    "radio-group",
    "select",
    "text-input",
    "textarea",
  ];

  it("validates the Button CEM against ashlar-cem.schema.json", () => {
    const cem = readJson<unknown>("registry", "components", "button", "0.0.1", "button.cem.json");
    const result = validate("ashlarCem", cem);

    if (!result.ok) {
      throw new Error(`Expected Button CEM to be valid:\n${describeErrors(result)}`);
    }
    expect(result.ok).toBe(true);
  });

  it("validates the Button evidence packet against evidence.schema.json", () => {
    const evidence = readJson<unknown>(
      "registry",
      "components",
      "button",
      "0.0.1",
      "button.evidence.json",
    );
    const result = validate("evidence", evidence);

    if (!result.ok) {
      throw new Error(`Expected Button evidence to be valid:\n${describeErrors(result)}`);
    }
    expect(result.ok).toBe(true);
  });

  it("validates generated evidence collection artifacts against evidence-artifact.schema.json", () => {
    const result = validate("evidenceArtifact", {
      $schema: "https://ashlar.dev/schemas/evidence-artifact.schema.json",
      schemaVersion: "1.0",
      component: "button",
      version: "0.0.1",
      generatedAt: "2026-05-05T00:00:00.000Z",
      fixture: "registry/components/button/0.0.1/button.html",
      status: "pass",
      automatedResults: {
        ashlarAudit: {
          tool: "ashlar audit",
          policy: "components",
          status: "pass",
          findings: [],
        },
      },
    });

    if (!result.ok) {
      throw new Error(
        `Expected generated evidence artifact to be valid:\n${describeErrors(result)}`,
      );
    }
    expect(result.ok).toBe(true);
  });

  it("validates stable evidence review manifests against stable-evidence-review-manifest.schema.json", () => {
    const result = validate("stableEvidenceReviewManifest", {
      $schema: "https://ashlar.dev/schemas/stable-evidence-review-manifest.schema.json",
      schemaVersion: "1.0",
      artifactType: "stable-evidence-review-bundle",
      component: "button",
      version: "0.0.1",
      automatedStatus: "pass",
      stableClaim: false,
      requiresManualReview: true,
      generatedBy: {
        command: "ashlar evidence prepare-stable button",
        registry: "./registry",
        fixture: "registry/components/button/0.0.1/button.html",
      },
      files: [
        {
          role: "automated-evidence",
          path: "reports/button-stable-review/button-automated-evidence.json",
          bytes: 120,
          mutableByReviewer: false,
          sha256: "a".repeat(64),
        },
        {
          role: "proposed-evidence",
          path: "reports/button-stable-review/button.evidence.proposed.json",
          bytes: 120,
          mutableByReviewer: false,
          sha256: "b".repeat(64),
        },
        {
          role: "manual-evidence-worksheet",
          path: "reports/button-stable-review/button-manual-review.json",
          bytes: 120,
          mutableByReviewer: true,
          sha256: "c".repeat(64),
        },
        {
          role: "keyboard-transcript-worksheet",
          path: "reports/button-stable-review/button-keyboard-transcript.json",
          bytes: 120,
          mutableByReviewer: true,
          sha256: "d".repeat(64),
        },
        {
          role: "screen-reader-transcript-worksheet",
          path: "reports/button-stable-review/button-screen-reader-transcript.json",
          bytes: 120,
          mutableByReviewer: true,
          sha256: "e".repeat(64),
        },
        {
          role: "reviewer-harness",
          path: "reports/button-stable-review/REVIEW.html",
          bytes: 120,
          mutableByReviewer: false,
          sha256: "9".repeat(64),
        },
        {
          role: "github-issue-body",
          path: "reports/button-stable-review/ISSUE.md",
          bytes: 120,
          mutableByReviewer: false,
          sha256: "f".repeat(64),
        },
        {
          role: "reviewer-checklist",
          path: "reports/button-stable-review/REVIEWER_CHECKLIST.md",
          bytes: 120,
          mutableByReviewer: false,
          sha256: "1".repeat(64),
        },
        {
          role: "reviewer-readme",
          path: "reports/button-stable-review/README.md",
          bytes: 120,
          mutableByReviewer: false,
          sha256: "0".repeat(64),
        },
      ],
    });

    if (!result.ok) {
      throw new Error(`Expected review manifest to be valid:\n${describeErrors(result)}`);
    }
    expect(result.ok).toBe(true);
  });

  it("validates stable evidence review status reports against stable-evidence-review-status.schema.json", () => {
    const result = validate("stableEvidenceReviewStatus", {
      $schema: "https://ashlar.dev/schemas/stable-evidence-review-status.schema.json",
      schemaVersion: "1.0",
      component: "button",
      version: "0.0.1",
      status: "blocked",
      reviewDir: "reports/button-stable-review",
      files: {
        manifest: "reports/button-stable-review/MANIFEST.json",
        proposedEvidence: "reports/button-stable-review/button.evidence.proposed.json",
        manualEvidence: "reports/button-stable-review/button-manual-review.json",
        keyboardTranscript: "reports/button-stable-review/button-keyboard-transcript.json",
        reviewHarness: "reports/button-stable-review/REVIEW.html",
        screenReaderTranscript: "reports/button-stable-review/button-screen-reader-transcript.json",
        reviewedEvidence: "reports/button-stable-review/button.evidence.reviewed.json",
        stableEvidence: "reports/button-stable-review/button.evidence.stable.json",
      },
      blockers: [
        {
          file: "reports/button-stable-review/button-manual-review.json",
          rule: "review/placeholder",
          message: "Manual evidence still contains TODO, TBD, or placeholder text.",
        },
      ],
      nextCommands: [
        "ashlar evidence transcript-validate button --registry ./registry --type keyboard --transcript reports/button-stable-review/button-keyboard-transcript.json",
      ],
    });

    if (!result.ok) {
      throw new Error(`Expected review status to be valid:\n${describeErrors(result)}`);
    }
    expect(result.ok).toBe(true);
  });

  it("validates release readiness reports against release-readiness.schema.json", () => {
    const result = validate("releaseReadiness", {
      $schema: "https://ashlar.dev/schemas/release-readiness.schema.json",
      schemaVersion: "1.0",
      generatedAt: "2026-05-05T00:00:00.000Z",
      status: "fail",
      summary: {
        passed: 9,
        warnings: 0,
        failed: 4,
        total: 13,
      },
      checks: [
        {
          id: "stable-l0-evidence",
          status: "fail",
          summary:
            "Requires at least 1 stable-evidence markup primitives (L0) capsule(s); found 0.",
          details: ["button@0.0.1 markup primitives (L0) experimental evidence:not-reviewed"],
        },
      ],
    });

    if (!result.ok) {
      throw new Error(`Expected release readiness to be valid:\n${describeErrors(result)}`);
    }
    expect(result.ok).toBe(true);
  });

  it("validates lockfiles against lock.schema.json", () => {
    const valid = validate("lock", {
      $schema: "https://ashlar.dev/schemas/lock.schema.json",
      version: "1",
      registry: "./registry",
      components: {
        button: {
          version: "0.0.1",
          capsule_hash: `sha256:${"a".repeat(64)}`,
          files: {
            "src/ashlar/components/button/button.css": {
              original_hash: `sha256:${"b".repeat(64)}`,
              current_hash: `sha256:${"b".repeat(64)}`,
              critical_for_a11y: true,
            },
          },
        },
      },
    });
    const invalid = validate("lock", {
      version: "1",
      registry: "./registry",
      components: {
        button: {
          version: "0.0.1",
          capsule_hash: `sha256:${"a".repeat(64)}`,
          files: {
            "src/ashlar/components/button/button.css": {
              current_hash: `sha256:${"b".repeat(64)}`,
            },
          },
        },
      },
    });

    if (!valid.ok) {
      throw new Error(`Expected lockfile to be valid:\n${describeErrors(valid)}`);
    }
    expect(valid.ok).toBe(true);
    expect(invalid.ok).toBe(false);
    expect(describeErrors(invalid)).toContain("original_hash");
  });

  it("validates capsule codemods against codemod.schema.json", () => {
    const result = validate("codemod", {
      schemaVersion: "1.0",
      component: "button",
      from: "0.0.1",
      to: "0.0.2",
      rules: [
        {
          id: "rename-primary-bg-token",
          target: "button.css",
          language: "css",
          pattern: "color: var(--ashlar-color-action-primary-bg);",
          rewrite: "color: var(--ashlar-color-action-primary-surface);",
          confirm: true,
        },
      ],
    });

    if (!result.ok) {
      throw new Error(`Expected codemod artifact to be valid:\n${describeErrors(result)}`);
    }
    expect(result.ok).toBe(true);

    const invalid = validate("codemod", {
      schemaVersion: "1.0",
      component: "button",
      from: "0.0.1",
      to: "0.0.2",
      rules: [
        {
          id: "escape-component-dir",
          target: "../outside.css",
          language: "css",
          pattern: "color: red;",
          rewrite: "color: blue;",
        },
      ],
    });
    expect(invalid.ok).toBe(false);
  });

  it("validates manual evidence review artifacts against manual-evidence.schema.json", () => {
    const result = validate("manualEvidence", {
      $schema: "https://ashlar.dev/schemas/manual-evidence.schema.json",
      schemaVersion: "1.0",
      component: "button",
      version: "0.0.1",
      reviewedAt: "2026-05-05T14:00:00.000Z",
      reviewer: "a11y-reviewer@example.gov",
      wcag: [
        {
          criterion: "2.4.7",
          status: "pass",
          evidence: "manual/button-keyboard-review.md#focus-visible",
        },
      ],
      baselineTests: [
        {
          source: "Section 508 ICT Testing Baseline for Web",
          test: "Keyboard Accessible",
          status: "pass",
          evidence: "manual/button-keyboard-review.md",
        },
      ],
      manualTests: [
        {
          tech: "Keyboard",
          browser: "Firefox",
          browserVersion: "145",
          os: "Windows 11",
          date: "2026-05-05",
          tester: "a11y-reviewer@example.gov",
          result: "pass",
          evidence: "manual/button-keyboard-review.json#keyboard-firefox",
        },
        {
          tech: "NVDA",
          version: "2025.4",
          browser: "Firefox",
          browserVersion: "145",
          os: "Windows 11",
          date: "2026-05-05",
          tester: "a11y-reviewer@example.gov",
          result: "pass",
          evidence: "manual/button-screen-reader-review.json#nvda-firefox",
        },
      ],
      knownLimitations: [],
    });

    if (!result.ok) {
      throw new Error(`Expected manual evidence artifact to be valid:\n${describeErrors(result)}`);
    }
    expect(result.ok).toBe(true);
  });

  it("validates manual transcript artifacts against manual-transcript.schema.json", () => {
    const result = validate("manualTranscript", {
      $schema: "https://ashlar.dev/schemas/manual-transcript.schema.json",
      schemaVersion: "1.0",
      component: "button",
      version: "0.0.1",
      transcriptType: "screen-reader",
      reviewedAt: "2026-05-05T14:00:00.000Z",
      reviewer: "a11y-reviewer@example.gov",
      environment: {
        browser: "Firefox",
        browserVersion: "145",
        os: "Windows 11",
        assistiveTechnology: "NVDA",
        assistiveTechnologyVersion: "2025.4",
      },
      steps: [
        {
          id: "nvda-firefox",
          action: "Move to the Button with NVDA browse mode.",
          expected: "NVDA announces the accessible name and button role.",
          observed: "NVDA announced the visible label and button role.",
          result: "pass",
        },
      ],
      result: "pass",
      summary: "Screen-reader transcript passed for native Button markup.",
      knownLimitations: [],
    });

    if (!result.ok) {
      throw new Error(
        `Expected manual transcript artifact to be valid:\n${describeErrors(result)}`,
      );
    }
    expect(result.ok).toBe(true);

    const invalid = validate("manualTranscript", {
      $schema: "https://ashlar.dev/schemas/manual-transcript.schema.json",
      schemaVersion: "1.0",
      component: "button",
      version: "0.0.1",
      transcriptType: "screen-reader",
      reviewedAt: "2026-05-05T14:00:00.000Z",
      reviewer: "a11y-reviewer@example.gov",
      environment: {
        browser: "Firefox",
        os: "Windows 11",
      },
      steps: [],
      result: "pass",
      summary: "Missing assistive technology and steps.",
    });
    expect(invalid.ok).toBe(false);
  });

  it("validates the registry index against registry-index.schema.json", () => {
    const index = readJson<unknown>("registry", "index.json");
    const result = validate("registryIndex", index);

    if (!result.ok) {
      throw new Error(`Expected registry index to be valid:\n${describeErrors(result)}`);
    }
    expect(result.ok).toBe(true);
  });

  it("validates the registry trust root against trust-root.schema.json", () => {
    const trustRoot = readJson<unknown>("registry", "trust-root.json");
    const result = validate("trustRoot", trustRoot);

    if (!result.ok) {
      throw new Error(`Expected registry trust root to be valid:\n${describeErrors(result)}`);
    }
    expect(result.ok).toBe(true);
  });

  it("validates release trust bundles against release-trust-bundle.schema.json", () => {
    const result = validate("releaseTrustBundle", {
      $schema: "https://ashlar.dev/schemas/release-trust-bundle.schema.json",
      schemaVersion: "1.0",
      tool: "ashlar release trust-bundle",
      generatedAt: "2026-05-05T19:00:00.000Z",
      registry: {
        path: "./registry",
        name: "ashlar-local",
        version: "0.0.1",
        indexHash: "sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
        trustRootHash: "sha256:bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
        trustRoot: {
          schemaVersion: "1.0",
          keys: [
            {
              keyId: "ashlar-local-dev-2026-05-05",
              algorithm: "ed25519",
              publicKey: "MCowBQYDK2VwAyEAexample",
            },
          ],
        },
        capsuleCount: 1,
        capsules: [
          {
            name: "button",
            version: "0.0.1",
            layer: "L0",
            stability: "experimental",
            capsuleHash: "sha256:cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc",
            signatureKeyId: "ashlar-local-dev-2026-05-05",
          },
        ],
      },
      artifacts: [
        {
          type: "spdx-sbom",
          name: "ashlar-sbom.spdx.json",
          sha256: "sha256:dddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddd",
          size: 100,
        },
        {
          type: "release-artifact-attestation",
          name: "ashlar-sbom.attestation.json",
          sha256: "sha256:eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee",
          size: 200,
        },
      ],
      verification: {
        npmProvenance: "not-included",
        sigstore: "not-included",
        notes: ["Local trust bundle; not Sigstore."],
      },
    });

    if (!result.ok) {
      throw new Error(`Expected release trust bundle to be valid:\n${describeErrors(result)}`);
    }
    expect(result.ok).toBe(true);

    const invalid = validate("releaseTrustBundle", {
      schemaVersion: "1.0",
      tool: "ashlar release trust-bundle",
      generatedAt: "2026-05-05T19:00:00.000Z",
    });
    expect(invalid.ok).toBe(false);
  });

  it("pins every registry index capsule hash to the matching capsule manifest", () => {
    const index = readJson<{
      components: Record<string, { versions: string[]; capsuleHashes: Record<string, string> }>;
    }>("registry", "index.json");

    for (const [component, entry] of Object.entries(index.components)) {
      for (const version of entry.versions) {
        const capsule = readJson<{ capsule_hash: string }>(
          "registry",
          "components",
          component,
          version,
          `${component}.capsule.json`,
        );

        expect(entry.capsuleHashes[version]).toBe(capsule.capsule_hash);
      }
    }
  });

  it("validates every first service-flow CEM, evidence packet, and capsule manifest", () => {
    for (const component of capsuleNames) {
      const componentRoot = join(repoRoot, "registry", "components", component);
      const versions = readdirSync(componentRoot);

      for (const version of versions) {
        const cem = readJson<unknown>(
          "registry",
          "components",
          component,
          version,
          `${component}.cem.json`,
        );
        const evidence = readJson<unknown>(
          "registry",
          "components",
          component,
          version,
          `${component}.evidence.json`,
        );
        const capsule = readJson<unknown>(
          "registry",
          "components",
          component,
          version,
          `${component}.capsule.json`,
        );
        const cemResult = validate("ashlarCem", cem);
        const evidenceResult = validate("evidence", evidence);
        const capsuleResult = validate("capsule", capsule);

        if (!cemResult.ok) {
          throw new Error(
            `Expected ${component}@${version} CEM to be valid:\n${describeErrors(cemResult)}`,
          );
        }
        if (!evidenceResult.ok) {
          throw new Error(
            `Expected ${component}@${version} evidence to be valid:\n${describeErrors(
              evidenceResult,
            )}`,
          );
        }
        if (!capsuleResult.ok) {
          throw new Error(
            `Expected ${component}@${version} capsule manifest to be valid:\n${describeErrors(
              capsuleResult,
            )}`,
          );
        }

        expect(cemResult.ok).toBe(true);
        expect(evidenceResult.ok).toBe(true);
        expect(capsuleResult.ok).toBe(true);
      }
    }
  });

  it("rejects a config missing required fields", () => {
    const result = validate("config", { registry: "./registry" });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.map((error) => error.message).join("\n")).toContain("componentsDir");
    }
  });

  it("validates a minimal valid config", () => {
    const result = validate("config", {
      $schema: "https://ashlar.dev/schemas/config.schema.json",
      registry: "./registry",
      componentsDir: "src/ashlar/components",
    });
    expect(result.ok).toBe(true);
  });

  it("rejects a CEM with an unknown _ashlar.layer", () => {
    const result = validate("ashlarCem", {
      schemaVersion: "2.1.0",
      modules: [
        {
          kind: "javascript-module",
          declarations: [
            {
              kind: "class",
              name: "Bad",
              _ashlar: { version: "0.0.1", layer: "L99", stability: "experimental" },
            },
          ],
        },
      ],
    });
    expect(result.ok).toBe(false);
  });
});
