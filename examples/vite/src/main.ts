import "./styles.css";

type Theme = "default" | "va" | "usda";
type Mode = "light" | "dark" | "system";

const root = document.documentElement;
const app = document.querySelector<HTMLElement>("#app");

if (!app) {
  throw new Error("Ashlar Vite example: missing #app root in index.html");
}

const themeLabels: Record<Theme, { label: string; sigil: string; word: string }> = {
  default: { label: "Default", sigil: "Default", word: "Baseline" },
  va: { label: "VA", sigil: "VA", word: "VA.gov" },
  usda: { label: "USDA", sigil: "USDA", word: "Brand plays" },
};

app.innerHTML = `
  <header class="case-header">
    <div>
      <p class="eyebrow">Benefits operations</p>
      <h1>Case board for nutrition assistance renewals</h1>
      <p class="lead">
        Triage urgent applications, review verification gaps, and keep a same-day service queue
        moving across agency themes.
      </p>
    </div>
    <fieldset class="agency-switcher">
      <legend class="visually-hidden">Agency theme</legend>
      <span class="agency-status">
        <span class="agency-mark" data-selected-agency-mark data-agency="default" aria-hidden="true">
          <span class="agency-mark__sigil">Default</span>
          <span class="agency-mark__word">Baseline</span>
        </span>
        <span>
          <span class="agency-trigger__label">Agency theme</span>
          <span class="agency-trigger__name" data-selected-agency>Default</span>
        </span>
      </span>
      <button
        class="agency-trigger"
        type="button"
        aria-haspopup="dialog"
        aria-expanded="false"
        aria-controls="agency-switcher-dialog"
        data-agency-open
      >
        Switch agency
      </button>
    </fieldset>
    <div class="agency-dialog-backdrop" data-agency-dialog hidden>
      <button class="agency-dialog-scrim" type="button" aria-label="Close agency theme menu" data-agency-scrim></button>
      <div
        class="agency-panel"
        id="agency-switcher-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="agency-switcher-title"
        aria-describedby="agency-switcher-copy"
        tabindex="-1"
      >
        <div class="agency-panel__header">
          <div>
            <span class="agency-panel__kicker">Theme</span>
            <h2 class="agency-panel__title" id="agency-switcher-title">Choose agency theme</h2>
            <p class="agency-panel__copy" id="agency-switcher-copy">
              Apply a source-backed theme to preview how the same Ashlar components adapt
              across agency systems.
            </p>
          </div>
          <button class="agency-close" type="button" aria-label="Close agency theme menu" data-agency-close>
            x
          </button>
        </div>
        <fieldset class="agency-grid">
          <legend class="visually-hidden">Agency theme</legend>
          <button class="agency-card" data-theme="default" type="button">
            <span>
              <span class="agency-mark" data-agency="default" aria-hidden="true">
                <span class="agency-mark__sigil">Default</span>
                <span class="agency-mark__word">Baseline</span>
              </span>
              <span class="agency-card__name">Default</span>
              <span class="agency-card__note">USWDS color and type sources.</span>
            </span>
            <span class="agency-card__source">USWDS</span>
          </button>
          <button class="agency-card" data-theme="va" type="button">
            <span>
              <span class="agency-mark" data-agency="va" aria-hidden="true">
                <span class="agency-mark__sigil">VA</span>
                <span class="agency-mark__word">VA.gov</span>
              </span>
              <span class="agency-card__name">VA</span>
              <span class="agency-card__note">VA.gov color and typography.</span>
            </span>
            <span class="agency-card__source">VA.gov</span>
          </button>
          <button class="agency-card" data-theme="usda" type="button">
            <span>
              <span class="agency-mark" data-agency="usda" aria-hidden="true">
                <span class="agency-mark__sigil">USDA</span>
                <span class="agency-mark__word">Brand plays</span>
              </span>
              <span class="agency-card__name">USDA</span>
              <span class="agency-card__note">USDA brand plays plus USWDS.</span>
            </span>
            <span class="agency-card__source">USDA</span>
          </button>
        </fieldset>
        <fieldset class="mode-switch">
          <legend class="visually-hidden">Color mode</legend>
          <button class="control-button" data-mode="light" type="button">Light</button>
          <button class="control-button" data-mode="dark" type="button">Dark</button>
          <button class="control-button" data-mode="system" type="button">System</button>
        </fieldset>
      </div>
    </div>
  </header>

  <section class="metrics" aria-label="Queue metrics">
    <div class="metric bg-ashlar-surface border-ashlar-border rounded-ashlar-card">
      <p class="metric__label">Open cases</p>
      <p class="metric__value">42</p>
    </div>
    <div class="metric bg-ashlar-surface border-ashlar-border rounded-ashlar-card">
      <p class="metric__label">Urgent today</p>
      <p class="metric__value">8</p>
    </div>
    <div class="metric bg-ashlar-surface border-ashlar-border rounded-ashlar-card">
      <p class="metric__label">Avg wait</p>
      <p class="metric__value">14m</p>
    </div>
    <div class="metric bg-ashlar-surface border-ashlar-border rounded-ashlar-card">
      <p class="metric__label">Ready to approve</p>
      <p class="metric__value">11</p>
    </div>
  </section>

  <div class="ashlar-alert" role="status">
    <p>Six cases need income verification before 3:00 PM. Two have interpreter requests.</p>
  </div>

  <section class="toolbar" aria-label="Board filters">
    <div class="ashlar-form-field">
      <label class="ashlar-form-field__label" for="case-search">Search cases</label>
      <p class="ashlar-form-field__hint" id="case-search-hint">Name, case ID, or county.</p>
      <input
        class="ashlar-text-input"
        id="case-search"
        name="case-search"
        aria-describedby="case-search-hint"
        value="Prince George's"
      >
    </div>
    <div class="ashlar-form-field">
      <label class="ashlar-form-field__label" for="program">Program</label>
      <select class="ashlar-select" id="program" name="program">
        <option>SNAP renewal</option>
        <option>WIC intake</option>
        <option>Summer EBT</option>
      </select>
    </div>
    <fieldset class="ashlar-radio-group view-toggle" aria-describedby="view-mode-hint">
      <legend class="ashlar-radio-group__legend">View</legend>
      <p class="ashlar-radio-group__hint" id="view-mode-hint">Choose queue layout.</p>
      <div class="ashlar-radio-option">
        <input class="ashlar-radio" id="view-board" name="view-mode" type="radio" checked>
        <label class="ashlar-radio-label" for="view-board">Board</label>
      </div>
      <div class="ashlar-radio-option">
        <input class="ashlar-radio" id="view-list" name="view-mode" type="radio">
        <label class="ashlar-radio-label" for="view-list">List</label>
      </div>
    </fieldset>
    <div class="ashlar-checkbox-field">
      <input class="ashlar-checkbox" id="urgent-only" name="urgent-only" type="checkbox" checked>
      <label class="ashlar-checkbox-label" for="urgent-only">Urgent only</label>
    </div>
  </section>

  <section class="board" aria-label="Application case board">
    <article class="board-column" aria-labelledby="new-title">
      <div class="board-column__header">
        <h2 id="new-title">New intake</h2>
        <span class="board-count">14</span>
      </div>
      <section class="case-card" aria-labelledby="case-1-title">
        <div class="case-card__header">
          <div>
            <p class="case-card__meta">PG-2048</p>
            <h3 id="case-1-title">Maya Johnson</h3>
            <p class="case-card__program">SNAP renewal</p>
          </div>
          <span class="priority">Urgent</span>
        </div>
        <div class="tag-row">
          <span class="tag">Income uploaded</span>
          <span class="tag">Phone preferred</span>
        </div>
        <div class="case-card__actions">
          <button class="ashlar-button min-h-ashlar-button-min-block-size rounded-ashlar-button bg-ashlar-action-primary-bg text-ashlar-action-primary-fg" data-variant="primary" type="button">Open case</button>
          <button class="ashlar-button" data-variant="secondary" type="button">Assign</button>
        </div>
      </section>
      <section class="case-card" aria-labelledby="case-2-title">
        <div class="case-card__header">
          <div>
            <p class="case-card__meta">MO-1182</p>
            <h3 id="case-2-title">Andre Wilson</h3>
            <p class="case-card__program">Summer EBT</p>
          </div>
        </div>
        <div class="tag-row">
          <span class="tag">New household</span>
          <span class="tag">Spanish</span>
        </div>
        <div class="case-card__actions">
          <button class="ashlar-button" data-variant="primary" type="button">Open case</button>
          <button class="ashlar-button" data-variant="secondary" type="button">Message</button>
        </div>
      </section>
    </article>

    <article class="board-column" aria-labelledby="docs-title">
      <div class="board-column__header">
        <h2 id="docs-title">Awaiting documents</h2>
        <span class="board-count">17</span>
      </div>
      <section class="case-card" aria-labelledby="case-3-title">
        <div class="case-card__header">
          <div>
            <p class="case-card__meta">PG-1933</p>
            <h3 id="case-3-title">Rosa Martinez</h3>
            <p class="case-card__program">WIC intake</p>
          </div>
          <span class="priority">Due 2 PM</span>
        </div>
        <div class="tag-row">
          <span class="tag">Needs ID</span>
          <span class="tag">Interpreter</span>
        </div>
        <div class="case-card__actions">
          <button class="ashlar-button" data-variant="primary" type="button">Review uploads</button>
          <button class="ashlar-button" data-variant="secondary" type="button">Send reminder</button>
        </div>
      </section>
      <section class="case-card" aria-labelledby="case-4-title">
        <div class="case-card__header">
          <div>
            <p class="case-card__meta">AA-3011</p>
            <h3 id="case-4-title">Samir Patel</h3>
            <p class="case-card__program">SNAP renewal</p>
          </div>
        </div>
        <div class="tag-row">
          <span class="tag">Rent proof</span>
          <span class="tag">SMS sent</span>
        </div>
        <div class="case-card__actions">
          <button class="ashlar-button" data-variant="primary" type="button">Open case</button>
          <button class="ashlar-button" data-variant="secondary" type="button">Snooze</button>
        </div>
      </section>
    </article>

    <article class="board-column" aria-labelledby="approve-title">
      <div class="board-column__header">
        <h2 id="approve-title">Ready for approval</h2>
        <span class="board-count">11</span>
      </div>
      <section class="case-card" aria-labelledby="case-5-title">
        <div class="case-card__header">
          <div>
            <p class="case-card__meta">CH-4520</p>
            <h3 id="case-5-title">Lena Brooks</h3>
            <p class="case-card__program">SNAP renewal</p>
          </div>
        </div>
        <div class="tag-row">
          <span class="tag">Verified</span>
          <span class="tag">Meets threshold</span>
        </div>
        <div class="case-card__actions">
          <button class="ashlar-button" data-variant="primary" type="button">Approve</button>
          <button class="ashlar-button" data-variant="secondary" type="button">Quality check</button>
        </div>
      </section>
      <section class="case-card" aria-labelledby="case-6-title">
        <div class="case-card__header">
          <div>
            <p class="case-card__meta">PG-2120</p>
            <h3 id="case-6-title">Evan Kim</h3>
            <p class="case-card__program">Summer EBT</p>
          </div>
        </div>
        <div class="tag-row">
          <span class="tag">School matched</span>
          <span class="tag">Auto eligible</span>
        </div>
        <div class="case-card__actions">
          <button class="ashlar-button" data-variant="primary" type="button">Approve</button>
          <button class="ashlar-button" data-variant="secondary" type="button">Open case</button>
        </div>
      </section>
    </article>
  </section>
`;

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
