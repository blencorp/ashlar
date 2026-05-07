# v0.0 Standards and Evidence Slice Spec

Status: Ready for review and implementation planning
Date: 2026-04-29

## Purpose

This spec defines the next executable Ashlar slice after the initial CLI/capsule prototype. It is deliberately narrower than the full v0.0 roadmap: it proves registry discovery, evidence contracts, pre-install component inspection, a first federal policy audit, and agent-facing design context without adding more components yet.

The goal is to make Ashlar a better foundation for government service UI than a cosmetic USWDS refresh, while preserving the source-owned developer experience that made shadcn/ui useful. Ashlar should keep the good part of shadcn's model, installing understandable source into the consumer project, and address the parts that are risky for government-scale use: drift after local edits, weak provenance, limited cross-stack validation, no structured accessibility evidence, and no federal policy-pack enforcement.

## Product Bar

This slice must be boring in implementation and ambitious in guarantees.

- Schema-first: registry, capsule metadata, evidence packets, and CLI JSON output must have explicit contracts.
- Parser-first: policy checks must inspect HTML through a real parser, not regex-driven page parsing.
- Local-first: the prototype continues to read `registry/` from the filesystem, but the shape must match a future HTTP/CDN registry.
- Source-owned: installed component source remains visible and editable by consumers.
- Evidence-backed: every claim about accessibility support must point to evidence status, WCAG mapping, or an explicit planned/unknown state.
- Standards-aware: federal website checks must cite the current standard status and avoid implying legal compliance certification.
- Cross-stack by design: L0 component contracts remain HTML/CSS-first, not React-first or Tailwind-only.
- No production overclaiming: Button stays `experimental` and `not-reviewed` until tests and manual evidence exist.

The implementation plan that follows this spec must not trade these guarantees for speed. If a requirement cannot be implemented cleanly in the current slice, the plan should cut scope rather than add brittle shortcuts.

## Current Baseline

Implemented today:

- `ashlar init`
- `ashlar add`
- `ashlar audit` with empty/no-op findings
- `ashlar verify`
- `ashlar evidence`
- `@blen/ashlar-schemas` with capsule and lockfile schemas
- one local Button capsule at `registry/components/button/0.0.1`
- one plain HTML example
- CI that runs checks, build, and empty SARIF upload

Important current gaps:

- No `registry/index.json`.
- No `search`, `view`, or `design` command.
- `audit` does not inspect source.
- `evidence` hardcodes Button version `0.0.1`.
- `add` discovers versions directly from directories and hardcodes capsule metadata.
- `init` writes `AGENTS.md`, but not `DESIGN.md`.
- Button CEM lacks platform-feature and policy-mapping metadata.
- Button evidence lacks Section 508 ICT Baseline mappings.

## Scope

### In Scope

1. Add evidence and registry index schema contracts.
2. Add local registry discovery as a shared CLI library.
3. Make `add`, `evidence`, `search`, and `view` consume the same registry helper.
4. Add `ashlar search` for registry discovery.
5. Add `ashlar view` for pre-install component inspection.
6. Add a first federal policy audit for static HTML files.
7. Emit human and SARIF output for federal policy findings.
8. Enrich Button metadata with platform features, policy mappings, and ICT Baseline references.
9. Generate `DESIGN.md` from `ashlar init` and regenerate it with `ashlar design sync`.
10. Update docs to show the new command surface honestly.

### Out of Scope

- New components beyond Button.
- Public network registry.
- Sigstore signing implementation.
- ast-grep integration for component anti-patterns.
- full `ashlar update` / three-way merge.
- MCP server.
- runtime token compiler.
- Tailwind package.
- legal compliance certification language.

## Architecture

### Package Boundaries

`@blen/ashlar-schemas` owns JSON Schemas and exported constants. It must add:

- `evidence.schema.json`
- `registry-index.schema.json`
- `evidenceSchemaId`
- `registryIndexSchemaId`
- `evidenceFormatVersion`
- `registryIndexFormatVersion`

`@blen/ashlar-cli` owns CLI behavior and filesystem registry access. Shared logic must live in small library files:

- `src/lib/registry.ts`: locate registry index, list components, load component detail, resolve latest version.
- `src/lib/policy/federal.ts`: federal HTML policy rules.
- `src/lib/html.ts`: parser-backed helpers for static HTML documents.
- `src/lib/sarif.ts`: convert findings to SARIF.
- `src/lib/design-context.ts`: single source for generated `DESIGN.md`.

Commands must stay thin:

- `commands/search.ts`
- `commands/view.ts`
- `commands/audit.ts`
- `commands/design.ts`
- existing `commands/add.ts`
- existing `commands/evidence.ts`
- existing `commands/init.ts`

### Dependencies

The policy audit must use a real HTML parser. `parse5` is acceptable for this slice because it is established, framework-independent, and works for static HTML without requiring a browser. File discovery must avoid shell glob assumptions; `fast-glob` is acceptable for recursive scanning with ignores.

No browser automation is required for this slice.

## Registry Contract

Create `registry/index.json` as the local catalog:

```json
{
  "$schema": "https://ashlar.dev/schemas/registry-index.schema.json",
  "schemaVersion": "1.0",
  "registry": "./registry",
  "name": "ashlar-local",
  "version": "0.0.1",
  "publishedAt": "2026-04-29T00:00:00.000Z",
  "components": {
    "button": {
      "latest": "0.0.1",
      "versions": ["0.0.1"],
      "tier": "primitive",
      "layer": "L0",
      "stability": "experimental",
      "description": "Accessible semantic action control for forms and workflows."
    }
  }
}
```

The registry helper must treat this index as the source of truth for:

- latest version resolution;
- list/search output;
- `view` metadata;
- `add` metadata defaults;
- `evidence` version resolution.

Directory scanning may be used only as a fallback diagnostic when the index is missing or inconsistent. It must not silently override the index.

## Evidence Contract

Create `evidence.schema.json` using JSON Schema 2020-12. The first version must validate the existing Button packet and leave room for richer stable evidence later.

Required fields:

- `component`
- `version`
- `stability`
- `accessibilityStatus`
- `wcag`
- `manualTests`
- `automatedResults`
- `knownLimitations`

Optional but defined fields:

- `baselineTests`
- `antiPatternMappings`
- `lastReviewed`
- `reviewer`

The Button evidence packet must add planned ICT Baseline entries for:

- Keyboard Accessible
- Name, Role, Value

The evidence packet must continue to say `not-reviewed`; planned mappings are not proof.

## CEM Metadata Contract

Use one spelling everywhere: `policyMappings` plural.

Button `_ashlar` metadata must include:

- `platformFeatures`, including `forced-colors`.
- `policyMappings`, including Section 508/WCAG relationship.
- existing `a11yRequirements`.
- existing `antiPatterns`.
- existing `tokensConsumed`.

Policy mappings are informational. They must not claim that a component makes an application compliant.

## CLI Behavior

### `ashlar search`

Purpose: discover registry items before install.

Required behavior:

- Reads `registry/index.json` through `src/lib/registry.ts`.
- Supports optional text query over name and description.
- Sorts results by component name.
- Prints stable, parseable human output.
- Supports `--json`.

Example:

```bash
node packages/cli/dist/index.js search button
```

Human output:

```text
button@0.0.1 [L0, experimental] Accessible semantic action control for forms and workflows.
```

JSON output must include at least:

- `name`
- `latest`
- `versions`
- `tier`
- `layer`
- `stability`
- `description`

### `ashlar view`

Purpose: inspect a component before install, including the metadata shadcn-style registries generally do not enforce.

Required behavior:

- Reads component detail through `src/lib/registry.ts`.
- Supports one or more component names.
- Supports `--json`.
- Human output includes:
  - name and version;
  - tier and layer;
  - stability;
  - evidence status;
  - platform features;
  - policy mappings;
  - files in the capsule directory.

Example:

```bash
node packages/cli/dist/index.js view button
```

The command should fail with a non-zero exit code for unknown components and print a clear message.

### `ashlar evidence`

Purpose: display evidence status and evidence JSON.

Required change:

- Resolve the component version through the registry helper.
- Remove the hardcoded `0.0.1` behavior.
- Keep `--format text|json`.

### `ashlar add`

Purpose: install local source while recording hashes.

Required change:

- Resolve component metadata through the registry helper.
- Use registry `tier`, `layer`, and `stability`.
- Continue copying source files and writing `ashlar-lock.json`.
- Continue warning through the stability field, but do not block experimental installs in this local prototype.

### `ashlar audit --policy federal`

Purpose: prove that page-level federal standards can become executable checks.

Required behavior:

- Accept explicit HTML file paths.
- When no path is provided, scan the current working directory for `.html` files, ignoring `.git`, `node_modules`, `dist`, `.turbo`, and `coverage`.
- Use `parse5` to inspect HTML.
- Support `--explain`.
- Support `--sarif`.
- Leave default `ashlar audit` behavior compatible for now.
- Unknown policies fail clearly.

The first policy pack supports static HTML only. TSX, JSX, Twig, Jinja, ERB, Nunjucks, Vue, Svelte, and Astro are future ast-grep work.

#### Federal Rule Set

Each finding must include:

- `ruleId`
- `message`
- `file`
- `level`
- `standardStatus`
- `helpUri`
- optional `evidence`

Rules:

1. `federal/page-title-required`
   - HTML must include a non-empty `<title>`.
   - Help URI: `https://standards.digital.gov/standards/html-page-title/`
   - Current standard status: `pending`

2. `federal/page-title-min-length`
   - Title must be at least 20 characters to satisfy the current pending standard criterion.
   - Help URI: `https://standards.digital.gov/standards/html-page-title/`
   - Current standard status: `pending`

3. `federal/meta-description-required`
   - HTML must include `<meta name="description" content="...">`.
   - Help URI: `https://standards.digital.gov/standards/meta-page-description/`
   - Current standard status: `pending`

4. `federal/meta-description-min-length`
   - Meta description must be at least 50 characters to satisfy the current pending standard criterion.
   - Help URI: `https://standards.digital.gov/standards/meta-page-description/`
   - Current standard status: `pending`

5. `federal/banner-required`
   - HTML must include an Ashlar, USWDS, or future standards-compatible federal banner marker near the top of the body to satisfy this Ashlar policy pack.
   - Acceptable prototype markers:
     - `<usa-banner>`
     - class containing `usa-banner`
     - class containing `ashlar-banner`
     - `data-ashlar-component="banner"`
   - Help URI: `https://standards.digital.gov/standards/banner/`
   - Current standard status: `pending`

6. `federal/identifier-required`
   - HTML must include an identifier marker to satisfy this Ashlar policy pack.
   - Acceptable prototype markers:
     - class containing `usa-identifier`
     - class containing `ashlar-identifier`
     - `data-ashlar-component="identifier"`
   - Help URI: `https://designsystem.digital.gov/components/identifier/`

7. `federal/identifier-required-link-missing`
   - If an identifier is present, it must include recognizable required-link coverage for:
     - About
     - Accessibility
     - FOIA
     - No FEAR Act
     - Office of Inspector General
     - Performance reports
     - Privacy
   - This prototype may detect by normalized link text and href fragments. It must describe the limitation in `--explain`.

Default severity for pending Federal Website Standards must be `warning`. Ashlar may later support `--strict` or policy configuration to promote warnings to errors. The important v0 behavior is detection, explanation, and SARIF output, not legal enforcement.

### `ashlar design sync`

Purpose: export machine-readable design-system context for coding agents.

Required behavior:

- `ashlar init` writes `DESIGN.md` next to `AGENTS.md`.
- `ashlar design sync` regenerates `DESIGN.md`.
- The template lives in `src/lib/design-context.ts`.
- The generated file must say it is an export, not the canonical source of truth.
- Running `design sync` twice should be idempotent.

Initial content should include:

- name and description;
- action and focus colors;
- typography baseline;
- spacing baseline;
- control radius;
- civic interface guidance;
- do/don't rules for tokens, focus, forced colors, and operational government layouts.

## SARIF Contract

SARIF output must be valid SARIF 2.1.0 and include:

- one rule entry per emitted rule id;
- result entries for each finding;
- `helpUri`;
- warning/error level mapping;
- file URI;
- message text.

If no findings exist, SARIF must still include the Ashlar tool driver and an empty `results` array.

## Testing Requirements

Unit tests:

- registry helper lists Button from `registry/index.json`;
- registry helper loads CEM and evidence;
- registry helper fails clearly for unknown components;
- federal audit flags missing title/meta/banner/identifier;
- federal audit passes a minimal valid shell;
- federal audit reports missing identifier required links;
- SARIF conversion includes rules and results.

Command smoke tests:

- `search button`
- `search button --json`
- `view button`
- `view button --json`
- `evidence button`
- `evidence button --format json`
- `audit --policy federal --explain examples/plain-html/index.html`
- `audit --policy federal --sarif examples/plain-html/index.html`
- `design sync`

Full verification:

```bash
source ~/.nvm/nvm.sh
nvm use 24.15.0
pnpm format:check
pnpm check
pnpm build
```

## Acceptance Criteria

- `pnpm check` passes under Node `24.15.0`.
- `pnpm build` passes under Node `24.15.0`.
- `registry/index.json` exists and is the source of truth for Button discovery.
- `ashlar search button` finds Button.
- `ashlar view button` shows evidence status, platform features, policy mappings, and files.
- `ashlar evidence button --format json` resolves through the registry helper.
- `ashlar add button` still installs and verifies Button in a temporary project.
- `ashlar audit --policy federal --explain examples/plain-html/index.html` flags missing meta description, banner, and identifier in the current example.
- `ashlar audit --policy federal --sarif examples/plain-html/index.html` emits SARIF with non-empty results for those findings.
- `ashlar init` writes `DESIGN.md`.
- `ashlar design sync` is idempotent.
- Button remains `experimental` and `not-reviewed`.
- Documentation examples match actual command behavior.

## Implementation Notes

The existing implementation plan should be revised before execution:

- Add `registry-index.schema.json`; the current plan references a schema URL but does not create the schema.
- Use `policyMappings` consistently; do not mix `policyMapping` and `policyMappings`.
- Replace regex page inspection with `parse5`.
- Make `add` and `evidence` use the registry helper, not only `search` and `view`.
- Add command-level smoke coverage, not just library tests.
- Keep pending federal standards as warnings unless a strict mode is explicitly introduced.

## Primary References

These references were checked on 2026-04-29.

- Federal Website Standards: https://standards.digital.gov/standards/
- HTML page title standard: https://standards.digital.gov/standards/html-page-title/
- Meta page description standard: https://standards.digital.gov/standards/meta-page-description/
- Federal government banner standard: https://standards.digital.gov/standards/banner/
- USWDS Banner: https://designsystem.digital.gov/components/banner/
- USWDS Identifier: https://designsystem.digital.gov/components/identifier/
- Section 508 ICT Testing Baseline Portfolio: https://www.section508.gov/test/ict-testing-baseline-portfolio/
- shadcn CLI: https://ui.shadcn.com/docs/cli
- shadcn registry: https://ui.shadcn.com/docs/registry
- shadcn registry JSON: https://ui.shadcn.com/docs/registry/registry-json
- shadcn components.json: https://ui.shadcn.com/docs/components-json
- Design Tokens Format Module 2025.10: https://www.w3.org/community/reports/design-tokens/CG-FINAL-format-20251028/
- Tailwind theme variables: https://tailwindcss.com/docs/theme
- Custom Elements Manifest: https://github.com/webcomponents/custom-elements-manifest
- MCP 2025-11-25 specification: https://modelcontextprotocol.io/specification/2025-11-25/basic
