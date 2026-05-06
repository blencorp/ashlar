# Objective Completion Audit

Date: 2026-05-06
Branch inspected: `codex/npx-ashlar-entrypoint-status`

## Objective

Build a government-first UI library that can credibly replace day-to-day USWDS usage, become a memorable shadcn-like name in the gov space, address shadcn's source-copy/update/provenance gaps, and let government developers build AI-native public-service apps with strong DX, light footprint, and easy integration.

## Verdict

Not achieved yet.

Ashlar has a real substrate now: signed source capsules, federal and component audits, migration planning, update survival tests, local MCP, evidence tooling, release readiness gates, bundle budgets, and a memorable `npx ashlar` package entrypoint. The remaining blockers are not implementation effort proxies; they are proof gates:

- one stable-evidence L0 component with real manual accessibility evidence;
- completed external review records;
- public npm trusted-publishing provenance for `ashlar`, `@ashlar/cli`, and `@ashlar/schemas`;
- public capsule Sigstore trust material.

Strict readiness evidence: `node packages/cli/dist/index.js release readiness --registry ./registry --json` returned `status: "fail"` with 9 passing checks and 4 failing checks: `stable-l0-evidence`, `external-review-proof`, `npm-provenance-public`, and `sigstore-public-trust`.

## Prompt-To-Artifact Checklist

| Requirement | Current evidence | Coverage judgment | Missing proof |
| --- | --- | --- | --- |
| Replace day-to-day USWDS usage | `ashlar audit --policy federal`, `ashlar migrate uswds`, 12 L0 capsules in `registry/components`, `benefit-application` service-flow capsule, `examples/uswds-project` migration fixture, `examples/legacy-federal-project` audit fixture | Strong prototype, not replacement-grade | Stable accessibility evidence, external design-partner validation, wider component/pattern coverage, public release |
| Become memorable like shadcn/ui | Unscoped `ashlar` package in PR #30, `npx ashlar` docs/status alignment, source-capsule distribution model, `apps/www` marketing surface | Good naming/DX direction | Package name must be reserved by real npm publish; docs site/community launch still missing |
| Address shadcn gaps | `ashlar update`, `ashlar verify`, capsule lockfile hashes, update survival tests, signed capsule manifests, release readiness, SBOM/trust-bundle/provenance tooling | Strongest product wedge in repo | Needs real release traffic, public Sigstore bundles, npm provenance, external security review |
| AI-native gov app workflow | `ashlar mcp`, MCP `validate_usage`, `search_components`, `suggest_for_task`, `list_tokens`, `get_token`, `ashlar ai-eval`, generated `AGENTS.md` and `DESIGN.md` | Useful local AI-native substrate | Real generated-output corpus, hosted/remote MCP decision, write-tool threat model if write tools are ever added |
| Amazing DX and easy integration | `ashlar init`, `status`, `add`, `audit`, `search`, `suggest`, `view`, `theme sync`, `theme validate`, release smoke installing packed CLI into a clean consumer | Good local DX | Public npm install path, public docs, first-run docs/tutorials, real user feedback |
| Light footprint | `ashlar bundle budget` reports 12 L0 capsules at 1,993 B CSS gzip and 0 B JS gzip against a 20,992 B L0 budget; Button is 649 B CSS gzip and 0 B JS | Strong evidence for current L0 substrate | Must hold as L1 interactive components arrive |
| Gov trust/compliance posture | Federal page-shell audit, evidence gate, review-pack generation, incident playbook, release readiness, SBOM, trust bundle, issue templates | Strong process and tooling | Real stable evidence, completed review records, public provenance/Sigstore proof |

## Current PR Evidence

Open active draft stack:

- #21 `Build standards evidence foundation` - green CI and Changesets.
- #25 `Refresh proof gate checkpoint docs` - green CI and Changesets.
- #26 `Document release review pack artifact extraction` - green CI and Changesets.
- #28 `Make release trust checklist paths portable` - green CI and Changesets.
- #30 `Add ashlar npx entrypoint` - green CI and Changesets; replaces #29.

Closed as superseded:

- #14 stale failed branch, replaced by #21.
- #27 red portable-path branch, replaced by #28.
- #29 first npx-entrypoint checkpoint, replaced by #30 after repository rules blocked follow-up push.

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

## Next Concrete Work

1. Merge the active green foundation stack in order, or keep it stacked but stop opening broad new surfaces until review is complete.
2. Produce the first real Button stable-evidence packet: automated artifact, manual keyboard transcript, manual screen-reader transcript, reviewed packet, graduated packet, local publication receipt, and completed `docs/reviews/stable-evidence-*.md`.
3. Run the first real trusted-publishing release for `ashlar`, `@ashlar/cli`, and `@ashlar/schemas`; attach `ashlar-npm-provenance.json`.
4. Run the Sigstore workflow for capsule/release artifacts and attach `ashlar-public-trust.json`.
5. Complete release-trust and design-partner review records, then rerun strict `ashlar release readiness` without local escape hatches.

Do not claim Ashlar replaces USWDS, or that it is public-alpha ready, until those checks pass.
