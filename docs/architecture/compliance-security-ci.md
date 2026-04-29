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
- Manual screen-reader notes for NVDA, VoiceOver, and JAWS or TalkBack depending on component type.
- Forced-colors and high-contrast validation.
- Reduced-motion validation where motion exists.
- Known limitations.
- Anti-pattern mappings that explain which errors `ashlar audit` can prevent.

Evidence should be queryable:

```bash
npx ashlar evidence dialog
npx ashlar evidence --format json dialog
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
npx ashlar bundle --budget
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

Fails CI when a capsule claims `stable` without complete evidence:

- WCAG map complete for component category;
- automated tests recorded;
- manual tests recorded;
- known limitations present or explicitly empty;
- last review date within required freshness window.

### `ashlar bundle --budget`

Fails CI when component bundles exceed declared budgets:

- L0-only five-component page: target under 10KB gzipped.
- One L1 component added: target under 15KB gzipped.
- Per-component budgets stored in capsule manifest.

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
      - run: npx ashlar audit --severity error --sarif > ashlar.sarif
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
- SBOM generation.
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

- `audit`, `verify`, `theme validate`, and `evidence --check` work in CI.
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
