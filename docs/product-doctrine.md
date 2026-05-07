# Product Doctrine

Date: 2026-05-05

This document answers the product question behind Ashlar: are we building another UI library, or a new category that can become shorthand in public-service software?

## Position

Ashlar should become the source-owned UI substrate for public-service interfaces.

The public category is:

> Evidence-backed source UI for public services.

The product noun is:

> Ashlar Capsule.

A capsule is not just a component. It is source code plus accessibility evidence, policy mappings, platform requirements, audit rules, content hashes, update metadata, and eventually signatures. shadcn/ui made source ownership feel obvious for application teams. Ashlar should make defensible source ownership feel obvious for government teams.

## Replacement Stance

Ashlar can aim to replace the day-to-day need for USWDS in new public-service builds, but it should not launch by declaring itself "the USWDS replacement."

Replacement is an earned outcome, not the opening claim.

The safer and stronger launch claim is:

- Ashlar interoperates with USWDS.
- Ashlar audits existing USWDS and federal-page markup.
- Ashlar packages public-service UI as source-owned, evidence-backed capsules.
- Ashlar provides the validation, update, provenance, and AI-contract layer that USWDS does not currently provide.
- If that layer proves itself, teams can adopt Ashlar components and patterns for new work without waiting for a full USWDS rewrite.

The internal ambition remains large: build the modern public-service UI system that developers, contractors, designers, accessibility reviewers, and AI coding agents prefer. But public trust comes from proof, not antagonism.

## What Makes This Different

Ashlar is not differentiated by having government-looking components, Tailwind tokens, Web Components, or an MCP server. Those are easy to copy.

The durable difference is the bundle of guarantees around each component:

- **Evidence**: component status is tied to axe, keyboard, screen-reader, WCAG, and ICT Baseline evidence.
- **Policy**: federal page-shell, trust-marker, metadata, and service-pattern rules run in CI.
- **Source ownership**: components install as local source code, not opaque packages.
- **Safe updates**: lockfiles, original hashes, three-way merge, codemods, and accessibility-critical confirmations keep source ownership maintainable.
- **Provenance**: capsule hashes, signatures, npm provenance, SBOMs, and air-gapped mirrors make adoption legible to procurement and security reviewers.
- **AI contract**: extended CEM, AGENTS.md, and MCP expose the same contract to humans, validators, and coding agents.
- **Light footprint**: markup primitive components default to semantic HTML and CSS, with JavaScript only where behavior requires it.

If a feature does not strengthen one of those guarantees, it is secondary.

## The Buzzword Test

"shadcn/ui" became shorthand because it gave developers a crisp move:

> Do not install a black-box component package. Own the source.

Ashlar needs an equally crisp move:

> Do not copy unverified government UI. Install a capsule you can audit, verify, update, and defend.

The phrase to cultivate is:

> Capsule it.

Meaning: take a public-service UI primitive, pattern, or policy rule and ship it as source with evidence, auditability, provenance, and update metadata.

This is the product surface that can become memorable. "AI-native gov UI library" is too generic. "Capsules" gives the project a concrete object and a sharper category.

## Developer Experience

The command surface must stay quiet:

```bash
npx @blen/ashlar audit
npx @blen/ashlar view button
npx @blen/ashlar add button
npx @blen/ashlar verify
npx @blen/ashlar update
npx @blen/ashlar theme sync
npx @blen/ashlar theme validate
npx @blen/ashlar mcp
```

The first useful path should be:

1. Run `ashlar audit` on an existing project with no component migration.
2. Read explainable findings with federal-standard, WCAG, and evidence links.
3. Use `ashlar view <capsule>` before install to inspect evidence, footprint, files, policy mappings, and platform requirements.
4. Use `ashlar add <capsule>` to install source code and generated indexes.
5. Use `ashlar verify` in CI to detect tampering and local drift.
6. Use `ashlar update` to merge upstream improvements without losing local ownership.
7. Let AI coding agents call `validate_usage` before code leaves the editor.

The CLI should feel as easy as shadcn at the surface and stricter underneath.

## AI-Native Means Validate, Not Generate

Ashlar should not define "AI-native" as generated UI, prompt templates, or a chat component set. That space will commoditize quickly.

For Ashlar, AI-native means:

- AI tools can discover capsules.
- AI tools can retrieve the structured component contract.
- AI tools can retrieve evidence and policy mappings.
- AI tools can retrieve approved theme-token paths and CSS variable names.
- AI tools can validate generated code against anti-pattern rules.
- AI tools can propose migrations through codemods and dry-run results.
- AI write tools remain blocked until the MCP threat model and permission model are reviewed.

The winning claim is not "agents can generate Ashlar UI." The winning claim is "agents cannot silently generate invalid Ashlar UI."

## Product Shape

Ashlar should be built in this order:

1. **Validator**: policy and component audit that works before adoption.
2. **Capsules**: source-owned markup primitive components with evidence and policy mappings.
3. **Verify and update**: hashes, signatures, drift detection, three-way merge, codemods.
4. **Service slices**: real public-service flows, not galleries.
5. **AI contract**: MCP and editor instructions grounded in the same evidence and CEM.
6. **Adapters and templates**: React, Web Components, and server-rendered templates once the capsule contract is stable.

Do not scale component count until the capsule substrate is hard to dismiss.

## First Killer Proof

The first proof should not be a dashboard or component gallery. It should be a small public-service flow:

- Federal page shell with banner, title, meta description, identifier, and required links.
- Banner, Identifier, Form Field, Text Input, Select, Radio Group, Checkbox, Button, Alert, and Error Summary components.
- One agency theme and one alternate theme.
- `ashlar audit --policy all` with at least one intentional failing example and clear fixes.
- `ashlar view` showing evidence and footprint before install.
- `ashlar verify` detecting a tampered installed file.
- Generated agent instruction files that tell AI coding agents exactly which capsules are installed and how to validate usage.

If this flow is compelling, Ashlar has a wedge. If this flow feels ordinary, more components will not fix the concept.

## Public Language

Use:

- "Evidence-backed source UI for public services."
- "Capsules you can audit, verify, update, and defend."
- "USWDS-compatible, not USWDS-hostile."
- "Verification before components."
- "AI contracts, not prompt magic."
- "Semantic HTML first. JavaScript when behavior earns it."

Avoid:

- "USWDS is dead."
- "Official government design system."
- "Makes your app 508 compliant."
- "AI-generated government UI."
- "Just like shadcn for gov."
- "Accessible by default" without evidence status.

## Gates Before Replacement Claims

Ashlar can make stronger replacement language only after these are true:

- `ashlar audit` runs as a standalone CI step from npm.
- At least one complete public-service flow passes audit and evidence checks.
- Capsules include stable evidence for the core flow components.
- `ashlar update` works across instrumented drift scenarios.
- `ashlar verify` validates real signatures, not only hashes.
- MCP exposes read-only discovery, evidence, and validation tools.
- The docs show a clear USWDS migration or interop path.
- At least one external reviewer or design partner has validated the direction.

Until then, the honest posture is pre-alpha infrastructure with a replacement ambition.
