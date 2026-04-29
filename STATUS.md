# STATUS

The honest, live index of what Ashlar implements, what is experimental, and what is planned. Every claim in `README.md`, `docs/strategy.md`, `docs/philosophy.md`, and the architecture docs should be consistent with this file. When a doc and STATUS disagree, STATUS is canonical.

Date: 2026-04-29
Phase: v0.0 prototype
Branch: `codex/standards-evidence-slice`

## Implemented today

These are wired up, tested, and run as documented.

- `ashlar init` — writes `ashlar.config.json`, an empty `ashlar-lock.json`, three default agency themes (Federal, VA, USDA) as DTCG-shaped JSON files plus a generated `theme.css`, an `AGENTS.md` template, a `DESIGN.md` template, and a generated `src/ashlar/ashlar.css` entrypoint.
- `ashlar add <component>` — resolves a component from the local registry, copies all capsule files into the consumer project, computes per-file SHA-256, writes the lockfile entry, regenerates the consumer's bundled CSS and indexes.
- `ashlar audit --policy federal [files...]` — parses HTML with parse5, runs seven federal page-shell rules (page title presence and length, meta description presence and length, federal banner near the top of body, identifier presence, identifier required-link coverage). SARIF carries line/column from parse5 source offsets. Rule entries include `fullDescription`, `help`, and `properties.tags`. **Standalone-friendly**: works in a fresh project without `ashlar.config.json` or `ashlar-lock.json`.
- `ashlar audit --policy components [files...]` — runs CEM `_ashlar.antiPatterns` rules via [ast-grep](https://ast-grep.github.io/) over HTML/TSX/JSX/CSS files. Returns `language-unsupported` cleanly for Twig/Jinja/Nunjucks rather than silent pass. Button capsule's `icon-only-needs-label` rule is wired and detects icon-only buttons missing `aria-label` in real markup.
- `ashlar audit --policy all [files...]` — runs federal and component policies together.
- `ashlar verify` — re-hashes installed files and compares against `original_hash` in the lockfile. Reports missing files as errors and local edits as warnings.
- `ashlar evidence <component>` — prints the component's evidence packet from the registry helper, with `--format text|json`.
- `ashlar search [query]` — substring search over the registry index name and description fields.
- `ashlar view <component>` — prints tier, layer, stability, evidence status, platform features, policy mappings, and capsule files.
- `ashlar design sync` — overwrites `DESIGN.md` from a static template (does not yet incorporate theme or installed-component state — see Known Gaps).
- `@ashlar/schemas` — JSON Schema 2020-12 documents for capsule, evidence, lockfile, registry-index, **`_ashlar` namespace (`ashlar-cem.schema.json`)**, and **ashlar config (`config.schema.json`)**. Validated at runtime in `@ashlar/cli` via Ajv 2020 + ajv-formats; tests assert Button CEM, evidence packet, and registry index validate.
- `registry/index.json` — local source of truth for registry discovery.
- `registry/components/button/0.0.1/` — one capsule with `button.css`, `button.html`, `button.cem.json`, `button.evidence.json`. Status: `experimental`, evidence `not-reviewed`. CEM `_ashlar.antiPatterns` are now ast-grep-native (pattern + regex + has + not + languages).
- CI workflow — runs `pnpm check`, `pnpm build`, and `ashlar audit --policy federal --sarif examples/plain-html/index.html`, uploading SARIF as an artifact and to GitHub Code Scanning.
- `examples/plain-html/` — federal-compliant reference page shell (banner, identifier with required links, page title, meta description) demonstrating the Button capsule. Used as the CI audit target; passes `audit --policy federal` with zero findings.
- `examples/vite/` — federal-compliant Vite reference app with a live agency theme picker (Default, VA, USDA), light/dark/system mode, and live token introspection. Auto-discovers themes from `src/ashlar/themes/*.tokens.json` via `import.meta.glob`. Passes `audit --policy all` with zero findings.
- `apps/www/` — marketing landing page. Vite + TypeScript scaffold with Ashlar tokens and a real Button capsule for CTAs. Hero, three-pillars, standards alignment, USWDS posture, status note. Hosted on `127.0.0.1:4174` in dev. Not subject to federal audit (it is OSS marketing copy, not a federal-page demo).

## Experimental (in code, not stable)

- **Federal policy pack rules**. The seven rules cover the standards.digital.gov pending standards (banner, title, meta description) and USWDS/M-23-22 trust markers (identifier, required links). Default severity is `warning` with `standardStatus` tracked per finding so SARIF consumers can filter.
- **Component anti-pattern rules**. Slice 2 ships one rule (`ashlar/button/icon-only-needs-label`); additional component rules ship as new components are added. ast-grep custom-language registration (Vue, Svelte, Astro, ERB) is documented but not yet wired in CLI.
- **Lockfile drift detection**. `verify` detects local edits but `current_hash` is never refreshed after install (it is seeded equal to `original_hash` and not updated). The lockfile substrate exists for three-way merge; the merge protocol does not.
- **Theme generation**. Three themes are hardcoded in TypeScript (`packages/cli/src/lib/theme.ts`). The DTCG JSON files written by `init` are downstream artifacts, not the source of truth — editing them does not regenerate the CSS. The promised DTCG-as-source pipeline is planned, not implemented.
- **AGENTS.md template**. Generated by `init` but not customized per-project (does not enumerate installed components from lockfile). Symlink fanout to `CLAUDE.md`, `.cursor/rules/ashlar.mdc`, `.windsurfrules`, `.continuerules`, `.github/copilot-instructions.md` is not implemented (slice 5).
- **DESIGN.md export**. `design-context.ts` is a static template with hardcoded federal blue (`#005EA8`); does not reflect the chosen theme or installed components.

## Planned for v0.0 (not yet built)

These are what the v0.0 gate requires before public alpha. Each is a slice spec that lands on this branch (or a successor) before v0.0 is declared complete. See [roadmap/01-v0.0-foundation.md](docs/roadmap/01-v0.0-foundation.md) for the slice graph.

- ~~**Validator wedge**~~ **Shipped 2026-04-29** (slice 2, code-only). ast-grep via @ast-grep/napi; CEM-to-rule compiler; `audit --policy components`, `--policy federal`, and `--policy all`; per-language support matrix returns `language-unsupported` for Twig/Jinja/Nunjucks; SARIF carries line/column; standalone audit works without config or lockfile (regression test in `audit.test.ts`); published `ashlar-cem.schema.json` and `config.schema.json` validated at runtime via Ajv. *Spec*: [validator-wedge-spec](docs/superpowers/specs/2026-04-29-v0-0-validator-wedge-spec.md).
  - **Distribution caveat**: the *verbs* work; the *delivery path* that lets a federal contractor run `npx @ashlar/cli audit` without cloning this repo is gated on slice 4 (supply-chain hardening — npm publish, npm provenance, signed releases). Until slice 4 ships, the validator wedge is demonstrable from a local checkout but not consumable from npm by external teams. Strategy.md's contractor-wedge framing is target state, not present state.
- **Drift management prototype** — `update` command; `git merge-file --diff3` per-file three-way merge; codemod runner via ast-grep apply; accessibility-critical force-confirmation; instrumented test scenarios with conflict-rate measurement and merge-correctness sampling.
- **Supply-chain hardening** — capsule manifest (`*.capsule.json`) published as a real file in the registry; capsule_hash computed registry-side and embedded in the index; Sigstore signing via CI workflow with OIDC identity; `verify` validates signatures against the embedded chain; air-gapped operation via bundled trust root; supply-chain incident playbook documented.
- **AI contracts** — MCP server with read-only tools (`search_components`, `get_component`, `get_evidence`, `list_tokens`, `validate_usage`); CEM `_ashlar` JSON Schema enforced in CI; AGENTS.md sync from lockfile; symlink fanout to editor-specific files (or copy fallback on Windows).
- **Token pipeline** — DTCG JSON as the source of truth; compiler reads JSON and emits CSS variables, Tailwind v4 `@theme` blocks, and typed TypeScript; contrast validation; canonical CSS variable namespace pinned in one place.
- **Honest CI** — CI runs `audit --policy federal` against `examples/`; the SARIF artifact is non-empty when violations exist.

## Planned for v0.1+

- 8-12 L0 components with tiered evidence (stable = axe + keyboard + 1 SR; LTS = full NVDA + JAWS + VoiceOver matrix).
- L1 substrate research: production-grade statechart library evaluation, with Lit + Zag treated as a research bet pending production prior art.
- One L3 pattern (eligibility check) with content guidance, multilingual placeholder, feedback hook.
- L4 templates: Nunjucks first; others when grammar coverage exists.
- React adapter generated from CEM.
- Independent third-party accessibility audit of the v0.1 component set.
- Foundation home (Linux Foundation Public Health, OpenJS, or civic-tech foundation) and at least three contributing organizations.
- npm trusted publishing configured; npm provenance attestations on every release.

## Explicitly out of scope or deferred

- ast-grep coverage for Twig, Jinja, and Nunjucks until maintained tree-sitter grammars exist. The validator returns `language-unsupported` for these targets and the polyglot claim is scoped to languages with real coverage.
- Vue, Svelte, Solid adapters — defer to v0.2.
- Date Picker, Data Grid, full Combobox, AI Assistant Panel — defer until the substrate is proven.
- Effect-typed accessibility, resumability, CRDTs, event-sourced forms — research track for v0.3+.
- "USWDS replacement" framing — Ashlar interoperates with USWDS rather than replacing it.

## Known gaps and bugs

These are tracked failures that should be fixed before public launch. They are not the same as planned-but-unbuilt features above; they are mistakes or shortcuts that need correction.

- ~~`hasClassToken` substring match~~ **Fixed 2026-04-29**: whole-token equality, regression test added.
- ~~Vite example failing its own audit~~ **Reframed 2026-04-29**: `examples/plain-html/` is now the federal-compliant CI audit target; vite is explicitly a theme workbench, not a federal page.
- ~~CI workflow always-empty SARIF~~ **Fixed 2026-04-29**: CI runs `audit --policy federal --sarif examples/plain-html/index.html`.
- ~~AGENTS.md references nonexistent Link~~ **Fixed 2026-04-29**.
- ~~SARIF region~~ **Fixed 2026-04-29 (slice 2)**: parse5 source offsets thread through to `region.startLine/startColumn/endLine/endColumn`; ast-grep ranges do the same for component findings.
- ~~`ashlar.config.json` schema dangling pointer~~ **Fixed 2026-04-29 (slice 2)**: `config.schema.json` is published in `@ashlar/schemas` and validated at runtime by Ajv.
- Token namespace inconsistency between `architecture/overview.md` (`--ashlar-action-primary-bg`) and `architecture/tokens.md` (`--ashlar-color-action-primary-bg`); pin the canonical form. **Slice 6 (token pipeline) work.**
- `radius.control` is consumed by the Button CEM but not defined in `architecture/tokens.md`. **Slice 6 work.**
- Governance doc reads as if multi-organization maintenance and funded maintainer line already exist; soften to "will" / "is committed to" until those conditions are met. **GitHub-launch-readiness gate work.**

## Documentation factual corrections applied 2026-04-29

The following claims appeared in earlier docs and have been corrected:

- "Carbon shipped its MCP with similar tools in February 2026" — false; the cited artifact is a community proposal awaiting Carbon-team feedback. References updated in `architecture/ai-native.md`, `architecture/overview.md`, and `adr/adr-0008-ai-native-protocol.md`.
- "DTCG 2025.10 reached first stable" — true but elides that it is a Community Group Final Report, not a W3C Recommendation. Hedge added.
- "Lit + Zag" prior art — none exists in production; Zag has no `@zag-js/vanilla` package. Treated as a research bet, not a settled pattern, in `adr/adr-0010-framework-strategy.md` and risks.
- "Polyglot validation across TSX, JSX, Vue, Svelte, Astro, HTML, Twig, Jinja, ERB, Nunjucks" — ast-grep's real coverage is narrower; the validation doc now ships a live support table with status per language.
- "Web Components are a durable differentiator" — softened given USWDS 3.13's `usa-banner` Web Component direction.
- L0 markup contract examples — swept across architecture docs to consistently use `<button class="ashlar-button">` per ADR-0011.
- "GOV.UK 24+ template languages" — attributed to the alphagov frontend survey (March 2019); used as historical evidence, not present-tense observation.
