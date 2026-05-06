import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { buildDesignContext } from "./design-context.js";
import { defaultConfig, type AshlarLockfile } from "./project.js";

const here = fileURLToPath(new URL(".", import.meta.url));
const repoRoot = resolve(here, "..", "..", "..", "..");

describe("buildDesignContext", () => {
  it("includes theme tokens, project paths, and validation rules", () => {
    const context = buildDesignContext(
      defaultConfig({ registry: "./registry" }),
      {
        version: "1",
        registry: "./registry",
        components: {},
      },
      { cwd: repoRoot },
    );

    expect(context).toContain("action-primary: \"#005ea8\"");
    expect(context).toContain("Primary action background: `--ashlar-color-action-primary-bg`");
    expect(context).toContain("Typed tokens: `src/ashlar/themes/tokens.ts`");
    expect(context).toContain("No Ashlar capsules are installed yet.");
    expect(context).toContain("## Component Discovery");
    expect(context).toContain('ashlar suggest "<task>"');
    expect(context).toContain("search_components");
    expect(context).toContain("suggest_for_task");
    expect(context).toContain("ashlar audit --policy all");
    expect(context).toContain("validate_usage");
  });

  it("includes installed capsule metadata and evidence from the registry", () => {
    const lockfile: AshlarLockfile = {
      version: "1",
      registry: "./registry",
      components: {
        "form-field": {
          version: "0.0.1",
          capsule_hash: "sha256:test",
          stability: "experimental",
          files: {},
        },
      },
    };

    const context = buildDesignContext(defaultConfig({ registry: "./registry" }), lockfile, {
      cwd: repoRoot,
    });

    expect(context).toContain("form-field@0.0.1");
    expect(context).toContain("composite, L0, experimental, evidence: not-reviewed");
    expect(context).toContain("Policy mappings:");
    expect(context).toContain("Platform features:");
  });
});
