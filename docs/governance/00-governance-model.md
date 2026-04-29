# Governance model

Ashlar is community-governed open source. This document describes the governance model: license, maintainer roles, contribution process, component lifecycle, release channels, security posture, and the rules for agency themes and custom registries.

The governance is designed to avoid the AuDS trap (single-organization ownership, single point of failure). Multi-organization maintenance is a hard requirement, not a nice-to-have.

## License

**Apache-2.0**.

Reasoning:

- Apache-2.0 includes explicit patent grant language, which matters for federal procurement.
- Apache-2.0 is widely accepted in government IT supply chains and federal contracting.
- MIT is also acceptable; we choose Apache-2.0 for the patent clause.

The license is finalized before public v0.1 release. Pre-public-alpha work may be under a placeholder license.

## Project name

The project name is **Ashlar**. Naming criteria:

- Not confused with the official USWDS or NDS branding.
- Available as an npm package name and `.dev` / `.org` domain.
- Trademark-clear in the design-system / open-source space.
- Memorable; pronounceable internationally.
- Short enough to read in a CLI prompt (`npx ashlar ...`).

If a trademark or package-namespace review later finds a blocking conflict, the project will rename before public release; backup names are tracked privately.

## Maintainer model

Ashlar is maintained by a **community maintainer team** with at least three contributing organizations represented (avoiding bus-factor=1).

### Roles

- **Architecture maintainer** — owns architectural direction, ADRs, breaking-change decisions.
- **Engineering maintainer** — owns the core registry, CLI, and build infrastructure.
- **Accessibility maintainer** — owns evidence packets, a11y test infrastructure, audit coordination.
- **Token / theme maintainer** — owns DTCG schema, theme validation, agency-theme submissions.
- **Docs / content maintainer** — owns the docs site, plain-language guidance, AGENTS.md, llms.txt.
- **Security maintainer** — owns Sigstore signing, supply-chain audit, CVE response.
- **Community / RFC steward** — runs the RFC process, event-driven community calls, and contributor onboarding.

A single person may hold more than one role; some roles can be shared. **No single role can be held exclusively by a single organization.**

### Decision authority

- **Routine code review**: any maintainer can approve.
- **Architectural changes** (ADR-worthy): requires architecture maintainer + at least one other organization's maintainer.
- **Breaking changes**: requires public RFC + explicit comment window + architecture maintainer approval.
- **Releases**: requires engineering maintainer + security maintainer.
- **Stable graduation of a component**: requires accessibility maintainer.
- **License or governance changes**: requires unanimous maintainer approval.

## Contribution model

### Contribution types

- **Component proposal** — new component capsule.
- **Token proposal** — primitive or semantic token additions.
- **Agency theme** — themed override pack.
- **Pattern proposal** — new L3 pattern.
- **Codemod** — migration transform for a breaking change.
- **Bug fix** — patches without API changes.
- **Docs** — documentation, guides, examples.
- **Accessibility evidence update** — new manual test results, regression catches.
- **AI manifest improvement** — extended CEM additions, anti-pattern declarations.

### Component acceptance process

1. **Problem statement and user need**, with research links if applicable.
2. **Existing solution scan**, including USWDS and peer government systems.
3. **API sketch** with extended CEM excerpt.
4. **Token impact review** — new tokens? semantic implications?
5. **Accessibility plan** — WCAG criteria, keyboard map, ARIA roles.
6. **Prototype** in `experimental` status.
7. **Public feedback gate** (long enough for meaningful community and expert review; longer for L3 patterns).
8. **Beta release** with automated tests + initial evidence.
9. **Evidence completion** — manual SR tests, contrast validation, anti-pattern registration.
10. **Stable release** — full evidence packet, codemods documented.

This mirrors USWDS lifecycle governance, adapted for registry-first distribution.

## Component lifecycle

| Status | Meaning | Required artifacts |
|---|---|---|
| `proposal` | Idea with problem statement and API sketch. | Markdown spec only. |
| `experimental` | Implementation exists; not for production. | Code, tests; no a11y guarantees. |
| `beta` | API mostly stable; automated tests pass. | Code, tests, axe results, basic CEM. |
| `stable` | Production recommended. | **Full evidence packet, codemods, multi-template renderings, signed manifest, third-party reviewed.** |
| `deprecated` | Replaced or removed. | Migration codemods to replacement. |

Status is declared in the capsule manifest and visible in the registry index.

`ashlar add` defaults to stable+. `--allow-experimental` opts in.

## Release channels

- `experimental` — early ideas; CLI warns on add.
- `beta` — usable but not stable; CLI suggests checking evidence.
- `stable` — recommended.
- `lts` — long-term support for components in critical government use.

LTS components receive security and accessibility patches for a published support window after `stable` graduation.

## Security and trust

- **Signed releases via Sigstore.** All capsules signed in CI via keyless OIDC.
- **Signed Git tags** as secondary mirror.
- **SHA-256 content hashes** in registry index and lockfile.
- **Dependency review** via GitHub Dependabot / equivalent.
- **SLSA-aware build practices** where feasible.
- **Vulnerability disclosure policy** with a coordinated disclosure window.
- **Changelogs flag accessibility and security changes** explicitly.
- **Capsule manifest header comments** record version + checksum (machine-readable provenance).

Security maintainer coordinates disclosure and patches.

## Registry governance

Not every submission is accepted. Admission criteria:

- **Accessible by evidence** — automated tests pass; manual evidence on a credible path.
- **Token-compatible** — uses Ashlar semantic tokens; no hard-coded brand values.
- **Minimal dependency weight** — justified per-component dependencies.
- **Clear user need** — problem statement with research signal.
- **Documented update path** — codemods for any breaking change.
- **AI manifest included** — extended CEM with variants, anti-patterns, a11y rules.
- **No hidden telemetry** — no analytics or tracking in registered capsules.
- **No unnecessary client-side data collection** — components do not exfiltrate user input.

Registry-level rejection is fine; the contributor can iterate. Rejection reasons are public.

## Agency themes

Agency themes are first-class registry items. They:

- Extend the default theme via DTCG token overrides.
- Pass `ashlar theme validate` (contrast pairs, forced-colors fallbacks, dark mode if declared).
- Preserve interaction semantics — themes change visual identity, not component behavior.
- Document the brand source (which agency, which guidelines, which version).
- Include at least one example application using the theme.

Themes ship in the same registry as components, with their own versioning and evidence (contrast validation results, theme migration codemods if applicable).

## Custom registries

Agencies and regulated-industry consumers can run their own registries:

- Ashlar registry build tooling (`@ashlar/registry-build`) is open-source.
- Custom registries bring their own signing keys.
- Custom registries can mirror the canonical registry plus add agency-specific capsules.
- The Ashlar core team does not gate-keep custom-registry contents.

This enables federal agencies to maintain agency-internal mirrors with FedRAMP-authorized infrastructure while still consuming the canonical Ashlar components.

## Community channels

- **GitHub Issues / Discussions** — primary contribution channel.
- **Public RFCs** — significant changes go through RFC with an explicit comment window.
- **Community calls** — open to contributors and consumers, convened around RFCs, releases, and adoption questions; recorded.
- **Public roadmap** — `docs/roadmap/` plus a public Trello/GitHub-projects view.
- **Public changelog** — every release has a public changelog with categorized changes (accessibility / security / performance / API).
- **Accessibility review board** — accessibility maintainer plus contributing-organization a11y reps.
- **Token / theme working group** — token maintainer plus interested theme contributors.

## Relationship to USWDS

Ashlar's posture toward USWDS is explicit:

- Ashlar is **informed by** USWDS — civic principles, accessibility discipline, plain-language guidance.
- Ashlar is **not affiliated with** USWDS, GSA, the U.S. federal government, or the National Design Studio.
- Ashlar **may offer migration aids** from USWDS markup and Sass settings, on a best-effort basis.
- Ashlar **will contribute findings upstream** to USWDS where useful (e.g., extended CEM patterns, polyglot validation rules).
- Ashlar **will not claim** "USWDS Next" status or imply official endorsement.

If a future USWDS or NDS-led modernization wants to adopt Ashlar components or patterns, Ashlar maintainers will engage in good faith and contribute upstream where possible.

## Funding model (preliminary)

A community OSS project still costs real money to maintain at federal-credible quality (manual a11y testing, security audits, infrastructure). Funding paths under consideration:

- **Founding-organization sponsorship** — Blen and other contributing organizations sponsor maintainer time as part of normal employment.
- **Open Collective / GitHub Sponsors** — small-scale community funding.
- **Foundation grants** — Sloan Foundation, Mozilla Foundation, civic-tech philanthropies have funded similar work.
- **Vendor sponsorship** — Vercel, Cloudflare, Anthropic have sponsored OSS in adjacent spaces.
- **Federal contract carve-outs** — agencies adopting Ashlar for production systems may fund accessibility evidence work as a deliverable.

Funding model is documented and updated as it firms up. **Ashlar does not start from a "if we build it, the money will come" assumption**; before v0.1 public alpha, at least one funded maintainer line is required.

## How this changes

This governance document is itself versioned. Material changes go through public RFC. Minor edits (typos, clarifications) are maintainer-approved without RFC.

A v1.0 governance review is anticipated; at that point, the project may move to a foundation home (e.g., OpenJS Foundation, Linux Foundation Public Health, or a civic-tech foundation) for long-term neutrality.

## References

- [Architecture overview](../architecture/overview.md)
- [Roadmap overview](../roadmap/00-roadmap.md)
- [Risks and mitigations](../roadmap/risks-and-mitigations.md)
- USWDS lifecycle: https://designsystem.digital.gov/components/
- Apache-2.0 license: https://www.apache.org/licenses/LICENSE-2.0
- Sigstore: https://www.sigstore.dev/
- AuDS lessons: https://www.morpht.com/blog/australian-government-design-system-dead-long-live-gold
