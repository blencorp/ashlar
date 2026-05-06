import "./ashlar/ashlar.css";
import "./styles.css";

type Theme = "default" | "va" | "usda";
type Mode = "light" | "dark" | "system";

const root = document.documentElement;

function setTheme(theme: Theme): void {
  root.dataset.ashlarTheme = theme;
  for (const button of document.querySelectorAll<HTMLButtonElement>("[data-theme]")) {
    button.ariaPressed = String(button.dataset.theme === theme);
  }
}

function setMode(mode: Mode): void {
  root.dataset.ashlarMode = mode;
  for (const button of document.querySelectorAll<HTMLButtonElement>("[data-mode]")) {
    button.ariaPressed = String(button.dataset.mode === mode);
  }
}

for (const button of document.querySelectorAll<HTMLButtonElement>("[data-theme]")) {
  button.addEventListener("click", () => setTheme((button.dataset.theme ?? "default") as Theme));
}

for (const button of document.querySelectorAll<HTMLButtonElement>("[data-mode]")) {
  button.addEventListener("click", () => setMode((button.dataset.mode ?? "system") as Mode));
}

setTheme((root.dataset.ashlarTheme ?? "default") as Theme);
setMode((root.dataset.ashlarMode ?? "system") as Mode);
