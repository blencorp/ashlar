# ADR 0003 — Token source: DTCG 2025.10 compiled by Terrazzo

## Status

Proposed.

## Decision

Use **Design Tokens Community Group (DTCG) 2025.10** JSON as the single source of truth for design tokens. Compile via **Terrazzo** to multiple output formats: CSS custom properties, Tailwind v4 `@theme` block, typed TypeScript token names, JSON, and Figma variables.

Use modern color spaces (`oklch()`) and runtime mode-switching primitives (`light-dark()`, `color-mix()`) so a single token set generates light, dark, and high-contrast palettes without JavaScript.

## Rationale

DTCG reached its first stable specification in October 2025. It is vendor-neutral, supports aliases and relationships, supports modern color spaces (Display P3, OKLCH), and is backed by major design tools (Figma, Tokens Studio, Style Dictionary).

USWDS has meaningful tokens but uses Sass variables as the primary contract. That is not portable to multi-platform, runtime-themed, agency-branded systems.

Terrazzo has the most complete DTCG 2025.10 support as of April 2026 (full resolvers, multi-format outputs, validators). Style Dictionary v4 has DTCG support and v5 is catching up; it is the fallback if Terrazzo proves problematic.

Modern color (`oklch()`, `color-mix()`, `light-dark()`) is Baseline in 2024–2025. Using these in token output means dark mode, high-contrast palettes, and brand mixing happen in CSS rather than JavaScript — no theme-toggle re-mounting, no class flips, just browser-driven mode switching.

## Consequences

**Positive**

- Vendor-neutral source format with broad tool support.
- Multi-platform output (CSS, Tailwind, TS, Figma) from one source.
- Runtime theming via CSS variables with no JavaScript.
- Agency themes can be validated against the semantic token contract.
- Future ports (mobile, native, design tools) are possible without changing the source.

**Negative**

- DTCG practices are still maturing; tooling improves but is not yet ubiquitous.
- Migration from USWDS Sass settings requires a translation layer.
- Older browsers without `oklch()` or `light-dark()` need fallbacks (negligible in 2026 evergreen browsers).

**Mitigations**

- Provide `@theme-color-primary` to `color.brand.primary` mapping documentation for teams migrating from USWDS.
- Generate fallback `srgb` color values alongside `oklch()` for teams targeting older browsers.

## References

- [Architecture overview — Tokens section](../architecture/overview.md)
- [Tokens architecture](../architecture/tokens.md)
- DTCG 2025.10 first stable: https://www.w3.org/community/design-tokens/2025/10/28/design-tokens-specification-reaches-first-stable-version/
- DTCG format module: https://www.designtokens.org/TR/format/
- Terrazzo DTCG: https://terrazzo.app/docs/guides/dtcg/
- Style Dictionary DTCG: https://styledictionary.com/info/dtcg/
