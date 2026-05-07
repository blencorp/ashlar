# AI-native architecture

Ashlar's AI integration is built on three artifacts, each with a single job:

1. **Extended Custom Elements Manifest (CEM)** — the structured contract.
2. **MCP server** — the queryable interface for AI assistants.
3. **AGENTS.md** — coding-agent instructions for the consumer's repo.
4. **DESIGN.md** — visual design-system context for coding agents.

A separate `llms.txt` is published for the docs site for retrieval purposes.

This document specifies the extended CEM schema, the MCP tool/resource/prompt set, AI eval harness, AGENTS.md template, and DESIGN.md export posture.

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

`@blen/ashlar-cli` ships a JSON Schema for the `_ashlar` extensions. Capsule build pipelines validate before publishing.

## MCP server

> **Status (2026-05-05)**: started for v0.0 slice 5. `ashlar mcp` ships a local read-only stdio server with policy/feature/token/evidence-aware registry search, deterministic task-to-capsule suggestions, missing-capability warnings, capsule metadata, evidence, token lookup, and `validate_usage`; `_ashlar` JSON Schema validation is wired in the CLI; `ashlar ai-eval` ships a deterministic saved-output harness; ADR 0012 covers the v0.0 local read-only MCP/eval threat model. Write tools, hosted transport, embedding search, and live model benchmarks remain planned. See [STATUS.md](../../STATUS.md).

`npx @blen/ashlar mcp` starts an MCP server pointing at the consumer's installed components and tokens. AI assistants connect via stdio (local) or, in v0.1+, SSE/HTTP (gated behind an additional threat model). MCP governance moved to the Linux Foundation Agentic AI Foundation in December 2025; the server tracks the [2025-11-25 spec](https://modelcontextprotocol.io/specification/2025-11-25/basic).

### Tools

```
// Read-only tools (v0.0 slice 5):
search_components({
  query?: string,
  layer?: "L0" | "L1" | "L2" | "L3" | "L4",
  tier?: "foundation" | "primitive" | "composite" | "pattern" | "block",
  stability?: string,
  evidence?: string,
  policy?: string,
  feature?: string,
  token?: string,
  limit?: number
})
  → RankedCapsule[]                // ranked CEM/index/evidence metadata search
                                   // (embedding search is v0.1+)

get_component(name: string)
  → ExtendedCEM                    // full extended CEM for one capsule

suggest_for_task({ task: string, limit?: number })
  → SuggestionPlan                 // deterministic suggestions plus unavailable-capability gaps
                                   // and an install command, no writes

get_evidence(name: string)
  → EvidencePacket                 // a11y evidence for component

list_tokens(category?: string)
  → Token[]                        // all tokens, optionally filtered

get_token(name: string)
  → Token                          // single token with resolved value

validate_usage(file_or_glob: string)
  → ValidationResult[]             // runs ast-grep rules, returns SARIF-shaped
                                   // violations (built on slice 2)

// Planned read+plan tools (future slice; explicit user approval flow):
migrate_plan(component: string, from?: string, to?: string)
  → MigrationPlan                  // codemods + diff preview, no apply

// Write tools (v0.1+, gated behind threat model ADR):
// add_component, update_component, migrate_apply
```

### Resources

```
capsule://<name>@<version>         → full capsule (including all files)
token://<token-name>               → token definition
pattern://<name>                   → service pattern with composition
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

The durable differentiators versus shadcn's install-and-discovery MCP are policy-aware discovery, deterministic task suggestions, `validate_usage` (executable component anti-patterns), `ai-eval` (repeatable generated-output checks), and planned migration tooling (codemod-driven version transitions), grounded in the extended CEM and evidence packets. A community proposal `SandeepBaskaran/carbon-mcp` (awaiting Carbon-team feedback against [carbon issue #20855](https://github.com/carbon-design-system/carbon/issues/20855)) explores `validateComponent` and `codemodReplace` for Carbon — the convergence is real, but Carbon Design System has not officially shipped or endorsed an MCP as of April 2026. Ashlar's current MCP is read-only-plus-validate; write tools (`add_component`, `update_component`, hosted operation) are gated behind additional threat modeling per [ADR 0012](../adr/adr-0012-mcp-threat-model.md) and [research/08 gap analysis](../research/08-gap-analysis-2026-04-29.md) item 8.

## AI Eval Harness

`ashlar ai-eval --suite <path> [--registry <path>] [--json]` runs deterministic generated-output fixtures through the same audit runner used by `ashlar audit` and MCP `validate_usage`.

The suite format is schema-backed by `ai-eval.schema.json`:

```json
{
  "$schema": "https://ashlar.dev/schemas/ai-eval.schema.json",
  "schemaVersion": "1.0",
  "cases": [
    {
      "id": "service-flow-no-findings",
      "prompt": "Generate a simple benefit application form with Ashlar capsules.",
      "components": ["form-field", "text-input", "button"],
      "outputFile": "generated/benefit-application.pass.html",
      "policy": "all",
      "expect": { "errors": 0, "warnings": 0 }
    }
  ]
}
```

The harness does not call a model. It records the prompt and checks a saved generated artifact so failures are deterministic in CI. JSON reports include each case's actual findings plus grounding metadata: component versions, evidence status, and `_ashlar.antiPatterns` rule ids.

### Security posture

- Read-only by default. `add_component` and `update_component` are gated behind explicit user approval.
- Local-by-default. `npx @blen/ashlar mcp` runs in the consumer's process; no network egress except to the configured registry.
- Manifest hashes today; signed manifests after slice 4. AI tools see the same capsule metadata humans verify.
- No hidden prompts. Tool descriptions and resource contents are exactly the published CEM and capsule files.
- Threat model: [ADR 0012 — MCP and AI eval threat model](../adr/adr-0012-mcp-threat-model.md).

## AGENTS.md

Lives in the consumer's project root. Generated by `ashlar init`, updated by `ashlar add` and `ashlar update`. Tells coding agents how to use Ashlar correctly **in this codebase**.

```markdown
# Ashlar - Agent Instructions

This project uses Ashlar capsules: source-owned public-service UI with evidence, policy mappings, and validator rules.

## Installed Capsules

(installed list, generated from `ashlar-lock.json`)

- button@0.0.1 (experimental)
- form-field@0.0.1 (experimental)
- ...

## Discovery Workflow

- Start an unfamiliar project with `ashlar status --json` so the agent can see initialization state, installed capsules, registry coverage, stable-evidence blockers, external-review proof state, and next commands without writing files.
- For a new public-service UI task, start with `ashlar suggest "<task>"`.
- Use `ashlar search --policy <text>`, `ashlar search --feature <text>`, or `ashlar search --token <text>` when the task is tied to a standard, platform capability, or token.
- Before installing or using a capsule, inspect it with `ashlar view <component>` and `ashlar evidence <component>`.
- In MCP-capable agents, prefer read-only `suggest_for_task`, `search_components`, `get_component`, `get_evidence`, `list_tokens`, `get_token`, and `validate_usage`.
- Treat `status` and `suggest` as planning aids only. They never install components, write files, or prove accessibility conformance.
- If `suggest` reports a capability gap, do not invent an Ashlar capsule name. Use the native HTML recommendation or wait for the signed capsule.

## Rules For AI Coding Agents

- Use only installed Ashlar capsules unless the user explicitly asks to add a new capsule.
- Do not invent props, variants, classes, or behaviors that are absent from installed CEM files.
- Preserve semantic HTML, accessible names, label associations, focus-visible styles, and forced-colors behavior.
- For markup primitive capsules (internal layer L0), use semantic platform markup such as `<button class="ashlar-button" data-variant="primary">`, not custom elements.
- Use Ashlar CSS variables for styling; do not hard-code agency colors into capsule source.
- After editing Ashlar markup, run `ashlar audit --policy all`.
- Before claiming installed capsule integrity, run `ashlar verify`.
```

The generated file intentionally avoids framework import examples until framework adapters exist. markup primitive capsules are source-owned HTML/CSS primitives, not React/Vue packages.

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

Symlinks rather than copies when the platform allows it, so all editors see the same content. When symlinks are unavailable, the CLI writes Ashlar-managed copies and refreshes those managed copies on the next `init`, `add`, or `update`. Existing project-owned instruction files are preserved.

## DESIGN.md

`DESIGN.md` lives in the consumer's project root. Generated by `ashlar init`, updated by `ashlar add`, `ashlar update`, and `ashlar design sync`, and intended for coding agents that look for a root-level design-system file.

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

## Component Discovery

- Start new public-service UI tasks with `ashlar suggest "<task>"` or MCP `suggest_for_task`.
- Use `ashlar search` or MCP `search_components` with policy, feature, token, layer, stability, or evidence filters when choosing capsules.
- Inspect candidate capsules with `ashlar view <component>`, `ashlar evidence <component>`, MCP `get_component`, and MCP `get_evidence` before using them.
- Suggestions are deterministic metadata matches. They do not install components, modify files, or prove accessibility conformance.

## Do's and Don'ts

- Do use Ashlar tokens and installed components.
- Do not invent component APIs outside installed CEM files.
- Do preserve focus indicators and forced-colors behavior.
- Do keep forms dense enough for repeat use but readable at 200% zoom.
- Do not invent brand colors outside the agency theme.
- Do not use decorative gradients or oversized marketing layouts for operational government flows.
```

A future `ashlar design lint` could delegate to `@google/design.md lint` when available, then add Ashlar-specific checks for token provenance, contrast, forced-colors coverage, and policy-pack conflicts. It is not implemented in v0.0.

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
