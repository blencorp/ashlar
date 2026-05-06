import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
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

export type TokenLeaf = {
  $type: string;
  $value: string;
  $description?: string;
};

export type TokenTree = {
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

export type ThemeTokenMode = "light" | "dark";

export type FlattenedThemeToken = {
  theme: string;
  mode: ThemeTokenMode;
  path: string;
  cssVariable: string;
  type: string;
  value: string;
  resolvedValue: string;
  description?: string;
};

export type ThemeValidationFinding = {
  theme: string;
  mode: ThemeTokenMode;
  level: "error" | "warning";
  rule: string;
  message: string;
  path?: string;
  ratio?: number;
  requiredRatio?: number;
};

export type ThemeValidationResult = {
  themes: number;
  findings: ThemeValidationFinding[];
};

const requiredSemanticTokens = [
  "color.page",
  "color.surface",
  "color.border",
  "color.text.default",
  "color.text.muted",
  "color.action.primary.bg",
  "color.action.primary.fg",
  "color.action.primary.hover",
  "color.action.secondary.bg",
  "color.action.secondary.fg",
  "color.action.secondary.border",
  "color.focus",
  "font.sans",
  "radius.control",
  "component.button.radius",
  "component.button.minBlockSize",
  "focus.ring.color",
] as const;

const contrastPairs = [
  {
    id: "action-primary-contrast",
    foreground: "color.action.primary.fg",
    background: "color.action.primary.bg",
    description: "Primary action foreground/background",
  },
  {
    id: "action-secondary-contrast",
    foreground: "color.action.secondary.fg",
    background: "color.action.secondary.bg",
    description: "Secondary action foreground/background",
  },
] as const;

const aaTextContrastRatio = 4.5;

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

export function themeDirectory(config: ResolvedAshlarConfig): string {
  return dirname(config.styles.theme);
}

function isTokenLeaf(value: TokenLeaf | TokenTree): value is TokenLeaf {
  return typeof value === "object" && value !== null && "$value" in value;
}

function normalizeTokenSegment(segment: string): string {
  return segment.replace(/[A-Z]/g, (match) => `-${match.toLowerCase()}`);
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

  return `var(${cssVariableName(alias[1].split(".").map(normalizeTokenSegment))})`;
}

function flattenTokens(tree: TokenTree, path: string[] = []): Array<[string, string]> {
  return Object.entries(tree).flatMap(([key, value]) => {
    const nextPath = [...path, normalizeTokenSegment(key)];

    if (isTokenLeaf(value)) {
      return [[cssVariableName(nextPath), resolveTokenValue(value.$value)]];
    }

    return flattenTokens(value, nextPath);
  });
}

export function listThemeTokens(
  theme: ThemeDefinition,
  mode: ThemeTokenMode = "light",
): FlattenedThemeToken[] {
  const tree = mode === "dark" ? theme.dark : theme.tokens;
  return flattenThemeTokenRecords(tree, theme.name, mode);
}

export function findThemeToken(
  theme: ThemeDefinition,
  path: string,
  mode: ThemeTokenMode = "light",
): FlattenedThemeToken | undefined {
  const normalizedPath = normalizeTokenPath(path);
  const modeToken = listThemeTokens(theme, mode).find((token) =>
    tokenMatchesPath(token, normalizedPath),
  );

  if (modeToken || mode === "light") {
    return modeToken;
  }

  return listThemeTokens(theme, "light").find((token) => tokenMatchesPath(token, normalizedPath));
}

export function validateThemes(themes = loadStockThemes()): ThemeValidationResult {
  const findings = themes.flatMap((theme) => validateTheme(theme));

  return {
    themes: themes.length,
    findings,
  };
}

export function validateTheme(theme: ThemeDefinition): ThemeValidationFinding[] {
  const findings: ThemeValidationFinding[] = [];

  for (const mode of ["light", "dark"] as const) {
    for (const path of requiredSemanticTokens) {
      const value = resolveConcreteTokenValue(theme, path, mode);
      if (!value) {
        findings.push({
          theme: theme.name,
          mode,
          level: "error",
          rule: "theme/required-token",
          path,
          message: `Missing required semantic token: ${path}`,
        });
      }
    }

    for (const pair of contrastPairs) {
      const foreground = resolveConcreteTokenValue(theme, pair.foreground, mode);
      const background = resolveConcreteTokenValue(theme, pair.background, mode);

      if (!foreground || !background) {
        continue;
      }

      const ratio = contrastRatio(foreground, background);
      if (ratio === null) {
        findings.push({
          theme: theme.name,
          mode,
          level: "error",
          rule: "theme/color-format",
          message: `${pair.description} tokens must resolve to hex colors.`,
          path: `${pair.foreground} / ${pair.background}`,
        });
        continue;
      }

      if (ratio < aaTextContrastRatio) {
        findings.push({
          theme: theme.name,
          mode,
          level: "error",
          rule: `theme/${pair.id}`,
          message: `${pair.description} contrast is ${formatRatio(
            ratio,
          )}:1; expected at least ${aaTextContrastRatio}:1.`,
          path: `${pair.foreground} / ${pair.background}`,
          ratio,
          requiredRatio: aaTextContrastRatio,
        });
      }
    }
  }

  return findings;
}

function flattenThemeTokenRecords(
  tree: TokenTree,
  themeName: string,
  mode: ThemeTokenMode,
  rawPath: string[] = [],
  cssPath: string[] = [],
): FlattenedThemeToken[] {
  return Object.entries(tree).flatMap(([key, value]) => {
    const nextRawPath = [...rawPath, key];
    const nextCssPath = [...cssPath, normalizeTokenSegment(key)];

    if (isTokenLeaf(value)) {
      return [
        {
          theme: themeName,
          mode,
          path: nextRawPath.join("."),
          cssVariable: cssVariableName(nextCssPath),
          type: value.$type,
          value: value.$value,
          resolvedValue: resolveTokenValue(value.$value),
          description: value.$description,
        },
      ];
    }

    return flattenThemeTokenRecords(value, themeName, mode, nextRawPath, nextCssPath);
  });
}

function normalizeTokenPath(path: string): string {
  return path
    .replace(/^--ashlar-/, "")
    .split(".")
    .join("-")
    .toLowerCase();
}

function tokenMatchesPath(token: FlattenedThemeToken, normalizedPath: string): boolean {
  return (
    token.path.toLowerCase() === normalizedPath ||
    token.path.split(".").map(normalizeTokenSegment).join("-").toLowerCase() ===
      normalizedPath ||
    token.cssVariable.replace(/^--ashlar-/, "").toLowerCase() === normalizedPath
  );
}

function resolveConcreteTokenValue(
  theme: ThemeDefinition,
  path: string,
  mode: ThemeTokenMode,
  seen = new Set<string>(),
): string | undefined {
  const normalizedPath = path.split(".").map(normalizeTokenSegment).join(".");
  const token =
    findLeafByPath(mode === "dark" ? theme.dark : theme.tokens, normalizedPath) ??
    findLeafByPath(theme.tokens, normalizedPath);

  if (!token) {
    return undefined;
  }

  const alias = token.$value.match(/^\{(.+)\}$/);
  if (!alias?.[1]) {
    return token.$value;
  }

  if (seen.has(alias[1])) {
    return undefined;
  }

  seen.add(alias[1]);
  return resolveConcreteTokenValue(theme, alias[1], mode, seen);
}

function findLeafByPath(tree: TokenTree, normalizedPath: string): TokenLeaf | undefined {
  const segments = normalizedPath.split(".");
  let current: TokenLeaf | TokenTree | undefined = tree;

  for (const segment of segments) {
    if (!current || isTokenLeaf(current)) {
      return undefined;
    }

    const entry: [string, TokenLeaf | TokenTree] | undefined = Object.entries(current).find(
      ([key]) => normalizeTokenSegment(key).toLowerCase() === segment.toLowerCase(),
    );
    current = entry?.[1];
  }

  return current && isTokenLeaf(current) ? current : undefined;
}

function contrastRatio(foreground: string, background: string): number | null {
  const foregroundRgb = parseHexColor(foreground);
  const backgroundRgb = parseHexColor(background);
  if (!foregroundRgb || !backgroundRgb) {
    return null;
  }

  const foregroundLuminance = relativeLuminance(foregroundRgb);
  const backgroundLuminance = relativeLuminance(backgroundRgb);
  const lighter = Math.max(foregroundLuminance, backgroundLuminance);
  const darker = Math.min(foregroundLuminance, backgroundLuminance);

  return (lighter + 0.05) / (darker + 0.05);
}

function parseHexColor(value: string): [number, number, number] | null {
  const hex = value.trim();
  const match = hex.match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i);
  if (!match?.[1]) {
    return null;
  }

  const full =
    match[1].length === 3
      ? match[1]
          .split("")
          .map((char) => `${char}${char}`)
          .join("")
      : match[1];

  return [
    Number.parseInt(full.slice(0, 2), 16),
    Number.parseInt(full.slice(2, 4), 16),
    Number.parseInt(full.slice(4, 6), 16),
  ];
}

function relativeLuminance([red, green, blue]: [number, number, number]): number {
  const [r, g, b] = [red, green, blue].map((channel) => {
    const normalized = channel / 255;
    return normalized <= 0.03928
      ? normalized / 12.92
      : ((normalized + 0.055) / 1.055) ** 2.4;
  });

  return 0.2126 * (r ?? 0) + 0.7152 * (g ?? 0) + 0.0722 * (b ?? 0);
}

function formatRatio(value: number): string {
  return value.toFixed(2);
}

function renderDeclarations(tokens: TokenTree): string {
  return flattenTokens(tokens)
    .map(([name, value]) => `    ${name}: ${value};`)
    .join("\n");
}

function tailwindThemeVariable(token: FlattenedThemeToken): string | undefined {
  const segments = token.path.split(".").map(normalizeTokenSegment);
  const [group, second, third] = segments;

  if (group === "color") {
    return `--color-ashlar-${segments.slice(1).join("-")}`;
  }

  if (group === "radius") {
    return `--radius-ashlar-${segments.slice(1).join("-")}`;
  }

  if (group === "font") {
    return `--font-ashlar-${segments.slice(1).join("-")}`;
  }

  if (group === "elevation") {
    return `--shadow-ashlar-${segments.slice(1).join("-")}`;
  }

  if (group === "focus" && second === "ring" && third === "color") {
    return "--color-ashlar-focus-ring";
  }

  if (group === "focus" && second === "ring") {
    return `--spacing-ashlar-focus-ring-${segments.slice(2).join("-")}`;
  }

  if (group === "component" && second && segments.at(-1) === "radius") {
    return `--radius-ashlar-${second}`;
  }

  if (group === "component" && second && segments.at(-1) === "shadow") {
    return `--shadow-ashlar-${second}`;
  }

  if (group === "component" && second) {
    return `--spacing-ashlar-${[second, ...segments.slice(2)].join("-")}`;
  }

  return undefined;
}

function quote(value: string): string {
  return JSON.stringify(value);
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

export function buildTailwindThemeCss(themes = loadStockThemes()): string {
  const defaultTheme = themes.find((theme) => theme.name === "default") ?? themes[0];
  if (!defaultTheme) {
    throw new Error("Cannot build Tailwind theme without at least one Ashlar theme.");
  }

  const declarations = listThemeTokens(defaultTheme)
    .map((token) => {
      const variable = tailwindThemeVariable(token);
      return variable ? [variable, `var(${token.cssVariable})`] : undefined;
    })
    .filter((item): item is [string, string] => Boolean(item))
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([name, value]) => `  ${name}: ${value};`)
    .join("\n");

  return `/* Generated by ashlar theme sync. Import after theme.css when using Tailwind v4. */\n@theme {\n${declarations}\n}\n`;
}

export function buildThemeTokenTypes(themes = loadStockThemes()): string {
  const defaultTheme = themes.find((theme) => theme.name === "default") ?? themes[0];
  if (!defaultTheme) {
    throw new Error("Cannot build typed tokens without at least one Ashlar theme.");
  }

  const tokens = listThemeTokens(defaultTheme).sort((a, b) => a.path.localeCompare(b.path));
  const paths = tokens.map((token) => `  ${quote(token.path)},`).join("\n");
  const cssVariables = tokens
    .map((token) => `  ${quote(token.path)}: ${quote(token.cssVariable)},`)
    .join("\n");
  const cssVarReferences = tokens
    .map((token) => `  ${quote(token.path)}: ${quote(`var(${token.cssVariable})`)},`)
    .join("\n");

  return `/* Generated by ashlar theme sync. Source tokens live in src/ashlar/themes/*.tokens.json. */\nexport const ashlarTokenPaths = [\n${paths}\n] as const;\n\nexport type AshlarTokenPath = (typeof ashlarTokenPaths)[number];\n\nexport const ashlarTokenCssVariables = {\n${cssVariables}\n} as const satisfies Record<AshlarTokenPath, \`--\${string}\`>;\n\nexport const ashlarTokenVars = {\n${cssVarReferences}\n} as const satisfies Record<AshlarTokenPath, \`var(--\${string})\`>;\n`;
}

/**
 * Copy stock themes into the consumer project as DTCG JSON files alongside the
 * generated CSS outputs. Consumers can edit these JSON files (or add new ones)
 * to customize their agency theme without touching the CLI source.
 */
export function writeThemeFiles(config: ResolvedAshlarConfig, force: boolean): void {
  const themeDir = themeDirectory(config);

  for (const theme of loadStockThemes()) {
    const sourcePath = join(stockThemesDir, `${theme.name}.tokens.json`);
    const sourceContent = readFileSync(sourcePath, "utf8");
    writeFileIfMissing(join(themeDir, `${theme.name}.tokens.json`), sourceContent, force);
  }

  writeThemeCssFromProject(config);
}

export function writeThemeCssFromProject(config: ResolvedAshlarConfig): ThemeValidationResult {
  const themeDir = themeDirectory(config);
  const themes = existsSync(themeDir) ? loadThemes(themeDir) : loadStockThemes();
  const validation = validateThemes(themes);
  const errors = validation.findings.filter((finding) => finding.level === "error");
  if (errors.length > 0) {
    throw new Error(
      `Ashlar theme validation failed:\n${errors
        .map((finding) => `  - ${finding.theme}/${finding.mode} ${finding.rule}: ${finding.message}`)
        .join("\n")}`,
    );
  }

  mkdirSync(themeDir, { recursive: true });
  mkdirSync(dirname(config.styles.tailwindTheme), { recursive: true });
  mkdirSync(dirname(config.styles.tokenTypes), { recursive: true });
  writeFileSync(config.styles.theme, buildThemeCss(themes));
  writeFileSync(config.styles.tailwindTheme, buildTailwindThemeCss(themes));
  writeFileSync(config.styles.tokenTypes, buildThemeTokenTypes(themes));
  return validation;
}
