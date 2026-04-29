# Ashlar

> Ashlar is independent open-source research and is not affiliated with, endorsed by, or sponsored by GSA, USWDS, NDS, or the U.S. federal government.

Ashlar is open-source supply-chain and validation infrastructure for federal-standards web interfaces.

In masonry, an ashlar is a stone block cut with precise faces so it fits cleanly into a larger structure. The name reflects the project goal: a small, well-specified substrate that federal teams can verify, sign, update, and assemble safely under whatever component system they already use.

## What Ashlar does

Three verbs:

- **Audit** — `ashlar audit` enforces Federal Web Standards, USWDS conventions, and component-level accessibility rules in CI, emitting SARIF for GitHub Code Scanning, GitLab, and Azure DevOps. It runs against existing markup (TSX, JSX, plain HTML, ERB, and other languages where ast-grep has real coverage) without requiring a new component library to be installed first.
- **Sign and verify** — Components ship as content-addressed, Sigstore-signed *capsules*. The lockfile records hashes; `ashlar verify` re-hashes installed files and validates signatures against the embedded chain. Air-gapped agencies mirror the registry with a bundled trust root.
- **Update safely** — Capsules install as source code (shadcn-style ownership) but track provenance through a lockfile and three-way merge. Local customizations survive upstream updates; codemods carry breaking changes; accessibility-critical files force confirmation.

The accessibility evidence schema (axe + keyboard + manual screen-reader + WCAG mapping + ICT Baseline alignment) and the AI contract (extended Custom Elements Manifest, MCP server, AGENTS.md) are how each verb is grounded — not separate pillars.

## What's true today

Ashlar is in v0.0 prototype. **See [STATUS.md](STATUS.md) for the live, honest list of what is implemented, experimental, and planned.** Headline claims that are not yet code (Sigstore signing, three-way merge, MCP server, ast-grep validation, full DTCG token compiler) are explicitly marked there.

The current prototype implements:

- A federal HTML policy audit with seven page-shell rules, parser-backed, with SARIF output;
- A local registry index and the `init`, `add`, `audit`, `verify`, `evidence`, `search`, `view`, and `design sync` commands;
- A signed-content-addressed lockfile substrate (file hashes recorded; signature verification not yet wired);
- One experimental Button capsule (status `experimental`, evidence `not-reviewed`) with platform features, policy mappings, and ICT Baseline planned-test entries;
- A Vite theme workbench across Federal, VA, and USDA themes with light/dark/system modes;
- A plain HTML demo;
- CI that runs checks, build, and SARIF artifact upload.

## Why this exists

USWDS gave federal teams a shared civic design language: accessible, consistent, trustworthy, plain-language public services. Those values are still right.

The substrate beneath them is where the pain lives:

- Federal stacks span React, Drupal/Twig, WordPress, Rails, Django, plain HTML, and custom CMSs; component usage rules are mostly prose, not machine-verifiable contracts;
- Source copies drift after customization with no safe upgrade path;
- Agencies need supply-chain provenance, signed releases, SBOMs, and air-gapped operation that a component library alone does not provide;
- AI coding agents need executable component contracts, not prose docs they paraphrase incorrectly;
- The 21st Century IDEA Act and the August 2025 *America by Design* executive order both demand modernization of public-service interfaces.

Meanwhile, the platform has moved forward — modern CSS handles much of what older design systems shipped JavaScript for, Tailwind v4 `@theme` integrates with token pipelines, and the Linux Foundation now governs both AGENTS.md and MCP.

Ashlar is the substrate beneath the components: the verifier, the signer, the updater, the contract.

## Public posture

- Ashlar is **informed by** USWDS — civic principles, accessibility discipline, plain-language guidance.
- Ashlar is **not affiliated** with USWDS, GSA, the U.S. federal government, or the National Design Studio.
- Ashlar is designed to **interoperate with USWDS**: USWDS markup passes Ashlar's federal policy audit; USWDS components can ship as Ashlar capsules; the banner and identifier checks accept `<usa-banner>` and `usa-identifier` class tokens by default.
- Ashlar **engineers to WCAG 2.2 AA** while documenting the legal baselines clearly: Section 508 incorporates WCAG 2.0 AA; ADA Title II references 2.1 AA (compliance dates April 26, 2027 / April 26, 2028).
- Ashlar provides component-level evidence; it does not claim to make an application compliant by itself.

## Try it

```bash
pnpm install
pnpm build

# Initialize a target project (e.g. a Vite app)
node /path/to/ashlar/packages/cli/dist/index.js init

# Inspect the registry
node /path/to/ashlar/packages/cli/dist/index.js search button
node /path/to/ashlar/packages/cli/dist/index.js view button

# Install a capsule as source
node /path/to/ashlar/packages/cli/dist/index.js add button

# Verify the install
node /path/to/ashlar/packages/cli/dist/index.js verify

# Audit static HTML against federal page-shell standards
node /path/to/ashlar/packages/cli/dist/index.js audit --policy federal --explain examples/plain-html/index.html

# Show the evidence packet
node /path/to/ashlar/packages/cli/dist/index.js evidence button --format json
```

## Roadmap

The roadmap is gate-based, not calendar-based, and v0.0 is staged as a slice graph rather than a single release block.

1. **GitHub launch readiness** — license, governance, security policy, contribution model, public roadmap, disclaimers, named external maintainer.
2. **v0.0 Foundation** — six independently shippable slices: standards-and-evidence (✓), validator wedge, drift management, supply-chain hardening, AI contracts, token pipeline.
3. **v0.1 Public alpha** — public registry, MCP read-only server, 8-12 components with tiered evidence, first L3 pattern, foundation home + at least three contributing organizations.
4. **v0.2 Beta** — Vue/Svelte/Solid adapters, complex L1 components, USWDS migration tooling, Tailwind companion, third-party accessibility audit.
5. **v1.0 Stable** — durable governance, LTS posture, evidence-tiered stable component count (10-12 stable + LTS-aspiring rather than 25-30 single-tier).

See [docs/roadmap/00-roadmap.md](docs/roadmap/00-roadmap.md), [docs/roadmap/01-v0.0-foundation.md](docs/roadmap/01-v0.0-foundation.md), and [docs/roadmap/github-launch.md](docs/roadmap/github-launch.md).

## Start here

- [STATUS.md](STATUS.md) — live truth for what's implemented vs. planned
- [Strategy](docs/strategy.md)
- [Philosophy](docs/philosophy.md)
- [Architecture overview](docs/architecture/overview.md)
- [Toolchain decision](docs/architecture/toolchain.md)
- [Compliance, security, and CI tooling](docs/architecture/compliance-security-ci.md)
- [Final research pass](docs/research/07-final-research-2026-04-29.md)
- [Gap analysis](docs/research/08-gap-analysis-2026-04-29.md)
- [Governance model](docs/governance/00-governance-model.md)
- [v0.0 Foundation roadmap](docs/roadmap/01-v0.0-foundation.md)
- [v0.0 Standards and Evidence Slice spec](docs/superpowers/specs/2026-04-29-v0-0-standards-evidence-slice-spec.md)
- [v0.0 Validator Wedge spec (next slice)](docs/superpowers/specs/2026-04-29-v0-0-validator-wedge-spec.md)

## License

Apache-2.0. The explicit patent grant is useful for federal procurement and regulated-industry adoption.
