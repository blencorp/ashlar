# Tokens

The token system is the framework-neutral contract that drives every other layer of Ashlar. Components reference tokens; agencies override tokens; modes (light/dark/HC/forced) switch through tokens; AI tools query tokens.

Source format: **DTCG 2025.10-shaped** JSON. The current prototype loads stock theme JSON files and emits CSS variables, a Tailwind v4 `@theme` companion file, and typed TypeScript token helpers. The target compiler still includes JSON and design-tool outputs.

> **Status (2026-05-07)**: stock themes live under `packages/cli/themes/*.tokens.json`, `ashlar init` copies those JSON files and writes generated `theme.css`, `tailwind-theme.css`, and `tokens.ts`; `ashlar theme sync` regenerates those outputs from local theme JSON; and `ashlar theme validate` checks schema shape, required source provenance, required semantic token paths, and WCAG AA action contrast in light/dark modes. Tailwind `@theme` output is implemented as a companion stylesheet and is consumed by the Tailwind-enabled Vite example; typed token output is implemented as a generated TypeScript contract; generated `DESIGN.md` exports theme source links for coding agents. See [STATUS.md](../../STATUS.md).

## Hierarchy

Three tiers, plus modes that overlay them.

### Primitive tokens

Raw values. Not consumed directly by components.

```json
{
  "color": {
    "blue": {
      "50":  { "$type": "color", "$value": "oklch(0.97 0.02 250)" },
      "200": { "$type": "color", "$value": "oklch(0.86 0.06 250)" },
      "500": { "$type": "color", "$value": "oklch(0.62 0.18 250)" },
      "700": { "$type": "color", "$value": "oklch(0.42 0.18 250)" },
      "900": { "$type": "color", "$value": "oklch(0.22 0.10 250)" }
    },
    "neutral": { /* ... */ },
    "white":   { "$type": "color", "$value": "oklch(1 0 0)" }
  },
  "space": {
    "1": { "$type": "dimension", "$value": "0.25rem" },
    "2": { "$type": "dimension", "$value": "0.5rem" },
    "4": { "$type": "dimension", "$value": "1rem" }
  },
  "radius": {
    "control": { "$type": "dimension", "$value": "0.25rem" },
    "card": { "$type": "dimension", "$value": "0.375rem" },
    "panel": { "$type": "dimension", "$value": "0.5rem" }
  },
  "type": {
    "size": {
      "100": { "$type": "dimension", "$value": "0.875rem" },
      "200": { "$type": "dimension", "$value": "1rem" }
    }
  }
}
```

`oklch()` is preferred for colors: perceptually uniform, smooth gradients, predictable lightness scale.

### Semantic tokens

Express product intent. Resolved through aliases to primitives. Components mostly consume these.

```json
{
  "color": {
    "text": {
      "default":  { "$type": "color", "$value": "{color.neutral.900}" },
      "muted":    { "$type": "color", "$value": "{color.neutral.600}" },
      "inverse":  { "$type": "color", "$value": "{color.white}" }
    },
    "surface": {
      "default":  { "$type": "color", "$value": "{color.white}" },
      "raised":   { "$type": "color", "$value": "{color.neutral.50}" },
      "subtle":   { "$type": "color", "$value": "{color.neutral.100}" }
    },
    "action": {
      "primary": {
        "bg":         { "$type": "color", "$value": "{color.blue.700}" },
        "fg":         { "$type": "color", "$value": "{color.white}" },
        "bg-hover":   { "$type": "color", "$value": "{color.blue.900}" }
      }
    },
    "status": {
      "error":   { "fg": "...", "bg": "..." },
      "warning": { "fg": "...", "bg": "..." },
      "success": { "fg": "...", "bg": "..." },
      "info":    { "fg": "...", "bg": "..." }
    }
  },
  "focus": {
    "ring": {
      "color":  { "$type": "color", "$value": "{color.blue.500}" },
      "width":  { "$type": "dimension", "$value": "2px" },
      "offset": { "$type": "dimension", "$value": "2px" }
    }
  }
}
```

### Component tokens

Specific to a single component. Consumers can override per-component without affecting global semantics.

```json
{
  "component": {
    "button": {
      "radius": { "$type": "dimension", "$value": "{radius.control}" },
      "minBlockSize": { "$type": "dimension", "$value": "2.75rem" }
    }
  }
}
```

Component tokens should be limited. Too many create theme chaos.

### Modes

Modes overlay the same hierarchy with overrides. Implemented in CSS via `light-dark()` and class/attribute scopes for non-binary modes.

```json
{
  "color": {
    "surface": {
      "default": {
        "$type": "color",
        "$value": "{color.white}",
        "$extensions": {
          "modes": {
            "dark":          "{color.neutral.900}",
            "high-contrast": "Canvas"
          }
        }
      }
    }
  }
}
```

## Output: CSS variables

Compiler emits `tokens.css`, `theme.css`, and mode-overlay files in cascade layers:

```css
@layer ashlar.tokens {
  :root {
    --ashlar-color-text-default:
      light-dark(oklch(0.22 0.05 260), oklch(0.96 0.02 260));
    --ashlar-color-surface-default:
      light-dark(white, oklch(0.18 0.02 260));
    --ashlar-color-action-primary-bg:
      light-dark(oklch(0.42 0.18 250), oklch(0.62 0.18 250));
    --ashlar-color-action-primary-fg: white;
    --ashlar-radius-control: 0.25rem;
    --ashlar-focus-ring-color:
      light-dark(oklch(0.62 0.18 250), oklch(0.78 0.18 250));
  }

  /* Forced colors (Windows High Contrast / accessibility tools) */
  @media (forced-colors: active) {
    :root {
      --ashlar-color-text-default: CanvasText;
      --ashlar-color-surface-default: Canvas;
      --ashlar-color-action-primary-bg: ButtonText;
      --ashlar-color-action-primary-fg: ButtonFace;
      --ashlar-focus-ring-color: Highlight;
    }
  }
}
```

`light-dark()` is Baseline; the browser resolves based on `color-scheme` and `prefers-color-scheme`. No JavaScript required for theme switching.

## Output: Tailwind v4 `@theme`

```css
@theme {
  --color-ashlar-text-default: var(--ashlar-color-text-default);
  --color-ashlar-surface-default: var(--ashlar-color-surface-default);
  --color-ashlar-action-primary-bg: var(--ashlar-color-action-primary-bg);
  --radius-ashlar-control: var(--ashlar-radius-control);
}
```

Tailwind users get utility classes (`bg-ashlar-action-primary-bg`, `rounded-ashlar-control`) backed by Ashlar tokens. Ashlar components themselves continue to use the underlying CSS variables.

## Output: TypeScript

```ts
// tokens.ts (generated)
export const ashlarTokenPaths = [
  "color.action.primary.bg",
  "color.text.default",
] as const;

export type AshlarTokenPath = (typeof ashlarTokenPaths)[number];

export const ashlarTokenCssVariables = {
  "color.action.primary.bg": "--ashlar-color-action-primary-bg",
  "color.text.default": "--ashlar-color-text-default",
} as const satisfies Record<AshlarTokenPath, `--${string}`>;

export const ashlarTokenVars = {
  "color.action.primary.bg": "var(--ashlar-color-action-primary-bg)",
  "color.text.default": "var(--ashlar-color-text-default)",
} as const satisfies Record<AshlarTokenPath, `var(--${string})`>;
```

Used for IntelliSense in component code and in consumer applications.

## Agency theme contract

Agency themes extend the default theme by overriding allowed tokens. The target theme schema validates that:

- Public source provenance is present for every theme. Each source must include a label, HTTPS URL, and note explaining which tokens or constraints it supports.
- Required semantic tokens are present.
- Aliases resolve.
- Color values parse.
- Critical contrast pairs meet AA (text/surface, action-fg/action-bg, error-fg/error-bg).
- Forced-colors fallbacks exist for interactive controls.
- Dark mode is complete if declared.

```json
{
  "$schema": "https://ashlar.dev/schemas/theme.schema.json",
  "name": "example-agency",
  "extends": "ashlar/default",
  "tokens": {
    "color.brand.primary": { "$type": "color", "$value": "oklch(0.42 0.12 250)" },
    "color.action.primary.bg": { "$type": "color", "$value": "{color.brand.primary}" }
  },
  "modes": {
    "dark": {
      "color.brand.primary": { "$type": "color", "$value": "oklch(0.72 0.14 250)" }
    }
  },
  "contrastPairs": [
    ["color.action.primary.fg", "color.action.primary.bg", "AA"],
    ["color.text.default", "color.surface.default", "AA"]
  ]
}
```

Current `ashlar theme validate` enforces schema validity, required semantic token paths, alias resolution for those paths, and AA contrast for primary and secondary action foreground/background pairs. Current `ashlar theme sync` regenerates CSS variables, Tailwind `@theme` output, and typed TypeScript token helpers from local theme JSON. The broader compiler contract above remains the target for slice 6 completion.

Stock source provenance is intentionally narrow:

- `default` cites USWDS color guidance, USWDS system color tokens, and USWDS font tokens.
- `va` cites the VA.gov color palette and VA.gov typography foundation pages.
- `usda` cites USDA Design and Brand Plays plus USWDS color guidance, because USDA explicitly anchors logo colors while directing broader interface palettes back to USWDS colors.

## Contrast policy

Required contrast pairs are declared in the theme manifest. The compiler fails on critical violations:

- Text on surface: AA (4.5:1)
- Body text on surface: AA (4.5:1)
- Action foreground on action background: AA
- Error/warning/success foreground on their backgrounds: AA
- Focus ring on adjacent surfaces: AA

Optional pairs (e.g., decorative text) emit warnings, not errors.

## Density

Tokens support optional density scaling for content-heavy versus marketing surfaces:

- `comfortable` (default)
- `compact` (admin tools, data-dense interfaces)
- `spacious` (low-literacy flows, marketing pages)

Density affects spacing and control height tokens; it does **not** reduce touch targets below WCAG minimums (24×24 CSS px on mobile).

## USWDS interop mapping

For agencies migrating from USWDS, a mapping layer converts USWDS Sass settings to Ashlar semantic tokens. Best-effort, not guaranteed visual equivalence.

```
$theme-color-primary       →  color.brand.primary
$theme-color-primary-dark  →  color.brand.primary-emphasized
$theme-font-type-sans      →  font.sans
$theme-button-border-radius → button.radius
```

## References

- [ADR 0003 — Token source](../adr/adr-0003-token-source.md)
- [ADR 0004 — CSS strategy](../adr/adr-0004-css-strategy.md)
- DTCG 2025.10 first stable: https://www.w3.org/community/design-tokens/2025/10/28/design-tokens-specification-reaches-first-stable-version/
- Terrazzo DTCG: https://terrazzo.app/docs/guides/dtcg/
- `light-dark()` — MDN: https://developer.mozilla.org/en-US/docs/Web/CSS/color_value/light-dark
- Forced colors — MDN: https://developer.mozilla.org/en-US/docs/Web/CSS/@media/forced-colors
