# Hands-On Testing Guide

This guide is the repeatable manual test path for Ashlar's docs, examples, CLI
surface, and current replacement-readiness posture. It is for maintainers,
reviewers, and early design partners who need to test the product without
relying on a chat transcript.

Ashlar is still prototype-stage. Passing this guide does not create stable
accessibility evidence, public npm provenance, public Sigstore trust, or a
completed external review record.

## Prerequisites

- Node `24.15.0` or newer.
- pnpm `10.33.2`.
- Chromium installed through Playwright when running visual smoke checks.

From the repo root:

```bash
source ~/.nvm/nvm.sh
nvm use 24.15.0
pnpm install --frozen-lockfile
```

## Maintainer Health Check

Run this before opening or merging a PR:

```bash
pnpm public-language:check
pnpm format:check
pnpm check
pnpm build
pnpm examples:visual
pnpm release:smoke
node packages/cli/dist/index.js release readiness --registry ./registry
```

The final readiness command is expected to fail until the strict proof gates are
complete. The failure should stay limited to:

- `stable-markup-evidence`
- `external-review-proof`
- `npm-provenance-public`
- `sigstore-public-trust`

Any other readiness failure is a regression.

## Start The Test Session

To launch everything for hands-on review:

```bash
pnpm testing:start
```

To verify that every target boots, write the URL report, run visual smoke, and
then stop any servers started by the script:

```bash
pnpm testing:start --check --visual
```

The script writes:

- `reports/testing-session/summary.md`
- `reports/testing-session/summary.json`
- `reports/testing-session/checklist.md`
- `reports/testing-session/logs/`
- `reports/example-visual-smoke/summary.json`
- `reports/example-visual-smoke/*.png`

## Local URLs

When the session is running, test these surfaces:

| Target | URL |
| --- | --- |
| Public site | `http://127.0.0.1:4174/` |
| Docs | `http://127.0.0.1:4175/` |
| Vite theme workbench | `http://127.0.0.1:4173/` |
| Vanilla TypeScript case board | `http://127.0.0.1:4180/` |
| React SPA case board | `http://127.0.0.1:4181/` |
| Next.js App Router case board | `http://127.0.0.1:4182/` |
| Svelte case board | `http://127.0.0.1:4183/` |
| Vue case board | `http://127.0.0.1:4184/` |

## Visual Review

Use desktop and mobile viewports. Compare the generated screenshots in
`reports/example-visual-smoke/` before filing visual defects.

Check:

- The government banner uses a real inline SVG U.S. flag, not a CSS-painted
  placeholder block.
- The banner disclosure text, trigger, and focus ring remain legible in every
  theme.
- Agency selection uses a centered dialog with agency marks and provenance
  badges, not a corner control box.
- Theme labels are `Default`, `VA`, and `USDA`; there is no user-facing
  `Federal` theme option.
- Default, VA, and USDA themes work in light, dark, and system modes.
- Form fields, selects, radios, checkboxes, alerts, and buttons remain readable
  in each agency and color mode.
- Board columns read as workflow lanes; individual cases may be cards, but cards
  are not nested inside cards.
- Mobile views have no horizontal scrolling, clipped labels, or overlapping
  controls.
- Buttons and compact controls keep stable dimensions through hover, focus,
  selection, and theme changes.

## Interaction Review

For each case-board example:

1. Tab through the banner disclosure, agency trigger, theme controls, filters,
   board actions, and case actions.
2. Press Enter and Space on each button-like control.
3. Open the agency dialog, select each agency, and confirm the dialog closes.
4. Reopen the agency dialog and press Escape; focus should return to the agency
   trigger.
5. Change filters and view controls; the layout should not jump.
6. Repeat at mobile width.

## CLI Review

Run these from the repo root after `pnpm build`:

```bash
node packages/cli/dist/index.js --help
node packages/cli/dist/index.js status --registry ./registry
node packages/cli/dist/index.js search "official website" --registry ./registry
node packages/cli/dist/index.js suggest "Build a benefits application form"
node packages/cli/dist/index.js add button --registry ./registry --dry-run --view --diff
node packages/cli/dist/index.js release proof-plan --registry ./registry
```

The root help should show the ASCII Ashlar mark, shadcn-style command flow, and
BLEN attribution. JSON commands must not print branding text.

## Defect Report Template

For every issue, capture:

- target URL and viewport size;
- browser and OS;
- selected agency and color mode;
- expected behavior;
- actual behavior;
- screenshot or recording path;
- whether `pnpm examples:visual` catches it;
- whether the issue affects one framework example or all examples.

## What This Does Not Prove

This guide proves local build, DX, visual smoke, and tester ergonomics. It does
not satisfy the strict replacement-readiness gates. Those still require:

- a real stable-evidence markup primitive packet;
- completed external review records under `docs/reviews/`;
- a real npm trusted-publishing release and provenance verification;
- public Sigstore capsule trust material.
