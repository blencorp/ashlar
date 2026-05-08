#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
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
    throw new Error(`Command failed: pnpm ${args.join(" ")}${output ? `\n${output}` : ""}`);
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

function readPackageVersion(packageDir) {
  const manifest = JSON.parse(readFileSync(join(repoRoot, packageDir, "package.json"), "utf8"));
  return manifest.version ?? "0.0.0";
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

function assertTarballEntry(tarball, requiredEntry) {
  const result = spawnSync("tar", ["-tf", tarball], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
  if (result.status !== 0) {
    throw new Error(`Unable to inspect package tarball ${tarball}:\n${result.stderr ?? ""}`);
  }

  const entries = (result.stdout ?? "").split("\n").filter(Boolean);
  if (!entries.includes(requiredEntry)) {
    throw new Error(`Package tarball ${tarball} is missing required entry: ${requiredEntry}`);
  }
}

function tarballPackageJson(tarball) {
  const result = spawnSync("tar", ["-xOf", tarball, "package/package.json"], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
  if (result.status !== 0) {
    throw new Error(`Unable to read package metadata from ${tarball}:\n${result.stderr ?? ""}`);
  }

  return JSON.parse(result.stdout);
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
  run(["--dir", join(repoRoot, "packages", "ashlar"), "pack", "--pack-destination", packDir]);

  const schemasVersion = readPackageVersion(join("packages", "schemas"));
  const cliVersion = readPackageVersion(join("packages", "cli"));
  const ashlarVersion = readPackageVersion(join("packages", "ashlar"));
  const schemasTarball = newestTarball(packDir, `blen-ashlar-schemas-${schemasVersion}`);
  const cliTarball = newestTarball(packDir, `blen-ashlar-cli-${cliVersion}`);
  const ashlarTarball = newestTarball(packDir, `blen-ashlar-${ashlarVersion}`);
  assertPublicTarball(schemasTarball);
  assertPublicTarball(cliTarball);
  assertPublicTarball(ashlarTarball);
  assertTarballEntry(cliTarball, "package/dist/registry/index.json");

  const packedCli = tarballPackageJson(cliTarball);
  if (packedCli.bin?.ashlar !== "./dist/index.js") {
    throw new Error("Packed @blen/ashlar-cli package does not expose the ashlar binary.");
  }
  const packedEntrypoint = tarballPackageJson(ashlarTarball);
  if (packedEntrypoint.bin?.ashlar !== "./bin/ashlar.js") {
    throw new Error("Packed @blen/ashlar package does not expose the ashlar binary.");
  }
  if (typeof packedEntrypoint.dependencies?.["@blen/ashlar-cli"] !== "string") {
    throw new Error("Packed @blen/ashlar package does not depend on @blen/ashlar-cli.");
  }

  writeFileSync(
    join(appDir, "package.json"),
    `${JSON.stringify(
      {
        type: "module",
        dependencies: {
          "@blen/ashlar": `file:${ashlarTarball}`,
        },
        pnpm: {
          overrides: {
            "@blen/ashlar-cli": `file:${cliTarball}`,
            "@blen/ashlar-schemas": `file:${schemasTarball}`,
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
  if (version !== cliVersion) {
    throw new Error(
      `Expected packaged CLI to report version ${cliVersion}, but ashlar --version returned ${version}.`,
    );
  }
  run(["--dir", appDir, "exec", "ashlar", "init", "--yes"], { capture: true });
  run(["--dir", appDir, "exec", "ashlar", "search", "button"], { capture: true });
  run(["--dir", appDir, "exec", "ashlar", "add", "button", "--yes"], { capture: true });
  run(["--dir", appDir, "exec", "ashlar", "verify"], { capture: true });

  const audit = run(
    ["--dir", appDir, "exec", "ashlar", "audit", "--policy", "federal", "page.html"],
    { capture: true },
  );

  if (!audit.includes("No findings")) {
    throw new Error(`Expected package smoke audit to pass with no findings:\n${audit}`);
  }

  const installedEntrypoint = JSON.parse(
    readFileSync(join(appDir, "node_modules", "@blen", "ashlar", "package.json"), "utf8"),
  );
  if (installedEntrypoint.bin?.ashlar !== "./bin/ashlar.js") {
    throw new Error("Packed @blen/ashlar package does not expose the ashlar binary.");
  }

  console.log(`Packaged CLI smoke passed for @blen/ashlar ${version}.`);
} finally {
  rmSync(scratch, { recursive: true, force: true });
}
