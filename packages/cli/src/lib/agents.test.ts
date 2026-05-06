import { existsSync, mkdtempSync, readFileSync, readlinkSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { agentInstructionTargets, buildAgentsContext, writeAgentsContext } from "./agents.js";
import { defaultConfig, type AshlarLockfile } from "./project.js";

describe("buildAgentsContext", () => {
  it("lists installed capsules and validation commands", () => {
    const config = defaultConfig({ registry: "../../registry" });
    const lockfile: AshlarLockfile = {
      version: "1",
      registry: "../../registry",
      components: {
        button: {
          version: "0.0.1",
          capsule_hash: "sha256:test",
          stability: "experimental",
          files: {},
        },
        "text-input": {
          version: "0.0.1",
          capsule_hash: "sha256:test",
          stability: "experimental",
          files: {},
        },
      },
    };

    const context = buildAgentsContext(config, lockfile);

    expect(context).toContain("button@0.0.1 (experimental)");
    expect(context).toContain("text-input@0.0.1 (experimental)");
    expect(context).toContain("Registry: `../../registry`");
    expect(context).toContain('ashlar suggest "<task>"');
    expect(context).toContain("search_components");
    expect(context).toContain("suggest_for_task");
    expect(context).toContain("ashlar audit --policy all");
    expect(context).toContain("Do not invent props, variants, classes, or behaviors");
  });

  it("is explicit when no capsules are installed", () => {
    const context = buildAgentsContext(defaultConfig(), {
      version: "1",
      registry: "./registry",
      components: {},
    });

    expect(context).toContain("No Ashlar capsules are installed yet.");
  });

  it("syncs editor instruction files to the canonical AGENTS.md", () => {
    const scratch = mkdtempSync(join(tmpdir(), "ashlar-agents-test-"));
    const cwd = process.cwd();

    try {
      process.chdir(scratch);
      const result = writeAgentsContext("AGENTS.md", defaultConfig(), {
        version: "1",
        registry: "./registry",
        components: {},
      });

      expect(result).toHaveLength(agentInstructionTargets.length);
      for (const target of agentInstructionTargets) {
        expect(existsSync(target)).toBe(true);
        expect(readFileSync(target, "utf8")).toContain("Ashlar - Agent Instructions");
      }
      expect(readlinkSync(".cursor/rules/ashlar.mdc")).toBe("../../AGENTS.md");
      expect(readlinkSync(".github/copilot-instructions.md")).toBe("../AGENTS.md");
    } finally {
      process.chdir(cwd);
      rmSync(scratch, { recursive: true, force: true });
    }
  });

  it("does not overwrite existing editor instruction files owned by the project", () => {
    const scratch = mkdtempSync(join(tmpdir(), "ashlar-agents-test-"));
    const cwd = process.cwd();

    try {
      process.chdir(scratch);
      writeFileSync("CLAUDE.md", "# Project-specific Claude notes\n");

      const result = writeAgentsContext("AGENTS.md", defaultConfig(), {
        version: "1",
        registry: "./registry",
        components: {},
      });

      expect(readFileSync("CLAUDE.md", "utf8")).toBe("# Project-specific Claude notes\n");
      expect(result).toContainEqual(
        expect.objectContaining({
          path: "CLAUDE.md",
          status: "skipped",
        }),
      );
      expect(readFileSync(".windsurfrules", "utf8")).toContain("Ashlar - Agent Instructions");
    } finally {
      process.chdir(cwd);
      rmSync(scratch, { recursive: true, force: true });
    }
  });
});
