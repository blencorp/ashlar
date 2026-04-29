import { describe, expect, it } from "vitest";
import { auditFederalHtml } from "./federal.js";

describe("federal policy audit", () => {
  it("flags missing page-shell requirements", () => {
    const findings = auditFederalHtml(
      "<html><head></head><body><main></main></body></html>",
      "index.html",
    );

    expect(findings.map((finding) => finding.ruleId)).toEqual([
      "federal/page-title-required",
      "federal/meta-description-required",
      "federal/banner-required",
      "federal/identifier-required",
    ]);
  });

  it("flags short title and meta description values", () => {
    const findings = auditFederalHtml(
      '<html><head><title>Apply</title><meta name="description" content="Short."></head><body><usa-banner></usa-banner></body></html>',
      "index.html",
    );

    expect(findings.map((finding) => finding.ruleId)).toContain("federal/page-title-min-length");
    expect(findings.map((finding) => finding.ruleId)).toContain(
      "federal/meta-description-min-length",
    );
  });

  it("passes a minimal federal page shell", () => {
    const findings = auditFederalHtml(
      `<html>
        <head>
          <title>Apply for federal benefits | Example Agency</title>
          <meta name="description" content="Apply for federal benefits online through this example public-service flow.">
        </head>
        <body>
          <usa-banner></usa-banner>
          <footer class="ashlar-identifier">
            <a href="/about">About Example Agency</a>
            <a href="/accessibility">Accessibility statement</a>
            <a href="/foia">FOIA requests</a>
            <a href="/no-fear-act">No FEAR Act data</a>
            <a href="/oig">Office of Inspector General</a>
            <a href="/performance">Performance reports</a>
            <a href="/privacy">Privacy policy</a>
          </footer>
        </body>
      </html>`,
      "index.html",
    );

    expect(findings).toEqual([]);
  });

  it("flags missing identifier required links", () => {
    const findings = auditFederalHtml(
      `<html>
        <head>
          <title>Apply for federal benefits | Example Agency</title>
          <meta name="description" content="Apply for federal benefits online through this example public-service flow.">
        </head>
        <body>
          <section class="ashlar-banner"></section>
          <footer data-ashlar-component="identifier">
            <a href="/privacy">Privacy policy</a>
          </footer>
        </body>
      </html>`,
      "index.html",
    );

    expect(
      findings.filter((finding) => finding.ruleId === "federal/identifier-required-link-missing"),
    ).toHaveLength(6);
  });

  it("flags a banner that is not near the top of the body", () => {
    const findings = auditFederalHtml(
      `<html>
        <head>
          <title>Apply for federal benefits | Example Agency</title>
          <meta name="description" content="Apply for federal benefits online through this example public-service flow.">
        </head>
        <body>
          <main></main>
          <section></section>
          <aside></aside>
          <section class="ashlar-banner"></section>
        </body>
      </html>`,
      "index.html",
    );

    expect(findings.map((finding) => finding.ruleId)).toContain("federal/banner-required");
  });
});
