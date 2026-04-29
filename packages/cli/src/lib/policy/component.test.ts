import { describe, expect, it } from "vitest";
import { auditFile, compileToNapiConfig, type ComponentAntiPattern } from "./component.js";

const buttonIconOnly: ComponentAntiPattern = {
  id: "icon-only-needs-label",
  pattern: "<button $$$ATTRS>$$$CHILDREN</button>",
  regex: 'class="[^"]*\\bashlar-button\\b',
  has: { pattern: "<svg $$$></svg>", stopBy: "end" },
  not: { regex: "aria-label\\s*=" },
  message: "Icon-only Ashlar Button requires aria-label (WCAG 4.1.2).",
  fix: "Add visible text or aria-label.",
  wcag: "4.1.2",
  severity: "error",
  languages: ["html"],
};

describe("compileToNapiConfig", () => {
  it("translates a CEM antiPattern into ast-grep NapiConfig with default stopBy", () => {
    const config = compileToNapiConfig(buttonIconOnly) as { rule: Record<string, unknown> };

    expect(config.rule.pattern).toBe("<button $$$ATTRS>$$$CHILDREN</button>");
    expect(config.rule.regex).toBe('class="[^"]*\\bashlar-button\\b');
    expect(config.rule.has).toEqual({ pattern: "<svg $$$></svg>", stopBy: "end" });
    expect(config.rule.not).toEqual({ regex: "aria-label\\s*=" });
  });
});

describe("auditFile", () => {
  const rules = [
    {
      componentName: "button",
      componentVersion: "0.0.1",
      antiPattern: buttonIconOnly,
    },
  ];

  it("flags an icon-only button without aria-label", () => {
    const html = `<button class="ashlar-button"><svg aria-hidden="true"></svg></button>`;
    const findings = auditFile(html, "page.html", {
      rules,
      configuredLanguages: new Set(),
    });

    expect(findings).toHaveLength(1);
    expect(findings[0]?.ruleId).toBe("ashlar/button/icon-only-needs-label");
    expect(findings[0]?.tags).toContain("wcag-4.1.2");
    expect(findings[0]?.region).toEqual({
      startLine: 1,
      startColumn: 1,
      endLine: 1,
      endColumn: html.length + 1,
    });
  });

  it("does not flag an icon-only button when aria-label is present", () => {
    const html = `<button class="ashlar-button" aria-label="Open"><svg aria-hidden="true"></svg></button>`;
    const findings = auditFile(html, "page.html", {
      rules,
      configuredLanguages: new Set(),
    });
    expect(findings).toHaveLength(0);
  });

  it("does not flag a button without an Ashlar class", () => {
    const html = `<button class="custom-button"><svg></svg></button>`;
    const findings = auditFile(html, "page.html", {
      rules,
      configuredLanguages: new Set(),
    });
    expect(findings).toHaveLength(0);
  });

  it("returns a language-unsupported finding for Twig", () => {
    const findings = auditFile("{# template #}", "template.twig", {
      rules,
      configuredLanguages: new Set(),
    });

    expect(findings).toHaveLength(1);
    expect(findings[0]?.ruleId).toBe("ashlar/language-unsupported");
    expect(findings[0]?.evidence).toMatch(/grammar/i);
  });

  it("returns no findings (and does not crash) for files with no extension", () => {
    const findings = auditFile("noop", "README", {
      rules,
      configuredLanguages: new Set(),
    });
    expect(findings).toEqual([]);
  });
});
