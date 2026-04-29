# Distribution and registry

Atrium is distributed as content-addressed, signed capsules through a registry. This document specifies the registry shape, distribution channels (HTTP and Git), provenance via Sigstore, custom registries, and air-gapped operation.

## Registry shape

The registry is the catalog of capsules. Its on-disk structure mirrors the published artifact:

```
registry/
├── index.json                  # registry manifest
├── components/
│   ├── button/
│   │   ├── 1.2.3/
│   │   │   ├── button.tar.gz   # capsule contents
│   │   │   ├── manifest.json   # capsule manifest
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
  "$schema": "https://atrium.dev/schemas/registry-index.schema.json",
  "registry": "https://registry.atrium.dev",
  "name": "atrium-canonical",
  "version": "0.1.0",
  "publishedAt": "2026-04-27T10:00:00Z",
  "components": {
    "button": {
      "latest": "1.2.4",
      "versions": ["1.0.0", "1.1.0", "1.2.0", "1.2.1", "1.2.3", "1.2.4"],
      "stability": "stable",
      "tier": "primitive",
      "layer": "L0"
    },
    "combobox": { /* ... */ }
  },
  "patterns": { /* ... */ },
  "themes": ["atrium/default", "atrium/high-contrast"],
  "signingKey": "sigstore-public-key:..."
}
```

## Distribution channels

### HTTP JSON over CDN (primary)

The shadcn pattern. Published to a CDN-fronted endpoint:

```
https://registry.atrium.dev/index.json
https://registry.atrium.dev/components/button/1.2.4/manifest.json
https://registry.atrium.dev/components/button/1.2.4/button.tar.gz
https://registry.atrium.dev/components/button/1.2.4/signature.bundle
```

Pros: easy consumption from any environment; CDN-cacheable; no Git tooling required.

### Signed Git tags (secondary mirror)

The entire registry is also a Git repository with signed tags:

```
https://github.com/atrium/registry
  tags:
    button-1.2.4
    form-field-0.5.0
    release-2026.04.27
```

Pros: air-gapped-friendly (clone once, use offline); Git already trusted in many federal IT environments; signatures embedded in tag objects for verification.

The CLI auto-detects which channel to use based on `atrium.config.json`:

```json
{
  "registry": {
    "primary": "https://registry.atrium.dev",
    "fallback": "git+https://github.com/atrium/registry.git",
    "trustRoots": [
      "sigstore-public-key:..."
    ]
  }
}
```

## Provenance via Sigstore

Every capsule is signed via **Sigstore/cosign**. The build pipeline:

1. Builds the capsule contents.
2. Computes the `capsule_hash` (deterministic SHA-256 over file hashes).
3. Signs `capsule_hash` via Sigstore — keyless, with OIDC identity tied to the GitHub Actions workflow that published the registry.
4. Embeds the signature bundle in the capsule artifact.
5. Records the signing certificate chain in the registry index.

Consumers verify on every install and on `atrium verify`:

```bash
$ atrium verify

Components:
  ✓ button         (1.2.3) — signature valid (Sigstore, atrium/registry@main)
  ✓ form-field    (0.5.0) — signature valid
  ✗ dialog        (1.1.0) — signature INVALID (registry tampered or trust root drift)

3 components verified. 1 error.
```

## Custom registries

Agencies and regulated-industry consumers can run their own registries:

```json
{
  "registry": {
    "primary": "https://registry.dod.mil/atrium-mirror",
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

The registry build tool (`@atrium/registry-build`) is open-source so any organization can publish.

## Air-gapped operation

```bash
$ atrium registry mirror --output ./atrium-mirror.tar.gz
```

Produces a tarball containing:

- Full registry contents at the requested versions.
- Signature bundles for all capsules.
- Verification keyring (Sigstore root + intermediates).
- Index manifests.

Consumers:

```bash
$ tar xzf atrium-mirror.tar.gz
$ atrium init --registry ./atrium-mirror
$ atrium update --registry ./atrium-mirror
```

All operations work offline. `atrium verify` checks signatures against the bundled keyring.

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

`atrium add` defaults to `stable+`. `--allow-experimental` opts in.

## Publication workflow

Atrium itself uses a two-stage publication:

1. **PR merge** to the registry repo triggers `atrium-registry-build` GitHub Action.
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

A typical capsule is 5–50KB compressed. A full Atrium install (foundation + 20 components + 1 theme) is under 2MB total. The CLI streams downloads and caches via standard HTTP cache headers.

## References

- [ADR 0001 — Distribution model](../adr/adr-0001-distribution-model.md)
- [Capsule format](./capsule.md)
- [Drift and updates](./drift-and-updates.md)
- Sigstore: https://www.sigstore.dev/
- cosign: https://github.com/sigstore/cosign
- SLSA: https://slsa.dev/
- shadcn registry pattern: https://ui.shadcn.com/docs/registry
