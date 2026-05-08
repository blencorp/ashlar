#!/usr/bin/env node
import { spawn, spawnSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const pnpm = process.platform === "win32" ? "pnpm.cmd" : "pnpm";
const outputDir = resolve(repoRoot, "reports", "testing-session");
const logsDir = resolve(outputDir, "logs");

const args = new Set(process.argv.slice(2));
const checkOnly = args.has("--check");
const skipBuild = args.has("--skip-build");
const help = args.has("--help") || args.has("-h");

const targets = [
  {
    id: "www",
    label: "Public site",
    packageName: "@blen/ashlar-www",
    port: 4174,
    command: ["--filter", "@blen/ashlar-www", "preview"],
  },
  {
    id: "docs",
    label: "Docs",
    packageName: "@blen/ashlar-docs",
    port: 4175,
    command: ["--filter", "@blen/ashlar-docs", "preview"],
  },
  {
    id: "vite",
    label: "Vite theme workbench",
    packageName: "@blen/ashlar-example-vite",
    port: 4173,
    command: ["--filter", "@blen/ashlar-example-vite", "preview"],
  },
  {
    id: "vanilla",
    label: "Vanilla TypeScript case board",
    packageName: "@blen/ashlar-example-vanilla",
    port: 4180,
    command: ["--filter", "@blen/ashlar-example-vanilla", "preview"],
  },
  {
    id: "react-spa",
    label: "React SPA case board",
    packageName: "@blen/ashlar-example-react-spa",
    port: 4181,
    command: ["--filter", "@blen/ashlar-example-react-spa", "preview"],
  },
  {
    id: "nextjs",
    label: "Next.js App Router case board",
    packageName: "@blen/ashlar-example-nextjs",
    port: 4182,
    command: [
      "--filter",
      "@blen/ashlar-example-nextjs",
      "exec",
      "next",
      "start",
      "--hostname",
      "127.0.0.1",
      "--port",
      "4182",
    ],
  },
  {
    id: "svelte",
    label: "Svelte case board",
    packageName: "@blen/ashlar-example-svelte",
    port: 4183,
    command: ["--filter", "@blen/ashlar-example-svelte", "preview"],
  },
  {
    id: "vue",
    label: "Vue case board",
    packageName: "@blen/ashlar-example-vue",
    port: 4184,
    command: ["--filter", "@blen/ashlar-example-vue", "preview"],
  },
];

if (help) {
  console.log(`Ashlar testing session

Builds the workspace, starts the public site, docs app, and framework examples,
then writes a URL and health report under reports/testing-session.

Usage:
  pnpm testing:start
  pnpm testing:start --check
  pnpm testing:start --skip-build

Options:
  --check       Start every target, verify HTTP responses, write reports, then stop.
  --skip-build  Start from the current build output instead of running pnpm build first.
`);
  process.exit(0);
}

mkdirSync(logsDir, { recursive: true });

const started = [];
const results = [];
let stopping = false;

process.on("SIGINT", () => {
  void stopAndExit(0);
});
process.on("SIGTERM", () => {
  void stopAndExit(0);
});

try {
  if (!skipBuild) {
    runBuild();
  }

  for (const target of targets) {
    const existing = await probeTarget(target);
    if (existing.ok) {
      results.push({
        ...existing,
        command: ["already-running"],
        id: target.id,
        label: target.label,
        packageName: target.packageName,
        startedByScript: false,
      });
      continue;
    }

    const child = startTarget(target);
    started.push({ child, target });
    const probe = await waitForTarget(target, child);
    results.push({
      ...probe,
      command: [pnpm, ...target.command],
      id: target.id,
      label: target.label,
      packageName: target.packageName,
      startedByScript: true,
    });
  }

  writeReports(results);
  printSummary(results);

  if (checkOnly) {
    stopping = true;
    await stopStarted();
    process.exit(0);
  }

  console.log("");
  console.log("Press Ctrl-C to stop the testing session.");
  await waitForever();
} catch (error) {
  console.error(formatError(error));
  writeReports(results, error);
  stopping = true;
  await stopStarted();
  process.exit(1);
}

function runBuild() {
  console.log("Building workspace before starting preview servers...");
  const result = spawnSync(pnpm, ["build"], {
    cwd: repoRoot,
    encoding: "utf8",
    env: cleanEnv(),
    stdio: "inherit",
  });
  if (result.status !== 0) {
    throw new Error(`pnpm build failed with exit code ${result.status ?? 1}`);
  }
}

function startTarget(target) {
  console.log(`Starting ${target.label} on http://127.0.0.1:${target.port}/`);
  const child = spawn(pnpm, target.command, {
    cwd: repoRoot,
    detached: process.platform !== "win32",
    env: cleanEnv(),
    stdio: ["ignore", "pipe", "pipe"],
  });

  const logPath = resolve(logsDir, `${target.id}.log`);
  writeFileSync(logPath, "");

  const append = (chunk) => {
    writeFileSync(logPath, chunk.toString(), { flag: "a" });
  };
  child.stdout.on("data", append);
  child.stderr.on("data", append);
  child.on("exit", (code, signal) => {
    if (!stopping && code !== 0) {
      console.error(`${target.label} exited early (${code ?? signal ?? "unknown"}).`);
    }
  });

  return child;
}

async function waitForTarget(target, child) {
  const startedAt = Date.now();
  while (Date.now() - startedAt < 45_000) {
    if (child.exitCode !== null) {
      throw new Error(`${target.label} exited before responding.`);
    }
    const probe = await probeTarget(target);
    if (probe.ok) {
      return probe;
    }
    await delay(500);
  }
  throw new Error(`${target.label} did not respond at ${targetUrl(target)} within 45s.`);
}

async function probeTarget(target) {
  const url = targetUrl(target);
  try {
    const response = await fetch(url);
    const html = await response.text();
    return {
      ok: response.ok,
      status: response.status,
      title: extractTitle(html),
      url,
    };
  } catch (error) {
    return {
      error: formatError(error),
      ok: false,
      status: null,
      title: null,
      url,
    };
  }
}

function writeReports(items, error = null) {
  const report = {
    generatedAt: new Date().toISOString(),
    status: error ? "fail" : "pass",
    targets: items,
    error: error ? formatError(error) : null,
  };
  writeFileSync(resolve(outputDir, "summary.json"), `${JSON.stringify(report, null, 2)}\n`);

  const lines = [
    "# Ashlar Testing Session",
    "",
    `Generated: ${report.generatedAt}`,
    `Status: ${report.status}`,
    "",
    "| Target | URL | Status | Title |",
    "| --- | --- | ---: | --- |",
  ];
  for (const item of items) {
    lines.push(`| ${item.label} | ${item.url} | ${item.status ?? "n/a"} | ${item.title ?? ""} |`);
  }
  if (error) {
    lines.push("", "## Error", "", formatError(error));
  }
  lines.push("");
  writeFileSync(resolve(outputDir, "summary.md"), `${lines.join("\n")}\n`);
}

function printSummary(items) {
  console.log("");
  console.log("Ashlar testing URLs:");
  for (const item of items) {
    const status = item.startedByScript ? "started" : "already running";
    console.log(`- ${item.label}: ${item.url} (${status})`);
  }
  console.log("");
  console.log("Reports:");
  console.log("- reports/testing-session/summary.md");
  console.log("- reports/testing-session/summary.json");
  console.log("- reports/testing-session/logs/");
}

async function stopAndExit(exitCode) {
  if (stopping) {
    process.exit(exitCode);
  }
  stopping = true;
  await stopStarted();
  process.exit(exitCode);
}

async function stopStarted() {
  await Promise.all(started.map(({ child }) => stopChild(child)));
}

async function stopChild(child) {
  if (child.exitCode !== null) {
    return;
  }
  killProcessGroup(child, "SIGTERM");
  await new Promise((resolveStop) => {
    const timeout = setTimeout(() => {
      killProcessGroup(child, "SIGKILL");
      resolveStop();
    }, 3000);
    child.once("exit", () => {
      clearTimeout(timeout);
      resolveStop();
    });
  });
}

function killProcessGroup(child, signal) {
  try {
    if (process.platform === "win32") {
      child.kill(signal);
      return;
    }
    process.kill(-child.pid, signal);
  } catch {
    child.kill(signal);
  }
}

function targetUrl(target) {
  return `http://127.0.0.1:${target.port}/`;
}

function extractTitle(html) {
  return html.match(/<title>([^<]+)<\/title>/i)?.[1]?.trim() ?? null;
}

function cleanEnv() {
  return { ...process.env, FORCE_COLOR: "0", NO_COLOR: "1" };
}

function waitForever() {
  return new Promise(() => {});
}

function delay(ms) {
  return new Promise((resolveDelay) => setTimeout(resolveDelay, ms));
}

function formatError(error) {
  return error instanceof Error ? error.message : String(error);
}
