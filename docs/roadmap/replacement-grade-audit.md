# Replacement-Grade Audit

Date: 2026-05-05

This audit answers one question: is Ashlar already credible as a USWDS replacement-grade, shadcn-class public-service UI system, or is it still a prototype with a strong thesis?

For the component and pattern surface area behind that question, see [uswds-coverage-matrix.md](./uswds-coverage-matrix.md).

## Verdict

Ashlar is not replacement-grade yet.

The direction is coherent because the project is not trying to win by shipping another themed component set. The credible category is **evidence-backed source UI for public services**: source-owned capsules with audit rules, evidence packets, update metadata, provenance, and AI-readable contracts.

The current implementation proves enough of the substrate to keep going, but public replacement claims must remain blocked until strict readiness passes:

```bash
node packages/cli/dist/index.js release readiness --registry ./registry
```

Current strict gate status:

- `stable-markup-evidence`: fails because 0 markup primitive capsules have published stable evidence.
- `external-review-proof`: fails until real stable-evidence, release-trust, and design-partner review records exist under `docs/reviews/`.
- `npm-provenance-public`: fails until a real npm trusted-publishing release exists and `release provenance-verify-public` passes.
- `sigstore-public-trust`: fails until real capsule Sigstore bundles are produced, published, and verified with `release public-trust-verify`.

## Prompt-To-Artifact Checklist

| Requirement | Current artifact or command | Evidence inspected | Status |
|---|---|---|---|
| Replace day-to-day USWDS needs without being USWDS-hostile | `docs/product-doctrine.md`, `docs/strategy.md`, `docs/architecture/overview.md`, `docs/roadmap/uswds-coverage-matrix.md` | Public posture says USWDS-compatible, not official or hostile; replacement is earned, not claimed. The coverage matrix makes component and pattern gaps explicit. | Partially met |
| Be more than another AI UI library | `docs/product-doctrine.md`, `docs/architecture/ai-native.md`, `packages/cli/src/commands/mcp.ts`, `packages/cli/src/lib/ai-eval.ts` | AI claim is grounded in read-only MCP discovery, evidence retrieval, token lookup, and `validate_usage`; write tools remain blocked. | Partially met |
| Address shadcn gap: copied source drifts | `packages/cli/src/commands/update.ts`, `packages/cli/src/lib/codemod.ts`, `packages/cli/src/commands/update-survival.test.ts` | `update` has lockfile hashes, three-way merge, codemods, critical-file confirmation, and 11 survival scenarios. | Prototype met |
| Address shadcn gap: no evidence chain | `packages/cli/src/lib/evidence-check.ts`, `packages/cli/src/lib/evidence-review-status.ts`, `packages/schemas/src/manual-transcript.schema.json` | Stable gate requires WCAG, ICT Baseline, automated evidence, keyboard transcript, screen-reader transcript, limitations, and reviewer metadata. | Tooling met; evidence missing |
| Address shadcn gap: registry trust and provenance | `packages/cli/src/lib/capsule.ts`, `packages/cli/src/lib/release-provenance.ts`, `packages/cli/src/lib/release-public-trust.ts`, `.github/workflows/publish.yml`, `.github/workflows/sigstore.yml` | Local manifest signatures, npm provenance readiness, public npm verifier, capsule signing, and public trust verifier exist. | Tooling met; public proof missing |
| Easy first integration | `ashlar audit --policy federal`, `examples/legacy-federal-project/`, `packages/cli/src/commands/audit.test.ts` | Validator runs against non-Ashlar legacy markup and emits useful findings without installed capsules. | Met for validator wedge |
| Source-owned install path | `ashlar init`, `ashlar add`, `ashlar verify`, `packages/cli/src/commands/add.test.ts` | Capsules install as source, lockfile records hashes, verify detects tampering and stale registry state. | Prototype met |
| Light footprint | `ashlar bundle budget`, `packages/cli/src/lib/bundle-budget.ts`, capsule `bundleBudget` metadata | Current strict-readiness measurement: 12 markup primitive capsules, 2,094 B CSS gzip, 0 B JS, under the 20,992 B markup primitive gate. | Met for current markup primitive set |
| Federal policy coverage | `packages/cli/src/lib/policy/federal.ts`, `examples/plain-html/`, `examples/legacy-federal-project/` | Page title, meta description, banner, identifier, and required links are covered with SARIF and explain output. | Partial policy pack |
| Service-flow proof, not gallery-only | `examples/service-flow/`, `docs/superpowers/specs/2026-05-05-first-service-flow-proof-spec.md` | Benefit-application flow exists with pass/fail fixtures and audit coverage. | Prototype met |
| AI-native DX for agents | Generated `AGENTS.md` fanout, generated `DESIGN.md`, MCP `suggest_for_task`, `search_components`, `validate_usage` | Agent-facing docs and read-only MCP expose installed capsules, evidence, tokens, and validation. | Prototype met |
| Public release trust | `release readiness`, `release provenance-verify-public`, `release public-trust-verify` | Strict readiness fails on public npm provenance and public Sigstore trust. | Not met |
| Stable public accessibility claim | `evidence prepare-stable`, `evidence review-status`, `evidence graduate`, `evidence publish` | Review workflow exists, but current capsules remain `not-reviewed`. | Not met |
| External credibility | Governance docs, security playbook, roadmap, external review plan, GitHub review templates, `docs/reviews/README.md`, `release readiness` | Review intake exists and strict readiness now requires real review records; no external maintainer, partner validation, third-party accessibility review, or public package proof yet. | Process met; proof missing |

## Concrete Success Criteria

Ashlar can make stronger replacement language only when these pass without local-prototype escape hatches:

```bash
pnpm check
pnpm build
node packages/cli/dist/index.js release readiness --registry ./registry
node packages/cli/dist/index.js release provenance-verify-public --package @blen/ashlar@<version> @blen/ashlar-cli@<version> @blen/ashlar-schemas@<version>
node packages/cli/dist/index.js release public-trust-verify --registry <signed-registry-artifact>
node packages/cli/dist/index.js evidence --check --registry ./registry
node packages/cli/dist/index.js audit --policy all --registry ./registry examples/service-flow/benefit-application.pass.html
node packages/cli/dist/index.js audit --policy federal --explain examples/legacy-federal-project/index.html
```

The third and fourth commands require real public release artifacts. They cannot be satisfied from a local checkout alone.

## Next Required Work

1. **Publish one stable-evidence markup primitive capsule.** Use `evidence prepare-stable`, complete real keyboard and screen-reader transcripts, run `evidence review-status`, graduate, then publish through the signed registry path.
2. **Produce real public release trust.** Run `sigstore.yml` from `main`, publish the signed registry artifact, then verify it with `release public-trust-verify`.
3. **Produce real npm provenance.** Configure npm trusted publishers, publish from `publish.yml`, then verify exact package versions with `release provenance-verify-public`.
4. **Recruit external review.** At minimum: one accessibility reviewer for Button stable evidence, one security reviewer for the signing/provenance flow, and one design partner for the service-flow wedge.

Use [external-review-plan.md](./external-review-plan.md) and the GitHub issue templates for stable evidence, release trust, and design partner review to turn those blockers into concrete review requests. Completed reviews are recorded under `docs/reviews/` with `stable-evidence-`, `release-trust-`, and `design-partner-` filename prefixes.

## Product Boundary

Do not spend the next slice on a broad component catalog. More components will make the project look like a conventional UI kit before the substrate is proven.

The next credible slice is proof collection:

- stable evidence for Button;
- public Sigstore registry artifact;
- npm provenance;
- one external design or accessibility review.

That is what converts the category from promising to defensible.
