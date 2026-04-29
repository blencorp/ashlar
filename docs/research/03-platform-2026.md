# 03 — The 2026 web platform

Synthesized from primary-source research conducted April 2026. The full source list is in [`source-map.md`](./source-map.md).

This document records what the modern web platform delivers in 2026 and what JavaScript a design system can therefore stop shipping. It is the empirical foundation for Ashlar's L0 (platform-driven foundation) layer.

## Headline finding

In 2026, native CSS and HTML primitives can deliver approximately **70–80% of typical design-system components with zero or trivial JavaScript**. The remaining 20–30% — components that are inherently stateful, data-driven, or require complex coordination — still warrant custom JavaScript, ideally encapsulated in Web Components.

This is a structural change versus 2022. A design system architected in 2022 had to ship JavaScript for tooltips, modals, popovers, tab panels, accordions, theme switching, focus traps, anchor positioning, and form-state styling. In 2026, the platform delivers all of these declaratively.

## CSS as runtime

| Feature | Baseline status (Apr 2026) | What it enables |
|---|---|---|
| `@layer` cascade layers | Widely available since 2022 | Predictable specificity; no `!important` wars; consumers override safely. |
| `@container` (size + style queries) | Widely available since 2024 | Truly responsive components without resize observers or per-breakpoint props. |
| `:has()` selector | Widely available 2024 (Firefox 121+) | Form-state styling (`form:has(:invalid)`), parent-from-child, variant selection by content — replaces dozens of state-class JS toggles. |
| Anchor Positioning (`anchor-name`, `position-anchor`, `position-area`, `@position-try`) | **Baseline Newly Available January 2026** (~76% global) | Replaces Floating UI / Popper for tooltips, menus, popovers in evergreen browsers. Tiny polyfill (Oddbird) for older Safari. |
| Popover API (`popover`, `popovertarget`) | Baseline Newly Available January 2025 | Light dismiss, top-layer rendering, focus management, ESC handling — all platform-provided. Pairs natively with anchor positioning. |
| `<dialog>` element + `showModal()` | Baseline Widely Available 2024 | Modal stack, backdrop, sibling `inert`, ESC handling, focus return, `method="dialog"` form submission. Replaces all custom modal libraries. |
| View Transitions API (same-document) | Baseline Newly Available October 2025 | Route and state animations, list reorder, modal entry — without animation libraries. Cross-document VT is in Chrome and Safari; Firefox catching up in 2026. |
| `@property` | Baseline Widely Available 2024 | Animatable gradients, typed CSS variables, theme transitions — no `requestAnimationFrame`. |
| Color L4/5: `oklch()`, `color-mix()`, `light-dark()`, relative color syntax | Baseline 2024–2025 | Single token set generates entire palette plus dark mode in pure CSS. Use `oklch()` for perceptually uniform palettes. |
| `@scope` | **Baseline Newly Available December 2025** (Firefox 146) | Component-local styles without Shadow DOM or build tooling. |
| `color-scheme` + `prefers-color-scheme` | Universal | Dark mode without JavaScript. |
| `forced-colors` + System Colors (`Canvas`, `CanvasText`, `LinkText`) | Universal | Windows High Contrast, kiosks, accessibility tools — required for Section 508 and EN 301 549. |
| `prefers-reduced-motion`, `prefers-reduced-transparency`, `prefers-contrast` | Universal | Accessible animation and effect defaults without preference-detection JS. |
| Subgrid, Grid Level 3 (masonry shipping in Chrome/Safari) | Subgrid widely available | Aligned forms, card grids — eliminates most utility-class spacing hacks. |
| `accent-color` (universal); `field-sizing: content` (Chrome/Safari); `interpolate-size` (Chrome/Edge) | Mixed | Theme native checkboxes/radios, auto-grow textareas, animate to `height: auto`. Use as progressive enhancement. |
| CSS Nesting | Baseline Widely Available 2024 | Removes Sass dependency for authoring ergonomics. |

## HTML primitives that replace JavaScript

- **`<details>` / `<summary>`** — Replaces accordion JavaScript. The `name=""` attribute (Baseline 2024) provides exclusive accordions. Animating open/close needs `interpolate-size` or `::details-content` (Chrome 131+); chevron rotation hooks via `[open]`.
- **`<dialog>`** — Modal stack with sibling `inert`, focus return, ESC handling, `method="dialog"` form submission.
- **Native form validation** — `required`, `pattern`, `:user-invalid` (Baseline 2023 — finally fixes "invalid before typing"), `:user-valid`, `ValidityState`, `setCustomValidity`. Falls short on cross-field validation, async/server validation, custom error UI placement, error summary, and i18n of native messages. Government forms still need a thin error-summary component.
- **Native input types** — `type="date"`, `time`, `color`, `file`, `search` are accessible and reliable but visually unstyleable (the `::picker()` proposal is not yet Baseline). Override only when brand demands it; otherwise accept platform UI for accessibility wins.
- **`autocomplete=` attribute set** — Critical for government: `cc-name`, `cc-number`, `bday`, `postal-code`, `street-address`, `address-line1/2`, `country`, `tel`, `email`, `username`, `new-password`, `one-time-code` (SMS autofill). Section tokens (`section-shipping`) for multi-address forms.
- **`<datalist>`** — Combobox without JavaScript in narrow cases (free-typed suggestions). Real limitations: no rich content rendering, no async loading, inconsistent keyboard semantics, poor screen-reader support on iOS/Android. Use only for trivial suggestion; otherwise build a real combobox.
- **`inert` attribute** — Universal since 2023. Replaces focus-trap libraries for modals and off-canvas menus.
- **`<search>` landmark** — Baseline 2024. Joins `<dialog>` and `<details>` as additions since HTML5; `role="search"` is no longer needed.

## Accessibility platform features

- **ARIA 1.3** — Adds `aria-actions`, `aria-braillelabel`, improved description model. Mostly incremental.
- **AccName 1.2** — Clarifies accessible-name computation. Safer to rely on `aria-labelledby` chains.
- **`role="presentation"` vs `role="none"`** — Equivalent. Prefer `role="none"` (clearer intent).
- **Screen reader consistency 2024–2026** — Reliable across NVDA, JAWS, VoiceOver, TalkBack: `<dialog>`, `<details>`, native form controls, landmarks, `aria-live="polite"`, `aria-expanded`, `aria-current`. Still inconsistent: complex `aria-activedescendant` comboboxes, `treegrid`, long `aria-describedby` chains, VoiceOver+iOS popover dismissal patterns.
- **European Accessibility Act (June 28, 2025 enforcement)** — Applies to private-sector e-commerce, banking, transport, e-books, ICT serving EU consumers. Requires WCAG 2.1 AA via EN 301 549 (2.2 AA expected). Does not bind a US gov DS directly; relevant if any consumer-facing EU exposure.

## Future-device readiness

- **AI / voice agent UI consumption** — Use semantic HTML, ARIA landmarks, `schema.org` JSON-LD, `aria-live` for dynamic regions, stable IDs, microdata for forms. LLM crawlers parse semantic HTML far better than div soup; this is the single biggest "AI readiness" lever beyond manifests.
- **`prefers-reduced-data`** — Still experimental (Chrome only, behind flag). Use the `Save-Data` HTTP header server-side instead.
- **WebXR** — Not relevant for a government DS in 2026; ensure `viewport-fit`, large hit targets, `vh`/`dvh` units instead.
- **PWA / share targets / file handlers** — Manifest entries; useful for forms-as-app and document upload flows.

## What JavaScript still legitimately needs

After exploiting all of the above, custom JavaScript (and therefore Web Components in our architecture) remains necessary for:

- **Combobox / autocomplete (rich)** — async data, custom rendering, `aria-activedescendant`. `<datalist>` only covers trivial cases.
- **Date picker (range, restricted dates, fiscal calendars)** — `<input type="date">` is fine for single dates; range and restrictions need JavaScript.
- **Data table** — sort, filter, virtualize, column resize, row select, sticky headers across browsers. No platform primitive.
- **File upload** — chunked, resumable, progress, drag-drop with previews. `<input type="file">` does not cover.
- **Toast / notification stack** — Popover handles one; queueing and timing need JavaScript.
- **Tooltip on hover** — Anchor positioning handles placement; intent and timing logic need JavaScript.
- **Tree, treegrid, complex menu (typeahead)** — ARIA patterns demand JavaScript.
- **Multi-select, tag input, rich text editor, charts, map, signature pad, multi-step wizard with cross-step validation orchestration**.
- **Cross-field and async form validation** with accessible error summary.
- **Internationalization of formats** (`Intl.*`), client-side routing for SPAs, copy-to-clipboard fallback, drag-and-drop reorder with keyboard support.

## Architectural implication

The 70/30 split is the empirical foundation for Ashlar's two-layer separation:

- **L0** is built on the platform primitives above. It targets the ~70% of components that need zero or trivial JavaScript. These work in any rendering environment, framework or not.
- **L1** is reserved for the ~30% above. These ship as Web Components wrapping Zag statecharts, with framework adapters generated from CEM.

This split keeps the bundle small, the maintenance surface small, and the cross-stack reach maximal. It also means a federal Drupal site can adopt 70% of Ashlar without taking on any JavaScript runtime at all.

## Sources

- Can I Use — feature support data: https://caniuse.com
- web.dev — Baseline announcements: https://web.dev/blog
- OddBird — anchor positioning state, October 2025: https://www.oddbird.net/2025/10/13/anchor-position-area-update/
- Frontend Masters — `@scope` Baseline: https://frontendmasters.com/blog/how-to-scope-css-now-that-its-baseline/
- Level Access — European Accessibility Act compliance: https://www.levelaccess.com/compliance-overview/european-accessibility-act-eaa/
- WCAG.com — EAA WCAG 2.2 alignment: https://www.wcag.com/compliance/european-accessibility-act/
- ARIA 1.3 specification: https://www.w3.org/TR/wai-aria-1.3/
- AccName 1.2 specification: https://www.w3.org/TR/accname-1.2/
