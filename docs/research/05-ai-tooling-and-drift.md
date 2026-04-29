# 05 — AI-native tooling, lightweight distribution, and drift management

Synthesized from primary-source research conducted April 2026. The full source list is in [`source-map.md`](./source-map.md).

This document records the state of AI-native distribution patterns, polyglot validation tools, drift management approaches, and bundle-size benchmarks that inform Atrium's CLI, MCP server, validation, and update mechanics.

## AI-native distribution in 2026

### shadcn CLI 3 + MCP server (August 2025)

shadcn's official MCP server (`ui.shadcn.com/docs/mcp`) exposes ~15 tools across registries: `list_components`, `search_registries` (across multi-namespaced registries `@registry/name`), `get_item` (returns the registry-item.json), `get_examples`, and `add_item` (invokes the CLI install). Works in Cursor, Windsurf, Claude Code, and Copilot.

**What is missing**: no usage-validation tool ("is this prop combo valid?"), no a11y constraints, no anti-pattern data, no version diff, no migration tools. shadcn's MCP is **discovery plus install** — not governance, not validation, not migration.

### Other design-system MCP servers

- **Carbon MCP** (IBM, February 2026, SandeepBaskaran) — the most ambitious in production. Queries tokens, components, usage guidelines. Provides "carbon-aware" code generation, validates against accessibility rules, suggests modernization. **The shape Atrium should match.**
- **southleft/design-systems-mcp** — Supabase vector search over W3C/WCAG/best-practice corpus. General reference, not design-system-specific.
- **Spectrum, FAST, Material** — no first-party MCP server as of April 2026.

The emerging convergence: tools = `search` / `get` / `validate` / `migrate`; resources = component schemas plus token JSON; prompts = task templates ("scaffold a form", "audit a page").

### AGENTS.md vs llms.txt

- **AGENTS.md** (`agents.md`, ~60,000 repositories as of late 2025) — plain Markdown for **coding agents inside a repo**: build commands, conventions, do/don't.
- **llms.txt** (Jeremy Howard, September 2024, ~600 sites) — Markdown index of **documentation pages** for retrieval.
- **They are complementary, not competing.** Atrium ships both: `AGENTS.md` for "how to use Atrium components correctly in this codebase" and `llms.txt` (plus `llms-full.txt`) for the public docs site.

### Component manifests

- **shadcn `registry-item.json`** covers `name`, `title`, `description`, `type`, `dependencies`, `registryDependencies`, `files`, `cssVars`, `meta`. **Rich for installation, thin for usage.** No prop schemas, no variant matrices, no a11y rules, no anti-patterns.
- **Custom Elements Manifest (CEM)** — W3C-CG standard published by Spectrum, FAST, Carbon, and others. Machine-readable but limited to attributes, slots, events.
- **The gap to fill**: extend CEM with `variants`, `a11yRequirements` (required label/role/contrast), `antiPatterns`, `validUsages`, `tokensConsumed`. **This is the single biggest AI-native lever.**

### AI editor consumption — convergence

- **Cursor**: `.cursor/rules/*.mdc` plus MCP
- **Windsurf**: `.windsurfrules` plus MCP
- **Claude Code**: `CLAUDE.md` plus MCP plus Skills
- **Continue / Cline**: `.continuerules` plus MCP
- **Aider**: `CONVENTIONS.md`
- **Copilot**: `.github/copilot-instructions.md` plus AGENTS.md

**Convergence**: AGENTS.md plus MCP is the de facto cross-tool baseline. Atrium ships one MCP server and symlinks `CLAUDE.md`, `.cursor/rules/atrium.mdc`, `.windsurfrules` to a single `AGENTS.md`.

### Self-validating components

React-side, `react-a11y` (legacy) and `a13y.dev` warn in dev. Web Components have a structural advantage: `attributeChangedCallback` plus `connectedCallback` can run accessible-name checks at attribute-set time and `console.warn` with the exact node. A dev-only validator bundle that strips in production, modeled on Lit's reactive-controllers pattern, gives runtime correctness checks without production cost.

## Lightweight cross-stack tooling

### CLI distribution

Pure Node + ESM, published to npm, executed via `npx`, `pnpm dlx`, `yarn dlx`, `bunx`, or `deno run npm:`. **`nypm`** (unjs) provides unified package-manager detection. Avoid Bun-compiled binaries — they lose the `npx` UX, and government sites cannot always whitelist binary downloads. One package, one entry, runtime-detect.

### Polyglot static analysis — the ESLint replacement

- **Biome 2.3** (November 2025) added experimental Vue, Svelte, and Astro support — formats and lints `<script>`/`<style>` plus HTML templates. Still experimental.
- **Tree-sitter + ast-grep** is the **production-ready polyglot path**. Grammars exist for Vue, Svelte, Astro (virchau13/tree-sitter-astro), plain HTML, Twig (community), and TSX. ast-grep provides a YAML rule DSL — ideal for "Button must have aria-label or text child" across all template languages. Single Rust binary (~3MB), no JavaScript dependency tree.
- **Oxc** is JavaScript/TypeScript-only today.

**Bet on ast-grep + tree-sitter** for cross-template validation. Add Biome where it works.

### Style delivery for Web Components

Constructable Stylesheets plus `adoptedStyleSheets` is the modern path. Lit's `` css`` `` tagged template handles deduplication, SSR `<style>` injection, and client hand-off via `@lit-labs/ssr`. Use `@layer atrium.base, atrium.theme, atrium.components` to give consumers a predictable override surface. Theme tokens via CSS custom properties on `:root` (or shared `CSSStyleSheet`).

### Token compilation

- **DTCG 2025.10 reached first stable** (W3C CG, October 28 2025).
- **Terrazzo** has the most complete DTCG support today (resolvers, full 2025.10 in 2.0).
- **Style Dictionary v4** has DTCG support; v5 is catching up.
- **Tokenami** is React-Tailwind-flavored — too narrow.

**Pick Terrazzo** for compilation to CSS variables, Tailwind v4 `@theme`, TypeScript, JSON, Figma. Style Dictionary as fallback.

### Git vs HTTP registry

For government, ship **both**:

- Primary distribution: HTTP JSON (shadcn pattern, easy CDN).
- Secondary: signed Git tags of the registry repo, for air-gapped mirrors.
- Add Sigstore/cosign signatures plus SHA-256 in `registry-item` for provenance and FedRAMP audit.

shadcn's Zeta (rbadillap/zeta) shows the private-registry pattern.

## Drift management

shadcn discussion **#790 ("Need easy way to update components") is the canonical complaint, still open after 2+ years**. Issue **#376 ("Long-term maintainability")** echoes it.

### Approaches evaluated

1. **Lockfile + checksums + three-way merge** — nobody ships this for components. **Strong differentiator for Atrium.** Record `installedFromVersion` plus content hash in `atrium-lock.json`; on `atrium update`, fetch the new file, fetch the original at `installedFromVersion`, run `git merge-file --diff3 user base new`. Lightweight, proven, no jscodeshift dependency.

2. **Codemods** — Hypermod (jscodeshift plus AI-authored) and Chakra-style codemods work well for prop renames and import moves; weaker for structural changes. Ship codemods alongside the merge tool for breaking changes.

3. **Git-based diff merges** — the `git merge-file` approach in (1) is the cheapest implementation. No dependencies.

4. **Polyglot AST refactors** — ast-grep YAML rules can rewrite TSX, Vue, Svelte, Twig identically. Ship one rule per breaking change; works across the entire L2/L4 surface.

## Bundle benchmarks (April 2026, gzipped)

Approximate sizes for Button + FormField + Alert:

| Stack | Size |
|---|---|
| **Vanilla CSS + tiny JS** | ~5–8 KB |
| **Lit + custom WC** | ~10 KB |
| **shadcn/ui** (Tailwind + Radix) | ~40–55 KB |
| **Carbon Web Components** | ~50–70 KB |
| **Spectrum Web Components** | ~60–90 KB |

**Implication**: vanilla-CSS-first with optional Lit-based WC enhancement layer is materially smaller than every alternative. The "lightweight" claim has receipts.

## Anti-shadcn lessons from production

- **Drift is the #1 unfixed pain** (issues #790, #376). No upgrade path means teams freeze versions or fork.
- **Monorepo path resolution is broken** (#6020, #8308, #9239). The CLI mis-resolves `tsconfig` aliases.
- **Sole-maintainer risk** (#6417, #1374). Government cannot depend on bus-factor=1.
- **Form architecture churn** — October 2025 shadcn replaced `<Form>` with `Field` plus BYO state library (discussion #9505); consumers had to migrate. Lesson: do not couple to one form library.
- **Tailwind v4 + React 19 migration** (#6585) was painful because components had `forwardRef` plus Tailwind v3 patterns hard-coded; codemods helped but did not fully resolve.
- **Maintainers admit**: the registry was built for install, not for governance or update. CLI 3 added namespaces and MCP but did **not** address drift.

## Concrete design input for Atrium

1. **WC-first with framework wrappers; vanilla CSS layer baseline.**
2. **Manifest extends CEM** with a11y, variants, anti-patterns, token consumption — the AI lever.
3. **MCP server with `validate_usage` and `migrate` tools**, not just `add`.
4. **AGENTS.md + llms.txt + CLAUDE.md symlink** for editor coverage.
5. **ast-grep YAML rules ship with components** (cross-template validation).
6. **`atrium-lock.json` + `git merge-file` three-way update** — directly fixes shadcn's #1 gap.
7. **Terrazzo for tokens; DTCG 2025.10 native.**
8. **Signed registry** (HTTP primary, Git mirror) for government provenance.
9. **Multi-organization maintainer charter from v0** (avoid AuDS-style collapse).
10. **Decouple from form-state libraries** — components support controlled and uncontrolled patterns; do not embed a specific form solution.

## Sources

- shadcn MCP docs: https://ui.shadcn.com/docs/mcp
- shadcn CLI 3.0 changelog: https://ui.shadcn.com/docs/changelog/2025-08-cli-3-mcp
- shadcn `registry-item.json`: https://ui.shadcn.com/docs/registry/registry-item-json
- Carbon MCP overview: https://carbondesignsystem.com/developing/carbon-mcp/overview/
- carbon-mcp repo: https://github.com/SandeepBaskaran/carbon-mcp
- Carbon MCP Medium write-up: https://medium.com/@ramyaskv812/turning-design-systems-into-conversations-how-carbon-mcp-makes-ai-carbon-aware-30e6006f79d7
- southleft/design-systems-mcp: https://github.com/southleft/design-systems-mcp
- AGENTS.md: https://agents.md/
- HN discussion of AGENTS.md: https://news.ycombinator.com/item?id=44957443
- AGENTS.md guide: https://www.remio.ai/post/what-is-agents-md-a-complete-guide-to-the-new-ai-coding-agent-standard-in-2025
- llms vs agents.md: https://dacharycarey.com/2026/02/26/llms-vs-agents-as-docs-consumers/
- Biome 2.3: https://biomejs.dev/blog/biome-v2-3/
- Biome 2026 roadmap: https://biomejs.dev/blog/roadmap-2026/
- tree-sitter-astro: https://github.com/virchau13/tree-sitter-astro
- ast-grep: https://ast-grep.github.io/
- Constructable Stylesheets: https://web.dev/articles/constructable-stylesheets
- Lit cheat sheet: https://lit.dev/articles/lit-cheat-sheet/
- WC + Tailwind + SSR: https://www.konnorrogers.com/posts/2023/web-components-tailwind-and-ssr
- DTCG 2025.10 stable: https://www.w3.org/community/design-tokens/2025/10/28/design-tokens-specification-reaches-first-stable-version/
- Terrazzo DTCG: https://terrazzo.app/docs/guides/dtcg/
- Style Dictionary DTCG: https://styledictionary.com/info/dtcg/
- Hypermod codemods: https://www.hypermod.io/blog/7-automating-design-system-evolution
- jscodeshift: https://jscodeshift.com/
- ast-grep vs jscodeshift: https://www.hypermod.io/blog/4-jscodeshift-vs-ast-grep
- git merge-file: https://git-scm.com/docs/git-merge-file
- Three-way merge / diff3: https://blog.jcoglan.com/2017/05/08/merging-with-diff3/
- shadcn discussion #790 — easy update: https://github.com/shadcn-ui/ui/discussions/790
- shadcn issue #376 — maintainability: https://github.com/shadcn-ui/ui/issues/376
- shadcn issue #6417 — sole maintainer: https://github.com/shadcn-ui/ui/issues/6417
- shadcn discussion #9505 — Form refactor: https://github.com/shadcn-ui/ui/discussions/9505
- shadcn issue #6585 — Tailwind v4 migration: https://github.com/shadcn-ui/ui/issues/6585
- shadcn issue #9239 — monorepo: https://github.com/shadcn-ui/ui/issues/9239
- nypm: https://github.com/unjs/nypm
- Zeta private registry: https://github.com/rbadillap/zeta
- USWDS gen-AI feature request #6100: https://github.com/uswds/uswds/issues/6100
