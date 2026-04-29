# ADR 0002 — Runtime architecture: five-layer model with platform-first foundation

## Status

Proposed.

## Decision

Atrium is organized as five layers, each independently usable:

- **L0** — Pure CSS and HTML capsules; exploits the modern web platform; zero or trivial JavaScript. Targets ~70% of typical components.
- **L1** — Web Components (Lit) wrapping Zag statecharts and signals. Targets the ~30% of components that legitimately need JavaScript state.
- **L2** — Framework adapters (`@atrium/react`, `@atrium/vue`, `@atrium/svelte`, `@atrium/solid`) auto-generated from extended Custom Elements Manifests.
- **L3** — Patterns: composed service flows (eligibility check, document upload, address form, etc.).
- **L4** — Templates: same components rendered as Nunjucks, Twig, Jinja, ERB, plain HTML.

Tokens (DTCG 2025.10) sit beneath all layers as a framework-neutral contract.

## Rationale

The 2026 web platform delivers what 2022 design systems shipped JavaScript for: cascade layers, container queries, `:has()`, `<dialog>`, popover API, anchor positioning, `@scope`, `light-dark()`, native form validation, `inert`, `<details name>`. Empirical data (synthesized in [`research/03-platform-2026.md`](../research/03-platform-2026.md)) shows ~70% of components can ship as pure CSS+HTML in 2026.

For the remaining ~30% of components (Combobox, Date Picker, Data Table, File Upload, Toast stack, Tree, complex Menu, multi-step wizards), JavaScript state and ARIA orchestration are unavoidable. Web Components are the framework-agnostic delivery mechanism: GC Design System (Canada) proved the WC-with-adapters pattern at federal scale (exited alpha March 2026, eight federal entities). Custom Elements Everywhere shows React 19, Vue 3, Svelte 5, Solid, Angular, Preact all score 100% interop.

GOV.UK Frontend's empirical observation that UK government runs 24+ template languages applies analogously to US federal agencies. L4 templates address this by shipping multiple renderings of the same component, sharing CSS and DOM contracts.

## Consequences

**Positive**

- Bundle is materially smaller (5–8KB gzipped for typical 5-component L0-only page; vs 40–55KB for shadcn equivalent).
- L0 works in any rendering environment without JavaScript runtime dependency.
- L1 is framework-agnostic via custom elements plus auto-generated adapters.
- L2 adapters are not hand-maintained; CEM regenerates them.
- L4 templates remove the "we don't have a build pipeline" objection from server-rendered/CMS shops (Drupal, Sitecore, AEM, server-rendered Django/Rails/PHP).

**Negative**

- More architectural surface than a single-framework library.
- Five layers is more to document and explain.
- L1 introduces dependencies on Lit and Zag.
- Custom-element ARIA reflection is incomplete in Firefox; explicit ARIA fallbacks required.

**Mitigations**

- L0/L1/L2/L3/L4 are independently consumable. Teams adopt only what they need.
- Lit (~5KB) and Zag (~3–5KB) are mature, minimal dependencies.
- Firefox ARIA fallback is documented per-component.

## References

- [Architecture overview](../architecture/overview.md)
- [Web Components architecture](../architecture/web-components.md)
- [Patterns and templates](../architecture/patterns-and-templates.md)
- [research/03-platform-2026.md](../research/03-platform-2026.md)
- [research/04-web-components.md](../research/04-web-components.md)
- Custom Elements Everywhere: https://custom-elements-everywhere.com/
- GC Design System exits alpha: https://digital.canada.ca/2026/03/10/stable-amp-safe-gc-design-system-is-mature-amp-exiting-the-alpha-stage/
