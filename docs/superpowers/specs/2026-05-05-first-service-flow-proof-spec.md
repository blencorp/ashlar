# First Service Flow Proof Spec

Status: Implemented in working tree; ready for review
Date: 2026-05-05
Related doctrine: `docs/product-doctrine.md`

## Purpose

This spec turns Ashlar's product doctrine into the first proof that can make the project feel real.

The goal is not to ship a broad component library. The goal is to prove that Ashlar can do something USWDS and shadcn-style registries do not do together: install a small public-service flow as source code, audit it against federal and component rules, show evidence before install, detect drift or tampering, and give AI coding agents a structured contract they can validate against.

If this proof is compelling, Ashlar has a credible wedge. If it feels like an ordinary component demo, the product direction needs another pass before the project scales component count.

## Product Bar

This proof must satisfy six constraints:

- **Government-first**: the demo is a public-service flow with page-shell trust markers, not a generic dashboard or marketing page.
- **Validator-first**: `ashlar audit` produces useful findings before and after capsule install.
- **Capsule-first**: every UI primitive in scope ships as a capsule with files, CEM, evidence, policy mappings, and lockfile entries.
- **Evidence-backed**: `ashlar view` and `ashlar evidence` surface evidence status and limitations before install.
- **Source-owned**: installed files are readable, editable, and verified by lockfile hashes.
- **AI-validatable**: generated AGENTS.md names installed capsules and tells agents how to validate usage with `ashlar audit`.

Do not add visual novelty, framework adapters, or complex widgets until this bar is met.

## Current Baseline

Implemented before this proof started:

- `ashlar init`
- `ashlar add`
- `ashlar audit --policy federal`
- `ashlar audit --policy components`
- `ashlar audit --policy all`
- `ashlar verify` hash checks
- `ashlar evidence`
- `ashlar search`
- `ashlar view`
- `ashlar design sync`
- Button as the only capsule at proof start
- federal-compliant `examples/plain-html`
- Vite theme workbench

Important baseline gaps this proof targeted:

- At proof start, only Button existed as a capsule.
- Button evidence is `not-reviewed`.
- `verify` validates hashes only, not signatures.
- `update` does not exist.
- AGENTS.md is static and does not enumerate installed capsules.
- No public-service flow installs as a coherent unit.
- No tamper fixture proves `verify` behavior end to end.

## Scope

### In Scope

1. Add the minimum capsules needed for a simple service-flow page:
   - Button
   - Banner
   - Alert
   - Form Field
   - Text Input
   - Error Summary
2. Add a `benefit-application` pattern fixture that composes the capsules into a small public-service flow.
3. Add evidence packets for each new capsule with honest `not-reviewed` or `automated-tested` status.
4. Add CEM `_ashlar.antiPatterns` for the highest-value misuse cases:
   - icon-only Button without accessible name;
   - input without associated label;
   - error text not connected with `aria-describedby`;
   - alert without meaningful text;
   - summary links that do not point to field IDs.
5. Add `ashlar view` output coverage for the new capsules and the pattern.
6. Add `audit --policy all` coverage for the flow fixture and one intentionally failing fixture.
7. Add a `verify` tamper test that edits an installed capsule file and expects a warning or error.
8. Generate AGENTS.md from installed lockfile data during `init`, `add`, and a new shared sync helper.
9. Document the proof path in README or docs:
   - `init`
   - `search`
   - `view`
   - `add`
   - `audit`
   - `verify`
   - AI validation guidance

### Out of Scope

- Date Picker, Data Grid, ComboBox, File Upload, Stepper, or other complex interactive components.
- USWDS parity.
- React, Vue, Svelte, or Solid adapters.
- Public registry hosting.
- Sigstore signature validation.
- Full `ashlar update`.
- MCP server implementation.
- Manual screen-reader evidence for every capsule.
- Application-level Section 508 compliance claims.

## User Flow

The proof should support this exact path from a fresh app directory:

```bash
npx @blen/ashlar init
npx @blen/ashlar search form
npx @blen/ashlar view banner form-field text-input button alert error-summary
npx @blen/ashlar add banner form-field text-input button alert error-summary
npx @blen/ashlar audit --policy all index.html
npx @blen/ashlar verify
```

For the local repo before npm publishing, the equivalent path can use:

```bash
node /path/to/ashlar/packages/cli/dist/index.js ...
```

The command output must make the value visible without reading docs:

- `view` shows layer, stability, evidence status, platform features, policy mappings, files, and footprint where available.
- `add` lists installed files and writes lockfile entries.
- `audit --explain` shows the rule, rationale, source link, and location.
- `verify` says which files match, drifted, or are missing.

## Capsule Requirements

Every capsule in this proof must include:

- `<name>.css`
- `<name>.html`
- `<name>.cem.json`
- `<name>.evidence.json`

Optional per capsule:

- `<name>.docs.md`
- `<name>.codemods.yaml`
- `<name>.test.ts`

Each CEM must include:

- `_ashlar.selector`
- `_ashlar.rendering`
- `_ashlar.hydrationCost`
- `_ashlar.platformFeatures`
- `_ashlar.policyMappings`
- `_ashlar.tokensConsumed`
- `_ashlar.antiPatterns`
- `_ashlar.criticalForA11y` where applicable

Each evidence packet must include:

- `component`
- `version`
- `stability`
- `accessibilityStatus`
- `wcag`
- `baselineTests`
- `automatedResults`
- `manualTests`
- `knownLimitations`

Do not use empty evidence as proof. If evidence is planned, the packet must say planned or not-reviewed.

## Pattern Fixture

Create a fixture that models a realistic but small public-service task:

> Apply for a local benefit.

The fixture should include:

- Federal banner or accepted equivalent.
- Page title and meta description.
- Identifier with required trust links.
- One short intro paragraph in plain language.
- Two labeled text fields.
- One validation error state.
- Alert or status message.
- Error Summary that links to the errored field.
- Primary Button.

The successful fixture must pass `ashlar audit --policy all`.

The failing fixture must intentionally violate at least three rules:

- missing label;
- icon-only or textless button;
- error summary link target missing;
- missing meta description or too-short title.

The failing fixture must produce findings with line and column locations.

## AGENTS.md Sync

Generated AGENTS.md must be project-specific after capsules are installed.

It must include:

- Installed capsule names and versions.
- The registry path.
- The command to validate usage.
- A short rule: do not invent props or variants that are absent from CEM.
- A short rule: run `ashlar audit --policy all` after editing Ashlar markup.

Implementation should add one shared helper that both `init` and `add` can call. Do not duplicate AGENTS.md string construction in multiple commands.

## Tests

Required tests:

- Registry index validates every new capsule entry.
- Every new CEM validates against `ashlar-cem.schema.json`.
- Every new evidence packet validates against `evidence.schema.json`.
- `search` finds new capsules by name and description.
- `view` includes evidence status for each new capsule.
- `add` installs each new capsule and updates `ashlar-lock.json`.
- `audit --policy components` catches the new anti-patterns in fixture files.
- `audit --policy all` passes the successful service-flow fixture.
- `audit --policy all` fails the intentionally broken service-flow fixture with expected rule IDs.
- `verify` warns or errors after an installed file is modified.
- AGENTS.md updates after `add` and lists installed capsules.

## Documentation

Update docs after implementation:

- `STATUS.md`: move the service-flow proof to implemented or experimental with exact caveats.
- `README.md`: add the proof path if it works end to end.
- `docs/product-doctrine.md`: keep gates aligned with what is now real.
- `docs/roadmap/01-v0.0-foundation.md`: mark this proof as part of the v0.0 gate or a prerequisite to drift management if needed.

Do not update public claims until the tests above pass.

## Exit Criteria

This proof is complete when:

- A fresh local project can install the six capsules.
- The service-flow fixture passes `audit --policy all`.
- The broken fixture fails with expected findings.
- `view` and `evidence` make limitations clear.
- `verify` detects tampering.
- AGENTS.md reflects installed capsules.
- The proof is documented with no replacement or compliance overclaims.

If any exit criterion fails, the project should not add more components yet.
