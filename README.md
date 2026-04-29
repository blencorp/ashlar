# Ashlar

> Ashlar is independent open-source research and is not affiliated with, endorsed by, or sponsored by GSA, USWDS, NDS, or the U.S. federal government.

Ashlar is a government-first, AI-native design-system infrastructure project for public-service interfaces.

In masonry, an ashlar is a stone block cut with precise faces so it can fit cleanly into a larger structure. The name reflects the project goal: small, well-specified UI building blocks that teams can verify, own, and assemble safely.

It is inspired by the values of the U.S. Web Design System, but it is not trying to be a cosmetic refresh of USWDS. The thesis is that government teams need a new delivery model: accessible components with evidence, source ownership with safe updates, signed distribution, agency theming, CI validation, and structured contracts that AI tools can use correctly.

## Why this exists

USWDS gave federal teams a shared civic design language: accessible, consistent, trustworthy, plain-language public services. Those values are still right.

The implementation model is where the pain lives:

- official framework support is limited;
- teams repeatedly wrap or fork components;
- Sass/Gulp-era workflows feel heavy in modern stacks;
- component usage rules are mostly prose, not machine-verifiable contracts;
- source copies drift after customization;
- AI agents do not have structured component metadata to validate against;
- agencies need better CI, provenance, and accessibility evidence.

Meanwhile, the web platform has moved forward. Modern CSS and HTML can now handle much of what older design systems shipped JavaScript for. Tailwind v4 made CSS variables and `@theme` a first-class integration point. Design Tokens Community Group 2025.10 gives design systems a stable token format. MCP and AGENTS.md give AI tools a real interface into project rules.

Ashlar combines these into a government-grade component registry.

## What Ashlar is

Ashlar is a registry of versioned, signed, evidence-backed **component capsules**.

Each capsule can include:

- semantic HTML and CSS;
- Web Component behavior where JavaScript is genuinely needed;
- framework adapters generated from manifests;
- DTCG design tokens;
- accessibility evidence;
- ast-grep validation rules;
- codemods for migrations;
- AI-readable Custom Elements Manifest metadata;
- provenance and content hashes.

The goal is a shadcn-like developer experience with government-grade safety rails:

```bash
npx ashlar init
npx ashlar add button alert form-field
npx ashlar audit
npx ashlar verify
npx ashlar evidence button
```

## What makes it different

- **Accessibility evidence, not claims**: stable components ship WCAG mappings, axe results, keyboard tests, manual screen-reader notes, and known limitations.
- **Safe source ownership**: teams own component source, while `ashlar-lock.json`, hashes, three-way merges, and codemods make updates possible after customization.
- **Federal CI tooling**: `ashlar audit`, `verify`, `theme validate`, and `evidence --check` are designed to run in CI and emit SARIF.
- **AI-native contracts**: extended Custom Elements Manifest + MCP + AGENTS.md give coding agents structured rules, not just documentation pages.
- **Framework-agnostic reach**: L0 components are HTML/CSS; L1 components use Lit Web Components only where stateful behavior requires JavaScript.
- **Tailwind-compatible, not Tailwind-dependent**: DTCG tokens emit Tailwind v4 `@theme`, but canonical components use semantic CSS so Drupal, plain HTML, Rails, Django, WordPress, and static sites can adopt them too.
- **Security and provenance**: capsules are designed for Sigstore signing, SLSA-informed provenance, SBOMs, signed Git mirrors, and air-gapped registry operation.

## Current status

This repository now contains the first v0.0 foundation prototype alongside the research, strategy, architecture, and roadmap docs.

The current prototype includes:

- TypeScript CLI skeleton;
- local registry format;
- capsule schema and hashing;
- first L0 Button capsule;
- initial audit / verify commands;
- CI workflow with SARIF;
- plain HTML and Next.js demos.

## Roadmap

The roadmap is gate-based, not date-promise-based:

1. **GitHub launch readiness**: license, governance, security policy, contribution model, public roadmap, disclaimers.
2. **v0.0 Foundation**: prove registry, capsule, lockfile, audit, verify, token, and evidence mechanics.
3. **v0.1 Public alpha**: public registry, MCP server, 20+ components, first L3 pattern, 12 evidence-complete components.
4. **v0.2 Beta**: Vue/Svelte/Solid adapters, complex components, USWDS migration tooling, Tailwind companion, third-party accessibility audit.
5. **v1.0 Stable**: 25-30 stable components, 6+ service patterns, durable governance, LTS posture.

See [docs/roadmap/00-roadmap.md](docs/roadmap/00-roadmap.md) and [docs/roadmap/github-launch.md](docs/roadmap/github-launch.md).

## Start here

- [Strategy](docs/strategy.md)
- [Philosophy](docs/philosophy.md)
- [Architecture overview](docs/architecture/overview.md)
- [Toolchain decision](docs/architecture/toolchain.md)
- [Tooling baseline](docs/architecture/tooling-baseline.md)
- [Compliance, security, and CI tooling](docs/architecture/compliance-security-ci.md)
- [Final research pass](docs/research/07-final-research-2026-04-29.md)
- [Gap analysis](docs/research/08-gap-analysis-2026-04-29.md)
- [Governance model](docs/governance/00-governance-model.md)
- [v0 foundation implementation plan](docs/superpowers/plans/2026-04-29-ashlar-v0-foundation.md)
- [v0 standards and evidence slice plan](docs/superpowers/plans/2026-04-29-v0-0-standards-evidence-slice.md)

## License

Apache-2.0. The explicit patent grant is useful for federal procurement and regulated-industry adoption.
