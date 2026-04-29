# Architecture overview

This document describes the layered architecture, the atomic unit (the capsule), the registry and CLI, the validation model, and the AI integration. Detailed documents for each subsystem live alongside this one in the [`architecture/`](./) folder.

For the current implementation foundation, see [`toolchain.md`](./toolchain.md). For the agency-facing validation, security, and CI surface, see [`compliance-security-ci.md`](./compliance-security-ci.md).

## The five layers

Ashlar is organized as five independently usable layers. Each layer has a clear contract; consumers can adopt one without adopting the others.

```
┌─────────────────────────────────────────────────────────┐
│ L4 │ Templates    Nunjucks / Twig / Jinja / ERB / HTML  │
├─────────────────────────────────────────────────────────┤
│ L3 │ Patterns     Service flows: eligibility, upload,   │
│    │              address-form, identity-shell, etc.    │
├─────────────────────────────────────────────────────────┤
│ L2 │ Adapters     Auto-generated from CEM:              │
│    │              @ashlar/react, @ashlar/vue, …          │
├─────────────────────────────────────────────────────────┤
│ L1 │ Components   Lit custom elements wrapping Zag      │
│    │              statecharts + signals (~30% of items) │
├─────────────────────────────────────────────────────────┤
│ L0 │ Foundation   Pure CSS + HTML capsules; exploits    │
│    │              modern platform (~70% of items)       │
├─────────────────────────────────────────────────────────┤
│      Tokens (DTCG 2025.10) → CSS vars / Tailwind / TS   │
└─────────────────────────────────────────────────────────┘
```

### L0 — Platform-driven foundation

Pure CSS and HTML. No JavaScript runtime dependency. Components are class-based with semantic data attributes. Styling is delivered via cascade layers and CSS variables.

This layer covers approximately 70% of typical design-system components in 2026, including:

- Button, Link, Badge, Tag
- Card, Banner, Identifier, Alert
- Form Field (Label + Input + Error), TextInput, Textarea, Checkbox, Radio, Select
- Dialog (`<dialog>`), Tooltip / Popover (popover API + anchor positioning), Accordion (`<details name>`)
- Layout primitives (Stack, Grid, Cluster, Switcher)
- Skip link, Focus ring utility, Visually-hidden utility

L0 components work in any rendering environment: React, Vue, Astro, plain HTML, Drupal, Sitecore, AEM, server-rendered Django/Rails/PHP. The same CSS and the same DOM contract.

### L1 — Stateful Web Components

Lit-based custom elements. Each component wraps a Zag statechart (the behavior) and signals (the reactive data). The component is a thin shell that defines the custom element, handles SSR via Declarative Shadow DOM where needed, subscribes to the machine, and renders DOM updates.

L1 covers the components that genuinely need JavaScript state:

- ComboBox / Autocomplete (rich)
- Date Picker (range, restricted, fiscal calendars)
- Data Table (sort, filter, virtualize)
- File Upload (chunked, resumable, drag-drop)
- Toast stack
- Tree, Tree Grid
- Multi-select / Tag Input
- Stepper Wizard with cross-step validation

Light DOM is the default for theming compatibility; Shadow DOM is used only when encapsulation is genuinely required (and Declarative Shadow DOM serializes for SSR).

### L2 — Framework adapters (auto-generated)

Thin per-framework wrappers generated from each component's Custom Elements Manifest:

- `@ashlar/react` — idiomatic React props, event handlers, refs
- `@ashlar/vue` — Vue 3.5+ composition API + slots
- `@ashlar/svelte` — Svelte 5 runes
- `@ashlar/solid` — Solid signals
- `@ashlar/element` — the Lit custom element itself, for plain HTML / Drupal / Sitecore consumers

Adapters are not hand-maintained. When the underlying machine or component changes, adapters regenerate. There is no parallel React tree drifting from the canonical implementation.

### L3 — Patterns

Composed service flows shipped as capsules. Each pattern includes the components it composes, plain-language content guidance, accessibility considerations specific to the flow, and user-research notes.

Initial patterns:

- Eligibility check
- Document upload
- Address form (with autocomplete and country-specific formatting)
- Account creation
- Feedback widget
- Emergency alert
- Identity verification shell (the UX shell only — does not bind to Login.gov)

### L4 — Templates

The same component rendered into multiple template languages. This is the answer to GOV.UK's empirical observation that government uses 24+ templating languages: instead of forcing teams to switch, ship the rendering they need.

Initial template targets:

- Nunjucks (USWDS interop, generic JS)
- Twig (Drupal, Symfony)
- Jinja (Python / Django / Flask)
- ERB (Rails)
- Plain HTML
- React JSX (via L2)

Same CSS, same DOM contract, multiple renderings.

## The atomic unit: a Capsule

A capsule is a content-addressed bundle of everything needed to use, verify, update, and reason about a component. The registry serves capsules; the CLI installs them; everything else hangs off this format.

```
button/
├── button.css                # @layer ashlar.components, @scope
├── button.html.njk           # Nunjucks template (canonical HTML)
├── button.html.twig          # Twig template
├── button.html               # plain HTML example
├── button.element.ts         # Lit custom element (L1 only)
├── button.machine.ts         # Zag statechart (L1 only)
├── button.cem.json           # extended Custom Elements Manifest
├── button.evidence.json      # axe runs, keyboard transcripts, WCAG map
├── button.codemods.yaml      # ast-grep rules for upgrades
├── button.test.ts            # Playwright/axe tests
├── button.docs.md            # human + AI documentation
└── button.checksum.txt       # content hash
```

Each capsule is signed via Sigstore. The lockfile records the signature; `ashlar verify` checks all installed capsule files against recorded signatures.

See [`capsule.md`](./capsule.md) for the full capsule schema and content-addressing rules.

## Registry and CLI

The registry is the catalog of capsules. It is served two ways:

- **Primary**: HTTP JSON over a CDN (the shadcn pattern, easy to consume from any environment).
- **Secondary**: signed Git tags of the registry repository, for air-gapped federal mirrors.

The CLI is a pure Node + ESM tool, distributed via npm and runnable via `npx`, `pnpm dlx`, `yarn dlx`, `bunx`, or `deno run`. Package manager detection uses `nypm`. We do not ship Bun-compiled binaries; some federal IT environments cannot whitelist arbitrary binaries.

```bash
# Day 1
npx ashlar init                       # writes ashlar.config.json + tokens + lockfile
npx ashlar add button alert dialog    # adds L0 capsules — pure CSS, zero JS
npx ashlar add combobox               # adds an L1 capsule (Lit + Zag)

# Day 30
npx ashlar update                     # safe 3-way merge for any drift
npx ashlar audit                      # ast-grep validation across the project
npx ashlar evidence button            # show me the a11y evidence

# Day 90
npx ashlar theme new my-agency        # scaffold custom DTCG theme
npx ashlar verify                     # signature/supply-chain check
npx ashlar mcp                        # start MCP server for Cursor/Claude/etc.
```

## Drift management — the lockfile and three-way merge

shadcn's most-cited unfixed problem is that copied components drift after install with no safe upgrade path. Ashlar's lockfile and three-way merge is the direct fix.

```json
// ashlar-lock.json
{
  "registry": "https://registry.ashlar.dev",
  "components": {
    "button": {
      "version": "1.2.3",
      "capsule_hash": "sha256:abc...",
      "installed_at": "2026-04-27T10:00:00Z",
      "signature": "sigstore:...",
      "files": {
        "src/components/ashlar/button.css": {
          "original_hash": "sha256:def...",
          "current_hash": "sha256:def..."
        }
      }
    }
  }
}
```

`ashlar update button`:

1. Hash each local file. If matches `original_hash`, no local edits — replace cleanly.
2. If hashes differ, fetch the original (at locked version) and the new version from the registry, then run `git merge-file --diff3 local original new`.
3. If the merge is clean, write the result and update the lockfile.
4. If conflicts, present `<<<<<<< / >>>>>>>` markers for the user to resolve, then update the lockfile.
5. If a touched file is tagged `accessibility: critical` in the CEM, force confirmation even on a clean merge.

`git merge-file` ships with Git. No new dependencies. Codemods for breaking changes ship as ast-grep YAML rules in the capsule.

See [`drift-and-updates.md`](./drift-and-updates.md) for the full update protocol, conflict resolution UX, and codemod specification.

## Validation — polyglot, framework-agnostic

`ashlar audit` runs ast-grep rules generated from each component's CEM. ast-grep is a tree-sitter-based AST tool with a YAML rule DSL that handles TSX, JSX, Vue SFCs, Svelte, Astro, plain HTML, and Drupal Twig from the same rule.

```yaml
# Generated from button.cem.json _ashlar.anti_patterns
id: ashlar/button-icon-only-needs-label
language: [tsx, jsx, vue, svelte, astro, html, twig]
rule:
  pattern: <ashlar-button>$ICON</ashlar-button>
  has:
    pattern: <svg/>
  not:
    has:
      pattern: aria-label="$_"
message: "Icon-only Button requires aria-label (WCAG 4.1.2)"
fix: '<ashlar-button aria-label="TODO">$ICON</ashlar-button>'
```

ast-grep is distributed as a single Rust binary (~3MB). No JS dependency tree, no framework coupling, no build-pipeline integration required. CI integration is one line; pre-commit hook integration is one line.

See [`validation.md`](./validation.md) for the rule generation pipeline, integration patterns, and CEM-to-rule mapping.

## AI integration

Three artifacts, each does one thing:

1. **Extended CEM** (`ashlar-cem.json` aggregated from installed capsules) — the structured contract. Includes variants, anti-patterns, accessibility constraints, token consumption, rendering classification, and canonical examples. This is consumed by Storybook MCP, our own MCP server, AI editor integrations, and code generators.

2. **AGENTS.md** in the project root — coding-agent instructions for using Ashlar correctly in the user's codebase. Symlinked from `CLAUDE.md`, `.cursor/rules/ashlar.mdc`, and `.windsurfrules` to cover the editor fragmentation.

3. **MCP server** at `npx ashlar mcp` — exposes tools that go beyond shadcn's install-only MCP:
   - `search_components(query)` — semantic search across capsules
   - `get_component(name)` — full extended CEM
   - `validate_usage(file_or_glob)` — runs ast-grep rules, returns violations
   - `suggest_for_task(description)` — capsule recommendations from natural-language intent
   - `migrate(component, from, to)` — runs codemods between versions
   - `get_evidence(name)` — accessibility evidence packet
   - Resources: `capsule://`, `token://`, `pattern://`, `evidence://`

The killer differentiators versus shadcn's MCP are `validate_usage` and `migrate`. Carbon shipped its MCP with similar tools in February 2026; this is the right shape.

See [`ai-native.md`](./ai-native.md) for the extended CEM schema, MCP tool specifications, and AGENTS.md template.

## Tokens

Source format: DTCG 2025.10 (the Design Tokens Community Group format reached first stable in October 2025).

Compiler: Terrazzo (most complete DTCG support in 2026; Style Dictionary is the fallback).

Outputs:

- `tokens.css` — primitive tokens as CSS custom properties
- `theme.css` — semantic tokens with `light-dark()` for mode switching
- `mode-hc.css`, `mode-forced.css` — high-contrast and forced-colors overrides
- `tailwind.css` — Tailwind v4 `@theme` block (optional consumer)
- `tokens.ts` — typed TypeScript token names
- `tokens.figma.json` — Figma variables for design-tool sync

Tokens use modern color spaces (`oklch()`, `color-mix()`, `light-dark()`) so a single token set generates light, dark, and high-contrast palettes without JavaScript:

```css
@layer ashlar.tokens {
  :root {
    --ashlar-action-primary-bg:
      light-dark(oklch(0.48 0.16 250), oklch(0.68 0.16 250));
    --ashlar-surface-default:
      light-dark(white, oklch(0.18 0.02 260));
  }
}
```

No theme-toggle JavaScript. No re-mounting. The browser handles it.

See [`tokens.md`](./tokens.md) for the full token hierarchy, agency theme contract, and contrast validation rules.

## Accessibility

Engineering target: **WCAG 2.2 AA** where practical. Federal Section 508 incorporates WCAG 2.0 AA; ADA Title II web/mobile rules reference 2.1 AA; the European Accessibility Act enforced June 2025 references 2.1 AA via EN 301 549. Targeting 2.2 AA is forward-looking without overpromising compliance.

Every stable component ships an evidence packet:

```json
{
  "component": "dialog",
  "version": "1.0.0",
  "wcag": [
    { "criterion": "2.1.1", "status": "pass", "evidence": "keyboard.spec.ts" },
    { "criterion": "2.4.3", "status": "pass", "evidence": "focus-order.spec.ts" },
    { "criterion": "4.1.2", "status": "pass", "evidence": "manual-screen-reader.md" }
  ],
  "manualTests": [
    { "tech": "NVDA", "browser": "Firefox", "date": "2026-04-24", "result": "pass" },
    { "tech": "VoiceOver", "browser": "Safari", "date": "2026-04-24", "result": "pass" }
  ],
  "knownLimitations": []
}
```

Evidence is machine-readable. AI tools can ground accessibility claims in it. Auditors can review it. Component status pages display it.

See [`accessibility.md`](./accessibility.md) for the test matrix, evidence schema, and stable-component gates.

## Future architecture

Several architectural primitives shape the long-term direction without being in the v0.0 scope:

- **Signals as the reactive layer** — TC39 Signals is in Stage 1; Solid, Preact, Vue, and Angular all align with the proposal. L1 components use signals internally. When TC39 Signals lands as a platform standard, Ashlar components migrate without breaking changes.

- **Resumability-friendly serialization** — L1 components' machine state should serialize to data attributes so the entire SSR + client-takeover flow can resume without re-execution. This is a discipline now; an exploitation later.

- **Event-sourced patterns** — government audit requirements often need full reconstructibility. L3 patterns for forms / wizards / eligibility flows should be designable as event-sourced; the design system should ship at least one canonical example.

- **Effect systems for accessibility constraints** — typed effects (Effect-TS or descendants) could enforce accessibility requirements at the type level. Research track for v0.3+.

- **CRDT-friendly collaborative patterns** — multi-user government workflows (case management, collaborative review) benefit from CRDT-based local-first sync. Patterns layer should support these consumers.

See [`future-architecture.md`](./future-architecture.md) for the detailed evaluation of each frontier and the conditions under which we adopt them.

## Bundle budget

The "lightweight" claim must be backed by real numbers. Targets for a typical 5-component page (Button + FormField + Alert + Dialog + Banner):

| Stack | Gzipped JS+CSS |
|---|---|
| Ashlar L0 only (CSS+HTML) | **6–8 KB** |
| Ashlar L0 + 1 L1 (Combobox) | 12–15 KB |
| shadcn/ui (Tailwind + Radix) | 40–55 KB |
| Carbon Web Components | 50–70 KB |
| Spectrum Web Components | 60–90 KB |

Ashlar is targeting 5–10× smaller than the alternatives for typical government pages. Not by cutting features — by exploiting the platform.

## What follows

The remaining architecture documents detail each subsystem:

- `capsule.md` — capsule schema, content addressing, signing
- `tokens.md` — DTCG hierarchy, agency theming, contrast policy
- `state-management.md` — Zag statecharts, signals, machine authoring
- `web-components.md` — Lit shell, DSD, framework adapter generation
- `drift-and-updates.md` — lockfile, three-way merge, codemods
- `validation.md` — ast-grep, rule generation, polyglot support
- `ai-native.md` — extended CEM, MCP server, AGENTS.md
- `accessibility.md` — evidence schema, test matrix, stable gates
- `distribution-and-registry.md` — HTTP, signed Git, Sigstore, air-gapped
- `patterns-and-templates.md` — L3 / L4 spec
- `future-architecture.md` — signals, resumability, effects, event-sourcing, CRDTs
