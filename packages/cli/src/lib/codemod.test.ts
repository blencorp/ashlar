import { mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { applyCapsuleCodemods } from "./codemod.js";
import type { CapsuleManifest } from "./capsule.js";

describe("applyCapsuleCodemods", () => {
  it("requires explicit approval before applying confirm codemods", () => {
    const dir = join(tmpdir(), `ashlar-codemod-${Date.now()}`);
    const registryDirectory = join(dir, "registry");
    const componentsDir = join(dir, "components");
    const buttonDir = join(componentsDir, "button");
    mkdirSync(registryDirectory, { recursive: true });
    mkdirSync(buttonDir, { recursive: true });

    try {
      writeFileSync(join(buttonDir, "button.css"), ".button { color: red; }\n");
      writeFileSync(
        join(registryDirectory, "button.codemods.json"),
        JSON.stringify({
          schemaVersion: "1.0",
          component: "button",
          from: "0.0.1",
          to: "0.0.2",
          rules: [
            {
              id: "risky-color-change",
              target: "button.css",
              language: "css",
              pattern: "color: red;",
              rewrite: "color: blue;",
              confirm: true,
            },
          ],
        }),
      );

      const manifest: CapsuleManifest = {
        schemaVersion: "1.0",
        name: "button",
        version: "0.0.2",
        layer: "markup-primitives",
        stability: "experimental",
        files: {
          "button.css": "sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
          "button.codemods.json":
            "sha256:bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
        },
        codemods: ["button.codemods.json"],
        capsule_hash: "sha256:cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc",
      };

      expect(() =>
        applyCapsuleCodemods({
          component: "button",
          componentsDir,
          fromVersion: "0.0.1",
          manifest,
          registryDirectory,
        }),
      ).toThrow(
        /Ashlar codemod requires review before applying[\s\S]*risky-color-change[\s\S]*button\.css[\s\S]*approveConfirmedRules/,
      );
      expect(readFileSync(join(buttonDir, "button.css"), "utf8")).toBe(".button { color: red; }\n");

      const applied = applyCapsuleCodemods({
        approveConfirmedRules: true,
        component: "button",
        componentsDir,
        fromVersion: "0.0.1",
        manifest,
        registryDirectory,
      });

      expect(applied.replacements).toBe(1);
      expect(readFileSync(join(buttonDir, "button.css"), "utf8")).toBe(
        ".button { color: blue; }\n",
      );
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("rejects malformed codemod files before applying rules", () => {
    const dir = join(tmpdir(), `ashlar-codemod-${Date.now()}`);
    const registryDirectory = join(dir, "registry");
    const componentsDir = join(dir, "components");
    const buttonDir = join(componentsDir, "button");
    mkdirSync(registryDirectory, { recursive: true });
    mkdirSync(buttonDir, { recursive: true });

    try {
      writeFileSync(join(buttonDir, "button.css"), ".button { color: red; }\n");
      writeFileSync(
        join(registryDirectory, "button.codemods.json"),
        JSON.stringify({
          schemaVersion: "1.0",
          component: "button",
          from: "0.0.1",
          to: "0.0.2",
          rules: [
            {
              id: "missing-rewrite",
              target: "button.css",
              language: "css",
              pattern: "color: red;",
            },
          ],
        }),
      );

      const manifest: CapsuleManifest = {
        schemaVersion: "1.0",
        name: "button",
        version: "0.0.2",
        layer: "markup-primitives",
        stability: "experimental",
        files: {
          "button.css": "sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
          "button.codemods.json":
            "sha256:bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
        },
        codemods: ["button.codemods.json"],
        capsule_hash: "sha256:cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc",
      };

      expect(() =>
        applyCapsuleCodemods({
          component: "button",
          componentsDir,
          fromVersion: "0.0.1",
          manifest,
          registryDirectory,
        }),
      ).toThrow(/Invalid Ashlar codemod file/i);
      expect(readFileSync(join(buttonDir, "button.css"), "utf8")).toBe(".button { color: red; }\n");
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("rejects rule targets outside the installed component directory at validation time", () => {
    const dir = join(tmpdir(), `ashlar-codemod-${Date.now()}`);
    const registryDirectory = join(dir, "registry");
    const componentsDir = join(dir, "components");
    const buttonDir = join(componentsDir, "button");
    mkdirSync(registryDirectory, { recursive: true });
    mkdirSync(buttonDir, { recursive: true });

    try {
      writeFileSync(join(componentsDir, "outside.css"), ".outside { color: red; }\n");
      writeFileSync(join(buttonDir, "button.css"), ".button { color: red; }\n");
      writeFileSync(
        join(registryDirectory, "button.codemods.json"),
        JSON.stringify({
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
        }),
      );

      const manifest: CapsuleManifest = {
        schemaVersion: "1.0",
        name: "button",
        version: "0.0.2",
        layer: "markup-primitives",
        stability: "experimental",
        files: {
          "button.css": "sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
          "button.codemods.json":
            "sha256:bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
        },
        codemods: ["button.codemods.json"],
        capsule_hash: "sha256:cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc",
      };

      expect(() =>
        applyCapsuleCodemods({
          component: "button",
          componentsDir,
          fromVersion: "0.0.1",
          manifest,
          registryDirectory,
        }),
      ).toThrow(/Invalid Ashlar codemod file/i);
      expect(readFileSync(join(componentsDir, "outside.css"), "utf8")).toBe(
        ".outside { color: red; }\n",
      );
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
