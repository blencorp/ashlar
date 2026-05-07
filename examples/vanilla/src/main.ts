import "./ashlar/ashlar.css";
import "./styles.css";

type Theme = "default" | "va" | "usda";
type Mode = "light" | "dark" | "system";

const root = document.documentElement;

const themeLabels: Record<Theme, { label: string; sigil: string; word: string }> = {
  default: { label: "Default", sigil: "Default", word: "Baseline" },
  va: { label: "VA", sigil: "VA", word: "VA.gov" },
  usda: { label: "USDA", sigil: "USDA", word: "Brand plays" },
};

function setTheme(theme: Theme): void {
  root.dataset.ashlarTheme = theme;
  for (const button of document.querySelectorAll<HTMLButtonElement>("[data-theme]")) {
    button.ariaPressed = String(button.dataset.theme === theme);
  }
  for (const label of document.querySelectorAll<HTMLElement>("[data-selected-agency]")) {
    label.textContent = themeLabels[theme].label;
  }
  for (const mark of document.querySelectorAll<HTMLElement>("[data-selected-agency-mark]")) {
    mark.dataset.agency = theme;
    const sigil = mark.querySelector<HTMLElement>(".agency-mark__sigil");
    const word = mark.querySelector<HTMLElement>(".agency-mark__word");
    if (sigil) {
      sigil.textContent = themeLabels[theme].sigil;
    }
    if (word) {
      word.textContent = themeLabels[theme].word;
    }
  }
}

function setMode(mode: Mode): void {
  root.dataset.ashlarMode = mode;
  for (const button of document.querySelectorAll<HTMLButtonElement>("[data-mode]")) {
    button.ariaPressed = String(button.dataset.mode === mode);
  }
}

for (const button of document.querySelectorAll<HTMLButtonElement>("[data-theme]")) {
  button.addEventListener("click", () => {
    setTheme((button.dataset.theme ?? "default") as Theme);
    closeAgencyDialog();
  });
}

for (const button of document.querySelectorAll<HTMLButtonElement>("[data-mode]")) {
  button.addEventListener("click", () => {
    setMode((button.dataset.mode ?? "light") as Mode);
  });
}

const dialog = document.querySelector<HTMLElement>("[data-agency-dialog]");
const panel = document.querySelector<HTMLElement>("#agency-switcher-dialog");
const openButton = document.querySelector<HTMLButtonElement>("[data-agency-open]");
const closeButton = document.querySelector<HTMLButtonElement>("[data-agency-close]");
const scrimButton = document.querySelector<HTMLButtonElement>("[data-agency-scrim]");

function openAgencyDialog(): void {
  if (!dialog || !panel || !openButton) {
    return;
  }
  dialog.hidden = false;
  openButton.ariaExpanded = "true";
  panel.focus({ preventScroll: true });
}

function closeAgencyDialog(): void {
  if (!dialog || !openButton) {
    return;
  }
  dialog.hidden = true;
  openButton.ariaExpanded = "false";
  openButton.focus({ preventScroll: true });
}

openButton?.addEventListener("click", openAgencyDialog);
closeButton?.addEventListener("click", closeAgencyDialog);
scrimButton?.addEventListener("click", closeAgencyDialog);
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && dialog && !dialog.hidden) {
    closeAgencyDialog();
  }
});

setTheme((root.dataset.ashlarTheme ?? "default") as Theme);
setMode((root.dataset.ashlarMode ?? "light") as Mode);
