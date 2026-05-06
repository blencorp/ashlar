# Capsule format

The capsule is Ashlar's atomic unit. It bundles every artifact needed to use, verify, update, and reason about a component into a content-addressed archive that the registry distributes and the CLI installs. The current prototype verifies hashes plus local Ed25519 registry signatures, and `release sign-capsules` can attach Sigstore bundles that consumer reads verify with `cosign verify-blob` when the trust root requires it.

## Directory layout

A capsule is a directory in the registry source tree. The CLI materializes capsule files into the consumer's project on `ashlar add`.

```
button/
├── button.css                # @layer ashlar.components, semantic CSS
├── button.html               # canonical HTML example
├── button.html.njk           # Nunjucks template
├── button.html.twig          # Twig template (Drupal)
├── button.html.jinja         # Jinja template
├── button.html.erb           # ERB template (Rails)
├── button.element.ts         # Lit custom element (L1 only)
├── button.machine.ts         # Zag statechart (L1 only)
├── button.cem.json           # Custom Elements Manifest (extended)
├── button.evidence.json      # accessibility evidence packet
├── button.codemods.json      # ast-grep migration rules
├── button.test.ts            # Playwright + axe tests
├── button.docs.md            # human + AI documentation
└── button.capsule.json       # capsule manifest + content hashes
```

Files are optional except for `*.cem.json`, `*.evidence.json`, `*.capsule.json` (the per-capsule manifest with content hashes), and at least one renderable target (`*.css` for L0, `*.element.ts` for L1). Human docs and multi-template renderings become mandatory at higher stability tiers.

> **Status (2026-05-05)**: the current Button and first service-flow capsules ship `*.css`, `*.html`, `*.cem.json`, `*.evidence.json`, and signed `*.capsule.json` manifests. `registry/index.json` pins each manifest's `capsule_hash`, `registry/trust-root.json` publishes the local Ed25519 verification key plus expected Sigstore identity/issuer policy and `bundleVerification: "cosign"`, and `ashlar add` / `ashlar update` / `ashlar verify` validate hashes, local signatures, declared Sigstore bundle metadata, and trust-root-required `cosign verify-blob` before trusting registry source. `ashlar update` can also run prototype JSON codemods listed from `manifest.codemods`; that list is covered by capsule integrity when present, codemod files validate against `codemod.schema.json`, and skipped-version updates run intermediate codemods in registry version order. Multi-template renderings, Lit machine files, and real public Sigstore bundles remain planned per the [v0.0 slice graph](../roadmap/01-v0.0-foundation.md).

## Capsule manifest (`*.capsule.json`)

The capsule's own manifest, distinct from the consumer's `ashlar-lock.json`. Records the capsule's identity, version, stability, layer, file hashes, capsule hash, local registry signature, and optional Sigstore bundle metadata. It is published as a real file in the registry today, pinned from `registry/index.json`, and verified against `registry/trust-root.json`.

```json
{
  "name": "button",
  "version": "1.2.3",
  "tier": "primitive",
  "layer": "L0",
  "stability": "stable",
  "files": {
    "button.css": "sha256:abc...",
    "button.html.njk": "sha256:def...",
    "button.cem.json": "sha256:ghi...",
    "button.evidence.json": "sha256:jkl..."
  },
  "capsule_hash": "sha256:mno...",
  "signature": {
    "keyId": "ashlar-local-dev-2026-05-05",
    "algorithm": "ed25519",
    "value": "base64-signature"
  },
  "sigstore": {
    "bundle": "button.sigstore.json",
    "bundleHash": "sha256:pqr...",
    "signedPayloadHash": "sha256:stu...",
    "certificateIdentity": "https://github.com/blencorp/ashlar/.github/workflows/sigstore.yml@refs/heads/main",
    "certificateOidcIssuer": "https://token.actions.githubusercontent.com"
  },
  "dependencies": {
    "tokens": ["color.action.primary.bg", "color.action.primary.fg", "focus.ring"],
    "capsules": []
  },
  "bundleBudget": {
    "cssGzipBytes": 4096,
    "jsGzipBytes": 0
  },
  "codemods": ["button.codemods.json"],
  "templates": ["html", "njk", "twig", "jinja", "erb"],
  "frameworks": ["react", "vue", "svelte", "solid", "element"]
}
```

`capsule_hash` is the SHA-256 of a deterministic serialization of the capsule name, version, file hashes, and integrity-covered manifest metadata such as `codemods` and `bundleBudget`. It uniquely identifies the capsule contents and runtime budget contract at this version.

`signature` is currently an Ed25519 signature over the deterministic manifest payload, verified against the registry trust root. `sigstore`, when present, records the capsule-relative cosign bundle path, bundle hash, signed payload hash, certificate identity, and OIDC issuer; registry reads validate those fields against the trust root before install, update, verify, or mirror. If the trust root sets `sigstore.bundleVerification` to `cosign`, the same read path runs `cosign verify-blob` with the pinned identity and issuer. Current capsules still need real public bundle files before this becomes public Sigstore trust.

## Stability tiers

- **`proposal`** — design idea, no implementation. Visible in the registry for discussion.
- **`experimental`** — implementation exists; not for production. API may change without warning.
- **`beta`** — API mostly stable; automated tests in place; manual a11y evidence may be incomplete.
- **`stable`** — production recommended. **Requires complete evidence packet, codemods for known migrations, multi-template renderings, and signed manifest.**
- **`deprecated`** — still available; marked for future removal after migration support is ready. Codemods to the replacement ship in the capsule.

The CLI warns when adding non-stable capsules.

## Component tiers

Cross-cuts the layer model:

- **`foundation`** — tokens, layout primitives, focus ring, motion, icons.
- **`primitive`** — single-purpose controls (Button, Link, Checkbox, Dialog, Tooltip).
- **`composite`** — multiple primitives (Form Field, Search, Header, Identifier, Table).
- **`pattern`** — service flows (eligibility, document upload, address). L3.
- **`block`** — full UI sections (landing hero, application step, dashboard). L3.

## Extended Custom Elements Manifest

Every capsule emits a CEM (`*.cem.json`) that conforms to the W3C-CG schema, augmented with an `_ashlar` namespace. See [`ai-native.md`](./ai-native.md) for the full schema; the relevant excerpt:

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
      "members": [],
      "events": [],
      "slots": [{ "name": "default", "description": "Button label" }],
      "cssProperties": [
        { "name": "--ashlar-button-bg", "syntax": "<color>" }
      ],
      "_ashlar": {
        "variants": ["primary", "secondary", "outline", "ghost", "destructive"],
        "selector": ".ashlar-button",
        "sizes": ["sm", "md", "lg"],
        "a11yRequirements": [
          { "rule": "accessible_name_required", "wcag": "4.1.2" },
          { "rule": "focus_visible_required", "wcag": "2.4.7" }
        ],
        "antiPatterns": [
          {
            "pattern": "<button class=\"ashlar-button\" onClick={navigate}>",
            "fix": "<a class=\"ashlar-link\" href=...>",
            "reason": "Use Link for navigation, Button for actions"
          },
          {
            "pattern": "<button class=\"ashlar-button\"><svg/></button>",
            "fix": "Add aria-label or visible text",
            "reason": "Icon-only buttons require accessible name"
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
        "criticalForA11y": true
      }
    }]
  }]
}
```

## Evidence packet (`*.evidence.json`)

Mandatory for stable capsules. Machine-readable accessibility evidence, queryable by tools and AI.

See [`accessibility.md`](./accessibility.md) for the full schema; structurally:

```json
{
  "component": "button",
  "version": "1.2.3",
  "wcag": [
    { "criterion": "1.4.3", "status": "pass", "evidence": "tests/contrast.spec.ts" },
    { "criterion": "2.1.1", "status": "pass", "evidence": "tests/keyboard.spec.ts" }
  ],
  "manualTests": [
    { "tech": "NVDA", "browser": "Firefox 145", "date": "2026-04-24", "result": "pass" }
  ],
  "knownLimitations": []
}
```

## Codemods (`*.codemods.json`)

Prototype ast-grep JSON rules transform installed consumer capsule files from the previous version of the capsule to the current one. `ashlar update` loads files listed in `manifest.codemods` when `component`, `from`, and `to` match the current update step; skipped-version updates walk the registry `versions` list and apply intermediate codemods in order. `manifest.codemods` participates in the capsule hash/signature payload when present, codemod files must be listed in `manifest.files`, codemod files validate against `codemod.schema.json`, and rule targets must stay inside the installed component directory. The current runner supports a narrow one-file `pattern` / fixed `rewrite` subset before three-way merge; `confirm: true` rules require explicit `--yes` approval and report the rule ids plus targets before applying. `ashlar update --survival-report <path>` can record file-level update outcomes and codemod counts for scenario harnesses.

L0 codemods target the semantic markup form (`<button class="ashlar-button">`) per [ADR-0011](../adr/adr-0011-l0-semantic-contract.md). L1 codemods target the custom-element form (`<ashlar-combobox>`).

```json
{
  "schemaVersion": "1.0",
  "component": "button",
  "from": "1.1.0",
  "to": "1.2.0",
  "rules": [
    {
      "id": "button-rename-color-token",
      "target": "button.css",
      "language": "css",
      "pattern": "color: var(--ashlar-color-action-primary-bg);",
      "rewrite": "color: var(--ashlar-color-action-primary-surface);",
      "confirm": false
    }
  ]
}
```

See [`drift-and-updates.md`](./drift-and-updates.md) for the full codemod application protocol and the explicit list of failure modes textual three-way merge does not handle.

## Content addressing

`capsule_hash` is the SHA-256 of a deterministic JSON serialization of:

```json
{
  "name": "button",
  "version": "1.2.3",
  "files": {
    // sorted alphabetically, file hashes only
  },
  "codemods": ["button.codemods.json"],
  "bundleBudget": {
    "cssGzipBytes": 4096,
    "jsGzipBytes": 0
  }
}
```

Determinism rules: keys sorted, no whitespace, line endings normalized to `\n`, UTF-8 encoding. The CLI computes this identically on registry side (publish) and consumer side (verify).

## Signing

Ashlar plans to use **Sigstore** with cosign for capsule signatures:

1. Registry build pipeline produces capsule contents and `capsule_hash`.
2. Pipeline signs `capsule_hash` via Sigstore (keyless, with OIDC identity tied to the registry's GitHub Actions workflow).
3. Signature and signing certificate chain are recorded in the capsule manifest.
4. `ashlar verify` re-computes the capsule hash from local files and verifies the signature against the embedded chain.

Custom registries (agency-internal mirrors, regulated-industry consumers) bring their own keys via `ashlar.config.json`. Air-gapped operation supported by bundling a verification keyring with the registry tarball.

## Backwards compatibility

The capsule format itself is versioned via `schemaVersion` (currently `1.0`). Breaking changes to the format require a major version increment and a migration codemod for the registry build tooling. Capsule format changes do **not** trigger version bumps in the components themselves.

## References

- [ADR 0001 — Distribution model](../adr/adr-0001-distribution-model.md)
- [Drift and updates](./drift-and-updates.md)
- [AI-native architecture](./ai-native.md)
- [Distribution and registry](./distribution-and-registry.md)
- [Accessibility architecture](./accessibility.md)
- Custom Elements Manifest: https://github.com/webcomponents/custom-elements-manifest
- Sigstore: https://www.sigstore.dev/
