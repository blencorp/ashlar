# External Review Records

This directory is for completed external review records. It intentionally starts empty except for this README and reusable templates.

Do not add placeholder records. A record belongs here only after a reviewer or external system has produced evidence that can be inspected.

Templates live in `docs/reviews/templates/`. They help create consistent records, but they do not count as completed proof. A top-level record must replace placeholder fields, include a completed review status, and end with `Decision: pass`.

Required top-level record prefixes before stronger replacement-grade claims:

- `stable-evidence-*.md` - completed accessibility review for at least one L0 capsule, including the linked GitHub issue, completed manual evidence artifacts, transcript validation output, `evidence review-status` output, and the `evidence publish --output` publication receipt.
- `release-trust-*.md` - completed security/release trust review, including npm provenance verification, signed registry verification, SBOM/trust-bundle verification, and workflow artifact links.
- `design-partner-*.md` - completed design partner review of the validator wedge or first service-flow proof, including scenario, commands/screens reviewed, feedback, and adoption blockers.

`ashlar release review-record-check` validates these records before readiness. For stable-evidence records, it reruns `evidence review-status` against the recorded bundle path and verifies local publication receipts from `ashlar evidence publish --output` against the signed registry state, so a completed-looking markdown file cannot count while the underlying reviewer bundle is still blocked or unpublished. For release-trust records, local registry, SBOM, attestation, and trust-bundle paths are reverified with `ashlar release verify-trust-bundle`; local npm provenance paths must be JSON output from `ashlar release provenance-verify-public --json` that matches the reviewed package versions; local Capsule Sigstore verification paths must be JSON output from `ashlar release public-trust-verify --json` that matches the reviewed signed registry artifact. HTTPS artifact links are treated as external reviewer evidence. For design-partner records, local screen, validator-output, and reviewer-checklist paths must exist.

`ashlar release readiness` fails strict replacement-grade readiness until all three top-level record types exist and pass the record checker.
