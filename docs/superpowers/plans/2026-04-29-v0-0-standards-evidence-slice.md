# v0.0 Standards and Evidence Slice Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn the current Ashlar prototype into a standards-and-evidence foundation by adding richer capsule metadata, evidence schema support, registry discovery, `search`/`view` CLI commands, and a first federal policy-pack audit.

**Architecture:** Keep the implementation small and local-first. The registry remains a filesystem registry under `registry/`; the CLI reads it directly, builds a registry index in memory, and uses deterministic JSON fixtures for tests. Policy-pack auditing starts with HTML/static-template checks so the mechanics are proven before ast-grep integration.

**Tech Stack:** Node.js 24.15.0, TypeScript 6, Vitest 4, Commander 14, existing pnpm/turbo workspace.

---

## File Structure

- Modify: `packages/schemas/src/capsule.schema.json` — add `policyMappings`, `platformFeatures`, and evidence reference fields.
- Create: `packages/schemas/src/evidence.schema.json` — schema for component evidence packets.
- Modify: `packages/schemas/src/index.ts` — export evidence schema ID and related types.
- Modify: `packages/cli/src/lib/capsule.ts` — extend `CapsuleManifest` metadata type.
- Create: `packages/cli/src/lib/registry.ts` — registry discovery, component listing, and component detail loading.
- Create: `packages/cli/src/lib/registry.test.ts` — registry discovery tests.
- Create: `packages/cli/src/commands/search.ts` — `ashlar search`.
- Create: `packages/cli/src/commands/view.ts` — `ashlar view`.
- Modify: `packages/cli/src/index.ts` — register `search` and `view`.
- Create: `packages/cli/src/lib/policy.ts` — first federal policy-pack checks.
- Create: `packages/cli/src/lib/policy.test.ts` — policy-pack unit tests.
- Modify: `packages/cli/src/commands/audit.ts` — support `--policy federal`, `--explain`, and SARIF results for policy findings.
- Modify: `registry/components/button/0.0.1/button.cem.json` — add platform features and policy mappings.
- Modify: `registry/components/button/0.0.1/button.evidence.json` — add ICT Baseline mapping.
- Create: `registry/index.json` — static local registry index for prototype discovery.

## Task 1: Expand Schema Contracts

**Files:**
- Modify: `packages/schemas/src/capsule.schema.json`
- Create: `packages/schemas/src/evidence.schema.json`
- Modify: `packages/schemas/src/index.ts`

- [ ] **Step 1: Add capsule metadata fields**

Add these optional properties to `packages/schemas/src/capsule.schema.json`:

```json
"policyMappings": {
  "type": "array",
  "items": {
    "type": "object",
    "required": ["source", "requirement"],
    "properties": {
      "source": { "type": "string" },
      "requirement": { "type": "string" },
      "url": { "type": "string" }
    },
    "additionalProperties": false
  }
},
"platformFeatures": {
  "type": "array",
  "items": {
    "type": "object",
    "required": ["feature", "status", "fallback"],
    "properties": {
      "feature": { "type": "string" },
      "status": { "enum": ["required", "progressive", "not-used"] },
      "fallback": { "type": "string" }
    },
    "additionalProperties": false
  }
},
"evidence": {
  "type": "string"
}
```

- [ ] **Step 2: Create evidence schema**

Create `packages/schemas/src/evidence.schema.json`:

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "https://ashlar.dev/schemas/evidence.schema.json",
  "title": "Ashlar Evidence Packet",
  "type": "object",
  "required": ["component", "version", "stability", "accessibilityStatus", "wcag"],
  "properties": {
    "component": { "type": "string" },
    "version": { "type": "string" },
    "stability": { "enum": ["proposal", "experimental", "beta", "stable", "deprecated"] },
    "accessibilityStatus": {
      "enum": ["not-reviewed", "automated-tested", "manual-tested", "stable-evidence", "known-issue"]
    },
    "wcag": { "type": "array" },
    "baselineTests": { "type": "array" },
    "manualTests": { "type": "array" },
    "automatedResults": { "type": "object" },
    "knownLimitations": { "type": "array" }
  },
  "additionalProperties": true
}
```

- [ ] **Step 3: Export evidence schema constants**

Update `packages/schemas/src/index.ts`:

```ts
export const capsuleSchemaId = "https://ashlar.dev/schemas/capsule.schema.json";
export const lockSchemaId = "https://ashlar.dev/schemas/lock.schema.json";
export const evidenceSchemaId = "https://ashlar.dev/schemas/evidence.schema.json";

export const capsuleFormatVersion = "1.0";
export const lockfileVersion = "1";
export const evidenceFormatVersion = "1.0";
```

- [ ] **Step 4: Verify schemas compile**

Run:

```bash
pnpm --filter @blen/ashlar-schemas typecheck
pnpm --filter @blen/ashlar-schemas build
```

Expected: both commands pass.

- [ ] **Step 5: Commit**

```bash
git add packages/schemas/src
git commit -m "feat: expand evidence schema contracts"
```

## Task 2: Add Local Registry Discovery

**Files:**
- Create: `registry/index.json`
- Create: `packages/cli/src/lib/registry.ts`
- Create: `packages/cli/src/lib/registry.test.ts`

- [ ] **Step 1: Create local registry index**

Create `registry/index.json`:

```json
{
  "$schema": "https://ashlar.dev/schemas/registry-index.schema.json",
  "registry": "./registry",
  "name": "ashlar-local",
  "version": "0.0.1",
  "components": {
    "button": {
      "latest": "0.0.1",
      "versions": ["0.0.1"],
      "layer": "markup-primitives",
      "stability": "experimental",
      "description": "Accessible semantic action control for forms and workflows."
    }
  }
}
```

- [ ] **Step 2: Write registry tests**

Create `packages/cli/src/lib/registry.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { getComponent, listComponents } from "./registry.js";

describe("registry", () => {
  it("lists local registry components", () => {
    expect(listComponents(process.cwd()).map((item) => item.name)).toContain("button");
  });

  it("loads component detail with evidence", () => {
    const button = getComponent(process.cwd(), "button");

    expect(button.name).toBe("button");
    expect(button.version).toBe("0.0.1");
    expect(button.evidence.component).toBe("button");
  });
});
```

- [ ] **Step 3: Implement registry helper**

Create `packages/cli/src/lib/registry.ts`:

```ts
import { readFileSync } from "node:fs";
import { join } from "node:path";

type RegistryIndex = {
  components: Record<string, { latest: string; versions: string[]; layer: string; stability: string; description: string }>;
};

export type RegistryListItem = {
  name: string;
  latest: string;
  layer: string;
  stability: string;
  description: string;
};

export type RegistryComponent = RegistryListItem & {
  version: string;
  directory: string;
  cem: unknown;
  evidence: { component: string; version: string; accessibilityStatus?: string };
};

function readJson<T>(path: string): T {
  return JSON.parse(readFileSync(path, "utf8")) as T;
}

function registryRoot(cwd: string) {
  return join(cwd, "registry");
}

export function listComponents(cwd: string): RegistryListItem[] {
  const index = readJson<RegistryIndex>(join(registryRoot(cwd), "index.json"));

  return Object.entries(index.components)
    .map(([name, item]) => ({ name, ...item }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

export function getComponent(cwd: string, name: string): RegistryComponent {
  const item = listComponents(cwd).find((component) => component.name === name);

  if (!item) {
    throw new Error(`Unknown Ashlar component: ${name}`);
  }

  const directory = join(registryRoot(cwd), "components", name, item.latest);

  return {
    ...item,
    version: item.latest,
    directory,
    cem: readJson(join(directory, `${name}.cem.json`)),
    evidence: readJson(join(directory, `${name}.evidence.json`)),
  };
}
```

- [ ] **Step 4: Verify registry tests**

Run:

```bash
pnpm --filter @blen/ashlar-cli test -- src/lib/registry.test.ts
```

Expected: registry tests pass.

- [ ] **Step 5: Commit**

```bash
git add registry/index.json packages/cli/src/lib/registry.ts packages/cli/src/lib/registry.test.ts
git commit -m "feat: add local registry discovery"
```

## Task 3: Add `search` and `view` CLI Commands

**Files:**
- Create: `packages/cli/src/commands/search.ts`
- Create: `packages/cli/src/commands/view.ts`
- Modify: `packages/cli/src/index.ts`

- [ ] **Step 1: Add search command**

Create `packages/cli/src/commands/search.ts`:

```ts
import type { Command } from "commander";
import { listComponents } from "../lib/registry.js";

export function registerSearchCommand(program: Command) {
  program
    .command("search")
    .description("Search the local Ashlar registry")
    .argument("[query]", "Component name or description text")
    .action((query = "") => {
      const normalized = query.toLowerCase();
      const components = listComponents(process.cwd()).filter(
        (item) => !normalized || item.name.includes(normalized) || item.description.toLowerCase().includes(normalized),
      );

      for (const item of components) {
        console.log(`${item.name}@${item.latest} [${item.layer}, ${item.stability}] - ${item.description}`);
      }
    });
}
```

- [ ] **Step 2: Add view command**

Create `packages/cli/src/commands/view.ts`:

```ts
import type { Command } from "commander";
import { getComponent } from "../lib/registry.js";

export function registerViewCommand(program: Command) {
  program
    .command("view")
    .description("Show component registry metadata")
    .argument("<component>", "Component name")
    .option("--json", "Emit JSON")
    .action((component: string, options: { json?: boolean }) => {
      const detail = getComponent(process.cwd(), component);

      if (options.json) {
        console.log(JSON.stringify(detail, null, 2));
        return;
      }

      console.log(`${detail.name}@${detail.version}`);
      console.log(`Family: ${detail.family}`);
      console.log(`Stability: ${detail.stability}`);
      console.log(`Evidence: ${detail.evidence.accessibilityStatus ?? "unknown"}`);
      console.log(`Path: ${detail.directory}`);
    });
}
```

- [ ] **Step 3: Register commands**

Update `packages/cli/src/index.ts`:

```ts
import { registerSearchCommand } from "./commands/search.js";
import { registerViewCommand } from "./commands/view.js";

registerSearchCommand(program);
registerViewCommand(program);
```

- [ ] **Step 4: Verify command behavior**

Run:

```bash
pnpm build
node packages/cli/dist/index.js search button
node packages/cli/dist/index.js view button
node packages/cli/dist/index.js view button --json
```

Expected:

```text
button@0.0.1 [markup primitives, experimental] - Accessible semantic action control for forms and workflows.
```

The `view` output includes `Evidence: not-reviewed`.

- [ ] **Step 5: Commit**

```bash
git add packages/cli/src/index.ts packages/cli/src/commands/search.ts packages/cli/src/commands/view.ts
git commit -m "feat: add registry search and view commands"
```

## Task 4: Add First Federal Policy-Pack Audit

**Files:**
- Create: `packages/cli/src/lib/policy.ts`
- Create: `packages/cli/src/lib/policy.test.ts`
- Modify: `packages/cli/src/commands/audit.ts`

- [ ] **Step 1: Write policy tests**

Create `packages/cli/src/lib/policy.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { auditFederalHtml } from "./policy.js";

describe("federal policy audit", () => {
  it("flags missing page shell requirements", () => {
    const findings = auditFederalHtml("<html><head></head><body><main></main></body></html>", "index.html");

    expect(findings.map((finding) => finding.ruleId)).toEqual([
      "federal/page-title-required",
      "federal/meta-description-required",
      "federal/banner-required",
      "federal/identifier-required",
    ]);
  });

  it("passes a minimal federal page shell", () => {
    const findings = auditFederalHtml(
      '<html><head><title>Apply for benefits</title><meta name="description" content="Apply for benefits online."></head><body><section class="ashlar-banner"></section><footer class="ashlar-identifier"><a href="/privacy">Privacy</a><a href="/accessibility">Accessibility</a></footer></body></html>',
      "index.html",
    );

    expect(findings).toEqual([]);
  });
});
```

- [ ] **Step 2: Implement policy helper**

Create `packages/cli/src/lib/policy.ts`:

```ts
export type PolicyFinding = {
  ruleId: string;
  message: string;
  file: string;
  level: "error" | "warning";
  helpUri: string;
};

export function auditFederalHtml(source: string, file: string): PolicyFinding[] {
  const findings: PolicyFinding[] = [];

  if (!/<title>[^<]+<\/title>/i.test(source)) {
    findings.push({
      ruleId: "federal/page-title-required",
      message: "Federal pages need a descriptive HTML title.",
      file,
      level: "error",
      helpUri: "https://standards.digital.gov/standards/",
    });
  }

  if (!/<meta\s+name=["']description["']\s+content=["'][^"']+["']/i.test(source)) {
    findings.push({
      ruleId: "federal/meta-description-required",
      message: "Federal pages need a descriptive meta description.",
      file,
      level: "warning",
      helpUri: "https://standards.digital.gov/standards/",
    });
  }

  if (!/(class=["'][^"']*ashlar-banner|usa-banner)/i.test(source)) {
    findings.push({
      ruleId: "federal/banner-required",
      message: "Federal service pages should include the official government banner pattern.",
      file,
      level: "error",
      helpUri: "https://standards.digital.gov/standards/banner/",
    });
  }

  if (!/(class=["'][^"']*ashlar-identifier|usa-identifier)/i.test(source)) {
    findings.push({
      ruleId: "federal/identifier-required",
      message: "Federal service pages should include an identifier with required links.",
      file,
      level: "error",
      helpUri: "https://designsystem.digital.gov/components/identifier/",
    });
  }

  return findings;
}
```

- [ ] **Step 3: Wire audit command**

Update `packages/cli/src/commands/audit.ts` to accept:

```ts
.option("--policy <name>", "Run a named policy pack")
.option("--explain", "Print explanatory help for findings")
```

For this slice, scan `examples/plain-html/index.html` when `--policy federal` is provided. Convert policy findings into normal text output or SARIF results. Keep existing empty output for default `ashlar audit`.

- [ ] **Step 4: Verify policy audit**

Run:

```bash
pnpm --filter @blen/ashlar-cli test -- src/lib/policy.test.ts
pnpm build
node packages/cli/dist/index.js audit --policy federal --explain
node packages/cli/dist/index.js audit --policy federal --sarif > ashlar.sarif
```

Expected: tests pass; CLI either reports findings for the current example or exits cleanly if the example has the required page shell.

- [ ] **Step 5: Commit**

```bash
git add packages/cli/src/lib/policy.ts packages/cli/src/lib/policy.test.ts packages/cli/src/commands/audit.ts
git commit -m "feat: add federal policy audit prototype"
```

## Task 5: Add Metadata to Button Capsule

**Files:**
- Modify: `registry/components/button/0.0.1/button.cem.json`
- Modify: `registry/components/button/0.0.1/button.evidence.json`

- [ ] **Step 1: Add platform metadata to CEM**

In `button.cem.json`, under `_ashlar`, add:

```json
"platformFeatures": [
  {
    "feature": "forced-colors",
    "status": "progressive",
    "fallback": "Uses system colors for border, background, foreground, and focus outline."
  }
],
"policyMapping": [
  {
    "policy": "Section 508",
    "requirement": "Supports keyboard operation and accessible name when used correctly.",
    "url": "https://www.section508.gov/"
  }
]
```

- [ ] **Step 2: Add ICT Baseline mapping to evidence**

In `button.evidence.json`, add:

```json
"baselineTests": [
  {
    "source": "Section 508 ICT Testing Baseline for Web",
    "test": "Keyboard Accessible",
    "status": "planned",
    "evidence": "planned keyboard and screen-reader tests"
  },
  {
    "source": "Section 508 ICT Testing Baseline for Web",
    "test": "Name, Role, Value",
    "status": "planned",
    "evidence": "planned accessible-name tests"
  }
]
```

- [ ] **Step 3: Verify JSON and CLI**

Run:

```bash
pnpm build
node packages/cli/dist/index.js view button --json
```

Expected: JSON parses; view command returns Button detail.

- [ ] **Step 4: Commit**

```bash
git add registry/components/button/0.0.1/button.cem.json registry/components/button/0.0.1/button.evidence.json
git commit -m "docs: enrich button capsule metadata"
```

## Task 6: Update Docs and Final Verification

**Files:**
- Modify: `README.md`
- Modify: `docs/README.md`
- Modify: `docs/roadmap/01-v0.0-foundation.md`
- Modify: `packages/cli/src/commands/init.ts`
- Create: `packages/cli/src/commands/design.ts`
- Modify: `packages/cli/src/index.ts`

- [ ] **Step 1: Add next-slice command examples**

Add examples for:

```bash
npx @blen/ashlar search button
npx @blen/ashlar view button
npx @blen/ashlar audit --policy federal --explain
npx @blen/ashlar design sync
```

- [ ] **Step 2: Add DESIGN.md generation**

Update `packages/cli/src/commands/init.ts` so `ashlar init` writes a root `DESIGN.md` next to `AGENTS.md`. The file is an agent-facing export generated from Ashlar's default tokens and rules, not the canonical token source.

Use this first template:

```md
---
name: Ashlar Default
description: Government-first, evidence-backed public-service UI system.
colors:
  action-primary: "#005EA8"
  focus-ring: "#2491FF"
typography:
  body:
    fontFamily: Public Sans
    fontSize: 1rem
spacing:
  md: 16px
rounded:
  control: 6px
---

## Overview

Use a restrained, trustworthy civic interface. Prioritize clarity, plain language, visible focus, and resilient layouts over novelty.

## Do's and Don'ts

- Do use Ashlar tokens and installed components.
- Do preserve focus indicators and forced-colors behavior.
- Do keep forms dense enough for repeat use but readable at 200% zoom.
- Do not invent brand colors outside the agency theme.
- Do not remove focus-visible styles.
```

- [ ] **Step 3: Add `ashlar design sync` command**

Create `packages/cli/src/commands/design.ts` with a `design sync` subcommand that rewrites `DESIGN.md` from the same template for v0.0. Register it in `packages/cli/src/index.ts`.

- [ ] **Step 4: Run full verification**

Run:

```bash
source ~/.nvm/nvm.sh
nvm use 24.15.0
pnpm format:check
pnpm check
pnpm build
node packages/cli/dist/index.js search button
node packages/cli/dist/index.js view button
node packages/cli/dist/index.js audit --policy federal --sarif > ashlar.sarif
node packages/cli/dist/index.js design sync
```

Expected:

- Format, check, and build pass.
- CLI commands work.

- [ ] **Step 5: Commit**

```bash
git add README.md docs/README.md docs/roadmap/01-v0.0-foundation.md packages/cli/src/commands/init.ts packages/cli/src/commands/design.ts packages/cli/src/index.ts
git commit -m "feat: scaffold design md context"
```
