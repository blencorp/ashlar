#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = fileURLToPath(new URL("..", import.meta.url));
const scratch = mkdtempSync(join(tmpdir(), "ashlar-public-install-smoke-"));
const registry = process.env.NPM_CONFIG_REGISTRY ?? "https://registry.npmjs.org";
const requireBun = process.env.ASHLAR_PUBLIC_SMOKE_REQUIRE_BUN === "true";

function readJson(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}

const ashlarVersion = readJson(join(repoRoot, "packages", "ashlar", "package.json")).version;
const cliVersion = readJson(join(repoRoot, "packages", "cli", "package.json")).version;
const schemasVersion = readJson(join(repoRoot, "packages", "schemas", "package.json")).version;

function run(label, command, args) {
  const cleanEnv = Object.fromEntries(
    Object.entries(process.env).filter(([key]) => !key.toLowerCase().startsWith("npm_config_")),
  );
  const result = spawnSync(command, args, {
    cwd: scratch,
    encoding: "utf8",
    env: {
      ...cleanEnv,
      npm_config_registry: registry,
      NPM_CONFIG_REGISTRY: registry,
    },
    stdio: ["ignore", "pipe", "pipe"],
  });

  const output = `${result.stdout ?? ""}${result.stderr ?? ""}`.trim();
  if (result.status !== 0) {
    throw new Error(`Public install smoke failed for ${label}:\n${output}`);
  }

  return output;
}

function commandExists(command) {
  const result = spawnSync("sh", ["-lc", `command -v ${command}`], {
    encoding: "utf8",
    env: process.env,
    stdio: ["ignore", "pipe", "pipe"],
  });

  return result.status === 0 && result.stdout.trim().length > 0;
}

function expectVersion(label, output) {
  const firstLine = output.split(/\r?\n/).find(Boolean)?.trim();
  if (firstLine !== cliVersion) {
    throw new Error(`${label} reported ${firstLine || "<empty>"}; expected ${cliVersion}.`);
  }
}

function expectNpmVersion(packageName, expectedVersion) {
  const output = run(`npm view ${packageName}`, "npm", [
    "view",
    `${packageName}@${expectedVersion}`,
    "version",
    "--registry",
    registry,
  ]);

  if (output.split(/\r?\n/).at(-1)?.trim() !== expectedVersion) {
    throw new Error(`${packageName} is not published at ${expectedVersion}.`);
  }
}

try {
  expectNpmVersion("@blen/ashlar", ashlarVersion);
  expectNpmVersion("@blen/ashlar-cli", cliVersion);
  expectNpmVersion("@blen/ashlar-schemas", schemasVersion);

  expectVersion(
    "npx @blen/ashlar",
    run("npx @blen/ashlar", "npx", ["--yes", `@blen/ashlar@${ashlarVersion}`, "--version"]),
  );

  expectVersion(
    "pnpm dlx @blen/ashlar",
    run("pnpm dlx @blen/ashlar", "pnpm", ["dlx", `@blen/ashlar@${ashlarVersion}`, "--version"]),
  );

  if (commandExists("bunx")) {
    expectVersion(
      "bunx @blen/ashlar",
      run("bunx @blen/ashlar", "bunx", [`@blen/ashlar@${ashlarVersion}`, "--version"]),
    );
  } else if (requireBun) {
    throw new Error("bunx is required for public install smoke but was not found on PATH.");
  } else {
    console.warn("Skipping bunx smoke because bunx is not available on PATH.");
  }

  console.log(
    `Public install smoke passed for @blen/ashlar ${ashlarVersion} with CLI ${cliVersion}.`,
  );
} finally {
  rmSync(scratch, { recursive: true, force: true });
}
