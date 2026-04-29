# ADR 0001 — Distribution model: registry-first, content-addressed, signed capsules

## Status

Proposed.

## Decision

Distribute Ashlar components as content-addressed, signed **capsules** through a registry. Capsules are installed as source code into the consuming project. The registry is served primarily over HTTP JSON (CDN), with signed Git tags as a secondary mirror for air-gapped environments. The CLI tracks installation in a lockfile that records capsule hashes, file hashes, and signatures.

## Rationale

The shadcn-style open-code distribution model has clear advantages: source ownership, customizability, AI-readability, no opaque package internals. Production users have validated this model.

The most-cited unsolved problem with shadcn (discussion #790, open since 2023) is drift after install: copied source becomes unmaintainable because there is no safe upgrade path. Ashlar addresses this directly by combining open-code distribution with:

- **Content addressing** — every capsule is identified by SHA-256 of its contents.
- **Signing** — every capsule is signed via Sigstore/cosign, and the lockfile records signatures.
- **Lockfile** — `ashlar-lock.json` records the original capsule hash, per-file hashes at install, and provenance.
- **Three-way merge on update** — `git merge-file --diff3` performs real merges; codemods ship as ast-grep YAML rules.

For government contexts, the same machinery delivers FedRAMP-relevant supply-chain provenance and air-gapped-mirror operation.

## Consequences

**Positive**

- Teams own component source.
- AI tools can inspect local implementation directly.
- Updates are safe (three-way merge with codemods); the shadcn drift problem is fixed.
- Supply-chain story is auditable (Sigstore, signed Git tags, checksum verification).
- Custom registries possible (agency-internal mirrors, regulated-industry consumers).
- Air-gapped operation supported.

**Negative**

- Update mechanics are more complex than `npm update`; tooling must be excellent.
- Local forks can still drift if teams ignore `ashlar update`.
- Signing infrastructure must be operated reliably.

**Mitigations**

- Lockfile + signatures + `ashlar verify` make tampering visible.
- CLI prompts on every update; accessibility-critical changes force confirmation.
- Codemods ship with capsules for breaking changes.

## References

- [Architecture overview](../architecture/overview.md)
- [Capsule format](../architecture/capsule.md)
- [Drift and updates](../architecture/drift-and-updates.md)
- [Distribution and registry](../architecture/distribution-and-registry.md)
- shadcn discussion #790 (open since 2023): https://github.com/shadcn-ui/ui/discussions/790
- Sigstore: https://www.sigstore.dev/
- git merge-file: https://git-scm.com/docs/git-merge-file
