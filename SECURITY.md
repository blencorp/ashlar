# Security Policy

Ashlar is pre-alpha research and implementation planning. Do not use current code or registry artifacts for production systems until a release explicitly says they are production-ready.

## Reporting a Vulnerability

Please do not file public issues for suspected vulnerabilities.

Email security reports to security@blencorp.com with:

- affected package, component, or document;
- reproduction steps or proof of concept;
- impact assessment;
- any known affected versions or commits.

We aim to acknowledge reports within 5 business days. Coordinated disclosure target is 90 days unless active exploitation or reporter constraints require a different timeline.

## Scope

In scope:

- CLI behavior that can modify user projects.
- Registry, capsule, lockfile, signature, and verification logic.
- MCP or AI-tool interfaces once implemented.
- Supply-chain configuration and release workflows.
- Accessibility-critical security issues, including changes that could hide or alter user-visible consent or disclosure behavior.

Out of scope:

- Social engineering.
- Denial-of-service against public docs or demo infrastructure.
- Vulnerabilities in third-party services not controlled by this project.

## Security Posture

Ashlar's target posture is signed, content-addressed capsules; SLSA-informed provenance; SBOMs; offline registry mirrors; and read-only MCP defaults. These controls are not complete yet and will be tracked in public milestones.
