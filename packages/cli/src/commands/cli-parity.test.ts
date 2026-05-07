import { spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, describe, expect, it } from "vitest";

const here = fileURLToPath(new URL(".", import.meta.url));
const cliEntry = join(here, "..", "..", "dist", "index.js");
const repoRoot = resolve(here, "..", "..", "..", "..");
const registry = join(repoRoot, "registry");

const scratches: string[] = [];

afterEach(() => {
  for (const scratch of scratches.splice(0)) {
    rmSync(scratch, { recursive: true, force: true });
  }
});

function scratchProject(): string {
  const scratch = mkdtempSync(join(tmpdir(), "ashlar-cli-parity-"));
  scratches.push(scratch);
  return scratch;
}

function runCli(args: string[], cwd = repoRoot): { stdout: string; status: number } {
  const result = spawnSync(process.execPath, [cliEntry, ...args], {
    cwd,
    encoding: "utf8",
    env: { ...process.env, FORCE_COLOR: "0", NO_COLOR: "1" },
    stdio: ["ignore", "pipe", "pipe"],
  });

  return {
    stdout: `${result.stdout ?? ""}${result.stderr ?? ""}`,
    status: result.status ?? 1,
  };
}

describe("shadcn v4 cli parity", () => {
  it("supports create as an init alias with cwd and yes flags", () => {
    const scratch = scratchProject();
    const result = runCli([
      "create",
      "--cwd",
      scratch,
      "--name",
      "benefits-console",
      "--registry",
      registry,
      "--template",
      "vite",
      "--base",
      "radix",
      "--preset",
      "nova",
      "--defaults",
      "--monorepo",
      "--yes",
    ]);

    expect(result.status).toBe(0);
    expect(result.stdout).toContain("Initialized Ashlar");
    expect(result.stdout).toContain("template: vite");
    expect(result.stdout).toContain("base: radix");
    expect(result.stdout).toContain("preset: nova");
    expect(result.stdout).toContain("Built with love by the good people at BLEN");
    expect(existsSync(join(scratch, "benefits-console", "ashlar.config.json"))).toBe(true);
    expect(existsSync(join(scratch, "benefits-console", "ashlar-lock.json"))).toBe(true);
  });

  it("exposes shadcn v4 compatibility flags in help", () => {
    const initHelp = runCli(["init", "--help"]);
    expect(initHelp.status).toBe(0);
    expect(initHelp.stdout).toContain("--template <template>");
    expect(initHelp.stdout).toContain("--base <base>");
    expect(initHelp.stdout).toContain("--preset [name]");
    expect(initHelp.stdout).toContain("--name <name>");
    expect(initHelp.stdout).toContain("--monorepo");

    const addHelp = runCli(["add", "--help"]);
    expect(addHelp.status).toBe(0);
    expect(addHelp.stdout).toContain("--overwrite");
    expect(addHelp.stdout).toContain("--path <path>");
    expect(addHelp.stdout).toContain("--silent");
    expect(addHelp.stdout).toContain("--diff [path]");
    expect(addHelp.stdout).toContain("--view [path]");
  });

  it("supports cwd, query, and limit aliases on discovery commands", () => {
    const scratch = scratchProject();

    expect(runCli(["init", "--cwd", scratch, "--registry", registry]).status).toBe(0);
    const search = runCli([
      "search",
      "--cwd",
      scratch,
      "--query",
      "official website",
      "--policy",
      "Federal Website Standards",
      "--limit",
      "1",
      "--offset",
      "0",
      "--json",
    ]);

    expect(search.status).toBe(0);
    const payload = JSON.parse(search.stdout) as {
      query: string;
      count: number;
      components: Array<{ name: string; version: string }>;
    };
    expect(payload.query).toBe("official website");
    expect(payload.count).toBe(1);
    expect(payload.components[0]).toMatchObject({ name: "banner", version: "0.0.3" });

    const view = runCli(["view", "button", "--cwd", scratch, "--json"]);
    expect(view.status).toBe(0);
    expect(JSON.parse(view.stdout)[0]).toMatchObject({ name: "button", version: "0.0.1" });

    const info = runCli(["info", "--cwd", scratch, "--json"]);
    expect(info.status).toBe(0);
    expect(JSON.parse(info.stdout).project.initialized).toBe(true);
  });

  it("supports add --all previews without writing files", () => {
    const scratch = scratchProject();

    expect(runCli(["init", "--cwd", scratch, "--registry", registry]).status).toBe(0);
    const lockfileBefore = readFileSync(join(scratch, "ashlar-lock.json"), "utf8");
    const result = runCli(["add", "--cwd", scratch, "--all", "--dry-run"]);

    expect(result.status).toBe(0);
    expect(result.stdout).toContain("Previewing source-owned capsule installs");
    expect(result.stdout).toContain("banner@0.0.3");
    expect(result.stdout).toContain("button@0.0.1");
    expect(result.stdout).toContain("No files changed on disk");
    expect(existsSync(join(scratch, "src/ashlar/components/button/button.css"))).toBe(false);
    expect(readFileSync(join(scratch, "ashlar-lock.json"), "utf8")).toBe(lockfileBefore);
  });

  it("supports add path, silent, and overwrite compatibility flags", () => {
    const scratch = scratchProject();

    expect(runCli(["init", "--cwd", scratch, "--registry", registry]).status).toBe(0);
    const silentAdd = runCli([
      "add",
      "--cwd",
      scratch,
      "button",
      "--path",
      "app/ashlar/ui",
      "--silent",
    ]);

    expect(silentAdd.status).toBe(0);
    expect(silentAdd.stdout).toBe("");
    expect(existsSync(join(scratch, "app/ashlar/ui/button/button.css"))).toBe(true);
    expect(JSON.parse(readFileSync(join(scratch, "ashlar.config.json"), "utf8"))).toMatchObject({
      componentsDir: "app/ashlar/ui",
    });

    const refused = runCli(["add", "--cwd", scratch, "button"]);
    expect(refused.status).toBe(1);
    expect(refused.stdout).toContain("Refusing to overwrite existing Ashlar source file");

    const overwritten = runCli(["add", "--cwd", scratch, "button", "--overwrite", "--silent"]);
    expect(overwritten.status).toBe(0);
    expect(overwritten.stdout).toBe("");
  });

  it("reports invalid cwd without a stack trace", () => {
    const result = runCli(["info", "--cwd", join(tmpdir(), "ashlar-does-not-exist")]);

    expect(result.status).toBe(1);
    expect(result.stdout).toContain("Ashlar working directory does not exist:");
    expect(result.stdout).not.toContain("at applyCommandCwd");
  });
});
