#!/usr/bin/env node
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = fileURLToPath(new URL("..", import.meta.url));

const targets = ["README.md", "STATUS.md", "apps", "docs", "examples", "packages", "registry"];

const ignoredDirectories = new Set([".next", ".turbo", "coverage", "dist", "node_modules"]);

const ignoredFiles = new Set(["pnpm-lock.yaml"]);
const scannableExtensions = new Set([
  ".css",
  ".html",
  ".js",
  ".json",
  ".jsx",
  ".md",
  ".mjs",
  ".svelte",
  ".ts",
  ".tsx",
  ".vue",
]);

const forbidden = [
  {
    label: "numbered family code",
    pattern: /\bL-?[0-9]\b/gi,
  },
  {
    label: "numbered maturity level",
    pattern: /\blevel\s+[0-2]\b/gi,
  },
  {
    label: "numbered maturity tier",
    pattern: /\btier\s+[0-2]\b/gi,
  },
  {
    label: "numbered family wording",
    pattern: /\bnumbered[- ]family\b/gi,
  },
  {
    label: "numbered code wording",
    pattern: /\bnumbered[- ]code\b/gi,
  },
  {
    label: "layer code wording",
    pattern: /\blayer[- ]codes?\b/gi,
  },
  {
    label: "Federal theme name",
    pattern: /\bFederal theme\b/gi,
  },
];

const findings = [];

for (const target of targets) {
  scanPath(join(repoRoot, target));
}

if (findings.length > 0) {
  console.error("Public language check failed:");
  for (const finding of findings) {
    console.error(
      `${finding.file}:${finding.line}:${finding.column} ${finding.label}: ${finding.match}`,
    );
  }
  process.exit(1);
}

console.log("Public language check passed.");

function scanPath(path) {
  const stat = statSync(path, { throwIfNoEntry: false });
  if (!stat) {
    return;
  }

  if (stat.isDirectory()) {
    const name = path.split("/").pop();
    if (ignoredDirectories.has(name)) {
      return;
    }
    for (const entry of readdirSync(path)) {
      scanPath(join(path, entry));
    }
    return;
  }

  const relativePath = relative(repoRoot, path);
  if (ignoredFiles.has(relativePath) || !isScannable(relativePath)) {
    return;
  }

  const source = readFileSync(path, "utf8");
  for (const rule of forbidden) {
    rule.pattern.lastIndex = 0;
    let match;
    while ((match = rule.pattern.exec(source))) {
      const location = locate(source, match.index);
      findings.push({
        column: location.column,
        file: relativePath,
        label: rule.label,
        line: location.line,
        match: match[0],
      });
    }
  }
}

function isScannable(path) {
  const dotIndex = path.lastIndexOf(".");
  return dotIndex >= 0 && scannableExtensions.has(path.slice(dotIndex));
}

function locate(source, index) {
  const prefix = source.slice(0, index);
  const lines = prefix.split("\n");
  return {
    column: lines[lines.length - 1].length + 1,
    line: lines.length,
  };
}
