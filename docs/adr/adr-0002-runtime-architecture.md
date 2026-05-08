# ADR 0002 - Runtime architecture: five capsule families with platform-first foundations

## Status

Proposed.

## Decision

Ashlar is organized as five capsule families, each independently usable. Registry manifests still use an internal `layer` field for compatibility, but product docs and CLI output should use these family names:

- **Foundations** (`markup-primitives` internally) — Pure CSS and HTML capsules; exploits the modern web platform; zero or trivial JavaScript. Targets ~70% of typical components.
- **Interactive controls** (`interactive-components` internally) — Web Components (Lit) wrapping Zag statecharts and signals. Targets the ~30% of components that legitimately need JavaScript state.
- **Framework adapters** (`framework-adapters`) — `@blen/ashlar-react`, `@blen/ashlar-vue`, `@blen/ashlar-svelte`, and `@blen/ashlar-solid` auto-generated from extended Custom Elements Manifests.
- **Service patterns** (`service-patterns`) — composed service flows such as eligibility check, document upload, and address form.
- **Application blocks** (`application-blocks`) — same components rendered as Nunjucks, Twig, Jinja, ERB, and plain HTML.

Tokens (DTCG 2025.10) sit beneath all families as a framework-neutral contract.

## Rationale

The 2026 web platform delivers what 2022 design systems shipped JavaScript for: cascade layers, container queries, `:has()`, `<dialog>`, popover API, anchor positioning, `@scope`, `light-dark()`, native form validation, `inert`, `<details name>`. Empirical data (synthesized in [`research/03-platform-2026.md`](../research/03-platform-2026.md)) shows ~70% of components can ship as pure CSS+HTML in 2026.

For the remaining ~30% of components (Combobox, Date Picker, Data Table, File Upload, Toast stack, Tree, complex Menu, multi-step wizards), JavaScript state and ARIA orchestration are unavoidable. Web Components are the framework-agnostic delivery mechanism: GC Design System (Canada) proved the WC-with-adapters pattern at federal scale (exited alpha March 2026, eight federal entities). Custom Elements Everywhere shows React 19, Vue 3, Svelte 5, Solid, Angular, Preact all score 100% interop.

GOV.UK Frontend's empirical observation that UK government runs 24+ template languages applies analogously to US federal agencies. Application blocks address this by shipping multiple renderings of the same component, sharing CSS and DOM contracts.

## Consequences

**Positive**

- Bundle is materially smaller (under 12KB gzipped for a typical markup primitive public-service page; vs 40–55KB for shadcn equivalent).
- Markup primitives work in any rendering environment without JavaScript runtime dependency.
- Interactive components are framework-agnostic via custom elements plus auto-generated adapters.
- Framework adapters are not hand-maintained; CEM regenerates them.
- Application blocks remove the "we don't have a build pipeline" objection from server-rendered/CMS shops (Drupal, Sitecore, AEM, server-rendered Django/Rails/PHP).

**Negative**

- More architectural surface than a single-framework library.
- Five families are more to document and explain.
- Interactive components introduce dependencies on Lit and Zag.
- Custom-element ARIA reflection is incomplete in Firefox; explicit ARIA fallbacks required.

**Mitigations**

- Markup primitives, interactive components, framework adapters, service patterns, and application blocks are independently consumable. Teams adopt only what they need.
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
