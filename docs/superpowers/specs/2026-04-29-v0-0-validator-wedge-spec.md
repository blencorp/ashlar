# v0.0 Validator Wedge Slice Spec

Status: Ready for implementation planning
Date: 2026-04-29
Slice: v0.0, slice 2 (after Standards & Evidence)
Branch: a successor to `codex/standards-evidence-slice` (or follow-on commits on the same branch)

## Purpose

This slice turns the data already shipped in `_ashlar.antiPatterns` into executable rules and gives Ashlar its **adoption wedge**: federal contractors can run `ashlar audit` in CI against an existing project — TSX, JSX, HTML — and get findings without installing any Ashlar components first. That is the lowest-friction federal adoption path: a CI step is easier to land than a runtime dependency.

The slice also makes the polyglot validation claim *honest*. Today the architecture promises ast-grep across ten template languages; ast-grep's real coverage is narrower. This slice ships HTML, TSX, JSX, and CSS (the languages with first-party ast-grep support); marks Vue, Svelte, and Astro as *opt-in via custom-language config*; and explicitly returns `language-unsupported` for Twig, Jinja, and Nunjucks until maintained tree-sitter grammars exist.

## Product bar

This slice must continue the Standards & Evidence slice's discipline:

- **Schema-first**: every CEM `_ashlar.antiPatterns` entry validates against a published JSON Schema before it can be compiled to a rule.
- **Honest support matrix**: the validator declares per-language status and refuses to silently scan languages it does not support.
- **Procurement-grade output**: SARIF carries line and column; findings include WCAG citations and federal-standards links; rule IDs are stable across versions.
- **Standalone-first**: the validator works on existing markup with zero Ashlar components installed.
- **No write tools yet**: the AI write-loop (`migrate apply`, `add_component`) is gated behind a separate threat model and lands in v0.1 or later. This slice is **read-only**.

## Current baseline

Implemented (Slice 1):

- `audit --policy federal` parses HTML with parse5 and runs seven federal page-shell rules.
- SARIF v2.1.0 output with rules, results, file URI, and rule properties.
- `_ashlar.antiPatterns` data exists in Button CEM (`registry/components/button/0.0.1/button.cem.json`) but is not consumed by any runtime.

Important gaps this slice closes:

- No ast-grep integration. Component anti-patterns are documentary, not executable.
- Audit cannot scan TSX, JSX, CSS, or framework files for component anti-patterns.
- SARIF output lacks line/column.
- CI does not run the federal audit on the example HTML files; SARIF artifact is always empty.
- Audit pretends polyglot coverage in docs but cannot scan any non-HTML language.

## Scope

### In scope

1. Bundle ast-grep as `optionalDependencies` per platform (the npm pattern Esbuild and Rollup use). CLI delegates to the bundled binary; postinstall fails loud if no binary matches the platform.
2. CEM-to-ast-grep YAML compiler (`packages/cli/src/lib/policy/component.ts`) reads `_ashlar.antiPatterns` from each capsule and emits ast-grep rule files at audit time.
3. `audit --policy components` runs all component-anti-pattern rules across configured target globs (default: `**/*.{html,tsx,jsx,css}` minus the standard ignores).
4. `audit --policy all` runs both `federal` and `components` policies.
5. Per-language support table in code (`policy/languages.ts`): { html: built-in, tsx: built-in, jsx: built-in, css: built-in, vue: opt-in-with-grammar, svelte: opt-in-with-grammar, astro: opt-in-with-grammar, twig: unsupported, jinja: unsupported, erb: opt-in-with-grammar, nunjucks: unsupported }. Defaults are conservative; opt-in via `ashlar.config.json`.
6. `--explain` extends to component findings: WCAG criterion citation, federal-standards link where applicable, link to the capsule's evidence packet.
7. SARIF carries `region.startLine`, `startColumn`, `endLine`, `endColumn` from parse5 source offsets (federal policy) and ast-grep ranges (component policy). Each rule entry includes `fullDescription`, `helpUri`, and `properties.tags` (one of: `accessibility`, `federal-standard`, `usability`, `security`).
8. `_ashlar` JSON Schema published in `@blen/ashlar-schemas/src/ashlar-cem.schema.json`. Validates `antiPatterns`, `a11yRequirements`, `tokensConsumed`, `platformFeatures`, `policyMappings`, `criticalForA11y`, `rendering`, `hydrationCost`, `selector`, `variants`. CI validates every capsule's CEM against it.
9. CI workflow runs `audit --policy federal --sarif examples/plain-html/index.html` and `audit --policy federal --sarif examples/vite/index.html` and uploads non-empty SARIF.
10. Vite example annotated: a top-of-file comment in `examples/vite/index.html` explains that the example is the audit's *punching bag* and lists which rules it deliberately fails (or, alternatively, the example becomes compliant by adding a banner and identifier — the spec leaves this choice to the implementation plan).
11. Standalone audit distribution: `npx @blen/ashlar audit --policy federal --sarif <file>` works in a fresh empty project with no `ashlar.config.json` or `ashlar-lock.json`.
12. `hasClassToken` substring bug fixed (`packages/cli/src/lib/html.ts:44`): use whole-token equality.
13. `ashlar.config.json` schema (`packages/schemas/src/config.schema.json`) published; the `$schema` URL in generated configs becomes a real pointer.

### Out of scope

- Codemod runner. Codemods can be authored in CEM `_ashlar.codemods` (or a separate `*.codemods.yaml`), but `update --apply-codemods` ships in Slice 3.
- MCP server. `validate_usage` MCP tool is a thin wrapper over the CLI audit and lands in Slice 5.
- Three-way merge / `update` command. Slice 3.
- Sigstore signing. Slice 4.
- Token pipeline inversion (DTCG-as-source). Slice 6.
- New components. Button only.
- Fixing the existing `theme.ts` hardcoded-source inversion. Slice 6.
- DESIGN.md dynamic export. Slice 5.

## Architecture

### Package boundaries

`@blen/ashlar-schemas`:
- New: `ashlar-cem.schema.json` (validates the `_ashlar` namespace).
- New: `config.schema.json` (validates `ashlar.config.json`).
- Index exports the new schema IDs.

`@blen/ashlar-cli`:
- New: `src/lib/policy/component.ts` — CEM → ast-grep rule compiler.
- New: `src/lib/policy/languages.ts` — per-language support matrix.
- New: `src/lib/astgrep.ts` — wrapper around the bundled ast-grep binary.
- Modify: `src/commands/audit.ts` — wire `--policy components` and `--policy all`.
- Modify: `src/lib/sarif.ts` — emit `region.start{Line,Column}` and `region.end{Line,Column}` from finding offsets; emit `fullDescription`, `helpUri`, `properties.tags` per rule.
- Modify: `src/lib/policy/federal.ts` — record source offsets from parse5 nodes and surface them to findings.
- Modify: `src/lib/html.ts` — `hasClassToken` whole-token match.
- New: `src/lib/policy/component.test.ts`, `src/lib/astgrep.test.ts`, `src/lib/policy/languages.test.ts`.

`@blen/ashlar-cli` package.json:
- Add `optionalDependencies` for `@ast-grep/cli-darwin-arm64`, `@ast-grep/cli-linux-x64`, `@ast-grep/cli-win32-x64` (subject to actual ast-grep distribution names).
- Postinstall script that asserts a usable binary is present on supported platforms.

### Dependencies

- `ast-grep` distributed via npm optionalDependencies (the same pattern shadcn, Esbuild, swc use).
- `js-yaml` for emitting ast-grep YAML rule files.
- `ajv` and `ajv-formats` for runtime schema validation in CI (`pnpm --filter @blen/ashlar-schemas validate`).

No browser automation. No new runtime dependencies on the consumer side.

## CEM-to-ast-grep rule compilation

A CEM `_ashlar.antiPatterns` entry has shape:

```json
{
  "id": "icon-only-needs-label",
  "pattern": "<button class=\"ashlar-button\">$ICON</button>",
  "constraint": { "has": "<svg/>", "not_has": "aria-label" },
  "fix": "Add visible text or aria-label.",
  "wcag": "4.1.2",
  "severity": "error",
  "languages": ["html", "tsx", "jsx"]
}
```

The compiler emits an ast-grep rule file:

```yaml
id: ashlar/button/icon-only-needs-label
language: [html, tsx, jsx]
severity: error
message: "Icon-only button requires aria-label (WCAG 4.1.2)"
note: "Add visible text or aria-label."
rule:
  pattern: <button class="ashlar-button">$ICON</button>
  has: { pattern: <svg/> }
  not: { has: { pattern: aria-label="$_" } }
fix: "<button class=\"ashlar-button\" aria-label=\"TODO\">$ICON</button>"
```

Compilation happens at audit time, not at install time, so adding a new component to the registry does not require regenerating the consumer's rule files. The compiler is deterministic; rule files are temp-dir scratch.

`languages` defaults to `["html", "tsx", "jsx"]` if omitted in the CEM. Components can opt their rules into broader coverage when ast-grep grammars exist for the targets.

## Per-language support matrix

`policy/languages.ts` exports a table:

```ts
type LanguageSupport =
  | { status: "first-party" }
  | { status: "opt-in-with-grammar"; grammar: string; configKey: string }
  | { status: "unsupported"; reason: string };

export const languageSupport: Record<string, LanguageSupport> = {
  html: { status: "first-party" },
  tsx:  { status: "first-party" },
  jsx:  { status: "first-party" },
  css:  { status: "first-party" },
  vue:    { status: "opt-in-with-grammar", grammar: "tree-sitter-vue",    configKey: "audit.languages.vue" },
  svelte: { status: "opt-in-with-grammar", grammar: "tree-sitter-svelte", configKey: "audit.languages.svelte" },
  astro:  { status: "opt-in-with-grammar", grammar: "tree-sitter-astro",  configKey: "audit.languages.astro" },
  erb:    { status: "opt-in-with-grammar", grammar: "tree-sitter-embedded-template", configKey: "audit.languages.erb" },
  twig:    { status: "unsupported", reason: "No maintained tree-sitter grammar" },
  jinja:   { status: "unsupported", reason: "Tree-sitter grammar is documented as incomplete" },
  nunjucks:{ status: "unsupported", reason: "No maintained tree-sitter grammar; Jinja-compatible parser is incomplete" },
};
```

When the audit is asked to scan an unsupported language, it emits a `language-unsupported` finding rather than silently passing or crashing. When asked to scan an opt-in language without the user configuring the grammar path, it emits a `language-grammar-missing` finding with config guidance.

This is the "honest polyglot" posture from the philosophy: the validator declares what it can do.

## Standalone-audit posture

The federal audit must work without an `ashlar.config.json` or `ashlar-lock.json`:

```bash
mkdir scratch && cd scratch
echo "<html><body></body></html>" > index.html
npx @blen/ashlar audit --policy federal --sarif index.html
```

This is the federal contractor adoption path. The CLI must not assume the consumer ran `init` first; it must not crash on missing config; it must use safe defaults. This behavior is unit-tested.

The component-anti-pattern audit (`--policy components`) requires either an `ashlar-lock.json` (for installed components) or a `--registry` flag pointing at a registry index (for arbitrary components). The latter is the "lint USWDS markup against Ashlar capsule rules" use case; the former is the standard installed-components audit.

## SARIF enrichments

Every rule entry now includes:

- `id` (stable across versions; e.g. `ashlar/button/icon-only-needs-label`)
- `name` (camelCase; e.g. `iconOnlyNeedsLabel`)
- `shortDescription.text`
- `fullDescription.text` (longer; from CEM `note` or anti-pattern `message`)
- `helpUri` (component evidence URL or federal-standards link)
- `properties.tags` (e.g. `["accessibility", "wcag-4.1.2"]`)
- `properties.standardStatus` (`pending`/`draft`/`required`/`guidance`/`research` for federal rules)

Every result entry now includes:

- `ruleId`
- `level` (`error`/`warning`/`note`)
- `message.text`
- `locations[].physicalLocation`:
  - `artifactLocation.uri`
  - `region.startLine`, `startColumn`, `endLine`, `endColumn`

This is the minimum needed for GitHub Code Scanning inline annotations to work.

## Honest CI

`.github/workflows/ci.yml` is updated:

```yaml
- run: node packages/cli/dist/index.js audit --policy federal --sarif examples/plain-html/index.html examples/vite/index.html > ashlar.sarif
```

Today's no-op `audit --sarif` produces empty SARIF; the new step produces non-empty SARIF when violations exist (which they do, in the current Vite example).

## CLI surface

```bash
# Federal page-shell rules (already shipped in slice 1; gains line/col here)
ashlar audit --policy federal --explain --sarif <files...>

# Component anti-patterns (new in this slice)
ashlar audit --policy components --explain --sarif <files...>

# Both
ashlar audit --policy all --explain --sarif <files...>

# Standalone, no install required
npx @blen/ashlar audit --policy federal --sarif <files...>

# Languages opt-in via config (only docs change here; runtime support is wired)
{ "audit": { "languages": { "vue": { "grammar": "tree-sitter-vue" } } } }
```

## Testing requirements

Unit tests:
- CEM-to-ast-grep YAML compiler emits expected rule for Button's `icon-only-needs-label` anti-pattern.
- `hasClassToken` is now whole-token (`ashlar-banner-secondary` does not match `ashlar-banner`).
- Per-language support table returns expected statuses.
- ast-grep wrapper correctly invokes the bundled binary; degrades cleanly when binary is missing.
- SARIF includes `region.startLine` for federal findings (parse5 offsets).
- SARIF includes `region.startLine` for component findings (ast-grep ranges).
- `audit` against an unsupported language emits `language-unsupported` finding rather than silently passing.

Command smoke tests:
- `audit --policy federal examples/plain-html/index.html` (existing).
- `audit --policy components --registry ./registry examples/plain-html/index.html`.
- `audit --policy all --sarif examples/plain-html/index.html`.
- `audit --language twig file.twig` returns the unsupported finding.
- Standalone in scratch dir: `node packages/cli/dist/index.js audit --policy federal --sarif scratch.html` works without config or lockfile.

CI:
- Federal audit on `examples/` produces non-empty SARIF when violations exist.
- `_ashlar` schema validation passes for Button CEM.
- `pnpm check` includes the new schema validation step.

## Acceptance criteria

- ast-grep is bundled and invokable from `@blen/ashlar-cli`.
- `audit --policy components` flags Button's `icon-only-needs-label` against an HTML and a TSX fixture.
- `--explain` shows WCAG 4.1.2 citation for the button anti-pattern and a federal-standards link for federal findings.
- SARIF line/column appear in GitHub Code Scanning inline annotations (verified by uploading to a test repo).
- `audit --language twig` returns `ashlar/language-unsupported` and exits with code 0 (it is not an error to be asked to scan an unsupported language; it is reported clearly).
- `hasClassToken` whole-token bug is fixed; tests added for the false-positive case.
- `_ashlar` JSON Schema published; CI validates Button CEM.
- `ashlar.config.json` `$schema` resolves to a real schema file.
- Vite example either passes the federal audit or is annotated as a deliberate punching bag.
- CI uploads non-empty SARIF when violations exist in `examples/`.
- Documentation matches behavior; `STATUS.md` updated to reflect what slice 2 implemented.

## Implementation notes

- ast-grep distributes platform binaries on npm under `@ast-grep/*`. Use the same pattern shadcn uses for Tailwind binaries: `optionalDependencies` per platform, postinstall asserts presence.
- The CEM-to-ast-grep compiler should be transparent: `audit --print-rules` emits the compiled YAML to stdout for debugging.
- Keep the federal policy pack and the component policy pack as separate concerns that can be audited independently. `--policy all` is sugar for invoking both.
- The Twig/Jinja/Nunjucks "unsupported" finding should suggest a path forward: "Twig grammar is not yet maintained; contribute one at <link to tree-sitter org guide>." This makes the limitation actionable rather than opaque.
- This slice should also update `architecture/validation.md` to replace the polyglot table with the live support matrix from `policy/languages.ts`.

## Primary references

- ast-grep documentation: https://ast-grep.github.io/
- ast-grep custom languages: https://ast-grep.github.io/advanced/custom-language.html
- tree-sitter language coverage: https://tree-sitter.github.io/tree-sitter/
- Custom Elements Manifest schema: https://github.com/webcomponents/custom-elements-manifest
- SARIF v2.1.0 spec: https://docs.oasis-open.org/sarif/sarif/v2.1.0/sarif-v2.1.0.html
- WCAG 2.2: https://www.w3.org/TR/WCAG22/
- npm optionalDependencies for platform binaries: https://docs.npmjs.com/cli/v10/configuring-npm/package-json#optionaldependencies
