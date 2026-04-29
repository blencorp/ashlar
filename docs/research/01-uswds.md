# 01 — USWDS research: philosophy, docs, tooling, repo, and constraints

## Summary

The United States Web Design System is an open-source UI library and visual style guide for U.S. federal government websites. It is not only a set of components. It is also a policy-adjacent implementation layer for consistent, accessible, user-centered government digital services.

USWDS should be studied respectfully because it solved a real problem: government websites were inconsistent, often inaccessible, and repeatedly rebuilding the same UI patterns. It created a shared language and reusable components. It also embedded important public-sector values that a successor should keep.

The modernization opportunity is not primarily visual. It is in distribution, runtime model, tooling, theming, and machine-readable implementation guidance.

## What USWDS is trying to be

USWDS describes itself as an active open-source community of government engineers, content specialists, and designers. Its public docs say contributors support dozens of agencies and nearly 200 sites. It provides UI components, visual style guidance, design tokens, utilities, patterns, developer tooling, and documentation.

Its design principles are civic rather than fashion-driven:

- Start with real user needs.
- Earn trust.
- Embrace accessibility.
- Promote continuity.
- Listen.

The official principles page says the principles support project teams regardless of whether the team builds with USWDS code. This matters: USWDS is a philosophy and operating model, not just a package.

Its product values reinforce the same posture:

- Put user needs first.
- Make it easy to do the right thing.
- Accessibility is fundamental.
- Start from existing solutions.
- Be consistent, not static.
- Share what we do.

A successor should not reject these values. It should operationalize them with modern development and distribution practices.

## Component and pattern model

The component docs present USWDS components as simple, consistent solutions to common UI problems. The current component index lists 47 components. Examples include accordion, alert, banner, breadcrumb, button, card, checkbox, combo box, date picker, form, header, identifier, input prefix/suffix, modal, process list, range slider, search, select, side navigation, step indicator, table, tag, text input, textarea, and time picker.

USWDS components are traditionally documented through:

- usage guidance;
- accessibility notes;
- code snippets;
- variants;
- package names;
- settings and Sass references;
- component status/lifecycle information.

The component status and lifecycle docs are important. USWDS uses a maturity model, public feedback periods, and proposal phases for adding or refining components. This kind of governance should be preserved.

## Developer model

The developer docs emphasize a “solid HTML foundation” and progressive enhancement: if JavaScript fails, necessary content should still be available. This is a strength. Government services often have higher resilience requirements than private marketing pages.

USWDS can be installed through npm or GitHub, and npm is recommended. Current docs and repository pages show a package structure with Sass, JavaScript, Twig templates, tests, assets, and compiled distribution files. The repository uses Gulp for compilation, and `@uswds/compile` is a Gulp-based compiler for USWDS Sass.

USWDS v3 modernized the Sass side by using Sass modules and unbundled code. The migration docs frame v3 as a relatively low-effort migration with better performance and file-size possibilities. The package docs say teams can import individual packages instead of the full bundle, and that selecting packages typically cuts package CSS size by half. The default `uswds` package is listed at roughly 73 KB gzipped and 394 KB full in the package table.

These are meaningful improvements. The issue is that USWDS is still largely a Sass/package/HTML distribution system, not a modern source-code component registry.

## Package structure and implications

USWDS packages are split across component and non-component packages. The docs say most packages are components, such as `usa-search`, `usa-banner`, and `usa-accordion`, but packages can include fonts and utility packages as well. `uswds-core` includes functions, mixins, tokens, settings, and helpers used by other packages.

A typical package includes:

- Sass styles;
- JavaScript behavior where relevant;
- Twig templates;
- tests;
- story files;
- package metadata;
- assets and content files.

This structure is mature for a documentation-driven design system, but it is not optimized for teams that want a framework-native component with clear props, slots, composition rules, typed APIs, and local source ownership.

## Design tokens and settings

USWDS has a token system and Sass settings. The token docs describe design tokens as a way to reduce a broad range of values into a smaller, meaningful set of design decisions. The settings docs show theme variables such as `$theme-*` configured through Sass `@use`.

The problem is not that USWDS lacks tokens. The problem is that the primary operational contract is still Sass-centric. Modern design systems increasingly use platform-neutral JSON token formats, CSS custom properties, runtime theme switching, dark mode, high-contrast variants, and variable-driven utility classes.

Atrium should learn from the semantic richness of USWDS tokens, but should move the source of truth to a vendor-neutral token spec and emit Sass only if needed, not as the primary contract.

## Utility model

USWDS includes utilities. The utilities docs show a utilities package and indicate the entire package is roughly 198 KB uncompressed. Utility classes are useful, but the modern utility-first ecosystem has shifted toward generated, token-driven, tree-shakable, CSS-variable-aware systems.

Atrium should not blindly adopt all utility-first practice, but it should assume that teams expect a low-friction CSS surface. Tailwind v4’s CSS-first configuration and theme variables are especially relevant because they make design tokens available as CSS variables and can be configured directly in CSS.

## Current release posture

The GitHub releases page showed USWDS 3.13.0 as the latest release at the time of this research. Recent releases include work on date picker labels, in-page navigation, tooltip behavior, checkbox/radio interactive areas, Sass deprecation work, dependency updates, verified commit signature requirements, and removal of IE11 support.

This tells us USWDS is actively maintained. A successor should not be framed as a rescue from abandonment. It should be framed as a different architecture for a changed delivery environment.

## Official framework gap

A key GitHub discussion from the USWDS repo asks whether USWDS should provide React components. The discussion notes that there is no official framework support and that components are officially available as cut-and-paste HTML. It identifies real problems:

- upgrades and staying in sync are hard;
- there is no abstraction layer;
- consumers need brittle knowledge of exact markup;
- implementation guidance is limited;
- agencies repeatedly create their own wrappers.

The same discussion includes caution against tying USWDS only to React, and notes that USWDS JavaScript has not always been cleanly isolated from global DOM/window assumptions.

This maps directly to the proposed strategy: React-first implementation, but not React-only; source-code registry, but not uncontrolled forking; cross-framework contract, but no premature attempt to build every framework at once.

## Web Components direction

The `uswds-elements` repository is described as a Web Component version of USWDS that some call USWDS 4.0. Its README says it is pre-release, community-driven, and currently moving fairly slowly. It also says the Banner is the closest to stable because the official government website banner is being required through Federal Website Standards.

This is a signal that the USWDS community recognizes the framework-independence problem. But a full Web Component system faces tradeoffs: framework interop is attractive, but form semantics, styling, SSR, hydration, design tokens, slots, a11y testing, and developer ergonomics can still be challenging.

Atrium should use Web Components surgically first: official-site shell primitives that many stacks need, rather than a full component suite on day one.

## Accessibility posture

USWDS positions accessibility as fundamental. Section508.gov explicitly recommends using USWDS as an accessible, mobile-friendly component toolkit that helps teams avoid building from scratch and scale fixes across government. USWDS component pages often include accessibility guidance and status.

This is a major advantage over many private-sector component libraries. A modern successor must go further, not weaker: every component should have test evidence, WCAG mapping, screen reader notes, keyboard matrices, and known limitations. “Accessible by default” is not enough; government buyers need confidence and traceability.

## Adoption reality

Digital.gov cited an OMB fact sheet saying 80% of federal websites did not use USWDS, 45% were not mobile-friendly, and 60% had a possible accessibility issue. That data implies two things:

1. USWDS has not become universal despite strong values and official support.
2. The need for a better adoption model remains urgent.

This is the strongest strategic argument for Atrium: not that USWDS is bad, but that adoption at government scale requires lower friction, modern ergonomics, and better proof.

## New government websites as signals

Current public pages such as TrumpRx.gov and WhiteHouse.gov are useful signals, but they should be treated carefully. A parsed TrumpRx.gov page credits National Design Studio, and the page text did not expose visible `USWDS` or `usa-` markers in the research check. The parsed WhiteHouse.gov homepage also did not expose visible `USWDS` or `usa-` markers. This is not conclusive source-code proof, but it supports the broader observation that prominent modern government experiences are not necessarily presenting themselves through the recognizable USWDS surface.

National Design Studio’s own site describes its mission as “Modernizing government experiences through design & engineering” and “building for an entire nation.” That is exactly the strategic terrain Atrium would enter.

## Strengths to preserve

Atrium should preserve:

- civic values and plain-language orientation;
- progressive enhancement;
- official-site identity patterns;
- accessibility discipline;
- component lifecycle governance;
- research-based content and pattern guidance;
- an open-source community model;
- semantic design tokens;
- consistency without rigid conformity.

## Constraints to move beyond

Atrium should move beyond:

- Sass as the main configuration contract;
- Gulp-oriented compile flows;
- HTML snippets as the only official implementation surface;
- framework wrappers being left to agencies;
- hard-to-version copy/paste adoption;
- component APIs hidden in markup conventions;
- limited machine-readable guidance for AI tools;
- visual identity being tightly coupled to implementation style;
- large default CSS and utility bundles when teams only need a small subset.

## Research conclusion

USWDS is a strong foundation philosophically and civically. But the next generation should be a different product shape: a registry, token compiler, component source distribution, AI-readable documentation system, accessibility evidence platform, and agency theming engine.

## References

- USWDS home: https://designsystem.digital.gov/
- USWDS design principles: https://designsystem.digital.gov/design-principles/
- USWDS product values: https://designsystem.digital.gov/about/product-values/
- USWDS research: https://designsystem.digital.gov/about/research/
- USWDS components: https://designsystem.digital.gov/components/
- USWDS package docs: https://designsystem.digital.gov/components/packages/
- USWDS developer docs: https://designsystem.digital.gov/documentation/developers/
- USWDS settings docs: https://designsystem.digital.gov/documentation/settings/
- USWDS design tokens: https://designsystem.digital.gov/design-tokens/
- USWDS utilities: https://designsystem.digital.gov/utilities/
- USWDS migration docs: https://designsystem.digital.gov/documentation/migration/
- USWDS repository: https://github.com/uswds/uswds
- USWDS releases: https://github.com/uswds/uswds/releases
- USWDS Elements: https://github.com/uswds/uswds-elements
- USWDS Compile: https://github.com/uswds/uswds-compile
- USWDS React discussion: https://github.com/uswds/uswds/discussions/4677
- Section508.gov on USWDS: https://www.section508.gov/create/universal-design/uswds/
- Digital.gov article citing OMB fact sheet: https://digital.gov/2023/11/01/one-agencys-plan-for-improving-the-customer-experience-with-its-public-websites/
- TrumpRx.gov: https://trumprx.gov/
- WhiteHouse.gov: https://www.whitehouse.gov/
- National Design Studio: https://ndstudio.gov/
