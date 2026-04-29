# Toolchain

This document defines the recommended v0/v1 technical foundation. The goal is to choose boring, supportable tools where federal credibility matters, while leaving room for future experiments.

## Decision summary

| Area | Decision | Rationale |
|---|---|---|
| CLI runtime | Node + TypeScript + ESM | Best `npx`/npm ergonomics; easiest agency and contractor adoption. |
| Native validation engine | ast-grep + tree-sitter | Cross-language rules for JS, TS, HTML, and server templates; fast Rust binary. |
| Formatting / JS linting | Biome optional | Useful where it works; Vue/Svelte/Astro support is still marked experimental. |
| Token source | DTCG 2025.10 JSON | Stable, vendor-neutral design token format. |
| Token compiler | Terrazzo primary, Style Dictionary fallback | Terrazzo has strong DTCG coverage; fallback reduces tool risk. |
| CSS authoring | Semantic CSS + cascade layers | Works everywhere, including CMS and static HTML stacks. |
| Tailwind | First-class output target | Emit Tailwind v4 `@theme`; do not make Tailwind a hard dependency. |
| L1 components | Lit Web Components | Standards-aligned, small, USWDS Elements-aligned. |
| Behavior | Zag statecharts + signals | Portable behavior across Web Components and framework wrappers. |
| Signing | Sigstore/cosign | Verifiable provenance without long-lived signing keys. |
| Supply-chain model | SLSA-informed provenance | Aligns with federal security expectations. |
| AI interface | Extended CEM + MCP + AGENTS.md | Structured component contract plus tool access. |
| Zig | Experimental only | Promising, but not stable enough for core federal tooling yet. |

## CLI

The CLI should be a Node + TypeScript ESM package:

```bash
npx atrium init
npx atrium add button alert form-field
npx atrium audit
npx atrium verify
npx atrium evidence button
```

Reasons:

- npm and `npx` are familiar in federal web teams.
- Package-manager alternatives (`pnpm dlx`, `yarn dlx`, `bunx`, `deno run npm:`) can be supported without changing the package shape.
- Pure Node avoids binary-whitelisting friction for day-one installs.
- Native tools such as ast-grep can be bundled as optional platform packages or downloaded in a controlled postinstall flow.

## Validation engine

`atrium audit` should use ast-grep rules generated from extended CEM and hand-authored rule packs.

Rule categories:

- Component usage: invalid variants, missing required slots, invalid prop combinations.
- Accessibility: missing labels, icon-only buttons without names, dialogs without titles, placeholder-only fields.
- Federal Website Standards: page title, meta description, banner, identifier, contact page hooks, external-link indicators, language selector.
- Token governance: hard-coded colors, theme override violations, contrast pair failures.
- Migration: versioned codemods for breaking changes.

Output formats:

- Human CLI output.
- JSON for scripts.
- SARIF for code scanning dashboards.
- MCP result format for AI agents.

## Tailwind relationship

Tailwind v4+ should be supported deeply but not required.

Canonical component source:

```html
<button class="atrium-button" data-variant="primary">Apply</button>
```

Canonical component CSS:

```css
@layer atrium.components {
  .atrium-button {
    background: var(--atrium-color-action-primary-bg);
    color: var(--atrium-color-action-primary-fg);
  }
}
```

Tailwind output:

```css
@theme {
  --color-atrium-action-primary: var(--atrium-color-action-primary-bg);
  --radius-atrium-control: var(--atrium-radius-control);
}
```

This gives Tailwind users `bg-atrium-action-primary` while preserving zero-Tailwind operation.

## Zig posture

Zig should not be used for the v0/v1 critical path. It remains attractive for small, fast binaries and cross-compilation, but Zig 0.16 release notes still warn about known bugs and regressions.

Possible future experiments:

- Standalone token compiler prototype.
- Standalone registry verifier.
- Tiny offline mirror utility.

Adoption condition:

- Reconsider Zig only after the CLI, registry, and validation architecture are proven and a specific Zig implementation would materially improve distribution, performance, or offline operation.

## Security tooling

The toolchain should produce:

- Sigstore signatures for every capsule.
- SLSA provenance for registry builds.
- SBOMs for CLI and component packages.
- Signed Git tags for registry mirrors.
- Checksums in capsule manifests and `atrium-lock.json`.
- `atrium verify` for local tamper detection.

## AI tooling

The AI tooling surface should be treated as a first-class developer API:

- Extended CEM is the source of truth.
- MCP exposes search, retrieval, validation, migration, evidence, and token tools.
- AGENTS.md tells coding agents how to use Atrium in the local codebase.
- `atrium audit` is the enforcement layer when generated code is wrong.

## References

- [Tailwind CSS v4.0](https://tailwindcss.com/blog/tailwindcss-v4)
- [Tailwind theme variables](https://tailwindcss.com/docs/theme)
- [Zig 0.16.0 release notes](https://ziglang.org/download/0.16.0/release-notes.html)
- [Biome 2.3](https://biomejs.dev/blog/biome-v2-3/)
- [ast-grep YAML reference](https://ast-grep.github.io/reference/yaml.html)
- [DTCG 2025.10](https://www.w3.org/community/design-tokens/2025/10/28/design-tokens-specification-reaches-first-stable-version/)
- [SLSA v1.2](https://slsa.dev/spec/v1.2/)
