import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { isAbsolute, relative, resolve } from "node:path";
import { parse } from "@ast-grep/napi";
import { napiLang, type AstGrepLanguage, type NapiConfig } from "./astgrep.js";
import type { CapsuleManifest } from "./capsule.js";
import { describeErrors, validate } from "./schema-validate.js";

type CapsuleCodemod = {
  schemaVersion: "1.0";
  component: string;
  from: string;
  to: string;
  rules: CapsuleCodemodRule[];
};

type CapsuleCodemodRule = {
  id: string;
  target: string;
  language: AstGrepLanguage;
  pattern: string;
  rewrite: string;
  confirm?: boolean;
};

export type CodemodResult = {
  filesChanged: number;
  replacements: number;
  rulesApplied: number;
};

function readCodemod(path: string): CapsuleCodemod {
  const codemod = JSON.parse(readFileSync(path, "utf8")) as unknown;
  const result = validate("codemod", codemod);
  if (!result.ok) {
    throw new Error(`Invalid Ashlar codemod file at ${path}:\n${describeErrors(result)}`);
  }

  return codemod as CapsuleCodemod;
}

function resolveInside(base: string, candidate: string, label: string, rootLabel: string): string {
  const root = resolve(base);
  const target = resolve(root, candidate);
  const rel = relative(root, target);

  if (rel === "" || rel.startsWith("..") || isAbsolute(rel)) {
    throw new Error(`Ashlar codemod ${label} points outside the ${rootLabel}: ${candidate}`);
  }

  return target;
}

function applyRule(source: string, rule: CapsuleCodemodRule): { contents: string; count: number } {
  const root = parse(napiLang(rule.language), source).root();
  const matcher: NapiConfig = { rule: { pattern: rule.pattern } } as NapiConfig;
  const edits = root.findAll(matcher).map((node) => node.replace(rule.rewrite));

  if (edits.length === 0) {
    return { contents: source, count: 0 };
  }

  return {
    contents: root.commitEdits(edits),
    count: edits.length,
  };
}

export function applyCapsuleCodemods(input: {
  approveConfirmedRules?: boolean;
  component: string;
  componentsDir: string;
  fromVersion: string;
  manifest: CapsuleManifest;
  registryDirectory: string;
}): CodemodResult {
  const result: CodemodResult = { filesChanged: 0, replacements: 0, rulesApplied: 0 };

  for (const codemodFile of input.manifest.codemods ?? []) {
    if (!Object.hasOwn(input.manifest.files, codemodFile)) {
      throw new Error(`Ashlar codemod file is not listed in the capsule manifest: ${codemodFile}`);
    }

    const codemod = readCodemod(
      resolveInside(input.registryDirectory, codemodFile, "file reference", "registry directory"),
    );
    if (
      codemod.component !== input.component ||
      codemod.from !== input.fromVersion ||
      codemod.to !== input.manifest.version
    ) {
      continue;
    }

    const confirmedRules = codemod.rules.filter((rule) => rule.confirm);
    if (confirmedRules.length > 0 && !input.approveConfirmedRules) {
      throw new Error(
        [
          `Ashlar codemod requires review before applying ${input.component}: ${codemod.from} -> ${codemod.to}`,
          "",
          "Confirmed rules:",
          ...confirmedRules.map((rule) => `  - ${rule.id} (${rule.target})`),
          "",
          "Re-run only after review with approveConfirmedRules enabled.",
        ].join("\n"),
      );
    }

    for (const rule of codemod.rules) {
      const target = resolveInside(
        resolve(input.componentsDir, input.component),
        rule.target,
        "rule target",
        "component directory",
      );
      if (!Object.hasOwn(input.manifest.files, rule.target)) {
        throw new Error(
          `Ashlar codemod target is not listed in the capsule manifest: ${rule.target}`,
        );
      }
      if (!existsSync(target)) {
        continue;
      }

      const before = readFileSync(target, "utf8");
      const applied = applyRule(before, rule);
      if (applied.count === 0) {
        continue;
      }

      writeFileSync(target, applied.contents);
      result.filesChanged += applied.contents === before ? 0 : 1;
      result.replacements += applied.count;
      result.rulesApplied += 1;
    }
  }

  return result;
}
