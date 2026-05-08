# Philosophy

The thesis, the design principles, what we will and will not build, and the bar we hold ourselves to.

## Thesis

> Build the smallest, sharpest, most accessible, most verifiable substrate for federal-standards web interfaces by leaning on the modern web platform aggressively, treating component behavior as a portable contract, making source ownership safely updateable, and shipping verification before components.

Ashlar is not a React component library, a Tailwind theme, a USWDS clone, or a "next USWDS." It is supply-chain and validation infrastructure — `audit`, `sign`, `verify`, `update`, `evidence` — with a registry of evidence-backed component capsules layered on top of those primitives. Verification is the first pillar; components are the second.

The goal is to make the simplest substrate that solves modern federal UI delivery better than any current alternative, without locking teams into a framework, a styling system, or an authoring layer they did not choose, and without claiming what cannot be verified.

## What we are reacting to

Three reference points define the design space:

**USWDS.** Strong civic philosophy and accessibility discipline. Real adoption gap (less than 20% of federal websites). Aging delivery model — HTML snippets as the official API, Sass/Gulp build chain, limited framework support, no signed registry, no machine-readable evidence schema, no AI-readable contract. USWDS 3.13 introduced a Web Component variant for Banner with Lit; the direction is real but narrow today. USWDS is not the problem. The problem is the layer beneath it: agencies still solve framework, update, validation, signing, and AI-readability questions on their own.

**shadcn/ui.** Reframed component distribution as source ownership. Strong developer trust and AI affordance. Three years of unfixed production complaints: drift after install (discussion #790, open since 2023), no accessibility evidence, Tailwind coupling, sole-maintainer fragility, registry built for installation but not governance. shadcn proved the distribution model and the maintenance gap simultaneously.

**The 2026 web platform.** Native CSS now delivers what a 2022 design system needed JavaScript for: cascade layers, container queries, `:has()`, `<dialog>`, popover API, anchor positioning, `@scope`, `light-dark()`, `oklch()`, native form validation. Roughly 70% of typical design-system components can ship as semantic HTML + CSS with zero or trivial JavaScript.

We are reacting to the gap between what USWDS could be on a modernized substrate, what shadcn left unfixed, and what the platform now makes possible.

## Design principles

### 1. Verbs before adjectives

We describe Ashlar with what it does — *audit*, *sign*, *verify*, *update*, *evidence* — not what it claims to be. "AI-native," "evidence-backed," "government-grade," and "supply-chain provenance" are the words that have to be earned by working code. Until they are, we say what is real and link to [STATUS.md](STATUS.md).

### 2. The platform is the design system

In 2026, declarative web standards do most of what design-system JavaScript used to do. Modal? `<dialog>`. Popover? `popover` attribute. Anchored positioning? `anchor-name`. Theme switching? `light-dark()`. Form state styling? `:has(:invalid)`. Accordion? `<details name>`. Focus trap? `inert`.

Default to the platform. Reach for JavaScript only where the platform genuinely cannot — and document that decision per component with a baseline tier and a fallback strategy.

### 3. Markup primitives ship semantic HTML, not custom elements

Markup primitive capsules use platform HTML plus Ashlar classes and data attributes as the canonical DOM contract: `<button class="ashlar-button" data-variant="primary">`, not `<ashlar-button>`. This is the contract that survives across React, Vue, Astro, plain HTML, Drupal, Sitecore, Rails, Django, and other server-rendered stacks. Custom elements are reserved for interactive components that genuinely need JavaScript behavior. See [ADR 0011](adr/adr-0011-markup-primitive-contract.md).

### 4. Source ownership requires safe updates

Source-distributed components without an update path become unmaintained forks. shadcn proved this. Ashlar's lockfile records original content hashes and uses `git merge-file --diff3` for textual three-way merges, with codemods (ast-grep YAML rules) for breaking changes and force-confirmation when accessibility-critical files change. Textual merge has known limits — semantic edits to CSS variables, cascade layers, or state-machine refactors can produce silently-wrong merges; the architecture documents those limits explicitly rather than pretending they do not exist. Codemods are the escape hatch for cases textual merge cannot handle safely.

### 5. Behavior is a portable contract

The hard part of a ComboBox is not React rendering — it is the state machine, ARIA semantics, keyboard handling, and focus management. Those are framework-independent. Ashlar expresses them as statecharts plus signals, so the same machine can drive a custom element, a React component, and a vanilla DOM consumer with no behavioral drift. The specific statechart library choice (Zag is the current candidate) is a research bet, not a settled pattern, until production prior art exists. See [risks](roadmap/risks-and-mitigations.md).

### 6. Accessibility is evidence, not assertion

"Accessible by default" is marketing. Structured evidence is verifiable truth. Every stable component ships an evidence packet: axe results, keyboard interaction transcripts, at least one manual screen-reader transcript for stable evidence, a broader NVDA + JAWS + VoiceOver matrix for LTS, WCAG 2.2 criterion mapping, and explicit alignment to Section 508 ICT Baseline test procedures. Evidence is machine-readable JSON; tools, audits, and AI assistants query it.

A component is not stable until its evidence packet is — and the evidence schema explicitly distinguishes `not-reviewed`, `automated-tested`, `manual-tested`, `stable-evidence`, and `known-issue` so the docs cannot overclaim what testing has produced.

### 7. Machine-readable contracts are the AI contract

Every component ships an extended Custom Elements Manifest with variants, anti-patterns, accessibility requirements, token consumption, platform features, and policy mappings. AI tools, validators, and code generators consume the same contract as humans. There is no separate "AI manifest" — there is one manifest, structured to be useful to both audiences, with anti-patterns expressed in a form that ast-grep can compile to executable rules.

### 8. Polyglot validation, scoped honestly

ESLint is JavaScript-only. Federal stacks include Drupal Twig, Jinja, plain HTML, Astro, Vue SFCs, Svelte, ERB, and Nunjucks. Ashlar uses ast-grep with tree-sitter grammars; one YAML rule validates component usage in the languages where the grammar exists today. ast-grep ships TSX, JSX, CSS, HTML, and ERB as built-ins or with official grammars; Vue, Svelte, and Astro require custom-language registration with maintained third-party grammars; Twig, Jinja, and Nunjucks require maintained grammars that do not exist yet. The validator fails honestly when a target language lacks a grammar, rather than pretending coverage we do not have. See [validation](architecture/validation.md) for the live support table.

### 9. Standards over libraries when they overlap

Web Components are a web standard. DTCG is a W3C-CG token format (2025.10 is a Community Group Final Report, not a W3C Recommendation — the spec is stable enough to anchor on, with a swappable compiler boundary). Custom Elements Manifest is a W3C-CG component manifest. MCP is an open AI protocol now governed by the Linux Foundation Agentic AI Foundation (December 2025). Sigstore is an open supply-chain standard. When a popular library and an emerging standard overlap, lean toward the standard — standards have longer half-lives.

### 10. Future-readiness over current trendiness

Statecharts (Harel, 1987), signals (TC39 Stage 1), typed effects (research), resumability (Qwik), and event-sourcing (financial systems) compose into the next decade of UI architecture. Ashlar does not need to ship all of these in v0.0 — but the architecture must not preclude any of them. We bet on the composition, not on a specific framework.

### 11. Government-first, not government-only

Optimized for federal modernization needs: 508/WCAG evidence, agency theming, official-site shell elements, supply-chain provenance, air-gapped distribution. Equally useful for ADA Title II state and local government, regulated industries (healthcare, finance, education), and civic tech. The audience is "anyone shipping consequential software to real people," with government as the center of gravity.

### 12. Public-service values

Plain language. Progressive enhancement. Accessibility as fundamental, not optional. Open governance. Share what we do. These are USWDS's stated values; they remain correct, and Ashlar preserves them while replacing the substrate around them.

### 13. Quiet defaults, loud safety nets

The CLI surface should feel like shadcn — `init`, `add`, `audit`, `verify` cover 90% of usage. Sophistication is opt-in. Behind that surface, the safety nets are uncompromising: signed manifests, three-way merges, accessibility evidence, validator rules, force-confirmations for sensitive changes. Quiet on the surface, paranoid underneath.

### 14. Honest status

Every claim links to STATUS.md or a versioned status field. We do not write "Carbon shipped its MCP" when Carbon shipped a community proposal. We do not write "DTCG is a W3C Recommendation" when it is a CG Final Report. We do not write "polyglot validation across 10 languages" when 5 of 10 lack grammars. Procurement officers read carefully; the fastest way to lose them is one wrong factual claim.

## What Ashlar is

- **Validator** (`ashlar audit`) — federal-standards CI checks, ast-grep-compiled component anti-patterns, SARIF output, runs against existing markup with no install required.
- **Signed source registry** (capsules) — content-addressed component bundles, Sigstore signing, lockfile-tracked installation, three-way-merge updates with codemod-assisted breaking changes.
- **Evidence schema** — machine-readable accessibility evidence (axe + keyboard + manual SR + WCAG + ICT Baseline), stable-component gate, queryable by tools and auditors.
- **AI contract** — extended Custom Elements Manifest with `_ashlar` namespace; MCP server exposing search, evidence retrieval, validation, and migration; AGENTS.md sync for editor coverage.
- **Capsule families**:
  - **Foundations**: semantic HTML + CSS capsules; zero or trivial JavaScript; ~70% of typical components.
  - **Interactive controls**: custom elements wrapping statecharts and signals, for components that genuinely need behavior; ~30% of components. The statechart library choice is a research bet (see risks).
  - **Framework adapters**: auto-generated from extended CEM (React first; Vue/Svelte/Solid in v0.2).
  - **Service patterns**: flows like eligibility check, document upload, address verification.
  - **Application blocks**: the same component rendered as Nunjucks, Twig, Jinja, ERB, plain HTML.
- **Tokens** — DTCG-format source compiled to CSS variables, Tailwind v4 `@theme`, and typed TypeScript today, with Figma/design-tool output planned.

## What Ashlar is not

- **Not a React component library.** React is one consumer among several.
- **Not a Tailwind theme.** Tailwind is a first-class output target, not the authoring layer.
- **Not a USWDS replacement-by-collision.** USWDS interop is a feature, not a side effect. Ashlar runs *under* USWDS, not against it.
- **Not a shadcn fork.** It addresses what shadcn left unfixed and uses different architectural primitives.
- **Not a Web Components library.** Web Components are the framework-agnostic delivery mechanism for the interactive ~30%. They are not the authoring layer for the markup primitive ~70%, and they are not by themselves a durable differentiator now that USWDS 3.13 ships one.
- **Not "AI-native" because it has an `llms.txt`.** AI-native means structured contracts AI tools query, validate against, and migrate with. The verb is `validate`, not the adjective.
- **Not a research platform.** It will ship — but it will ship only what is real.

## What we will deliberately defer

- **Complex Date Picker, Data Grid, full Combobox, AI Assistant Panel** — too much surface for v0.0. Defer until the validator wedge, signed registry, three-way merge, and MCP read-only are proven on Button + a small markup primitive set.
- **Vue / Svelte / Solid adapters** — defer to v0.2; ship React adapter and Lit custom element first.
- **Effect-system-typed accessibility, resumability, CRDT-friendly patterns, event-sourced forms** — research track for v0.3+; design the architecture so they remain possible without shipping them.
- **Twig, Jinja, Nunjucks ast-grep coverage** — defer until maintained tree-sitter grammars exist; the validator returns `language-unsupported` for these targets in v0.0.

## What we will measure ourselves on

- Bundle size of a typical markup primitive public-service page (target: under 21 KiB gzipped for the current twelve-capsule flow).
- `update` conflict rate across 10+ instrumented test scenarios in v0.0; 30+ in v0.1 (target: under 15%, measuring textual conflict frequency *and* a separate measure of merge-correctness sampling).
- AI tool generation accuracy when grounded by Ashlar CEM (target: zero hallucinated props; anti-patterns flagged at the file level by `validate_usage`). `ashlar ai-eval` now provides the deterministic saved-output harness; the live multi-model generated-output corpus is still unbuilt.
- Multi-stack demo apps shipping the same markup primitive contract (target: one representative capsule, three universes — Vite + plain HTML + one server-rendered stack).
- Friction from `init` to a working accessible form (target: deterministic path with no bespoke setup).
- Federal procurement legibility: a security reviewer can find SBOM, npm provenance, signed releases, incident playbook, and license without leaving the README.

If the architecture cannot meet these targets, we redesign before we scale. Kill criteria are documented per phase in [risks-and-mitigations.md](roadmap/risks-and-mitigations.md).
