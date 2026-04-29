import { describe, expect, it } from "vitest";
import { findMatches } from "./astgrep.js";

describe("astgrep wrapper", () => {
  it("finds an Ashlar Button anti-pattern in HTML using class regex + svg has + aria-label not", () => {
    const offending = `<button class="ashlar-button"><svg aria-hidden="true"></svg></button>`;
    const matches = findMatches("html", offending, {
      rule: {
        pattern: "<button $$$ATTRS>$$$CHILDREN</button>",
        regex: 'class="[^"]*\\bashlar-button\\b',
        has: { pattern: "<svg $$$></svg>", stopBy: "end" },
        not: { regex: "aria-label\\s*=" },
      },
    });

    expect(matches).toHaveLength(1);
    expect(matches[0]?.region.startLine).toBe(1);
  });

  it("does not match a button with aria-label", () => {
    const labeled = `<button class="ashlar-button" aria-label="Open"><svg aria-hidden="true"></svg></button>`;
    const matches = findMatches("html", labeled, {
      rule: {
        pattern: "<button $$$ATTRS>$$$CHILDREN</button>",
        regex: 'class="[^"]*\\bashlar-button\\b',
        has: { pattern: "<svg $$$></svg>", stopBy: "end" },
        not: { regex: "aria-label\\s*=" },
      },
    });

    expect(matches).toHaveLength(0);
  });

  it("finds patterns in TSX source", () => {
    const tsx = `
      function Header() {
        return (
          <button className="ashlar-button">
            <SvgMenu />
          </button>
        );
      }
    `;
    const matches = findMatches("tsx", tsx, {
      rule: {
        pattern: '<button className="ashlar-button">$$$CHILDREN</button>',
      },
    });

    expect(matches).toHaveLength(1);
    expect(matches[0]?.region.startLine).toBe(4);
  });

  it("returns 1-indexed line/column matching SARIF expectations", () => {
    const html = `<a href="/foo">click</a>`;
    const matches = findMatches("html", html, {
      rule: { pattern: '<a href="$_">$$$CHILDREN</a>' },
    });

    expect(matches[0]?.region).toEqual({
      startLine: 1,
      startColumn: 1,
      endLine: 1,
      endColumn: html.length + 1,
    });
  });
});
