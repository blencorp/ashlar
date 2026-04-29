# ADR 0010 — Framework strategy: WC-first, framework adapters auto-generated

## Status

Proposed.

## Decision

Author L1 components as **Lit-based Web Components** wrapping Zag statecharts and signals. Generate framework-specific adapters (`@atrium/react`, `@atrium/vue`, `@atrium/svelte`, `@atrium/solid`) **automatically from extended Custom Elements Manifests**. React is not privileged; it is one consumer among several.

Ship the Lit custom element itself (`@atrium/element`) as a first-class delivery for Drupal, Sitecore, AEM, plain HTML, and other framework-less environments.

Do **not** hand-maintain parallel framework component trees.

## Rationale

The empirical data points one direction:

- **`custom-elements-everywhere.com` (April 2026)**: React 19, Vue 3, Svelte 5, Solid, Angular, Preact, Lit, Stencil all score 100%. Web Components are a universally interoperable delivery mechanism in 2026.
- **React 19 (December 2024)** is the watershed: native property assignment, native `on*` custom event listeners, no wrapper needed for basic interop.
- **Declarative Shadow DOM** is at ~94.6% global support (April 2026); Baseline projected August 2026. SSR + hydration + DSD works in evergreen browsers.
- **Form-associated custom elements** at ~94.92% global support; production-viable for form submit and validation (with explicit ARIA fallback for Firefox's incomplete ARIA reflection).
- **GC Design System (Canada)** proved the WC-with-adapters pattern at federal scale, exiting alpha in March 2026 with eight federal entities in production.
- **GOV.UK Frontend** intentionally chose framework-agnostic delivery because a 2019 survey found 24+ templating languages in active use across UK government departments.
- **USWDS Elements** chose Lit for its 4.0 direction. Aligning maximizes future interop and contribution potential.

Hand-maintained framework trees create drift between the canonical implementation and the React/Vue/Svelte versions. Auto-generation from CEM ensures all adapters stay aligned with the source of truth without per-framework engineering cost.

Lit is preferred over Stencil because of larger community, simpler model, alignment with USWDS Elements, and lower runtime. Stencil's auto-generated wrappers are a real advantage but not enough to offset the community-size and ecosystem-alignment factors.

## Consequences

**Positive**

- Single source of behavior (Zag machine + Lit shell) drives all consumers.
- Adapters are not hand-maintained; CEM regenerates them when components change.
- Framework-agnostic by construction. New framework adapter = new generator template.
- WC delivery (`@atrium/element`) covers Drupal, Sitecore, AEM, plain HTML directly.
- Aligns with USWDS Elements direction, preserving future upstream-contribution potential.
- React not privileged means we are not held hostage to React's release cadence or design choices.

**Negative**

- Web Components have hydration friction in some framework SSR setups (Next.js requires `"use client"` boundaries).
- Custom-element ARIA reflection is incomplete in Firefox; explicit ARIA fallbacks required.
- Adapter generation tooling must be built and maintained.
- Lit SSR is still labs; Atrium does not promise streaming SSR.

**Mitigations**

- Framework integration testing as a v0.0 success gate: prove `@atrium/element` + Next.js SSR + Vite SPA + Drupal Twig + plain HTML all work for a representative L1 component (Combobox).
- Document Firefox ARIA fallbacks per L1 component.
- Adapter generators ship as part of the Atrium build pipeline; consumers do not need to run them.
- Lit SSR escape hatch: ship CSS-only "shell" SSR mode for non-JS environments via L4 templates.

## References

- [Web Components architecture](../architecture/web-components.md)
- [research/04-web-components.md](../research/04-web-components.md)
- Custom Elements Everywhere: https://custom-elements-everywhere.com/
- React 19 + Web Components: https://aleks-elkin.github.io/posts/2024-12-06-react-19/
- GC Design System exits alpha: https://digital.canada.ca/2026/03/10/stable-amp-safe-gc-design-system-is-mature-amp-exiting-the-alpha-stage/
- Lit 3.x: https://lit.dev/
