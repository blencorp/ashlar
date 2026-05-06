# ADR 0009 — Tailwind relationship: first-class output target, not authoring layer

## Status

Proposed.

## Decision

**Tailwind v4 is a first-class output and integration target.** Ashlar's token compiler emits a Tailwind v4 `@theme` block; teams using Tailwind get full token integration and can mix utility classes alongside Ashlar components.

**Tailwind is not the component authoring layer.** L0 component CSS is written in semantic class names referencing CSS custom properties (`.ashlar-button { background: var(--ashlar-color-action-primary-bg); … }`), not Tailwind utility classes hard-coded into component source.

A separate companion package, `@ashlar/tailwind`, may ship later for shadcn-style copy-paste teams who specifically want utility-class component source. This is not v0.0 scope.

## Rationale

Tailwind is excellent and widely adopted. There is no reason to reject it. The question is whether component **source** should embed Tailwind classes (as shadcn does) or render via semantic CSS (as USWDS, Carbon, GOV.UK do).

For Ashlar's audience, the answer must be semantic CSS in source:

1. **Reach.** Federal stacks include Drupal (Twig), Sitecore, Adobe Experience Manager, plain HTML, and server-rendered Django/Rails/PHP. These stacks typically do not have Tailwind in their build pipelines. Embedding Tailwind classes in component source forces those teams to either (a) install Tailwind into their CMS build, (b) ship orphan utility classes everywhere, or (c) skip Ashlar entirely.

2. **Bundle.** Tailwind utilities at the design-system layer add ~10–15KB after purge. Pure CSS components are smaller and can be budgeted per capsule. For a typical L0 public-service page, Ashlar's target is under 12KB gzipped versus ~25–35KB for Tailwind-authored component source. The "lightweight" claim in [philosophy.md](../philosophy.md) depends on this.

3. **Coupling.** Tightly coupling components to Tailwind classes makes the design system fragile to Tailwind changes. shadcn's Tailwind v3-to-v4 migration (issue #6585) was painful because components had v3 patterns hard-coded. Semantic CSS authoring decouples Ashlar from Tailwind's internal evolution.

4. **Static deployments.** Pure CSS works in any static HTML page without a build step. Tailwind requires a build pipeline.

**For Tailwind users, none of this is a downside.** They get the `@theme` output, install the `@ashlar/tailwind` preset, and freely mix Tailwind utilities with Ashlar components. Cascade layers (`@layer ashlar.components`) ensure Tailwind utility overrides win:

```jsx
<button className="ashlar-button md:w-full" data-variant="primary">
  Apply
</button>
```

The semantic class delivers the component; Tailwind utilities decorate. Both ecosystems coexist via the cascade-layer architecture (see [ADR 0004](./adr-0004-css-strategy.md)).

## Consequences

**Positive**

- Maximum reach — Ashlar works in any stack, with or without Tailwind.
- Real "lightweight" claim with bundle math to back it.
- Tailwind users get full integration via `@theme` output and the `@ashlar/tailwind` preset.
- Decoupled from Tailwind's release rhythm and breaking changes.
- Static HTML deployments are first-class.

**Negative**

- Tailwind-only teams who want copy-paste utility-class component source must wait for `@ashlar/tailwind` (or live without it).
- Two mental models exist for styling overrides: cascade-layer-aware utility classes versus direct CSS variable overrides.

**Mitigations**

- `@ashlar/tailwind` companion is on the v0.2 roadmap.
- Documentation includes a "you have two override paths" guide with worked examples.

## References

- [ADR 0004 — CSS strategy](./adr-0004-css-strategy.md)
- [Architecture overview — Tokens section](../architecture/overview.md)
- shadcn Tailwind v4 migration pain (issue #6585): https://github.com/shadcn-ui/ui/issues/6585
- Tailwind CSS v4: https://tailwindcss.com/blog/tailwindcss-v4
- Tailwind theme variables: https://tailwindcss.com/docs/theme
