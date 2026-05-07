# v0.0 Standards and Evidence Slice Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement the committed standards/evidence slice spec so Ashlar can discover local registry components, inspect evidence before install, audit static HTML for first federal page-shell rules, and export agent-facing design context.

**Architecture:** Keep the CLI local-first and schema-first. `registry/index.json` is the source of truth; `packages/cli/src/lib/registry.ts` is the only component discovery path for `add`, `evidence`, `search`, and `view`; federal audit uses parser-backed HTML inspection plus a shared SARIF converter.

**Tech Stack:** Node.js 24.15.0, TypeScript 6, Commander 14, Vitest 4, parse5 8.0.1, fast-glob 3.3.3, pnpm/turbo.

---

## Source Spec

- `docs/superpowers/specs/2026-04-29-v0-0-standards-evidence-slice-spec.md`

## File Structure

- Modify: `pnpm-workspace.yaml` - add `parse5` and `fast-glob` catalog entries.
- Modify: `packages/cli/package.json` - depend on `parse5` and `fast-glob`.
- Modify: `packages/schemas/package.json` - export new JSON schemas.
- Create: `packages/schemas/src/evidence.schema.json` - evidence packet schema.
- Create: `packages/schemas/src/registry-index.schema.json` - local registry index schema.
- Modify: `packages/schemas/src/capsule.schema.json` - add capsule metadata fields.
- Modify: `packages/schemas/src/index.ts` - export schema IDs and format constants.
- Create: `registry/index.json` - local registry index.
- Modify: `registry/components/button/0.0.1/button.cem.json` - add platform and policy metadata.
- Modify: `registry/components/button/0.0.1/button.evidence.json` - add planned ICT Baseline mappings.
- Create: `packages/cli/src/lib/registry.ts` - shared registry access.
- Create: `packages/cli/src/lib/registry.test.ts` - registry helper tests.
- Create: `packages/cli/src/commands/search.ts` - `ashlar search`.
- Create: `packages/cli/src/commands/view.ts` - `ashlar view`.
- Modify: `packages/cli/src/commands/add.ts` - use registry helper.
- Modify: `packages/cli/src/commands/evidence.ts` - use registry helper.
- Modify: `packages/cli/src/index.ts` - register new commands.
- Create: `packages/cli/src/lib/html.ts` - parser-backed HTML helpers.
- Create: `packages/cli/src/lib/policy/federal.ts` - federal policy pack.
- Create: `packages/cli/src/lib/policy/federal.test.ts` - policy tests.
- Create: `packages/cli/src/lib/sarif.ts` - SARIF conversion.
- Create: `packages/cli/src/lib/sarif.test.ts` - SARIF tests.
- Modify: `packages/cli/src/commands/audit.ts` - wire policy audit.
- Create: `packages/cli/src/lib/design-context.ts` - DESIGN.md template writer.
- Create: `packages/cli/src/commands/design.ts` - `ashlar design sync`.
- Modify: `packages/cli/src/commands/init.ts` - write DESIGN.md.
- Modify: `README.md` and `docs/README.md` - add honest command examples.

## Task 1: Schema and Registry Contracts

- [ ] Add `parse5` and `fast-glob` to the pnpm catalog and CLI dependencies.
- [ ] Add `evidence.schema.json`, `registry-index.schema.json`, and schema exports.
- [ ] Extend `capsule.schema.json` with `policyMappings`, `platformFeatures`, and `evidence`.
- [ ] Add `registry/index.json` with Button as the only component.
- [ ] Enrich Button CEM and evidence metadata without changing Button stability.
- [ ] Run `pnpm --filter @blen/ashlar-schemas typecheck` and `pnpm --filter @blen/ashlar-schemas build`.

## Task 2: Registry Helper and Registry-Facing Commands

- [ ] Add `packages/cli/src/lib/registry.ts` with `listComponents`, `getComponent`, `resolveComponentVersion`, and file listing.
- [ ] Add registry helper tests for listing, detail loading, and unknown component errors.
- [ ] Add `search` and `view` commands with human and JSON output.
- [ ] Update `add` and `evidence` to resolve versions through the registry helper.
- [ ] Register `search` and `view` in `packages/cli/src/index.ts`.
- [ ] Run `pnpm --filter @blen/ashlar-cli test -- src/lib/registry.test.ts`.
- [ ] Run command smoke checks for `search`, `view`, and `evidence`.

## Task 3: Federal Policy Audit and SARIF

- [ ] Add parser-backed HTML helpers in `packages/cli/src/lib/html.ts`.
- [ ] Add `auditFederalHtml` in `packages/cli/src/lib/policy/federal.ts`.
- [ ] Add tests for missing title, short title, missing meta description, short meta description, missing banner, missing identifier, and missing identifier links.
- [ ] Add SARIF conversion in `packages/cli/src/lib/sarif.ts`.
- [ ] Add SARIF tests proving rule and result emission.
- [ ] Wire `audit --policy federal`, explicit file paths, default HTML scanning, `--explain`, and `--sarif`.
- [ ] Run policy and SARIF tests.
- [ ] Run `node packages/cli/dist/index.js audit --policy federal --explain examples/plain-html/index.html`.
- [ ] Run `node packages/cli/dist/index.js audit --policy federal --sarif examples/plain-html/index.html`.

## Task 4: DESIGN.md Export

- [ ] Add `packages/cli/src/lib/design-context.ts` as the single DESIGN.md template source.
- [ ] Update `ashlar init` to write `DESIGN.md`.
- [ ] Add `ashlar design sync`.
- [ ] Register `design` in `packages/cli/src/index.ts`.
- [ ] Verify `design sync` is idempotent in a temporary directory.

## Task 5: Docs and Full Verification

- [ ] Update README/docs examples for `search`, `view`, `audit --policy federal --explain`, and `design sync`.
- [ ] Run `pnpm format:check`.
- [ ] Run `pnpm check`.
- [ ] Run `pnpm build`.
- [ ] Run temporary-project smoke: `init`, `add button`, `verify`, `design sync`.
- [ ] Commit the implementation with message `feat: add standards evidence slice`.
