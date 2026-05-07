# Objective Completion Audit

Date: 2026-05-07
Branch inspected: `main` at `8040d94` after #89, #90, and #91 merged

## Objective

Build a government-first UI library that can credibly replace day-to-day USWDS usage, become a memorable shadcn-like name in the gov space, address shadcn's source-copy/update/provenance gaps, and let government developers build AI-native public-service apps with strong DX, light footprint, and easy integration.

## Verdict

Not achieved yet.

Ashlar has a real substrate now: signed source capsules, federal and component audits, migration planning, update survival tests, local MCP, first-run docs, evidence tooling, release readiness gates, bundle budgets, framework examples, a memorable `npx @blen/ashlar` package entrypoint, banner visual regression tests, shadcn-v4-compatible CLI ergonomics, `@blen/*` package metadata, GitHub Packages canary workflow wiring, and product-facing layer names across docs, schemas, registry metadata, options, and gates. The remaining blockers are not implementation effort proxies; they are proof gates:

- one stable-evidence markup primitive component with real manual accessibility evidence;
- completed external review records;
- public npm trusted-publishing provenance for `@blen/ashlar`, `@blen/ashlar-cli`, and `@blen/ashlar-schemas`;
- public capsule Sigstore trust material.

Strict readiness evidence: `node packages/cli/dist/index.js release readiness --registry ./registry --json-output /tmp/ashlar-readiness-current.json --report /tmp/ashlar-readiness-current.md` returned `status: "fail"` on 2026-05-07 from `8040d94` with 9 passing checks and 4 failing checks: `stable-markup-evidence`, `external-review-proof`, `npm-provenance-public`, and `sigstore-public-trust`.

## Prompt-To-Artifact Checklist

| Requirement | Current evidence | Coverage judgment | Missing proof |
| --- | --- | --- | --- |
| Replace day-to-day USWDS usage | `ashlar audit --policy federal`, `ashlar migrate uswds`, 12 markup primitive capsules in `registry/components`, `benefit-application` service-flow capsule, `examples/uswds-project` migration fixture, `examples/legacy-federal-project` audit fixture, `docs/roadmap/uswds-coverage-matrix.md`, framework case-board examples, banner visual smoke | Strong prototype, not replacement-grade. Coverage gaps are now explicit. | Stable accessibility evidence, external design-partner validation, wider component/pattern coverage, public release |
| Become memorable like shadcn/ui | `@blen/ashlar` package entrypoint, `npx @blen/ashlar` docs/status alignment, source-capsule distribution model, product layer names, `apps/www` marketing surface, and `apps/docs` first-run docs app are merged to `main` | Good naming/DX direction with a first-run docs surface. | Package name must be reserved by real npm publish; public docs deployment and community launch still missing |
| Address shadcn gaps | `ashlar update`, `ashlar verify`, capsule lockfile hashes, update survival tests, signed capsule manifests, release readiness, SBOM/trust-bundle/provenance tooling | Strongest product wedge in repo | Needs real release traffic, public Sigstore bundles, npm provenance, external security review |
| AI-native gov app workflow | `ashlar mcp`, MCP `validate_usage`, `search_components`, `suggest_for_task`, `list_tokens`, `get_token`, `ashlar ai-eval`, generated `AGENTS.md` and `DESIGN.md`, and `examples/ai-eval/generated-output-corpus` | Useful local AI-native substrate with a small seed corpus | Independent model/tool outputs beyond the Codex seed corpus, hosted/remote MCP decision, write-tool threat model if write tools are ever added |
| Amazing DX and easy integration | `ashlar init|create`, `status|info`, `add --all --view --dry-run --diff`, `search|list -q -l`, `suggest`, `view|docs`, `-c/--cwd` on common commands, `audit`, `theme sync`, `theme validate`, release smoke installing packed CLI into a clean consumer, `apps/docs` first-run path for install/audit/add/verify/theme/AI/trust, and real framework examples for vanilla TypeScript, React SPA, Next.js App Router, Svelte, and Vue | Good local DX and first-run guidance; main includes shadcn-v4-compatible ergonomics without claiming template/preset support. | Public npm install path, public docs deployment, real user feedback, real template/preset system if Ashlar chooses to mirror that shadcn surface |
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
- #89 `fix(language): replace public layer codes`
- #90 `chore(release): version packages`
- #91 `docs(language): remove remaining layer code references`

Post-merge evidence through #91: GitHub `CI` and `Version Packages` completed successfully on `8040d94`. Earlier post-merge runs also completed successfully for `e285840` (#89) and `c0cd5a1` (#90). The #91 local and PR verification included `pnpm format:check`, `pnpm check`, `pnpm build`, `pnpm commitlint --from HEAD~1 --to HEAD`, and a repository scan proving no remaining legacy numbered layer-code references across `docs`, `packages`, `apps`, `examples`, or `registry`.

Package state on `8040d94`:

- `@blen/ashlar@0.3.6`
- `@blen/ashlar-cli@0.3.6`
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
