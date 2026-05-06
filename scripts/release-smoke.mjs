#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import {
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = fileURLToPath(new URL("..", import.meta.url));
const scratch = mkdtempSync(join(tmpdir(), "ashlar-release-smoke-"));

function run(args, options = {}) {
  const result = spawnSync("pnpm", args, {
    cwd: repoRoot,
    encoding: "utf8",
    env: process.env,
    stdio: options.capture ? ["ignore", "pipe", "pipe"] : "inherit",
  });

  if (result.status !== 0) {
    const output = `${result.stdout ?? ""}${result.stderr ?? ""}`.trim();
    throw new Error(
      `Command failed: pnpm ${args.join(" ")}${output ? `\n${output}` : ""}`,
    );
  }

  return `${result.stdout ?? ""}${result.stderr ?? ""}`;
}

function newestTarball(packDir, prefix) {
  const files = readdirSync(packDir)
    .filter((file) => file.startsWith(prefix) && file.endsWith(".tgz"))
    .sort();
  const file = files.at(-1);
  if (!file) {
    throw new Error(`No ${prefix} package tarball was written to ${packDir}.`);
  }

  return join(packDir, file);
}

function assertPublicTarball(tarball) {
  const result = spawnSync("tar", ["-tf", tarball], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
  if (result.status !== 0) {
    throw new Error(`Unable to inspect package tarball ${tarball}:\n${result.stderr ?? ""}`);
  }

  const entries = (result.stdout ?? "").split("\n").filter(Boolean);
  const forbidden = entries.filter(
    (entry) => entry.includes(".test.") || entry.endsWith(".tsbuildinfo"),
  );
  if (forbidden.length > 0) {
    throw new Error(
      `Package tarball contains test or compiler-internal files:\n${forbidden.join("\n")}`,
    );
  }
}

function writeSmokeFixture(appDir) {
  writeFileSync(
    join(appDir, "page.html"),
    `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <title>Apply for federal benefits | Ashlar package smoke</title>
    <meta name="description" content="Federal page shell used to smoke test the packaged Ashlar CLI.">
  </head>
  <body>
    <section class="ashlar-banner" aria-label="Official website of the United States government"></section>
    <main>
      <h1>Apply for federal benefits</h1>
      <p>This page validates that the packed CLI can audit a project that does not clone the Ashlar repository.</p>
    </main>
    <footer class="ashlar-identifier">
      <a href="/about">About this example agency</a>
      <a href="/accessibility">Accessibility statement</a>
      <a href="/foia">FOIA requests</a>
      <a href="/no-fear-act">No FEAR Act data</a>
      <a href="/inspector-general">Office of Inspector General</a>
      <a href="/performance">Performance reports</a>
      <a href="/privacy">Privacy policy</a>
    </footer>
  </body>
</html>
`,
  );
}

try {
  const packDir = join(scratch, "packs");
  const appDir = join(scratch, "consumer");
  mkdirSync(packDir, { recursive: true });
  mkdirSync(appDir, { recursive: true });

  run(["--dir", join(repoRoot, "packages", "schemas"), "pack", "--pack-destination", packDir]);
  run(["--dir", join(repoRoot, "packages", "cli"), "pack", "--pack-destination", packDir]);

  const schemasTarball = newestTarball(packDir, "ashlar-schemas-");
  const cliTarball = newestTarball(packDir, "ashlar-cli-");
  assertPublicTarball(schemasTarball);
  assertPublicTarball(cliTarball);

  writeFileSync(
    join(appDir, "package.json"),
    `${JSON.stringify(
      {
        type: "module",
        dependencies: {
          "@ashlar/cli": `file:${cliTarball}`,
          "@ashlar/schemas": `file:${schemasTarball}`,
        },
        pnpm: {
          overrides: {
            "@ashlar/schemas": `file:${schemasTarball}`,
          },
        },
      },
      null,
      2,
    )}\n`,
  );
  writeSmokeFixture(appDir);

  run(["--dir", appDir, "install", "--lockfile-only"]);
  run(["--dir", appDir, "fetch"]);
  run(["--dir", appDir, "install", "--offline", "--frozen-lockfile"]);
  const version = run(["--dir", appDir, "exec", "ashlar", "--version"], { capture: true }).trim();
  const audit = run(
    ["--dir", appDir, "exec", "ashlar", "audit", "--policy", "federal", "page.html"],
    { capture: true },
  );

  if (!audit.includes("No findings")) {
    throw new Error(`Expected package smoke audit to pass with no findings:\n${audit}`);
  }

  const installedCli = JSON.parse(
    readFileSync(join(appDir, "node_modules", "@ashlar", "cli", "package.json"), "utf8"),
  );
  if (installedCli.bin?.ashlar !== "./dist/index.js") {
    throw new Error("Packed @ashlar/cli package does not expose the ashlar binary.");
  }

  console.log(`Packaged CLI smoke passed for ashlar ${version}.`);
} finally {
  rmSync(scratch, { recursive: true, force: true });
}
