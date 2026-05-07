# Distribution and registry

Ashlar is distributed as content-addressed capsules through a registry. This document specifies the target registry shape, distribution channels (HTTP and Git), provenance via Sigstore, custom registries, and air-gapped operation.

> **Status (2026-05-05)**: the local prototype has registry-authored signed `*.capsule.json` manifests, per-version manifest hashes pinned in `registry/index.json`, `registry/trust-root.json` with an Ed25519 verification key plus expected Sigstore identity/issuer policy and `bundleVerification: "cosign"`, hash/signature verification on `add`, `update`, and `verify`, declared capsule Sigstore bundle metadata checks plus trust-root-required `cosign verify-blob` when present, `ashlar registry mirror` for verified local directory mirrors, `pnpm release:smoke` to prove packed CLI/schema tarballs install and run in a throwaway consumer project, `ashlar release provenance-check` for local npm provenance readiness, `ashlar release provenance-verify-public` for post-publish npm attestation verification and review-record JSON output, a guarded tokenless `publish.yml` workflow shaped for npm trusted publishing that uploads `ashlar-npm-provenance.json`, a guarded `github-packages.yml` workflow for authenticated `@blen/*` GitHub Packages mirrors/canaries, `ashlar release sign-capsules` for capsule-local Sigstore bundle generation, `ashlar release public-trust-verify` for strict verification of signed registry artifacts and review-record JSON output, `ashlar release sbom` for an unsigned SPDX release SBOM, `ashlar release attest` / `verify-attestation` for hash-based SBOM tamper evidence in CI, `ashlar release trust-bundle` / `verify-trust-bundle` for a schema-backed local offline-review artifact tying registry trust material to release artifacts, a guarded keyless `sigstore.yml` workflow that signs capsule manifests plus release-review JSON artifacts with cosign bundles and uploads `ashlar-public-trust.json`, and a release-readiness-gated [supply-chain incident playbook](../security/supply-chain-incident-playbook.md). HTTP distribution, real public capsule-level Sigstore bundles, custom registry tooling, configured npmjs.com trusted publishers, published npm provenance attestations, public signed SBOM/trust-bundle artifacts, public Sigstore/TUF trust bundles, and external security review of the playbook remain planned supply-chain work. See [STATUS.md](../../STATUS.md).

## Registry shape

The registry is the catalog of capsules. Its on-disk structure mirrors the published artifact:

```
registry/
├── index.json                  # registry manifest
├── trust-root.json             # local Ed25519 trust root in the prototype
├── components/
│   ├── button/
│   │   ├── 1.2.3/
│   │   │   ├── button.tar.gz   # capsule contents
│   │   │   ├── button.capsule.json   # capsule manifest
│   │   │   └── signature.bundle  # Sigstore signature bundle
│   │   ├── 1.2.4/
│   │   └── latest -> 1.2.4
│   ├── form-field/
│   └── ...
├── patterns/
├── themes/
├── tokens/
└── icons/
```

`index.json`:

```json
{
  "$schema": "https://ashlar.dev/schemas/registry-index.schema.json",
  "registry": "https://registry.ashlar.dev",
  "name": "ashlar-canonical",
  "version": "0.1.0",
  "publishedAt": "2026-04-27T10:00:00Z",
  "components": {
    "button": {
      "latest": "1.2.4",
      "versions": ["1.0.0", "1.1.0", "1.2.0", "1.2.1", "1.2.3", "1.2.4"],
      "capsuleHashes": {
        "1.2.3": "sha256:abc...",
        "1.2.4": "sha256:def..."
      },
      "stability": "stable",
      "tier": "primitive",
      "layer": "markup-primitives"
    },
    "combobox": { /* ... */ }
  },
  "patterns": { /* ... */ },
  "themes": ["ashlar/default", "ashlar/high-contrast"],
  "signingKey": "sigstore-public-key:..."
}
```

## Distribution channels

### HTTP JSON over CDN (primary)

The shadcn pattern. Published to a CDN-fronted endpoint:

```
https://registry.ashlar.dev/index.json
https://registry.ashlar.dev/components/button/1.2.4/button.capsule.json
https://registry.ashlar.dev/components/button/1.2.4/button.tar.gz
https://registry.ashlar.dev/components/button/1.2.4/signature.bundle
```

Pros: easy consumption from any environment; CDN-cacheable; no Git tooling required.

### Signed Git tags (secondary mirror)

The entire registry is also a Git repository with signed tags:

```
https://github.com/blencorp/ashlar-registry
  tags:
    button-1.2.4
    form-field-0.5.0
    release-2026.04.27
```

Pros: air-gapped-friendly (clone once, use offline); Git already trusted in many federal IT environments; signatures embedded in tag objects for verification.

The CLI auto-detects which channel to use based on `ashlar.config.json`:

```json
{
  "registry": {
    "primary": "https://registry.ashlar.dev",
    "fallback": "git+https://github.com/blencorp/ashlar-registry.git",
    "trustRoots": [
      "sigstore-public-key:..."
    ]
  }
}
```

## Provenance via Sigstore

Every public capsule will be signed via **Sigstore/cosign**. The target build pipeline:

1. Builds the capsule contents.
2. Computes the `capsule_hash` (deterministic SHA-256 over file hashes).
3. Signs `capsule_hash` via Sigstore — keyless, with OIDC identity tied to the GitHub Actions workflow that published the registry.
4. Embeds the signature bundle in the capsule artifact.
5. Records the signing certificate chain in the registry index.
6. Runs `ashlar release public-trust-verify` against the signed registry artifact before publication and writes `ashlar-public-trust.json` for release-trust review records.

The target consumer flow verifies signatures on every install and on `ashlar verify`:

```bash
$ ashlar verify

Components:
  ✓ button         (1.2.3) — signature valid (Sigstore, ashlar/registry@main)
  ✓ form-field    (0.5.0) — signature valid
  ✗ dialog        (1.1.0) — signature INVALID (registry tampered or trust root drift)

3 components verified. 1 error.
```

## Custom registries

Agencies and regulated-industry consumers can run their own registries:

```json
{
  "registry": {
    "primary": "https://registry.dod.mil/ashlar-mirror",
    "trustRoots": [
      "sigstore-public-key:dod-internal-signing-key"
    ]
  }
}
```

Custom registries:

- Bring their own signing keys.
- Can mirror the canonical registry plus add agency-specific capsules.
- Inherit the same content addressing, manifest format, and verification flow.
- Can be air-gapped.

The registry build tool (`@blen/ashlar-registry-build`) is open-source so any organization can publish.

## Air-gapped operation

```bash
$ ashlar registry mirror --registry ./registry --output ./ashlar-mirror
```

The prototype command verifies every listed capsule version against the registry index, capsule manifest, capsule hash, local Ed25519 trust root, any declared capsule Sigstore bundle metadata, and trust-root-required `cosign verify-blob` before copying anything. It writes a directory mirror containing:

- Full registry contents at the requested versions.
- Signed local capsule manifests.
- `trust-root.json` for local Ed25519 verification and the expected Sigstore identity/issuer policy.
- Index manifests.

Consumers:

```bash
$ ashlar init --registry ./ashlar-mirror
$ ashlar add button
$ ashlar verify
```

All operations work offline for filesystem registries. `ashlar verify` checks signatures against the mirrored trust root. The public-release target still adds a compressed mirror artifact, Sigstore bundles, Rekor/TUF trust material, and an explicit revocation story.

## Versioning

Components follow semver:

- **Major** — breaking API/markup changes; codemods required.
- **Minor** — additive changes (new variants, new slots); codemods optional.
- **Patch** — bug fixes, accessibility fixes, internal refactors.

The registry index records every published version. The CLI defaults to the latest stable version on `add`; `add button@^1.2` follows semver constraints.

## Stability and visibility

Stability tiers (from [`capsule.md`](./capsule.md)):

- `proposal` — visible in registry only with `--show-proposals`.
- `experimental` — visible by default; CLI warns on add.
- `beta` — visible; CLI suggests checking evidence packet status.
- `stable` — recommended.
- `deprecated` — visible; CLI suggests migration.

`ashlar add` defaults to `stable+`. `--allow-experimental` opts in.

## Publication workflow

Ashlar itself uses a two-stage publication:

1. **PR merge** to the registry repo triggers `ashlar-registry-build` GitHub Action.
2. **Build action**:
   - Validates capsule manifests.
   - Runs accessibility evidence checks (refuses to publish stable without complete evidence).
   - Builds tarballs.
   - Signs via Sigstore (keyless OIDC).
   - Pushes to CDN endpoint.
   - Tags Git mirror.

Consumers don't see in-flight builds; only completed, signed releases.

## Backwards compatibility

Registry index format is versioned via `version` field (currently `0.1.0`). Format changes are backward-compatible for the consumer (CLI handles older indexes); breaking changes to the registry format require a major CLI version bump.

## Bandwidth considerations

A typical capsule is 5–50KB compressed. A full Ashlar install (foundation + 20 components + 1 theme) is under 2MB total. The CLI streams downloads and caches via standard HTTP cache headers.

## References

- [ADR 0001 — Distribution model](../adr/adr-0001-distribution-model.md)
- [Capsule format](./capsule.md)
- [Drift and updates](./drift-and-updates.md)
- Sigstore: https://www.sigstore.dev/
- cosign: https://github.com/sigstore/cosign
- SLSA: https://slsa.dev/
- shadcn registry pattern: https://ui.shadcn.com/docs/registry
