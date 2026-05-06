# ADR 0010 — Framework strategy: WC-first, framework adapters auto-generated

## Status

Proposed.

## Decision

Author L1 components as **Web Components wrapping a statechart** (Lit + Zag is the current candidate; see "Lit + Zag is a research bet" below for the open question). Generate framework-specific adapters (`@ashlar/react`, `@ashlar/vue`, `@ashlar/svelte`, `@ashlar/solid`) **automatically from extended Custom Elements Manifests**. React is not privileged; it is one consumer among several.

Ship the custom element itself (`@ashlar/element`) as a first-class delivery for Drupal, Sitecore, AEM, plain HTML, and other framework-less environments.

Do **not** hand-maintain parallel framework component trees.

## Rationale

The empirical data points one direction:

- **`custom-elements-everywhere.com` (April 2026)**: React 19, Vue 3, Svelte 5, Solid, Angular, Preact, Lit, Stencil all score 100%. Web Components are a universally interoperable delivery mechanism in 2026.
- **React 19 (December 2024)** is the watershed: native property assignment, native `on*` custom event listeners, no wrapper needed for basic interop.
- **Declarative Shadow DOM** is at ~94.6% global support (April 2026); Baseline projected August 2026. SSR + hydration + DSD works in evergreen browsers.
- **Form-associated custom elements** at ~94.92% global support; production-viable for form submit and validation (with explicit ARIA fallback for Firefox's incomplete ARIA reflection).
- **GC Design System (Canada)** proved the WC-with-adapters pattern at federal scale, exiting alpha in March 2026 with eight federal entities in production.
- **GOV.UK Frontend** intentionally chose framework-agnostic delivery because the [March 2019 alphagov frontend survey](https://technology.blog.gov.uk/2019/03/18/learn-the-results-from-the-cross-government-frontend-technology-survey/) found 24+ templating languages in active use across UK government departments. (UK data, seven years old; cited as historical evidence rather than present-tense observation.)
- **USWDS Elements** chose Lit for its 4.0 direction. Aligning maximizes future interop and contribution potential.

Hand-maintained framework trees create drift between the canonical implementation and the React/Vue/Svelte versions. Auto-generation from CEM ensures all adapters stay aligned with the source of truth without per-framework engineering cost.

Lit is preferred over Stencil because of larger community, simpler model, alignment with USWDS Elements, and lower runtime. Stencil's auto-generated wrappers are a real advantage but not enough to offset the community-size and ecosystem-alignment factors.

### Lit + Zag is a research bet

There is no production prior art for Lit components driven by Zag statecharts as of April 2026. Zag has no `@zag-js/vanilla` package; the maintainer's own [discussion #2309](https://github.com/chakra-ui/zag/discussions/2309) confirms vanilla support is a proof-of-concept ("didn't get to implement it"). The L1 substrate may end up being Lit + Zag, Lit + a custom statechart wrapper, or a different combination entirely.

Slice 5 of the [v0.0 roadmap](../roadmap/01-v0.0-foundation.md) is the place to evaluate this bet; if Lit + Zag does not feel right after one iteration on a real L1 component, this ADR is revisited before scaling beyond Button. The decision to defer L1 components from v0.0 to v0.1 is partly driven by this open question. We do not commit to a statechart library on the first L1 component without evidence that the combination works.

## Consequences

**Positive**

- Single source of behavior (Zag machine + Lit shell) drives all consumers.
- Adapters are not hand-maintained; CEM regenerates them when components change.
- Framework-agnostic by construction. New framework adapter = new generator template.
- WC delivery (`@ashlar/element`) covers Drupal, Sitecore, AEM, plain HTML directly.
- Aligns with USWDS Elements direction, preserving future upstream-contribution potential.
- React not privileged means we are not held hostage to React's release rhythm or design choices.

**Negative**

- Web Components have hydration friction in some framework SSR setups (Next.js requires `"use client"` boundaries).
- Custom-element ARIA reflection is incomplete in Firefox; explicit ARIA fallbacks required.
- Adapter generation tooling must be built and maintained.
- Lit SSR is still labs; Ashlar does not promise streaming SSR.

**Mitigations**

- Framework integration testing as a v0.0 success gate: prove `@ashlar/element` + Next.js SSR + Vite SPA + Drupal Twig + plain HTML all work for a representative L1 component (Combobox).
- Document Firefox ARIA fallbacks per L1 component.
- Adapter generators ship as part of the Ashlar build pipeline; consumers do not need to run them.
- Lit SSR escape hatch: ship CSS-only "shell" SSR mode for non-JS environments via L4 templates.

## References

- [Web Components architecture](../architecture/web-components.md)
- [research/04-web-components.md](../research/04-web-components.md)
- Custom Elements Everywhere: https://custom-elements-everywhere.com/
- React 19 + Web Components: https://aleks-elkin.github.io/posts/2024-12-06-react-19/
- GC Design System exits alpha: https://digital.canada.ca/2026/03/10/stable-amp-safe-gc-design-system-is-mature-amp-exiting-the-alpha-stage/
- Lit 3.x: https://lit.dev/
