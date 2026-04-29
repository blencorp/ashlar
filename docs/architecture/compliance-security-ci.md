# Compliance, Security, and CI Tooling

Atrium must help agencies prove that their interfaces are accessible, secure, updateable, and aligned with federal website expectations. This document defines the tool surface needed to make that real.

## Principle

Compliance cannot live only in documentation. Atrium should make the correct path executable:

- component evidence is machine-readable;
- misuse is detectable in CI;
- themes are validated before release;
- source provenance is verifiable;
- AI-generated code is auditable;
- accessibility-critical updates are visible and intentional.

## Accessibility scope

Atrium targets **WCAG 2.2 AA engineering quality** for stable components. Evidence maps back to:

- Section 508 / WCAG 2.0 A and AA;
- ADA Title II / WCAG 2.1 AA for state and local government contexts;
- WCAG 2.2 AA for future-facing best practice.

Atrium must not claim that a component makes an application compliant. Required docs language:

> Atrium components are designed and tested to support accessible implementation. Accessibility conformance for the final service depends on correct use, content, configuration, and integration.

## Evidence artifacts

Each stable capsule must ship:

- `*.evidence.json` with WCAG criterion mappings.
- Automated axe results.
- Keyboard interaction transcripts.
- Manual screen-reader notes for NVDA, VoiceOver, and JAWS or TalkBack depending on component type.
- Forced-colors and high-contrast validation.
- Reduced-motion validation where motion exists.
- Known limitations.
- Anti-pattern mappings that explain which errors `atrium audit` can prevent.

Evidence should be queryable:

```bash
npx atrium evidence dialog
npx atrium evidence --format json dialog
npx atrium evidence --report ./reports/atrium-a11y.md
```

## CI commands

The first CI surface should include:

```bash
npx atrium audit --severity error
npx atrium audit --sarif > atrium.sarif
npx atrium verify
npx atrium theme validate
npx atrium evidence --check
npx atrium bundle --budget
```

### `atrium audit`

Checks component usage and federal web rules across supported file types.

Required v0 rule packs:

- `atrium/components`: component misuse from CEM anti-patterns.
- `atrium/accessibility`: labels, names, headings, focus, landmarks, forms.
- `atrium/federal-website-standards`: banner, page title, meta description, identifier hooks, contact page hooks.
- `atrium/tokens`: hard-coded colors, invalid token references, unsafe overrides.
- `atrium/security`: unsafe HTML injection in component slots, external script patterns, dangerous inline event handlers where applicable.

### `atrium verify`

Checks installed files against `atrium-lock.json` and signature data:

- capsule hash matches;
- file hash matches or local drift is reported;
- signature verifies against trusted registry;
- lockfile is internally consistent;
- registry trust root has not silently changed.

### `atrium theme validate`

Checks:

- required semantic tokens exist;
- token aliases resolve;
- colors parse;
- critical contrast pairs pass;
- forced-colors fallbacks exist;
- dark mode is complete if declared;
- touch target and density tokens do not violate minimum sizing;
- agency theme metadata exists.

### `atrium evidence --check`

Fails CI when a capsule claims `stable` without complete evidence:

- WCAG map complete for component category;
- automated tests recorded;
- manual tests recorded;
- known limitations present or explicitly empty;
- last review date within required freshness window.

### `atrium bundle --budget`

Fails CI when component bundles exceed declared budgets:

- L0-only five-component page: target under 10KB gzipped.
- One L1 component added: target under 15KB gzipped.
- Per-component budgets stored in capsule manifest.

## SARIF output

`atrium audit --sarif` is required for public alpha. SARIF allows findings to appear in GitHub code scanning and other security dashboards.

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
name: Atrium

on:
  pull_request:
  push:
    branches: [main]

jobs:
  atrium:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
      - run: npm ci
      - run: npx atrium verify
      - run: npx atrium theme validate
      - run: npx atrium evidence --check
      - run: npx atrium audit --severity error --sarif > atrium.sarif
      - uses: github/codeql-action/upload-sarif@v3
        if: always()
        with:
          sarif_file: atrium.sarif
```

## Security model

Threats Atrium must explicitly address:

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
- Explicit trust roots in `atrium.config.json`.
- Read-only MCP by default.
- User confirmation for install/update/migration through MCP.
- Accessibility-critical file confirmation during update.
- `atrium verify` before release.

## VPAT / ACR support

Atrium should not generate a final VPAT for a consuming application. It can generate component-level evidence packages that help an agency or vendor prepare an Accessibility Conformance Report.

Future command:

```bash
npx atrium evidence --acr-input --components button,dialog,form-field
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
