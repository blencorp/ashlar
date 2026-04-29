import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { buildCapsuleManifest } from "./capsule.js";

describe("buildCapsuleManifest", () => {
  it("hashes files in deterministic order", () => {
    const dir = join(tmpdir(), `ashlar-capsule-${Date.now()}`);
    mkdirSync(dir, { recursive: true });

    try {
      writeFileSync(join(dir, "b.txt"), "b\n");
      writeFileSync(join(dir, "a.txt"), "a\n");

      const manifest = buildCapsuleManifest({
        directory: dir,
        name: "button",
        version: "0.0.1",
        layer: "L0",
        stability: "experimental",
      });

      expect(Object.keys(manifest.files)).toEqual(["a.txt", "b.txt"]);
      expect(manifest.capsule_hash).toMatch(/^sha256:[a-f0-9]{64}$/);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
