# 07 — Final current-source research pass, April 29 2026

This memo records the final research pass before GitHub-publication preparation. It updates the earlier research documents with current signals as of **April 29, 2026**.

## Summary

The strategic window remains real. The strongest case for Ashlar is not that USWDS is abandoned, but that federal digital delivery now needs a more modern implementation layer: evidence-backed accessibility, signed source distribution, AI-readable contracts, CI validation, and cross-stack reach.

Tailwind v4+ remains viable as a first-class integration target. Zig should remain experimental for now. Rust-backed tooling, Node/TypeScript CLI orchestration, ast-grep validation, DTCG tokens, and platform-native CSS/HTML are the safer v0/v1 foundation.

## Federal design and standards signals

The August 2025 America by Design executive order says agencies should consult with the Chief Design Officer and produce initial results by **July 4, 2026**. It also explicitly calls for updating the government's design language to be "both usable and beautiful."

The related White House fact sheet says there are approximately 26,000 federal websites, fewer than 20% use USWDS code, 45% are not mobile friendly, and only 6% rate "good" for mobile performance. Those numbers should be treated as a strategic signal: official support alone has not produced broad adoption.

Federal Website Standards currently list no required standards, but show the federal government banner, HTML page title, and meta description as pending standards. Contact page, content timeliness indicator, and site search remain draft. External link, language selector, and page-level feedback remain in research.

Implication for Ashlar: `ashlar audit` should cover Federal Website Standards explicitly, not only component usage.

## USWDS current posture

USWDS remains active. The latest visible GitHub release is **USWDS 3.13.0**, published May 23, 2025. That release added the first Web Component variant, `usa-banner`, and introduced Lit as a dependency for that component. This is a meaningful signal that USWDS itself is moving toward Web Components.

Implication for Ashlar: avoid "USWDS is dead" positioning. The better case is that Ashlar can prototype a fuller, governance-ready implementation model faster and with a clearer AI/provenance/accessibility toolchain.

## Accessibility and legal baseline

For federal agencies, Section 508 remains the anchor. The ICT Testing Baseline for Web establishes minimum test and evaluation guidance for determining whether web content meets WCAG 2.0 A/AA as incorporated into Section 508. The Baseline is intentionally tool-agnostic.

WCAG 2.2 is the current W3C recommendation. W3C advises using WCAG 2.2 to maximize future applicability, even though WCAG 2.0 and 2.1 remain W3C recommendations.

ADA Title II is relevant to state/local government and adjacent public-sector teams. DOJ's April 20, 2026 interim final rule extended Title II web and mobile app accessibility compliance dates by one year: larger public entities from April 24, 2026 to April 26, 2027, and smaller/special district entities from April 26, 2027 to April 26, 2028. The technical standard remains WCAG 2.1 Level AA.

Implication for Ashlar: target WCAG 2.2 AA engineering quality, map evidence back to Section 508/WCAG 2.0 AA and ADA Title II/WCAG 2.1 AA, and avoid legal guarantees.

## Tailwind v4+ viability

Tailwind v4.0 shipped January 22, 2025 with a new high-performance engine, CSS-first configuration, cascade layers, `@property`, `color-mix()`, CSS theme variables, OKLCH palette, container queries, and first-party Vite integration. The public docs surface currently shows a v4.2 navigation state.

Tailwind remains a strong integration target because its CSS variable and `@theme` model aligns with DTCG-to-CSS output.

Recommended posture:

- Use DTCG JSON as the token source of truth.
- Emit CSS variables and Tailwind v4 `@theme`.
- Keep canonical component source as semantic CSS, not Tailwind utility classes.
- Add `@ashlar/tailwind` later for teams that want shadcn-style utility-class source.

This keeps Tailwind teams happy without making Tailwind a hard dependency for Drupal, WordPress, plain HTML, or air-gapped federal sites.

## Zig viability

Zig 0.16.0 is current and improving, but the official release notes still warn that Zig has known bugs, miscompilations, and regressions, and that non-trivial projects may require participating in Zig development.

Recommended posture:

- Do not use Zig on the critical path for v0/v1.
- Revisit Zig for focused experiments after the CLI and validator architecture are proven.
- Prefer Node/TypeScript for the CLI and Rust-backed ast-grep for validation in the first implementation.

## Tooling direction

Biome 2.3 added Vue, Svelte, and Astro file support, but its own release post marks the feature as experimental. Biome is useful for formatting and JS/TS linting, but not enough as Ashlar's cross-template validator.

ast-grep remains the better validation core. Its YAML rule format supports structured search, fixes, severity, messages, and language-specific parsing through tree-sitter. Custom language support can cover template systems that are not bundled by default.

SLSA v1.2 is the current approved SLSA specification. It defines levels, tracks, provenance, and verification summary attestation formats. This should shape Ashlar's supply-chain posture alongside Sigstore signing.

## Recommended foundation

Use this stack for v0/v1:

- **CLI**: Node + TypeScript + ESM, distributed through npm and runnable via `npx`/`pnpm dlx`.
- **Validation**: ast-grep + tree-sitter, with SARIF output.
- **Tokens**: DTCG 2025.10, compiled with Terrazzo first and Style Dictionary as fallback.
- **CSS**: semantic CSS with cascade layers, CSS variables, container queries, `:has()`, `light-dark()`, `forced-colors`, and progressive platform features.
- **Components**: L0 HTML/CSS first; L1 Lit Web Components where JS behavior is truly required.
- **Framework adapters**: generated from extended CEM.
- **Security**: Sigstore, SLSA provenance, SBOM, signed Git tags, lockfile verification, offline registry mirror.
- **AI**: extended CEM, AGENTS.md, MCP tools for search, validation, evidence, and migration.

## Sources

- [America by Design executive order](https://www.whitehouse.gov/presidential-actions/2025/08/improving-our-nation-through-better-design/)
- [White House fact sheet on America by Design](https://www.whitehouse.gov/fact-sheets/2025/08/fact-sheet-president-donald-j-trump-improves-our-nation-through-better-design/)
- [Federal Website Standards](https://standards.digital.gov/standards/)
- [USWDS releases](https://github.com/uswds/uswds/releases)
- [USWDS Elements](https://github.com/uswds/uswds-elements)
- [ICT Testing Baseline Alignment Framework](https://baselinealignment.section508.gov/)
- [Section508.gov testing guidance](https://www.section508.gov/test/)
- [WCAG 2.2](https://www.w3.org/TR/WCAG22/)
- [DOJ April 20 2026 ADA Title II interim final rule](https://www.ada.gov/assets/pdfs/2026-ifr.pdf)
- [Tailwind CSS v4.0 announcement](https://tailwindcss.com/blog/tailwindcss-v4)
- [Tailwind theme variables](https://tailwindcss.com/docs/theme)
- [Zig 0.16.0 release notes](https://ziglang.org/download/0.16.0/release-notes.html)
- [Biome 2.3 release notes](https://biomejs.dev/blog/biome-v2-3/)
- [ast-grep YAML rule reference](https://ast-grep.github.io/reference/yaml.html)
- [DTCG 2025.10 stable announcement](https://www.w3.org/community/design-tokens/2025/10/28/design-tokens-specification-reaches-first-stable-version/)
- [SLSA v1.2 specification](https://slsa.dev/spec/v1.2/)
