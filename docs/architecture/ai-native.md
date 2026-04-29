# AI-native architecture

Ashlar's AI integration is built on three artifacts, each with a single job:

1. **Extended Custom Elements Manifest (CEM)** — the structured contract.
2. **MCP server** — the queryable interface for AI assistants.
3. **AGENTS.md** — coding-agent instructions for the consumer's repo.
4. **DESIGN.md** — visual design-system context for coding agents.

A separate `llms.txt` is published for the docs site for retrieval purposes.

This document specifies the extended CEM schema, the MCP tool/resource/prompt set, AGENTS.md template, and DESIGN.md export posture.

## Extended CEM schema

Every capsule emits `*.cem.json` conforming to the W3C-CG Custom Elements Manifest schema, augmented with an `_ashlar` namespace.

```json
{
  "schemaVersion": "2.1.0",
  "modules": [{
    "kind": "javascript-module",
      "path": "button.html",
    "declarations": [{
      "kind": "class",
      "name": "AshlarButton",
      "tagName": "button",
      "description": "Accessible semantic action control for forms and workflows.",
      "members": [
        {
          "kind": "field",
          "name": "variant",
          "type": { "text": "'primary' | 'secondary' | 'outline' | 'ghost' | 'destructive'" },
          "default": "'primary'",
          "attribute": "variant"
        }
      ],
      "attributes": [
        {
          "name": "variant",
          "type": { "text": "'primary' | 'secondary' | 'outline' | 'ghost' | 'destructive'" }
        }
      ],
      "events": [
        {
          "name": "ashlar-click",
          "type": { "text": "CustomEvent<{ originalEvent: MouseEvent }>" }
        }
      ],
      "slots": [
        { "name": "default", "description": "Button label content" },
        { "name": "icon-start", "description": "Optional icon before the label" },
        { "name": "icon-end", "description": "Optional icon after the label" }
      ],
      "cssProperties": [
        { "name": "--ashlar-button-bg", "syntax": "<color>" },
        { "name": "--ashlar-button-fg", "syntax": "<color>" }
      ],
      "_ashlar": {
        "version": "1.2.3",
        "tier": "primitive",
        "layer": "L0",
        "stability": "stable",
        "selector": ".ashlar-button",

        "variants": ["primary", "secondary", "outline", "ghost", "destructive"],
        "sizes": ["sm", "md", "lg"],

        "a11yRequirements": [
          { "id": "accessible_name_required", "wcag": "4.1.2", "severity": "error" },
          { "id": "focus_visible_required", "wcag": "2.4.7", "severity": "error" }
        ],

        "antiPatterns": [
          {
            "id": "navigation-as-button",
            "pattern": "<button class=\"ashlar-button\" onClick={navigate}>",
            "fix": "<a class=\"ashlar-link\" href=...>",
            "reason": "Use Link for navigation, Button for actions",
            "severity": "warning"
          },
          {
            "id": "icon-only-needs-label",
            "pattern": "<button class=\"ashlar-button\">$ICON</button>",
            "constraint": { "has": "<svg/>", "not_has": "aria-label" },
            "fix": "Add aria-label or visible text",
            "wcag": "4.1.2",
            "severity": "error"
          }
        ],

        "tokensConsumed": [
          "color.action.primary.bg",
          "color.action.primary.fg",
          "focus.ring.color",
          "button.radius"
        ],

        "rendering": "server-safe",
        "hydrationCost": "low",
        "criticalForA11y": true,
        "firefoxFallbacks": [],

        "examples": {
          "basic": "<button class=\"ashlar-button\" data-variant=\"primary\" type=\"button\">Apply</button>",
          "with-icon": "<button class=\"ashlar-button\" data-variant=\"primary\" type=\"button\"><svg aria-hidden=\"true\"/>Apply</button>"
        },

        "doNot": [
          "Do not use Button for navigation — use Link",
          "Do not remove focus styles",
          "Do not create icon-only buttons without aria-label"
        ],

        "policyMapping": [
          { "policy": "M-23-22", "section": "Accessibility" },
          { "policy": "Section 508", "section": "WCAG 2.0 AA" }
        ]
      }
    }]
  }]
}
```

The `_ashlar` namespace is forward-compatible: tools that don't recognize it ignore it. Vanilla CEM consumers see a normal CEM.

### Schema validation

`@ashlar/cli` ships a JSON Schema for the `_ashlar` extensions. Capsule build pipelines validate before publishing.

## MCP server

> **Status (2026-04-29)**: planned for v0.0 slice 5. The implementation, threat model ADR, and JSON Schema for the `_ashlar` namespace land together. Until then, the schema below is design intent — it is not yet wired up. See [STATUS.md](../../STATUS.md).

`npx ashlar mcp` starts an MCP server pointing at the consumer's installed components and tokens. AI assistants connect via stdio (local) or, in v0.1+, SSE/HTTP (gated behind an additional threat model). MCP governance moved to the Linux Foundation Agentic AI Foundation in December 2025; the server tracks the [2025-11-25 spec](https://modelcontextprotocol.io/specification/2025-11-25/basic).

### Tools

```
// Read-only tools (v0.0 slice 5):
search_components(query: string, limit?: number)
  → Capsule[]                      // substring search over name + description
                                   // (semantic/embedding search is v0.1+)

get_component(name: string)
  → ExtendedCEM                    // full extended CEM for one capsule

get_evidence(name: string)
  → EvidencePacket                 // a11y evidence for component

list_tokens(category?: string)
  → Token[]                        // all tokens, optionally filtered

get_token(name: string)
  → Token                          // single token with resolved value

validate_usage(file_or_glob: string)
  → ValidationResult[]             // runs ast-grep rules, returns SARIF-shaped
                                   // violations (built on slice 2)

// Read+plan tools (v0.0 slice 5; explicit user approval flow):
migrate_plan(component: string, from?: string, to?: string)
  → MigrationPlan                  // codemods + diff preview, no apply

// Write tools (v0.1+, gated behind threat model ADR):
// add_component, update_component, migrate_apply, suggest_for_task
```

### Resources

```
capsule://<name>@<version>         → full capsule (including all files)
token://<token-name>               → token definition
pattern://<name>                   → L3 pattern with composition
evidence://<component>@<version>   → evidence packet
docs://<component>                 → component docs
```

### Prompts

```
build-form
  Args: { fields: FieldSpec[], theme?: string }
  → Generates FormField composition with proper validation

apply-agency-theme
  Args: { brand: BrandSpec }
  → Generates DTCG agency theme override

migrate-from-react-uswds
  Args: { source-glob: string }
  → Plans migration from react-uswds patterns to Ashlar
```

The durable differentiators versus shadcn's install-and-discovery MCP are `validate_usage` (executable component anti-patterns) and `migrate` (codemod-driven version transitions), grounded in the extended CEM and evidence packets. A community proposal `SandeepBaskaran/carbon-mcp` (awaiting Carbon-team feedback against [carbon issue #20855](https://github.com/carbon-design-system/carbon/issues/20855)) explores `validateComponent` and `codemodReplace` for Carbon — the convergence is real, but Carbon Design System has not officially shipped or endorsed an MCP as of April 2026. Ashlar's MCP, when it ships in v0.0 slice 5, is read-only-plus-validate; write tools (`add_component`, `update_component`, hosted operation) are gated behind a separate threat model ADR per [research/08 gap analysis](../research/08-gap-analysis-2026-04-29.md) item 8.

### Security posture

- Read-only by default. `add_component` and `update_component` are gated behind explicit user approval.
- Local-by-default. `npx ashlar mcp` runs in the consumer's process; no network egress except to the configured registry.
- Signed manifests. AI tools see the same signature chain humans verify.
- No hidden prompts. Tool descriptions and resource contents are exactly the published CEM and capsule files.

## AGENTS.md

Lives in the consumer's project root. Generated by `ashlar init`, updated by `ashlar update`. Tells coding agents how to use Ashlar correctly **in this codebase**.

```markdown
# Ashlar — Agent Instructions

This project uses Ashlar components. When generating UI code, follow these rules.

## Canonical imports

- React: `import { Button } from "@ashlar/react"`
- Vue: `import { AshlarButton } from "@ashlar/vue"`
- HTML: `<button class="ashlar-button">` for L0 components; custom elements are reserved for L1 behavior-heavy components.

## Available components

(installed list, generated from ashlar-lock.json)

- Button (1.2.3)
- FormField (0.5.0)
- Alert (1.0.1)
- ...

## Accessibility rules — required

- Use visible labels for form controls; never placeholder-only.
- Icon-only buttons require `aria-label`.
- Preserve focus styles. Never `outline: none` without an alternative.
- Use Button for actions, Link for navigation.
- For AI-generated answers in public-service contexts, include disclosure and citation regions.

## Token rules

- Style components via Ashlar CSS variables: `var(--ashlar-color-action-primary-bg)`.
- Do not hard-code brand colors. If you need a new brand color, add it to the agency theme tokens.

## Validation

Before declaring done, run `npx ashlar audit` and resolve all errors.

## Updating components

- Always run `ashlar update` to upgrade; do not edit `node_modules`.
- For drift conflicts, use the diff prompt and resolve in-file with `<<<<<<<` markers.

## Anti-patterns (will be flagged by `ashlar audit`)

- `<ashlar-button onClick={navigate}>` — use `<ashlar-link href>`.
- `<ashlar-button><svg/></ashlar-button>` without `aria-label`.
- `<ashlar-form-field>` wrapping non-input content.
- Custom colors like `style={{ background: "#0050d8" }}` — use tokens.

## Where to find more

- Component docs: `npx ashlar docs <component>`
- Evidence packet: `npx ashlar evidence <component>`
- MCP server: `npx ashlar mcp`
```

## Editor symlinks

`ashlar init` creates:

```
AGENTS.md                        (canonical)
CLAUDE.md             → AGENTS.md
.cursor/rules/ashlar.mdc → AGENTS.md
.windsurfrules         → AGENTS.md
.continuerules         → AGENTS.md
.github/copilot-instructions.md → AGENTS.md
```

Symlinks rather than copies, so all editors see the same content. On Windows where symlinks require elevated permissions, the CLI offers a copy fallback with a `Last synced:` header.

## DESIGN.md

`DESIGN.md` lives in the consumer's project root. Generated by `ashlar init`, updated by `ashlar design sync`, and intended for coding agents that look for a root-level design-system file.

Ashlar treats DESIGN.md as an **export layer**, not the source of truth:

- DTCG tokens remain canonical for values.
- Extended CEM remains canonical for component contracts.
- Evidence packets remain canonical for accessibility claims.
- Policy packs remain canonical for government standards.
- DESIGN.md summarizes those sources into a Markdown/YAML file agents can apply during UI generation.

The file should include:

```markdown
---
name: Ashlar Default
description: Government-first, evidence-backed public-service UI system.
colors:
  action-primary: "#005EA8"
  focus-ring: "#2491FF"
typography:
  body:
    fontFamily: Public Sans
    fontSize: 1rem
spacing:
  md: 16px
rounded:
  control: 6px
---

## Overview

Use a restrained, trustworthy civic interface. Prioritize clarity, plain language, visible focus, and resilient layouts over novelty.

## Do's and Don'ts

- Do use Ashlar tokens and installed components.
- Do preserve focus indicators and forced-colors behavior.
- Do keep forms dense enough for repeat use but readable at 200% zoom.
- Do not invent brand colors outside the agency theme.
- Do not use decorative gradients or oversized marketing layouts for operational government flows.
```

`ashlar design lint` can delegate to `@google/design.md lint` when available, then add Ashlar-specific checks for token provenance, contrast, forced-colors coverage, and policy-pack conflicts.

## llms.txt for the docs site

The Ashlar docs site publishes `llms.txt` (top-level summary) and `llms-full.txt` (full content concatenated):

```
# Ashlar

> An evidence-grade, AI-native, government-first design system.

## Philosophy
- /philosophy.md
- /architecture/overview.md

## Components
- /components/button.md (ashlar-button)
- /components/form-field.md
...

## Patterns
- /patterns/eligibility-check.md
...

## Tokens
- /tokens/index.md
...
```

Used for retrieval-time grounding by LLMs that crawl public docs.

## References

- [ADR 0008 — AI-native protocol](../adr/adr-0008-ai-native-protocol.md)
- [Capsule format](./capsule.md)
- [Validation](./validation.md)
- [research/05-ai-tooling-and-drift.md](../research/05-ai-tooling-and-drift.md)
- Custom Elements Manifest schema: https://github.com/webcomponents/custom-elements-manifest
- AGENTS.md: https://agents.md/
- llms.txt proposal: https://llmstxt.org/
- Google Labs DESIGN.md: https://github.com/google-labs-code/design.md
- MCP specification: https://modelcontextprotocol.io/specification/2025-11-25
- Carbon MCP: https://carbondesignsystem.com/developing/carbon-mcp/overview/
