# GitHub Launch Checklist

This checklist defines the work required before publishing Ashlar as a public GitHub project.

## Launch posture

Public status should be **pre-alpha foundation prototype** until the v0.0 standards, evidence, drift, and demo gates pass.

Recommended repository tagline:

> Evidence-backed, AI-native component infrastructure for public-service interfaces.

Required disclaimer:

> Ashlar is an independent open-source project. It is informed by USWDS but is not affiliated with, endorsed by, or sponsored by GSA, USWDS, NDS, or the U.S. federal government.

## Before public repository launch

- [ ] Complete trademark and package-namespace review for `Ashlar`.
- [ ] Confirm npm package namespace availability.
- [ ] Confirm domain availability.
- [x] Finalize Apache-2.0 license or document why another license is chosen.
- [x] Add `LICENSE`.
- [x] Add `SECURITY.md`.
- [x] Add `CONTRIBUTING.md`.
- [x] Add `CODE_OF_CONDUCT.md`.
- [x] Add `GOVERNANCE.md` or link to `docs/governance/00-governance-model.md`.
- [x] Add issue templates for bug, accessibility issue, component proposal, documentation issue, and security disclosure redirect.
- [x] Add pull request template with accessibility, evidence, and test checklist.
- [x] Add public roadmap link in README.
- [x] Add `docs/strategy.md` link in README.
- [x] Add "not official" disclaimer in README.
- [x] Add source map and research memo links.
- [x] Ship first CLI/capsule prototype.
- [x] Add the April 29, 2026 gap-analysis findings to public roadmap.
- [x] Add a clear next-slice spec for standards-pack and evidence infrastructure.

## Recommended GitHub milestones

### Milestone 0 — Repository readiness

Goal: make the public repository credible before code lands.

Issues:

- License and governance.
- Security policy.
- Contribution process.
- Public roadmap.
- Technical foundation ADRs.
- Initial design partner brief.

Exit gate:

- External reader can understand what Ashlar is, what it is not, and how to engage.

### Milestone 1 — v0.0 foundation prototype

Goal: prove registry, lockfile, token, audit, and evidence mechanics with a small component set.

Issues:

- CLI shell: `init`, `add`, `audit`, `verify`, `evidence`.
- Static registry prototype.
- Capsule schema and hash verification.
- Federal policy-pack prototype.
- Evidence schema with ICT Baseline mappings.
- DTCG token compiler.
- L0 Button, Banner, Identifier, Alert, Form Field, Text Input, Textarea, Date Input, Select, Radio Group, Checkbox, Error Summary.
- Evidence packet schema and first examples.
- ast-grep rule generation prototype.
- Next.js and plain HTML demos.

Exit gate:

- Fresh project can install and verify a small accessible form through a deterministic path.

### Milestone 2 — v0.0 update and CI gate

Goal: prove Ashlar can be safely maintained after install.

Issues:

- `ashlar-lock.json`.
- Three-way update flow.
- Codemod runner.
- SARIF output.
- Theme validation.
- Tamper detection.
- GitHub Actions example.

Exit gate:

- `ashlar update` works across instrumented drift scenarios and `ashlar audit --sarif` uploads to code scanning.

### Milestone 3 — v0.1 public alpha

Goal: publish first usable alpha for design partners and public evaluators.

Issues:

- Public registry.
- Signed Git mirror.
- MCP server.
- Docs site with `llms.txt`.
- 20+ components.
- First L3 pattern.
- At least 12 full evidence packets.
- Partner onboarding guide.

Exit gate:

- At least five design partners can evaluate Ashlar in non-toy projects.

### Milestone 4 — v0.2 beta

Goal: become credible across major government stacks.

Issues:

- Vue, Svelte, Solid adapters.
- Drupal/Twig production-style demo.
- Date Picker, Data Table, File Upload.
- USWDS migration tooling.
- `@blen/ashlar-tailwind`.
- Public evidence dashboard.
- Third-party accessibility audit.

Exit gate:

- At least 20 teams running Ashlar in non-toy projects and at least three contributing organizations.

### Milestone 5 — v1.0 stable

Goal: stable public-service UI infrastructure.

Issues:

- 25-30 stable components.
- 6+ stable L3 patterns.
- Full accessibility evidence for stable components.
- Third-party security and accessibility review complete.
- Long-term governance and funding model.
- LTS policy.

Exit gate:

- Ashlar is safe to recommend for production evaluation by agencies and contractors.

## Repository labels

Recommended labels:

- `area: accessibility`
- `area: ai`
- `area: cli`
- `area: components`
- `area: docs`
- `area: governance`
- `area: registry`
- `area: security`
- `area: tokens`
- `area: validation`
- `type: bug`
- `type: component-proposal`
- `type: docs`
- `type: research`
- `type: rfc`
- `type: security`
- `status: proposal`
- `status: experimental`
- `status: blocked`
- `good first issue`
- `help wanted`

## Public README structure

Use this order:

1. What Ashlar is.
2. Current status.
3. Why it exists.
4. What makes it different.
5. Architecture overview diagram.
6. Roadmap.
7. Relationship to USWDS.
8. Accessibility and security posture.
9. Contributing.
10. License.

## Launch risk controls

- Do not imply official endorsement.
- Do not overpromise compliance.
- Do not publish untested components as stable.
- Do not accept component contributions without evidence gates.
- Do not add AI write tools before read-only MCP is reviewed.
- Do not chase visual novelty before infrastructure is proven.
