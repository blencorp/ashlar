import { spawnSync } from "node:child_process";
import { cpSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

const here = fileURLToPath(new URL(".", import.meta.url));
const cliEntry = join(here, "..", "..", "dist", "index.js");
const repoRoot = resolve(here, "..", "..", "..", "..");

let scratch: string;

function runCli(args: string[]): { stdout: string; status: number } {
  const result = spawnSync(process.execPath, [cliEntry, ...args], {
    cwd: scratch,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });

  return {
    stdout: `${result.stdout ?? ""}${result.stderr ?? ""}`,
    status: result.status ?? 1,
  };
}

beforeEach(() => {
  scratch = mkdtempSync(join(tmpdir(), "ashlar-theme-test-"));
});

afterEach(() => {
  rmSync(scratch, { recursive: true, force: true });
});

describe("theme command", () => {
  it("validates stock agency themes", () => {
    const result = runCli(["theme", "validate"]);

    expect(result.status).toBe(0);
    expect(result.stdout).toContain("Validated 3 theme(s) with 0 findings");
  });

  it("syncs generated CSS from local token JSON", () => {
    expect(runCli(["init", "--registry", join(repoRoot, "registry")]).status).toBe(0);
    const themePath = join(scratch, "src", "ashlar", "themes", "default.tokens.json");
    const theme = JSON.parse(readFileSync(themePath, "utf8")) as {
      tokens: { color: { action: { primary: { bg: { $value: string } } } } };
    };
    theme.tokens.color.action.primary.bg.$value = "#123456";
    writeFileSync(themePath, `${JSON.stringify(theme, null, 2)}\n`);

    const result = runCli(["theme", "sync"]);

    expect(result.status).toBe(0);
    expect(result.stdout).toContain("Synced src/ashlar/themes/theme.css");
    expect(result.stdout).toContain("Synced src/ashlar/themes/tailwind-theme.css");
    expect(result.stdout).toContain("Synced src/ashlar/themes/tokens.ts");
    expect(readFileSync(join(scratch, "src", "ashlar", "themes", "theme.css"), "utf8")).toContain(
      "--ashlar-color-action-primary-bg: #123456;",
    );
    expect(
      readFileSync(join(scratch, "src", "ashlar", "themes", "tailwind-theme.css"), "utf8"),
    ).toContain("--color-ashlar-action-primary-bg: var(--ashlar-color-action-primary-bg);");
    expect(readFileSync(join(scratch, "src", "ashlar", "themes", "tokens.ts"), "utf8")).toContain(
      '"color.action.primary.bg": "--ashlar-color-action-primary-bg"',
    );
    expect(readFileSync(join(scratch, "src", "ashlar", "ashlar.css"), "utf8")).toContain(
      "--ashlar-color-action-primary-bg: #123456;",
    );
  });

  it("returns errors for a low-contrast agency theme", () => {
    const themesDir = join(scratch, "themes");
    cpSync(join(repoRoot, "packages", "cli", "themes"), themesDir, { recursive: true });
    const defaultThemePath = join(themesDir, "default.tokens.json");
    const theme = JSON.parse(readFileSync(defaultThemePath, "utf8")) as {
      tokens: { color: { action: { primary: { bg: { $value: string }; fg: { $value: string } } } } };
    };
    theme.tokens.color.action.primary.bg.$value = "#ffffff";
    theme.tokens.color.action.primary.fg.$value = "#ffffff";
    writeFileSync(defaultThemePath, `${JSON.stringify(theme, null, 2)}\n`);

    const result = runCli(["theme", "validate", "--themes-dir", themesDir]);

    expect(result.status).toBe(1);
    expect(result.stdout).toContain("ERROR default/light theme/action-primary-contrast");
    expect(result.stdout).toContain("expected at least 4.5:1");
  });
});
