# Roadmap

Atrium is delivered in phased releases. Each phase has clear deliverables, success criteria, and an honest scope. The roadmap is conservative on scope and ambitious on quality — the project succeeds by shipping a small thing well, then expanding from a stable base.

## Public roadmap posture

When this repository is published on GitHub, this roadmap should be treated as the public contract for priorities. It is not a promise of exact dates. It is a sequence of gates: a phase only advances when its quality criteria are met.

The central rule is:

> Do not scale component count until the registry, evidence, validation, update, and security infrastructure works.

## Phases at a glance

| Phase | Duration | Audience | Theme |
|---|---|---|---|
| **GitHub launch readiness** | 1-2 weeks | Public readers, design partners | Make the repository credible before code lands. |
| **v0.0 — Foundation** | 8 weeks | Internal alpha + 2–3 design partners | Prove the architecture with the smallest viable product. |
| **v0.1 — Public alpha** | 12 weeks (cumulative 20) | Public alpha; ~10 design-partner teams | Expand component coverage; validate AI integration; harden drift. |
| **v0.2 — Multi-framework + patterns** | 24 weeks (cumulative 44) | Public beta; broader gov-tech adoption | Vue / Svelte / Solid adapters; L3 patterns; codemods; templates. |
| **v0.3+ — Research frontier** | ongoing | Selective | Resumability, CRDT-aware patterns, typed accessibility research. |
| **v1.0 — Stable** | after v0.2 gates | Production evaluators | Evidence-backed stable component and pattern set. |

Each phase below has a dedicated document with detailed scope.

- [`github-launch.md`](./github-launch.md)
- [`01-v0.0-foundation.md`](./01-v0.0-foundation.md)
- [`02-v0.1-public-alpha.md`](./02-v0.1-public-alpha.md)
- [`03-v0.2-multi-framework.md`](./03-v0.2-multi-framework.md)
- [`04-v0.3-research-frontier.md`](./04-v0.3-research-frontier.md)
- [`risks-and-mitigations.md`](./risks-and-mitigations.md)

## Top-line success criteria

If Atrium does these, it succeeds. If it cannot, we redesign before scaling.

- **Bundle target met**: a typical 5-component L0-only page under 10KB gzipped (versus shadcn's 40–55KB).
- **Drift solved**: `atrium update` works on 50+ real updates with under 10% conflict rate.
- **AI integration meaningful**: Cursor/Claude/Copilot generate Atrium code with zero hallucinated props when grounded by extended CEM and AGENTS.md; `atrium audit` catches violations.
- **Cross-stack proven**: same component capsule renders in Next.js, Drupal Twig, plain HTML, and a Vite SPA — all with passing accessibility evidence.
- **Time-to-first-component**: under 10 minutes from `atrium init` to a working accessible form.
- **Stable accessibility evidence**: at least 12 components reach `stable` with full evidence packets (axe, keyboard, NVDA, VoiceOver, JAWS).
- **CI usable by agencies**: `audit`, `verify`, `theme validate`, `evidence --check`, and SARIF output run in GitHub Actions.
- **Security provenance credible**: capsules are signed, lockfile-verifiable, SBOM-backed, and mirrorable for air-gapped environments.
- **Governance healthy**: at least 3 contributing organizations before beta-scale claims.

## GitHub milestone map

Use these as GitHub milestones:

| Milestone | Exit gate |
|---|---|
| Repository readiness | License, governance, security policy, contribution model, roadmap, and disclaimers are public. |
| v0.0 foundation prototype | Fresh project can install and verify a small accessible form in under 10 minutes. |
| v0.0 update and CI gate | `atrium update` works across drift scenarios and `atrium audit --sarif` uploads to code scanning. |
| v0.1 public alpha | Public registry, MCP, docs site, 20+ components, first pattern, and 12 evidence-complete components. |
| v0.2 beta | Multi-framework adapters, complex components, USWDS migration tooling, third-party a11y audit. |
| v1.0 stable | 25-30 stable components, 6+ patterns, third-party audits, LTS policy, and durable governance. |

## Out of scope for v0.x

These are deliberate omissions:

- **All 47 USWDS components.** v0.x ships a focused subset; comprehensive parity is a v1.x ambition.
- **AI Assistant Panel.** A full AI-UX research project disguised as a component. v1.0+ at earliest.
- **Vue / Svelte / Solid adapters in v0.0–v0.1.** L1 ships as Lit custom elements + React adapter only. Multi-framework lands in v0.2.
- **Date Picker, Data Grid, full ComboBox in v0.0.** v0.1 ships the simpler ComboBox; complex date and table land in v0.2.
- **Effect systems, event-sourced patterns, CRDT-friendly patterns.** Architecture stays compatible; exploitation is v0.3+.
- **Native mobile (iOS/Android).** Web first; native ports are a v1.x consideration only if demand exists.

## What anchors every release

Every release — v0.0 through v0.3+ — ships:

- Signed capsules (Sigstore).
- Lockfile + 3-way merge for drift.
- Extended CEM for every published component.
- AGENTS.md + MCP server.
- DTCG tokens with Tailwind v4 `@theme` output.
- Polyglot validation (ast-grep).
- Real demo apps (Next.js + Drupal Twig + plain HTML at minimum).
- Accessibility evidence appropriate to each component's stability tier.

## Versioning posture

- **Semver from v0.1 onward.** v0.0 is intentionally pre-stable.
- **Breaking changes ship with codemods.** No silent breakage.
- **`stable` graduation requires full evidence** (see [accessibility.md](../architecture/accessibility.md)).
- **`deprecated` capsules ship with migration codemods to the replacement.**

## Where we measure

| Metric | Tool | Target |
|---|---|---|
| Bundle size | `atrium audit --bundle` | <10KB L0-only, <15KB with one L1 |
| Drift conflict rate | `atrium update` telemetry (opt-in) | <10% |
| AI generation accuracy | Eval suite against Cursor/Claude/Copilot | 0 hallucinated props |
| Time-to-first-component | Onboarding video timing | <10 min |
| Accessibility evidence | `atrium evidence --report` | All `stable` components have full packet |
| Cross-stack parity | Snapshot tests in 4 demo apps | 100% pass |
| CI integration | GitHub Actions / SARIF | Findings visible in code scanning |
| Registry trust | `atrium verify` | Tampered capsule detected |
| Theme safety | `atrium theme validate` | Critical contrast failures block |

## Cadence

After v0.0:

- **Patch releases** (bug fixes, accessibility fixes): as needed, weekly cadence preferred.
- **Minor releases** (new components, additive changes): monthly during v0.1–v0.2.
- **Major releases** (breaking changes): announced 3 months in advance, with codemods.

## Where this roadmap ends

When v1.0 ships, Atrium has:

- 25–30 stable components covering primary federal-service UI needs.
- L3 patterns for at least 6 service flows.
- L4 templates for Nunjucks, Twig, Jinja, ERB, plain HTML.
- L2 adapters for React, Vue, Svelte, Solid.
- A signed registry, lockfile, drift management, validator.
- Extended CEM and MCP server consumed by Cursor, Claude, Windsurf, Copilot.
- Independent third-party accessibility audit completed.
- A community of contributors across at least 3 organizations.

That is the v1.0 bar. Each pre-1.0 phase below builds toward it.
