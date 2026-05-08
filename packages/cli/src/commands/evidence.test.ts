import { spawnSync } from "node:child_process";
import { generateKeyPairSync, sign } from "node:crypto";
import {
  cpSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

const here = fileURLToPath(new URL(".", import.meta.url));
const cliEntry = join(here, "..", "..", "dist", "index.js");
const repoRoot = resolve(here, "..", "..", "..", "..");
const CLI_SMOKE_TIMEOUT_MS = 30_000;

let scratch: string;

type TestCapsuleManifest = {
  schemaVersion: "1.0";
  name: string;
  version: string;
  layer: string;
  stability: string;
  files: Record<string, string>;
  capsule_hash: string;
  bundleBudget?: {
    cssGzipBytes?: number;
    jsGzipBytes?: number;
  };
  signature?: {
    keyId: string;
    algorithm: "ed25519";
    value: string;
  };
  codemods?: string[];
};

function capsuleSignaturePayload(manifest: TestCapsuleManifest): string {
  return JSON.stringify({
    schemaVersion: manifest.schemaVersion,
    name: manifest.name,
    version: manifest.version,
    layer: manifest.layer,
    stability: manifest.stability,
    files: manifest.files,
    capsule_hash: manifest.capsule_hash,
    ...(manifest.bundleBudget ? { bundleBudget: manifest.bundleBudget } : {}),
    ...(manifest.codemods && manifest.codemods.length > 0 ? { codemods: manifest.codemods } : {}),
  });
}

function runCli(args: string[]): { stdout: string; status: number } {
  const result = spawnSync(process.execPath, [cliEntry, ...args], {
    cwd: scratch,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });

  return {
    stdout: `${result.stdout ?? ""}${result.stderr ?? ""}`,
    status: result.status ?? 1,
  };
}

function writeManualEvidenceFiles(): void {
  const manualDir = join(scratch, "manual");
  mkdirSync(manualDir, { recursive: true });
  writeFileSync(
    join(manualDir, "button-keyboard-review.md"),
    "# Button keyboard review\n\nFocus and keyboard activation passed.\n",
  );
  writeFileSync(
    join(manualDir, "button-screen-reader-review.md"),
    "# Button screen-reader review\n\nNVDA and Firefox announced name, role, and activation.\n",
  );
  writeFileSync(
    join(manualDir, "button-keyboard-review.json"),
    `${JSON.stringify(
      {
        $schema: "https://ashlar.dev/schemas/manual-transcript.schema.json",
        schemaVersion: "1.0",
        component: "button",
        version: "0.0.1",
        transcriptType: "keyboard",
        reviewedAt: "2026-05-05T14:00:00.000Z",
        reviewer: "a11y-reviewer@example.gov",
        environment: {
          browser: "Firefox",
          browserVersion: "145",
          os: "Windows 11",
          inputDevice: "Keyboard",
        },
        steps: [
          {
            id: "keyboard-firefox",
            action: "Tab to the button, activate with Enter, then activate with Space.",
            expected: "Focus is visible and native button activation fires for Enter and Space.",
            observed:
              "Focus remained visible and both keyboard activation keys triggered the button.",
            result: "pass",
          },
        ],
        result: "pass",
        summary: "Keyboard focus visibility and activation passed for the native Button capsule.",
        knownLimitations: [],
      },
      null,
      2,
    )}\n`,
  );
  writeFileSync(
    join(manualDir, "button-screen-reader-review.json"),
    `${JSON.stringify(
      {
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
            action: "Move to the button with NVDA browse mode and activate it.",
            expected: "NVDA announces the button name and role before activation.",
            observed: "NVDA announced the visible label and button role before activation.",
            result: "pass",
          },
        ],
        result: "pass",
        summary:
          "NVDA and Firefox announced name, role, and activation for the native Button capsule.",
        knownLimitations: [],
      },
      null,
      2,
    )}\n`,
  );
}

function writeLocalSigningKey(registry: string): { keyId: string; signingKeyPath: string } {
  const { privateKey, publicKey } = generateKeyPairSync("ed25519");
  const keyId = "ashlar-test-local-key";
  const signingKeyPath = join(scratch, "ashlar-test-signing-key.pem");

  writeFileSync(
    join(registry, "trust-root.json"),
    `${JSON.stringify(
      {
        $schema: "https://ashlar.dev/schemas/trust-root.schema.json",
        schemaVersion: "1.0",
        keys: [
          {
            keyId,
            algorithm: "ed25519",
            publicKey: publicKey.export({ format: "der", type: "spki" }).toString("base64"),
          },
        ],
      },
      null,
      2,
    )}\n`,
  );
  writeFileSync(signingKeyPath, privateKey.export({ format: "pem", type: "pkcs8" }));

  const index = JSON.parse(readFileSync(join(registry, "index.json"), "utf8")) as {
    components: Record<string, { versions: string[] }>;
  };
  for (const [name, component] of Object.entries(index.components)) {
    for (const version of component.versions) {
      const manifestPath = join(registry, "components", name, version, `${name}.capsule.json`);
      const manifest = JSON.parse(readFileSync(manifestPath, "utf8")) as TestCapsuleManifest;
      manifest.signature = {
        keyId,
        algorithm: "ed25519",
        value: sign(null, Buffer.from(capsuleSignaturePayload(manifest)), privateKey).toString(
          "base64",
        ),
      };
      writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
    }
  }

  return { keyId, signingKeyPath };
}

function writePassingManualReview(path: string): void {
  writeFileSync(
    path,
    `${JSON.stringify(
      {
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
            notes: "Visible focus was present in default, hover, and active states.",
          },
          {
            criterion: "4.1.2",
            status: "pass",
            evidence: "manual/button-screen-reader-review.md#name-role-value",
          },
        ],
        baselineTests: [
          {
            source: "Section 508 ICT Testing Baseline for Web",
            test: "Keyboard Accessible",
            status: "pass",
            evidence: "manual/button-keyboard-review.md",
          },
          {
            source: "Section 508 ICT Testing Baseline for Web",
            test: "Name, Role, Value",
            status: "pass",
            evidence: "manual/button-screen-reader-review.md",
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
            notes: "Tab, Shift+Tab, Enter, Space, disabled state, and focus visibility passed.",
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
            notes: "Focus, label, role, and activation were announced as expected.",
          },
        ],
        knownLimitations: [],
      },
      null,
      2,
    )}\n`,
  );
}

function completePreparedReviewBundle(outputArg: string, outputDir: string): void {
  const keyboardPath = join(outputDir, "button-keyboard-transcript.json");
  const screenReaderPath = join(outputDir, "button-screen-reader-transcript.json");
  const manualPath = join(outputDir, "button-manual-review.json");

  writeFileSync(
    keyboardPath,
    `${JSON.stringify(
      {
        $schema: "https://ashlar.dev/schemas/manual-transcript.schema.json",
        schemaVersion: "1.0",
        component: "button",
        version: "0.0.1",
        transcriptType: "keyboard",
        reviewedAt: "2026-05-05T14:00:00.000Z",
        reviewer: "a11y-reviewer@example.gov",
        environment: {
          browser: "Firefox",
          browserVersion: "145",
          os: "Windows 11",
          inputDevice: "Keyboard",
        },
        steps: [
          {
            id: "keyboard-focus",
            action: "Tab to the button, activate with Enter, then activate with Space.",
            expected: "Focus is visible and native button activation fires for Enter and Space.",
            observed:
              "Focus remained visible and both keyboard activation keys triggered the button.",
            result: "pass",
          },
        ],
        result: "pass",
        summary: "Keyboard focus visibility and activation passed for the native Button capsule.",
        knownLimitations: [],
      },
      null,
      2,
    )}\n`,
  );
  writeFileSync(
    screenReaderPath,
    `${JSON.stringify(
      {
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
            id: "screen-reader-name-role",
            action: "Move to the button with NVDA browse mode and activate it.",
            expected: "NVDA announces the button name and role before activation.",
            observed: "NVDA announced the visible label and button role before activation.",
            result: "pass",
          },
        ],
        result: "pass",
        summary:
          "NVDA and Firefox announced name, role, and activation for the native Button capsule.",
        knownLimitations: [],
      },
      null,
      2,
    )}\n`,
  );

  const manual = JSON.parse(readFileSync(manualPath, "utf8")) as {
    baselineTests?: Array<{ evidence: string; source: string; status: string; test: string }>;
    knownLimitations: unknown[];
    manualTests: Array<unknown>;
    reviewedAt: string;
    reviewer: string;
    wcag?: Array<{ criterion: string; evidence: string; notes?: string; status: string }>;
  };
  manual.reviewedAt = "2026-05-05T14:00:00.000Z";
  manual.reviewer = "a11y-reviewer@example.gov";
  manual.wcag = (manual.wcag ?? []).map((item) => ({
    ...item,
    status: "pass",
    evidence:
      item.criterion === "2.4.7"
        ? `${outputArg}/button-keyboard-transcript.json#keyboard-focus`
        : `${outputArg}/button-screen-reader-transcript.json#screen-reader-name-role`,
    notes:
      item.criterion === "2.4.7"
        ? "Visible focus was observed."
        : "Name, role, and activation were observed.",
  }));
  manual.baselineTests = (manual.baselineTests ?? []).map((item) => ({
    ...item,
    status: "pass",
    evidence: item.test.toLowerCase().includes("keyboard")
      ? `${outputArg}/button-keyboard-transcript.json#keyboard-focus`
      : `${outputArg}/button-screen-reader-transcript.json#screen-reader-name-role`,
  }));
  manual.manualTests = [
    {
      tech: "Keyboard",
      browser: "Firefox",
      browserVersion: "145",
      os: "Windows 11",
      date: "2026-05-05",
      tester: "a11y-reviewer@example.gov",
      result: "pass",
      evidence: `${outputArg}/button-keyboard-transcript.json#keyboard-focus`,
      notes: "Tab, Shift+Tab, Enter, Space, and focus visibility passed.",
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
      evidence: `${outputArg}/button-screen-reader-transcript.json#screen-reader-name-role`,
      notes: "Name, role, and activation were announced as expected.",
    },
  ];
  manual.knownLimitations = [];
  writeFileSync(manualPath, `${JSON.stringify(manual, null, 2)}\n`);
}

function writeKeyboardOnlyManualReview(path: string): void {
  writeFileSync(
    path,
    `${JSON.stringify(
      {
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
          {
            criterion: "4.1.2",
            status: "pass",
            evidence: "manual/button-keyboard-review.md#name-role-value",
          },
        ],
        baselineTests: [
          {
            source: "Section 508 ICT Testing Baseline for Web",
            test: "Keyboard Accessible",
            status: "pass",
            evidence: "manual/button-keyboard-review.md",
          },
          {
            source: "Section 508 ICT Testing Baseline for Web",
            test: "Name, Role, Value",
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
            notes: "Keyboard focus and activation passed, but no screen reader was used.",
          },
        ],
        knownLimitations: [],
      },
      null,
      2,
    )}\n`,
  );
}

function writeScreenReaderOnlyManualReview(path: string): void {
  writeFileSync(
    path,
    `${JSON.stringify(
      {
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
          {
            criterion: "4.1.2",
            status: "pass",
            evidence: "manual/button-screen-reader-review.md#name-role-value",
          },
        ],
        baselineTests: [
          {
            source: "Section 508 ICT Testing Baseline for Web",
            test: "Keyboard Accessible",
            status: "pass",
            evidence: "manual/button-keyboard-review.md",
          },
          {
            source: "Section 508 ICT Testing Baseline for Web",
            test: "Name, Role, Value",
            status: "pass",
            evidence: "manual/button-screen-reader-review.md",
          },
        ],
        manualTests: [
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
            notes:
              "Name, role, state, and activation were announced, but no keyboard-only manual run was recorded.",
          },
        ],
        knownLimitations: [],
      },
      null,
      2,
    )}\n`,
  );
}

function writeScreenReaderReviewWithoutEvidence(path: string): void {
  writeFileSync(
    path,
    `${JSON.stringify(
      {
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
          {
            criterion: "4.1.2",
            status: "pass",
            evidence: "manual/button-screen-reader-review.md#name-role-value",
          },
        ],
        baselineTests: [
          {
            source: "Section 508 ICT Testing Baseline for Web",
            test: "Keyboard Accessible",
            status: "pass",
            evidence: "manual/button-keyboard-review.md",
          },
          {
            source: "Section 508 ICT Testing Baseline for Web",
            test: "Name, Role, Value",
            status: "pass",
            evidence: "manual/button-screen-reader-review.md",
          },
        ],
        manualTests: [
          {
            tech: "NVDA",
            version: "2025.4",
            browser: "Firefox",
            browserVersion: "145",
            os: "Windows 11",
            date: "2026-05-05",
            tester: "a11y-reviewer@example.gov",
            result: "pass",
            notes: "This intentionally omits the transcript/evidence pointer.",
          },
        ],
        knownLimitations: [],
      },
      null,
      2,
    )}\n`,
  );
}

function writePassingManualReviewWithPlaceholderEvidence(path: string): void {
  writeFileSync(
    path,
    `${JSON.stringify(
      {
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
            evidence: "TODO: document manual evidence for WCAG 2.4.7.",
          },
          {
            criterion: "4.1.2",
            status: "pass",
            evidence: "manual/button-screen-reader-review.md#name-role-value",
          },
        ],
        baselineTests: [
          {
            source: "Section 508 ICT Testing Baseline for Web",
            test: "Keyboard Accessible",
            status: "pass",
            evidence: "TODO: document manual evidence for ICT Baseline keyboard test.",
          },
          {
            source: "Section 508 ICT Testing Baseline for Web",
            test: "Name, Role, Value",
            status: "pass",
            evidence: "manual/button-screen-reader-review.md",
          },
        ],
        manualTests: [
          {
            tech: "NVDA",
            version: "2025.4",
            browser: "Firefox",
            browserVersion: "145",
            os: "Windows 11",
            date: "2026-05-05",
            tester: "a11y-reviewer@example.gov",
            result: "pass",
            evidence: "TODO: path or URL to screen-reader transcript.",
            notes: "This intentionally leaves generated TODO evidence placeholders.",
          },
        ],
        knownLimitations: [],
      },
      null,
      2,
    )}\n`,
  );
}

beforeEach(() => {
  scratch = mkdtempSync(join(tmpdir(), "ashlar-evidence-test-"));
});

afterEach(() => {
  rmSync(scratch, { recursive: true, force: true });
});

describe("evidence command", () => {
  it(
    "passes the evidence check for registry components that do not claim stable evidence",
    () => {
      const result = runCli(["evidence", "--check", "--registry", join(repoRoot, "registry")]);

      expect(result.status).toBe(0);
      expect(result.stdout).toContain("Evidence check passed for");
    },
    CLI_SMOKE_TIMEOUT_MS,
  );

  it(
    "writes a Markdown evidence report for procurement and CI review",
    () => {
      const reportPath = join(scratch, "reports", "ashlar-evidence.md");

      const result = runCli([
        "evidence",
        "--report",
        reportPath,
        "--registry",
        join(repoRoot, "registry"),
      ]);

      expect(result.status).toBe(0);
      expect(result.stdout).toContain(`Wrote evidence report to ${reportPath}`);

      const report = readFileSync(reportPath, "utf8");
      expect(report).toContain("# Ashlar Evidence Report");
      expect(report).toContain("Generated from registry:");
      expect(report).toContain("## Summary");
      expect(report).toContain("- Evidence check: passed");
      expect(report).toContain("### button@0.0.1");
      expect(report).toContain("- accessibility: not-reviewed");
    },
    CLI_SMOKE_TIMEOUT_MS,
  );

  it(
    "writes a manual evidence template for reviewer completion",
    () => {
      const outputPath = join(scratch, "reports", "button-manual-review.json");

      const result = runCli([
        "evidence",
        "manual-template",
        "button",
        "--output",
        outputPath,
        "--registry",
        join(repoRoot, "registry"),
      ]);

      expect(result.status).toBe(0);
      expect(result.stdout).toContain("Wrote manual evidence template for button@0.0.1");

      const artifact = JSON.parse(readFileSync(outputPath, "utf8")) as {
        $schema: string;
        component: string;
        version: string;
        reviewer: string;
        wcag?: Array<{ criterion: string; evidence: string; status: string }>;
        baselineTests?: Array<{ evidence: string; status: string; test: string }>;
        manualTests: Array<{ result: string; tech: string }>;
        knownLimitations: unknown[];
      };

      expect(artifact.$schema).toBe("https://ashlar.dev/schemas/manual-evidence.schema.json");
      expect(artifact.component).toBe("button");
      expect(artifact.version).toBe("0.0.1");
      expect(artifact.reviewer).toBe("TODO: reviewer name or email");
      expect(artifact.wcag).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            criterion: "2.4.7",
            evidence: "TODO: document manual evidence for WCAG 2.4.7 (Focus Visible).",
            status: "known-issue",
          }),
        ]),
      );
      expect(artifact.baselineTests).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            evidence: "TODO: document manual evidence for ICT Baseline test: Keyboard Accessible.",
            status: "known-issue",
            test: "Keyboard Accessible",
          }),
        ]),
      );
      expect(artifact.manualTests).toEqual([
        expect.objectContaining({
          result: "blocked",
          tech: "Keyboard",
        }),
        expect.objectContaining({
          result: "blocked",
          tech: "TODO: screen reader (NVDA, JAWS, VoiceOver, Narrator, or equivalent)",
        }),
      ]);
      expect(artifact.knownLimitations).toEqual([]);
    },
    CLI_SMOKE_TIMEOUT_MS,
  );

  it(
    "writes schema-backed manual transcript templates for reviewer completion",
    () => {
      const keyboardPath = join(scratch, "reports", "button-keyboard-transcript.json");
      const screenReaderPath = join(scratch, "reports", "button-screen-reader-transcript.json");

      const keyboardResult = runCli([
        "evidence",
        "transcript-template",
        "button",
        "--type",
        "keyboard",
        "--output",
        keyboardPath,
        "--registry",
        join(repoRoot, "registry"),
      ]);
      const screenReaderResult = runCli([
        "evidence",
        "transcript-template",
        "button",
        "--type",
        "screen-reader",
        "--output",
        screenReaderPath,
        "--registry",
        join(repoRoot, "registry"),
      ]);

      expect(keyboardResult.status).toBe(0);
      expect(keyboardResult.stdout).toContain(
        "Wrote keyboard manual transcript template for button@0.0.1",
      );
      expect(screenReaderResult.status).toBe(0);
      expect(screenReaderResult.stdout).toContain(
        "Wrote screen-reader manual transcript template for button@0.0.1",
      );

      const keyboardArtifact = JSON.parse(readFileSync(keyboardPath, "utf8")) as {
        $schema: string;
        component: string;
        version: string;
        transcriptType: string;
        environment: { inputDevice?: string };
        result: string;
        steps: Array<{ expected: string; id: string; result: string }>;
      };
      const screenReaderArtifact = JSON.parse(readFileSync(screenReaderPath, "utf8")) as {
        $schema: string;
        component: string;
        version: string;
        transcriptType: string;
        environment: { assistiveTechnology?: string };
        result: string;
        steps: Array<{ expected: string; id: string; result: string }>;
      };

      expect(keyboardArtifact).toMatchObject({
        $schema: "https://ashlar.dev/schemas/manual-transcript.schema.json",
        component: "button",
        version: "0.0.1",
        transcriptType: "keyboard",
        result: "blocked",
      });
      expect(keyboardArtifact.environment.inputDevice).toBe("Keyboard");
      expect(keyboardArtifact.steps).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            id: "button-focus-visible",
            result: "blocked",
          }),
          expect.objectContaining({
            id: "button-enter-activation",
            expected: "The native button activation fires once without requiring pointer input.",
            result: "blocked",
          }),
          expect.objectContaining({
            id: "button-space-activation",
            result: "blocked",
          }),
        ]),
      );
      expect(screenReaderArtifact).toMatchObject({
        $schema: "https://ashlar.dev/schemas/manual-transcript.schema.json",
        component: "button",
        version: "0.0.1",
        transcriptType: "screen-reader",
        result: "blocked",
      });
      expect(screenReaderArtifact.environment.assistiveTechnology).toContain("TODO: screen reader");
      expect(screenReaderArtifact.steps).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            id: "button-screen-reader-name-role",
            expected:
              "The screen reader announces the button's accessible name and native button role.",
            result: "blocked",
          }),
          expect.objectContaining({
            id: "button-screen-reader-enter-activation",
            result: "blocked",
          }),
          expect.objectContaining({
            id: "button-screen-reader-space-activation",
            result: "blocked",
          }),
        ]),
      );
    },
    CLI_SMOKE_TIMEOUT_MS,
  );

  it("validates manual transcript artifacts against the registry component", () => {
    writeManualEvidenceFiles();
    const transcriptPath = join(scratch, "manual", "button-screen-reader-review.json");

    const result = runCli([
      "evidence",
      "transcript-validate",
      "button",
      "--type",
      "screen-reader",
      "--transcript",
      transcriptPath,
      "--registry",
      join(repoRoot, "registry"),
    ]);

    expect(result.status).toBe(0);
    expect(result.stdout).toContain("Valid screen-reader manual transcript for button@0.0.1: pass");
  });

  it("fails transcript validation when a reviewer worksheet is still incomplete", () => {
    const transcriptPath = join(scratch, "reports", "button-keyboard-transcript.json");
    expect(
      runCli([
        "evidence",
        "transcript-template",
        "button",
        "--type",
        "keyboard",
        "--output",
        transcriptPath,
        "--registry",
        join(repoRoot, "registry"),
      ]).status,
    ).toBe(0);

    const result = runCli([
      "evidence",
      "transcript-validate",
      "button",
      "--type",
      "keyboard",
      "--transcript",
      transcriptPath,
      "--registry",
      join(repoRoot, "registry"),
    ]);

    expect(result.status).toBe(1);
    expect(result.stdout).toContain("Manual keyboard transcript is incomplete");
    expect(result.stdout).toContain("contains TODO, TBD, or placeholder text");
    expect(result.stdout).toContain("overall result is blocked");
    expect(result.stdout).toContain("button-focus-visible");
  });

  it("fails transcript validation when the transcript type does not match", () => {
    writeManualEvidenceFiles();
    const transcriptPath = join(scratch, "manual", "button-keyboard-review.json");

    const result = runCli([
      "evidence",
      "transcript-validate",
      "button",
      "--type",
      "screen-reader",
      "--transcript",
      transcriptPath,
      "--registry",
      join(repoRoot, "registry"),
    ]);

    expect(result.status).toBe(1);
    expect(result.stdout).toContain(
      "Manual transcript type mismatch: expected screen-reader, got keyboard.",
    );
  });

  it("collects automated evidence from a component fixture", () => {
    const outputPath = join(scratch, "reports", "button-evidence.json");
    const fixturePath = join(repoRoot, "registry", "components", "button", "0.0.1", "button.html");

    const result = runCli([
      "evidence",
      "collect",
      "button",
      "--fixture",
      fixturePath,
      "--output",
      outputPath,
      "--registry",
      join(repoRoot, "registry"),
    ]);

    expect(result.status).toBe(0);
    expect(result.stdout).toContain("Collected automated evidence for button@0.0.1");

    const artifact = JSON.parse(readFileSync(outputPath, "utf8")) as {
      $schema: string;
      component: string;
      version: string;
      status: string;
      automatedResults: {
        ashlarAudit?: {
          policy: string;
          status: string;
          findings: unknown[];
        };
      };
    };

    expect(artifact.$schema).toBe("https://ashlar.dev/schemas/evidence-artifact.schema.json");
    expect(artifact.component).toBe("button");
    expect(artifact.version).toBe("0.0.1");
    expect(artifact.status).toBe("pass");
    expect(artifact.automatedResults.ashlarAudit).toMatchObject({
      policy: "components",
      status: "pass",
      findings: [],
    });
  });

  it("prepares a non-mutating stable evidence review bundle", () => {
    const outputArg = "reports/button-stable-review";
    const outputDir = join(scratch, outputArg);
    const fixturePath = join(repoRoot, "registry", "components", "button", "0.0.1", "button.html");

    const result = runCli([
      "evidence",
      "prepare-stable",
      "button",
      "--fixture",
      fixturePath,
      "--output",
      outputArg,
      "--registry",
      join(repoRoot, "registry"),
    ]);

    expect(result.status).toBe(0);
    expect(result.stdout).toContain(
      "Prepared stable evidence review bundle for button@0.0.1: pass",
    );

    const automatedPath = join(outputDir, "button-automated-evidence.json");
    const proposedPath = join(outputDir, "button.evidence.proposed.json");
    const manualPath = join(outputDir, "button-manual-review.json");
    const keyboardPath = join(outputDir, "button-keyboard-transcript.json");
    const screenReaderPath = join(outputDir, "button-screen-reader-transcript.json");
    const harnessPath = join(outputDir, "REVIEW.html");
    const issuePath = join(outputDir, "ISSUE.md");
    const manifestPath = join(outputDir, "MANIFEST.json");
    const checklistPath = join(outputDir, "REVIEWER_CHECKLIST.md");
    const readmePath = join(outputDir, "README.md");

    for (const path of [
      automatedPath,
      proposedPath,
      manualPath,
      keyboardPath,
      screenReaderPath,
      harnessPath,
      issuePath,
      manifestPath,
      checklistPath,
      readmePath,
    ]) {
      expect(existsSync(path)).toBe(true);
    }

    const proposed = JSON.parse(readFileSync(proposedPath, "utf8")) as {
      accessibilityStatus: string;
      automatedResults?: { ashlarAudit?: { status: string } };
    };
    const manual = JSON.parse(readFileSync(manualPath, "utf8")) as {
      manualTests: Array<{ evidence?: string; result: string; tech: string }>;
    };
    const keyboardTranscript = JSON.parse(readFileSync(keyboardPath, "utf8")) as {
      result: string;
      transcriptType: string;
    };
    const screenReaderTranscript = JSON.parse(readFileSync(screenReaderPath, "utf8")) as {
      result: string;
      transcriptType: string;
    };
    const manifest = JSON.parse(readFileSync(manifestPath, "utf8")) as {
      $schema: string;
      schemaVersion: string;
      artifactType: string;
      component: string;
      version: string;
      automatedStatus: string;
      stableClaim: boolean;
      requiresManualReview: boolean;
      files: Array<{
        role: string;
        path: string;
        bytes: number;
        mutableByReviewer: boolean;
        sha256: string;
      }>;
    };
    const readme = readFileSync(readmePath, "utf8");
    const issue = readFileSync(issuePath, "utf8");
    const checklist = readFileSync(checklistPath, "utf8");
    const harness = readFileSync(harnessPath, "utf8");

    expect(proposed.accessibilityStatus).toBe("automated-tested");
    expect(proposed.automatedResults?.ashlarAudit?.status).toBe("pass");
    expect(manual.manualTests).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          evidence: "reports/button-stable-review/button-keyboard-transcript.json",
          result: "blocked",
          tech: "Keyboard",
        }),
        expect.objectContaining({
          evidence: "reports/button-stable-review/button-screen-reader-transcript.json",
          result: "blocked",
        }),
      ]),
    );
    expect(keyboardTranscript).toMatchObject({ result: "blocked", transcriptType: "keyboard" });
    expect(screenReaderTranscript).toMatchObject({
      result: "blocked",
      transcriptType: "screen-reader",
    });
    expect(manifest).toMatchObject({
      $schema: "https://ashlar.dev/schemas/stable-evidence-review-manifest.schema.json",
      schemaVersion: "1.0",
      artifactType: "stable-evidence-review-bundle",
      component: "button",
      version: "0.0.1",
      automatedStatus: "pass",
      stableClaim: false,
      requiresManualReview: true,
    });
    expect(manifest.files).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          role: "automated-evidence",
          path: "reports/button-stable-review/button-automated-evidence.json",
        }),
        expect.objectContaining({
          role: "manual-evidence-worksheet",
          path: "reports/button-stable-review/button-manual-review.json",
          mutableByReviewer: true,
        }),
        expect.objectContaining({
          role: "keyboard-transcript-worksheet",
          path: "reports/button-stable-review/button-keyboard-transcript.json",
          mutableByReviewer: true,
        }),
        expect.objectContaining({
          role: "screen-reader-transcript-worksheet",
          path: "reports/button-stable-review/button-screen-reader-transcript.json",
          mutableByReviewer: true,
        }),
        expect.objectContaining({
          role: "reviewer-harness",
          path: "reports/button-stable-review/REVIEW.html",
          mutableByReviewer: false,
        }),
        expect.objectContaining({
          role: "github-issue-body",
          path: "reports/button-stable-review/ISSUE.md",
        }),
        expect.objectContaining({
          role: "reviewer-checklist",
          path: "reports/button-stable-review/REVIEWER_CHECKLIST.md",
          mutableByReviewer: false,
        }),
        expect.objectContaining({
          role: "reviewer-readme",
          path: "reports/button-stable-review/README.md",
          mutableByReviewer: false,
        }),
      ]),
    );
    for (const file of manifest.files) {
      expect(file.bytes).toBeGreaterThan(0);
      expect(file.sha256).toMatch(/^[a-f0-9]{64}$/);
    }
    expect(harness).toContain("Ashlar button@0.0.1 Stable Evidence Harness");
    expect(harness).toContain('class="ashlar-button"');
    expect(harness).toContain("Target activation");
    expect(readme).toContain("ashlar evidence transcript-validate button");
    expect(readme).toContain("REVIEW.html");
    expect(readme).toContain("ashlar evidence finalize-stable button");
    expect(readme).toContain("Review packet manifest");
    expect(readme).toContain("REVIEWER_CHECKLIST.md");
    expect(issue).toContain("Stable Evidence Review: button@0.0.1");
    expect(issue).toContain(".github/ISSUE_TEMPLATE/stable_evidence_review.yml");
    expect(issue).toContain("ashlar evidence review-status button");
    expect(issue).toContain("Review packet manifest");
    expect(issue).toContain("button-keyboard-transcript.json");
    expect(issue).toContain("REVIEW.html");
    expect(issue).toContain("REVIEWER_CHECKLIST.md");
    expect(checklist).toContain("Stable Evidence Reviewer Checklist");
    expect(checklist).toContain("REVIEW.html");
    expect(checklist).toContain("The review records observed behavior, not intent");
    expect(checklist).toContain("ashlar evidence review-status button");
    expect(checklist).toContain("ashlar evidence finalize-stable button");
  });

  it("prepares non-mutating stable evidence review bundles for every foundation capsule", () => {
    const outputArg = "reports/markup-primitive-stable-review";
    const outputDir = join(scratch, outputArg);

    const result = runCli([
      "evidence",
      "prepare-stable-all",
      "--output",
      outputArg,
      "--registry",
      join(repoRoot, "registry"),
    ]);

    expect(result.status).toBe(0);
    expect(result.stdout).toContain(
      "Prepared 12 stable evidence review bundle(s) for foundations: pass",
    );
    expect(result.stdout).toContain("  - button@0.0.1: pass");

    const indexPath = join(outputDir, "INDEX.md");
    expect(existsSync(indexPath)).toBe(true);
    for (const component of [
      "alert",
      "banner",
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
    ]) {
      expect(existsSync(join(outputDir, component, "README.md"))).toBe(true);
      expect(existsSync(join(outputDir, component, "REVIEW.html"))).toBe(true);
      expect(existsSync(join(outputDir, component, "REVIEWER_CHECKLIST.md"))).toBe(true);
      expect(existsSync(join(outputDir, component, `${component}-manual-review.json`))).toBe(true);
    }
    expect(existsSync(join(outputDir, "benefit-application"))).toBe(false);

    const index = readFileSync(indexPath, "utf8");
    expect(index).toContain("# Stable Evidence Review Batch");
    expect(index).toContain("This directory is a review intake aid for foundation capsules.");
    expect(index).toContain("ashlar evidence review-status button --registry");
    expect(index).toContain("Strict readiness only counts completed external review records");
  });

  it("reports blockers for an incomplete stable evidence review bundle", () => {
    const outputArg = "reports/button-stable-review";
    const fixturePath = join(repoRoot, "registry", "components", "button", "0.0.1", "button.html");

    expect(
      runCli([
        "evidence",
        "prepare-stable",
        "button",
        "--fixture",
        fixturePath,
        "--output",
        outputArg,
        "--registry",
        join(repoRoot, "registry"),
      ]).status,
    ).toBe(0);

    const result = runCli([
      "evidence",
      "review-status",
      "button",
      "--review-dir",
      outputArg,
      "--format",
      "json",
      "--registry",
      join(repoRoot, "registry"),
    ]);

    expect(result.status).toBe(1);
    const report = JSON.parse(result.stdout) as {
      status: string;
      blockers: Array<{ rule: string; file: string; message: string }>;
    };
    expect(report.status).toBe("blocked");
    expect(report.blockers).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ rule: "review/placeholder" }),
        expect.objectContaining({ rule: "keyboard-transcript/result" }),
        expect.objectContaining({ rule: "screen-reader-transcript/result" }),
        expect.objectContaining({ rule: "evidence/stable-keyboard-tests" }),
        expect.objectContaining({ rule: "evidence/stable-manual-tests" }),
      ]),
    );
  });

  it("writes a review-status JSON artifact while preserving blocked exit status", () => {
    const outputArg = "reports/button-stable-review";
    const reportPath = join(scratch, "reports", "button-stable-review-status.json");
    const fixturePath = join(repoRoot, "registry", "components", "button", "0.0.1", "button.html");

    expect(
      runCli([
        "evidence",
        "prepare-stable",
        "button",
        "--fixture",
        fixturePath,
        "--output",
        outputArg,
        "--registry",
        join(repoRoot, "registry"),
      ]).status,
    ).toBe(0);

    const result = runCli([
      "evidence",
      "review-status",
      "button",
      "--review-dir",
      outputArg,
      "--format",
      "json",
      "--output",
      reportPath,
      "--registry",
      join(repoRoot, "registry"),
    ]);

    expect(result.status).toBe(1);
    expect(result.stdout).toContain(`Wrote stable evidence review status to ${reportPath}`);
    const report = JSON.parse(readFileSync(reportPath, "utf8")) as {
      $schema: string;
      schemaVersion: string;
      files: { manifest: string; reviewHarness: string };
      status: string;
      blockers: Array<{ rule: string }>;
    };
    expect(report.$schema).toBe(
      "https://ashlar.dev/schemas/stable-evidence-review-status.schema.json",
    );
    expect(report.schemaVersion).toBe("1.0");
    expect(report.status).toBe("blocked");
    expect(report.files.manifest).toBe("reports/button-stable-review/MANIFEST.json");
    expect(report.files.reviewHarness).toBe("reports/button-stable-review/REVIEW.html");
    expect(report.blockers).toEqual(
      expect.arrayContaining([expect.objectContaining({ rule: "review/placeholder" })]),
    );
  });

  it("blocks stable evidence review when immutable generated files drift from the manifest", () => {
    const outputArg = "reports/button-stable-review";
    const outputDir = join(scratch, outputArg);
    const fixturePath = join(repoRoot, "registry", "components", "button", "0.0.1", "button.html");

    expect(
      runCli([
        "evidence",
        "prepare-stable",
        "button",
        "--fixture",
        fixturePath,
        "--output",
        outputArg,
        "--registry",
        join(repoRoot, "registry"),
      ]).status,
    ).toBe(0);

    const proposedPath = join(outputDir, "button.evidence.proposed.json");
    writeFileSync(proposedPath, `${readFileSync(proposedPath, "utf8").trimEnd()}\n\n`);

    const result = runCli([
      "evidence",
      "review-status",
      "button",
      "--review-dir",
      outputArg,
      "--format",
      "json",
      "--registry",
      join(repoRoot, "registry"),
    ]);

    expect(result.status).toBe(1);
    const report = JSON.parse(result.stdout) as {
      blockers: Array<{ rule: string; file: string; message: string }>;
    };
    expect(report.blockers).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          file: "reports/button-stable-review/button.evidence.proposed.json",
          rule: "review/manifest-hash",
        }),
      ]),
    );
  });

  it("reports ready when a stable evidence review bundle has passing reviewer artifacts", () => {
    const outputArg = "reports/button-stable-review";
    const outputDir = join(scratch, outputArg);
    const manualPath = join(outputDir, "button-manual-review.json");
    const keyboardPath = join(outputDir, "button-keyboard-transcript.json");
    const screenReaderPath = join(outputDir, "button-screen-reader-transcript.json");
    const fixturePath = join(repoRoot, "registry", "components", "button", "0.0.1", "button.html");

    expect(
      runCli([
        "evidence",
        "prepare-stable",
        "button",
        "--fixture",
        fixturePath,
        "--output",
        outputArg,
        "--registry",
        join(repoRoot, "registry"),
      ]).status,
    ).toBe(0);
    writeManualEvidenceFiles();
    writePassingManualReview(manualPath);
    cpSync(join(scratch, "manual", "button-keyboard-review.json"), keyboardPath);
    cpSync(join(scratch, "manual", "button-screen-reader-review.json"), screenReaderPath);

    const result = runCli([
      "evidence",
      "review-status",
      "button",
      "--review-dir",
      outputArg,
      "--registry",
      join(repoRoot, "registry"),
    ]);

    expect(result.status).toBe(0);
    expect(result.stdout).toContain("Stable evidence review status for button@0.0.1: ready");
    expect(result.stdout).toContain(
      "Ready to finalize reviewed and stable evidence proposal artifacts.",
    );
    expect(result.stdout).toContain("ashlar evidence finalize-stable button");
    expect(existsSync(join(outputDir, "button.evidence.reviewed.json"))).toBe(false);
    expect(existsSync(join(outputDir, "button.evidence.stable.json"))).toBe(false);
  });

  it("finalizes a ready stable evidence review bundle without publishing to the registry", () => {
    const outputArg = "reports/button-stable-review";
    const outputDir = join(scratch, outputArg);
    const fixturePath = join(repoRoot, "registry", "components", "button", "0.0.1", "button.html");

    expect(
      runCli([
        "evidence",
        "prepare-stable",
        "button",
        "--fixture",
        fixturePath,
        "--output",
        outputArg,
        "--registry",
        join(repoRoot, "registry"),
      ]).status,
    ).toBe(0);
    completePreparedReviewBundle(outputArg, outputDir);

    const result = runCli([
      "evidence",
      "finalize-stable",
      "button",
      "--review-dir",
      outputArg,
      "--registry",
      join(repoRoot, "registry"),
    ]);

    expect(result.status, result.stdout).toBe(0);
    expect(result.stdout).toContain("Finalized stable evidence review for button@0.0.1");
    expect(result.stdout).toContain("reports/button-stable-review/button.evidence.reviewed.json");
    expect(result.stdout).toContain("reports/button-stable-review/button.evidence.stable.json");

    const reviewed = JSON.parse(
      readFileSync(join(outputDir, "button.evidence.reviewed.json"), "utf8"),
    ) as {
      accessibilityStatus: string;
      stability: string;
    };
    const stable = JSON.parse(
      readFileSync(join(outputDir, "button.evidence.stable.json"), "utf8"),
    ) as {
      accessibilityStatus: string;
      manualTests: Array<{ evidence?: string; result: string; tech: string }>;
      stability: string;
    };
    expect(reviewed).toMatchObject({
      accessibilityStatus: "manual-tested",
      stability: "experimental",
    });
    expect(stable).toMatchObject({
      accessibilityStatus: "stable-evidence",
      stability: "stable",
    });
    expect(stable.manualTests).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          evidence: "reports/button-stable-review/button-keyboard-transcript.json#keyboard-focus",
          result: "pass",
          tech: "Keyboard",
        }),
        expect.objectContaining({
          evidence:
            "reports/button-stable-review/button-screen-reader-transcript.json#screen-reader-name-role",
          result: "pass",
          tech: "NVDA",
        }),
      ]),
    );

    const check = runCli([
      "evidence",
      "button",
      "--check",
      "--evidence-file",
      join(outputDir, "button.evidence.stable.json"),
      "--registry",
      join(repoRoot, "registry"),
    ]);
    expect(check.status, check.stdout).toBe(0);
    expect(check.stdout).toContain("Evidence check passed for 1 component(s)");
  });

  it("refuses to finalize a blocked stable evidence review bundle", () => {
    const outputArg = "reports/button-stable-review";
    const outputDir = join(scratch, outputArg);
    const fixturePath = join(repoRoot, "registry", "components", "button", "0.0.1", "button.html");

    expect(
      runCli([
        "evidence",
        "prepare-stable",
        "button",
        "--fixture",
        fixturePath,
        "--output",
        outputArg,
        "--registry",
        join(repoRoot, "registry"),
      ]).status,
    ).toBe(0);

    const result = runCli([
      "evidence",
      "finalize-stable",
      "button",
      "--review-dir",
      outputArg,
      "--registry",
      join(repoRoot, "registry"),
    ]);

    expect(result.status).toBe(1);
    expect(result.stdout).toContain("Stable evidence review bundle is blocked");
    expect(result.stdout).toContain("keyboard-transcript/result");
    expect(existsSync(join(outputDir, "button.evidence.reviewed.json"))).toBe(false);
    expect(existsSync(join(outputDir, "button.evidence.stable.json"))).toBe(false);
  });

  it("applies a collected artifact to a proposed evidence packet", () => {
    const artifactPath = join(scratch, "reports", "button-artifact.json");
    const evidencePath = join(scratch, "reports", "button.evidence.json");
    const fixturePath = join(repoRoot, "registry", "components", "button", "0.0.1", "button.html");

    expect(
      runCli([
        "evidence",
        "collect",
        "button",
        "--fixture",
        fixturePath,
        "--output",
        artifactPath,
        "--registry",
        join(repoRoot, "registry"),
      ]).status,
    ).toBe(0);

    const result = runCli([
      "evidence",
      "apply",
      "button",
      "--artifact",
      artifactPath,
      "--output",
      evidencePath,
      "--registry",
      join(repoRoot, "registry"),
    ]);

    expect(result.status).toBe(0);
    expect(result.stdout).toContain("Applied automated evidence for button@0.0.1");

    const evidence = JSON.parse(readFileSync(evidencePath, "utf8")) as {
      accessibilityStatus: string;
      automatedResults: {
        ashlarAudit?: {
          artifact?: { schema: string };
          status: string;
        };
      };
    };

    expect(evidence.accessibilityStatus).toBe("automated-tested");
    expect(evidence.automatedResults.ashlarAudit).toMatchObject({
      artifact: { schema: "https://ashlar.dev/schemas/evidence-artifact.schema.json" },
      status: "pass",
    });
  });

  it("checks a proposed evidence packet without mutating the registry", () => {
    const artifactPath = join(scratch, "reports", "button-artifact.json");
    const evidencePath = join(scratch, "reports", "button.evidence.json");
    const fixturePath = join(repoRoot, "registry", "components", "button", "0.0.1", "button.html");

    expect(
      runCli([
        "evidence",
        "collect",
        "button",
        "--fixture",
        fixturePath,
        "--output",
        artifactPath,
        "--registry",
        join(repoRoot, "registry"),
      ]).status,
    ).toBe(0);
    expect(
      runCli([
        "evidence",
        "apply",
        "button",
        "--artifact",
        artifactPath,
        "--output",
        evidencePath,
        "--registry",
        join(repoRoot, "registry"),
      ]).status,
    ).toBe(0);

    const result = runCli([
      "evidence",
      "button",
      "--check",
      "--evidence-file",
      evidencePath,
      "--registry",
      join(repoRoot, "registry"),
    ]);

    expect(result.status).toBe(0);
    expect(result.stdout).toContain("Evidence check passed for 1 component(s)");

    const registryEvidence = runCli([
      "evidence",
      "button",
      "--format",
      "json",
      "--registry",
      join(repoRoot, "registry"),
    ]);
    expect(registryEvidence.stdout).toContain('"accessibilityStatus": "not-reviewed"');
  });

  it("applies a manual review artifact to a proposed evidence packet without mutating inputs", () => {
    const artifactPath = join(scratch, "reports", "button-artifact.json");
    const proposedPath = join(scratch, "reports", "button.evidence.proposed.json");
    const manualPath = join(scratch, "reports", "button-manual-review.json");
    const reviewedPath = join(scratch, "reports", "button.evidence.reviewed.json");
    const fixturePath = join(repoRoot, "registry", "components", "button", "0.0.1", "button.html");

    expect(
      runCli([
        "evidence",
        "collect",
        "button",
        "--fixture",
        fixturePath,
        "--output",
        artifactPath,
        "--registry",
        join(repoRoot, "registry"),
      ]).status,
    ).toBe(0);
    expect(
      runCli([
        "evidence",
        "apply",
        "button",
        "--artifact",
        artifactPath,
        "--output",
        proposedPath,
        "--registry",
        join(repoRoot, "registry"),
      ]).status,
    ).toBe(0);

    writePassingManualReview(manualPath);

    const result = runCli([
      "evidence",
      "review",
      "button",
      "--evidence-file",
      proposedPath,
      "--manual-file",
      manualPath,
      "--output",
      reviewedPath,
      "--registry",
      join(repoRoot, "registry"),
    ]);

    expect(result.status).toBe(0);
    expect(result.stdout).toContain("Applied manual review for button@0.0.1");

    const reviewed = JSON.parse(readFileSync(reviewedPath, "utf8")) as {
      accessibilityStatus: string;
      lastReviewed?: string;
      reviewer?: string;
      manualTests?: Array<{ tech?: string; result?: string }>;
      wcag?: Array<{ criterion: string; status: string; evidence?: string }>;
      baselineTests?: Array<{ test: string; status: string; evidence?: string }>;
      knownLimitations?: unknown[];
    };
    expect(reviewed.accessibilityStatus).toBe("manual-tested");
    expect(reviewed.lastReviewed).toBe("2026-05-05");
    expect(reviewed.reviewer).toBe("a11y-reviewer@example.gov");
    expect(reviewed.manualTests).toEqual(
      expect.arrayContaining([expect.objectContaining({ tech: "NVDA", result: "pass" })]),
    );
    expect(reviewed.wcag).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          criterion: "2.4.7",
          evidence: "manual/button-keyboard-review.md#focus-visible",
          status: "pass",
        }),
      ]),
    );
    expect(reviewed.baselineTests).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          evidence: "manual/button-keyboard-review.md",
          status: "pass",
          test: "Keyboard Accessible",
        }),
      ]),
    );
    expect(reviewed.knownLimitations).toEqual([]);

    const proposed = JSON.parse(readFileSync(proposedPath, "utf8")) as {
      accessibilityStatus: string;
      manualTests?: unknown[];
    };
    expect(proposed.accessibilityStatus).toBe("automated-tested");
    expect(proposed.manualTests).toEqual([]);
  });

  it("graduates a reviewed proposed evidence packet only after evidence gates pass", () => {
    const artifactPath = join(scratch, "reports", "button-artifact.json");
    const proposedPath = join(scratch, "reports", "button.evidence.proposed.json");
    const manualPath = join(scratch, "reports", "button-manual-review.json");
    const reviewedPath = join(scratch, "reports", "button.evidence.reviewed.json");
    const stablePath = join(scratch, "reports", "button.evidence.stable.json");
    const fixturePath = join(repoRoot, "registry", "components", "button", "0.0.1", "button.html");

    expect(
      runCli([
        "evidence",
        "collect",
        "button",
        "--fixture",
        fixturePath,
        "--output",
        artifactPath,
        "--registry",
        join(repoRoot, "registry"),
      ]).status,
    ).toBe(0);
    expect(
      runCli([
        "evidence",
        "apply",
        "button",
        "--artifact",
        artifactPath,
        "--output",
        proposedPath,
        "--registry",
        join(repoRoot, "registry"),
      ]).status,
    ).toBe(0);
    writePassingManualReview(manualPath);
    writeManualEvidenceFiles();
    expect(
      runCli([
        "evidence",
        "review",
        "button",
        "--evidence-file",
        proposedPath,
        "--manual-file",
        manualPath,
        "--output",
        reviewedPath,
        "--registry",
        join(repoRoot, "registry"),
      ]).status,
    ).toBe(0);

    const result = runCli([
      "evidence",
      "graduate",
      "button",
      "--evidence-file",
      reviewedPath,
      "--output",
      stablePath,
      "--registry",
      join(repoRoot, "registry"),
    ]);

    expect(result.status).toBe(0);
    expect(result.stdout).toContain("Graduated evidence for button@0.0.1: stable-evidence");

    const stable = JSON.parse(readFileSync(stablePath, "utf8")) as {
      accessibilityStatus: string;
      stability: string;
    };
    expect(stable.accessibilityStatus).toBe("stable-evidence");
    expect(stable.stability).toBe("stable");

    const check = runCli([
      "evidence",
      "button",
      "--check",
      "--evidence-file",
      stablePath,
      "--registry",
      join(repoRoot, "registry"),
    ]);
    expect(check.status).toBe(0);
    expect(check.stdout).toContain("Evidence check passed for 1 component(s)");
  });

  it("publishes a graduated evidence packet into the signed registry capsule", () => {
    const registry = join(scratch, "registry");
    const artifactPath = join(scratch, "reports", "button-artifact.json");
    const proposedPath = join(scratch, "reports", "button.evidence.proposed.json");
    const manualPath = join(scratch, "reports", "button-manual-review.json");
    const reviewedPath = join(scratch, "reports", "button.evidence.reviewed.json");
    const stablePath = join(scratch, "reports", "button.evidence.stable.json");
    const receiptPath = join(scratch, "reports", "button-publication-receipt.json");
    const mirrorPath = join(scratch, "mirror");
    const fixturePath = join(registry, "components", "button", "0.0.1", "button.html");

    cpSync(join(repoRoot, "registry"), registry, { recursive: true });
    const { keyId, signingKeyPath } = writeLocalSigningKey(registry);
    const originalIndex = JSON.parse(readFileSync(join(registry, "index.json"), "utf8")) as {
      components: { button: { capsuleHashes: Record<string, string>; stability: string } };
    };
    const originalCapsuleHash = originalIndex.components.button.capsuleHashes["0.0.1"];

    expect(
      runCli([
        "evidence",
        "collect",
        "button",
        "--fixture",
        fixturePath,
        "--output",
        artifactPath,
        "--registry",
        registry,
      ]).status,
    ).toBe(0);
    expect(
      runCli([
        "evidence",
        "apply",
        "button",
        "--artifact",
        artifactPath,
        "--output",
        proposedPath,
        "--registry",
        registry,
      ]).status,
    ).toBe(0);
    writePassingManualReview(manualPath);
    writeManualEvidenceFiles();
    expect(
      runCli([
        "evidence",
        "review",
        "button",
        "--evidence-file",
        proposedPath,
        "--manual-file",
        manualPath,
        "--output",
        reviewedPath,
        "--registry",
        registry,
      ]).status,
    ).toBe(0);
    expect(
      runCli([
        "evidence",
        "graduate",
        "button",
        "--evidence-file",
        reviewedPath,
        "--output",
        stablePath,
        "--registry",
        registry,
      ]).status,
    ).toBe(0);

    const result = runCli([
      "evidence",
      "publish",
      "button",
      "--evidence-file",
      stablePath,
      "--registry",
      registry,
      "--signing-key",
      signingKeyPath,
      "--key-id",
      keyId,
      "--output",
      receiptPath,
    ]);

    expect(result.status).toBe(0);
    expect(result.stdout).toContain("Published stable evidence for button@0.0.1");
    expect(result.stdout).toContain(`Wrote evidence publication receipt to ${receiptPath}`);

    const registryEvidence = JSON.parse(
      readFileSync(join(registry, "components", "button", "0.0.1", "button.evidence.json"), "utf8"),
    ) as {
      accessibilityStatus: string;
      baselineTests?: Array<{ evidence?: string }>;
      manualTests?: Array<{ evidence?: string }>;
      stability: string;
      wcag?: Array<{ evidence?: string }>;
    };
    expect(registryEvidence.accessibilityStatus).toBe("stable-evidence");
    expect(registryEvidence.stability).toBe("stable");
    expect(registryEvidence.wcag?.map((item) => item.evidence)).toEqual(
      expect.arrayContaining([
        "evidence/manual/button-keyboard-review.md#focus-visible",
        "evidence/manual/button-screen-reader-review.md#name-role-value",
      ]),
    );
    expect(registryEvidence.baselineTests?.map((item) => item.evidence)).toEqual(
      expect.arrayContaining([
        "evidence/manual/button-keyboard-review.md",
        "evidence/manual/button-screen-reader-review.md",
      ]),
    );
    expect(registryEvidence.manualTests?.map((item) => item.evidence)).toEqual(
      expect.arrayContaining([
        "evidence/manual/button-keyboard-review.json#keyboard-firefox",
        "evidence/manual/button-screen-reader-review.json#nvda-firefox",
      ]),
    );
    expect(
      existsSync(
        join(
          registry,
          "components",
          "button",
          "0.0.1",
          "evidence",
          "manual",
          "button-screen-reader-review.json",
        ),
      ),
    ).toBe(true);

    const manifest = JSON.parse(
      readFileSync(join(registry, "components", "button", "0.0.1", "button.capsule.json"), "utf8"),
    ) as TestCapsuleManifest;
    expect(manifest.stability).toBe("stable");
    expect(manifest.files).toHaveProperty("evidence/manual/button-keyboard-review.md");
    expect(manifest.files).toHaveProperty("evidence/manual/button-keyboard-review.json");
    expect(manifest.files).toHaveProperty("evidence/manual/button-screen-reader-review.md");
    expect(manifest.files).toHaveProperty("evidence/manual/button-screen-reader-review.json");
    expect(manifest.signature).toMatchObject({ keyId, algorithm: "ed25519" });
    expect(manifest.capsule_hash).not.toBe(originalCapsuleHash);

    const index = JSON.parse(readFileSync(join(registry, "index.json"), "utf8")) as {
      components: { button: { capsuleHashes: Record<string, string>; stability: string } };
    };
    expect(index.components.button.stability).toBe("stable");
    expect(index.components.button.capsuleHashes["0.0.1"]).toBe(manifest.capsule_hash);
    const receipt = JSON.parse(readFileSync(receiptPath, "utf8")) as {
      accessibilityStatus: string;
      capsuleHash: string;
      component: string;
      evidenceReferences: Array<{ reference: string; sha256: string; target: string }>;
      previousCapsuleHash: string;
      signatureKeyId: string;
      stability: string;
      tool: string;
      version: string;
    };
    expect(receipt).toMatchObject({
      accessibilityStatus: "stable-evidence",
      capsuleHash: manifest.capsule_hash,
      component: "button",
      previousCapsuleHash: originalCapsuleHash,
      signatureKeyId: keyId,
      stability: "stable",
      tool: "ashlar evidence publish",
      version: "0.0.1",
    });
    expect(receipt.evidenceReferences).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          reference: "evidence/manual/button-keyboard-review.json",
          target: join(
            registry,
            "components",
            "button",
            "0.0.1",
            "evidence",
            "manual",
            "button-keyboard-review.json",
          ),
        }),
      ]),
    );
    expect(receipt.evidenceReferences[0]?.sha256).toMatch(/^sha256:[a-f0-9]{64}$/);
    rmSync(join(scratch, "manual"), { recursive: true, force: true });

    const evidenceCheck = runCli(["evidence", "--check", "--registry", registry]);
    expect(evidenceCheck.status).toBe(0);

    const mirror = runCli(["registry", "mirror", "--registry", registry, "--output", mirrorPath]);
    expect(mirror.status).toBe(0);
  });

  it("does not mutate registry files when evidence publish signing fails", () => {
    const registry = join(scratch, "registry");
    const artifactPath = join(scratch, "reports", "button-artifact.json");
    const proposedPath = join(scratch, "reports", "button.evidence.proposed.json");
    const manualPath = join(scratch, "reports", "button-manual-review.json");
    const reviewedPath = join(scratch, "reports", "button.evidence.reviewed.json");
    const stablePath = join(scratch, "reports", "button.evidence.stable.json");
    const wrongSigningKeyPath = join(scratch, "wrong-signing-key.pem");
    const fixturePath = join(registry, "components", "button", "0.0.1", "button.html");
    const capsuleEvidenceDir = join(registry, "components", "button", "0.0.1", "evidence");
    const registryEvidencePath = join(
      registry,
      "components",
      "button",
      "0.0.1",
      "button.evidence.json",
    );
    const manifestPath = join(registry, "components", "button", "0.0.1", "button.capsule.json");
    const indexPath = join(registry, "index.json");

    cpSync(join(repoRoot, "registry"), registry, { recursive: true });
    const { keyId } = writeLocalSigningKey(registry);
    const { privateKey } = generateKeyPairSync("ed25519");
    writeFileSync(wrongSigningKeyPath, privateKey.export({ format: "pem", type: "pkcs8" }));
    const originalEvidence = readFileSync(registryEvidencePath, "utf8");
    const originalManifest = readFileSync(manifestPath, "utf8");
    const originalIndex = readFileSync(indexPath, "utf8");

    expect(
      runCli([
        "evidence",
        "collect",
        "button",
        "--fixture",
        fixturePath,
        "--output",
        artifactPath,
        "--registry",
        registry,
      ]).status,
    ).toBe(0);
    expect(
      runCli([
        "evidence",
        "apply",
        "button",
        "--artifact",
        artifactPath,
        "--output",
        proposedPath,
        "--registry",
        registry,
      ]).status,
    ).toBe(0);
    writePassingManualReview(manualPath);
    writeManualEvidenceFiles();
    expect(
      runCli([
        "evidence",
        "review",
        "button",
        "--evidence-file",
        proposedPath,
        "--manual-file",
        manualPath,
        "--output",
        reviewedPath,
        "--registry",
        registry,
      ]).status,
    ).toBe(0);
    expect(
      runCli([
        "evidence",
        "graduate",
        "button",
        "--evidence-file",
        reviewedPath,
        "--output",
        stablePath,
        "--registry",
        registry,
      ]).status,
    ).toBe(0);

    const result = runCli([
      "evidence",
      "publish",
      "button",
      "--evidence-file",
      stablePath,
      "--registry",
      registry,
      "--signing-key",
      wrongSigningKeyPath,
      "--key-id",
      keyId,
    ]);

    expect(result.status).toBe(1);
    expect(result.stdout).toContain("Generated capsule signature could not be verified");
    expect(existsSync(capsuleEvidenceDir)).toBe(false);
    expect(readFileSync(registryEvidencePath, "utf8")).toBe(originalEvidence);
    expect(readFileSync(manifestPath, "utf8")).toBe(originalManifest);
    expect(readFileSync(indexPath, "utf8")).toBe(originalIndex);
  });

  it("preflights evidence publish key ids against the registry trust root", () => {
    const registry = join(scratch, "registry");
    const artifactPath = join(scratch, "reports", "button-artifact.json");
    const proposedPath = join(scratch, "reports", "button.evidence.proposed.json");
    const manualPath = join(scratch, "reports", "button-manual-review.json");
    const reviewedPath = join(scratch, "reports", "button.evidence.reviewed.json");
    const stablePath = join(scratch, "reports", "button.evidence.stable.json");
    const fixturePath = join(registry, "components", "button", "0.0.1", "button.html");
    const capsuleEvidenceDir = join(registry, "components", "button", "0.0.1", "evidence");
    const registryEvidencePath = join(
      registry,
      "components",
      "button",
      "0.0.1",
      "button.evidence.json",
    );
    const manifestPath = join(registry, "components", "button", "0.0.1", "button.capsule.json");
    const indexPath = join(registry, "index.json");

    cpSync(join(repoRoot, "registry"), registry, { recursive: true });
    const { signingKeyPath } = writeLocalSigningKey(registry);
    const originalEvidence = readFileSync(registryEvidencePath, "utf8");
    const originalManifest = readFileSync(manifestPath, "utf8");
    const originalIndex = readFileSync(indexPath, "utf8");

    expect(
      runCli([
        "evidence",
        "collect",
        "button",
        "--fixture",
        fixturePath,
        "--output",
        artifactPath,
        "--registry",
        registry,
      ]).status,
    ).toBe(0);
    expect(
      runCli([
        "evidence",
        "apply",
        "button",
        "--artifact",
        artifactPath,
        "--output",
        proposedPath,
        "--registry",
        registry,
      ]).status,
    ).toBe(0);
    writePassingManualReview(manualPath);
    writeManualEvidenceFiles();
    expect(
      runCli([
        "evidence",
        "review",
        "button",
        "--evidence-file",
        proposedPath,
        "--manual-file",
        manualPath,
        "--output",
        reviewedPath,
        "--registry",
        registry,
      ]).status,
    ).toBe(0);
    expect(
      runCli([
        "evidence",
        "graduate",
        "button",
        "--evidence-file",
        reviewedPath,
        "--output",
        stablePath,
        "--registry",
        registry,
      ]).status,
    ).toBe(0);

    const result = runCli([
      "evidence",
      "publish",
      "button",
      "--evidence-file",
      stablePath,
      "--registry",
      registry,
      "--signing-key",
      signingKeyPath,
      "--key-id",
      "unknown-local-key",
    ]);

    expect(result.status).toBe(1);
    expect(result.stdout).toContain(
      "Signing key id is not trusted by registry trust root: unknown-local-key",
    );
    expect(existsSync(capsuleEvidenceDir)).toBe(false);
    expect(readFileSync(registryEvidencePath, "utf8")).toBe(originalEvidence);
    expect(readFileSync(manifestPath, "utf8")).toBe(originalManifest);
    expect(readFileSync(indexPath, "utf8")).toBe(originalIndex);
  });

  it("does not overwrite existing capsule evidence files with different content", () => {
    const registry = join(scratch, "registry");
    const artifactPath = join(scratch, "reports", "button-artifact.json");
    const proposedPath = join(scratch, "reports", "button.evidence.proposed.json");
    const manualPath = join(scratch, "reports", "button-manual-review.json");
    const reviewedPath = join(scratch, "reports", "button.evidence.reviewed.json");
    const stablePath = join(scratch, "reports", "button.evidence.stable.json");
    const fixturePath = join(registry, "components", "button", "0.0.1", "button.html");
    const capsuleEvidencePath = join(
      registry,
      "components",
      "button",
      "0.0.1",
      "evidence",
      "manual",
      "button-screen-reader-review.json",
    );
    const registryEvidencePath = join(
      registry,
      "components",
      "button",
      "0.0.1",
      "button.evidence.json",
    );
    const manifestPath = join(registry, "components", "button", "0.0.1", "button.capsule.json");
    const indexPath = join(registry, "index.json");

    cpSync(join(repoRoot, "registry"), registry, { recursive: true });
    const { keyId, signingKeyPath } = writeLocalSigningKey(registry);

    expect(
      runCli([
        "evidence",
        "collect",
        "button",
        "--fixture",
        fixturePath,
        "--output",
        artifactPath,
        "--registry",
        registry,
      ]).status,
    ).toBe(0);
    expect(
      runCli([
        "evidence",
        "apply",
        "button",
        "--artifact",
        artifactPath,
        "--output",
        proposedPath,
        "--registry",
        registry,
      ]).status,
    ).toBe(0);
    writePassingManualReview(manualPath);
    writeManualEvidenceFiles();
    expect(
      runCli([
        "evidence",
        "review",
        "button",
        "--evidence-file",
        proposedPath,
        "--manual-file",
        manualPath,
        "--output",
        reviewedPath,
        "--registry",
        registry,
      ]).status,
    ).toBe(0);
    expect(
      runCli([
        "evidence",
        "graduate",
        "button",
        "--evidence-file",
        reviewedPath,
        "--output",
        stablePath,
        "--registry",
        registry,
      ]).status,
    ).toBe(0);
    expect(
      runCli([
        "evidence",
        "publish",
        "button",
        "--evidence-file",
        stablePath,
        "--registry",
        registry,
        "--signing-key",
        signingKeyPath,
        "--key-id",
        keyId,
      ]).status,
    ).toBe(0);

    const originalEvidence = readFileSync(registryEvidencePath, "utf8");
    const originalManifest = readFileSync(manifestPath, "utf8");
    const originalIndex = readFileSync(indexPath, "utf8");
    const originalCapsuleEvidence = readFileSync(capsuleEvidencePath, "utf8");
    writeFileSync(
      join(scratch, "manual", "button-screen-reader-review.json"),
      `${JSON.stringify(
        {
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
              action: "Move to the button with NVDA browse mode and activate it.",
              expected: "NVDA announces the button name and role before activation.",
              observed: "A different transcript should not silently replace the published file.",
              result: "pass",
            },
          ],
          result: "pass",
          summary: "Different screen-reader transcript content.",
          knownLimitations: [],
        },
        null,
        2,
      )}\n`,
    );

    const result = runCli([
      "evidence",
      "publish",
      "button",
      "--evidence-file",
      stablePath,
      "--registry",
      registry,
      "--signing-key",
      signingKeyPath,
      "--key-id",
      keyId,
    ]);

    expect(result.status).toBe(1);
    expect(result.stdout).toContain(
      "Evidence reference target already exists with different content: evidence/manual/button-screen-reader-review.json",
    );
    expect(readFileSync(capsuleEvidencePath, "utf8")).toBe(originalCapsuleEvidence);
    expect(readFileSync(registryEvidencePath, "utf8")).toBe(originalEvidence);
    expect(readFileSync(manifestPath, "utf8")).toBe(originalManifest);
    expect(readFileSync(indexPath, "utf8")).toBe(originalIndex);
  });

  it("does not graduate when local evidence references are missing", () => {
    const artifactPath = join(scratch, "reports", "button-artifact.json");
    const proposedPath = join(scratch, "reports", "button.evidence.proposed.json");
    const manualPath = join(scratch, "reports", "button-manual-review.json");
    const reviewedPath = join(scratch, "reports", "button.evidence.reviewed.json");
    const stablePath = join(scratch, "reports", "button.evidence.stable.json");
    const fixturePath = join(repoRoot, "registry", "components", "button", "0.0.1", "button.html");

    expect(
      runCli([
        "evidence",
        "collect",
        "button",
        "--fixture",
        fixturePath,
        "--output",
        artifactPath,
        "--registry",
        join(repoRoot, "registry"),
      ]).status,
    ).toBe(0);
    expect(
      runCli([
        "evidence",
        "apply",
        "button",
        "--artifact",
        artifactPath,
        "--output",
        proposedPath,
        "--registry",
        join(repoRoot, "registry"),
      ]).status,
    ).toBe(0);
    writePassingManualReview(manualPath);
    expect(
      runCli([
        "evidence",
        "review",
        "button",
        "--evidence-file",
        proposedPath,
        "--manual-file",
        manualPath,
        "--output",
        reviewedPath,
        "--registry",
        join(repoRoot, "registry"),
      ]).status,
    ).toBe(0);

    const result = runCli([
      "evidence",
      "graduate",
      "button",
      "--evidence-file",
      reviewedPath,
      "--output",
      stablePath,
      "--registry",
      join(repoRoot, "registry"),
    ]);

    expect(result.status).toBe(1);
    expect(result.stdout).toContain("evidence/stable-evidence-references");
    expect(result.stdout).toContain("manual/button-screen-reader-review.md");
  });

  it("does not graduate when a local manual transcript reference is not schema-backed", () => {
    const artifactPath = join(scratch, "reports", "button-artifact.json");
    const proposedPath = join(scratch, "reports", "button.evidence.proposed.json");
    const manualPath = join(scratch, "reports", "button-manual-review.json");
    const reviewedPath = join(scratch, "reports", "button.evidence.reviewed.json");
    const stablePath = join(scratch, "reports", "button.evidence.stable.json");
    const fixturePath = join(repoRoot, "registry", "components", "button", "0.0.1", "button.html");

    expect(
      runCli([
        "evidence",
        "collect",
        "button",
        "--fixture",
        fixturePath,
        "--output",
        artifactPath,
        "--registry",
        join(repoRoot, "registry"),
      ]).status,
    ).toBe(0);
    expect(
      runCli([
        "evidence",
        "apply",
        "button",
        "--artifact",
        artifactPath,
        "--output",
        proposedPath,
        "--registry",
        join(repoRoot, "registry"),
      ]).status,
    ).toBe(0);
    writePassingManualReview(manualPath);
    writeManualEvidenceFiles();
    writeFileSync(
      join(scratch, "manual", "button-screen-reader-review.json"),
      '{"component":"button","version":"0.0.1","transcriptType":"screen-reader"}\n',
    );
    expect(
      runCli([
        "evidence",
        "review",
        "button",
        "--evidence-file",
        proposedPath,
        "--manual-file",
        manualPath,
        "--output",
        reviewedPath,
        "--registry",
        join(repoRoot, "registry"),
      ]).status,
    ).toBe(0);

    const result = runCli([
      "evidence",
      "graduate",
      "button",
      "--evidence-file",
      reviewedPath,
      "--output",
      stablePath,
      "--registry",
      join(repoRoot, "registry"),
    ]);

    expect(result.status).toBe(1);
    expect(result.stdout).toContain("evidence/stable-manual-transcript-schema");
    expect(result.stdout).toContain("manual-transcript.schema.json");
  });

  it("fails stable evidence checks when local evidence references are missing", () => {
    const artifactPath = join(scratch, "reports", "button-artifact.json");
    const proposedPath = join(scratch, "reports", "button.evidence.proposed.json");
    const manualPath = join(scratch, "reports", "button-manual-review.json");
    const reviewedPath = join(scratch, "reports", "button.evidence.reviewed.json");
    const stablePath = join(scratch, "reports", "button.evidence.stable.json");
    const fixturePath = join(repoRoot, "registry", "components", "button", "0.0.1", "button.html");

    expect(
      runCli([
        "evidence",
        "collect",
        "button",
        "--fixture",
        fixturePath,
        "--output",
        artifactPath,
        "--registry",
        join(repoRoot, "registry"),
      ]).status,
    ).toBe(0);
    expect(
      runCli([
        "evidence",
        "apply",
        "button",
        "--artifact",
        artifactPath,
        "--output",
        proposedPath,
        "--registry",
        join(repoRoot, "registry"),
      ]).status,
    ).toBe(0);
    writePassingManualReview(manualPath);
    expect(
      runCli([
        "evidence",
        "review",
        "button",
        "--evidence-file",
        proposedPath,
        "--manual-file",
        manualPath,
        "--output",
        reviewedPath,
        "--registry",
        join(repoRoot, "registry"),
      ]).status,
    ).toBe(0);

    const stableEvidence = JSON.parse(readFileSync(reviewedPath, "utf8")) as {
      accessibilityStatus: string;
      stability: string;
    };
    stableEvidence.stability = "stable";
    stableEvidence.accessibilityStatus = "stable-evidence";
    writeFileSync(stablePath, `${JSON.stringify(stableEvidence, null, 2)}\n`);

    const result = runCli([
      "evidence",
      "button",
      "--check",
      "--evidence-file",
      stablePath,
      "--registry",
      join(repoRoot, "registry"),
    ]);

    expect(result.status).toBe(1);
    expect(result.stdout).toContain("evidence/stable-evidence-references");
    expect(result.stdout).toContain("manual/button-screen-reader-review.md");
  });

  it("does not graduate keyboard-only manual evidence as screen-reader evidence", () => {
    const artifactPath = join(scratch, "reports", "button-artifact.json");
    const proposedPath = join(scratch, "reports", "button.evidence.proposed.json");
    const manualPath = join(scratch, "reports", "button-keyboard-only-review.json");
    const reviewedPath = join(scratch, "reports", "button.evidence.reviewed.json");
    const stablePath = join(scratch, "reports", "button.evidence.stable.json");
    const fixturePath = join(repoRoot, "registry", "components", "button", "0.0.1", "button.html");

    expect(
      runCli([
        "evidence",
        "collect",
        "button",
        "--fixture",
        fixturePath,
        "--output",
        artifactPath,
        "--registry",
        join(repoRoot, "registry"),
      ]).status,
    ).toBe(0);
    expect(
      runCli([
        "evidence",
        "apply",
        "button",
        "--artifact",
        artifactPath,
        "--output",
        proposedPath,
        "--registry",
        join(repoRoot, "registry"),
      ]).status,
    ).toBe(0);
    writeKeyboardOnlyManualReview(manualPath);
    writeManualEvidenceFiles();
    expect(
      runCli([
        "evidence",
        "review",
        "button",
        "--evidence-file",
        proposedPath,
        "--manual-file",
        manualPath,
        "--output",
        reviewedPath,
        "--registry",
        join(repoRoot, "registry"),
      ]).status,
    ).toBe(0);

    const result = runCli([
      "evidence",
      "graduate",
      "button",
      "--evidence-file",
      reviewedPath,
      "--output",
      stablePath,
      "--registry",
      join(repoRoot, "registry"),
    ]);

    expect(result.status).toBe(1);
    expect(result.stdout).toContain("evidence/stable-manual-tests");
    expect(result.stdout).toContain(
      "Stable evidence requires at least one passing manual screen-reader test with an evidence reference",
    );
  });

  it("does not graduate screen-reader-only manual evidence as keyboard evidence", () => {
    const artifactPath = join(scratch, "reports", "button-artifact.json");
    const proposedPath = join(scratch, "reports", "button.evidence.proposed.json");
    const manualPath = join(scratch, "reports", "button-screen-reader-only-review.json");
    const reviewedPath = join(scratch, "reports", "button.evidence.reviewed.json");
    const stablePath = join(scratch, "reports", "button.evidence.stable.json");
    const fixturePath = join(repoRoot, "registry", "components", "button", "0.0.1", "button.html");

    expect(
      runCli([
        "evidence",
        "collect",
        "button",
        "--fixture",
        fixturePath,
        "--output",
        artifactPath,
        "--registry",
        join(repoRoot, "registry"),
      ]).status,
    ).toBe(0);
    expect(
      runCli([
        "evidence",
        "apply",
        "button",
        "--artifact",
        artifactPath,
        "--output",
        proposedPath,
        "--registry",
        join(repoRoot, "registry"),
      ]).status,
    ).toBe(0);
    writeScreenReaderOnlyManualReview(manualPath);
    writeManualEvidenceFiles();
    expect(
      runCli([
        "evidence",
        "review",
        "button",
        "--evidence-file",
        proposedPath,
        "--manual-file",
        manualPath,
        "--output",
        reviewedPath,
        "--registry",
        join(repoRoot, "registry"),
      ]).status,
    ).toBe(0);

    const result = runCli([
      "evidence",
      "graduate",
      "button",
      "--evidence-file",
      reviewedPath,
      "--output",
      stablePath,
      "--registry",
      join(repoRoot, "registry"),
    ]);

    expect(result.status).toBe(1);
    expect(result.stdout).toContain("evidence/stable-keyboard-tests");
    expect(result.stdout).toContain(
      "Stable evidence requires at least one passing manual keyboard test with an evidence reference",
    );
  });

  it("does not graduate screen-reader evidence without a transcript reference", () => {
    const artifactPath = join(scratch, "reports", "button-artifact.json");
    const proposedPath = join(scratch, "reports", "button.evidence.proposed.json");
    const manualPath = join(scratch, "reports", "button-nvda-without-evidence.json");
    const reviewedPath = join(scratch, "reports", "button.evidence.reviewed.json");
    const stablePath = join(scratch, "reports", "button.evidence.stable.json");
    const fixturePath = join(repoRoot, "registry", "components", "button", "0.0.1", "button.html");

    expect(
      runCli([
        "evidence",
        "collect",
        "button",
        "--fixture",
        fixturePath,
        "--output",
        artifactPath,
        "--registry",
        join(repoRoot, "registry"),
      ]).status,
    ).toBe(0);
    expect(
      runCli([
        "evidence",
        "apply",
        "button",
        "--artifact",
        artifactPath,
        "--output",
        proposedPath,
        "--registry",
        join(repoRoot, "registry"),
      ]).status,
    ).toBe(0);
    writeScreenReaderReviewWithoutEvidence(manualPath);
    expect(
      runCli([
        "evidence",
        "review",
        "button",
        "--evidence-file",
        proposedPath,
        "--manual-file",
        manualPath,
        "--output",
        reviewedPath,
        "--registry",
        join(repoRoot, "registry"),
      ]).status,
    ).toBe(0);

    const result = runCli([
      "evidence",
      "graduate",
      "button",
      "--evidence-file",
      reviewedPath,
      "--output",
      stablePath,
      "--registry",
      join(repoRoot, "registry"),
    ]);

    expect(result.status).toBe(1);
    expect(result.stdout).toContain("evidence/stable-manual-tests");
    expect(result.stdout).toContain(
      "Stable evidence requires at least one passing manual screen-reader test with an evidence reference",
    );
  });

  it("does not graduate evidence with TODO placeholders marked as pass", () => {
    const artifactPath = join(scratch, "reports", "button-artifact.json");
    const proposedPath = join(scratch, "reports", "button.evidence.proposed.json");
    const manualPath = join(scratch, "reports", "button-placeholder-review.json");
    const reviewedPath = join(scratch, "reports", "button.evidence.reviewed.json");
    const stablePath = join(scratch, "reports", "button.evidence.stable.json");
    const fixturePath = join(repoRoot, "registry", "components", "button", "0.0.1", "button.html");

    expect(
      runCli([
        "evidence",
        "collect",
        "button",
        "--fixture",
        fixturePath,
        "--output",
        artifactPath,
        "--registry",
        join(repoRoot, "registry"),
      ]).status,
    ).toBe(0);
    expect(
      runCli([
        "evidence",
        "apply",
        "button",
        "--artifact",
        artifactPath,
        "--output",
        proposedPath,
        "--registry",
        join(repoRoot, "registry"),
      ]).status,
    ).toBe(0);
    writePassingManualReviewWithPlaceholderEvidence(manualPath);
    expect(
      runCli([
        "evidence",
        "review",
        "button",
        "--evidence-file",
        proposedPath,
        "--manual-file",
        manualPath,
        "--output",
        reviewedPath,
        "--registry",
        join(repoRoot, "registry"),
      ]).status,
    ).toBe(0);

    const result = runCli([
      "evidence",
      "graduate",
      "button",
      "--evidence-file",
      reviewedPath,
      "--output",
      stablePath,
      "--registry",
      join(repoRoot, "registry"),
    ]);

    expect(result.status).toBe(1);
    expect(result.stdout).toContain("evidence/stable-wcag-status");
    expect(result.stdout).toContain("evidence/stable-baseline-tests");
    expect(result.stdout).toContain("evidence/stable-manual-tests");
    expect(result.stdout).toContain("actionable evidence reference");
  });

  it("fails when a component claims stable evidence without a complete evidence packet", () => {
    const registry = join(scratch, "registry");
    cpSync(join(repoRoot, "registry"), registry, { recursive: true });
    const evidencePath = join(registry, "components", "button", "0.0.1", "button.evidence.json");
    const evidence = JSON.parse(readFileSync(evidencePath, "utf8")) as {
      accessibilityStatus: string;
      stability: string;
    };
    evidence.stability = "stable";
    evidence.accessibilityStatus = "stable-evidence";
    writeFileSync(evidencePath, `${JSON.stringify(evidence, null, 2)}\n`);

    const result = runCli(["evidence", "--check", "--registry", registry]);

    expect(result.status).toBe(1);
    expect(result.stdout).toContain("ERROR button@0.0.1 evidence/stable-wcag-status");
    expect(result.stdout).toContain("ERROR button@0.0.1 evidence/stable-manual-tests");
    expect(result.stdout).toContain("ERROR button@0.0.1 evidence/stable-automated-results");
  });
});
