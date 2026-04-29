# Gap analysis — Ashlar approach review

Date: 2026-04-29

This pass compares the current Ashlar architecture and roadmap against fresh primary-source checks across federal website standards, accessibility law and testing practice, USWDS, modern web platform capabilities, AI/MCP distribution, and supply-chain provenance.

## Executive assessment

Ashlar's core thesis remains strong: government teams need verifiable, source-owned UI infrastructure, not another framework-specific component library. The differentiators that still matter are content-addressed capsules, evidence packets, cross-stack templates, polyglot validation, signed distribution, safe drift updates, and AI-readable contracts that can be validated.

The largest gap is that the roadmap is still too component-centered. Government UX requirements are not only button/dialog/form requirements. They include page-level standards, trust markers, required links, privacy and accessibility statements, plain-language content, multilingual strategy, search, feedback, analytics, and customer-experience measurement. Ashlar should treat those as first-class policy and service-pattern contracts, not prose guidance.

## What is future-proof

1. **WCAG 2.2 as engineering target.** W3C says WCAG 2.2 is backwards-compatible with WCAG 2.0 and 2.1, and recommends adopting 2.2 even when formal obligations mention earlier versions. That makes Ashlar's WCAG 2.2 AA target a good forward-looking engineering bar, while docs must keep separate legal-baseline language for Section 508 and ADA Title II.

2. **DTCG 2025.10 tokens.** The Design Tokens Community Group's 2025.10 format is stable enough to anchor the token source, but it is a Community Group report, not a W3C Recommendation. Ashlar should continue to use it, while keeping the compiler boundary swappable.

3. **Platform-first L0 components.** `dialog`, `popover`, `light-dark()`, custom properties, cascade layers, and forced-colors support make zero-JS primitives more credible than they were a few years ago. This is still the right direction for low-bundle, low-maintenance government UI.

4. **Baseline-gated CSS adoption.** Some planned CSS capabilities are recent. `light-dark()` is Baseline 2024, Popover is Baseline 2025, and `@scope` is Baseline 2025. Ashlar should support a feature-tier policy so new platform APIs are used intentionally with tested fallbacks.

5. **Capsule + lockfile + three-way merge.** Source distribution is useful only if updates remain possible. The lockfile and diff3 update model is the strongest product wedge against shadcn-style copy drift.

6. **Polyglot validation.** Federal stacks are not React-only. ast-grep/tree-sitter validation across TSX, HTML, Twig, Jinja, ERB, Nunjucks, Vue, Svelte, and Astro remains a strong DX advantage if rule support is tested language by language.

7. **AI-native validate/migrate loop.** shadcn's registry MCP shows the industry direction, but Ashlar's advantage should be that AI tools can validate usage, retrieve evidence, and run migrations instead of only discovering/installing code.

8. **Signed, reproducible distribution.** npm trusted publishing now produces provenance attestations automatically when configured with supported CI. Sigstore/OIDC signing is still the right model for capsule provenance and mirrorable registries.

## Gaps to close

### 1. Policy and website standards are not first-class enough

Federal Website Standards currently list pending standards for the federal government banner, HTML page title, and meta page description, plus draft standards for contact pages, content timeliness indicators, and site search. Those are not component-only concerns. Ashlar should ship a `standards` or `policy-pack` layer that can audit page shells, metadata, service pages, and common federal trust requirements.

Roadmap change: add a v0.0 policy-pack prototype with checks for page title, meta description, banner placement, identifier/required-link completeness, and accessibility/privacy statement links.

### 2. Accessibility evidence needs Section 508 Baseline alignment

Current evidence packets map to WCAG and manual tests. That is necessary but not enough for federal credibility. Section508.gov's ICT Testing Baseline Alignment Framework exists to help agencies produce replicable, reliable Section 508 test results. Ashlar evidence should explicitly map component and pattern evidence to ICT Baseline tests where applicable.

Roadmap change: add `baselineTests` to the evidence schema and require at least Button, FormField, Dialog, Banner, and Identifier to map relevant evidence to ICT Baseline test IDs before stable claims.

### 3. ADA Title II dates changed in the current source

The current ADA.gov fact sheet now says state and local governments must meet WCAG 2.1 AA within three or four years from April 24, 2024, with compliance dates of April 26, 2027 for 50,000+ population governments and April 26, 2028 for smaller and special district governments. Existing Ashlar docs that say two or three years, or April 2026/2027, should be corrected.

Roadmap change: update accessibility/legal baseline docs and keep a dated legal-source review checklist.

### 4. USWDS is already moving into Web Components

USWDS 3.13 introduced an HTML Web Component variant of Banner. That means "we use Web Components" is not a durable differentiator by itself. Ashlar's durable differentiators are verifiable capsules, source ownership with safe updates, L4 templates, policy packs, evidence dashboards, AI validation, and lower bundle/runtime cost.

Roadmap change: reposition Banner/Identifier as compatibility and standards-pack work, not as proof that Web Components alone are the future.

### 5. Content, language, and service design need product weight

M-23-22 emphasizes plain language, content testing with intended audiences, translation/localization, privacy policy placement, feedback, and prioritizing high-impact services. The current L3 pattern idea includes content guidance, but the roadmap does not make content schemas, language variants, or feedback hooks release blockers.

Roadmap change: every L3 pattern should ship `*.content.md`, `*.research.md`, multilingual placeholders where needed, page-level metadata, feedback placement guidance, and an audit rule set for common content/UX failures.

### 6. DX needs preview-before-install and explainable audit output

Current CLI scope covers `init`, `add`, `audit`, `verify`, `evidence`, `diff`, and `update`. To beat existing registry DX, Ashlar should also support `search`, `view`, `preview`, and high-quality error explanations early. AI tools need the same operations through MCP.

Roadmap change: move `search` and `view` into v0.0, and add `audit --explain` output that includes policy/evidence links.

### 7. GitHub Code Scanning cannot be assumed

The live CI failure showed that SARIF upload requires repository Code Security/code scanning to be enabled. The workflow should always preserve SARIF as an artifact and treat GitHub code-scanning upload as optional unless a repository explicitly requires it.

Roadmap change: CI examples should include artifact fallback and document repo-setting prerequisites.

### 8. MCP security needs its own threat model before write tools

The MCP spec's security guidance calls out confused-deputy risks, token passthrough, consent, least-privilege scopes, and authorization details. Ashlar's read-only-local-first posture is correct, but the roadmap should block hosted/write MCP capabilities until a threat model and permission model exist.

Roadmap change: v0.1 MCP is read-only plus validate/migrate dry-run. `add_component`, `update_component`, or hosted write mode require a security ADR and explicit user approval model.

### 9. Browser support tiers are missing from component metadata

Capsules should declare required platform features and fallback strategy. Example: Tooltip can use Popover + anchor positioning only if support is adequate; otherwise use a simpler CSS/JS fallback. Dialog can rely on `<dialog>` more confidently, but still needs accessibility testing across AT/browser combinations.

Roadmap change: add `_ashlar.platformFeatures` to CEM and fail publishing when required features lack fallback notes.

### 10. Governance and evidence labor are under-specified

Manual screen-reader evidence, independent audits, and content research are labor-intensive. The roadmap names a consultant budget but does not yet make evidence ownership and review rhythm concrete.

Roadmap change: add an evidence ownership map, review rhythm, and component-stability board before public alpha.

## Better DX principles

- Install should produce a useful service slice, not a component gallery.
- `ashlar add` should explain what files, policies, rules, and evidence it installed.
- `ashlar view <item>` should show code, dependencies, evidence status, platform features, and policy mappings before install.
- Audit findings should include a fix, rationale, WCAG/policy mapping, and link to evidence or the relevant federal standard.
- Update conflicts should be rare, but when they happen, the CLI should explain whether the conflict affects accessibility-critical behavior.
- AI integrations should use the same contracts humans see: CEM, evidence, policy packs, tokens, lockfile, and docs. No hidden prompt magic.

## Better government UI/UX requirements

Ashlar should treat "government-grade" as the combination of:

- Accessibility evidence and Section 508 baseline alignment.
- Trust markers: banner, identifier, official-domain guidance, required links.
- Plain-language content defaults and error messages.
- Multilingual/localization support where the service audience requires it.
- Page metadata, search, contact, and timeliness standards.
- Privacy and accessibility statement placement.
- Feedback and analytics hooks compatible with A-11 customer-experience measurement.
- Low bundle cost and progressive enhancement for public-service resilience.
- Signed, reproducible, air-gapped-capable distribution.

## Next roadmap direction

The next implementation slice should not chase more components first. It should turn the current prototype into an evidence-and-standards foundation:

1. Add registry index and capsule metadata that can express evidence, platform features, policy mappings, and dependencies.
2. Add evidence schema support for WCAG and ICT Baseline mappings.
3. Add the first policy pack with page title, meta description, banner, identifier, and required-link checks.
4. Add `ashlar view` and stronger audit explanations.
5. Add a docs/spec page for the fictional benefit-application demo that v0.0 will prove.

## Sources checked

- Federal Website Standards: https://standards.digital.gov/standards/
- Federal government banner standard: https://standards.digital.gov/standards/banner/
- USWDS Banner: https://designsystem.digital.gov/components/banner/
- USWDS Identifier: https://designsystem.digital.gov/components/identifier/
- WCAG 2.2: https://www.w3.org/TR/WCAG22/
- ICT Testing Baseline Alignment Framework: https://baselinealignment.section508.gov/
- ADA Title II web/mobile rule fact sheet: https://www.ada.gov/resources/2024-03-08-web-rule/
- M-23-22 PDF: https://www.whitehouse.gov/wp-content/uploads/2023/09/M-23-22-Delivering-a-Digital-First-Public-Experience.pdf
- GAO 21st Century IDEA review: https://www.gao.gov/products/gao-24-106764
- DTCG 2025.10 Format Module: https://www.w3.org/community/reports/design-tokens/CG-FINAL-format-20251028/
- MDN `light-dark()`: https://developer.mozilla.org/en-US/docs/Web/CSS/color_value/light-dark
- MDN Popover API: https://developer.mozilla.org/en-US/docs/Web/API/Popover_API
- MDN `@scope`: https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/At-rules/%40scope
- WAI-ARIA APG Dialog Pattern: https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/
- WAI-ARIA APG Combobox Pattern: https://www.w3.org/WAI/ARIA/apg/patterns/combobox/
- shadcn registry MCP: https://ui.shadcn.com/docs/registry/mcp
- MCP security best practices: https://modelcontextprotocol.io/docs/tutorials/security/security_best_practices
- npm trusted publishing: https://docs.npmjs.com/trusted-publishers/
- Sigstore overview: https://docs.sigstore.dev/
