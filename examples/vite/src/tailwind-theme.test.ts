import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const here = fileURLToPath(new URL(".", import.meta.url));
const exampleRoot = resolve(here, "..");
const workspaceRoot = resolve(exampleRoot, "..", "..");

function readFromExample(path: string): string {
  return readFileSync(resolve(exampleRoot, path), "utf8");
}

function readFromWorkspace(path: string): string {
  return readFileSync(resolve(workspaceRoot, path), "utf8");
}

describe("Tailwind theme consumption", () => {
  it("builds the Vite example through Tailwind v4 using Ashlar theme variables", () => {
    const packageJson = readFromExample("package.json");
    const viteConfig = readFromExample("vite.config.ts");
    const styles = readFromExample("src/styles.css");
    const html = readFromExample("index.html");
    const source = `${html}\n${readFromExample("src/main.ts")}`;
    const tailwindThemePath = resolve(exampleRoot, "src", "ashlar", "themes", "tailwind-theme.css");

    expect(packageJson).toContain('"tailwindcss": "catalog:"');
    expect(packageJson).toContain('"@tailwindcss/vite": "catalog:"');
    expect(viteConfig).toContain('from "@tailwindcss/vite"');
    expect(styles).toContain('@import "tailwindcss";');
    expect(styles).toContain('@import "./ashlar/themes/tailwind-theme.css";');
    expect(existsSync(tailwindThemePath)).toBe(true);

    const tailwindTheme = readFileSync(tailwindThemePath, "utf8");
    expect(tailwindTheme).toContain("@theme");
    expect(tailwindTheme).toContain(
      "--color-ashlar-action-primary-bg: var(--ashlar-color-action-primary-bg);",
    );

    expect(source).toContain("bg-ashlar-surface");
    expect(source).toContain("rounded-ashlar-card");
    expect(source).toContain("min-h-ashlar-button-min-block-size");

    const lockfile = readFromWorkspace("pnpm-lock.yaml");
    expect(lockfile).toContain("tailwindcss@");
    expect(lockfile).toContain("@tailwindcss/vite");
  });
});
