# Accessibility

Accessibility in Atrium is **structured evidence**, not a marketing claim. Every stable component ships an evidence packet — machine-readable WCAG mapping, automated test results, manual screen-reader notes, and known limitations — that auditors, AI tools, and consumers can query.

This document specifies the engineering target, the evidence packet schema, the test matrix, and the stable-component gates.

## Engineering target

**WCAG 2.2 AA** where practical.

Legal baselines are documented separately:

- **Section 508** (federal procurement and federal agencies) — incorporates **WCAG 2.0 AA** by reference.
- **ADA Title II** (state and local government, public-facing web/mobile) — references **WCAG 2.1 AA**.
- **European Accessibility Act** (private sector serving EU consumers, enforced June 2025) — references **WCAG 2.1 AA** via EN 301 549.

Targeting 2.2 future-proofs the system without overpromising compliance for any single regime. Compliance language in docs explicitly disclaims that component-level support guarantees application-level compliance.

## Compliance language

Required language in component docs:

> Atrium components are designed and tested to support accessible implementation. Accessibility conformance for the final service depends on correct use, content, configuration, and integration.

Forbidden language:

> This component makes your application 508 compliant.
> Atrium guarantees WCAG 2.2 AA compliance.

## Evidence packet schema

Every stable component ships `*.evidence.json`:

```json
{
  "$schema": "https://atrium.dev/schemas/evidence.schema.json",
  "component": "dialog",
  "version": "1.0.0",
  "stability": "stable",
  "lastReviewed": "2026-04-24",
  "reviewer": "blen-a11y-team",

  "wcag": [
    {
      "criterion": "1.4.3",
      "level": "AA",
      "title": "Contrast (Minimum)",
      "status": "pass",
      "evidence": "tests/contrast.spec.ts",
      "notes": "All text/background pairs meet 4.5:1 against default theme; agency themes validated by `atrium theme validate`."
    },
    {
      "criterion": "2.1.1",
      "level": "A",
      "title": "Keyboard",
      "status": "pass",
      "evidence": "tests/keyboard.spec.ts"
    },
    {
      "criterion": "2.4.3",
      "level": "A",
      "title": "Focus Order",
      "status": "pass",
      "evidence": "tests/focus-order.spec.ts"
    },
    {
      "criterion": "4.1.2",
      "level": "A",
      "title": "Name, Role, Value",
      "status": "pass",
      "evidence": "tests/aria.spec.ts manual-screen-reader.md"
    }
  ],

  "manualTests": [
    {
      "tech": "NVDA",
      "version": "2025.4",
      "browser": "Firefox",
      "browserVersion": "145",
      "os": "Windows 11",
      "date": "2026-04-24",
      "tester": "ke@blencorp.com",
      "result": "pass",
      "notes": "All states announced correctly; modal title read on open; close button labeled."
    },
    {
      "tech": "VoiceOver",
      "browser": "Safari",
      "browserVersion": "26",
      "os": "macOS 26",
      "date": "2026-04-24",
      "tester": "ke@blencorp.com",
      "result": "pass-with-note",
      "notes": "iOS VoiceOver requires double-tap to dismiss when popover is anchored to scrolling parent; documented limitation."
    },
    {
      "tech": "JAWS",
      "version": "2025",
      "browser": "Chrome",
      "browserVersion": "138",
      "os": "Windows 11",
      "date": "2026-04-23",
      "tester": "ke@blencorp.com",
      "result": "pass"
    }
  ],

  "automatedResults": {
    "axe": {
      "violations": 0,
      "passes": 12,
      "lastRun": "2026-04-26",
      "axeVersion": "4.11.0"
    },
    "playwright": {
      "tests": 18,
      "passing": 18,
      "lastRun": "2026-04-26"
    }
  },

  "knownLimitations": [
    {
      "id": "ios-voiceover-anchored-popover",
      "description": "On iOS VoiceOver, popovers anchored to a scrolling parent may require double-tap to dismiss.",
      "impact": "minor",
      "workaround": "Use sticky-positioned trigger or document this behavior in pattern docs.",
      "wcag": null,
      "trackingIssue": "https://github.com/atrium/atrium/issues/142"
    }
  ],

  "antiPatternMappings": [
    { "antiPatternId": "icon-only-needs-label", "preventsViolation": "4.1.2" },
    { "antiPatternId": "remove-focus-outline", "preventsViolation": "2.4.7" }
  ]
}
```

## Automated test matrix

Required for every component (proposal/experimental status onwards):

- TypeScript typecheck.
- Unit tests (Vitest or equivalent).
- Testing Library / playwright a11y assertions.
- axe-core integration.
- Playwright keyboard tests.
- Playwright focus snapshots (visual regression).
- Token contrast validation (`atrium theme validate` against defaults).
- Forced-colors render checks.
- Reduced-motion render checks where animation is used.

## Manual test matrix

Required for **stable** components:

- **Screen readers**: NVDA + Firefox, VoiceOver + Safari, JAWS + Chrome (where available).
- **Keyboard only**: full operation without mouse.
- **Windows High Contrast / forced colors**: visible affordances retained.
- **Zoom**: 200% and 400% browser zoom, 320 CSS px viewport.
- **Mobile screen reader spot checks**: TalkBack on Android, VoiceOver on iOS.

Manual test scripts are templated (one-page checklists per component) so they are repeatable without prohibitive labor cost.

## Component-specific requirements

### Button

- Keyboard activatable with Enter and Space.
- Visible focus indicator (`:focus-visible`).
- Icon-only buttons require accessible name.
- Loading state preserves accessible name; uses `aria-busy="true"`.

### Dialog

- Focus moves to dialog or first meaningful focusable on open.
- Background content `inert` while modal is open.
- Escape closes (unless flow requires explicit confirmation).
- Dialog has accessible title (visible or `aria-labelledby`).
- Focus returns to trigger on close.

### Date Picker

- Native input fallback (`<input type="date">`) where appropriate.
- Keyboard navigation across calendar grid.
- Format communicated (label, helper text, or `aria-describedby`).
- Localization-aware.
- Invalid dates handled clearly.

### ComboBox

- Correct combobox role and ARIA states.
- Keyboard navigation across options.
- Filtering preserves screen-reader context.
- Empty state announced.

### Toast

- `aria-live` region for polite/assertive announcement.
- Action elements within toast are tab-accessible.
- Auto-dismiss timing respects `prefers-reduced-motion` and accessibility timing requirements (WCAG 2.2.1).

### AI Assistant Panel (when implemented)

- AI-generated content clearly identified.
- Citation/source area always present when configured.
- Review-before-submit interaction for consequential actions.
- Transcript semantics preserved for screen readers.
- Streaming-response accessibility (live region updates).
- No dark patterns.

## Accessibility-critical files

Files within a capsule that affect accessibility behavior are tagged `critical_for_a11y: true` in the capsule manifest. The drift management protocol forces user confirmation on any update that touches these files (see `[drift-and-updates.md](./drift-and-updates.md)`).

## Stable-component gates

A component cannot be marked `stable` without:

1. Complete `*.evidence.json` with all required WCAG criteria addressed.
2. At least three manual screen-reader tests recorded (NVDA, VoiceOver, one of JAWS/TalkBack).
3. Automated axe results showing zero violations.
4. Playwright keyboard tests passing.
5. Forced-colors render check passing.
6. Token contrast validation against the default theme.
7. CEM `_atrium.antiPatterns` populated for known misuse vectors.
8. ast-grep rules generated and tested.
9. Documentation includes "do not" examples and known limitations.

`atrium audit registry` checks all of the above before a component graduates to stable.

## Accessibility status labels

Every component declares its current accessibility status in the evidence packet:

- `not-reviewed` — no evidence, not for production.
- `automated-tested` — passes automated checks, no manual evidence.
- `manual-tested` — has manual test records but evidence packet incomplete.
- `stable-evidence` — full evidence packet, suitable for stable graduation.
- `known-issue` — has open WCAG-impacting issue; avoid for affected use cases.

The status is visible in the registry, in component docs, and queryable via `atrium evidence <component>`.

## References

- [ADR 0005 — Accessibility target](../adr/adr-0005-accessibility-target.md)
- [Capsule format](./capsule.md)
- [Drift and updates](./drift-and-updates.md)
- WCAG 2.2: [https://www.w3.org/TR/WCAG22/](https://www.w3.org/TR/WCAG22/)
- ARIA 1.3: [https://www.w3.org/TR/wai-aria-1.3/](https://www.w3.org/TR/wai-aria-1.3/)
- AccName 1.2: [https://www.w3.org/TR/accname-1.2/](https://www.w3.org/TR/accname-1.2/)
- Section 508: [https://www.section508.gov/manage/laws-and-policies/](https://www.section508.gov/manage/laws-and-policies/)
- ADA Title II rule: [https://www.ada.gov/resources/2024-03-08-web-rule/](https://www.ada.gov/resources/2024-03-08-web-rule/)
- EAA WCAG 2.2 alignment: [https://www.wcag.com/compliance/european-accessibility-act/](https://www.wcag.com/compliance/european-accessibility-act/)

