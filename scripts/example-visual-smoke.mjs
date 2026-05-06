#!/usr/bin/env node
import { chromium } from "@playwright/test";
import { spawn } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import { createServer } from "node:net";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const outputDir = resolve(repoRoot, "reports/example-visual-smoke");
const pnpm = process.platform === "win32" ? "pnpm.cmd" : "pnpm";

const examples = [
  {
    name: "vanilla",
    path: "examples/vanilla",
    runner: "vite",
    preferredPort: 4280,
    caseBoard: true,
  },
  {
    name: "react-spa",
    path: "examples/react-spa",
    runner: "vite",
    preferredPort: 4281,
    caseBoard: true,
  },
  { name: "nextjs", path: "examples/nextjs", runner: "next", preferredPort: 4282, caseBoard: true },
  { name: "svelte", path: "examples/svelte", runner: "vite", preferredPort: 4283, caseBoard: true },
  { name: "vue", path: "examples/vue", runner: "vite", preferredPort: 4284, caseBoard: true },
  { name: "vite", path: "examples/vite", runner: "vite", preferredPort: 4273, caseBoard: false },
];

const viewports = [
  { name: "desktop", width: 1440, height: 1120 },
  { name: "mobile", width: 390, height: 1400 },
];

const failures = [];
const summary = [];

await mkdir(outputDir, { recursive: true });

let browser;
try {
  browser = await chromium.launch({ headless: true });
  for (const example of examples) {
    const port = await findFreePort(example.preferredPort);
    const server = startServer(example, port);
    try {
      const url = `http://127.0.0.1:${port}/`;
      await waitForServer(url, example.name);
      const result = await inspectExample(browser, example, url);
      summary.push({ ...result, port });
    } catch (error) {
      failures.push(`${example.name}: ${formatError(error)}`);
    } finally {
      await stopServer(server);
    }
  }
} finally {
  await browser?.close();
  await writeFile(
    resolve(outputDir, "summary.json"),
    `${JSON.stringify({ failures, examples: summary }, null, 2)}\n`,
  );
}

if (failures.length > 0) {
  console.error("Example visual smoke failed:");
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log(`Example visual smoke passed for ${summary.length} app(s).`);

async function inspectExample(browserInstance, example, url) {
  const pages = [];
  const context = await browserInstance.newContext();
  try {
    for (const viewport of viewports) {
      const page = await context.newPage();
      const runtimeIssues = collectRuntimeIssues(page);
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      const response = await page.goto(url, { waitUntil: "networkidle", timeout: 45_000 });
      if (!response?.ok()) {
        throw new Error(`${viewport.name} returned HTTP ${response?.status() ?? "unknown"}`);
      }
      await page.waitForTimeout(250);

      const screenshot = `${example.name}-${viewport.name}.png`;
      await page.screenshot({ fullPage: true, path: resolve(outputDir, screenshot) });

      const metrics = await page.evaluate(() => ({
        bodyTextLength: document.body.innerText.trim().length,
        h1: document.querySelector("h1")?.textContent?.trim() ?? null,
        scrollWidth: document.documentElement.scrollWidth,
        viewportWidth: window.innerWidth,
      }));

      if (metrics.bodyTextLength < 80) {
        throw new Error(`${viewport.name} rendered too little text (${metrics.bodyTextLength})`);
      }
      if (metrics.scrollWidth > metrics.viewportWidth) {
        throw new Error(
          `${viewport.name} has horizontal overflow: ${metrics.scrollWidth}px > ${metrics.viewportWidth}px`,
        );
      }
      if (runtimeIssues.length > 0) {
        throw new Error(`${viewport.name} browser runtime issue(s): ${runtimeIssues.join(" | ")}`);
      }

      pages.push({ viewport: viewport.name, screenshot, h1: metrics.h1 });
      await page.close();
    }

    if (example.caseBoard) {
      pages.push(await inspectCaseBoardModal(context, example, url));
    }
  } finally {
    await context.close();
  }
  return { name: example.name, pages };
}

async function inspectCaseBoardModal(context, example, url) {
  const page = await context.newPage();
  const runtimeIssues = collectRuntimeIssues(page);
  await page.setViewportSize({ width: 1440, height: 1120 });
  await page.goto(url, { waitUntil: "networkidle", timeout: 45_000 });
  await page.waitForTimeout(250);

  const structure = await page.evaluate(() => {
    const columns = Array.from(document.querySelectorAll(".board-column"));
    const nestedBoardCards = columns.some((column) => {
      const style = getComputedStyle(column);
      const hasBoxShadow = style.boxShadow !== "none";
      const hasCardBackground =
        style.backgroundColor !== "rgba(0, 0, 0, 0)" && style.backgroundColor !== "transparent";
      return hasBoxShadow || hasCardBackground;
    });
    const cardSurfaceSelector = ".agency-card, .case-card, .metric, .toolbar";
    const nestedCardSurface = Array.from(document.querySelectorAll(cardSurfaceSelector)).some(
      (surface) => Boolean(surface.parentElement?.closest(cardSurfaceSelector)),
    );
    return {
      hasAgencyTrigger: Boolean(document.querySelector(".agency-trigger")),
      hasAgencyPanel: Boolean(document.querySelector(".agency-panel")),
      nestedBoardCards,
      nestedCardSurface,
    };
  });

  if (!structure.hasAgencyTrigger || !structure.hasAgencyPanel) {
    throw new Error("case-board agency picker trigger or panel is missing");
  }
  if (structure.nestedBoardCards) {
    throw new Error("case-board columns still render as nested cards");
  }
  if (structure.nestedCardSurface) {
    throw new Error("case-board contains a visual card nested inside another card");
  }

  await page.click(".agency-trigger");
  await page.waitForTimeout(150);
  const modal = await page.evaluate(() => {
    const panel = document.querySelector(".agency-panel")?.getBoundingClientRect();
    return panel
      ? {
          bottom: panel.bottom,
          left: panel.left,
          right: panel.right,
          top: panel.top,
          viewportHeight: window.innerHeight,
          viewportWidth: window.innerWidth,
        }
      : null;
  });

  if (!modal) {
    throw new Error("agency panel did not open");
  }
  if (
    modal.left < 0 ||
    modal.top < 0 ||
    modal.right > modal.viewportWidth ||
    modal.bottom > modal.viewportHeight
  ) {
    throw new Error("agency panel opens outside the viewport");
  }

  const darkButton = page.getByRole("button", { name: /^Dark$/ });
  if ((await darkButton.count()) > 0) {
    await darkButton.first().click();
    await page.waitForTimeout(150);
    const textInput = await page.evaluate(() => {
      const input = document.querySelector(".ashlar-text-input");
      if (!input) {
        return null;
      }
      const style = getComputedStyle(input);
      return {
        backgroundColor: style.backgroundColor,
        color: style.color,
      };
    });
    if (!textInput?.backgroundColor || !textInput?.color) {
      throw new Error("dark-mode text input styles are not resolved");
    }
  }

  const screenshot = `${example.name}-agency-modal.png`;
  await page.screenshot({ fullPage: true, path: resolve(outputDir, screenshot) });

  if (runtimeIssues.length > 0) {
    throw new Error(`agency modal browser runtime issue(s): ${runtimeIssues.join(" | ")}`);
  }

  await page.close();
  return { modal: true, screenshot, viewport: "desktop" };
}

function collectRuntimeIssues(page) {
  const issues = [];
  page.on("console", (message) => {
    if (message.type() === "error") {
      issues.push(message.text());
    }
  });
  page.on("pageerror", (error) => {
    issues.push(error.message);
  });
  return issues;
}

function startServer(example, port) {
  const cwd = resolve(repoRoot, example.path);
  const args =
    example.runner === "next"
      ? ["exec", "next", "start", "--hostname", "127.0.0.1", "--port", String(port)]
      : ["exec", "vite", "preview", "--host", "127.0.0.1", "--port", String(port), "--strictPort"];

  const child = spawn(pnpm, args, {
    cwd,
    detached: process.platform !== "win32",
    env: { ...process.env, FORCE_COLOR: "0", NO_COLOR: "1" },
    stdio: ["ignore", "pipe", "pipe"],
  });

  let logs = "";
  const append = (chunk) => {
    logs = `${logs}${chunk.toString()}`.slice(-4000);
  };
  child.stdout.on("data", append);
  child.stderr.on("data", append);
  child.on("exit", (code, signal) => {
    if (code !== null && code !== 0) {
      failures.push(`${example.name}: example server exited with code ${code}\n${logs}`);
    } else if (signal && signal !== "SIGTERM") {
      failures.push(`${example.name}: example server exited from ${signal}\n${logs}`);
    }
  });
  return child;
}

async function stopServer(child) {
  if (child.exitCode !== null) {
    return;
  }
  terminateServerProcess(child, "SIGTERM");
  await new Promise((resolveStop) => {
    const timeout = setTimeout(() => {
      terminateServerProcess(child, "SIGKILL");
      resolveStop();
    }, 3000);
    child.once("exit", () => {
      clearTimeout(timeout);
      resolveStop();
    });
  });
}

function terminateServerProcess(child, signal) {
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

async function waitForServer(url, name) {
  const started = Date.now();
  while (Date.now() - started < 45_000) {
    try {
      const response = await fetch(url);
      if (response.ok) {
        return;
      }
    } catch {
      // Server is still booting.
    }
    await new Promise((resolveWait) => setTimeout(resolveWait, 500));
  }
  throw new Error(`${name} example server did not respond at ${url}`);
}

async function findFreePort(preferredPort) {
  for (let port = preferredPort; port < preferredPort + 100; port += 1) {
    if (await canListen(port)) {
      return port;
    }
  }
  throw new Error(`No free port found near ${preferredPort}`);
}

function canListen(port) {
  return new Promise((resolveCanListen) => {
    const server = createServer();
    server.once("error", () => resolveCanListen(false));
    server.once("listening", () => {
      server.close(() => resolveCanListen(true));
    });
    server.listen(port, "127.0.0.1");
  });
}

function formatError(error) {
  return error instanceof Error ? error.message : String(error);
}
