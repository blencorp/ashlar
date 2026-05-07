# Ashlar Vite Example

Public-service Vite reference app for Ashlar. Demonstrates:

- markup primitive Button capsule (`<button class="ashlar-button">`) installed via `ashlar add`.
- Public-service page-shell compliance (banner, identifier with required links, ≥20-char page title, ≥50-char meta description).
- Live runtime switching across the **Default**, **VA**, and **USDA** stock agency themes.
- Light, dark, and system color modes.
- Live token introspection — see resolved CSS custom-property values change as themes switch.
- Tailwind v4 consumption of `src/ashlar/themes/tailwind-theme.css`, proving Ashlar tokens generate usable utility classes without making Tailwind the component authoring layer.

The page is data-driven: themes are discovered automatically from `src/ashlar/themes/*.tokens.json`. Drop a new agency theme JSON into `packages/cli/themes/` (upstream) and re-run `ashlar init` and the picker grows. No code changes required.

## Run it

From the repo root:

```bash
pnpm install
pnpm --filter @blen/ashlar-cli build       # build the CLI once so `ashlar` is callable
pnpm --filter @blen/ashlar-example-vite dev
```

Open <http://127.0.0.1:4173/>.

## Run the audit

From this directory:

```bash
pnpm exec ashlar audit --policy all --registry ../../registry --explain index.html
```

Runs the public-service page-shell rules and the component anti-pattern rules together. The page passes with zero findings; if it ever stops passing, the example regressed.

## Build for production

```bash
pnpm --filter @blen/ashlar-example-vite build
```

Outputs to `dist/`. Static HTML + CSS + a small JS bundle.

The production build uses `@tailwindcss/vite`; if Ashlar's generated `@theme`
output breaks, this build fails or the `tailwind-theme.test.ts` proof catches the
missing token utilities.

## How this example was created

For reference. The generated files are committed; you do not need to re-run init/add to use the example.

```bash
# 1. Scaffold a Vite project
cd examples
pnpm create vite@latest vite --template vanilla-ts
cd vite

# 2. Make it a workspace package and add @blen/ashlar-cli as a devDep
#    (see this directory's package.json)

# 3. Initialize Ashlar
pnpm exec ashlar init --registry ../../registry --force
#    → writes ashlar.config.json, ashlar-lock.json, agency theme JSON files,
#      a generated theme.css, AGENTS.md, DESIGN.md, src/ashlar/ashlar.css.

# 4. Install the Button capsule
pnpm exec ashlar add button
#    → copies button.css + button.html + button.cem.json + button.evidence.json
#      into src/ashlar/components/button/, hashes them in ashlar-lock.json,
#      regenerates ashlar.css and the indexes.

# 5. Replace the scaffold's example index.html / main.ts / styles with the
#    public-service shell versions in this directory.

# 6. Verify
pnpm exec ashlar audit --policy all --registry ../../registry index.html
pnpm exec ashlar theme sync
pnpm --filter @blen/ashlar-example-vite build
```

## Adding a new agency theme

Themes live as DTCG JSON files. To add a new agency:

1. Create `packages/cli/themes/<agency>.tokens.json` matching the
   [`agency-theme.schema.json`](../../packages/schemas/src/agency-theme.schema.json) contract.
2. Run `pnpm --filter @blen/ashlar-cli build` and `pnpm exec ashlar init --force` from this example.
3. The picker will list the new theme automatically.

The CLI validates every theme file against the schema before compilation, so a malformed theme fails loudly rather than producing broken CSS.

## What changes when you switch themes

`<html data-ashlar-theme>` cascades through:

- `--ashlar-color-action-primary-bg` — Button background, eyebrow color, identifier link color.
- `--ashlar-color-focus` — Focus rings on radio controls and identifier links.
- `--ashlar-color-surface*` — Card backgrounds, banner background, control backgrounds.
- `--ashlar-color-border` — All semantic borders.
- `--ashlar-button-radius` — Button corner radius (USDA softens it; Default and VA stay tight).
- `--ashlar-font-sans` — VA prefers Source Sans 3; Default and USDA prefer Public Sans.

`<html data-ashlar-mode>` cascades through:

- `light` — Force light palette regardless of OS preference.
- `dark` — Force dark palette regardless of OS preference.
- `system` — Follow `prefers-color-scheme`. Dark-mode tokens kick in via a media query in the generated `theme.css`.

`@media (forced-colors: active)` mappings keep Windows High Contrast Mode usable.

## Disclaimers

- Default, VA, and USDA are source-derived theme examples with reviewed provenance metadata and source retrieval dates. They are not official agency design specifications; real agency adoption should replace or extend tokens from the agency's authoritative brand source.
- Ashlar is independent open-source research and is not affiliated with USWDS, GSA, the U.S. federal government, the Department of Veterans Affairs, or the Department of Agriculture.
