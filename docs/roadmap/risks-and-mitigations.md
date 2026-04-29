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
