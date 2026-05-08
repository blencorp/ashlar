import { spawnSync } from "node:child_process";
import { generateKeyPairSync } from "node:crypto";
import {
  cpSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  symlinkSync,
  unlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { buildCapsuleManifest, signCapsuleManifest, type CapsuleManifest } from "../lib/capsule.js";

const here = fileURLToPath(new URL(".", import.meta.url));
const cliEntry = join(here, "..", "..", "dist", "index.js");
const repoRoot = resolve(here, "..", "..", "..", "..");
const sourceButton = join(repoRoot, "registry", "components", "button", "0.0.1");
const sourceExampleShared = join(repoRoot, "examples", "shared");
const sourceViteExample = join(repoRoot, "examples", "vite");
const registrySigningKeyId = "ashlar-update-survival-test-key";
const registrySigningKey = generateKeyPairSync("ed25519");
const registrySigningPrivateKey = registrySigningKey.privateKey.export({
  format: "pem",
  type: "pkcs8",
});

type UpdateReport = {
  totals: {
    codemodReplacements: number;
    conflicts: number;
    conflictRate: number;
    files: number;
    merged: number;
  };
  updates: Array<{
    codemods: { replacements: number };
    files: { added: number; conflicts: number; merged: number; replaced: number };
    status: "current" | "updated" | "conflicted";
  }>;
};

type Fixture = {
  cssPath: string;
  htmlPath: string;
  registry: string;
  root: string;
  runCli: (args: string[]) => { status: number; stdout: string };
};

type Scenario = {
  assert: (fixture: Fixture, report: UpdateReport) => void;
  editLocal?: (fixture: Fixture) => void;
  name: string;
  publish: (fixture: Fixture) => void;
  status: number;
};

function writeJson(path: string, value: unknown): void {
  writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`);
}

function writeTrustRoot(registry: string): void {
  writeJson(join(registry, "trust-root.json"), {
    $schema: "https://ashlar.dev/schemas/trust-root.schema.json",
    schemaVersion: "1.0",
    keys: [
      {
        keyId: registrySigningKeyId,
        algorithm: "ed25519",
        publicKey: registrySigningKey.publicKey
          .export({ format: "der", type: "spki" })
          .toString("base64"),
      },
    ],
  });
}

function signManifest(manifest: CapsuleManifest): CapsuleManifest {
  return signCapsuleManifest({
    manifest,
    keyId: registrySigningKeyId,
    privateKey: registrySigningPrivateKey,
  });
}

function writeSignedManifest(
  directory: string,
  component: string,
  manifest: CapsuleManifest,
): void {
  writeJson(join(directory, `${component}.capsule.json`), signManifest(manifest));
}

function seedRegistry(root: string): string {
  const registry = join(root, "registry");
  const buttonV1 = join(registry, "components", "button", "0.0.1");
  cpSync(sourceButton, buttonV1, { recursive: true });
  writeTrustRoot(registry);
  const manifest = JSON.parse(
    readFileSync(join(buttonV1, "button.capsule.json"), "utf8"),
  ) as CapsuleManifest;
  writeSignedManifest(buttonV1, "button", manifest);

  writeJson(join(registry, "index.json"), {
    $schema: "https://ashlar.dev/schemas/registry-index.schema.json",
    schemaVersion: "1.0",
    registry: "./registry",
    name: "ashlar-update-survival-test",
    version: "0.0.1",
    components: {
      button: {
        latest: "0.0.1",
        versions: ["0.0.1"],
        capsuleHashes: { "0.0.1": manifest.capsule_hash },
        tier: "primitive",
        layer: "markup-primitives",
        stability: "experimental",
        description: "Accessible semantic action control for forms and workflows.",
      },
    },
  });

  return registry;
}

function createFixture(): Fixture {
  const root = mkdtempSync(join(tmpdir(), "ashlar-update-survival-"));
  const registry = seedRegistry(root);

  const fixture: Fixture = {
    cssPath: join(root, "src", "ashlar", "components", "button", "button.css"),
    htmlPath: join(root, "src", "ashlar", "components", "button", "button.html"),
    registry,
    root,
    runCli: (args: string[]) => {
      const result = spawnSync(process.execPath, [cliEntry, ...args], {
        cwd: root,
        encoding: "utf8",
        stdio: ["ignore", "pipe", "pipe"],
      });

      return {
        status: result.status ?? 1,
        stdout: `${result.stdout ?? ""}${result.stderr ?? ""}`,
      };
    },
  };

  expect(fixture.runCli(["init", "--registry", registry]).status).toBe(0);
  expect(fixture.runCli(["add", "button"]).status).toBe(0);
  return fixture;
}

function publishButtonVersion(
  fixture: Fixture,
  input: {
    codemod?: {
      pattern: string;
      rewrite: string;
    };
    cssTransform?: (css: string) => string;
    htmlTransform?: (html: string) => string;
    previousVersion: string;
    version: string;
    versions: string[];
  },
): void {
  const directory = join(fixture.registry, "components", "button", input.version);
  cpSync(sourceButton, directory, { recursive: true });

  if (input.cssTransform) {
    const path = join(directory, "button.css");
    writeFileSync(path, input.cssTransform(readFileSync(path, "utf8")));
  }
  if (input.htmlTransform) {
    const path = join(directory, "button.html");
    writeFileSync(path, input.htmlTransform(readFileSync(path, "utf8")));
  }
  if (input.codemod) {
    writeJson(join(directory, "button.codemods.json"), {
      schemaVersion: "1.0",
      component: "button",
      from: input.previousVersion,
      to: input.version,
      rules: [
        {
          id: `button-survival-${input.version.replaceAll(".", "-")}`,
          target: "button.css",
          language: "css",
          pattern: input.codemod.pattern,
          rewrite: input.codemod.rewrite,
        },
      ],
    });
  }

  for (const file of ["button.cem.json", "button.evidence.json"]) {
    const path = join(directory, file);
    writeFileSync(path, readFileSync(path, "utf8").replaceAll("0.0.1", input.version));
  }

  const manifest = buildCapsuleManifest({
    directory,
    name: "button",
    version: input.version,
    layer: "markup-primitives",
    stability: "experimental",
    ...(input.codemod ? { codemods: ["button.codemods.json"] } : {}),
  });
  writeSignedManifest(directory, "button", manifest);

  const indexPath = join(fixture.registry, "index.json");
  const index = JSON.parse(readFileSync(indexPath, "utf8")) as {
    components: {
      button: { latest: string; versions: string[]; capsuleHashes: Record<string, string> };
    };
  };
  index.components.button.latest = input.version;
  index.components.button.versions = input.versions;
  index.components.button.capsuleHashes[input.version] = manifest.capsule_hash;
  writeJson(indexPath, index);
}

function publishButtonV2(
  fixture: Fixture,
  input: {
    codemod?: { pattern: string; rewrite: string };
    cssTransform?: (css: string) => string;
    htmlTransform?: (html: string) => string;
  },
): void {
  publishButtonVersion(fixture, {
    previousVersion: "0.0.1",
    version: "0.0.2",
    versions: ["0.0.1", "0.0.2"],
    ...input,
  });
}

function updateWithReport(fixture: Fixture): {
  report: UpdateReport;
  status: number;
  stdout: string;
} {
  const result = fixture.runCli([
    "update",
    "button",
    "--yes",
    "--survival-report",
    "update-survival.json",
  ]);
  const report = JSON.parse(
    readFileSync(join(fixture.root, "update-survival.json"), "utf8"),
  ) as UpdateReport;

  return { ...result, report };
}

const scenarios: Scenario[] = [
  {
    name: "clean CSS replacement",
    publish: (fixture) =>
      publishButtonV2(fixture, {
        cssTransform: (css) => css.replace("font-weight: 700;", "font-weight: 800;"),
      }),
    status: 0,
    assert: (fixture, report) => {
      expect(report.totals.conflicts).toBe(0);
      expect(report.updates[0]?.files.replaced).toBeGreaterThan(0);
      expect(readFileSync(fixture.cssPath, "utf8")).toContain("font-weight: 800;");
    },
  },
  {
    name: "non-overlapping CSS merge",
    editLocal: (fixture) => {
      writeFileSync(
        fixture.cssPath,
        readFileSync(fixture.cssPath, "utf8").replace("font-weight: 700;", "font-weight: 800;"),
      );
    },
    publish: (fixture) =>
      publishButtonV2(fixture, {
        cssTransform: (css) =>
          css.replace(
            "background: var(--ashlar-color-action-primary-hover, #1a4480);",
            "background: var(--ashlar-color-action-primary-hover, #005ea8);",
          ),
      }),
    status: 0,
    assert: (fixture, report) => {
      const css = readFileSync(fixture.cssPath, "utf8");
      expect(report.updates[0]?.files.merged).toBeGreaterThan(0);
      expect(css).toContain("font-weight: 800;");
      expect(css).toContain("background: var(--ashlar-color-action-primary-hover, #005ea8);");
    },
  },
  {
    name: "same-line CSS conflict",
    editLocal: (fixture) => {
      writeFileSync(
        fixture.cssPath,
        readFileSync(fixture.cssPath, "utf8").replace("font-weight: 700;", "font-weight: 800;"),
      );
    },
    publish: (fixture) =>
      publishButtonV2(fixture, {
        cssTransform: (css) => css.replace("font-weight: 700;", "font-weight: 600;"),
      }),
    status: 1,
    assert: (fixture, report) => {
      expect(report.updates[0]?.status).toBe("conflicted");
      expect(report.totals.conflicts).toBe(1);
      expect(readFileSync(fixture.cssPath, "utf8")).toContain("<<<<<<<");
    },
  },
  {
    name: "local HTML text survives CSS update",
    editLocal: (fixture) => {
      writeFileSync(
        fixture.htmlPath,
        readFileSync(fixture.htmlPath, "utf8").replace("Apply", "Continue"),
      );
    },
    publish: (fixture) =>
      publishButtonV2(fixture, {
        cssTransform: (css) => css.replace("font-weight: 700;", "font-weight: 800;"),
      }),
    status: 0,
    assert: (fixture, report) => {
      expect(report.updates[0]?.files.merged).toBeGreaterThan(0);
      expect(readFileSync(fixture.htmlPath, "utf8")).toContain("Continue");
      expect(readFileSync(fixture.cssPath, "utf8")).toContain("font-weight: 800;");
    },
  },
  {
    name: "missing local CSS copies upstream",
    editLocal: (fixture) => {
      unlinkSync(fixture.cssPath);
    },
    publish: (fixture) =>
      publishButtonV2(fixture, {
        cssTransform: (css) => css.replace("font-weight: 700;", "font-weight: 800;"),
      }),
    status: 0,
    assert: (fixture, report) => {
      expect(report.updates[0]?.files.added).toBeGreaterThan(0);
      expect(readFileSync(fixture.cssPath, "utf8")).toContain("font-weight: 800;");
    },
  },
  {
    name: "codemod rewrites local token customization",
    editLocal: (fixture) => {
      writeFileSync(
        fixture.cssPath,
        `${readFileSync(fixture.cssPath, "utf8")}\n.local-action { color: var(--ashlar-color-action-primary-bg); }\n`,
      );
    },
    publish: (fixture) =>
      publishButtonV2(fixture, {
        cssTransform: (css) =>
          css.replaceAll(
            "--ashlar-color-action-primary-bg",
            "--ashlar-color-action-primary-surface",
          ),
        codemod: {
          pattern: "color: var(--ashlar-color-action-primary-bg);",
          rewrite: "color: var(--ashlar-color-action-primary-surface);",
        },
      }),
    status: 0,
    assert: (fixture, report) => {
      const css = readFileSync(fixture.cssPath, "utf8");
      expect(report.totals.codemodReplacements).toBe(1);
      expect(css).toContain(".local-action { color: var(--ashlar-color-action-primary-surface); }");
      expect(css).not.toContain(".local-action { color: var(--ashlar-color-action-primary-bg); }");
    },
  },
  {
    name: "skipped-version codemod chain",
    editLocal: (fixture) => {
      writeFileSync(
        fixture.cssPath,
        `${readFileSync(fixture.cssPath, "utf8")}\n.local-action { color: var(--ashlar-color-action-primary-bg); }\n`,
      );
    },
    publish: (fixture) => {
      publishButtonVersion(fixture, {
        previousVersion: "0.0.1",
        version: "0.0.2",
        versions: ["0.0.1", "0.0.2"],
        cssTransform: (css) =>
          css.replaceAll(
            "--ashlar-color-action-primary-bg",
            "--ashlar-color-action-primary-surface",
          ),
        codemod: {
          pattern: "color: var(--ashlar-color-action-primary-bg);",
          rewrite: "color: var(--ashlar-color-action-primary-surface);",
        },
      });
      publishButtonVersion(fixture, {
        previousVersion: "0.0.2",
        version: "0.0.3",
        versions: ["0.0.1", "0.0.2", "0.0.3"],
        cssTransform: (css) =>
          css.replaceAll("--ashlar-color-action-primary-bg", "--ashlar-color-action-primary-fill"),
        codemod: {
          pattern: "color: var(--ashlar-color-action-primary-surface);",
          rewrite: "color: var(--ashlar-color-action-primary-fill);",
        },
      });
    },
    status: 0,
    assert: (fixture, report) => {
      const css = readFileSync(fixture.cssPath, "utf8");
      expect(report.totals.codemodReplacements).toBe(2);
      expect(css).toContain(".local-action { color: var(--ashlar-color-action-primary-fill); }");
      expect(css).not.toContain(".local-action { color: var(--ashlar-color-action-primary-bg); }");
      expect(css).not.toContain(
        ".local-action { color: var(--ashlar-color-action-primary-surface); }",
      );
    },
  },
  {
    name: "forced-colors local edit survives hover update",
    editLocal: (fixture) => {
      writeFileSync(
        fixture.cssPath,
        readFileSync(fixture.cssPath, "utf8").replace(
          "border-color: ButtonText;",
          "border-color: CanvasText;",
        ),
      );
    },
    publish: (fixture) =>
      publishButtonV2(fixture, {
        cssTransform: (css) =>
          css.replace(
            "background: var(--ashlar-color-action-primary-hover, #1a4480);",
            "background: var(--ashlar-color-action-primary-hover, #005ea8);",
          ),
      }),
    status: 0,
    assert: (fixture, report) => {
      const css = readFileSync(fixture.cssPath, "utf8");
      expect(report.updates[0]?.files.merged).toBeGreaterThan(0);
      expect(css).toContain("border-color: CanvasText;");
      expect(css).toContain("background: var(--ashlar-color-action-primary-hover, #005ea8);");
    },
  },
  {
    name: "local HTML annotation merges with upstream text",
    editLocal: (fixture) => {
      writeFileSync(
        fixture.htmlPath,
        `${readFileSync(fixture.htmlPath, "utf8")}\n<!-- local analytics hook -->\n`,
      );
    },
    publish: (fixture) =>
      publishButtonV2(fixture, {
        htmlTransform: (html) => html.replace("Apply", "Submit"),
      }),
    status: 0,
    assert: (fixture, report) => {
      const html = readFileSync(fixture.htmlPath, "utf8");
      expect(report.updates[0]?.files.merged).toBeGreaterThan(0);
      expect(html).toContain("<!-- local analytics hook -->");
      expect(html).toContain("Submit");
    },
  },
  {
    name: "parallel HTML text conflict",
    editLocal: (fixture) => {
      writeFileSync(
        fixture.htmlPath,
        readFileSync(fixture.htmlPath, "utf8").replace("Apply", "Save"),
      );
    },
    publish: (fixture) =>
      publishButtonV2(fixture, {
        htmlTransform: (html) => html.replace("Apply", "Submit"),
      }),
    status: 1,
    assert: (fixture, report) => {
      expect(report.totals.conflicts).toBe(1);
      expect(readFileSync(fixture.htmlPath, "utf8")).toContain("<<<<<<<");
    },
  },
  {
    name: "local trailing CSS rule survives upstream property update",
    editLocal: (fixture) => {
      writeFileSync(
        fixture.cssPath,
        `${readFileSync(fixture.cssPath, "utf8")}\n.agency-button { letter-spacing: 0.01em; }\n`,
      );
    },
    publish: (fixture) =>
      publishButtonV2(fixture, {
        cssTransform: (css) => css.replace("transform 150ms ease;", "transform 200ms ease;"),
      }),
    status: 0,
    assert: (fixture, report) => {
      const css = readFileSync(fixture.cssPath, "utf8");
      expect(report.updates[0]?.files.merged).toBeGreaterThan(0);
      expect(css).toContain("transform 200ms ease;");
      expect(css).toContain(".agency-button { letter-spacing: 0.01em; }");
    },
  },
];

describe("update survival harness", () => {
  it("measures conflict rate and samples merge correctness across 11 scenarios", () => {
    const reports: UpdateReport[] = [];
    let correctnessSamples = 0;

    for (const scenario of scenarios) {
      const fixture = createFixture();
      try {
        scenario.editLocal?.(fixture);
        scenario.publish(fixture);

        const result = updateWithReport(fixture);

        expect(result.status, scenario.name).toBe(scenario.status);
        expect(result.report.updates, scenario.name).toHaveLength(1);
        scenario.assert(fixture, result.report);
        reports.push(result.report);
        correctnessSamples += 1;
      } finally {
        rmSync(fixture.root, { recursive: true, force: true });
      }
    }

    const files = reports.reduce((total, report) => total + report.totals.files, 0);
    const conflicts = reports.reduce((total, report) => total + report.totals.conflicts, 0);
    const conflictRate = conflicts / files;

    expect(scenarios).toHaveLength(11);
    expect(correctnessSamples).toBe(11);
    expect(files).toBeGreaterThanOrEqual(44);
    expect(conflicts).toBe(2);
    expect(conflictRate).toBeLessThan(0.05);
  }, 20_000);

  it("updates a copied Vite consumer and preserves a production build", () => {
    const root = mkdtempSync(join(tmpdir(), "ashlar-vite-update-survival-"));
    const app = join(root, "app");
    const registry = seedRegistry(root);
    cpSync(sourceViteExample, app, {
      filter: (source) => {
        const segments = relative(sourceViteExample, source).split(/[\\/]+/);
        return !segments.some((segment) => [".turbo", "dist", "node_modules"].includes(segment));
      },
      recursive: true,
    });
    cpSync(sourceExampleShared, join(root, "shared"), { recursive: true });
    symlinkSync(join(sourceViteExample, "node_modules"), join(app, "node_modules"), "dir");
    writeJson(join(app, "ashlar.config.json"), {
      $schema: "https://ashlar.dev/schemas/config.schema.json",
      registry,
      componentsDir: "src/ashlar/components",
      indexesDir: "src/ashlar/indexes",
      styles: {
        entrypoint: "src/ashlar/ashlar.css",
        theme: "src/ashlar/themes/theme.css",
        tailwindTheme: "src/ashlar/themes/tailwind-theme.css",
        tokenTypes: "src/ashlar/themes/tokens.ts",
      },
    });

    const fixture: Fixture = {
      cssPath: join(app, "src", "ashlar", "components", "button", "button.css"),
      htmlPath: join(app, "src", "ashlar", "components", "button", "button.html"),
      registry,
      root: app,
      runCli: (args: string[]) => {
        const result = spawnSync(process.execPath, [cliEntry, ...args], {
          cwd: app,
          encoding: "utf8",
          stdio: ["ignore", "pipe", "pipe"],
        });

        return {
          status: result.status ?? 1,
          stdout: `${result.stdout ?? ""}${result.stderr ?? ""}`,
        };
      },
    };

    try {
      writeFileSync(
        fixture.cssPath,
        `${readFileSync(fixture.cssPath, "utf8")}\n.vite-local-action { letter-spacing: 0.01em; }\n`,
      );
      publishButtonV2(fixture, {
        cssTransform: (css) => css.replace("transform 150ms ease;", "transform 200ms ease;"),
      });

      const update = updateWithReport(fixture);
      const css = readFileSync(fixture.cssPath, "utf8");
      const build = spawnSync(join(app, "node_modules", ".bin", "vite"), ["build"], {
        cwd: app,
        encoding: "utf8",
        stdio: ["ignore", "pipe", "pipe"],
      });

      expect(update.status).toBe(0);
      expect(update.report.updates[0]?.files.merged).toBeGreaterThan(0);
      expect(update.report.totals.conflictRate).toBe(0);
      expect(css).toContain("transform 200ms ease;");
      expect(css).toContain(".vite-local-action { letter-spacing: 0.01em; }");
      expect(build.status, `${build.stdout}\n${build.stderr}`).toBe(0);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  }, 20_000);
});
