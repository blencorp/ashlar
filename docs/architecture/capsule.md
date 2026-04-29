# Capsule format

The capsule is Ashlar's atomic unit. It bundles every artifact needed to use, verify, update, and reason about a component into a content-addressed, signed archive that the registry distributes and the CLI installs.

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
├── button.codemods.yaml      # ast-grep migration rules
├── button.test.ts            # Playwright + axe tests
├── button.docs.md            # human + AI documentation
└── button.lock.json          # capsule manifest + content hashes
```

Files are optional except for `*.cem.json`, `*.docs.md`, `*.capsule.json` (the per-capsule manifest with content hash and signature), and at least one renderable target (`*.css` for L0, `*.element.ts` for L1).

> **Status (2026-04-29)**: the current Button capsule ships `*.css`, `*.html`, `*.cem.json`, and `*.evidence.json`. The `*.capsule.json` per-capsule manifest, codemods, multi-template renderings, and Lit machine files are planned per the [v0.0 slice graph](../roadmap/01-v0.0-foundation.md). Today, the capsule manifest is computed dynamically at install time inside `add`; v0.0 slice 4 (supply-chain hardening) writes it as a real, signed registry artifact.

## Capsule manifest (`*.capsule.json`)

The capsule's own manifest, distinct from the consumer's `ashlar-lock.json`. Records the capsule's identity, version, content hashes, dependencies, and signature. Published as a real file in the registry by v0.0 slice 4.

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
  "signature": "sigstore:...",
  "dependencies": {
    "tokens": ["color.action.primary.bg", "color.action.primary.fg", "focus.ring"],
    "capsules": []
  },
  "templates": ["html", "njk", "twig", "jinja", "erb"],
  "frameworks": ["react", "vue", "svelte", "solid", "element"]
}
```

`capsule_hash` is the SHA-256 of a deterministic serialization of all file hashes plus metadata. It uniquely identifies the capsule contents at this version.

`signature` is a Sigstore signature over `capsule_hash`. Verifiable offline with the capsule's public key chain.

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

## Codemods (`*.codemods.yaml`)

ast-grep YAML rules that transform consumer code from the previous version of the capsule to the current one. Run by `ashlar update` when version skip detected. Codemod application lands in v0.0 slice 3; until then, codemods can be authored in capsules but are not executed.

L0 codemods target the semantic markup form (`<button class="ashlar-button">`) per [ADR-0011](../adr/adr-0011-l0-semantic-contract.md). L1 codemods target the custom-element form (`<ashlar-combobox>`).

```yaml
# L0 example: Button (semantic markup)
- id: button-rename-color-attr
  from: 1.1.x
  to: 1.2.x
  language: [html, tsx, jsx]
  rule:
    pattern: <button class="ashlar-button" color="$VAL">
  fix: <button class="ashlar-button" data-variant="$VAL">
  message: "color attribute renamed to data-variant in 1.2.0"
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
  }
}
```

Determinism rules: keys sorted, no whitespace, line endings normalized to `\n`, UTF-8 encoding. The CLI computes this identically on registry side (publish) and consumer side (verify).

## Signing

Ashlar uses **Sigstore** with cosign for capsule signatures:

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
