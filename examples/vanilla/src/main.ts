import "./ashlar/ashlar.css";
import "./styles.css";

type Theme = "default" | "va" | "usda";
type Mode = "light" | "dark" | "system";

const root = document.documentElement;

const themeLabels: Record<Theme, { label: string; logo: string }> = {
  default: { label: "Default", logo: "A" },
  va: { label: "VA", logo: "VA" },
  usda: { label: "USDA", logo: "USDA" },
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
    mark.textContent = themeLabels[theme].logo;
    mark.dataset.agency = theme;
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
    button.closest("details")?.removeAttribute("open");
  });
}

for (const button of document.querySelectorAll<HTMLButtonElement>("[data-mode]")) {
  button.addEventListener("click", () => {
    setMode((button.dataset.mode ?? "light") as Mode);
  });
}

setTheme((root.dataset.ashlarTheme ?? "default") as Theme);
setMode((root.dataset.ashlarMode ?? "light") as Mode);
