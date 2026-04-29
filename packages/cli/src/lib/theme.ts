import { readFileSync, readdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { ResolvedAshlarConfig } from "./project.js";
import { writeFileIfMissing } from "./project.js";
import { describeErrors, validate } from "./schema-validate.js";

/**
 * Theme system: themes are JSON files. The CLI ships a stock set under
 * `packages/cli/themes/` (Default, VA, USDA). Adding a new agency theme means
 * dropping a new `<name>.tokens.json` into that directory — no TypeScript
 * changes required. Each file is validated against `agency-theme.schema.json`
 * before compilation.
 *
 * Downstream agency theme registries can ship the same JSON shape and load
 * via the same loader; the discovery path is configurable per call.
 */

type TokenLeaf = {
  $type: string;
  $value: string;
  $description?: string;
};

type TokenTree = {
  [key: string]: TokenLeaf | TokenTree;
};

type AgencyThemeFile = {
  $schema?: string;
  name: string;
  title: string;
  description: string;
  order?: number;
  tokens: TokenTree;
  modes?: {
    dark?: TokenTree;
  };
};

export type ThemeDefinition = {
  name: string;
  title: string;
  description: string;
  order: number;
  tokens: TokenTree;
  dark: TokenTree;
};

const stockThemesDir = (() => {
  const here = dirname(fileURLToPath(import.meta.url));
  // From dist/lib/theme.js  -> ../../themes  -> packages/cli/themes
  // From src/lib/theme.ts   -> ../../themes  -> packages/cli/themes
  return join(here, "..", "..", "themes");
})();

function readJsonThemeFile(absolutePath: string, label: string): ThemeDefinition {
  const raw = JSON.parse(readFileSync(absolutePath, "utf8"));
  const result = validate("agencyTheme", raw);
  if (!result.ok) {
    throw new Error(`Invalid agency theme at ${label}:\n${describeErrors(result)}`);
  }
  const theme = raw as AgencyThemeFile;
  return {
    name: theme.name,
    title: theme.title,
    description: theme.description,
    order: theme.order ?? 100,
    tokens: theme.tokens,
    dark: theme.modes?.dark ?? {},
  };
}

/**
 * Load every `*.tokens.json` file from a themes directory and return the
 * validated, ordered list. The default directory ships the stock themes; any
 * directory with the same shape works for downstream registries.
 */
export function loadThemes(themesDir = stockThemesDir): ThemeDefinition[] {
  let entries: string[];
  try {
    entries = readdirSync(themesDir);
  } catch (error) {
    throw new Error(
      `Could not read Ashlar themes directory at ${themesDir}: ${(error as Error).message}`,
    );
  }
  const files = entries.filter((entry) => entry.endsWith(".tokens.json")).sort();
  if (files.length === 0) {
    throw new Error(`No agency theme files (*.tokens.json) found in ${themesDir}.`);
  }
  return files
    .map((file) => readJsonThemeFile(join(themesDir, file), file))
    .sort((a, b) => a.order - b.order || a.name.localeCompare(b.name));
}

export function loadStockThemes(): ThemeDefinition[] {
  return loadThemes(stockThemesDir);
}

function isTokenLeaf(value: TokenLeaf | TokenTree): value is TokenLeaf {
  return typeof value === "object" && value !== null && "$value" in value;
}

function cssVariableName(path: string[]): string {
  if (path[0] === "component" && path[1]) {
    return `--ashlar-${[path[1], ...path.slice(2)].join("-")}`;
  }

  return `--ashlar-${path.join("-")}`;
}

function resolveTokenValue(value: string): string {
  const alias = value.match(/^\{(.+)\}$/);
  if (!alias?.[1]) {
    return value;
  }

  return `var(${cssVariableName(alias[1].split("."))})`;
}

function flattenTokens(tree: TokenTree, path: string[] = []): Array<[string, string]> {
  return Object.entries(tree).flatMap(([key, value]) => {
    const nextPath = [...path, key.replace(/[A-Z]/g, (match) => `-${match.toLowerCase()}`)];

    if (isTokenLeaf(value)) {
      return [[cssVariableName(nextPath), resolveTokenValue(value.$value)]];
    }

    return flattenTokens(value, nextPath);
  });
}

function renderDeclarations(tokens: TokenTree): string {
  return flattenTokens(tokens)
    .map(([name, value]) => `    ${name}: ${value};`)
    .join("\n");
}

export function buildThemeCss(themes = loadStockThemes()): string {
  const defaultTheme = themes.find((theme) => theme.name === "default") ?? themes[0];
  const defaultName = defaultTheme?.name ?? "default";

  const lightThemes = themes
    .map((theme) => {
      const selector =
        theme.name === defaultName
          ? `  :root,\n  :root[data-ashlar-theme="${theme.name}"]`
          : `  :root[data-ashlar-theme="${theme.name}"]`;

      return `${selector} {\n    color-scheme: light;\n${renderDeclarations(theme.tokens)}\n  }`;
    })
    .join("\n\n");

  const darkThemes = themes
    .map(
      (theme) =>
        `  :root[data-ashlar-theme="${theme.name}"][data-ashlar-mode="dark"] {\n    color-scheme: dark;\n${renderDeclarations(theme.dark)}\n  }`,
    )
    .join("\n\n");

  const systemDarkThemes = themes
    .map(
      (theme) =>
        `    :root[data-ashlar-theme="${theme.name}"][data-ashlar-mode="system"] {\n      color-scheme: dark;\n${renderDeclarations(theme.dark).replace(/^/gm, "  ")}\n    }`,
    )
    .join("\n\n");

  return `/* Generated by ashlar init. Source tokens live in src/ashlar/themes/*.tokens.json. */\n@layer ashlar.tokens {\n${lightThemes}\n\n${darkThemes}\n\n  @media (prefers-color-scheme: dark) {\n${systemDarkThemes}\n  }\n\n  @media (forced-colors: active) {\n    :root,\n    :root[data-ashlar-theme] {\n      --ashlar-color-page: Canvas;\n      --ashlar-color-surface: Canvas;\n      --ashlar-color-surface-raised: Canvas;\n      --ashlar-color-surface-subtle: Canvas;\n      --ashlar-color-border: CanvasText;\n      --ashlar-color-text-default: CanvasText;\n      --ashlar-color-text-muted: CanvasText;\n      --ashlar-color-action-primary-bg: ButtonText;\n      --ashlar-color-action-primary-fg: ButtonFace;\n      --ashlar-color-action-secondary-bg: Canvas;\n      --ashlar-color-action-secondary-fg: LinkText;\n      --ashlar-color-action-secondary-border: LinkText;\n      --ashlar-color-focus: Highlight;\n      --ashlar-focus-ring-color: Highlight;\n      --ashlar-elevation-card: none;\n      --ashlar-elevation-panel: none;\n    }\n  }\n}\n`;
}

/**
 * Copy stock themes into the consumer project as DTCG JSON files alongside the
 * generated `theme.css`. Consumers can edit these JSON files (or add new ones)
 * to customize their agency theme without touching the CLI source.
 */
export function writeThemeFiles(config: ResolvedAshlarConfig, force: boolean): void {
  const themes = loadStockThemes();
  const themeDir = dirname(config.styles.theme);

  for (const theme of themes) {
    const sourcePath = join(stockThemesDir, `${theme.name}.tokens.json`);
    const sourceContent = readFileSync(sourcePath, "utf8");
    writeFileIfMissing(join(themeDir, `${theme.name}.tokens.json`), sourceContent, force);
  }

  writeFileSync(config.styles.theme, buildThemeCss(themes));
}
