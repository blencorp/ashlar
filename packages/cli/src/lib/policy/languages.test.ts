import { describe, expect, it } from "vitest";
import {
  isSupported,
  languageForExtension,
  languageForFile,
  languageSupport,
  supportedFirstPartyLanguages,
  unsupportedReason,
} from "./languages.js";

describe("language support matrix", () => {
  it("declares html, tsx, jsx, css as first-party", () => {
    expect(supportedFirstPartyLanguages).toEqual(
      expect.arrayContaining(["html", "tsx", "jsx", "css"]),
    );
  });

  it("declares twig, jinja, nunjucks as unsupported with a reason", () => {
    for (const language of ["twig", "jinja", "nunjucks"]) {
      const support = languageSupport[language];
      expect(support).toBeDefined();
      expect(support?.status).toBe("unsupported");
      expect(unsupportedReason(language)).toMatch(/grammar/i);
    }
  });

  it("declares vue, svelte, astro, erb as opt-in-with-grammar", () => {
    for (const language of ["vue", "svelte", "astro", "erb"]) {
      expect(languageSupport[language]?.status).toBe("opt-in-with-grammar");
    }
  });

  it("isSupported returns true for first-party languages with empty config", () => {
    const noLanguagesConfigured = new Set<string>();
    expect(isSupported("html", noLanguagesConfigured)).toBe(true);
    expect(isSupported("tsx", noLanguagesConfigured)).toBe(true);
    expect(isSupported("jsx", noLanguagesConfigured)).toBe(true);
    expect(isSupported("css", noLanguagesConfigured)).toBe(true);
  });

  it("isSupported returns false for opt-in languages without configuration", () => {
    const noLanguagesConfigured = new Set<string>();
    expect(isSupported("vue", noLanguagesConfigured)).toBe(false);
    expect(isSupported("svelte", noLanguagesConfigured)).toBe(false);
  });

  it("isSupported returns true for opt-in languages with configuration", () => {
    const configured = new Set<string>(["vue"]);
    expect(isSupported("vue", configured)).toBe(true);
    expect(isSupported("svelte", configured)).toBe(false);
  });

  it("isSupported returns false for unsupported languages even when configured", () => {
    const configured = new Set<string>(["twig"]);
    expect(isSupported("twig", configured)).toBe(false);
  });

  it("languageForExtension maps common extensions correctly", () => {
    expect(languageForExtension("html")).toBe("html");
    expect(languageForExtension(".tsx")).toBe("tsx");
    expect(languageForExtension("ts")).toBe("tsx");
    expect(languageForExtension("jsx")).toBe("jsx");
    expect(languageForExtension("njk")).toBe("nunjucks");
    expect(languageForExtension("twig")).toBe("twig");
    expect(languageForExtension("xyz")).toBeUndefined();
  });

  it("languageForFile uses the file extension", () => {
    expect(languageForFile("/path/to/index.html")).toBe("html");
    expect(languageForFile("Component.tsx")).toBe("tsx");
    expect(languageForFile("README")).toBeUndefined();
  });
});
