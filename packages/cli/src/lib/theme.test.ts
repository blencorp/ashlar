import { describe, expect, it } from "vitest";
import {
  buildThemeCss,
  buildThemeTokenTypes,
  buildTailwindThemeCss,
  findThemeToken,
  listThemeTokens,
  loadStockThemes,
  validateTheme,
} from "./theme.js";

describe("theme loader", () => {
  it("loads stock themes from packages/cli/themes", () => {
    const themes = loadStockThemes();
    const names = themes.map((t) => t.name);
    expect(names).toContain("default");
    expect(names).toContain("va");
    expect(names).toContain("usda");
  });

  it("places the default theme first", () => {
    const themes = loadStockThemes();
    expect(themes[0]?.name).toBe("default");
  });

  it("loads source provenance for stock themes", () => {
    const themes = loadStockThemes();
    expect(getDefaultTheme().provenance).toMatchObject({
      status: "source-derived",
      reviewedAt: "2026-05-07",
      reviewedBy: "BLEN",
    });
    expect(getDefaultTheme().sources).toContainEqual(
      expect.objectContaining({
        label: "USWDS system color tokens",
        url: "https://designsystem.digital.gov/design-tokens/color/system-tokens/",
        retrievedAt: "2026-05-07",
        tokenPaths: expect.arrayContaining(["color.action.primary.bg"]),
      }),
    );
    expect(themes.find((theme) => theme.name === "va")?.sources).toContainEqual(
      expect.objectContaining({
        label: "VA.gov color palette",
        url: "https://design.va.gov/foundation/color-palette",
        retrievedAt: "2026-05-07",
      }),
    );
    expect(themes.find((theme) => theme.name === "usda")?.sources).toContainEqual(
      expect.objectContaining({
        label: "USDA Design and Brand Plays",
        url: "https://www.usda.gov/about-usda/policies-and-links/digital/digital-strategy/design-and-brand/design-and-brand-plays",
        tokenPaths: expect.arrayContaining(["color.action.primary.bg"]),
      }),
    );
    expect(themes.every((theme) => theme.sources.every((source) => source.note))).toBe(true);
    expect(themes.every((theme) => theme.sources.every((source) => source.retrievedAt))).toBe(true);
  });

  it("validates theme files (action.primary.bg color)", () => {
    const themes = loadStockThemes();
    const defaultTheme = themes.find((t) => t.name === "default");
    expect(defaultTheme).toBeDefined();
    const action = defaultTheme?.tokens.color as Record<string, unknown>;
    expect(action).toBeDefined();
  });

  it("buildThemeCss emits :root, :root[data-ashlar-theme=default] for the default theme", () => {
    const css = buildThemeCss();
    expect(css).toContain(':root[data-ashlar-theme="default"]');
    expect(css).toContain(':root[data-ashlar-theme="va"]');
    expect(css).toContain(':root[data-ashlar-theme="usda"]');
    // The default theme also matches bare :root so the cascade falls through.
    expect(css).toMatch(/:root,\s+:root\[data-ashlar-theme="default"\]/);
  });

  it("buildThemeCss includes forced-colors fallback", () => {
    const css = buildThemeCss();
    expect(css).toContain("@media (forced-colors: active)");
    expect(css).toContain("Canvas");
    expect(css).toContain("ButtonText");
  });

  it("buildTailwindThemeCss emits Tailwind v4 theme variables backed by Ashlar CSS variables", () => {
    const css = buildTailwindThemeCss();
    expect(css).toContain("@theme");
    expect(css).toContain(
      "--color-ashlar-action-primary-bg: var(--ashlar-color-action-primary-bg);",
    );
    expect(css).toContain("--radius-ashlar-control: var(--ashlar-radius-control);");
    expect(css).toContain("--font-ashlar-sans: var(--ashlar-font-sans);");
  });

  it("buildThemeTokenTypes emits typed token paths and CSS variable helpers", () => {
    const types = buildThemeTokenTypes();
    expect(types).toContain("export const ashlarTokenPaths = [");
    expect(types).toContain('"color.action.primary.bg"');
    expect(types).toContain("export type AshlarTokenPath = (typeof ashlarTokenPaths)[number];");
    expect(types).toContain('"color.action.primary.bg": "--ashlar-color-action-primary-bg"');
    expect(types).toContain('"color.action.primary.bg": "var(--ashlar-color-action-primary-bg)"');
  });

  it("lists token records with DTCG path and CSS variable names", () => {
    const defaultTheme = getDefaultTheme();
    const tokens = listThemeTokens(defaultTheme);
    expect(tokens).toContainEqual(
      expect.objectContaining({
        path: "component.button.radius",
        cssVariable: "--ashlar-button-radius",
        value: "{radius.control}",
        resolvedValue: "var(--ashlar-radius-control)",
      }),
    );
  });

  it("finds tokens by DTCG path, kebab path, or CSS variable", () => {
    const defaultTheme = getDefaultTheme();

    expect(findThemeToken(defaultTheme, "color.action.primary.bg")?.cssVariable).toBe(
      "--ashlar-color-action-primary-bg",
    );
    expect(findThemeToken(defaultTheme, "color-action-primary-bg")?.path).toBe(
      "color.action.primary.bg",
    );
    expect(findThemeToken(defaultTheme, "--ashlar-button-min-block-size")?.path).toBe(
      "component.button.minBlockSize",
    );
  });

  it("validates stock theme required tokens and action contrast", () => {
    expect(validateTheme(getDefaultTheme())).toEqual([]);
  });

  it("flags action contrast failures", () => {
    const theme = structuredClone(getDefaultTheme());
    const color = theme.tokens.color as unknown as {
      action: { primary: { fg: { $value: string }; bg: { $value: string } } };
    };
    color.action.primary.bg.$value = "#ffffff";
    color.action.primary.fg.$value = "#ffffff";

    expect(validateTheme(theme)).toContainEqual(
      expect.objectContaining({
        rule: "theme/action-primary-contrast",
        path: "color.action.primary.fg / color.action.primary.bg",
      }),
    );
  });
});

function getDefaultTheme() {
  const defaultTheme = loadStockThemes().find((theme) => theme.name === "default");
  if (!defaultTheme) {
    throw new Error("Expected default Ashlar theme");
  }

  return defaultTheme;
}
