# Ashlar v0 Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the first executable slice of Ashlar: public repository readiness, package workspace, CLI skeleton, capsule schema, one L0 Button capsule, validation rule generation, and CI commands.

**Architecture:** Start with a TypeScript monorepo containing `@ashlar/cli`, `@ashlar/schemas`, and a local registry package. The first capsule is Button, installed as source with CSS, HTML, CEM, evidence, and ast-grep rules. Verification is hash-based first; Sigstore/SLSA wiring lands after the local registry flow works.

**Tech Stack:** Node.js 24 LTS (24.15.0 baseline), TypeScript 6, pnpm 10, Turborepo 2, Vitest 4, Playwright, axe-core, ast-grep, DTCG JSON, semantic CSS, GitHub Actions.

**Baseline correction:** This plan was originally drafted before repository initialization. The implemented repository uses the stable tooling baseline in `docs/architecture/tooling-baseline.md`; stale examples in this plan should be interpreted through that baseline.

---

## File Structure

- Create `package.json` for workspace scripts.
- Create `pnpm-workspace.yaml` for package discovery.
- Create `tsconfig.base.json` for shared TypeScript settings.
- Create `packages/cli/` for `ashlar` commands.
- Create `packages/schemas/` for JSON Schemas and TypeScript validators.
- Create `registry/components/button/0.0.1/` for the first capsule.
- Create `examples/plain-html/` for the first integration demo.
- Create `.github/workflows/ashlar.yml` for CI.

## Task 1: Repository Metadata and Workspace

**Files:**
- Create: `package.json`
- Create: `pnpm-workspace.yaml`
- Create: `tsconfig.base.json`
- Create: `.gitignore`

- [ ] **Step 1: Create workspace manifest**

Add `package.json`:

```json
{
  "name": "ashlar",
  "private": true,
  "type": "module",
  "packageManager": "pnpm@10.33.2",
  "scripts": {
    "build": "pnpm -r build",
    "test": "pnpm -r test",
    "lint": "pnpm -r lint",
    "typecheck": "pnpm -r typecheck",
    "ashlar": "node packages/cli/dist/index.js"
  },
  "devDependencies": {
    "@types/node": "^24.12.2",
    "typescript": "^6.0.3",
    "vitest": "^4.1.5"
  }
}
```

- [ ] **Step 2: Create workspace package map**

Add `pnpm-workspace.yaml`:

```yaml
packages:
  - "packages/*"
  - "examples/*"
```

- [ ] **Step 3: Create shared TypeScript config**

Add `tsconfig.base.json`:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "strict": true,
    "declaration": true,
    "sourceMap": true,
    "resolveJsonModule": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true
  }
}
```

- [ ] **Step 4: Create ignore file**

Add `.gitignore`:

```gitignore
node_modules
dist
coverage
.DS_Store
*.log
ashlar-lock.json
```

- [ ] **Step 5: Verify workspace installs**

Run:

```bash
pnpm install
pnpm typecheck
```

Expected: install succeeds; `typecheck` may report no package scripts until Task 2 exists.

- [ ] **Step 6: Commit**

```bash
git add package.json pnpm-workspace.yaml tsconfig.base.json .gitignore
git commit -m "chore: initialize ashlar workspace"
```

## Task 2: CLI Skeleton

**Files:**
- Create: `packages/cli/package.json`
- Create: `packages/cli/tsconfig.json`
- Create: `packages/cli/src/index.ts`
- Create: `packages/cli/src/commands/init.ts`
- Create: `packages/cli/src/commands/add.ts`
- Create: `packages/cli/src/commands/audit.ts`
- Create: `packages/cli/src/commands/verify.ts`

- [ ] **Step 1: Create CLI package manifest**

Add `packages/cli/package.json`:

```json
{
  "name": "@ashlar/cli",
  "version": "0.0.0",
  "type": "module",
  "bin": {
    "ashlar": "./dist/index.js"
  },
  "scripts": {
    "build": "tsc -p tsconfig.json",
    "typecheck": "tsc -p tsconfig.json --noEmit",
    "test": "vitest run",
    "lint": "tsc -p tsconfig.json --noEmit"
  },
  "dependencies": {
    "commander": "^14.0.3"
  },
  "devDependencies": {
    "typescript": "^6.0.3",
    "vitest": "^4.1.5"
  }
}
```

- [ ] **Step 2: Create CLI TypeScript config**

Add `packages/cli/tsconfig.json`:

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "dist",
    "rootDir": "src"
  },
  "include": ["src/**/*.ts"]
}
```

- [ ] **Step 3: Add command entrypoint**

Add `packages/cli/src/index.ts`:

```ts
#!/usr/bin/env node
import { Command } from "commander";
import { registerAddCommand } from "./commands/add.js";
import { registerAuditCommand } from "./commands/audit.js";
import { registerInitCommand } from "./commands/init.js";
import { registerVerifyCommand } from "./commands/verify.js";

const program = new Command();

program
  .name("ashlar")
  .description("Ashlar component registry CLI")
  .version("0.0.0");

registerInitCommand(program);
registerAddCommand(program);
registerAuditCommand(program);
registerVerifyCommand(program);

program.parse();
```

- [ ] **Step 4: Add minimal commands with real behavior**

Add `packages/cli/src/commands/init.ts`:

```ts
import { writeFileSync } from "node:fs";
import { Command } from "commander";

export function registerInitCommand(program: Command) {
  program.command("init").description("Initialize Ashlar in this project").action(() => {
    writeFileSync(
      "ashlar.config.json",
      JSON.stringify({ registry: "./registry", componentsDir: "src/ashlar" }, null, 2) + "\n"
    );
    writeFileSync(
      "ashlar-lock.json",
      JSON.stringify({ version: "1", registry: "./registry", components: {} }, null, 2) + "\n"
    );
    console.log("Initialized Ashlar");
  });
}
```

Add `packages/cli/src/commands/add.ts`:

```ts
import { Command } from "commander";

export function registerAddCommand(program: Command) {
  program.command("add").argument("<components...>").description("Add component capsules").action((components: string[]) => {
    console.log(`Add requested: ${components.join(", ")}`);
  });
}
```

Add `packages/cli/src/commands/audit.ts`:

```ts
import { Command } from "commander";

export function registerAuditCommand(program: Command) {
  program.command("audit").description("Validate Ashlar usage").option("--sarif", "Emit SARIF").action((options) => {
    console.log(options.sarif ? JSON.stringify({ version: "2.1.0", runs: [] }) : "No findings");
  });
}
```

Add `packages/cli/src/commands/verify.ts`:

```ts
import { existsSync } from "node:fs";
import { Command } from "commander";

export function registerVerifyCommand(program: Command) {
  program.command("verify").description("Verify installed capsule hashes").action(() => {
    if (!existsSync("ashlar-lock.json")) {
      console.error("ashlar-lock.json not found. Run `ashlar init` first.");
      process.exitCode = 1;
      return;
    }
    console.log("Lockfile present");
  });
}
```

- [ ] **Step 5: Build and run**

Run:

```bash
pnpm --filter @ashlar/cli build
node packages/cli/dist/index.js --help
```

Expected: help output lists `init`, `add`, `audit`, and `verify`.

- [ ] **Step 6: Commit**

```bash
git add packages/cli
git commit -m "feat: add cli skeleton"
```

## Task 3: Capsule Schema Package

**Files:**
- Create: `packages/schemas/package.json`
- Create: `packages/schemas/tsconfig.json`
- Create: `packages/schemas/src/capsule.schema.json`
- Create: `packages/schemas/src/lock.schema.json`
- Create: `packages/schemas/src/index.ts`

- [ ] **Step 1: Create package manifest**

Add `packages/schemas/package.json`:

```json
{
  "name": "@ashlar/schemas",
  "version": "0.0.0",
  "type": "module",
  "exports": {
    ".": "./dist/index.js",
    "./capsule.schema.json": "./src/capsule.schema.json",
    "./lock.schema.json": "./src/lock.schema.json"
  },
  "scripts": {
    "build": "tsc -p tsconfig.json",
    "typecheck": "tsc -p tsconfig.json --noEmit",
    "test": "vitest run",
    "lint": "tsc -p tsconfig.json --noEmit"
  },
  "devDependencies": {
    "typescript": "^6.0.3",
    "vitest": "^4.1.5"
  }
}
```

- [ ] **Step 2: Create schema config**

Add `packages/schemas/tsconfig.json`:

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "dist",
    "rootDir": "src"
  },
  "include": ["src/**/*.ts"]
}
```

- [ ] **Step 3: Add capsule schema**

Add `packages/schemas/src/capsule.schema.json`:

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "https://ashlar.dev/schemas/capsule.schema.json",
  "type": "object",
  "required": ["name", "version", "layer", "stability", "files", "capsule_hash"],
  "properties": {
    "name": { "type": "string", "pattern": "^[a-z0-9-]+$" },
    "version": { "type": "string" },
    "layer": { "enum": ["L0", "L1", "L2", "L3", "L4"] },
    "stability": { "enum": ["proposal", "experimental", "beta", "stable", "deprecated"] },
    "files": {
      "type": "object",
      "additionalProperties": { "type": "string", "pattern": "^sha256:" }
    },
    "capsule_hash": { "type": "string", "pattern": "^sha256:" },
    "signature": { "type": "string" }
  }
}
```

- [ ] **Step 4: Add lock schema**

Add `packages/schemas/src/lock.schema.json`:

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "https://ashlar.dev/schemas/lock.schema.json",
  "type": "object",
  "required": ["version", "registry", "components"],
  "properties": {
    "version": { "const": "1" },
    "registry": { "type": "string" },
    "components": {
      "type": "object",
      "additionalProperties": {
        "type": "object",
        "required": ["version", "capsule_hash", "files"],
        "properties": {
          "version": { "type": "string" },
          "capsule_hash": { "type": "string", "pattern": "^sha256:" },
          "signature": { "type": "string" },
          "files": { "type": "object" }
        }
      }
    }
  }
}
```

- [ ] **Step 5: Export schema paths**

Add `packages/schemas/src/index.ts`:

```ts
export const capsuleSchemaId = "https://ashlar.dev/schemas/capsule.schema.json";
export const lockSchemaId = "https://ashlar.dev/schemas/lock.schema.json";
```

- [ ] **Step 6: Build**

Run:

```bash
pnpm --filter @ashlar/schemas build
```

Expected: TypeScript emits `packages/schemas/dist/index.js`.

- [ ] **Step 7: Commit**

```bash
git add packages/schemas
git commit -m "feat: add capsule and lock schemas"
```

## Task 4: First Button Capsule

**Files:**
- Create: `registry/components/button/0.0.1/button.css`
- Create: `registry/components/button/0.0.1/button.html`
- Create: `registry/components/button/0.0.1/button.cem.json`
- Create: `registry/components/button/0.0.1/button.evidence.json`

- [ ] **Step 1: Add semantic CSS**

Add `registry/components/button/0.0.1/button.css`:

```css
@layer ashlar.components {
  .ashlar-button {
    align-items: center;
    border: 1px solid transparent;
    border-radius: var(--ashlar-radius-control, 0.375rem);
    cursor: pointer;
    display: inline-flex;
    font: inherit;
    font-weight: 700;
    gap: 0.5rem;
    justify-content: center;
    min-block-size: 2.75rem;
    padding-block: 0.625rem;
    padding-inline: 1rem;
  }

  .ashlar-button[data-variant="primary"] {
    background: var(--ashlar-color-action-primary-bg, #005ea8);
    color: var(--ashlar-color-action-primary-fg, #fff);
  }

  .ashlar-button:focus-visible {
    outline: var(--ashlar-focus-ring-width, 0.25rem) solid var(--ashlar-focus-ring-color, #2491ff);
    outline-offset: var(--ashlar-focus-ring-offset, 0.25rem);
  }
}
```

- [ ] **Step 2: Add HTML example**

Add `registry/components/button/0.0.1/button.html`:

```html
<button class="ashlar-button" data-variant="primary" type="button">
  Apply
</button>
```

- [ ] **Step 3: Add CEM**

Add `registry/components/button/0.0.1/button.cem.json`:

```json
{
  "schemaVersion": "2.1.0",
  "modules": [
    {
      "kind": "javascript-module",
      "path": "button.html",
      "declarations": [
        {
          "kind": "class",
          "name": "AshlarButton",
          "tagName": "button",
          "description": "Accessible action control for forms and workflows.",
          "_ashlar": {
            "version": "0.0.1",
            "layer": "L0",
            "stability": "experimental",
            "variants": ["primary"],
            "a11yRequirements": [
              { "id": "accessible-name-required", "wcag": "4.1.2", "severity": "error" },
              { "id": "focus-visible-required", "wcag": "2.4.7", "severity": "error" }
            ],
            "antiPatterns": [
              {
                "id": "icon-only-needs-label",
                "pattern": "<button class=\"ashlar-button\">$ICON</button>",
                "fix": "Add visible text or aria-label.",
                "wcag": "4.1.2",
                "severity": "error"
              }
            ],
            "tokensConsumed": [
              "color.action.primary.bg",
              "color.action.primary.fg",
              "focus.ring.color",
              "radius.control"
            ],
            "rendering": "server-safe",
            "hydrationCost": "none",
            "criticalForA11y": true
          }
        }
      ]
    }
  ]
}
```

- [ ] **Step 4: Add initial evidence**

Add `registry/components/button/0.0.1/button.evidence.json`:

```json
{
  "component": "button",
  "version": "0.0.1",
  "stability": "experimental",
  "accessibilityStatus": "not-reviewed",
  "wcag": [
    { "criterion": "2.4.7", "level": "AA", "title": "Focus Visible", "status": "planned" },
    { "criterion": "4.1.2", "level": "A", "title": "Name, Role, Value", "status": "planned" }
  ],
  "manualTests": [],
  "automatedResults": {},
  "knownLimitations": []
}
```

- [ ] **Step 5: Commit**

```bash
git add registry/components/button/0.0.1
git commit -m "feat: add experimental button capsule"
```

## Task 5: Hashing and Capsule Manifest Prototype

**Files:**
- Create: `packages/cli/src/lib/hash.ts`
- Create: `packages/cli/src/lib/capsule.ts`
- Create: `packages/cli/src/lib/hash.test.ts`
- Create: `packages/cli/src/lib/capsule.test.ts`

- [ ] **Step 1: Add hash utility test**

Add `packages/cli/src/lib/hash.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { sha256Text } from "./hash.js";

describe("sha256Text", () => {
  it("returns a sha256-prefixed hash", () => {
    expect(sha256Text("ashlar")).toMatch(/^sha256:[a-f0-9]{64}$/);
  });

  it("normalizes CRLF to LF", () => {
    expect(sha256Text("a\r\nb\r\n")).toBe(sha256Text("a\nb\n"));
  });
});
```

- [ ] **Step 2: Run failing test**

Run:

```bash
pnpm --filter @ashlar/cli test packages/cli/src/lib/hash.test.ts
```

Expected: FAIL because `hash.ts` does not exist.

- [ ] **Step 3: Add hash utility**

Add `packages/cli/src/lib/hash.ts`:

```ts
import { createHash } from "node:crypto";

export function sha256Text(input: string): string {
  const normalized = input.replace(/\r\n/g, "\n");
  return `sha256:${createHash("sha256").update(normalized, "utf8").digest("hex")}`;
}
```

- [ ] **Step 4: Run passing test**

Run:

```bash
pnpm --filter @ashlar/cli test packages/cli/src/lib/hash.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/cli/src/lib/hash.ts packages/cli/src/lib/hash.test.ts
git commit -m "feat: add hash utility"
```

- [ ] **Step 6: Add capsule manifest test**

Add `packages/cli/src/lib/capsule.test.ts`:

```ts
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { buildCapsuleManifest } from "./capsule.js";

describe("buildCapsuleManifest", () => {
  it("hashes files in deterministic order", () => {
    const dir = join(tmpdir(), `ashlar-capsule-${Date.now()}`);
    mkdirSync(dir, { recursive: true });
    try {
      writeFileSync(join(dir, "b.txt"), "b\n");
      writeFileSync(join(dir, "a.txt"), "a\n");
      const manifest = buildCapsuleManifest({
        directory: dir,
        name: "button",
        version: "0.0.1",
        layer: "L0",
        stability: "experimental"
      });
      expect(Object.keys(manifest.files)).toEqual(["a.txt", "b.txt"]);
      expect(manifest.capsule_hash).toMatch(/^sha256:[a-f0-9]{64}$/);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
```

- [ ] **Step 7: Run failing capsule test**

Run:

```bash
pnpm --filter @ashlar/cli test packages/cli/src/lib/capsule.test.ts
```

Expected: FAIL because `capsule.ts` does not exist.

- [ ] **Step 8: Add capsule manifest builder**

Add `packages/cli/src/lib/capsule.ts`:

```ts
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { sha256Text } from "./hash.js";

export type CapsuleManifest = {
  name: string;
  version: string;
  layer: "L0" | "L1" | "L2" | "L3" | "L4";
  stability: "proposal" | "experimental" | "beta" | "stable" | "deprecated";
  files: Record<string, string>;
  capsule_hash: string;
};

export function buildCapsuleManifest(input: {
  directory: string;
  name: string;
  version: string;
  layer: CapsuleManifest["layer"];
  stability: CapsuleManifest["stability"];
}): CapsuleManifest {
  const files = Object.fromEntries(
    readdirSync(input.directory)
      .filter((file) => !file.endsWith(".lock.json"))
      .sort()
      .map((file) => [file, sha256Text(readFileSync(join(input.directory, file), "utf8"))])
  );
  const capsule_hash = sha256Text(JSON.stringify({ name: input.name, version: input.version, files }));
  return { name: input.name, version: input.version, layer: input.layer, stability: input.stability, files, capsule_hash };
}
```

- [ ] **Step 9: Run passing capsule test**

Run:

```bash
pnpm --filter @ashlar/cli test packages/cli/src/lib/capsule.test.ts
```

Expected: PASS.

- [ ] **Step 10: Commit capsule builder**

```bash
git add packages/cli/src/lib/capsule.ts packages/cli/src/lib/capsule.test.ts
git commit -m "feat: build capsule manifests"
```

## Task 6: CI Workflow

**Files:**
- Create: `.github/workflows/ashlar.yml`

- [ ] **Step 1: Add GitHub Actions workflow**

Add `.github/workflows/ashlar.yml`:

```yaml
name: Ashlar

on:
  pull_request:
  push:
    branches: [main]

jobs:
  checks:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
        with:
          version: 10.33.2
      - uses: actions/setup-node@v4
        with:
          node-version: 24.15.0
          cache: pnpm
      - run: pnpm install --frozen-lockfile
      - run: pnpm typecheck
      - run: pnpm test
      - run: pnpm build
      - run: pnpm --silent ashlar audit --sarif > ashlar.sarif
      - uses: github/codeql-action/upload-sarif@v3
        if: always()
        with:
          sarif_file: ashlar.sarif
```

- [ ] **Step 2: Verify locally**

Run:

```bash
pnpm typecheck
pnpm test
pnpm build
pnpm --silent ashlar audit --sarif > ashlar.sarif
```

Expected: all commands pass and `ashlar.sarif` contains a SARIF `version` field.

- [ ] **Step 3: Commit**

```bash
git add .github/workflows/ashlar.yml
git commit -m "ci: add ashlar validation workflow"
```

## Self-Review Checklist

- [ ] Every task has concrete files.
- [ ] Every command has an expected result.
- [ ] The first implementation slice proves real CLI execution before expanding components.
- [ ] The Button capsule stays experimental until tests and evidence exist.
- [ ] The plan avoids Zig, Web Components, MCP, and Sigstore until the local flow works.
- [ ] The plan supports the public roadmap gates in `docs/roadmap/00-roadmap.md`.
