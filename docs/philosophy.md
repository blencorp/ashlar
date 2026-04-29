# Philosophy

The thesis, the design principles, and what we will and will not build.

## Thesis

> Build the smallest, sharpest, most accessible, most AI-readable design system possible by leaning on the modern web platform aggressively, treating component behavior as a portable contract rather than a framework choice, and making source ownership safely updateable.

Atrium is not a React library, a Tailwind theme, or a USWDS clone. It is a registry of evidence-backed component capsules — versioned, signed, content-addressed bundles of HTML, CSS, behavior, accessibility evidence, AI guidance, and codemods — distributed as source into the consuming project and updateable through a lockfile and three-way merge.

The goal is to make the simplest thing that solves modern government UI needs better than any current alternative, without locking teams into a framework, a styling system, or an authoring layer they did not choose.

## What we are reacting to

Three reference points define the design space:

**USWDS.** Strong civic philosophy and accessibility discipline. Real adoption gap (less than 20% of federal websites). Aging delivery model: HTML snippets as the official API, Sass/Gulp build chain, no framework support, no registry, no AI-readable metadata. USWDS remains active, including early Web Component work, but the current implementation model still leaves agencies solving framework, update, validation, and AI-readability problems on their own.

**shadcn/ui.** Reframed component distribution as source ownership. Strong developer trust and AI affordance. Three years of unfixed production complaints: drift after install (discussion #790, open since 2023), no accessibility evidence, Tailwind coupling, sole-maintainer fragility, registry built for installation but not governance.

**The 2026 web platform.** Native CSS now delivers what a 2022 design system needed JavaScript for: cascade layers, container queries, `:has()`, `<dialog>`, popover API, anchor positioning, `@scope`, `light-dark()`, `oklch()`, native form validation. Roughly 70% of typical design-system components can ship as pure CSS and HTML.

We are reacting to the gap between what USWDS could be, what shadcn left unfixed, and what the platform now makes possible.

## Design principles

### 1. The platform is the design system

In 2026, declarative web standards do most of what design-system JavaScript used to do. Modal? `<dialog>`. Popover? `popover` attribute. Anchored positioning? `anchor-name`. Theme switching? `light-dark()`. Form state styling? `:has(:invalid)`. Accordion? `<details name>`. Focus trap? `inert`.

Default to the platform. Reach for JavaScript only where the platform genuinely cannot — and document that decision.

### 2. Source ownership requires safe updates

Source-distributed components without an update path become unmaintained forks. shadcn proved the distribution model and the maintenance gap simultaneously. Atrium ships a lockfile that records the original installed content hash and uses `git merge-file --diff3` to perform real three-way merges on update, with codemods for breaking changes and force-confirmation when accessibility-critical files change.

Owning your component source should not mean signing up for a maintenance fork.

### 3. Behavior is a portable contract, not a framework choice

The hard part of a ComboBox is not React rendering — it is the state machine, ARIA semantics, keyboard handling, and focus management. Those are framework-independent. Atrium expresses them as statecharts (via Zag) plus signals, so the same machine drives a custom element, a React component, a Vue component, and a vanilla DOM consumer with no behavioral drift between them.

### 4. Accessibility is evidence, not an assertion

"Accessible by default" is a marketing claim. Structured evidence is verifiable truth. Every stable component ships an evidence packet: axe results, keyboard interaction transcripts, screen-reader test notes, WCAG 2.2 criterion mapping, and known limitations as machine-readable JSON. Tools, audits, and AI assistants can query it.

A component is not stable until its evidence packet is.

### 5. Machine-readable contracts are the AI contract

Every component ships a Custom Elements Manifest extended with variants, anti-patterns, accessibility constraints, token consumption, and rendering classification. AI tools, validators, and code generators consume the same contract as humans. There is no separate "AI manifest" — there is one manifest, structured to be useful to both audiences.

### 6. Polyglot validation, framework-agnostic linting

ESLint is a JavaScript-only tool. Federal stacks include Drupal Twig, server-rendered Jinja, plain HTML, Astro, Vue SFCs, Svelte, and TSX. Atrium uses ast-grep with tree-sitter grammars, so a single YAML rule validates component usage across all of these. The validator is a single Rust binary; it does not require installing the design system into the consumer's build pipeline.

### 7. Standards over libraries when they overlap

Web Components are a web standard. DTCG is a W3C-CG token format. CEM is a W3C-CG component manifest. MCP is an open AI protocol. Sigstore is an open supply-chain standard. When a popular library and an emerging standard overlap, lean toward the standard — standards have longer half-lives and broader interoperability.

### 8. Future-readiness over current trendiness

Statecharts (1987 — Harel) plus signals (TC39 Stage 1) plus typed effects (research) plus resumability (Qwik) plus event-sourcing (financial systems) compose into the next decade of UI architecture. Atrium does not need to ship all of these in v0.0 — but the architecture must not preclude any of them. We bet on the composition, not on a specific framework.

### 9. Government-first, not government-only

Optimized for federal modernization needs: 508/WCAG evidence, agency theming, official-site shell elements, supply-chain provenance, air-gapped distribution. Equally useful for regulated industries — healthcare, finance, education, civic tech — where the same evidence and governance burdens apply.

The audience is "anyone shipping consequential software to real people," with government as the center of gravity.

### 10. Public-service values

Plain language. Progressive enhancement. Accessibility as fundamental, not optional. Open governance. Share what we do. These are USWDS's stated values; they remain correct, and Atrium preserves them — even as it replaces the delivery model around them.

### 11. Quiet defaults, loud safety nets

The CLI surface should feel like shadcn — `init`, `add`, `update`, `audit` cover 90% of usage. Sophistication is opt-in. But behind that surface, the safety nets should be uncompromising: signed manifests, three-way merges, accessibility evidence, validator rules, force-confirmations for sensitive changes. Quiet on the surface, paranoid underneath.

## What Atrium is not

- **Not a React component library.** React is one consumer among many.
- **Not a Tailwind theme.** Tailwind is a first-class output target, not the authoring layer.
- **Not a USWDS replacement-by-collision.** It is a different category. USWDS interop is a feature.
- **Not a shadcn fork.** It addresses what shadcn left unfixed and uses different architectural primitives.
- **Not a Web Components library.** Web Components are the framework-agnostic delivery mechanism for the ~30% of components that need JavaScript. They are not the authoring layer for the other ~70%.
- **Not "AI-native" because it has an `llms.txt`.** AI-native means structured contracts that AI tools can query, validate against, and migrate with — not just markdown for retrieval.
- **Not a research platform.** It will ship.

## What Atrium is

- A registry of versioned, signed, content-addressed component capsules.
- A CLI that installs capsules as source into the consuming project, tracking provenance in a lockfile.
- A layered architecture:
  - **L0**: pure CSS and HTML capsules that exploit the modern web platform; zero or trivial JavaScript.
  - **L1**: Web Components wrapping Zag statecharts and signals, for the components that genuinely need behavior.
  - **L2**: framework adapters auto-generated from extended CEM (React, Vue, Svelte, Solid, vanilla).
  - **L3**: patterns — full service flows like eligibility check, document upload, address verification.
  - **L4**: templates — the same components rendered as Nunjucks, Twig, Jinja, ERB, plain HTML.
- DTCG tokens compiled to CSS variables, Tailwind v4 `@theme`, typed TypeScript, and Figma variables.
- Polyglot validation via ast-grep YAML rules generated from manifests.
- An MCP server exposing search, validation, evidence, and migration tools to AI assistants.
- A community-governed contribution model with strict component lifecycle and accessibility-evidence gates.

## What we will deliberately defer

- **Date Picker, Data Grid, full Combobox, AI Assistant Panel** — too much surface area for v0.0. Defer to v0.2 once the architecture is proven on simpler components.
- **Vue / Svelte / Solid adapters** — defer to v0.2; ship React adapter and Lit custom element first.
- **Effect-system-typed accessibility** — research track for v0.3+.
- **Resumability, CRDT-friendly patterns, event-sourced forms** — design the architecture so they remain possible, but do not ship them until the foundation is stable.

## What we will measure ourselves on

- Bundle size of typical 5-component page (target: under 10KB gzipped for L0-only).
- `update` conflict rate across 50+ real updates (target: under 10%).
- AI tool generation accuracy when grounded by Atrium CEM (target: zero hallucinated props, anti-patterns flagged).
- Multi-stack demo apps shipping the same component (target: one capsule, three universes — Next.js, Drupal Twig, plain HTML).
- Time from `init` to a working accessible form (target: under 10 minutes).

If the architecture cannot meet these targets, we redesign before we scale.
