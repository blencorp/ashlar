import "./ashlar/ashlar.css";
import "./styles.css";

/**
 * The example is data-driven: themes are discovered from the
 * `src/ashlar/themes/*.tokens.json` files written by `ashlar init`. Drop a new
 * agency theme JSON into that directory (or, upstream, into `packages/cli/themes`
 * and re-run init) and it will appear in the theme picker automatically. No
 * code changes required.
 */

type AgencyTheme = {
  name: string;
  title: string;
  description: string;
  sources?: Array<{
    label: string;
    url: string;
    note?: string;
  }>;
  order?: number;
};

type ModeOption = {
  name: "light" | "dark" | "system";
  title: string;
  description: string;
};

type TokenInspection = {
  label: string;
  variable: string;
};

type State = {
  theme: string;
  mode: ModeOption["name"];
};

const themeModules = import.meta.glob<AgencyTheme>("./ashlar/themes/*.tokens.json", {
  eager: true,
  import: "default",
});

const themes: AgencyTheme[] = Object.values(themeModules).sort(
  (a, b) => (a.order ?? 100) - (b.order ?? 100) || a.name.localeCompare(b.name),
);

if (themes.length === 0) {
  throw new Error("Ashlar Vite example: no themes found in src/ashlar/themes. Run `ashlar init`.");
}

const modes: ModeOption[] = [
  { name: "light", title: "Light", description: "Force light palette." },
  { name: "dark", title: "Dark", description: "Force dark palette." },
  { name: "system", title: "System", description: "Follow prefers-color-scheme." },
];

const inspectedTokens: TokenInspection[] = [
  { label: "Action background", variable: "--ashlar-color-action-primary-bg" },
  { label: "Action foreground", variable: "--ashlar-color-action-primary-fg" },
  { label: "Focus ring", variable: "--ashlar-color-focus" },
  { label: "Surface", variable: "--ashlar-color-surface" },
  { label: "Surface subtle", variable: "--ashlar-color-surface-subtle" },
  { label: "Border", variable: "--ashlar-color-border" },
  { label: "Button radius", variable: "--ashlar-button-radius" },
];

const STORAGE_KEY = "ashlar-vite-example/v1";
const themeNames = new Set(themes.map((theme) => theme.name));
const modeNames = new Set(modes.map((mode) => mode.name));
const defaultTheme = themes[0]?.name ?? "default";

function isModeName(value: unknown): value is ModeOption["name"] {
  return typeof value === "string" && modeNames.has(value as ModeOption["name"]);
}

function isThemeName(value: unknown): value is string {
  return typeof value === "string" && themeNames.has(value);
}

function loadState(): State {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return { theme: defaultTheme, mode: "system" };
    }
    const parsed = JSON.parse(raw) as Partial<State>;
    return {
      theme: isThemeName(parsed.theme) ? parsed.theme : defaultTheme,
      mode: isModeName(parsed.mode) ? parsed.mode : "system",
    };
  } catch {
    return { theme: defaultTheme, mode: "system" };
  }
}

function saveState(state: State): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // localStorage may be unavailable (private mode, sandbox); non-fatal for the demo.
  }
}

function buildControl(
  group: "theme" | "mode",
  value: string,
  title: string,
  hint: string,
): HTMLLabelElement {
  const wrapper = document.createElement("label");
  wrapper.className = "control";

  const input = document.createElement("input");
  input.className = "control__input";
  input.type = "radio";
  input.name = group;
  input.value = value;
  wrapper.appendChild(input);

  const body = document.createElement("span");
  body.className = "control__body";

  const labelEl = document.createElement("span");
  labelEl.className = "control__label";
  labelEl.textContent = title;
  body.appendChild(labelEl);

  const hintEl = document.createElement("span");
  hintEl.className = "control__hint";
  hintEl.textContent = hint;
  body.appendChild(hintEl);

  wrapper.appendChild(body);
  return wrapper;
}

function renderControls(): void {
  const themeContainer = document.querySelector<HTMLElement>(
    '[data-control="theme"] [data-control-options]',
  );
  const modeContainer = document.querySelector<HTMLElement>(
    '[data-control="mode"] [data-control-options]',
  );
  if (!themeContainer || !modeContainer) {
    throw new Error("Ashlar Vite example: missing control containers in index.html");
  }

  for (const theme of themes) {
    const sources = theme.sources?.map((source) => source.label).join(" + ");
    themeContainer.appendChild(
      buildControl("theme", theme.name, theme.title, sources ?? theme.description),
    );
  }
  for (const mode of modes) {
    modeContainer.appendChild(buildControl("mode", mode.name, mode.title, mode.description));
  }
}

function renderTokenList(): void {
  const list = document.querySelector<HTMLElement>("[data-token-list]");
  if (!list) {
    return;
  }

  for (const token of inspectedTokens) {
    const li = document.createElement("li");

    const swatch = document.createElement("span");
    swatch.className = "swatch";
    swatch.dataset.tokenSwatch = token.variable;
    swatch.setAttribute("aria-hidden", "true");
    li.appendChild(swatch);

    const tokenWrap = document.createElement("span");
    tokenWrap.className = "token";

    const code = document.createElement("code");
    code.className = "token__variable";
    code.textContent = token.variable;
    tokenWrap.appendChild(code);

    const labelEl = document.createElement("span");
    labelEl.className = "token__label";
    labelEl.textContent = token.label;
    tokenWrap.appendChild(labelEl);

    li.appendChild(tokenWrap);

    const valueEl = document.createElement("span");
    valueEl.className = "value";
    valueEl.dataset.tokenValue = token.variable;
    li.appendChild(valueEl);

    list.appendChild(li);
  }
}

function applyState(state: State): void {
  const root = document.documentElement;
  root.dataset.ashlarTheme = state.theme;
  root.dataset.ashlarMode = state.mode;

  for (const input of document.querySelectorAll<HTMLInputElement>('input[name="theme"]')) {
    input.checked = input.value === state.theme;
  }
  for (const input of document.querySelectorAll<HTMLInputElement>('input[name="mode"]')) {
    input.checked = input.value === state.mode;
  }

  refreshAgencyName(state.theme);
  refreshTokenSwatches();
}

function refreshAgencyName(themeName: string): void {
  const target = document.querySelector<HTMLElement>("[data-active-agency]");
  if (!target) {
    return;
  }
  const theme = themes.find((option) => option.name === themeName) ?? themes[0];
  if (theme) {
    target.textContent = theme.title;
  }
}

function refreshTokenSwatches(): void {
  const computed = getComputedStyle(document.documentElement);
  for (const { variable } of inspectedTokens) {
    const value = computed.getPropertyValue(variable).trim() || "(unset)";
    const swatch = document.querySelector<HTMLElement>(`[data-token-swatch="${variable}"]`);
    const valueLabel = document.querySelector<HTMLElement>(`[data-token-value="${variable}"]`);
    if (swatch) {
      swatch.style.background = value;
    }
    if (valueLabel) {
      valueLabel.textContent = value;
    }
  }
}

function attachHandlers(state: State): void {
  for (const input of document.querySelectorAll<HTMLInputElement>('input[name="theme"]')) {
    input.addEventListener("change", () => {
      const next: State = { ...state, theme: input.value };
      Object.assign(state, next);
      applyState(next);
      saveState(next);
    });
  }
  for (const input of document.querySelectorAll<HTMLInputElement>('input[name="mode"]')) {
    input.addEventListener("change", () => {
      const next: State = { ...state, mode: input.value as ModeOption["name"] };
      Object.assign(state, next);
      applyState(next);
      saveState(next);
    });
  }
}

const app = document.querySelector<HTMLElement>("#app");
if (!app) {
  throw new Error("Ashlar Vite example: missing #app root in index.html");
}

renderControls();
renderTokenList();
const initialState = loadState();
applyState(initialState);
attachHandlers(initialState);
