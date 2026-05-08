# Ashlar

> Ashlar is independent open-source research and is not affiliated with, endorsed by, or sponsored by GSA, USWDS, NDS, or the U.S. federal government.

Ashlar is open-source supply-chain and validation infrastructure for federal-standards web interfaces.

In masonry, an ashlar is a stone block cut with precise faces so it fits cleanly into a larger structure. The name reflects the project goal: a small, well-specified substrate that federal teams can verify, sign, update, and assemble safely under whatever component system they already use.

## What Ashlar does

Three verbs:

- **Audit** — `ashlar audit` enforces Federal Web Standards, USWDS conventions, and component-level accessibility rules in CI, emitting SARIF for GitHub Code Scanning, GitLab, and Azure DevOps. It runs against existing markup (TSX, JSX, plain HTML, ERB, and other languages where ast-grep has real coverage) without requiring a new component library to be installed first.
- **Verify provenance** — Components ship as content-addressed *capsules*. The current prototype verifies registry-authored capsule manifests, index-pinned hashes, local Ed25519 registry signatures, installed file hashes, local offline registry mirrors, declared capsule Sigstore bundle metadata, trust-root-required `cosign verify-blob`, and keyless Sigstore signing for release-review JSON artifacts; real public capsule Sigstore bundles and npm provenance remain release blockers.
- **Update safely** — Capsules install as source code (shadcn-style ownership) but track provenance through a lockfile, three-way merge, and a prototype capsule codemod runner. Local customizations survive upstream updates; accessibility-critical files force confirmation.

The accessibility evidence schema (automated results + manual keyboard + manual screen-reader + WCAG mapping + ICT Baseline alignment) and the AI contract (extended Custom Elements Manifest, MCP server, AGENTS.md) are how each verb is grounded — not separate pillars.

## What's true today

Ashlar is in v0.0 prototype. **See [STATUS.md](STATUS.md) for the live, honest list of what is implemented, experimental, and planned.** Headline claims that are not yet code or not yet publicly proven (real public capsule Sigstore bundles, npm provenance, hosted/write MCP, full DTCG token compiler) are explicitly marked there.

Ashlar groups capsules into plain product families. **Foundations** are semantic HTML/CSS capsules with zero JavaScript, **interactive controls** are stateful Web Components, **framework adapters** are generated wrappers, **service patterns** compose flows, and **application blocks** are larger templates. Registry schemas keep an internal `layer` field for compatibility, but public docs and normal CLI output should not ask users to reason about numbered layers or registry codes.

The current prototype implements:

- A federal HTML policy audit with seven page-shell rules, parser-backed, with SARIF output;
- A local registry index and the `init` / `create`, `status` / `info`, `add` with `--all` / `--view` / `--dry-run` / `--diff` preview flags, `audit`, `verify`, `update`, `migrate uswds`, `mcp`, `evidence`, `evidence collect`, `evidence apply`, `evidence prepare-stable`, `evidence prepare-stable-all`, `evidence review-status`, `evidence finalize-stable`, `search` / `list`, `suggest`, `view` / `docs`, `design sync`, `theme sync`, `theme validate`, `registry mirror`, `release sign-capsules`, and `release public-trust-verify` commands;
- A content-addressed capsule manifest and lockfile substrate (registry manifests verified against index-pinned hashes and local Ed25519 signatures on `add`, `update`, `verify`, and `registry mirror`; declared capsule Sigstore bundle metadata is checked against the registry trust policy and can require `cosign verify-blob`; `update` can run capsule-listed JSON codemods before merge; current registry capsules still need real public Sigstore bundles);
- Experimental Button, Banner, Identifier, Alert, Form Field, Text Input, Select, Radio Group, Checkbox, Error Summary, and Benefit Application capsules with platform features, policy mappings, and ICT Baseline planned-test entries. The current Banner capsule uses an inline decorative U.S. flag SVG aligned to USWDS/Federal Website Standards guidance rather than a CSS-painted placeholder;
- A first service-flow proof fixture that passes `audit --policy all`, plus a broken fixture that demonstrates explainable findings;
- A legacy federal-project fixture that contains no Ashlar components and still produces useful `audit --policy federal` findings;
- A USWDS migration fixture and `migrate uswds` report that maps common HTML and TSX/JSX `usa-*` component classes to available Ashlar capsules or explicit missing-capsule gaps;
- Lockfile-aware AGENTS.md generation plus editor instruction fanout so AI coding agents can see installed capsules and validation rules;
- A generated DESIGN.md export that summarizes theme tokens, reviewed theme provenance, installed capsules, evidence status, and validation rules for AI coding agents;
- `status` for a read-only adoption snapshot with initialized/installed/registry/stable-evidence/external-review checks plus next commands;
- A read-only local MCP server that exposes policy/feature-aware registry search, task-to-capsule suggestions, missing-capability warnings, capsule metadata, evidence, source-backed design-token lookup, and `validate_usage`;
- A deterministic `ai-eval` harness that validates saved AI-generated outputs against Ashlar policy expectations and records CEM/evidence grounding metadata;
- `evidence collect` to generate schema-backed JSON automated-evidence artifacts from registry fixtures, `evidence apply` to fold reviewed artifacts into proposed evidence packets, `evidence prepare-stable` to generate a complete non-mutating reviewer bundle with a schema-backed file manifest, self-contained `REVIEW.html` fixture harness, and prefilled stable-evidence review issue body, `evidence prepare-stable-all` to generate reviewer bundles for every markup primitive capsule in one intake directory, `evidence review-status` to report remaining placeholders or blocked stable gates before writing reviewed evidence, `evidence finalize-stable` to write reviewed and stable proposal files only after that bundle is ready, `evidence transcript-template` / `evidence transcript-validate` for manual keyboard and screen-reader transcript artifacts with component-specific reviewer scripts for Button stable-evidence, `evidence --check` to fail stable or `stable-evidence` claims when WCAG, ICT Baseline, automated, schema-backed local manual transcripts, limitations, or review metadata is incomplete, plus `evidence --report` for Markdown review artifacts;
- `theme sync` and `theme validate` for agency tokens, regenerating `theme.css`, a Tailwind v4 `@theme` companion file, a typed `tokens.ts` contract, and the Ashlar entrypoint from local theme JSON while checking reviewed source provenance, source retrieval dates, required semantic tokens, and action color contrast;
- A local release smoke that packs `@blen/ashlar`, `@blen/ashlar-cli`, and `@blen/ashlar-schemas`, installs the tarballs into a throwaway consumer project, and runs the packed `ashlar` binary against a standalone federal audit fixture;
- `release sbom` to generate an SPDX 2.3 JSON release SBOM for the Ashlar packages and declared runtime dependencies;
- `release attest` / `release verify-attestation` to create and verify a hash-based tamper-evidence artifact for release outputs;
- `release sign-capsules` to generate capsule Sigstore bundles with cosign and write manifest metadata, `release public-trust-verify` to require all signed capsule bundles to pass the consumer Sigstore verifier, plus `release trust-bundle` / `release verify-trust-bundle` to tie the local registry trust root, signed capsule hashes, release SBOM, and SBOM attestation into one schema-backed offline-review artifact;
- Guarded manual `publish.yml`, `sigstore.yml`, and `github-packages.yml` workflows plus `release provenance-check` and `release github-packages-check` readiness gates that emit review-record JSON for npm provenance and public capsule trust, keylessly sign and verify release SBOM, SBOM attestation, and release trust bundle artifacts with cosign bundles, and publish an authenticated GitHub Packages mirror/canary under `@blen/*` without replacing the public npmjs path;
- A Vite theme workbench across Default, VA, and USDA themes with light/dark/system modes, plus a Tailwind v4 build proof that consumes the generated `@theme` output;
- Real benefits-operations case-board examples for vanilla TypeScript, React SPA, Next.js App Router, Svelte, and Vue, each consuming source-owned Ashlar capsules and generated theme CSS. `pnpm examples:visual` screenshots every framework app and fails if the federal banner flag regresses to a fake background block;
- A plain HTML demo;
- CI that runs checks, build, release smoke, npm and GitHub Packages publishing readiness, strict replacement-readiness reporting, stable-evidence reviewer bundles and blocker reports, a portable release review-pack artifact, evidence reports, bundle budgets, AI evals, and SARIF artifact upload.

## Why this exists

USWDS gave federal teams a shared civic design language: accessible, consistent, trustworthy, plain-language public services. Those values are still right.

The substrate beneath them is where the pain lives:

- Federal stacks span React, Drupal/Twig, WordPress, Rails, Django, plain HTML, and custom CMSs; component usage rules are mostly prose, not machine-verifiable contracts;
- Source copies drift after customization with no safe upgrade path;
- Agencies need supply-chain provenance, signed releases, SBOMs, and air-gapped operation that a component library alone does not provide;
- AI coding agents need executable component contracts, not prose docs they paraphrase incorrectly;
- The 21st Century IDEA Act and the August 2025 *America by Design* executive order both demand modernization of public-service interfaces.

Meanwhile, the platform has moved forward — modern CSS handles much of what older design systems shipped JavaScript for, Tailwind v4 `@theme` integrates with token pipelines, and the Linux Foundation now governs both AGENTS.md and MCP.

Ashlar is the substrate beneath the components: the verifier, the signer, the updater, the contract.

## Public posture

- Ashlar is **informed by** USWDS — civic principles, accessibility discipline, plain-language guidance.
- Ashlar is **not affiliated** with USWDS, GSA, the U.S. federal government, or the National Design Studio.
- Ashlar is designed to **interoperate with USWDS**: USWDS markup passes Ashlar's federal policy audit; USWDS components can ship as Ashlar capsules; the banner and identifier checks accept `<usa-banner>` and `usa-identifier` class tokens by default.
- Ashlar **engineers to WCAG 2.2 AA** while documenting the legal baselines clearly: Section 508 incorporates WCAG 2.0 AA; ADA Title II references 2.1 AA (compliance dates April 26, 2027 / April 26, 2028).
- Ashlar provides component-level evidence; it does not claim to make an application compliant by itself.

## Try it

```bash
pnpm install
pnpm build

# Run the maintainer health stack before opening or merging a PR
pnpm repo:doctor

# Start the public site, docs, and every framework example for manual testing
pnpm testing:start

# Initialize a target project (e.g. a Vite app)
node /path/to/ashlar/packages/cli/dist/index.js init
mkdir -p ./my-public-service-app
node /path/to/ashlar/packages/cli/dist/index.js create --cwd ./my-public-service-app --registry /path/to/ashlar/registry --yes

# See the current adoption state and next commands
node /path/to/ashlar/packages/cli/dist/index.js status --registry ./registry

# Inspect the registry
node /path/to/ashlar/packages/cli/dist/index.js search button
node /path/to/ashlar/packages/cli/dist/index.js search "official website" --policy "Federal Website Standards"
node /path/to/ashlar/packages/cli/dist/index.js search --query "official website" --policy "Federal Website Standards" --limit 1
node /path/to/ashlar/packages/cli/dist/index.js search --feature details-summary --json
node /path/to/ashlar/packages/cli/dist/index.js suggest "Build a benefits application form"
node /path/to/ashlar/packages/cli/dist/index.js suggest "Ask yes/no eligibility questions"
node /path/to/ashlar/packages/cli/dist/index.js view button

# Plan a USWDS-to-Ashlar migration without writing files
node /path/to/ashlar/packages/cli/dist/index.js migrate uswds --registry ./registry examples/uswds-project/index.html
node /path/to/ashlar/packages/cli/dist/index.js migrate uswds --registry ./registry "examples/uswds-project/**/*.{html,tsx,jsx}"
node /path/to/ashlar/packages/cli/dist/index.js migrate uswds --registry ./registry --json "examples/uswds-project/**/*.{html,tsx,jsx}"

# Install capsules as source
node /path/to/ashlar/packages/cli/dist/index.js add button --view
node /path/to/ashlar/packages/cli/dist/index.js add button --dry-run
node /path/to/ashlar/packages/cli/dist/index.js add button --diff
node /path/to/ashlar/packages/cli/dist/index.js add --all --dry-run
node /path/to/ashlar/packages/cli/dist/index.js add form-field text-input textarea date-input select radio-group checkbox button alert error-summary identifier

# Verify the install
node /path/to/ashlar/packages/cli/dist/index.js verify

# Mirror the verified local registry for offline use
node /path/to/ashlar/packages/cli/dist/index.js registry mirror --registry ./registry --output ./ashlar-mirror

# Merge upstream capsule changes into source-owned installs
node /path/to/ashlar/packages/cli/dist/index.js update button --yes

# Start the read-only local MCP server for coding agents
node /path/to/ashlar/packages/cli/dist/index.js mcp

# Sync theme CSS/Tailwind output and validate agency tokens
node /path/to/ashlar/packages/cli/dist/index.js theme sync
node /path/to/ashlar/packages/cli/dist/index.js theme validate

# Audit static HTML against federal page-shell standards
node /path/to/ashlar/packages/cli/dist/index.js audit --policy federal --explain examples/plain-html/index.html

# Audit an existing non-Ashlar federal page and surface adoption-wedge findings
node /path/to/ashlar/packages/cli/dist/index.js audit --policy federal --explain examples/legacy-federal-project/index.html

# Audit the first service-flow proof
node /path/to/ashlar/packages/cli/dist/index.js audit --policy all --registry ./registry examples/service-flow/benefit-application.pass.html

# Run the deterministic AI-generated-output eval suite
node /path/to/ashlar/packages/cli/dist/index.js ai-eval --suite examples/ai-eval/ashlar-ai-eval.json --registry ./registry

# Prove the markup primitive capsules stay lightweight
node /path/to/ashlar/packages/cli/dist/index.js bundle budget button --registry ./registry
node /path/to/ashlar/packages/cli/dist/index.js bundle budget --registry ./registry

# Show the evidence packet
node /path/to/ashlar/packages/cli/dist/index.js evidence button --format json

# Collect automated evidence for a capsule fixture
node /path/to/ashlar/packages/cli/dist/index.js evidence collect button --registry ./registry --fixture registry/components/button/0.0.1/button.html --output ./reports/button-evidence.json

# Apply the artifact into a proposed evidence packet for review
node /path/to/ashlar/packages/cli/dist/index.js evidence apply button --registry ./registry --artifact ./reports/button-evidence.json --output ./reports/button.evidence.proposed.json

# Prepare the full non-mutating reviewer bundle in one command
node /path/to/ashlar/packages/cli/dist/index.js evidence prepare-stable button --registry ./registry --fixture registry/components/button/0.0.1/button.html --output ./reports/button-stable-review

# Open ./reports/button-stable-review/REVIEW.html for the manual keyboard and screen-reader run

# Prepare reviewer bundles for every markup primitive capsule in one intake directory
node /path/to/ashlar/packages/cli/dist/index.js evidence prepare-stable-all --registry ./registry --output ./reports/markup-primitive-stable-review

# Check what still blocks that reviewer bundle from stable-evidence
node /path/to/ashlar/packages/cli/dist/index.js evidence review-status button --registry ./registry --review-dir ./reports/button-stable-review
node /path/to/ashlar/packages/cli/dist/index.js evidence review-status button --registry ./registry --review-dir ./reports/markup-primitive-stable-review/button
node /path/to/ashlar/packages/cli/dist/index.js evidence review-status button --registry ./registry --review-dir ./reports/markup-primitive-stable-review/button --format json --output ./reports/button-stable-review-status.json

# After a reviewer completes the bundle and review-status is ready, write reviewed/stable proposal files
node /path/to/ashlar/packages/cli/dist/index.js evidence finalize-stable button --registry ./registry --review-dir ./reports/button-stable-review

# Generate and validate manual transcript artifacts for reviewer completion
node /path/to/ashlar/packages/cli/dist/index.js evidence transcript-template button --registry ./registry --type keyboard --output ./reports/button-keyboard-transcript.json
node /path/to/ashlar/packages/cli/dist/index.js evidence transcript-template button --registry ./registry --type screen-reader --output ./reports/button-screen-reader-transcript.json
node /path/to/ashlar/packages/cli/dist/index.js evidence transcript-validate button --registry ./registry --type screen-reader --transcript ./reports/button-screen-reader-transcript.json

# Apply a human review artifact without mutating registry evidence
node /path/to/ashlar/packages/cli/dist/index.js evidence review button --registry ./registry --evidence-file ./reports/button.evidence.proposed.json --manual-file ./reports/button-manual-review.json --output ./reports/button.evidence.reviewed.json

# Graduate a reviewed packet only if stable-evidence gates pass
node /path/to/ashlar/packages/cli/dist/index.js evidence graduate button --registry ./registry --evidence-file ./reports/button.evidence.reviewed.json --output ./reports/button.evidence.stable.json

# Publish a graduated packet into a local signed registry source
# Existing capsule evidence paths are reused only when the file content matches.
node /path/to/ashlar/packages/cli/dist/index.js evidence publish button --registry ./registry --evidence-file ./reports/button.evidence.stable.json --signing-key ./private/ashlar-local-ed25519.pem --key-id ashlar-local-dev-2026-05-05 --output ./reports/button-evidence-publication.json

# Check proposed evidence packets, then the registry evidence gates
node /path/to/ashlar/packages/cli/dist/index.js evidence button --check --registry ./registry --evidence-file ./reports/button.evidence.stable.json
node /path/to/ashlar/packages/cli/dist/index.js evidence --check --registry ./registry

# Write a Markdown evidence report for CI/procurement review
node /path/to/ashlar/packages/cli/dist/index.js evidence --report ./reports/ashlar-evidence.md --registry ./registry

# Prove the packages install and run from tarballs
pnpm release:smoke

# Verify publish-path wiring without publishing
node /path/to/ashlar/packages/cli/dist/index.js release provenance-check
node /path/to/ashlar/packages/cli/dist/index.js release github-packages-check

# Run the strict replacement-grade readiness gate
# This intentionally fails while stable evidence, public npm provenance, or Sigstore trust are incomplete.
node /path/to/ashlar/packages/cli/dist/index.js release readiness --registry ./registry
node /path/to/ashlar/packages/cli/dist/index.js release readiness --registry ./registry --report ./reports/release-readiness.md
node /path/to/ashlar/packages/cli/dist/index.js release readiness --registry ./registry --json-output ./reports/release-readiness.json
node /path/to/ashlar/packages/cli/dist/index.js release readiness --registry ./registry --report ./reports/release-readiness.md --json-output ./reports/release-readiness.json

# Prepare external review checklists, then write guarded top-level records after real reviews
node /path/to/ashlar/packages/cli/dist/index.js release proof-plan --registry ./registry --output ./reports/proof-action-plan.md
node /path/to/ashlar/packages/cli/dist/index.js release review-pack --registry ./registry --output ./reports/review-pack
node /path/to/ashlar/packages/cli/dist/index.js release design-partner-checklist --output ./reports/ashlar-design-partner-checklist.md
node /path/to/ashlar/packages/cli/dist/index.js release review-record stable-evidence --output docs/reviews/stable-evidence-button-2026-05-05.md --reviewer "<reviewer>" --affiliation "<organization>" --review-date 2026-05-05 --source-issue "<issue-url>" --repo-commit "<commit-sha>" --rationale "<why the review passed>" --component button --registry ./registry --review-dir ./reports/markup-primitive-stable-review/button --publication-receipt ./reports/button-evidence-publication.json
# For stable-evidence, local release-trust, and local design-partner artifacts, this reruns or checks referenced proof.
node /path/to/ashlar/packages/cli/dist/index.js release review-record-check

# After a real npm publish, verify public provenance for the exact release versions
node /path/to/ashlar/packages/cli/dist/index.js release provenance-verify-public --package @blen/ashlar@0.0.0 @blen/ashlar-cli@0.0.0 @blen/ashlar-schemas@0.0.0
node /path/to/ashlar/packages/cli/dist/index.js release provenance-verify-public --package @blen/ashlar@0.0.0 @blen/ashlar-cli@0.0.0 @blen/ashlar-schemas@0.0.0 --json > ./reports/ashlar-npm-provenance.json

# Write an SPDX release SBOM
node /path/to/ashlar/packages/cli/dist/index.js release sbom --output ./reports/ashlar-sbom.spdx.json

# Write and verify a tamper-evident release attestation
node /path/to/ashlar/packages/cli/dist/index.js release attest --subject ./reports/ashlar-sbom.spdx.json --output ./reports/ashlar-sbom.attestation.json
node /path/to/ashlar/packages/cli/dist/index.js release verify-attestation --subject ./reports/ashlar-sbom.spdx.json --attestation ./reports/ashlar-sbom.attestation.json

# Bundle local registry trust material with release artifacts for offline review
node /path/to/ashlar/packages/cli/dist/index.js release sign-capsules --registry ./registry
node /path/to/ashlar/packages/cli/dist/index.js release public-trust-verify --registry ./registry
node /path/to/ashlar/packages/cli/dist/index.js release public-trust-verify --registry ./registry --json > ./reports/ashlar-public-trust.json
node /path/to/ashlar/packages/cli/dist/index.js release trust-bundle --registry ./registry --sbom ./reports/ashlar-sbom.spdx.json --attestation ./reports/ashlar-sbom.attestation.json --output ./reports/ashlar-trust-bundle.json --checklist ./reports/ashlar-release-trust-checklist.md
node /path/to/ashlar/packages/cli/dist/index.js release verify-trust-bundle --registry ./registry --bundle ./reports/ashlar-trust-bundle.json --sbom ./reports/ashlar-sbom.spdx.json --attestation ./reports/ashlar-sbom.attestation.json
```

## First-run docs app

The first-run documentation app lives in [`apps/docs`](apps/docs). It gives new
adopters a compact path through install, first audit, first capsule add,
verify/update, themes, AI/MCP, and trust/evidence posture without weakening the
claim boundaries in `STATUS.md`.

```bash
pnpm --filter @blen/ashlar-docs dev
pnpm --filter @blen/ashlar-docs build
```

## Roadmap

The roadmap is gate-based, not calendar-based, and v0.0 is staged as a slice graph rather than a single release block.

1. **GitHub launch readiness** — license, governance, security policy, contribution model, public roadmap, disclaimers, named external maintainer.
2. **v0.0 Foundation** — six independently shippable slices: standards-and-evidence (✓), validator wedge, drift management, supply-chain hardening, AI contracts, token pipeline.
3. **v0.1 Public alpha** — public registry, MCP read-only server, 8-12 components with tiered evidence, first service pattern, foundation home + at least three contributing organizations.
4. **v0.2 Beta** — Vue/Svelte/Solid adapters, complex interactive components, USWDS migration tooling, Tailwind consumer package, third-party accessibility audit.
5. **v1.0 Stable** — durable governance, LTS posture, evidence-tiered stable component count (10-12 stable + LTS-aspiring rather than 25-30 single-tier).

See [docs/roadmap/00-roadmap.md](docs/roadmap/00-roadmap.md), [docs/roadmap/01-v0.0-foundation.md](docs/roadmap/01-v0.0-foundation.md), and [docs/roadmap/github-launch.md](docs/roadmap/github-launch.md).

## Start here

- [STATUS.md](STATUS.md) — live truth for what's implemented vs. planned
- [First-run docs app](apps/docs)
- [Product doctrine](docs/product-doctrine.md)
- [Strategy](docs/strategy.md)
- [Philosophy](docs/philosophy.md)
- [Replacement-grade audit](docs/roadmap/replacement-grade-audit.md)
- [Objective completion audit](docs/roadmap/objective-completion-audit.md)
- [External review plan](docs/roadmap/external-review-plan.md)
- [Architecture overview](docs/architecture/overview.md)
- [Toolchain decision](docs/architecture/toolchain.md)
- [Release governance](docs/architecture/release-governance.md)
- [Compliance, security, and CI tooling](docs/architecture/compliance-security-ci.md)
- [Final research pass](docs/research/07-final-research-2026-04-29.md)
- [Gap analysis](docs/research/08-gap-analysis-2026-04-29.md)
- [Governance model](docs/governance/00-governance-model.md)
- [v0.0 Foundation roadmap](docs/roadmap/01-v0.0-foundation.md)
- [v0.0 Standards and Evidence Slice spec](docs/superpowers/specs/2026-04-29-v0-0-standards-evidence-slice-spec.md)
- [v0.0 Validator Wedge spec](docs/superpowers/specs/2026-04-29-v0-0-validator-wedge-spec.md)

## License

Apache-2.0. The explicit patent grant is useful for federal procurement and regulated-industry adoption.
