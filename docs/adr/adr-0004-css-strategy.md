# ADR 0004 — CSS strategy: cascade layers, `@scope`, CSS variables, platform-first

## Status

Proposed.

## Decision

Style Ashlar components using:

- **Cascade layers** (`@layer`) for predictable specificity and consumer overrides.
- **`@scope`** for component-local styles without Shadow DOM (Baseline December 2025).
- **CSS custom properties** as the runtime theming surface, populated from DTCG-compiled tokens.
- **Modern platform features** (anchor positioning, popover API, `<dialog>`, `:has()`, `light-dark()`, `color-mix()`, `inert`, `<details name>`) to deliver behavior natively wherever possible.

Components are authored in semantic CSS, not Tailwind classes. Tailwind v4 is a first-class **output target** (token compiler emits `@theme` blocks), not the authoring layer.

## Rationale

Cascade layers make consumer override behavior predictable. Component authors define an `ashlar.components` layer; consumers can reliably override by writing into a higher layer (or the unlayered cascade). No specificity wars, no `!important`.

`@scope` (Baseline December 2025 with Firefox 146) provides component-local styles without Shadow DOM — useful for Light DOM interactive components and CSS-only markup primitives. It avoids the theming friction Shadow DOM creates.

CSS variables driven by DTCG-compiled tokens provide runtime theming, dark mode (via `light-dark()`), agency branding (via mode/scope-scoped overrides), and a cross-stack contract that works the same in React, Vue, Drupal, Sitecore, and plain HTML.

Authoring in semantic CSS instead of Tailwind classes is essential for the ~70% of markup primitives that ship as pure CSS+HTML to non-Tailwind stacks. Federal Drupal, Sitecore, AEM, and server-rendered Django/Rails/PHP shops typically do not have Tailwind in their build pipelines. Forcing Tailwind on components excludes a large audience and bloats bundles for the rest. Tailwind users get full token integration through the `@theme` output.

## Consequences

**Positive**

- Predictable override behavior via cascade layers.
- Component-local styles without Shadow DOM via `@scope`.
- Runtime theming (light/dark/HC/agency) without JavaScript.
- Lower build complexity for markup primitive consumers — no Sass, no Tailwind required.
- Maximum cross-stack reach.

**Negative**

- Tailwind teams using utility classes alongside components must ensure cascade-layer ordering keeps utilities in the right band (handled by configuration, but a documentation point).
- Authors must internalize cascade-layer semantics rather than reflexive specificity tweaking.
- Older browsers without `@scope` need a tiny shim or graceful degradation.

**Mitigations**

- Ship a Tailwind v4 preset (`@blen/ashlar-tailwind`) that wires `@theme` and ensures cascade-layer compatibility with utility classes.
- Document cascade-layer ordering and override patterns extensively.
- `@scope` graceful degradation by hoisting the ruleset to the document scope without `@scope` (no breakage, slightly broader specificity).

## References

- [Architecture overview — Tokens section](../architecture/overview.md)
- [ADR 0009 — Tailwind relationship](./adr-0009-tailwind-relationship.md)
- Frontend Masters — `@scope` Baseline: https://frontendmasters.com/blog/how-to-scope-css-now-that-its-baseline/
- web.dev — Popover Baseline: https://web.dev/blog/popover-baseline
- Tailwind CSS v4: https://tailwindcss.com/blog/tailwindcss-v4
