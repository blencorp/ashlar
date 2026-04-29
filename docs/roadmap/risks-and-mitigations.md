# Risks and mitigations

This document records the active risk register for Ashlar across all phases. It supersedes the older `12-risk-register.md` (deleted in the April 2026 cleanup).

Risks are categorized by severity and tracked through phase delivery. Every risk has at least one mitigation and a kill criterion.

## High-severity risks

### R1 — Drift management is unsolved at scale

**Severity**: High.
**Phase exposure**: v0.0 (gate).

shadcn discussion #790 has been open for 2+ years. If Ashlar's three-way merge protocol does not actually feel safe to consumers in real-world updates, the entire architectural premise collapses. We are betting that lockfile + content hashing + `git merge-file --diff3` plus codemods is sufficient.

**Mitigations**:
- Build the merge protocol first in v0.0; instrument heavily.
- Test on 30+ real-world drift scenarios before locking design.
- Telemetry (opt-in) on update outcomes during v0.1; refine based on real data.
- Conflict resolution UX gets dedicated polish iteration.
- `--resolved` flow tested with real consumers.

**Kill criterion**: if v0.1 telemetry shows >25% conflict rate after first merge-UX iteration, redesign the update protocol before v0.2.

### R2 — Accessibility evidence claims overpromise

**Severity**: High.
**Phase exposure**: All phases.

Government accessibility is legally consequential. "Accessible by default" without verifiable evidence creates legal and reputational exposure.

**Mitigations**:
- Compliance language in docs explicitly disclaims app-level compliance.
- Stable components require complete evidence packets (axe, keyboard, manual SR on NVDA + VoiceOver + JAWS).
- Known limitations are mandatory; published as machine-readable JSON.
- Independent third-party audit before v1.0.
- Audit tooling (`ashlar audit`) catches common app-level misuse.

**Kill criterion**: if independent audit at v1.0 finds material gaps not previously documented as known limitations, do not ship v1.0; address before release.

### R3 — Becoming bus-factor=1 (the AuDS trap)

**Severity**: High.
**Phase exposure**: All phases.

The Australian Government Design System died because a single agency owned it. Ashlar must avoid this.

**Mitigations**:
- Multi-organization maintainer charter from the first public alpha.
- Minimum 3 contributing organizations before v0.2 release.
- Public RFC process for major decisions; not Blen-internal.
- Open governance documentation.
- Funding model articulated early (sponsorship, contracted work, foundation grants).

**Kill criterion**: if we cannot recruit ≥3 contributing organizations by v0.2, pause public release until governance is healthier.

### R4 — Lit/WC + framework SSR friction in production

**Severity**: High.
**Phase exposure**: v0.0 + v0.2.

If Lit custom elements + Declarative Shadow DOM + framework SSR (especially Next.js) does not work cleanly in real production apps, the WC-first thesis fails.

**Mitigations**:
- Pick Lit + React 19 + Next.js as v0.0 proving ground for the L1 Combobox.
- Document Firefox ARIA reflection fallbacks per L1 component.
- Use Light DOM by default — minimizes hydration friction.
- L4 templates as escape hatch for non-JS / SSR-heavy environments.
- Test against Astro, Next.js, Nuxt, SvelteKit, SolidStart in v0.2.

**Kill criterion**: if SSR hydration is unreliable in Next.js after v0.0 iteration, reconsider WC-first for L1 (consider Stencil, or a different L1 strategy).

### R5 — MCP / AI integration introduces security exposure

**Severity**: High.
**Phase exposure**: v0.1 onwards.

A poorly-designed MCP server could allow malicious prompts to install or modify components without user consent.

**Mitigations**:
- Read-only by default; install/update gated behind explicit user approval.
- Local-by-default (`npx ashlar mcp` runs in consumer's process).
- Signed manifests verified before any registry interaction.
- No hidden prompts — tool descriptions and resource contents are exactly the published CEM and capsule files.
- Security review before v0.1 public alpha.

**Kill criterion**: any post-v0.1 security incident triggers immediate review and capability restriction.

### R6 — MVP scope is too large

**Severity**: High.
**Phase exposure**: v0.0, v0.1, v0.2.

Trying to ship USWDS feature parity at any phase will fail. Ashlar succeeds by shipping less, better.

**Mitigations**:
- Explicit out-of-scope lists per phase.
- Phase exit criteria are quality gates, not feature checklists.
- Defer ruthlessly. Choose quality over scope when forced.
- Risk register reviewed at phase transitions; scope cuts are normal, not exceptional.

**Kill criterion**: if scope keeps expanding while quality gates remain unmet, cut scope before broadening claims or adding features.

### R16 — Compliance tooling is too shallow to convince agencies

**Severity**: High.
**Phase exposure**: v0.0, v0.1.

If `ashlar audit`, `ashlar verify`, `ashlar theme validate`, and `ashlar evidence` feel like demos rather than credible agency tooling, Ashlar will be perceived as another component library instead of infrastructure.

**Mitigations**:
- Ship CI commands as first-class deliverables, not docs-only examples.
- Emit SARIF in v0.0/v0.1 so findings appear in code scanning dashboards.
- Map rule packs to Section 508, WCAG, Federal Website Standards, and capsule anti-patterns.
- Validate against the ICT Testing Baseline where applicable.
- Include tamper-detection and offline verification demos in design-partner onboarding.

**Kill criterion**: if v0.1 cannot run `audit`, `verify`, `theme validate`, and `evidence --check` in CI for a real partner project, do not broaden public adoption claims.

## Medium-severity risks

### R7 — Tailwind + cascade-layer interaction confuses consumers

**Severity**: Medium.
**Phase exposure**: v0.1 onwards.

Two override mental models (cascade-layer-aware Tailwind utilities vs direct CSS variable overrides) may confuse consumers.

**Mitigations**:
- Documentation includes a "two override paths" guide with worked examples.
- `@ashlar/tailwind` companion in v0.2 provides Tailwind-source variants for shadcn-style consumers.
- Cascade-layer ordering is explicit and validated by `ashlar audit`.

### R8 — DTCG / Terrazzo immaturity

**Severity**: Medium.
**Phase exposure**: v0.0 onwards.

DTCG 2025.10 is the first stable spec; tooling is improving but not ubiquitous. Terrazzo is the most complete compiler but is a young project.

**Mitigations**:
- Style Dictionary v4 as fallback compiler.
- Implement token compilation in a swappable layer.
- Contribute fixes upstream to Terrazzo as we hit gaps.

### R9 — Framework-adapter generation has edge cases

**Severity**: Medium.
**Phase exposure**: v0.2.

Auto-generating Vue / Svelte / Solid adapters from extended CEM may produce idiomatically-poor code in edge cases.

**Mitigations**:
- Hand-author one adapter per framework first; observe patterns before generating.
- Behavior-equivalence tests run identical scenarios across adapters; failures block release.
- Maintain hand-authored overrides for components where generation produces poor code.

### R10 — Custom-element ARIA reflection gaps

**Severity**: Medium.
**Phase exposure**: All phases (technical).

Firefox's `ElementInternals` ARIA reflection is incomplete. This causes accessibility regressions if components rely on it.

**Mitigations**:
- All L1 components set ARIA via host attributes, not via `internals.aria*`.
- Per-component test specs include Firefox-specific ARIA propagation checks.
- `_ashlar.firefoxFallbacks` field in CEM documents per-component fallbacks.

### R11 — Token system becomes too abstract for theme authors

**Severity**: Medium.
**Phase exposure**: v0.1 onwards.

Three-tier tokens (primitive / semantic / component) plus modes plus state can be overwhelming for agency theme authors.

**Mitigations**:
- Limit component-level tokens; do not let count balloon.
- Provide complete agency theme examples (default, high-contrast, two example agencies).
- Theme validator gives concrete guidance, not abstract errors.
- Theme authoring guide with worked examples.

### R12 — Adoption is slower than ambition implies

**Severity**: Medium.
**Phase exposure**: v0.1 onwards.

Government tech adoption is slow. Even an excellent OSS project may take years to reach federal scale.

**Mitigations**:
- Ship for adjacent audiences (regulated industries, civic-tech, state digital services) in parallel.
- Do not optimize for federal-only; the architecture serves a broader audience.
- Patience: the Ashlar thesis is multi-year. Plan accordingly.

## Lower-severity risks (track but don't actively work)

### R13 — Tailwind v4 breaking changes

If Tailwind ships breaking changes to `@theme`, our token output may need adjustment. Mitigation: stable abstraction layer in token compiler; absorb Tailwind churn there.

### R17 — Premature Zig adoption

Zig is promising for small native binaries and cross-compilation, but Zig 0.16 still documents known bugs, miscompilations, and regressions. Mitigation: keep Zig off the v0/v1 critical path. Use Node/TypeScript for CLI orchestration and ast-grep's Rust binary for validation. Revisit Zig only for focused experiments after the registry and validation architecture are proven.

### R18 — Public positioning creates official-status confusion

Because Ashlar is government-first and informed by USWDS, readers may infer official GSA, NDS, or USWDS endorsement. Mitigation: every public README, docs site, package page, and launch announcement includes the independence disclaimer. Avoid any public naming that implies official USWDS continuity.

## High-severity risks added 2026-04-29

### R19 — GSA absorption rather than rejection

**Severity**: High.
**Phase exposure**: v0.1 onwards.

The most likely failure mode for a useful federal-adjacent OSS project is not being ignored or attacked — it is being absorbed. If Ashlar's registry, evidence schema, validator, or MCP work proves useful, NDS or a future USWDS modernization may want to upstream it. Both outcomes (indifference + absorption) end the independent project; absorption ends it while every individual decision looks positive.

**Mitigations**:
- Written posture on what gets contributed upstream (validator rules, evidence schema patterns) vs. what is retained as Ashlar-specific (the verification, signing, AI-contract substrate).
- Foundation home (Linux Foundation Public Health, OpenJS, Sloan civic-tech, or equivalent) as structural protection — Ashlar's neutral host survives any single component contribution.
- Contributor License Agreement clarity that allows good-faith upstreaming without ceding the substrate.
- Public RFC for any major upstream contribution.

**Kill criterion**: if absorption pressure forces give-up of the verification substrate (signing, lockfile, audit, evidence schema), the project is no longer Ashlar; it has become a USWDS contributor track.

### R20 — npm supply-chain compromise of the Ashlar package

**Severity**: High.
**Phase exposure**: v0.1 onwards (when Ashlar is publicly publishable).

CISA-flagged contemporary threats: the September 2025 Shai-Hulud worm (~500 npm packages compromised) and the April 2026 Axios npm package compromise attributed to UNC1069 (North Korean threat actor). A federal-grade tool that recommends or installs code is a high-value target. The current `npm install ashlar` or `npx ashlar` path is exposed to the same threat surface. R14 covers Sigstore service availability; this risk covers what happens when Ashlar itself is compromised.

**Mitigations**:
- Hardware-key signing on the maintainer publisher account.
- npm trusted publishing with OIDC; SLSA L3 provenance attestations on every release.
- Lockfile-recorded signatures so consumers can detect a hijacked version against an embedded chain of trust.
- SBOM published with every release.
- Documented incident-response playbook: detection (SIEM-friendly indicators), rotation/revocation process, `verify` failure mode and remediation guidance, public disclosure timeline, key compromise recovery.
- No transitive dependencies on suspect packages; runtime dependencies kept minimal.

**Kill criterion**: any post-v0.1 supply-chain incident where consumers cannot detect the compromise or recover safely triggers immediate freeze and public review of distribution model.

### R21 — Lit + Zag has no production prior art

**Severity**: High.
**Phase exposure**: v0.1 (first L1 component).

The L1 substrate is currently designed around Lit components driven by Zag statecharts. Zag has no `@zag-js/vanilla` package; the maintainer's discussion #2309 confirms vanilla support is proof-of-concept only. There is no published production Lit + Zag combination at scale. R4 covers WC-with-framework-SSR friction; this risk covers the more fundamental question of whether the proposed L1 architecture itself works.

**Mitigations**:
- L1 ComboBox is deferred from v0.0 to v0.1; substrate decisions are not made on Button alone.
- ADR-0010 explicitly marks Lit + Zag as a research bet.
- One iteration on a real L1 component before scaling beyond Button; if it doesn't feel right, ADR-0010 is revisited (alternatives: Lit + custom statechart wrapper, Stencil, a different combination).
- Keep behavior contracts (statechart + signals) framework-neutral so the underlying library can swap without component-author changes.

**Kill criterion**: if the first real L1 component takes more than two iterations to feel production-stable, pause v0.1 component scaling and revisit the substrate.

### R22 — Evidence labor budget gap at v0.1+

**Severity**: High.
**Phase exposure**: v0.1, v1.0.

Manual screen-reader testing on NVDA + JAWS + VoiceOver across Firefox/Safari/Chrome runs 8-16 hours per component per release at industry pricing. The roadmap's tiered evidence (stable = axe + keyboard + 1 SR; LTS = full matrix) helps, but the v1.0 target of 10-12 stable components × 2-4 releases/year is still ~500-1500 hours/year of accessibility-specialist labor before third-party audits, codemod authoring, USWDS interop testing, agency theming, and content review. Governance commits to "at least one funded maintainer line" before v0.1 — that is roughly 5-15% of v1.0 needs.

**Mitigations**:
- Tiered evidence: stable bar is achievable with 1 SR transcript; LTS bar requires the full matrix.
- v1.0 stable component count cut from 25-30 to 10-12 + LTS-aspiring set; the previous target was unfunded.
- Foundation grant pipeline is a v0.1 pre-requisite, not a v1.0 nice-to-have. Target hosts: Sloan civic-tech, Mozilla MOSS, Linux Foundation Public Health.
- Specific federal contractor relationships where accessibility evidence is funded as a deliverable.
- Component-stability board (R3 cross-org) reviews evidence at each release.

**Kill criterion**: if at v0.1 there is no funded grant pipeline and no contractor sponsorship of evidence labor, do not advance v1.0 component-count target without revisiting the evidence-tier definition or funding model. Evidence-incomplete components must not ship as `stable`.

### R14 — Sigstore / cosign service availability

If Sigstore signing infrastructure goes down, registry publication blocks. Mitigation: signing is async; we can buffer releases. Sigstore has good uptime; not a primary concern.

### R15 — `npx ashlar` package-name collision

If `ashlar` is taken on npm, we rename. Mitigation: reserve before public alpha; have backup names ready (the project has been working under "Ashlar" but that may not survive trademark search).

## Kill criteria summary

Ashlar does not ship if:

- Drift conflict rate is unmanageable (R1).
- Accessibility claims cannot be substantiated (R2).
- Maintainer base is too narrow (R3).
- Core SSR pattern doesn't work (R4).
- Security incidents go unresolved (R5).
- Quality gates remain unmet while scope keeps expanding (R6).
- Compliance and CI tooling cannot run credibly in real partner projects (R16).
- Absorption pressure forces give-up of the verification substrate (R19).
- Supply-chain compromise leaves consumers unable to detect or recover (R20).
- L1 substrate (Lit + Zag or alternative) needs more than two iterations to feel stable (R21).
- Evidence labor is unfunded against the stable-component target (R22).

Each of these is a stop-the-line condition. The team explicitly acknowledges them rather than discovering them at release.

## How this register is maintained

- Reviewed at every phase transition.
- New risks added as they surface (with severity, mitigation, kill criterion).
- Risks moved to "retired" when their phase exposure passes without incident.
- Archive of retired risks kept for historical context.

## References

- [Roadmap overview](./00-roadmap.md)
- [Architecture overview](../architecture/overview.md)
- [Accessibility architecture](../architecture/accessibility.md)
- [research/04-web-components.md — AuDS lessons](../research/04-web-components.md)
