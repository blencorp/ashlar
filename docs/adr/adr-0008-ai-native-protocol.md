# ADR 0008 — AI-native protocol: extended CEM plus MCP plus AGENTS.md

## Status

Proposed.

## Decision

Atrium's AI integration uses three layered artifacts, each with one job:

1. **Extended Custom Elements Manifest (CEM)** — every capsule emits a `*.cem.json` conforming to the W3C-CG CEM schema, augmented with an `_atrium` namespace for variants, anti-patterns, accessibility requirements, token consumption, rendering classification, and canonical examples.
2. **MCP server** at `npx atrium mcp` — exposes search, retrieval, validation, suggestion, migration, and evidence tools to AI assistants.
3. **AGENTS.md** in the consumer's project root — coding-agent instructions for using Atrium correctly. Symlinked from `CLAUDE.md`, `.cursor/rules/atrium.mdc`, and `.windsurfrules` for editor coverage.

A separate `llms.txt` (and `llms-full.txt`) is published for the docs site for LLM-retrieval purposes.

## Rationale

CEM is the W3C-CG standard for Web Component metadata, already emitted by Spectrum, FAST, Carbon, and many others. Storybook MCP, Carbon MCP, and design-system commentators (Dave Rupert, Codrops) all converge on CEM as the LLM contract. **Inventing a new schema would fragment; extending CEM in a namespaced field reuses ecosystem tooling.**

shadcn's MCP (CLI 3.0, August 2025) is install-and-discovery only — no usage validation, no migration, no anti-patterns. Carbon MCP (February 2026) showed the right shape: tools include `validate_usage` and `migrate`. Atrium follows Carbon's lead and adds `get_evidence` for accessibility grounding.

AGENTS.md (`agents.md`, ~60,000 repos as of late 2025) and `llms.txt` (Jeremy Howard, September 2024) serve different purposes — AGENTS.md is for **coding agents inside a repo** (build commands, conventions, do/don't); `llms.txt` is for **LLM retrieval over public docs**. Atrium ships both. Editor fragmentation (Cursor `.cursor/rules`, Windsurf `.windsurfrules`, Claude Code `CLAUDE.md`, Copilot `copilot-instructions.md`) is handled by symlinking all of them to AGENTS.md.

## Consequences

**Positive**

- Reuses existing ecosystem tooling (Storybook MCP, CEM consumers).
- AI editors get rich, structured component context.
- `validate_usage` and `migrate` MCP tools close the gap shadcn left.
- Editor fragmentation is handled via symlinks rather than n-way duplication.
- AI-readable contract is the same contract humans consume — no drift between human docs and AI manifest.

**Negative**

- Extended CEM `_atrium` namespace is an Atrium-specific extension; consumers expecting vanilla CEM see additional fields.
- MCP server must be operated reliably (or run locally per consumer).
- AGENTS.md content must stay in sync with the codebase as Atrium evolves.

**Mitigations**

- Publish JSON Schema for `_atrium` extensions; tools that don't recognize the namespace ignore it (CEM is forward-compatible).
- MCP server is a thin Node process; runs locally via `npx atrium mcp`. Hosted version is optional.
- AGENTS.md template is generated and updated by `atrium init` and `atrium update`; consumers can customize and the template doesn't overwrite their changes.

## References

- [AI-native architecture](../architecture/ai-native.md)
- [research/05-ai-tooling-and-drift.md](../research/05-ai-tooling-and-drift.md)
- Custom Elements Manifest: https://github.com/webcomponents/custom-elements-manifest
- Carbon MCP overview: https://carbondesignsystem.com/developing/carbon-mcp/overview/
- shadcn MCP: https://ui.shadcn.com/docs/mcp
- AGENTS.md: https://agents.md/
- MCP specification: https://modelcontextprotocol.io/specification/2025-11-25
