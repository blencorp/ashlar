# AI-native architecture

Atrium's AI integration is built on three artifacts, each with a single job:

1. **Extended Custom Elements Manifest (CEM)** — the structured contract.
2. **MCP server** — the queryable interface for AI assistants.
3. **AGENTS.md** — coding-agent instructions for the consumer's repo.

A separate `llms.txt` is published for the docs site for retrieval purposes.

This document specifies the extended CEM schema, the MCP tool/resource/prompt set, and the AGENTS.md template.

## Extended CEM schema

Every capsule emits `*.cem.json` conforming to the W3C-CG Custom Elements Manifest schema, augmented with an `_atrium` namespace.

```json
{
  "schemaVersion": "2.1.0",
  "modules": [{
    "kind": "javascript-module",
      "path": "button.html",
    "declarations": [{
      "kind": "class",
      "name": "AtriumButton",
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
          "name": "atrium-click",
          "type": { "text": "CustomEvent<{ originalEvent: MouseEvent }>" }
        }
      ],
      "slots": [
        { "name": "default", "description": "Button label content" },
        { "name": "icon-start", "description": "Optional icon before the label" },
        { "name": "icon-end", "description": "Optional icon after the label" }
      ],
      "cssProperties": [
        { "name": "--atrium-button-bg", "syntax": "<color>" },
        { "name": "--atrium-button-fg", "syntax": "<color>" }
      ],
      "_atrium": {
        "version": "1.2.3",
        "tier": "primitive",
        "layer": "L0",
        "stability": "stable",
        "selector": ".atrium-button",

        "variants": ["primary", "secondary", "outline", "ghost", "destructive"],
        "sizes": ["sm", "md", "lg"],

        "a11yRequirements": [
          { "id": "accessible_name_required", "wcag": "4.1.2", "severity": "error" },
          { "id": "focus_visible_required", "wcag": "2.4.7", "severity": "error" }
        ],

        "antiPatterns": [
          {
            "id": "navigation-as-button",
            "pattern": "<button class=\"atrium-button\" onClick={navigate}>",
            "fix": "<a class=\"atrium-link\" href=...>",
            "reason": "Use Link for navigation, Button for actions",
            "severity": "warning"
          },
          {
            "id": "icon-only-needs-label",
            "pattern": "<button class=\"atrium-button\">$ICON</button>",
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
          "basic": "<button class=\"atrium-button\" data-variant=\"primary\" type=\"button\">Apply</button>",
          "with-icon": "<button class=\"atrium-button\" data-variant=\"primary\" type=\"button\"><svg aria-hidden=\"true\"/>Apply</button>"
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

The `_atrium` namespace is forward-compatible: tools that don't recognize it ignore it. Vanilla CEM consumers see a normal CEM.

### Schema validation

`@atrium/cli` ships a JSON Schema for the `_atrium` extensions. Capsule build pipelines validate before publishing.

## MCP server

`npx atrium mcp` starts an MCP server pointing at the consumer's installed components and tokens. AI assistants connect via stdio or SSE.

### Tools

```
search_components(query: string, limit?: number)
  → Capsule[]                      // semantic search over installed CEMs

get_component(name: string)
  → ExtendedCEM                    // full extended CEM for one capsule

validate_usage(file_or_glob: string)
  → ValidationResult[]             // runs ast-grep rules, returns violations

suggest_for_task(description: string)
  → CapsuleRecommendation[]        // intent-driven recommendations

migrate(component: string, from?: string, to?: string)
  → MigrationPlan                  // codemods + diff preview

get_evidence(name: string)
  → EvidencePacket                 // a11y evidence for component

list_tokens(category?: string)
  → Token[]                        // all tokens, optionally filtered

get_token(name: string)
  → Token                          // single token with resolved value
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
  → Plans migration from react-uswds patterns to Atrium
```

The killer differentiators versus shadcn's MCP are `validate_usage` and `migrate`. Carbon MCP shipped similar tools in February 2026; Atrium's are richer because they consume the extended CEM.

### Security posture

- Read-only by default. `add_component` and `update_component` are gated behind explicit user approval.
- Local-by-default. `npx atrium mcp` runs in the consumer's process; no network egress except to the configured registry.
- Signed manifests. AI tools see the same signature chain humans verify.
- No hidden prompts. Tool descriptions and resource contents are exactly the published CEM and capsule files.

## AGENTS.md

Lives in the consumer's project root. Generated by `atrium init`, updated by `atrium update`. Tells coding agents how to use Atrium correctly **in this codebase**.

```markdown
# Atrium — Agent Instructions

This project uses Atrium components. When generating UI code, follow these rules.

## Canonical imports

- React: `import { Button } from "@atrium/react"`
- Vue: `import { AtriumButton } from "@atrium/vue"`
- HTML: `<button class="atrium-button">` for L0 components; custom elements are reserved for L1 behavior-heavy components.

## Available components

(installed list, generated from atrium-lock.json)

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

- Style components via Atrium CSS variables: `var(--atrium-color-action-primary-bg)`.
- Do not hard-code brand colors. If you need a new brand color, add it to the agency theme tokens.

## Validation

Before declaring done, run `npx atrium audit` and resolve all errors.

## Updating components

- Always run `atrium update` to upgrade; do not edit `node_modules`.
- For drift conflicts, use the diff prompt and resolve in-file with `<<<<<<<` markers.

## Anti-patterns (will be flagged by `atrium audit`)

- `<atrium-button onClick={navigate}>` — use `<atrium-link href>`.
- `<atrium-button><svg/></atrium-button>` without `aria-label`.
- `<atrium-form-field>` wrapping non-input content.
- Custom colors like `style={{ background: "#0050d8" }}` — use tokens.

## Where to find more

- Component docs: `npx atrium docs <component>`
- Evidence packet: `npx atrium evidence <component>`
- MCP server: `npx atrium mcp`
```

## Editor symlinks

`atrium init` creates:

```
AGENTS.md                        (canonical)
CLAUDE.md             → AGENTS.md
.cursor/rules/atrium.mdc → AGENTS.md
.windsurfrules         → AGENTS.md
.continuerules         → AGENTS.md
.github/copilot-instructions.md → AGENTS.md
```

Symlinks rather than copies, so all editors see the same content. On Windows where symlinks require elevated permissions, the CLI offers a copy fallback with a `Last synced:` header.

## llms.txt for the docs site

The Atrium docs site publishes `llms.txt` (top-level summary) and `llms-full.txt` (full content concatenated):

```
# Atrium

> An evidence-grade, AI-native, government-first design system.

## Philosophy
- /philosophy.md
- /architecture/overview.md

## Components
- /components/button.md (atrium-button)
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
- MCP specification: https://modelcontextprotocol.io/specification/2025-11-25
- Carbon MCP: https://carbondesignsystem.com/developing/carbon-mcp/overview/
