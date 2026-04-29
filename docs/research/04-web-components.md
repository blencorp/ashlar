# 04 — Web Components and peer government design systems

Synthesized from primary-source research conducted April 2026. The full source list is in [`source-map.md`](./source-map.md).

This document records the state of Web Components in 2026, the architectures used by peer government design systems, and the empirical pain points reported by USWDS users. It is the foundation for Atrium's L1 (Web Components) and L4 (templates) decisions, and for the framework-adapter strategy in L2.

## Web Components state in 2026

### Lit

- **Current production version: Lit 3.3.1** (July 2025). There is no Lit 4. Articles citing Lit 4.0 appear to be SEO speculation, not project roadmap.
- **Bundle**: ~5KB minified+gzipped runtime; a Button-class component adds ~1–3KB on top.
- **SSR**: `@lit-labs/ssr` is still labs/experimental as of April 2026. It renders to Declarative Shadow DOM and is production-usable, but consumers own the integration glue. Not promised as streaming SSR.
- **DX**: decorators, reactive properties, lit-html templates. ~2–3 day learning curve for a React developer; type-safe with TypeScript.

### Declarative Shadow DOM

- **Browser support April 2026**: Chrome 111+, Firefox 123+, Safari 16.4+, Edge 111+. Global ~94.6%. Baseline "Widely Available" projected August 2026.
- **Verdict**: ship it. Use `<template shadowrootmode="open">`.
- **Gotchas**: adopted/constructable stylesheets need a polyfill on older Safari; SSR + hydration needs a strategy (Lit SSR provides one but is labs); no streaming SSR primitive — the full template arrives at once.

### Form-associated custom elements (ElementInternals / FACE)

- **Browser support**: Chrome 77+, Edge 79+, Firefox 98+, Safari 16.4+. Global ~94.92%.
- **Real gap**: Firefox has implemented form participation and validation but **partial coverage of ARIA reflection / role internals**. If a custom `<atrium-input>` relies on `internals.ariaLabel` for a11y, an explicit ARIA fallback is required for Firefox.
- **Verdict**: production-viable for form submission and validation; do not assume ARIA reflection works everywhere.

### Framework adapters

- **`custom-elements-everywhere.com` scores (April 2026)**: React 19, Vue 3, Svelte 4, Solid, Angular 16, Preact, Lit, Stencil — **all 100%**. Lower scorers are dead or legacy (Polymer 92%, LWC 89%).
- **React 19 (December 2024) is the watershed**: native property assignment and `on*` custom-event listeners. No wrapper needed for basic interop.
- **Real friction in 2026**: SSR hydration + DSD + framework-controlled markup is the unsolved seam. Astro handles WC well; Next.js needs `"use client"` boundaries; Nuxt and Svelte handle natively.
- **Canonical adapter pattern**: ship the WC, then thin per-framework wrappers generated from `custom-elements.json` (CEM) for type safety and idiomatic event/prop binding. Stencil and Lit both have generators (`@lit/labs/gen-wrapper-react`, Stencil output targets).

### Production Web Component libraries — what to learn

| Library | Status (Apr 2026) | Stack | Lesson |
|---|---|---|---|
| Shoelace → **Web Awesome 3** | Active, public beta after Font Awesome acquisition + Kickstarter | Lit + esbuild | Open core + paid tier funding model; framework-free + framework wrappers. |
| **Spectrum Web Components** (Adobe) | Active | Lit | `<sp-theme>` token scoping; SSR documented for React Spectrum, not WC. |
| **Carbon Web Components** (IBM) | Active, merged into `carbon-for-ibm-dotcom` monorepo | Lit + decorators | Theming via tokens + `:host` styling; production-grade enterprise pattern. |
| **FAST / Fluent UI WC v3** (Microsoft) | v3 still in RC mid-2025; long delayed | FAST → rewritten on internal stack | Cautionary tale: framework-of-the-framework risk; Microsoft itself wavered. |
| **Material Web** (Google) | **Maintenance mode since June 2024** | Lit | Engineers reassigned to Wiz. Do not depend on it. |

**AI manifests in production WC libraries**: none ship a distinct "AI manifest" format. The de-facto standard is **Custom Elements Manifest** (CEM, W3C Community Group). Storybook MCP, Carbon-MCP, and design-system commentators (Dave Rupert, Codrops) all converge on CEM as the LLM source. **Atrium emits CEM from day one and extends it with the constraint surface (variants, anti-patterns, accessibility rules, token consumption).**

## Peer government design systems

### GOV.UK Design System

- **Stack confirmed**: HTML + Sass (ITCSS + BEM) + Nunjucks templates + plain JavaScript modules. No framework.
- **Why no React/WC**: a 2019 cross-government survey found **24 templating languages in active use** across UK government departments (Mustache, Jinja, ERB families dominant); 40% of teams had no CSS architecture. Choosing one framework would have stranded most departments.
- **Accessibility evidence**: issues are prioritized as "Evidenced" — must include user research showing real barriers. Theoretical issues wait. New accessibility strategy published January 2023; tested to WCAG 2.1, updating toward 2.2. Brand refresh and Frontend updates June 2025.
- **Versioning**: semver, monthly-ish releases of `govuk-frontend` on npm.

**Lesson for Atrium**: government uses many template languages, not one framework. L4 (templates) is the empirical answer to this — ship Nunjucks, Twig, Jinja, ERB, plain HTML renderings of the same component.

### GC Design System (Canada) — the closest peer

- **Stack**: Stencil-based Web Components plus React/Vue/Angular/Next.js wrappers (`gcds-components-react`, `-vue`, `-angular`).
- **Adoption**: **Exited alpha March 10, 2026.** Eight federal entities in production (ESDC, DFO, Transport Canada, RCMP, others). Now offers semver guarantees and reduced breaking changes.
- **Key lesson**: "alpha" status was an explicit adoption blocker per Canadian Digital Service post-mortem. Plan for stable v1.0 brand from early.
- **Stencil vs Lit choice**: Stencil compiles components, ships smaller per-component runtime, generates framework wrappers automatically. Lit has a larger community, simpler model, lighter shared runtime. GC chose Stencil; USWDS Elements chose Lit.

**Lesson for Atrium**: WC + adapter is proven at federal scale. Choose Lit (alignment with USWDS Elements direction and larger community) over Stencil; the adapter generation cost is small either way.

### Australia — AuDS → GOLD

- **Australian Government Design System** launched 2018; abandoned by the Digital Transformation Agency August/September 2021. Approximately 100 sites left stranded, no successor guidance.
- **Community fork → GOLD / Design System AU.** Now lives at `gold.designsystemau.org`, community-maintained.
- **Lessons**: single-agency ownership is single point of failure. The Department of Health subsequently built its own fork (`designsystem.health.gov.au`), demonstrating the fragmentation cost of central-system collapse.

**Lesson for Atrium**: community charter and a multi-organization maintainer group from day one. Avoid the AuDS trap.

### Other peers

- **Singapore SGDS** (GovTech) — frontend framework with React plus plain HTML; modest scope. Not architecturally novel.
- **NL Design System** — most architecturally interesting peer. Multi-municipality (Utrecht, Den Haag, Rotterdam, Rijkshuisstijl) sharing one component spec via design tokens (JSON, multi-format output). CSS components are the base; optional React/WC/Twig wrappers per consumer. **Token-first, multi-tenant pattern.**
- **EU Component Library (ECL)** — currently v5.0.0-alpha.22 (December 2025); Drupal-first, Twig-templated, distributed via CDN. Not generally applicable.

**Lesson for Atrium**: NL Design System validates the token-first, components-as-rendering-layer architecture. Tokens are the universal contract; components are wrappers.

## USWDS empirical pain points

Reddit and HackerNews searches returned essentially no first-person USWDS threads. Evidence is GitHub Discussions, Trussworks blog, GSA monthly call Q&A, and ADRs.

Verified top complaints:

1. **No official framework support.** Components are cut-and-paste HTML. No abstraction layer between component and rendered HTML — brittle, hard to upgrade. (Multiple discussions, Trussworks ADR, Simpler.Grants.gov ADR.)
2. **`react-uswds` (Trussworks) pins `@uswds/uswds` version.** Projects cannot get newer USWDS until Trussworks updates the wrapper. Real release-lag pain.
3. **JavaScript wiring opaque.** Developers must inspect network requests to find which JavaScript file from `node_modules` powers a component. Documentation does not list JS dependencies per component.
4. **Sass docs broken or inconsistent.** `@import` works; documented `@include` paths fail. Recurring report.
5. **Date picker and combo box do not integrate reactively with Vue or React.** Multiple agencies hit this.
6. **Accordion plus SiteImprove false positives.** Manual a11y validation each release.
7. **Missing components**: Data Grid (35 votes), Tabs, Drawer, Skeleton, Charts.
8. **USWDS team's own roadmap creates uncertainty**: Elements (Lit-based WC), Tokens (Style Dictionary), and Core 4.0 announced for Spring 2025; the team is sticking with Lit but **not accepting external code contributions** during the architecture transition. Developers who built Lit components for clients are blocked from upstreaming.

**Implication for Atrium**: every one of the above is addressable. The framework gap is the L2 adapters; opaque JavaScript is the explicit CEM with rendering classification; missing components are L1 priorities; the "not accepting contributions" status means we cannot rely on convergence with USWDS in the near term — but we can ship explicit USWDS interop and contribute upstream when the door reopens.

## Architectural recommendation

The data points one direction: **Web-Component-first with auto-generated framework adapters**.

- React 19, Vue 3, Svelte 5, Solid, Angular all score 100% on `custom-elements-everywhere`.
- Declarative Shadow DOM and form-associated custom elements both at ~94–95% global, both Baseline by mid-2026.
- GC Design System has proven WC + adapter pattern at federal scale (exited alpha March 2026, eight agencies).
- GOV.UK's framework-agnostic choice was driven by 24 templating languages; a US federal survey would find similar fragmentation.
- USWDS's own team has chosen Lit for v4. Aligning with their direction reduces ecosystem friction and maximizes future upstream-contribution potential.

**Specific calls**:

- **Library**: Lit 3.x (not "4"). Stencil is a defensible alternative if auto-generated framework wrappers outweigh community size.
- **SSR**: rely on framework SSR plus DSD where consumed by frameworks. Lit SSR is labs — treat as escape hatch for a CSS-only "shell" SSR mode. Ship Nunjucks, Twig, Jinja partials for non-JS environments alongside.
- **Tokens**: DTCG source, multi-format output via Terrazzo. Steal NL Design System's token-as-universal-layer pattern.
- **AI**: emit CEM from day one; extend it with `_atrium` namespace for variants, anti-patterns, a11y rules, token consumption.
- **Governance**: avoid the AuDS trap — community maintainer group with charter from v0.

**Open risks**:

- Firefox ARIA reflection in ElementInternals is incomplete — ship explicit ARIA fallbacks.
- Lit SSR is labs — do not promise streaming SSR.
- USWDS Elements is alpha and not accepting contributions; convergence with USWDS is a future possibility, not a current dependency.

## Sources

- Lit GitHub releases: https://github.com/lit/lit/releases
- Can I Use — Declarative Shadow DOM: https://caniuse.com/declarative-shadow-dom
- Can I Use — Form-associated custom elements: https://caniuse.com/wf-form-associated-custom-elements
- Custom Elements Everywhere: https://custom-elements-everywhere.com/
- React 19 + Web Components: https://aleks-elkin.github.io/posts/2024-12-06-react-19/
- Web Awesome (Shoelace successor): https://github.com/shoelace-style/webawesome
- Spectrum Web Components: https://opensource.adobe.com/spectrum-web-components/
- Carbon Web Components: https://github.com/carbon-design-system/carbon-for-ibm-dotcom
- Material Web maintenance mode: https://github.com/material-components/material-web/discussions/5642
- Fluent UI / FAST v3 status: https://github.com/microsoft/fluentui/discussions/34080
- GOV.UK Frontend cross-government tech survey: https://technology.blog.gov.uk/2019/03/18/learn-the-results-from-the-cross-government-frontend-technology-survey/
- GC Design System exits alpha: https://digital.canada.ca/2026/03/10/stable-amp-safe-gc-design-system-is-mature-amp-exiting-the-alpha-stage/
- gcds-components: https://github.com/cds-snc/gcds-components
- DTA abandons AuDS — InnovationAus: https://www.innovationaus.com/devs-go-it-alone-after-dta-ditches-design-system/
- Morpht analysis of AuDS death: https://www.morpht.com/blog/australian-government-design-system-dead-long-live-gold
- NL Design System: https://github.com/nl-design-system
- USWDS Discussions: https://github.com/uswds/uswds/discussions
- Trussworks react-uswds ADR: https://wiki.simpler.grants.gov/product/decisions/adr/2023-07-20-fe-uswds-in-react
- USWDS Elements (Lit): https://github.com/uswds/web-components
- Custom Elements Manifest as AI source — Dave Rupert: https://daverupert.com/2025/10/custom-elements-manifest-killer-feature/
- Storybook MCP — Codrops: https://tympanus.net/codrops/2025/12/09/supercharge-your-design-system-with-llms-and-storybook-mcp/
