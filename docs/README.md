# Ashlar

Ashlar is a government-first, web-platform-native, AI-readable design system distributed as a registry of versioned, signed, evidence-backed component capsules.

In masonry, an ashlar is a precisely cut stone block. The name is shorthand for the project thesis: component building blocks should be well-shaped, verifiable, and fit cleanly into many public-service stacks.

## What this repository is

This repository contains the Ashlar v0.0 foundation prototype plus the philosophy, architecture, research base, and roadmap that guide the implementation.

The work is led by engineers at [Blen](https://blencorp.com) with the intent to release as community-governed open source. It is not affiliated with the official U.S. Web Design System (USWDS) or with the National Design Studio.

## Reading order

1. [`strategy.md`](./strategy.md) — the public case for Ashlar and how to position it.
2. [`philosophy.md`](./philosophy.md) — the thesis and design principles.
3. [`architecture/overview.md`](./architecture/overview.md) — the layered architecture and how the pieces fit.
4. [`architecture/toolchain.md`](./architecture/toolchain.md) — the recommended v0/v1 technical foundation.
5. [`architecture/tooling-baseline.md`](./architecture/tooling-baseline.md) — pinned stable runtime and monorepo tool versions.
6. [`architecture/compliance-security-ci.md`](./architecture/compliance-security-ci.md) — accessibility, security, provenance, and CI tooling scope.
7. [`architecture/`](./architecture/) — detailed architecture documents (capsule format, drift management, AI-native strategy, validation, tokens, accessibility evidence, future architecture).
8. [`adr/`](./adr/) — architecture decision records.
9. [`roadmap/00-roadmap.md`](./roadmap/00-roadmap.md) — phased delivery plan and success gates.
10. [`roadmap/github-launch.md`](./roadmap/github-launch.md) — public GitHub launch checklist, milestones, and labels.
11. [`research/`](./research/) — the body of research informing design decisions, including the final April 29, 2026 current-source pass.
12. [`research/08-gap-analysis-2026-04-29.md`](./research/08-gap-analysis-2026-04-29.md) — gap analysis and next roadmap correction.
13. [`research/09-design-md-2026-04-29.md`](./research/09-design-md-2026-04-29.md) — DESIGN.md adoption recommendation.
14. [`superpowers/specs/2026-04-29-v0-0-standards-evidence-slice-spec.md`](./superpowers/specs/2026-04-29-v0-0-standards-evidence-slice-spec.md) — behavior contract for the standards/evidence slice.
15. [`superpowers/plans/2026-04-29-v0-0-standards-evidence-slice-revised.md`](./superpowers/plans/2026-04-29-v0-0-standards-evidence-slice-revised.md) — implementation plan for the standards/evidence slice.
16. [`governance/`](./governance/) — community model and contribution rules.
17. [`examples/`](./examples/) — concrete schema examples.

## What problem this solves

USWDS, the official U.S. federal design system, remains active and valuable. Its public values, accessibility posture, and civic design principles should be preserved. The gap is the delivery model: no official framework support, no source-code registry, Sass/Gulp-era tooling, limited machine-readable metadata, and no built-in update path for teams that wrap or fork components. As of the August 2025 America by Design fact sheet, fewer than 20% of federal websites used USWDS code.

shadcn/ui demonstrated that source-code distribution beats package-based distribution for modern teams, but its production users continue to report unsolved problems: components drift after install, accessibility evidence is absent, theming is shallow, framework coupling is real, and the registry is built for installation rather than governance.

Ashlar is the response. It assumes a 2026 web platform that delivers most UI without JavaScript, treats statecharts as the right abstraction for the components that genuinely need state, ships extended Custom Elements Manifests as the AI contract, and uses lockfiles plus three-way merges to make source ownership safely updateable.

## Technical foundation

Ashlar's v0/v1 foundation is intentionally conservative where agency adoption depends on trust:

- Node + TypeScript CLI, distributed through npm and runnable with `npx`.
- DTCG 2025.10 tokens compiled to CSS variables, Tailwind v4 `@theme`, TypeScript, and design-tool outputs.
- Semantic CSS components using modern platform features, not Tailwind as the authoring layer.
- Tailwind v4 as a first-class output and integration target.
- Lit Web Components only for behavior-heavy components.
- ast-grep + tree-sitter for polyglot validation.
- Sigstore, SLSA-informed provenance, SBOMs, signed Git tags, and offline registry mirrors.
- Extended CEM + MCP + AGENTS.md for AI-native use.

Zig remains a future experiment, not a v0/v1 foundation, because Zig 0.16 still documents known bugs and regressions.

## Status

| Phase | Status | Date |
|---|---|---|
| Initial research and strategy | Complete | April 2026 |
| Architecture redesign post-research | Complete | April 2026 |
| Detailed architecture & ADRs | Complete enough for v0.0 planning | April 2026 |
| Final current-source research pass | Complete | April 29, 2026 |
| Public strategy and GitHub launch docs | Complete | April 29, 2026 |
| Roadmap and v0.0 specification | Drafted | April 2026 |
| v0.0 prototype | Standards/evidence slice in progress | April 29, 2026 |

## Current CLI Surface

The local prototype currently demonstrates the source-owned registry flow:

```bash
npx ashlar init
npx ashlar search button
npx ashlar view button
npx ashlar add button
npx ashlar evidence button
npx ashlar audit --policy federal --explain examples/plain-html/index.html
npx ashlar design sync
npx ashlar verify
```

## License

Apache-2.0. The explicit patent grant is useful for federal procurement and regulated-industry adoption.
