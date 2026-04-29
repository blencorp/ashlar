import { describe, expect, it } from "vitest";
import { sha256Text } from "./hash.js";

describe("sha256Text", () => {
  it("returns a sha256-prefixed hash", () => {
    expect(sha256Text("ashlar")).toMatch(/^sha256:[a-f0-9]{64}$/);
  });

  it("normalizes CRLF to LF", () => {
    expect(sha256Text("a\r\nb\r\n")).toBe(sha256Text("a\nb\n"));
  });
});
