import { describe, expect, it } from "vitest";
import { buildThemeCss, loadStockThemes } from "./theme.js";

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
});
