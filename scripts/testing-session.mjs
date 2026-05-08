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
const runVisual = args.has("--visual");
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
    label: "Vite + Tailwind case board",
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
  pnpm testing:start --check --visual
  pnpm testing:start --skip-build

Options:
  --check       Start every target, verify HTTP responses, write reports, then stop.
  --skip-build  Start from the current build output instead of running pnpm build first.
  --visual      Also run the Playwright visual smoke and write screenshot pointers.
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

  const visual = runVisual ? runVisualSmoke() : null;

  writeReports(results, null, visual);
  printSummary(results, visual);

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

function runVisualSmoke() {
  const startedAt = Date.now();
  console.log("");
  console.log("Running framework visual smoke...");
  const result = spawnSync(
    process.execPath,
    [resolve(repoRoot, "scripts", "example-visual-smoke.mjs")],
    {
      cwd: repoRoot,
      encoding: "utf8",
      env: cleanEnv(),
      stdio: "inherit",
    },
  );
  const durationMs = Date.now() - startedAt;
  if (result.status !== 0) {
    throw new Error(`example visual smoke failed with exit code ${result.status ?? 1}`);
  }
  return {
    durationMs,
    screenshotsDir: "reports/example-visual-smoke",
    status: "pass",
    summary: "reports/example-visual-smoke/summary.json",
  };
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

function writeReports(items, error = null, visual = null) {
  const report = {
    generatedAt: new Date().toISOString(),
    status: error ? "fail" : "pass",
    targets: items,
    visual,
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
  if (visual) {
    lines.push(
      "",
      "## Visual Smoke",
      "",
      `Status: ${visual.status}`,
      `Screenshots: \`${visual.screenshotsDir}/\``,
      `Summary: \`${visual.summary}\``,
    );
  }
  lines.push(
    "",
    "## Manual Checklist",
    "",
    "Use `reports/testing-session/checklist.md` for the visual and DX review path.",
  );
  lines.push("");
  writeFileSync(resolve(outputDir, "summary.md"), `${lines.join("\n")}\n`);
  writeChecklist(report);
}

function writeChecklist(report) {
  const caseBoardTargets = report.targets.filter((item) => item.id !== "www" && item.id !== "docs");
  const lines = [
    "# Ashlar Manual Testing Checklist",
    "",
    `Generated: ${report.generatedAt}`,
    `Status: ${report.status}`,
    "",
    "This checklist is for hands-on review after `pnpm testing:start`. It does not create stable accessibility evidence or external review proof records.",
    "",
    "## Start Here",
    "",
    "- Open the public site and docs first; confirm the project posture is clear and does not imply affiliation with USWDS, GSA, NDS, or the federal government.",
    "- Open the Vite + Tailwind case board; switch Default, VA, and USDA themes in light and dark modes.",
    "- Open each case-board example; compare layout, theming, banner, and component behavior across stacks.",
  ];

  if (report.visual) {
    lines.push(
      "- Review the Playwright screenshots in `reports/example-visual-smoke/` before filing visual defects.",
    );
  } else {
    lines.push("- Run `pnpm testing:start --check --visual` when screenshot evidence is needed.");
  }

  lines.push("", "## URLs", "", "| Target | URL | Status |", "| --- | --- | ---: |");
  for (const item of report.targets) {
    lines.push(`| ${item.label} | ${item.url} | ${item.status ?? "n/a"} |`);
  }

  lines.push(
    "",
    "## Visual Review",
    "",
    "- Government banner uses a real inline SVG flag, not a CSS-painted block or placeholder.",
    "- Banner text, disclosure trigger, and focus outline are legible in each theme.",
    "- Agency selection is a centered dialog with agency marks and source/provenance badges, not a corner control box.",
    "- Theme labels use Default, VA, and USDA only; no legacy default-agency alias appears.",
    "- Light, dark, and system modes keep text inputs, selects, radios, checkboxes, alerts, and buttons readable.",
    "- Board columns read as unframed workflow lanes; individual cases may be cards, but cards are not nested inside other cards.",
    "- Mobile widths do not introduce horizontal scrolling, clipped text, or overlapped controls.",
    "- Buttons and compact controls keep stable dimensions through hover, focus, selection, and theme changes.",
    "",
    "## Interaction Review",
    "",
    "- Tab through the banner disclosure, agency trigger, theme controls, filters, board actions, and case actions.",
    "- Confirm Enter and Space activate buttons without double activation.",
    "- Confirm visible focus rings are strong enough on light and dark surfaces.",
    "- Confirm Escape closes the agency dialog and focus returns to the agency trigger.",
    "- Confirm agency selection closes the dialog and updates the current theme immediately.",
    "- Confirm filter controls can be changed without layout jumps.",
    "",
    "## Stack Parity",
    "",
    "| Stack | Checks |",
    "| --- | --- |",
  );
  for (const item of caseBoardTargets) {
    lines.push(
      `| ${item.label} | Banner, agency dialog, theme switch, filters, board lanes, case actions, mobile layout |`,
    );
  }

  lines.push(
    "",
    "## Defect Notes",
    "",
    "File each issue with the GitHub `Manual testing report` template. For each issue, capture:",
    "",
    "- target URL and viewport size;",
    "- selected agency and color mode;",
    "- expected behavior;",
    "- actual behavior;",
    "- screenshot path or browser recording;",
    "- whether `pnpm examples:visual` catches it.",
    "- whether the issue affects one framework example, every case-board example, docs, the public site, or generated CLI output.",
    "",
  );
  writeFileSync(resolve(outputDir, "checklist.md"), `${lines.join("\n")}\n`);
}

function printSummary(items, visual = null) {
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
  console.log("- reports/testing-session/checklist.md");
  console.log("- reports/testing-session/logs/");
  if (visual) {
    console.log("- reports/example-visual-smoke/");
  }
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
