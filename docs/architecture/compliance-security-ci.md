# Compliance, Security, and CI Tooling

Ashlar must help agencies prove that their interfaces are accessible, secure, updateable, and aligned with federal website expectations. This document defines the tool surface needed to make that real.

## Principle

Compliance cannot live only in documentation. Ashlar should make the correct path executable:

- component evidence is machine-readable;
- misuse is detectable in CI;
- themes are validated before release;
- source provenance is verifiable;
- AI-generated code is auditable;
- accessibility-critical updates are visible and intentional.

## Accessibility scope

Ashlar targets **WCAG 2.2 AA engineering quality** for stable components. Evidence maps back to:

- Section 508 / WCAG 2.0 A and AA;
- ADA Title II / WCAG 2.1 AA for state and local government contexts;
- WCAG 2.2 AA for future-facing best practice.

Ashlar must not claim that a component makes an application compliant. Required docs language:

> Ashlar components are designed and tested to support accessible implementation. Accessibility conformance for the final service depends on correct use, content, configuration, and integration.

## Evidence artifacts

Each stable capsule must ship:

- `*.evidence.json` with WCAG criterion mappings.
- Automated axe results.
- Keyboard interaction transcripts.
- Manual screen-reader notes, with the full NVDA, VoiceOver, and JAWS or TalkBack matrix required for LTS evidence.
- Forced-colors and high-contrast validation.
- Reduced-motion validation where motion exists.
- Known limitations.
- Anti-pattern mappings that explain which errors `ashlar audit` can prevent.

Evidence should be queryable:

```bash
npx ashlar evidence dialog
npx ashlar evidence --format json dialog
npx ashlar evidence collect button --fixture registry/components/button/0.0.1/button.html --output reports/button-evidence.json
npx ashlar evidence apply button --artifact reports/button-evidence.json --output reports/button.evidence.proposed.json
npx ashlar evidence prepare-stable button --fixture registry/components/button/0.0.1/button.html --output reports/button-stable-review
npx ashlar evidence prepare-stable-all --output reports/l0-stable-review
npx ashlar evidence manual-template button --output reports/button-manual-review.json
npx ashlar evidence finalize-stable button --review-dir reports/button-stable-review
npx ashlar evidence review button --evidence-file reports/button.evidence.proposed.json --manual-file reports/button-manual-review.json --output reports/button.evidence.reviewed.json
npx ashlar evidence graduate button --evidence-file reports/button.evidence.reviewed.json --output reports/button.evidence.stable.json
npx ashlar evidence button --check --evidence-file reports/button.evidence.proposed.json
npx ashlar evidence --check
npx ashlar evidence --report ./reports/ashlar-a11y.md
```

## CI commands

The first CI surface should include:

```bash
npx ashlar audit --severity error
npx ashlar audit --sarif > ashlar.sarif
npx ashlar verify
npx ashlar theme validate
npx ashlar evidence --check
pnpm release:smoke
npx ashlar release provenance-check
npx ashlar release provenance-verify-public
npx ashlar release provenance-verify-public --json > reports/ashlar-npm-provenance.json
npx ashlar release sbom --output reports/ashlar-sbom.spdx.json
npx ashlar release attest --subject reports/ashlar-sbom.spdx.json --output reports/ashlar-sbom.attestation.json
npx ashlar release verify-attestation --subject reports/ashlar-sbom.spdx.json --attestation reports/ashlar-sbom.attestation.json
npx ashlar release sign-capsules --registry ./registry
npx ashlar release public-trust-verify --registry ./registry
npx ashlar release public-trust-verify --registry ./registry --json > reports/ashlar-public-trust.json
npx ashlar release trust-bundle --registry ./registry --sbom reports/ashlar-sbom.spdx.json --attestation reports/ashlar-sbom.attestation.json --output reports/ashlar-trust-bundle.json --checklist reports/ashlar-release-trust-checklist.md
npx ashlar release verify-trust-bundle --registry ./registry --bundle reports/ashlar-trust-bundle.json --sbom reports/ashlar-sbom.spdx.json --attestation reports/ashlar-sbom.attestation.json
npx ashlar release design-partner-checklist --output reports/ashlar-design-partner-checklist.md
npx ashlar ai-eval --suite examples/ai-eval/ashlar-ai-eval.json --json > reports/ashlar-ai-eval.json
npx ashlar bundle budget button --json > reports/ashlar-button-bundle-budget.json
npx ashlar bundle budget --json > reports/ashlar-l0-bundle-budget.json
```

### `ashlar audit`

Checks component usage and federal web rules across supported file types.

Required v0 rule packs:

- `ashlar/components`: component misuse from CEM anti-patterns.
- `ashlar/accessibility`: labels, names, headings, focus, landmarks, forms.
- `ashlar/federal-website-standards`: banner, page title, meta description, identifier hooks, contact page hooks.
- `ashlar/tokens`: hard-coded colors, invalid token references, unsafe overrides.
- `ashlar/security`: unsafe HTML injection in component slots, external script patterns, dangerous inline event handlers where applicable.

### `ashlar verify`

Checks installed files against `ashlar-lock.json` and signature data:

- capsule hash matches;
- file hash matches or local drift is reported;
- signature verifies against trusted registry;
- lockfile is internally consistent;
- registry trust root has not silently changed.

### `ashlar theme validate`

Checks:

- required semantic tokens exist;
- token aliases resolve;
- colors parse;
- critical contrast pairs pass;
- forced-colors fallbacks exist;
- dark mode is complete if declared;
- touch target and density tokens do not violate minimum sizing;
- agency theme metadata exists.

### `ashlar evidence --check`

Implemented locally. Fails CI or local checks when a capsule claims `stable` or `stable-evidence` without complete evidence. It can check registry packets directly, or a proposed packet with `--evidence-file <path>`:

- WCAG mappings pass or are explicitly not applicable, with evidence;
- ICT Baseline mappings pass or are explicitly not applicable, with evidence;
- automated accessibility results are recorded;
- at least one passing manual keyboard test is recorded with `manualTests[].tech` identifying keyboard review and an actionable transcript/evidence reference in `manualTests[].evidence`;
- at least one passing manual screen-reader test is recorded with a real screen-reader technology in `manualTests[].tech` and an actionable transcript/evidence reference in `manualTests[].evidence`;
- local manual test transcript references resolve to `manual-transcript.schema.json` JSON artifacts whose component/version, transcript type, result, environment, steps, and placeholder-free content validate;
- proposed evidence file references resolve to files from the project root; registry packet references resolve from the capsule directory so transcript files stay inside the signed capsule; external references must be HTTPS URLs;
- known limitations are present or explicitly empty;
- `lastReviewed` and `reviewer` metadata exist.

### `ashlar evidence collect`

Implemented locally. Runs the Ashlar audit runner against a named component fixture and writes a schema-backed JSON automated-evidence artifact containing:

- component name and resolved registry version;
- fixture path;
- audit policy (`components` by default; `federal` and `all` are also accepted);
- pass/fail status;
- structured findings from the same policy runner used by `ashlar audit` and MCP `validate_usage`.

The artifact declares `https://ashlar.dev/schemas/evidence-artifact.schema.json` and is validated before being written. This is supporting evidence, not a stable claim. Generated artifacts still need to be reviewed into signed evidence packets, and manual keyboard plus screen-reader evidence remains required before `stable-evidence`.

### `ashlar evidence apply`

Implemented locally. Validates a generated evidence artifact, checks that the artifact component and version match the registry, and writes a proposed evidence packet with the artifact embedded under `automatedResults`.

The command writes to an explicit output path instead of mutating the registry in place. This preserves capsule-signature integrity: a maintainer can review the proposed packet, update the registry source, regenerate the capsule manifest/hash, and sign the release in the normal publication flow.

### `ashlar evidence manual-template`

Implemented locally. Writes a schema-backed manual evidence starter artifact for a component. The template is prefilled from the component's known WCAG and ICT Baseline mappings, plus separate blocked manual keyboard and screen-reader test records.

Placeholders are deliberately marked `known-issue` and `blocked`, with a placeholder `manualTests[].evidence` path. That makes the file valid enough to hand to a reviewer, but not enough to pass the stable-evidence gate until the reviewer replaces the placeholders with real keyboard and screen-reader evidence. `TODO`, `TBD`, and placeholder evidence strings are rejected by the stable gate even if their statuses are changed to `pass`. For local transcript references, the target file must be a schema-backed `manual-transcript.schema.json` artifact rather than free-form notes.

### `ashlar evidence prepare-stable`

Implemented locally. Writes a complete non-mutating reviewer bundle for a component:

- an automated evidence artifact collected from the supplied fixture;
- a proposed evidence packet with that automated artifact applied;
- a self-contained `REVIEW.html` fixture harness for keyboard and screen-reader runs;
- a manual evidence worksheet wired to the generated transcript files;
- keyboard and screen-reader transcript worksheets;
- a schema-backed `MANIFEST.json` with file roles, byte sizes, and SHA-256 hashes;
- a concise `REVIEWER_CHECKLIST.md` with required observations, validation commands, and claim boundaries;
- a README with transcript validation, manual review, and graduation commands.

The command is intentionally preparation only. It does not mark evidence stable, publish into the registry, or replace the requirement for real keyboard and screen-reader observations.

CI uploads the L0 reviewer intake as `ashlar-l0-stable-review` so reviewers can start from the exact automated evidence, proposed packets, transcript worksheets, issue bodies, and follow-up commands produced by the release branch. The uploaded bundles still contain blocked manual worksheets until a real reviewer completes them. CI also uploads `ashlar-button-stable-review-status`, the schema-backed JSON output from `evidence review-status` for the Button bundle, as the exact current blocker list for one L0 bundle. `review-status` validates `MANIFEST.json` and blocks if immutable generated inputs, such as the proposed evidence packet, drift from their recorded hashes; reviewer worksheets are marked mutable so completed manual review does not fail the manifest check by itself.

Completed `stable-evidence-*` review records are also tied back to their bundle and publication: `ashlar release review-record-check` reruns `evidence review-status` for the `Evidence bundle path` recorded in the markdown and verifies local `Publication receipt` JSON from `ashlar evidence publish --output` against the signed registry state. A manually written record cannot satisfy replacement readiness if the referenced bundle is missing, blocked, no longer matches its generated manifest, or has not been published into the signed registry evidence packet.

Completed `release-trust-*` records get the same treatment for local artifacts. When the record points at local registry, SBOM, SBOM attestation, and trust-bundle paths, `review-record-check` reruns `ashlar release verify-trust-bundle` so stale or edited release-review material cannot satisfy external-review proof. HTTPS artifact links are allowed for real published workflow evidence, but the record still needs reviewer judgment and immutable links.

Completed `design-partner-*` records also validate local review artifacts. If the record cites local screens, validator output, or the generated design-partner checklist, those paths must exist before readiness counts the record. HTTPS links remain valid for hosted recordings or partner-provided artifacts.

`ashlar evidence prepare-stable-all --output <dir>` batches the same non-mutating reviewer bundle for every matching registry capsule, defaulting to L0. It writes one subdirectory per capsule plus an `INDEX.md` with status commands and the claim boundary. CI uploads that intake directory as `ashlar-l0-stable-review`; it is preparation for real review, not proof and not a stable evidence claim.

### `ashlar evidence transcript-template`

Implemented locally. Writes a schema-backed `manual-transcript.schema.json` starter artifact for one manual run:

- `--type keyboard` creates blocked focus-order, activation, and unavailable-state review steps;
- `--type screen-reader` creates blocked name/role/state, activation, and surrounding-context review steps, with required assistive-technology environment metadata.

The generated transcript is intentionally `blocked` and still contains reviewer placeholders. It is a reviewer worksheet, not stable evidence.

### `ashlar evidence transcript-validate`

Implemented locally. Validates a completed manual transcript artifact before it is referenced from a manual evidence review. The command checks schema validity, optional `--type` matching, and registry component/version alignment. This catches a common failure mode before `evidence review` / `evidence graduate`: a manual test record that points to the wrong component, wrong transcript type, or free-form JSON notes instead of a structured transcript.

### `ashlar evidence review`

Implemented locally. Validates a schema-backed manual review artifact, checks that it matches the registry component/version and the proposed evidence packet, and writes a new proposed packet with:

- human-reviewed WCAG mapping status/evidence updates for known mappings;
- human-reviewed ICT Baseline status/evidence updates for known mappings;
- appended manual keyboard and screen-reader test records, including transcript/evidence references;
- `lastReviewed`, `reviewer`, and explicit known limitations.

The command refuses unknown WCAG or ICT Baseline mappings instead of silently expanding a component's evidence surface. It does not mutate registry evidence or the input proposal; publication still requires maintainer review, capsule manifest/hash regeneration, and signing.

### `ashlar evidence finalize-stable`

Implemented locally. Reads a prepared stable-evidence review bundle, runs the same `review-status` gate, and refuses to write while any placeholder, blocked transcript, manifest drift, or simulated stable-evidence finding remains.

When the bundle is ready, it writes:

- `<component>.evidence.reviewed.json`, with the completed manual review applied;
- `<component>.evidence.stable.json`, with the stable-evidence claim applied and checked.

This is still non-mutating with respect to the registry. Publication still goes through `evidence publish`, which rechecks the graduated packet, copies referenced evidence into the capsule, rebuilds hashes, and signs the capsule.

### `ashlar evidence graduate`

Implemented locally. Attempts to mark a reviewed proposed packet as `stable` / `stable-evidence`, then runs the full evidence gate against that claimed packet before writing anything. Local evidence references must resolve to files from the project root unless they are HTTPS URLs. If any stable-evidence gate fails, the command reports the exact failing rule and leaves the output path untouched.

This prevents maintainers from hand-editing the final stable claim around `evidence --check`. It still produces a proposal; the registry source is not mutated until the release path regenerates the capsule manifest/hash and signs the packet.

### `ashlar evidence publish`

Implemented locally for filesystem registries. Takes a graduated `stable-evidence` packet and publishes it into the registry source only after:

- the current capsule manifest, index-pinned hash, and local Ed25519 signature verify;
- the requested `--key-id` is present in `registry/trust-root.json`;
- the evidence packet still matches the component/version;
- the full stable evidence gate passes, including local transcript/reference resolution;
- local transcript/reference files are copied into the capsule under `evidence/` and the packet is rewritten to those capsule-local paths;
- any existing capsule evidence target has identical content, so publish never silently replaces a transcript at the same path;
- the newly rebuilt capsule manifest is signed with a local Ed25519 key whose `keyId` is present in `registry/trust-root.json`.

The command verifies the generated signature before mutating the registry source, then writes the registry `*.evidence.json`, copied evidence files, the re-signed `*.capsule.json`, and the updated `registry/index.json` capsule hash/stability together. `--output <path>` writes a JSON publication receipt containing the previous/new capsule hash, evidence references, registry paths, and signing key id so review records can detect stale or missing stable-evidence publication. This is a local registry publication step, not public Sigstore signing or npm provenance.

### `ashlar evidence --report`

Implemented locally. Writes a Markdown evidence artifact for all registry components or one named component, including:

- stability and accessibility evidence status;
- WCAG and ICT Baseline mapping counts by status;
- manual test, automated result, and known limitation counts;
- evidence-gate findings.

The report is a review aid, not an Accessibility Conformance Report or a compliance claim. It uses the same stable-evidence reference resolution as `evidence --check`, so broken transcript paths appear in the report findings.

### `ashlar ai-eval`

Implemented locally. Runs schema-backed AI eval suites against saved generated output files. Each case records:

- the prompt used to produce the output;
- the Ashlar components used for grounding;
- the saved generated file to audit;
- expected finding counts or rule ids;
- actual findings from the shared audit runner.

`--json` emits a report suitable for CI artifacts. The report includes CEM/evidence grounding metadata for each component so reviewers can see which anti-pattern rules were in scope. This is not a live model benchmark and not accessibility evidence; it is a deterministic regression harness for generated UI output.

### `ashlar release readiness`

Implemented locally. Aggregates the current replacement-grade gates into one status report:

- verified registry trust root and capsule manifests;
- minimum L0 component coverage;
- minimum stable-evidence L0 count;
- stable evidence gate results;
- manifest-carried bundle budgets;
- deterministic AI eval suite;
- local npm provenance prerequisites;
- external review process artifacts;
- completed external review proof records;
- local keyless Sigstore workflow prerequisites;
- public npm provenance and public Sigstore trust blockers.

Strict defaults intentionally fail the current prototype. The command is designed to keep public claims honest: local signatures, unpublished packages, and not-reviewed capsules cannot satisfy a replacement-grade release gate. `--allow-unverified-public`, `--allow-local-signatures`, and `--min-stable-l0 0` can be used for local prototype smoke checks, but those flags should not be used to support public replacement claims.

`--report <path>` writes the same strict status as a Markdown artifact for maintainers, procurement reviewers, and external reviewers. `--json-output <path>` writes the schema-backed automation report using `release-readiness.schema.json`. CI uploads these as `ashlar-release-readiness` and `ashlar-release-readiness-json` on every run and marks the step `continue-on-error` while the public-proof gates are intentionally incomplete; the artifacts should be read as the current replacement-grade blocker list, not as release approval.

### `ashlar release design-partner-checklist`

Implemented locally. Writes a Markdown reviewer checklist for the validator wedge and first service-flow proof. The default checklist points reviewers at:

- the legacy federal fixture audit;
- the service-flow proof audit;
- task-oriented `search`, `suggest`, and `view` commands;
- product, DX, and claim-boundary questions.

The checklist is a design-partner review aid, not proof. Strict readiness still requires a completed `docs/reviews/design-partner-*.md` record from a real reviewer.

### `ashlar release sbom`

Implemented locally. Writes an SPDX 2.3 JSON SBOM for the release packages and declared runtime dependencies, resolving direct dependency versions from `pnpm-lock.yaml`.

The generated document includes:

- `@ashlar/schemas` and `@ashlar/cli` release package entries;
- runtime dependency entries with package URLs where versions are known;
- `DESCRIBES` relationships for release packages;
- `DEPENDS_ON` relationships from release packages to runtime dependencies.

CI uploads the SBOM as `ashlar-sbom`. This is a release-review artifact, not a substitute for npm provenance, signed GitHub releases, or SLSA attestations. The guarded `sigstore.yml` workflow can create a keyless cosign bundle for this JSON artifact, but public release trust still requires a real workflow run and publication of the generated bundle.

### `ashlar release attest`

Implemented locally. Writes an in-toto-shaped JSON attestation for a release artifact with:

- artifact file name;
- raw-byte SHA-256 digest;
- artifact byte size;
- generation timestamp;
- Ashlar tool identifier.

`ashlar release verify-attestation` recomputes the subject digest and size and fails if either differs. CI uses this for the generated SBOM before uploading artifacts. The attestation is deliberately described as hash-based tamper evidence; it is not a cryptographic signature or SLSA provenance attestation.

### `ashlar release trust-bundle`

Implemented locally. Writes a schema-backed release-review JSON bundle using `release-trust-bundle.schema.json`. It contains:

- the registry index hash;
- the registry trust-root hash and public keys;
- each verified capsule name, version, layer, stability, capsule hash, and local signature key id;
- the release SBOM hash and byte size;
- the release SBOM attestation hash and byte size.

The command refuses to write a trust bundle if the SBOM attestation does not verify or if the generated bundle fails schema validation. `ashlar release verify-trust-bundle` validates the bundle schema, recomputes the registry, capsule, SBOM, and attestation summaries, and fails if any hash, size, capsule list, or attestation verification changes.

`--checklist <path>` writes a Markdown release-trust reviewer checklist alongside the JSON bundle. It lists the exact npm provenance, public Sigstore, trust-bundle, artifact-attachment, and claim-boundary checks that an external security or procurement reviewer should complete. The checklist is not proof by itself; the JSON bundle and verifier commands remain the evidence.

This is an offline/procurement review artifact for the local prototype. It is not npm provenance, a SLSA provenance statement, or a public TUF/Rekor trust bundle. The guarded `sigstore.yml` workflow can keylessly sign capsule manifests plus this JSON artifact for release review; the remaining gap is publishing real capsule bundles and public trust material.

### `ashlar release sign-capsules`

Implemented locally. The command signs each registry capsule manifest payload with `cosign sign-blob --yes --bundle`, writes a capsule-local `*.sigstore.json` bundle, records the bundle hash, signed payload hash, certificate identity, and OIDC issuer in the capsule manifest, then verifies the updated manifest with the same consumer-path verifier. If signing or verification fails, the command restores the previous manifest and bundle state.

This is the command `.github/workflows/sigstore.yml` uses before building the release trust bundle. It requires a trust root with `sigstore.bundleVerification: "cosign"` and a GitHub Actions OIDC context for real keyless signing. Local tests use a fake cosign executable to prove command behavior without creating fake public trust.

### `ashlar release public-trust-verify`

Implemented locally. Verifies a signed registry artifact on the same path a consumer uses:

- every selected capsule must include Sigstore bundle metadata;
- `registry/trust-root.json` must require `sigstore.bundleVerification: "cosign"`;
- each capsule manifest must still match the registry index and source file hashes;
- each bundle hash, signed payload hash, certificate identity, and OIDC issuer must match policy;
- `cosign verify-blob` must pass for each capsule payload and bundle.

This command is intentionally strict. The checked-in prototype registry fails until the Sigstore workflow produces real capsule bundle files, but a downloaded signed registry artifact should pass before it is published or mirrored for procurement review.
The `--json` output is the local release-trust review artifact; `ashlar release review-record-check` verifies that it has no errors and still matches the signed registry artifact referenced by the review record.

### `.github/workflows/sigstore.yml`

Implemented locally as a guarded manual workflow for release-review artifacts. The workflow:

- requires `workflow_dispatch` with `confirm: sign`;
- runs only for `blencorp/ashlar` on `refs/heads/main`;
- grants `contents: read` and `id-token: write`;
- installs cosign with `sigstore/cosign-installer`;
- runs `ashlar release sign-capsules` to produce capsule-local Sigstore bundles;
- runs `ashlar release public-trust-verify` against the signed registry before upload;
- writes `reports/ashlar-public-trust.json` from `ashlar release public-trust-verify --json`;
- regenerates the release SBOM, SBOM attestation, and release trust bundle from the signed registry state;
- signs each JSON artifact with `cosign sign-blob --yes --bundle`;
- verifies each bundle with the workflow certificate identity and GitHub Actions OIDC issuer;
- uploads the signed registry material, JSON artifacts, and their `.sigstore.json` bundles.

`ashlar release readiness` checks the local workflow shape through `sigstore-workflow-local`. This closes a repository-readiness gap, not the public trust gap: the workflow has not yet produced public capsule bundles. `add`, `update`, `verify`, and `registry mirror` now validate declared capsule-level Sigstore bundle metadata and run `cosign verify-blob` when `registry/trust-root.json` requires it, but current capsules still use local Ed25519 signatures and have no public bundle material to verify.

### `ashlar release provenance-check`

Implemented locally. Checks the repository-side prerequisites for provenance-capable npm publishing:

- `@ashlar/schemas` and `@ashlar/cli` are publishable public packages;
- each package has `publishConfig.provenance: true`;
- each package has repository metadata pointing to `https://github.com/blencorp/ashlar.git` and its monorepo directory;
- CI grants `id-token: write`;
- CI runs on a GitHub-hosted runner;
- CI runs the readiness check itself;
- the manual `publish.yml` trusted-publishing path is tokenless, uses the npm registry, disables package-manager cache during setup, sets `NPM_CONFIG_PROVENANCE=true`, runs `pnpm release`, runs `ashlar release provenance-verify-public` after publishing, and uploads `reports/ashlar-npm-provenance.json` from the JSON verifier.

The command deliberately does not claim that npm provenance exists. The npmjs.com trusted publisher configuration is outside the local repo and must be verified on the package settings page before a public release.

Ashlar's root `pnpm release` script runs this gate before `changeset publish`.

### `ashlar release provenance-verify-public`

Implemented locally for the post-publish path. It verifies the public npm registry state rather than repository configuration:

- creates a throwaway npm project pinned to the exact Ashlar package versions;
- runs `npm install --ignore-scripts`;
- runs `npm audit signatures --json --include-attestations`;
- requires verified provenance attestation payloads that reference `github.com/blencorp/ashlar`, `publish.yml`, and each expected package/version.

`--json` writes the local release-trust review artifact. `ashlar release review-record-check` verifies that artifact has no errors and still matches the package versions listed in the review record.

This command is useful only after packages exist on npm. Until then, `ashlar release readiness` correctly keeps public npm provenance as a blocker.

### `ashlar bundle budget`

Implemented locally. Verifies capsule manifests, reads the CSS and JavaScript runtime files listed in those manifests, computes raw and gzipped bytes, and fails CI when the combined gzipped CSS or JavaScript exceeds the configured budget. If explicit CLI flags are omitted, the command uses the integrity-covered `bundleBudget` defaults in each capsule manifest.

- Current L0 twelve-capsule page: target under 20,992 B gzipped.
- L0 JavaScript: target exactly 0 B unless a component is explicitly moved out of L0.
- One L1 component added: target under 24 KiB gzipped.
- Button v0.0 gate: under 4KB gzipped CSS.

Current local measurements are 649 B gzipped for Button CSS with 0 B JavaScript, and 1,993 B gzipped CSS with 0 B JavaScript for the twelve current L0 capsules. Future L1 work should use manifest `bundleBudget.jsGzipBytes` for runtime budgets.

## SARIF output

`ashlar audit --sarif` is required for public alpha. SARIF allows findings to appear in GitHub code scanning and other security dashboards.

Each finding should include:

- rule id;
- severity;
- WCAG or policy mapping when relevant;
- file path and region;
- message;
- suggested fix where deterministic;
- evidence link where applicable.

## GitHub Actions example

```yaml
name: Ashlar

on:
  pull_request:
  push:
    branches: [main]

permissions:
  contents: read
  actions: read
  security-events: write

jobs:
  ashlar:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 24.15.0
      - run: npm ci
      - run: npx ashlar verify
      - run: npx ashlar theme validate
      - run: npx ashlar evidence --check
      - run: npx ashlar release readiness --report reports/ashlar-release-readiness.md --json-output reports/ashlar-release-readiness.json
        continue-on-error: true
      - run: npx ashlar evidence prepare-stable-all --output reports/l0-stable-review
      - run: npx ashlar evidence review-status button --review-dir reports/l0-stable-review/button --format json --output reports/button-stable-review-status.json
        continue-on-error: true
      - run: npx ashlar evidence --report reports/ashlar-evidence.md
        if: always()
      - run: npx ashlar audit --severity error --sarif > ashlar.sarif
      - uses: actions/upload-artifact@v4
        if: always()
        with:
          name: ashlar-release-readiness
          path: reports/ashlar-release-readiness.md
      - uses: actions/upload-artifact@v4
        if: always()
        with:
          name: ashlar-release-readiness-json
          path: reports/ashlar-release-readiness.json
      - uses: actions/upload-artifact@v4
        if: always()
        with:
          name: ashlar-l0-stable-review
          path: reports/l0-stable-review
      - uses: actions/upload-artifact@v4
        if: always()
        with:
          name: ashlar-button-stable-review-status
          path: reports/button-stable-review-status.json
      - uses: actions/upload-artifact@v4
        if: always()
        with:
          name: ashlar-evidence-report
          path: reports/ashlar-evidence.md
      - uses: actions/upload-artifact@v4
        if: always()
        with:
          name: ashlar-sarif
          path: ashlar.sarif
      - uses: github/codeql-action/upload-sarif@v4
        if: always()
        continue-on-error: true
        with:
          sarif_file: ashlar.sarif
```

`upload-sarif` requires GitHub Code Security/code scanning to be enabled for the repository. Keep the artifact upload as the portable fallback, and make code-scanning upload non-blocking unless the repository is configured to require it.

## Security model

Threats Ashlar must explicitly address:

- Compromised registry artifact.
- Compromised package-manager dependency.
- Malicious custom registry.
- Prompt-injected MCP request.
- Unsafe AI-generated migration.
- Component update that silently changes accessibility-critical behavior.
- Agency theme that breaks contrast or focus visibility.
- Drifted local source that no longer matches evidence.

Controls:

- Sigstore signatures.
- SLSA provenance.
- SBOM generation and npm provenance readiness checks.
- Signed Git tags for registry mirror.
- Air-gapped registry mirror.
- Explicit trust roots in `ashlar.config.json`.
- Read-only MCP by default.
- User confirmation for install/update/migration through MCP.
- Accessibility-critical file confirmation during update.
- `ashlar verify` before release.

## VPAT / ACR support

Ashlar should not generate a final VPAT for a consuming application. It can generate component-level evidence packages that help an agency or vendor prepare an Accessibility Conformance Report.

Future command:

```bash
npx ashlar evidence --acr-input --components button,dialog,form-field
```

Output should include:

- component list and versions;
- evidence status;
- WCAG/508 mapping;
- known limitations;
- date last reviewed;
- link to evidence files.

## Minimum public-alpha bar

Do not publish v0.1 until:

- `audit`, `verify`, `theme validate`, `evidence --check`, and `evidence --report` work in CI.
- SARIF output is accepted by GitHub code scanning.
- At least 12 components have complete evidence packets.
- Registry signatures can be verified offline from a mirror.
- MCP is read-only by default and install/update require explicit confirmation.

## Sources

- [ICT Testing Baseline Alignment Framework](https://baselinealignment.section508.gov/)
- [Section508.gov ICT Testing Baseline Portfolio](https://www.section508.gov/test/ict-testing-baseline-portfolio/)
- [WCAG 2.2](https://www.w3.org/TR/WCAG22/)
- [DOJ April 20 2026 ADA Title II interim final rule](https://www.ada.gov/assets/pdfs/2026-ifr.pdf)
- [NIST SP 800-218 SSDF](https://csrc.nist.gov/publications/detail/sp/800-218/final)
- [SLSA v1.2](https://slsa.dev/spec/v1.2/)
- [Federal Website Standards](https://standards.digital.gov/standards/)
