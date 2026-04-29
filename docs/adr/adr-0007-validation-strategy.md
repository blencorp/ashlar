# ADR 0007 — Validation strategy: ast-grep with tree-sitter, not ESLint

## Status

Proposed.

## Decision

Use **ast-grep** (with **tree-sitter** grammars) as the validator engine for component usage across all consumer environments. Ship YAML rules, generated from each component's extended Custom Elements Manifest, that validate component usage in TSX, JSX, Vue SFCs, Svelte, Astro, plain HTML, and Drupal Twig from the same rule.

Do **not** ship an ESLint plugin as the primary validator. Optionally ship a thin ESLint-shim that delegates to ast-grep for teams that prefer ESLint integration.

## Rationale

Ashlar's audience includes federal stacks built on Drupal (Twig), Sitecore, Adobe Experience Manager, server-rendered Django/Rails/PHP, plain HTML, and modern React/Vue/Svelte/Astro frameworks. ESLint is JavaScript-only — it cannot validate component usage in Twig, plain HTML, or any non-JS template language.

ast-grep is a tree-sitter-based AST tool with a YAML rule DSL. Tree-sitter grammars exist for every relevant target: TSX, JSX, Vue SFCs, Svelte, Astro, plain HTML, Twig. **The same YAML rule validates all of them.** This means a rule like "Button must have aria-label or text content" is written once and applies to React JSX, Vue templates, plain HTML, and Drupal templates simultaneously.

ast-grep is distributed as a single Rust binary (~3MB). No JavaScript dependency tree. No build-pipeline integration required. CI integration is one line; pre-commit hook integration is one line. It does not require installing the design system into the consumer's build.

Rules are generated from extended CEM `_ashlar.antiPatterns` and `_ashlar.constraints`. Component authors declare anti-patterns in the manifest; the rule generator emits YAML; the validator applies.

## Consequences

**Positive**

- True polyglot validation across the entire L4 (templates) surface.
- Zero coupling to consumer build pipelines.
- Rules are authored once in the manifest, generated automatically.
- Single binary, easy CI/CD integration, no node_modules bloat.
- Rust-fast on large codebases.

**Negative**

- Adds a dependency (ast-grep binary) to the toolchain.
- Some teams have organizational preference for ESLint (familiarity, existing rules infrastructure).
- ast-grep rule DSL has a learning curve for contributors writing custom rules.

**Mitigations**

- Ship a thin ESLint-shim that delegates to ast-grep for teams that need ESLint integration in their existing CI.
- Provide rule generation from CEM so most rules are auto-generated, not hand-authored.
- Document rule DSL extensively with worked examples per template language.

## References

- [Validation architecture](../architecture/validation.md)
- ast-grep: https://ast-grep.github.io/
- tree-sitter-astro: https://github.com/virchau13/tree-sitter-astro
- ast-grep vs jscodeshift: https://www.hypermod.io/blog/4-jscodeshift-vs-ast-grep
