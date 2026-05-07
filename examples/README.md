# Ashlar Examples

These examples prove the source-capsule flow across the stacks government teams actually use. Each runnable app installs Ashlar capsules as source, imports the generated `src/ashlar/ashlar.css` entrypoint, and implements the same benefits-operations case board so framework differences are easy to compare.

| Path | Stack | Primary proof |
| --- | --- | --- |
| [`plain-html`](./plain-html/) | Static HTML | Existing no-build public-service page shell audit. |
| [`vanilla`](./vanilla/) | Vanilla TypeScript + Vite | Case-board app with no framework adapter. |
| [`react-spa`](./react-spa/) | React SPA + Vite | TSX case-board source usage plus rendered audit fixture. |
| [`nextjs`](./nextjs/) | Next.js App Router | Metadata/layout integration plus rendered audit fixture. |
| [`svelte`](./svelte/) | Svelte + Vite | Svelte case-board app consuming generated Ashlar CSS. |
| [`vue`](./vue/) | Vue + Vite | Vue case-board app consuming generated Ashlar CSS. |
| [`vite`](./vite/) | Vite + Tailwind v4 | Theme workbench and Tailwind `@theme` proof. |

## Theme Grounding

The example agency themes are source-derived implementation examples, not official agency design specifications or endorsements. Each theme records reviewed provenance metadata (`status`, `reviewedAt`, `reviewedBy`, and summary) plus source-level retrieval dates and token-path notes so consumers can audit where the token choices came from.

- **Default** uses USWDS design-token conventions for color, typography, focus, and contrast-oriented semantic roles.
- **VA** follows VA.gov Design System color-token guidance, including `vads-color-primary` `#005ea2`, the `#face00` focus outline, and Source Sans Pro typography.
- **USDA** follows USDA design and brand guidance: the documented logo green `#005440`, logo blue `#002D72`, Source Sans Pro for USDA.gov, and USWDS color guidance for web palettes.

Sources: [USWDS color tokens](https://designsystem.digital.gov/design-tokens/color/overview/), [USWDS font tokens](https://designsystem.digital.gov/design-tokens/typesetting/font/), [VA.gov color palette](https://design.va.gov/foundation/color-palette), [VA.gov typography](https://design.va.gov/foundation/typography), and [USDA Design and Brand Plays](https://www.usda.gov/about-usda/policies-and-links/digital/digital-strategy/design-and-brand/design-and-brand-plays).

Run all framework examples through the workspace checks:

```bash
pnpm check
pnpm build
pnpm examples:visual
```

Vue and Svelte currently use rendered HTML audit fixtures because Ashlar's first-party component validator targets HTML, TSX, JSX, and CSS today. The language matrix is intentionally honest: Vue and Svelte grammar registration is tracked as opt-in validator work rather than silently claiming source scanning that does not exist yet.
