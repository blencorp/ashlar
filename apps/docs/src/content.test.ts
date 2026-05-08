import { describe, expect, it } from "vitest";
import { claimBoundary, pages } from "./content";
import { renderGovernmentFlag } from "./flag";
import { components } from "./registry";

describe("docs content model", () => {
  it("covers the first-run adoption path from issue 32", () => {
    expect(pages.map((page) => page.id)).toEqual([
      "install",
      "audit",
      "add",
      "verify-update",
      "themes",
      "testing",
      "ai",
      "trust",
    ]);

    for (const page of pages) {
      expect(page.commands.length).toBeGreaterThanOrEqual(3);
      expect(page.checkpoints.length).toBeGreaterThanOrEqual(3);
    }
  });

  it("keeps public claim boundaries visible", () => {
    expect(claimBoundary.blocked).toContain("USWDS replacement");
    expect(claimBoundary.blocked).toContain("public npm provenance");
    expect(claimBoundary.blocked).toContain("public capsule Sigstore trust");
  });

  it("uses source links that work from a static docs deployment", () => {
    const links = pages.flatMap((page) => page.links.map((link) => link.href));

    expect(links.length).toBeGreaterThan(0);
    expect(links.every((href) => href.startsWith("https://github.com/blencorp/ashlar/"))).toBe(
      true,
    );
  });

  it("derives component docs from registry metadata", () => {
    expect(components.length).toBeGreaterThanOrEqual(13);
    expect(components.map((component) => component.name)).toContain("button");
    expect(components.every((component) => component.evidenceStatus.length > 0)).toBe(true);
  });

  it("renders the disclosure flag as inline svg geometry", () => {
    const flag = renderGovernmentFlag();

    expect(flag).toContain("<svg");
    expect(flag).toContain('aria-hidden="true"');
    expect(flag).toContain("data-flag-canton");
    expect(flag.match(/data-flag-stripe/g) ?? []).toHaveLength(7);
    expect(flag.match(/data-flag-star/g) ?? []).toHaveLength(18);
  });
});
