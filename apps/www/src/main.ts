import "./styles.css";

/**
 * Ashlar marketing site — vanilla TypeScript port of "Ashlar Landing v2.html"
 *
 * Behaviors:
 * - Generate inline SVG icons (US flag, GitHub octocat) into [data-icon] slots.
 * - Generate the animated running-bond ashlar hero pattern.
 * - Render the theme toggle (light/dark + 4 dark palettes) into the nav.
 * - Run the typing-loop terminal animation.
 * - Persist theme/palette to localStorage.
 *
 * No framework runtime. Bundle stays small enough that the page loads under
 * 10 kB gzipped — the same bundle target Ashlar holds itself to.
 */

// ─────────────────────────────────────────────────────────────────────────
// SVG: US flag (19:10, 13 stripes, 50 stars 6-5-6-5-6-5-6-5-6)
// ─────────────────────────────────────────────────────────────────────────

function buildUSFlag(): SVGSVGElement {
  const ns = "http://www.w3.org/2000/svg";
  const W = 190;
  const H = 100;
  const stripeH = H / 13;
  const cantonW = 0.4 * W;
  const cantonH = stripeH * 7;

  const svg = document.createElementNS(ns, "svg");
  svg.setAttribute("class", "al-usflag");
  svg.setAttribute("viewBox", `0 0 ${W} ${H}`);
  svg.setAttribute("role", "img");
  svg.setAttribute("aria-label", "United States flag");
  svg.setAttribute("xmlns", ns);

  const white = document.createElementNS(ns, "rect");
  white.setAttribute("width", String(W));
  white.setAttribute("height", String(H));
  white.setAttribute("fill", "#FFFFFF");
  svg.appendChild(white);

  for (const i of [0, 2, 4, 6, 8, 10, 12]) {
    const stripe = document.createElementNS(ns, "rect");
    stripe.setAttribute("x", "0");
    stripe.setAttribute("y", String(i * stripeH));
    stripe.setAttribute("width", String(W));
    stripe.setAttribute("height", String(stripeH));
    stripe.setAttribute("fill", "#B22234");
    svg.appendChild(stripe);
  }

  const canton = document.createElementNS(ns, "rect");
  canton.setAttribute("width", String(cantonW));
  canton.setAttribute("height", String(cantonH));
  canton.setAttribute("fill", "#0A2240");
  svg.appendChild(canton);

  const xStep = cantonW / 12;
  const yStep = cantonH / 10;
  const starR = stripeH * 0.32;
  const rows = [
    { y: 0, count: 6, offset: 0 },
    { y: 1, count: 5, offset: 0.5 },
    { y: 2, count: 6, offset: 0 },
    { y: 3, count: 5, offset: 0.5 },
    { y: 4, count: 6, offset: 0 },
    { y: 5, count: 5, offset: 0.5 },
    { y: 6, count: 6, offset: 0 },
    { y: 7, count: 5, offset: 0.5 },
    { y: 8, count: 6, offset: 0 },
  ];

  const buildStar = (cx: number, cy: number, r: number): string => {
    const pts: string[] = [];
    for (let i = 0; i < 10; i++) {
      const ang = -Math.PI / 2 + (i * Math.PI) / 5;
      const rr = i % 2 === 0 ? r : r * 0.4;
      pts.push(`${(cx + rr * Math.cos(ang)).toFixed(2)},${(cy + rr * Math.sin(ang)).toFixed(2)}`);
    }
    return pts.join(" ");
  };

  for (const row of rows) {
    const yC = yStep * (1 + row.y);
    for (let i = 0; i < row.count; i++) {
      const xC = xStep * (1 + 2 * i + (row.offset === 0.5 ? 1 : 0));
      const star = document.createElementNS(ns, "polygon");
      star.setAttribute("points", buildStar(xC, yC, starR));
      star.setAttribute("fill", "#FFFFFF");
      svg.appendChild(star);
    }
  }

  return svg;
}

// ─────────────────────────────────────────────────────────────────────────
// SVG: GitHub octocat
// ─────────────────────────────────────────────────────────────────────────

function buildGitHubIcon(size = 16): SVGSVGElement {
  const ns = "http://www.w3.org/2000/svg";
  const svg = document.createElementNS(ns, "svg");
  svg.setAttribute("width", String(size));
  svg.setAttribute("height", String(size));
  svg.setAttribute("viewBox", "0 0 16 16");
  svg.setAttribute("fill", "currentColor");
  svg.setAttribute("aria-hidden", "true");
  const path = document.createElementNS(ns, "path");
  path.setAttribute("fill-rule", "evenodd");
  path.setAttribute("clip-rule", "evenodd");
  path.setAttribute(
    "d",
    "M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0 0 16 8c0-4.42-3.58-8-8-8z",
  );
  svg.appendChild(path);
  return svg;
}

// ─────────────────────────────────────────────────────────────────────────
// SVG: animated running-bond ashlar hero pattern
// ─────────────────────────────────────────────────────────────────────────

function buildAshlarHeroPattern(): SVGSVGElement {
  const ns = "http://www.w3.org/2000/svg";
  const W = 1600;
  const H = 720;
  const STONE_W = 224;
  const COURSE_H = 56;
  const SWEEP_DUR = 1.1;
  const RISE_DUR = 0.55;
  const COURSE_LAG = 0.55;
  const START = 0.25;

  const courseStart = (course: number) => START + course * COURSE_LAG;

  const svg = document.createElementNS(ns, "svg");
  svg.setAttribute("class", "v2-ashlar-svg");
  svg.setAttribute("viewBox", `0 0 ${W} ${H}`);
  svg.setAttribute("preserveAspectRatio", "none");
  svg.setAttribute("aria-hidden", "true");

  let courseIdx = 0;

  // Horizontal lines (one per course; sweep left-to-right)
  for (let y = 0; y < H; y += COURSE_H) {
    const line = document.createElementNS(ns, "line");
    line.setAttribute("class", "v2-line-sweep");
    line.setAttribute("x1", "0");
    line.setAttribute("y1", String(y + 0.5));
    line.setAttribute("x2", String(W));
    line.setAttribute("y2", String(y + 0.5));
    line.setAttribute("stroke-dasharray", String(W));
    line.setAttribute("stroke-dashoffset", String(W));
    line.style.setProperty("--line-duration", `${SWEEP_DUR}s`);
    line.style.setProperty("--line-delay", `${courseStart(courseIdx).toFixed(3)}s`);
    svg.appendChild(line);
    courseIdx++;
  }

  // Final bottom horizontal
  {
    const finalLine = document.createElementNS(ns, "line");
    finalLine.setAttribute("class", "v2-line-sweep");
    finalLine.setAttribute("x1", "0");
    finalLine.setAttribute("y1", String(H + 0.5));
    finalLine.setAttribute("x2", String(W));
    finalLine.setAttribute("y2", String(H + 0.5));
    finalLine.setAttribute("stroke-dasharray", String(W));
    finalLine.setAttribute("stroke-dashoffset", String(W));
    finalLine.style.setProperty("--line-duration", `${SWEEP_DUR}s`);
    finalLine.style.setProperty("--line-delay", `${courseStart(courseIdx).toFixed(3)}s`);
    svg.appendChild(finalLine);
  }

  // Vertical lines (running-bond offset every other course)
  courseIdx = 0;
  for (let y = 0; y < H; y += COURSE_H) {
    const offset = courseIdx % 2 === 0 ? 0 : STONE_W / 2;
    for (let x = offset; x <= W; x += STONE_W) {
      const wave = (x / W) * 0.45;
      const delay = courseStart(courseIdx) + 0.45 + wave;
      const line = document.createElementNS(ns, "line");
      line.setAttribute("class", "v2-line-rise");
      line.setAttribute("x1", String(x + 0.5));
      line.setAttribute("y1", String(y));
      line.setAttribute("x2", String(x + 0.5));
      line.setAttribute("y2", String(y + COURSE_H));
      line.setAttribute("stroke-dasharray", String(COURSE_H));
      line.setAttribute("stroke-dashoffset", String(COURSE_H));
      line.style.setProperty("--line-duration", `${RISE_DUR}s`);
      line.style.setProperty("--line-delay", `${delay.toFixed(3)}s`);
      svg.appendChild(line);
    }
    courseIdx++;
  }

  return svg;
}

// ─────────────────────────────────────────────────────────────────────────
// Theme toggle (light/dark + 4 dark palettes)
// ─────────────────────────────────────────────────────────────────────────

type PaletteKey = "slate" | "warm" | "navy" | "mono";

const DARK_PALETTES: Record<PaletteKey, { label: string; page: string; ink: string; red: string }> =
  {
    slate: { label: "Slate", page: "#101216", ink: "#F2F4F7", red: "#E54B5B" },
    warm: { label: "Warm", page: "#161412", ink: "#F5F1EA", red: "#E66B57" },
    navy: { label: "Navy", page: "#0B1220", ink: "#F2F4F7", red: "#E54B5B" },
    mono: { label: "Mono", page: "#0A0A0A", ink: "#F5F5F5", red: "#E54B5B" },
  };

const STORAGE_THEME = "ashlar-www/theme";
const STORAGE_PALETTE = "ashlar-www/palette";

function readTheme(): "light" | "dark" {
  try {
    const v = localStorage.getItem(STORAGE_THEME);
    if (v === "dark" || v === "light") return v;
  } catch {
    // localStorage may be unavailable; fall through.
  }
  if (typeof window !== "undefined" && window.matchMedia) {
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  }
  return "light";
}

function readPalette(): PaletteKey {
  try {
    const v = localStorage.getItem(STORAGE_PALETTE);
    if (v && v in DARK_PALETTES) return v as PaletteKey;
  } catch {
    // localStorage may be unavailable; fall through.
  }
  return "slate";
}

function persistTheme(theme: "light" | "dark"): void {
  try {
    localStorage.setItem(STORAGE_THEME, theme);
  } catch {
    // non-fatal
  }
}

function persistPalette(palette: PaletteKey): void {
  try {
    localStorage.setItem(STORAGE_PALETTE, palette);
  } catch {
    // non-fatal
  }
}

function buildToggleIcon(theme: "light" | "dark"): SVGSVGElement {
  const ns = "http://www.w3.org/2000/svg";
  const svg = document.createElementNS(ns, "svg");
  svg.setAttribute("width", "15");
  svg.setAttribute("height", "15");
  svg.setAttribute("viewBox", "0 0 24 24");
  svg.setAttribute("fill", "none");
  svg.setAttribute("stroke", "currentColor");
  svg.setAttribute("stroke-width", "1.6");
  svg.setAttribute("stroke-linecap", "round");
  svg.setAttribute("stroke-linejoin", "round");
  svg.setAttribute("aria-hidden", "true");

  if (theme === "dark") {
    // Sun
    const g = document.createElementNS(ns, "g");
    const c = document.createElementNS(ns, "circle");
    c.setAttribute("cx", "12");
    c.setAttribute("cy", "12");
    c.setAttribute("r", "4");
    g.appendChild(c);
    const rays = document.createElementNS(ns, "path");
    rays.setAttribute(
      "d",
      "M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41",
    );
    g.appendChild(rays);
    svg.appendChild(g);
  } else {
    // Moon
    const moon = document.createElementNS(ns, "path");
    moon.setAttribute("d", "M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z");
    svg.appendChild(moon);
  }

  return svg;
}

function renderThemeToggle(host: HTMLElement): void {
  let theme = readTheme();
  let palette = readPalette();
  document.documentElement.dataset.theme = theme;
  document.documentElement.dataset.palette = palette;

  const toggleBtn = document.createElement("button");
  toggleBtn.type = "button";
  toggleBtn.className = "al-ghost v2-themetog";

  let toggleIcon = buildToggleIcon(theme);
  const toggleLabel = document.createElement("span");
  toggleLabel.textContent = theme === "dark" ? "Light" : "Dark";
  toggleBtn.appendChild(toggleIcon);
  toggleBtn.appendChild(toggleLabel);

  const setToggleAria = () => {
    const next = theme === "dark" ? "Switch to light theme" : "Switch to dark theme";
    toggleBtn.setAttribute("aria-label", next);
    toggleBtn.setAttribute("title", next);
  };
  setToggleAria();

  const paletteWrap = document.createElement("span");
  paletteWrap.className = "v2-palette";
  paletteWrap.setAttribute("role", "radiogroup");
  paletteWrap.setAttribute("aria-label", "Dark theme palette");

  const updatePaletteVisibility = () => {
    paletteWrap.style.display = theme === "dark" ? "inline-flex" : "none";
  };

  const rebuildPaletteSwatches = () => {
    paletteWrap.replaceChildren();
    for (const [key, p] of Object.entries(DARK_PALETTES) as Array<
      [PaletteKey, (typeof DARK_PALETTES)[PaletteKey]]
    >) {
      const swatch = document.createElement("button");
      swatch.type = "button";
      swatch.setAttribute("role", "radio");
      swatch.setAttribute("aria-checked", palette === key ? "true" : "false");
      swatch.className = `v2-swatch${palette === key ? " on" : ""}`;
      swatch.title = p.label;
      swatch.style.background = p.page;
      swatch.style.borderColor = palette === key ? p.ink : "transparent";

      const stripeRed = document.createElement("span");
      stripeRed.style.background = p.red;
      const stripeInk = document.createElement("span");
      stripeInk.style.background = p.ink;
      swatch.appendChild(stripeRed);
      swatch.appendChild(stripeInk);

      swatch.addEventListener("click", () => {
        palette = key;
        document.documentElement.dataset.palette = palette;
        persistPalette(palette);
        rebuildPaletteSwatches();
      });

      paletteWrap.appendChild(swatch);
    }
  };

  const applyTheme = (next: "light" | "dark"): void => {
    theme = next;
    document.documentElement.dataset.theme = theme;
    persistTheme(theme);
    setToggleAria();
    toggleLabel.textContent = theme === "dark" ? "Light" : "Dark";
    const fresh = buildToggleIcon(theme);
    toggleIcon.replaceWith(fresh);
    toggleIcon = fresh;
    updatePaletteVisibility();
  };

  toggleBtn.addEventListener("click", () => {
    applyTheme(theme === "dark" ? "light" : "dark");
  });

  rebuildPaletteSwatches();
  updatePaletteVisibility();

  host.appendChild(toggleBtn);
  host.appendChild(paletteWrap);
}

// ─────────────────────────────────────────────────────────────────────────
// Terminal animation
// ─────────────────────────────────────────────────────────────────────────

type ScriptLine = { kind: "cmd" | "out"; text: string };

const SCRIPT: ScriptLine[] = [
  { kind: "cmd", text: "npx @blen/ashlar init" },
  { kind: "out", text: "verified signature  ·  sigstore" },
  { kind: "out", text: "resolved 14 components  ·  wrote ./components" },
  { kind: "cmd", text: "ashlar add field button alert" },
  { kind: "out", text: "  field    →  ./components/field" },
  { kind: "out", text: "  button   →  ./components/button" },
  { kind: "out", text: "  alert    →  ./components/alert" },
  { kind: "out", text: "3 components added  ·  WCAG 2.2 AA evidence attached" },
  { kind: "cmd", text: "ashlar verify" },
  { kind: "out", text: "all components signed and intact" },
];

function runTerminal(host: HTMLElement): void {
  let step = 0;
  let typed = "";
  let timer: number | null = null;
  let restartTimer: number | null = null;

  const cancelTimers = () => {
    if (timer !== null) {
      window.clearTimeout(timer);
      timer = null;
    }
    if (restartTimer !== null) {
      window.clearTimeout(restartTimer);
      restartTimer = null;
    }
  };

  const buildCompletedLine = (line: ScriptLine): HTMLDivElement => {
    const div = document.createElement("div");
    if (line.kind === "cmd") {
      div.className = "line cmd";
      const dollar = document.createElement("span");
      dollar.className = "d";
      dollar.textContent = "$";
      div.appendChild(dollar);
      div.appendChild(document.createTextNode(line.text));
    } else {
      const indented = line.text.startsWith("  ");
      div.className = `line out${indented ? " plain" : ""}`;
      div.textContent = line.text;
    }
    return div;
  };

  const buildTypingCmdLine = (textSoFar: string): HTMLDivElement => {
    const div = document.createElement("div");
    div.className = "line cmd";
    const dollar = document.createElement("span");
    dollar.className = "d";
    dollar.textContent = "$";
    div.appendChild(dollar);
    div.appendChild(document.createTextNode(textSoFar));
    const cursor = document.createElement("span");
    cursor.className = "cur";
    div.appendChild(cursor);
    return div;
  };

  const buildIdleCursorLine = (): HTMLDivElement => {
    const div = document.createElement("div");
    div.className = "line cmd";
    const dollar = document.createElement("span");
    dollar.className = "d";
    dollar.textContent = "$";
    div.appendChild(dollar);
    const cursor = document.createElement("span");
    cursor.className = "cur";
    div.appendChild(cursor);
    return div;
  };

  const render = (): void => {
    const fragment = document.createDocumentFragment();
    for (let i = 0; i < step && i < SCRIPT.length; i++) {
      const line = SCRIPT[i];
      if (line) fragment.appendChild(buildCompletedLine(line));
    }

    if (step < SCRIPT.length) {
      const cur = SCRIPT[step];
      if (cur && cur.kind === "cmd") {
        fragment.appendChild(buildTypingCmdLine(typed));
      } else if (cur) {
        fragment.appendChild(buildIdleCursorLine());
      }
    }

    host.replaceChildren(fragment);
  };

  const tick = (): void => {
    if (step >= SCRIPT.length) {
      restartTimer = window.setTimeout(() => {
        step = 0;
        typed = "";
        tick();
      }, 3200);
      return;
    }

    const line = SCRIPT[step];
    if (!line) return;

    if (line.kind === "cmd") {
      if (typed.length < line.text.length) {
        typed = line.text.slice(0, typed.length + 1);
        render();
        timer = window.setTimeout(tick, 38);
      } else {
        timer = window.setTimeout(() => {
          step += 1;
          typed = "";
          render();
          tick();
        }, 480);
      }
    } else {
      timer = window.setTimeout(() => {
        step += 1;
        render();
        tick();
      }, 280);
    }
  };

  render();
  tick();

  document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
      cancelTimers();
    } else {
      tick();
    }
  });
}

// ─────────────────────────────────────────────────────────────────────────
// Wire up
// ─────────────────────────────────────────────────────────────────────────

function injectIcons(): void {
  for (const slot of document.querySelectorAll<HTMLElement>('[data-icon="us-flag"]')) {
    slot.appendChild(buildUSFlag());
  }
  for (const slot of document.querySelectorAll<HTMLElement>('[data-icon="github"]')) {
    slot.appendChild(buildGitHubIcon(15));
  }
}

function injectHeroPattern(): void {
  const host = document.querySelector<HTMLElement>("[data-hero-pattern]");
  if (host) {
    host.appendChild(buildAshlarHeroPattern());
  }
}

function injectThemeToggle(): void {
  const host = document.querySelector<HTMLElement>("[data-theme-toggle]");
  if (host) {
    renderThemeToggle(host);
  }
}

function injectTerminal(): void {
  const host = document.querySelector<HTMLElement>("[data-terminal-body]");
  if (host) {
    runTerminal(host);
  }
}

function wireGitHubButton(): void {
  for (const btn of document.querySelectorAll<HTMLButtonElement>('[data-action="open-github"]')) {
    btn.addEventListener("click", () => {
      window.open("https://github.com/blencorp/ashlar", "_blank", "noopener,noreferrer");
    });
  }
}

function wireCopyInit(): void {
  for (const btn of document.querySelectorAll<HTMLButtonElement>('[data-action="copy-init"]')) {
    btn.addEventListener("click", async () => {
      try {
        await navigator.clipboard.writeText("npx @blen/ashlar init");
      } catch {
        // Clipboard unavailable; the user can still read and copy manually.
      }
    });
  }
}

injectIcons();
injectHeroPattern();
injectThemeToggle();
injectTerminal();
wireGitHubButton();
wireCopyInit();
