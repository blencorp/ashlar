# Capsule structure (worked example)

This document walks through the on-disk structure of a capsule using `button` as a worked example. The schema is specified in [`../architecture/capsule.md`](../architecture/capsule.md).

## In the registry

The button capsule lives at `registry/components/button/1.2.3/` in the registry source tree:

```
registry/
└── components/
    └── button/
        ├── 1.2.3/
        │   ├── button.css                 # 2.1KB — semantic CSS, cascade-layered
        │   ├── button.html                # 0.3KB — plain HTML reference
        │   ├── button.html.njk            # 0.4KB — Nunjucks template (canonical)
        │   ├── button.html.twig           # 0.4KB — Twig template
        │   ├── button.html.jinja          # 0.4KB — Jinja template
        │   ├── button.html.erb            # 0.4KB — ERB template
        │   ├── button.cem.json            # 4.2KB — extended CEM (see button.cem.json)
        │   ├── button.evidence.json       # 1.8KB — accessibility evidence packet
        │   ├── button.codemods.yaml       # 0.6KB — ast-grep migration rules
        │   ├── button.test.ts             # 3.4KB — Playwright + axe tests
        │   ├── button.docs.md             # 5.1KB — human + AI docs
        │   └── button.lock.json           # 0.9KB — capsule manifest with file hashes
        ├── 1.2.4/                         # next patch version
        └── latest -> 1.2.4                # symlink to current
```

For an L0-only capsule like Button, there is no `button.element.ts` and no `button.machine.ts` — those exist only in L1 capsules.

## In the consumer's project

When `atrium add button` runs, the CLI writes:

```
<consumer-project>/
├── atrium.config.json                 # project config
├── atrium-lock.json                   # lockfile (see atrium-lock.example.json)
├── AGENTS.md                          # AI agent instructions (canonical)
├── CLAUDE.md                          # → AGENTS.md (symlink)
├── .cursor/rules/atrium.mdc           # → AGENTS.md (symlink)
├── llms.txt                           # for LLM crawlers
├── src/
│   ├── styles/
│   │   ├── atrium.tokens.css          # primitive + semantic + component tokens
│   │   ├── atrium.theme.css           # active theme (default + overrides)
│   │   └── atrium.css                 # @layer setup + base resets
│   └── components/
│       └── atrium/
│           ├── button.css             # ← from registry capsule
│           ├── button.html.njk        # ← from registry capsule (only chosen template)
│           ├── button.cem.json        # ← from registry capsule
│           └── button.evidence.json   # ← from registry capsule
└── package.json
```

The consumer chooses which templates to install (`atrium add button --templates twig,njk`); by default the canonical Nunjucks template is included.

## File contents (worked)

### `button.css`

```css
@layer atrium.components {
  @scope (.atrium-button) {
    :scope {
      display: inline-flex;
      align-items: center;
      gap: var(--atrium-space-2);

      padding-block: var(--atrium-button-padding-y, var(--atrium-space-2));
      padding-inline: var(--atrium-button-padding-x, var(--atrium-space-4));

      border: 1px solid transparent;
      border-radius: var(--atrium-button-radius, var(--atrium-radius-md));

      font: inherit;
      font-weight: 600;
      line-height: var(--atrium-line-height-tight);

      cursor: pointer;
      user-select: none;

      transition: background-color 120ms ease;
    }

    :scope:focus-visible {
      outline: var(--atrium-focus-ring-width, 2px) solid
        var(--atrium-focus-ring-color);
      outline-offset: var(--atrium-focus-ring-offset, 2px);
    }

    :scope[data-variant="primary"] {
      background: var(--atrium-color-action-primary-bg);
      color: var(--atrium-color-action-primary-fg);
    }

    :scope[data-variant="primary"]:hover:not([disabled]) {
      background: var(--atrium-color-action-primary-bg-hover);
    }

    :scope[disabled] {
      opacity: 0.6;
      cursor: not-allowed;
    }

    :scope[aria-busy="true"] {
      cursor: wait;
    }
  }
}

@media (forced-colors: active) {
  .atrium-button {
    border: 1px solid ButtonText;
  }
  .atrium-button[data-variant="primary"] {
    background: ButtonText;
    color: ButtonFace;
  }
  .atrium-button:focus-visible {
    outline: 2px solid Highlight;
  }
}
```

### `button.html.njk`

```nunjucks
{# button.html.njk #}
{% set variant = variant|default('primary') %}
{% set size = size|default('md') %}
{% set type = type|default('button') %}

<button
  class="atrium-button"
  data-variant="{{ variant }}"
  data-size="{{ size }}"
  type="{{ type }}"
  {% if disabled %}disabled{% endif %}
  {% if loading %}aria-busy="true"{% endif %}
  {% if aria_label %}aria-label="{{ aria_label }}"{% endif %}
>
  {% if icon_start %}
    <span class="atrium-button__icon-start" aria-hidden="true">{{ icon_start|safe }}</span>
  {% endif %}
  {{ label|default('Submit') }}
  {% if icon_end %}
    <span class="atrium-button__icon-end" aria-hidden="true">{{ icon_end|safe }}</span>
  {% endif %}
</button>
```

### `button.html.twig`

```twig
{# button.html.twig — equivalent of button.html.njk for Drupal/Symfony #}
{% set variant = variant|default('primary') %}
{% set size = size|default('md') %}
{% set type = type|default('button') %}

<button
  class="atrium-button"
  data-variant="{{ variant }}"
  data-size="{{ size }}"
  type="{{ type }}"
  {% if disabled %}disabled{% endif %}
  {% if loading %}aria-busy="true"{% endif %}
  {% if aria_label %}aria-label="{{ aria_label }}"{% endif %}
>
  {% if icon_start %}
    <span class="atrium-button__icon-start" aria-hidden="true">{{ icon_start|raw }}</span>
  {% endif %}
  {{ label|default('Submit') }}
  {% if icon_end %}
    <span class="atrium-button__icon-end" aria-hidden="true">{{ icon_end|raw }}</span>
  {% endif %}
</button>
```

Identical DOM contract; different template syntax.

### `button.html` (plain reference)

```html
<button class="atrium-button" data-variant="primary" type="button">
  Apply
</button>
```

### `button.cem.json`

See [`button.cem.json`](./button.cem.json) for the full extended CEM example.

### `button.codemods.yaml`

```yaml
- id: button-rename-color-prop
  from: 1.1.x
  to: 1.2.x
  language: [tsx, jsx, vue, svelte, astro, html, twig, njk, jinja, erb]
  rule:
    pattern: <atrium-button color="$VAL">
  fix: <atrium-button variant="$VAL">
  message: "color prop renamed to variant in 1.2.0"
  confirm: false

- id: button-deprecate-rounded-class
  from: 1.0.x
  to: 1.1.x
  language: [tsx, jsx, html, twig]
  rule:
    pattern: class="$P atrium-button--rounded $S"
  fix: class="$P $S"
  note: "atrium-button--rounded class removed; use --atrium-button-radius CSS variable instead"
  confirm: true
```

### `button.lock.json`

```json
{
  "name": "button",
  "version": "1.2.3",
  "tier": "primitive",
  "layer": "L0",
  "stability": "stable",
  "files": {
    "button.css": "sha256:def4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3cde",
    "button.html.njk": "sha256:ghi4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3cgh",
    "button.cem.json": "sha256:jkl4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3cjk",
    "button.evidence.json": "sha256:mno4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3cmn"
  },
  "capsule_hash": "sha256:abc4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3cab",
  "signature": "sigstore:MEUCIAyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyy",
  "dependencies": {
    "tokens": [
      "color.action.primary.bg",
      "color.action.primary.fg",
      "color.action.primary.bg-hover",
      "color.focus.ring",
      "button.radius"
    ],
    "capsules": []
  },
  "templates": ["html", "njk", "twig", "jinja", "erb"],
  "frameworks": ["react", "vue", "svelte", "solid", "element"]
}
```

## L1 capsule additions (Combobox example sketch)

For an L1 capsule, additional files appear:

```
combobox/
├── combobox.css
├── combobox.html.njk          # initial-state HTML for SSR
├── combobox.html.twig
├── combobox.element.ts        # Lit custom element shell (~120 lines)
├── combobox.machine.ts        # Zag statechart (~250 lines)
├── combobox.signals.ts        # signal definitions (~40 lines)
├── combobox.cem.json
├── combobox.evidence.json
├── combobox.codemods.yaml
├── combobox.test.ts
├── combobox.docs.md
└── combobox.lock.json
```

The `combobox.html.*` templates render the initial closed-state DOM. The custom element (`<atrium-combobox>`) upgrades on the client and resumes from `data-atrium-state` if SSR-resumability is in play.

## References

- [Capsule format spec](../architecture/capsule.md)
- [`button.cem.json`](./button.cem.json) — full extended CEM example
- [`atrium-lock.example.json`](./atrium-lock.example.json) — lockfile example
- [`agency-theme.tokens.json`](./agency-theme.tokens.json) — DTCG agency theme example
