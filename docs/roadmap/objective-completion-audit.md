# Objective Completion Audit

Date: 2026-05-06
Branch inspected: `codex/docs-first-run-app`

## Objective

Build a government-first UI library that can credibly replace day-to-day USWDS usage, become a memorable shadcn-like name in the gov space, address shadcn's source-copy/update/provenance gaps, and let government developers build AI-native public-service apps with strong DX, light footprint, and easy integration.

## Verdict

Not achieved yet.

Ashlar has a real substrate now: signed source capsules, federal and component audits, migration planning, update survival tests, local MCP, first-run docs, evidence tooling, release readiness gates, bundle budgets, and a memorable `npx ashlar` package entrypoint. The remaining blockers are not implementation effort proxies; they are proof gates:

- one stable-evidence L0 component with real manual accessibility evidence;
- completed external review records;
- public npm trusted-publishing provenance for `ashlar`, `@ashlar/cli`, and `@ashlar/schemas`;
- public capsule Sigstore trust material.

Strict readiness evidence: `node packages/cli/dist/index.js release readiness --registry ./registry --json` returned `status: "fail"` with 9 passing checks and 4 failing checks: `stable-l0-evidence`, `external-review-proof`, `npm-provenance-public`, and `sigstore-public-trust`.

## Prompt-To-Artifact Checklist

| Requirement | Current evidence | Coverage judgment | Missing proof |
| --- | --- | --- | --- |
| Replace day-to-day USWDS usage | `ashlar audit --policy federal`, `ashlar migrate uswds`, 12 L0 capsules in `registry/components`, `benefit-application` service-flow capsule, `examples/uswds-project` migration fixture, `examples/legacy-federal-project` audit fixture, `docs/roadmap/uswds-coverage-matrix.md` | Strong prototype, not replacement-grade. Coverage gaps are now explicit. | Stable accessibility evidence, external design-partner validation, wider component/pattern coverage, public release |
| Become memorable like shadcn/ui | Unscoped `ashlar` package in PR #46, `npx ashlar` docs/status alignment, source-capsule distribution model, `apps/www` marketing surface, `apps/docs` first-run docs app in PR #51 | Good naming/DX direction with a first-run docs surface. | Package name must be reserved by real npm publish; public docs deployment and community launch still missing |
| Address shadcn gaps | `ashlar update`, `ashlar verify`, capsule lockfile hashes, update survival tests, signed capsule manifests, release readiness, SBOM/trust-bundle/provenance tooling | Strongest product wedge in repo | Needs real release traffic, public Sigstore bundles, npm provenance, external security review |
| AI-native gov app workflow | `ashlar mcp`, MCP `validate_usage`, `search_components`, `suggest_for_task`, `list_tokens`, `get_token`, `ashlar ai-eval`, generated `AGENTS.md` and `DESIGN.md`, and `examples/ai-eval/generated-output-corpus` | Useful local AI-native substrate with a small seed corpus | Independent model/tool outputs beyond the Codex seed corpus, hosted/remote MCP decision, write-tool threat model if write tools are ever added |
| Amazing DX and easy integration | `ashlar init`, `status`, `add`, `audit`, `search`, `suggest`, `view`, `theme sync`, `theme validate`, release smoke installing packed CLI into a clean consumer, `apps/docs` first-run path for install/audit/add/verify/theme/AI/trust | Good local DX and first-run guidance | Public npm install path, public docs deployment, real user feedback |
| Light footprint | `ashlar bundle budget` reports 12 L0 capsules at 1,993 B CSS gzip and 0 B JS gzip against a 20,992 B L0 budget; Button is 649 B CSS gzip and 0 B JS | Strong evidence for current L0 substrate | Must hold as L1 interactive components arrive |
| Gov trust/compliance posture | Federal page-shell audit, evidence gate, review-pack generation, incident playbook, release readiness, SBOM, trust bundle, issue templates | Strong process and tooling | Real stable evidence, completed review records, public provenance/Sigstore proof |

## Current PR Evidence

Open active ready-for-review stack:

- #42 `Build standards evidence foundation (review fixes)` - green CI and Changesets; base `main`.
- #43 `Refresh proof gate checkpoint docs (restacked)` - green CI and Changesets; base `codex/standards-foundation-review-fixes`.
- #44 `Document release review pack artifact extraction (restacked)` - green CI and Changesets; base `codex/standards-foundation-review-fixes`.
- #45 `Make release trust checklist paths portable (restacked)` - green CI and Changesets; base `codex/review-pack-artifact-instructions-review-fixes`.
- #46 `Add ashlar npx entrypoint (restacked)` - green CI and Changesets; base `codex/typecheck-build-info-isolation-review-fixes`.
- #47 `Refresh objective audit PR evidence (restacked)` - green CI and Changesets; base `codex/objective-completion-audit-review-fixes`.
- #48 `Define USWDS coverage matrix (restacked)` - green CI and Changesets; base `codex/objective-audit-pr-evidence-review-fixes`.
- #49 `Add generated-output AI eval corpus` - green CI and Changesets; base `codex/uswds-coverage-matrix-review-fixes`.
- #50 `Refresh objective audit stack evidence` - green CI and Changesets; base `codex/ai-eval-generated-output-corpus`.
- #51 `Add first-run docs app` - green CI and Changesets; base `codex/objective-audit-current-stack`.

All open stack PRs remain `reviewDecision: REVIEW_REQUIRED` and `mergeStateStatus: BLOCKED` until human review lands. Copilot could not review #42 because the first PR diff exceeds its 20,000-line limit; no actionable inline review thread is open on #42-#51.

Closed as superseded:

- #14 stale failed branch, replaced by the foundation stack.
- #21, #25, #26, #28, #31, #33, and #37 were replaced by the current #42-#48 restacked review-fix PRs.
- #27, #29, and #30 were intermediate red or blocked branches superseded during the same restack.

## Gate Audit

The following release-readiness checks pass today:

- registry capsule verification;
- L0 component coverage;
- evidence gate for not-reviewed/experimental capsules;
- bundle budget;
- deterministic AI eval;
- local npm provenance prerequisites;
- incident playbook;
- external-review process artifacts;
- local Sigstore workflow shape.

The following release-readiness checks fail today:

- `stable-l0-evidence`: requires at least one stable-evidence L0 component; found 0.
- `external-review-proof`: missing `stable-evidence-*.md`, `release-trust-*.md`, and `design-partner-*.md`.
- `npm-provenance-public`: requires real npm trusted publishing and `ashlar release provenance-verify-public` against published versions.
- `sigstore-public-trust`: 0/13 capsule manifests include public Sigstore bundle metadata; current capsules still use local Ed25519 signatures.

Current Button reviewer intake for issue #22 is available from the green #49 CI run:

- `ashlar-l0-stable-review`: `https://github.com/blencorp/ashlar/actions/runs/25448692910/artifacts/6836240755`
- `ashlar-button-stable-review-status`: `https://github.com/blencorp/ashlar/actions/runs/25448692910/artifacts/6836241000`
- `ashlar-release-review-pack`: `https://github.com/blencorp/ashlar/actions/runs/25448692910/artifacts/6836243165`
- `ashlar-release-readiness-json`: `https://github.com/blencorp/ashlar/actions/runs/25448692910/artifacts/6836242820`

## Next Concrete Work

1. Merge the active green foundation stack in order, or keep it stacked but stop opening broad new surfaces until review is complete.
2. Produce the first real Button stable-evidence packet: automated artifact, manual keyboard transcript, manual screen-reader transcript, reviewed packet, graduated packet, local publication receipt, and completed `docs/reviews/stable-evidence-*.md`.
3. Run the first real trusted-publishing release for `ashlar`, `@ashlar/cli`, and `@ashlar/schemas`; attach `ashlar-npm-provenance.json`.
4. Run the Sigstore workflow for capsule/release artifacts and attach `ashlar-public-trust.json`.
5. Expand the AI eval generated-output corpus with independent model/tool outputs and real user prompts.
6. Review the USWDS coverage matrix and turn the v0.1 public-alpha set into explicit capsule/evidence issues.
7. Complete release-trust and design-partner review records, then rerun strict `ashlar release readiness` without local escape hatches.

Do not claim Ashlar replaces USWDS, or that it is public-alpha ready, until those checks pass.
