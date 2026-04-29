import "./styles.css";

const root = document.documentElement;
const summary = document.querySelector<HTMLElement>("[data-theme-summary]");
const agencyLabels = new Map([
  ["civic", "Civic"],
  ["forest", "Forest"],
  ["transit", "Transit"],
]);

function setPressed(selector: string, activeValue: string, attribute: string) {
  for (const button of document.querySelectorAll<HTMLButtonElement>(selector)) {
    button.setAttribute("aria-pressed", String(button.dataset[attribute] === activeValue));
  }
}

function updateSummary() {
  if (!summary) {
    return;
  }

  const agency = agencyLabels.get(root.dataset.agency ?? "civic") ?? "Civic";
  const theme = root.dataset.theme ?? "system";
  summary.textContent = `${agency} tokens, ${theme} mode`;
}

for (const button of document.querySelectorAll<HTMLButtonElement>("[data-theme-option]")) {
  button.addEventListener("click", () => {
    const theme = button.dataset.themeOption ?? "system";
    root.dataset.theme = theme;
    setPressed("[data-theme-option]", theme, "themeOption");
    updateSummary();
  });
}

for (const button of document.querySelectorAll<HTMLButtonElement>("[data-agency-option]")) {
  button.addEventListener("click", () => {
    const agency = button.dataset.agencyOption ?? "civic";
    root.dataset.agency = agency;
    setPressed("[data-agency-option]", agency, "agencyOption");
    updateSummary();
  });
}

updateSummary();
