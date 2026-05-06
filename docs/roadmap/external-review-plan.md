# External Review Plan

Date: 2026-05-05

Ashlar cannot become replacement-grade through local implementation alone. The remaining blockers require review artifacts produced by people or systems outside the local checkout.

## Review Tracks

| Track | Purpose | GitHub template | Blocking gate |
|---|---|---|---|
| Stable evidence review | Produce real keyboard, screen-reader, WCAG, and ICT Baseline evidence for one L0 capsule. | `stable_evidence_review.yml` | `stable-l0-evidence` |
| Release trust review | Verify npm trusted publishing, package provenance, capsule Sigstore bundles, SBOM, and trust bundle artifacts. | `release_trust_review.yml` | `npm-provenance-public`, `sigstore-public-trust` |
| Design partner review | Validate that the wedge is understandable and useful in a real public-service context. | `design_partner_review.yml` | External credibility |

## Track 1: Stable Evidence Review

First target: `button@0.0.1`.

Maintainer prep:

```bash
pnpm build
node packages/cli/dist/index.js release review-pack \
  --registry ./registry \
  --output reports/review-pack
node packages/cli/dist/index.js evidence prepare-stable-all \
  --registry ./registry \
  --output reports/l0-stable-review
node packages/cli/dist/index.js evidence review-status button \
  --registry ./registry \
  --review-dir reports/l0-stable-review/button
```

The review pack is a convenience bundle for reviewers. It does not create completed proof records and it does not replace the specific acceptance commands below.

Reviewer output must include:

- the generated `reports/l0-stable-review/INDEX.md` used to select the L0 target;
- the generated `reports/l0-stable-review/button/ISSUE.md` body pasted into the stable evidence review issue;
- the generated `reports/l0-stable-review/button/REVIEWER_CHECKLIST.md` used as the reviewer acceptance checklist;
- completed manual review artifact;
- keyboard transcript artifact;
- screen-reader transcript artifact;
- explicit known limitations;
- no TODO, TBD, placeholder, or blocked result.

Maintainer acceptance:

```bash
node packages/cli/dist/index.js evidence review-status button \
  --registry ./registry \
  --review-dir reports/l0-stable-review/button
node packages/cli/dist/index.js evidence finalize-stable button \
  --registry ./registry \
  --review-dir reports/l0-stable-review/button
node packages/cli/dist/index.js evidence button \
  --check \
  --registry ./registry \
  --evidence-file reports/l0-stable-review/button/button.evidence.stable.json
node packages/cli/dist/index.js evidence publish button \
  --registry ./registry \
  --evidence-file reports/l0-stable-review/button/button.evidence.stable.json \
  --signing-key <trusted-local-signing-key> \
  --key-id <trusted-key-id> \
  --output reports/button-evidence-publication.json
```

Do not publish stable evidence until those commands pass and a maintainer has checked that the artifacts describe real observed behavior.

## Track 2: Release Trust Review

This track happens only after a release branch is ready on `main`.

Maintainer prep:

1. Configure npm trusted publishers for `@ashlar/cli` and `@ashlar/schemas`.
2. Run `.github/workflows/publish.yml` from GitHub Actions.
3. Run `.github/workflows/sigstore.yml` from GitHub Actions.
4. Download the signed registry, SBOM, attestation, trust bundle, `ashlar-npm-provenance.json`, `ashlar-public-trust.json`, release-trust reviewer checklist, and Sigstore bundles.

Reviewer acceptance commands:

```bash
node packages/cli/dist/index.js release provenance-verify-public \
  --package @ashlar/cli@<version> @ashlar/schemas@<version>
node packages/cli/dist/index.js release provenance-verify-public \
  --package @ashlar/cli@<version> @ashlar/schemas@<version> \
  --json > <ashlar-npm-provenance.json>
node packages/cli/dist/index.js release public-trust-verify \
  --registry <signed-registry-artifact>
node packages/cli/dist/index.js release public-trust-verify \
  --registry <signed-registry-artifact> \
  --json > <ashlar-public-trust.json>
node packages/cli/dist/index.js release verify-trust-bundle \
  --registry <signed-registry-artifact> \
  --bundle <ashlar-trust-bundle.json> \
  --sbom <ashlar-sbom.spdx.json> \
  --attestation <ashlar-sbom.attestation.json>
```

Use the generated `ashlar-release-trust-checklist.md` as the reviewer acceptance checklist. The review should block on any long-lived token, missing npm provenance attestation, mismatched GitHub Actions identity, failed `cosign verify-blob`, stale SBOM hash, stale or missing `ashlar-npm-provenance.json`, stale or missing `ashlar-public-trust.json`, missing checklist item, or unpublished trust material.

## Review Records

Completed reviews are recorded under `docs/reviews/` after the underlying issue, workflow run, or reviewer artifact exists. Do not create placeholder records.

Record templates live under `docs/reviews/templates/`:

- `stable-evidence-review.md`
- `release-trust-review.md`
- `design-partner-review.md`

Those templates are process aids, not proof. Strict readiness only counts completed top-level records with real reviewer fields, evidence references, command output, and `Decision: pass`.

Required filename prefixes:

- `stable-evidence-*.md`
- `release-trust-*.md`
- `design-partner-*.md`

Strict `ashlar release readiness` fails until all three record types exist.

For completed reviews, maintainers can use the guarded record writer instead of hand-copying a template. It requires reviewer metadata and refuses placeholder fields; the `stable-evidence` variant also runs `evidence review-status` and will not write a completed record while the bundle is blocked.

```bash
node packages/cli/dist/index.js release review-record stable-evidence \
  --output docs/reviews/stable-evidence-button-2026-05-05.md \
  --reviewer "<reviewer>" \
  --affiliation "<organization>" \
  --review-date 2026-05-05 \
  --source-issue "<issue-url>" \
  --repo-commit "<commit-sha>" \
  --rationale "<why the review passed>" \
  --component button \
  --registry ./registry \
  --review-dir reports/l0-stable-review/button \
  --publication-receipt reports/button-evidence-publication.json
```

Before asking release readiness to count the records, preflight them directly:

```bash
node packages/cli/dist/index.js release review-record-check
node packages/cli/dist/index.js release review-record-check docs/reviews/stable-evidence-button-2026-05-05.md
```

For `stable-evidence-*` records, this checker reruns `ashlar evidence review-status` against the `Evidence bundle path` in the record and verifies local `Publication receipt` JSON from `ashlar evidence publish --output` against the signed registry state. A markdown record that looks complete but points at a blocked bundle, missing receipt, stale receipt, or unpublished registry evidence does not count.

For `release-trust-*` records, local registry, SBOM, attestation, and trust-bundle paths are reverified with `ashlar release verify-trust-bundle`. Public HTTPS artifact links still require reviewer judgment and immutable workflow artifacts.

For `design-partner-*` records, local screen, validator-output, and reviewer-checklist paths must exist. Public HTTPS links are allowed for recordings or hosted artifacts.

## Track 3: Design Partner Review

The first partner review should test the validator wedge and the service-flow proof, not a component catalog.

Maintainer prep:

```bash
node packages/cli/dist/index.js release design-partner-checklist \
  --output reports/ashlar-design-partner-checklist.md
```

Suggested reviewer flow:

```bash
node packages/cli/dist/index.js audit --policy federal --explain examples/legacy-federal-project/index.html
node packages/cli/dist/index.js audit --policy all --registry ./registry examples/service-flow/benefit-application.pass.html
node packages/cli/dist/index.js search "benefits application" --registry ./registry
node packages/cli/dist/index.js suggest "Build a benefits application form"
node packages/cli/dist/index.js view button --registry ./registry
```

Use the generated `ashlar-design-partner-checklist.md` as the reviewer acceptance checklist. The checklist is not proof by itself; it should drive a real partner conversation that is then recorded as a completed `docs/reviews/design-partner-*.md` file.

Questions to answer:

- Does "evidence-backed source UI for public services" make sense without an explanation from the maintainer?
- Is "capsule" a useful noun, or does it feel like private jargon?
- Is validator-only adoption a credible first step for a contractor or agency team?
- Which proof would make the reviewer comfortable recommending a pilot?
- What would make the reviewer reject Ashlar as another UI kit?

## Replacement Claim Rule

Do not strengthen public replacement language until:

- at least one stable-evidence L0 capsule is published;
- public npm provenance has been verified for exact package versions;
- public capsule Sigstore trust has been verified from a downloaded signed registry artifact;
- at least one external design partner review is recorded;
- at least one external accessibility or security review is recorded.

Until then, Ashlar remains a pre-alpha foundation prototype with a replacement ambition.
