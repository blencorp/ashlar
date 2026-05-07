# USWDS Coverage Matrix

Date: 2026-05-06

This matrix defines what "replace day-to-day USWDS usage" means for Ashlar. It is not a replacement claim. It is a gap map that separates current Ashlar capsules, audit/migration interop, planned replacement capsules, and intentionally deferred surface area.

Snapshot sources:

- [USWDS components](https://designsystem.digital.gov/components/overview/) currently lists 47 components.
- [USWDS patterns](https://designsystem.digital.gov/patterns/) currently lists three patterns: complete a complex form, select a language, and create a user profile.
- Current Ashlar registry capsules: `alert`, `banner`, `benefit-application`, `button`, `checkbox`, `date-input`, `error-summary`, `form-field`, `identifier`, `radio-group`, `select`, `text-input`, and `textarea`.

## Status Terms

| Status | Meaning |
| --- | --- |
| Covered capsule | Ashlar has a registry capsule that directly covers the primitive or pattern. Current evidence may still be `not-reviewed`. |
| Partial capsule | Ashlar covers part of the need, but not the full USWDS component or pattern contract. |
| Audit or migration support | Ashlar can inspect, validate, or map existing markup, but does not own a replacement capsule. |
| Planned capsule | Needed for credible day-to-day public-service work, but not implemented yet. |
| Deferred | Not required for the smallest credible public alpha, or behavior-heavy enough to wait for interactive components and framework adapters research. |
| Out of scope as capsule | Better handled through tokens, typography, docs, utility output, or consumer app structure than a source capsule. |

## Current Ashlar Capsule Metadata

Every current capsule has CEM metadata and capsule bundle-budget metadata. All current component evidence packets remain `not-reviewed`, so none of these capsules supports stable accessibility claims yet. Migration support below refers to explicit rules in `packages/cli/src/lib/uswds-migration.ts`, not general conceptual overlap.

| Ashlar capsule | Layer | Stability | Bundle budget cap | CEM / AI contract | USWDS migration support |
| --- | --- | --- | --- | --- | --- |
| `alert` | markup primitives | experimental | 1536 B CSS gzip / 0 B JS gzip | Yes | `usa-alert` |
| `banner` | markup primitives | experimental | 1536 B CSS gzip / 0 B JS gzip | Yes | `usa-banner`, `<usa-banner>` |
| `benefit-application` | service patterns | proposal | 2048 B CSS gzip / 0 B JS gzip | Yes | None; service-flow proof |
| `button` | markup primitives | experimental | 4096 B CSS gzip / 0 B JS gzip | Yes | `usa-button` |
| `checkbox` | markup primitives | experimental | 1536 B CSS gzip / 0 B JS gzip | Yes | `usa-checkbox` |
| `date-input` | markup primitives | experimental | 1536 B CSS gzip / 0 B JS gzip | Yes | `usa-date-picker` partial replacement |
| `error-summary` | markup primitives | experimental | 1536 B CSS gzip / 0 B JS gzip | Yes | `usa-error-message` with `form-field` |
| `form-field` | markup primitives | experimental | 1536 B CSS gzip / 0 B JS gzip | Yes | `usa-form-group`, `usa-error-message` |
| `identifier` | markup primitives | experimental | 1536 B CSS gzip / 0 B JS gzip | Yes | `usa-identifier` |
| `radio-group` | markup primitives | experimental | 1536 B CSS gzip / 0 B JS gzip | Yes | `usa-radio` |
| `select` | markup primitives | experimental | 1536 B CSS gzip / 0 B JS gzip | Yes | `usa-select` |
| `text-input` | markup primitives | experimental | 1536 B CSS gzip / 0 B JS gzip | Yes | `usa-input` |
| `textarea` | markup primitives | experimental | 1536 B CSS gzip / 0 B JS gzip | Yes | `usa-textarea` |

## Component Matrix

| USWDS surface | Ashlar status | Current Ashlar artifact | Layer / evidence | v0.1 action |
| --- | --- | --- | --- | --- |
| Accordion | Deferred | None | interactive components and framework adapters behavior missing | Defer until behavior substrate review. |
| Alert | Covered capsule | `registry/components/alert` | markup primitives, experimental, not-reviewed | Keep; add stable evidence after Button path proves workflow. |
| Banner | Covered capsule | `registry/components/banner` | markup primitives, experimental, not-reviewed | Keep; treat as site-trust primitive. |
| Breadcrumb | Planned capsule | None | Missing | Add if docs/public-service navigation flows require it. |
| Button | Covered capsule | `registry/components/button` | markup primitives, experimental, not-reviewed | First stable-evidence target. |
| Button group | Planned capsule | None | Missing | Add after Button evidence, likely composition-only. |
| Card | Planned capsule | None | Missing | Add only if service-flow or docs-site content needs it. |
| Character count | Planned capsule | None | Missing | Important for long-answer forms; needs validation semantics. |
| Checkbox | Covered capsule | `registry/components/checkbox` | markup primitives, experimental, not-reviewed | Keep; graduate after Button evidence workflow is reusable. |
| Collection | Deferred | None | Missing | Defer until content/listing patterns are prioritized. |
| Combo box | Deferred | None | interactive behavior missing | Defer until statechart/interactive component substrate is proven. |
| Data visualizations | Deferred | None | Missing | Not v0.1; requires separate charting and accessibility model. |
| Date picker | Deferred | `date-input` covers simple native date entry only | partial markup primitive, experimental, not-reviewed | Keep simple date input; defer picker behavior. |
| Date range picker | Deferred | None | interactive behavior missing | Defer until date picker strategy exists. |
| File input | Planned capsule | None | Missing | Add for real benefit/application flows. |
| Footer | Planned capsule | `identifier` covers required agency identity links | partial markup primitive, experimental, not-reviewed | Decide whether Footer is separate from Identifier. |
| Form | Partial capsule | `form-field`, `error-summary`, form controls | markup primitives, experimental, not-reviewed | Define form composition guidance and evidence expectations. |
| Grid | Out of scope as capsule | Token/CSS layout output | Not a capsule | Cover through docs, CSS variables, and examples. |
| Header | Planned capsule | None | Missing | Needed for realistic public-service page shell. |
| Icon | Deferred | None | Missing | Defer; prefer text-first UI and explicit icon policy. |
| Icon list | Deferred | None | Missing | Defer until content patterns need it. |
| Identifier | Covered capsule | `registry/components/identifier` | markup primitives, experimental, not-reviewed | Keep; tie to federal policy checks. |
| In-page navigation | Planned capsule | None | Missing | Useful for long forms and docs pages. |
| Input mask | Deferred | None | Behavior and validation complexity missing | Defer; prefer server/client validation clarity first. |
| Input prefix/suffix | Planned capsule | `form-field` may host this, but no explicit primitive | partial markup primitive | Add as form-field variant only if CEM can express it cleanly. |
| Language selector | Planned capsule | None | Missing | Needed for multilingual service flows, but after first English-only flow. |
| Link | Out of scope as capsule | Native anchor plus audit rules | Not a capsule | Cover with guidance and validator checks. |
| List | Out of scope as capsule | Native HTML lists plus prose styles | Not a capsule | Cover through typography/prose guidance. |
| Memorable date | Partial capsule | `registry/components/date-input` | markup primitives, experimental, not-reviewed | Decide whether memorable date is a separate composition. |
| Modal | Deferred | None | interactive behavior missing | Defer until state, focus trap, inert, and escape handling are proven. |
| Pagination | Planned capsule | None | Missing | Add when listing/search flows are prioritized. |
| Process list | Planned capsule | None | Missing | High value for service instructions; candidate v0.1 capsule. |
| Prose | Out of scope as capsule | Typography/token docs | Not a capsule | Cover through docs and generated CSS. |
| Radio buttons | Covered capsule | `registry/components/radio-group` | markup primitives, experimental, not-reviewed | Keep; evidence after Button/Checkbox path. |
| Range slider | Deferred | None | Behavior/accessibility complexity missing | Defer; use number input/select where possible. |
| Search | Planned capsule | None | Missing | Needed for docs, benefits, and service lookup flows. |
| Select | Covered capsule | `registry/components/select` | markup primitives, experimental, not-reviewed | Keep for bounded option sets. |
| Side navigation | Planned capsule | None | Missing | Needed for docs and large service sites, not first form flow. |
| Site alert | Planned capsule | `alert` covers page-level messages only | partial markup primitive | Decide whether sitewide alert is an Alert variant or separate capsule. |
| Step indicator | Planned capsule | None | Missing | High value for multi-step service flows; candidate v0.1 capsule. |
| Summary box | Planned capsule | None | Missing | High value for next steps and eligibility results. |
| Table | Planned capsule | None | Missing | Needed for status tracking, document lists, and benefits comparisons. |
| Tag | Planned capsule | None | Missing | Useful but low-risk; add after form/service primitives. |
| Text input | Covered capsule | `registry/components/text-input` | markup primitives, experimental, not-reviewed | Keep; evidence after Button/form workflow. |
| Time picker | Deferred | None | Behavior/date-time complexity missing | Defer until date/time strategy exists. |
| Tooltip | Deferred | None | Behavior/accessibility complexity missing | Defer; avoid for critical guidance. |
| Typography | Out of scope as capsule | Token and CSS output | Not a capsule | Cover through theme/docs/tokens. |
| Validation | Partial capsule | `error-summary`, `form-field`, component audit rules | markup primitives, experimental, not-reviewed | Promote as a cross-component contract, not only a component. |

## Pattern Matrix

| USWDS pattern | Ashlar status | Current Ashlar artifact | Gap |
| --- | --- | --- | --- |
| Complete a complex form | Partial capsule | `registry/components/benefit-application`, `examples/service-flow` | Needs stable evidence, more field types, summary/step patterns, and design-partner review. |
| Select a language | Planned capsule | None | Needs language selector primitive, content model, and multilingual validation guidance. |
| Create a user profile | Planned pattern | Current form controls only | Needs profile/account form fixture, error handling, validation, and privacy/data-minimization guidance. |

## Smallest Credible Public-Alpha Set

Ashlar should not try to clone all 47 USWDS components before public alpha. The smallest credible set for public-service teams is:

1. Stable proof for the core form path: `button`, `text-input`, `checkbox`, `radio-group`, `select`, `form-field`, `error-summary`, and `alert`.
2. Site trust shell: `banner`, `identifier`, plus a decision on `header` and `footer`.
3. Service-flow primitives: `summary-box`, `step-indicator` or `process-list`, `file-input`, and `table`.
4. Navigation/discovery primitives: `search`, `breadcrumb`, and possibly `side-navigation` for docs and large service sites.
5. One reviewed service pattern that composes the above, currently starting from `benefit-application`.

Behavior-heavy components such as `combo-box`, `modal`, `date-picker`, `date-range-picker`, `time-picker`, `tooltip`, and `range-slider` should wait until the interactive behavior substrate and accessibility evidence workflow are stronger.

## Claim Boundaries

| Stage | Allowed language | Blocked language |
| --- | --- | --- |
| Current prototype | "USWDS-compatible audit, migration, and source-capsule prototype for public-service UI." | "USWDS replacement", "public-alpha ready", "stable accessible component library". |
| After Button stable evidence | "First evidence-backed Ashlar primitive with reviewable accessibility packet." | "Replacement-grade component set". |
| After public release trust | "Publicly verifiable package and capsule provenance." | "Replacement-grade" without coverage matrix and design-partner proof. |
| After v0.1 coverage set and design-partner review | "Credible public-alpha substrate for common public-service form flows." | "Full USWDS replacement" or official federal guidance. |

## Next Actions

- Keep issue #35 open until this matrix has review feedback and is linked to the release readiness story.
- Do not broaden the catalog until the current foundation stack is merged and the first stable-evidence packet is real.
- When adding a capsule, update this matrix in the same PR as the registry change.
- When a capsule graduates to stable evidence, update both this matrix and the objective completion audit.
