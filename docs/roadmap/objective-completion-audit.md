# Objective Completion Audit

Date: 2026-05-08
Branch inspected: `main` at `d4502a6` after #95 through #117 merged, with repo doctor, testing-session launcher, manual testing checklist, docs testing guide/app coverage, docs disclosure-flag SVG regression coverage, public family-language cleanup, release proof-plan GitHub Packages wiring, versioned `@blen/*` packages, and post-merge CI/Version Packages success on `main`

## Objective

Build a government-first UI library that can credibly replace day-to-day USWDS usage, become a memorable shadcn-like name in the gov space, address shadcn's source-copy/update/provenance gaps, and let government developers build AI-native public-service apps with strong DX, light footprint, and easy integration.

## Verdict

Not achieved yet.

Ashlar has a real substrate now: signed source capsules, federal and component audits, migration planning, update survival tests, local MCP, first-run docs, evidence tooling, release readiness gates, bundle budgets, framework examples, a memorable `npx @blen/ashlar` package entrypoint, banner and docs disclosure-flag visual/geometry regression checks, shadcn-v4-compatible CLI ergonomics, `@blen/*` package metadata, GitHub Packages canary workflow wiring, release proof-plan commands for npm, GitHub Packages, and Sigstore, product-facing capsule family names across docs, CLI output, options, and gates, a one-command repo doctor for local maintainer health checks, and a one-command testing session for docs plus all example apps with a generated manual visual-review checklist. The remaining blockers are not implementation effort proxies; they are proof gates:

- one stable-evidence markup primitive component with real manual accessibility evidence;
- completed external review records;
- public npm trusted-publishing provenance for `@blen/ashlar`, `@blen/ashlar-cli`, and `@blen/ashlar-schemas`;
- public capsule Sigstore trust material.

Strict readiness evidence: `node packages/cli/dist/index.js release readiness --registry ./registry --json-output reports/current-release-readiness.json --report reports/current-release-readiness.md` returned `status: "fail"` on 2026-05-08 with 9 passing checks and 4 failing checks: `stable-markup-evidence`, `external-review-proof`, `npm-provenance-public`, and `sigstore-public-trust`.

Current testing evidence: `pnpm testing:start --check --visual` passed on 2026-05-08 after rebuilding the workspace. It verified HTTP 200 for the public site, docs app, Vite theme workbench, and the vanilla TypeScript, React SPA, Next.js App Router, Svelte, and Vue case-board examples, then ran Playwright visual smoke for the six framework apps with zero failures. The generated local review material is under `reports/testing-session/` and `reports/example-visual-smoke/`.

Docs UI evidence after #117: Playwright captured `reports/testing-session/docs-testing-page.png` from `http://127.0.0.1:4175/#testing`, and a DOM check confirmed title `Test docs and examples`, eyebrow `Hands-on QA`, Testing navigation present, 7 flag stripes, and 18 flag stars.

## Prompt-To-Artifact Checklist

| Requirement | Current evidence | Coverage judgment | Missing proof |
| --- | --- | --- | --- |
| Replace day-to-day USWDS usage | `ashlar audit --policy federal`, `ashlar migrate uswds`, 12 markup primitive capsules in `registry/components`, `benefit-application` service-flow capsule, `examples/uswds-project` migration fixture, `examples/legacy-federal-project` audit fixture, `docs/roadmap/uswds-coverage-matrix.md`, framework case-board examples, banner visual smoke | Strong prototype, not replacement-grade. Coverage gaps are now explicit. | Stable accessibility evidence, external design-partner validation, wider component/pattern coverage, public release |
| Become memorable like shadcn/ui | `@blen/ashlar` package entrypoint, `npx @blen/ashlar` docs/status alignment, source-capsule distribution model, public family names, `apps/www` marketing surface, and `apps/docs` first-run docs app are merged to `main` | Good naming/DX direction with a first-run docs surface. Public product language now uses family names instead of internal family codes. | Package name must be reserved by real npm publish; public docs deployment and community launch still missing |
| Address shadcn gaps | `ashlar update`, `ashlar verify`, capsule lockfile hashes, update survival tests, signed capsule manifests, release readiness, SBOM/trust-bundle/provenance tooling | Strongest product wedge in repo | Needs real release traffic, public Sigstore bundles, npm provenance, external security review |
| AI-native gov app workflow | `ashlar mcp`, MCP `validate_usage`, `search_components`, `suggest_for_task`, `list_tokens`, `get_token`, `ashlar ai-eval`, generated `AGENTS.md` and `DESIGN.md`, and `examples/ai-eval/generated-output-corpus` | Useful local AI-native substrate with a small seed corpus | Independent model/tool outputs beyond the Codex seed corpus, hosted/remote MCP decision, write-tool threat model if write tools are ever added |
| Amazing DX and easy integration | `ashlar init|create`, `status|info`, `add --all --view --dry-run --diff`, `search|list -q -l`, `suggest`, `view|docs`, `-c/--cwd` on common commands, `audit`, `theme sync`, `theme validate`, `pnpm repo:doctor`, `pnpm testing:start`, `pnpm testing:start --check --visual`, release smoke installing packed CLI into a clean consumer, `apps/docs` first-run path for install/audit/add/verify/theme/testing/AI/trust, and real framework examples for vanilla TypeScript, React SPA, Next.js App Router, Svelte, and Vue | Good local DX and first-run guidance; main includes shadcn-v4-compatible ergonomics without claiming template/preset support. | Public npm install path, public docs deployment, real user feedback, real template/preset system if Ashlar chooses to mirror that shadcn surface |
| Light footprint | `ashlar bundle budget` reports 12 markup primitive capsules at 2,094 B CSS gzip and 0 B JS gzip against a 20,992 B markup primitive budget; Button is 649 B CSS gzip and 0 B JS | Strong evidence for current markup primitive substrate | Must hold as interactive components arrive |
| Gov trust/compliance posture | Federal page-shell audit, evidence gate, review-pack generation, incident playbook, release readiness, SBOM, trust bundle, issue templates | Strong process and tooling | Real stable evidence, completed review records, public provenance/Sigstore proof |

## Current PR Evidence

Merged implementation stack now includes the earlier foundation work plus the recent banner, release, namespace, package workflow, and language-cleanup merges:

- #42 `feat: build standards evidence foundation`
- #43 `docs: refresh proof gate checkpoint docs`
- #44 `docs: document release review pack artifact extraction`
- #45 `fix: make release trust checklist paths portable`
- #46 `feat: add ashlar npx entrypoint`
- #47 `docs: refresh objective audit PR evidence`
- #48 `docs: define USWDS coverage matrix`
- #49 `test: add generated-output AI eval corpus`
- #50 `docs: refresh objective audit stack evidence`
- #51 `docs: add first-run docs app`
- #52 `docs: refresh objective audit after docs app`
- #53 `ci: add release governance`
- #54 `feat: add framework case-board examples`
- #75 `fix(banner): replace fake flag with svg proof`
- #76 `chore(release): version packages`
- #86 `chore(release): version packages`
- #87 `fix(docs): clarify capsule layer language`
- #88 `ci(release): add github packages publish workflow`
- #89 language cleanup for internal family labels
- #90 `chore(release): version packages`
- #91 documentation cleanup for internal family labels
- #92 `docs(status): refresh current proof audit`
- #93 `ci(release): require main for npm publish`
- #94 `chore(release): version packages`
- #95 `docs(status): refresh proof audit after release guard`
- #96 `chore(www): clean public-site lint warnings`
- #97 `ci: clean workflow annotations`
- #98 `fix(language): prefer capsule family labels`
- #99 `chore(release): version packages`
- #100 `feat(release): check GitHub Packages readiness`
- #101 `chore(release): version packages`
- #102 `docs(status): refresh current proof audit`
- #103 documentation cleanup for family naming
- #104 `chore(testing): add repo doctor command`
- #105 `chore(testing): add manual testing launcher`
- #106 `fix(doctor): ignore nested worktrees`
- #107 `docs(language): prefer family wording in public docs`
- #108 `feat(testing): add manual testing checklist`
- #109 `docs(status): refresh objective audit after testing`
- #110 `chore(testing): guard public product language`
- #111 `fix(release): include workflow confirmations in proof plan`
- #112 `chore(release): version packages`
- #113 `fix(release): include github packages proof step`
- #114 `chore(release): version packages`
- #115 `docs(status): refresh objective audit after release`
- #116 `docs(testing): add hands-on QA guide`
- #117 `fix(docs): add testing path and real flag`

Post-merge evidence through #117: GitHub `CI` and `Version Packages` completed successfully after the proof-audit refresh, family-language cleanup, repo doctor merge, testing-session launcher, nested-worktree doctor fix, manual testing checklist merge, public product-language guard, release proof-plan workflow confirmation commands, GitHub Packages proof-plan step, generated version merges, hands-on QA guide, and docs testing/flag fix. The #100 feature PR completed `status`, `commitlint`, and `checks`; after merge, main CI completed `pnpm check`, `pnpm build`, `pnpm examples:visual`, `pnpm release:smoke`, `release provenance-check`, `release github-packages-check`, SBOM/trust-bundle/evidence/audit/report generation, and artifact upload. The generated version PRs #101, #112, and #114 were verified locally before merge where needed, then their post-merge `main` `CI` and `Version Packages` workflows passed. The final verified `main` runs for `d4502a6` are GitHub Actions `CI` run `25540268868` and `Version Packages` run `25540268840`, both successful.

Package state:

- `@blen/ashlar@0.3.11`
- `@blen/ashlar-cli@0.3.11`
- `@blen/ashlar-schemas@0.1.5`

## Gate Audit

The following release-readiness checks pass today:

- registry capsule verification;
- markup primitive component coverage;
- evidence gate for not-reviewed/experimental capsules;
- bundle budget;
- deterministic AI eval;
- local npm provenance prerequisites;
- incident playbook;
- external-review process artifacts;
- local Sigstore workflow shape.

The following release-readiness checks fail today:

- `stable-markup-evidence`: requires at least one stable-evidence markup primitive component; found 0.
- `external-review-proof`: missing `stable-evidence-*.md`, `release-trust-*.md`, and `design-partner-*.md`.
- `npm-provenance-public`: requires real npm trusted publishing and `ashlar release provenance-verify-public` against published versions.
- `sigstore-public-trust`: 0/13 capsule manifests include public Sigstore bundle metadata; current capsules still use local Ed25519 signatures.

Current Button reviewer intake and release-review artifacts are produced by green CI runs; they remain intake artifacts only. They do not count as completed external review records.

## Next Concrete Work

1. Produce the first real Button stable-evidence packet: automated artifact, manual keyboard transcript, manual screen-reader transcript, reviewed packet, graduated packet, local publication receipt, and completed `docs/reviews/stable-evidence-*.md`.
2. Configure npmjs.com trusted publishers for `@blen/ashlar`, `@blen/ashlar-cli`, and `@blen/ashlar-schemas`, run the first real trusted-publishing release from `.github/workflows/publish.yml`, and attach `ashlar-npm-provenance.json`.
3. Run the Sigstore workflow for capsule/release artifacts and attach `ashlar-public-trust.json`.
4. Complete release-trust and design-partner review records, then rerun strict `ashlar release readiness` without local escape hatches.
5. Expand the AI eval generated-output corpus with independent model/tool outputs and real user prompts.
6. Review the USWDS coverage matrix and turn the v0.1 public-alpha set into explicit capsule/evidence issues.

Do not claim Ashlar replaces USWDS, or that it is public-alpha ready, until those checks pass.
