# ADR 0012 — MCP and AI eval threat model

## Status

Accepted for the v0.0 local read-only MCP surface.

## Context

Ashlar's AI-native claim rests on tooling that gives coding agents component context and validates generated output. The current executable surface is:

- `ashlar mcp`, a local stdio MCP server with read-only registry, evidence, token, and `validate_usage` tools;
- `ashlar ai-eval`, a deterministic saved-output harness that loads a schema-backed eval suite and runs generated files through the same audit runner.

No hosted MCP transport or write tools are in scope for v0.0.

## Assets

- Capsule metadata and `_ashlar.antiPatterns` loaded from the configured registry.
- Evidence packets and evidence status surfaced to coding agents.
- Local project source files passed to `validate_usage` or `ai-eval`.
- CI artifacts: AI eval JSON reports, SARIF, evidence reports.
- Developer trust in generated-code validation results.

## Trust Boundaries

1. **Coding agent to local MCP server**: stdio transport inside the developer's process. No network listener is opened.
2. **MCP server to filesystem**: tools read registry metadata, theme tokens, and explicitly requested target files or globs.
3. **AI eval suite to filesystem**: the suite is untrusted input and may point at arbitrary output paths. The runner reads files and reports findings; it does not write project files.
4. **CI to artifacts**: CI publishes reports that reviewers may rely on, but reports are evidence of the checked fixtures only.

## Threats and Decisions

- **Prompt or tool injection asks the MCP server to modify files.** Decision: v0.0 exposes no write tools. Tool annotations are read-only and destructive=false.
- **A malicious eval suite points at sensitive local files.** Decision: `ai-eval` is a local/CI command, not a remote service. Teams should run trusted suites in CI. Future hosted or multi-tenant eval execution must sandbox file access before launch.
- **A generated report is mistaken for accessibility proof.** Decision: AI eval reports are validation artifacts only. Stable accessibility still requires evidence packets, manual screen-reader evidence, and `evidence --check`.
- **A compromised registry feeds bad guidance to agents.** Decision: MCP and eval use the same registry helpers as the CLI. Local Ed25519 manifest verification exists for install/update/verify/mirror, and declared capsule Sigstore bundles can be verified with trust-root-required `cosign verify-blob`; public bundle publication and npm provenance remain slice 4 work.
- **Hosted MCP expands exposure.** Decision: hosted/SSE/HTTP MCP is deferred until a separate threat model covers auth, rate limits, tenant isolation, request logging, prompt-injection handling, and network egress.

## Mitigations

- Keep v0.0 MCP local stdio only.
- Keep tool set read-only: `search_components`, `suggest_for_task`, `get_component`, `get_evidence`, `list_tokens`, `get_token`, `validate_usage`.
- Keep `search_components` deterministic and metadata-backed in v0.0: component text, policy mappings, platform features, tokens, evidence status, layer, and stability only. Embedding-backed task suggestions remain a separate follow-up.
- Keep `suggest_for_task` deterministic in v0.0: return capsule recommendations and an install command, but never call `add`, edit files, or request network services.
- Validate AI eval suite JSON with `ai-eval.schema.json`.
- Route `validate_usage`, `audit`, and `ai-eval` through the same policy runner so findings are consistent.
- Upload eval reports as CI review artifacts without calling them compliance reports.

## Open Follow-ups

- Add an eval corpus with real model outputs from multiple coding agents.
- Add prompt-grounding fixtures that verify generated output does not hallucinate props or unsupported components.
- Revisit this ADR before any hosted MCP transport or write tool ships.
