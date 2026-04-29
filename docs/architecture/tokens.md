# Tokens

The token system is the framework-neutral contract that drives every other layer of Atrium. Components reference tokens; agencies override tokens; modes (light/dark/HC/forced) switch through tokens; AI tools query tokens.

Source format: **DTCG 2025.10** JSON. Compiler: **Terrazzo**. Outputs: CSS variables, Tailwind v4 `@theme` block, typed TypeScript, JSON, Figma variables.

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
    "sm": { "$type": "dimension", "$value": "0.25rem" },
    "md": { "$type": "dimension", "$value": "0.375rem" },
    "lg": { "$type": "dimension", "$value": "0.5rem" }
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
  "button": {
    "primary": {
      "bg":     { "$type": "color", "$value": "{color.action.primary.bg}" },
      "fg":     { "$type": "color", "$value": "{color.action.primary.fg}" },
      "radius": { "$type": "dimension", "$value": "{radius.md}" }
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
@layer atrium.tokens {
  :root {
    --atrium-color-text-default:
      light-dark(oklch(0.22 0.05 260), oklch(0.96 0.02 260));
    --atrium-color-surface-default:
      light-dark(white, oklch(0.18 0.02 260));
    --atrium-color-action-primary-bg:
      light-dark(oklch(0.42 0.18 250), oklch(0.62 0.18 250));
    --atrium-color-action-primary-fg: white;
    --atrium-radius-md: 0.375rem;
    --atrium-focus-ring-color:
      light-dark(oklch(0.62 0.18 250), oklch(0.78 0.18 250));
  }

  /* Forced colors (Windows High Contrast / accessibility tools) */
  @media (forced-colors: active) {
    :root {
      --atrium-color-text-default: CanvasText;
      --atrium-color-surface-default: Canvas;
      --atrium-color-action-primary-bg: ButtonText;
      --atrium-color-action-primary-fg: ButtonFace;
      --atrium-focus-ring-color: Highlight;
    }
  }
}
```

`light-dark()` is Baseline; the browser resolves based on `color-scheme` and `prefers-color-scheme`. No JavaScript required for theme switching.

## Output: Tailwind v4 `@theme`

```css
@theme {
  --color-atrium-text-default: var(--atrium-color-text-default);
  --color-atrium-surface-default: var(--atrium-color-surface-default);
  --color-atrium-action-primary: var(--atrium-color-action-primary-bg);
  --radius-atrium-md: var(--atrium-radius-md);
}
```

Tailwind users get utility classes (`bg-atrium-action-primary`, `rounded-atrium-md`) backed by Atrium tokens. Atrium components themselves continue to use the underlying CSS variables.

## Output: TypeScript

```ts
// tokens.ts (generated)
export const tokens = {
  color: {
    text: {
      default: 'var(--atrium-color-text-default)' as const,
      muted: 'var(--atrium-color-text-muted)' as const
    },
    action: {
      primary: {
        bg: 'var(--atrium-color-action-primary-bg)' as const
      }
    }
  }
} as const;

export type TokenName =
  | 'color.text.default'
  | 'color.action.primary.bg'
  // ... auto-generated
```

Used for IntelliSense in component code and in consumer applications.

## Agency theme contract

Agency themes extend the default theme by overriding allowed tokens. The theme schema validates that:

- Required semantic tokens are present.
- Aliases resolve.
- Color values parse.
- Critical contrast pairs meet AA (text/surface, action-fg/action-bg, error-fg/error-bg).
- Forced-colors fallbacks exist for interactive controls.
- Dark mode is complete if declared.

```json
{
  "$schema": "https://atrium.dev/schemas/theme.schema.json",
  "name": "example-agency",
  "extends": "atrium/default",
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

`atrium theme validate` enforces all of the above.

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

For agencies migrating from USWDS, a mapping layer converts USWDS Sass settings to Atrium semantic tokens. Best-effort, not guaranteed visual equivalence.

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
