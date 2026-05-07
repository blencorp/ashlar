"use client";

import { useEffect, useState } from "react";

type Theme = "default" | "va" | "usda";
type Mode = "light" | "dark" | "system";
type ThemeOption = {
  value: Theme;
  label: string;
  sigil: string;
  word: string;
  note: string;
  source: string;
};

const themes = [
  {
    value: "default",
    label: "Default",
    sigil: "Default",
    word: "Baseline",
    note: "USWDS color and type sources.",
    source: "USWDS",
  },
  {
    value: "va",
    label: "VA",
    sigil: "VA",
    word: "VA.gov",
    note: "VA.gov color and typography.",
    source: "VA.gov",
  },
  {
    value: "usda",
    label: "USDA",
    sigil: "USDA",
    word: "Brand plays",
    note: "USDA brand plays plus USWDS.",
    source: "USDA",
  },
] satisfies [ThemeOption, ...ThemeOption[]];

const modes: Array<{ value: Mode; label: string }> = [
  { value: "light", label: "Light" },
  { value: "dark", label: "Dark" },
  { value: "system", label: "System" },
];

const metrics = [
  ["Open cases", "42"],
  ["Urgent today", "8"],
  ["Avg wait", "14m"],
  ["Ready to approve", "11"],
];

const columns = [
  {
    id: "new",
    title: "New intake",
    count: 14,
    cases: [
      {
        id: "PG-2048",
        name: "Maya Johnson",
        program: "SNAP renewal",
        priority: "Urgent",
        tags: ["Income uploaded", "Phone preferred"],
        primaryAction: "Open case",
        secondaryAction: "Assign",
      },
      {
        id: "MO-1182",
        name: "Andre Wilson",
        program: "Summer EBT",
        tags: ["New household", "Spanish"],
        primaryAction: "Open case",
        secondaryAction: "Message",
      },
    ],
  },
  {
    id: "docs",
    title: "Awaiting documents",
    count: 17,
    cases: [
      {
        id: "PG-1933",
        name: "Rosa Martinez",
        program: "WIC intake",
        priority: "Due 2 PM",
        tags: ["Needs ID", "Interpreter"],
        primaryAction: "Review uploads",
        secondaryAction: "Send reminder",
      },
      {
        id: "AA-3011",
        name: "Samir Patel",
        program: "SNAP renewal",
        tags: ["Rent proof", "SMS sent"],
        primaryAction: "Open case",
        secondaryAction: "Snooze",
      },
    ],
  },
  {
    id: "approve",
    title: "Ready for approval",
    count: 11,
    cases: [
      {
        id: "CH-4520",
        name: "Lena Brooks",
        program: "SNAP renewal",
        tags: ["Verified", "Meets threshold"],
        primaryAction: "Approve",
        secondaryAction: "Quality check",
      },
      {
        id: "PG-2120",
        name: "Evan Kim",
        program: "Summer EBT",
        tags: ["School matched", "Auto eligible"],
        primaryAction: "Approve",
        secondaryAction: "Open case",
      },
    ],
  },
];

export default function Page() {
  const [theme, setTheme] = useState<Theme>("default");
  const [mode, setMode] = useState<Mode>("light");
  const [dialogOpen, setDialogOpen] = useState(false);
  const selectedTheme = themes.find((option) => option.value === theme) ?? themes[0];

  useEffect(() => {
    document.documentElement.dataset.ashlarTheme = theme;
    document.documentElement.dataset.ashlarMode = mode;
  }, [theme, mode]);

  useEffect(() => {
    if (!dialogOpen) {
      return;
    }
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setDialogOpen(false);
      }
    };
    document.addEventListener("keydown", closeOnEscape);
    return () => document.removeEventListener("keydown", closeOnEscape);
  }, [dialogOpen]);

  return (
    <>
      <section
        className="ashlar-banner"
        aria-label="Official website of the United States government"
      >
        <div className="ashlar-banner__inner">
          <p className="ashlar-banner__text">
            <svg
              className="ashlar-banner__flag"
              aria-hidden="true"
              focusable="false"
              viewBox="0 0 16 11"
              xmlns="http://www.w3.org/2000/svg"
            >
              <rect width="16" height="11" fill="#ffffff" />
              <rect data-flag-stripe="" width="16" height="0.846" y="0" fill="#b31942" />
              <rect data-flag-stripe="" width="16" height="0.846" y="1.692" fill="#b31942" />
              <rect data-flag-stripe="" width="16" height="0.846" y="3.384" fill="#b31942" />
              <rect data-flag-stripe="" width="16" height="0.846" y="5.076" fill="#b31942" />
              <rect data-flag-stripe="" width="16" height="0.846" y="6.768" fill="#b31942" />
              <rect data-flag-stripe="" width="16" height="0.846" y="8.46" fill="#b31942" />
              <rect data-flag-stripe="" width="16" height="0.846" y="10.152" fill="#b31942" />
              <rect data-flag-canton="" width="6.4" height="5.923" fill="#005ea8" />
              <g fill="#ffffff">
                <circle data-flag-star="" cx="0.55" cy="0.55" r="0.12" />
                <circle data-flag-star="" cx="1.75" cy="0.55" r="0.12" />
                <circle data-flag-star="" cx="2.95" cy="0.55" r="0.12" />
                <circle data-flag-star="" cx="4.15" cy="0.55" r="0.12" />
                <circle data-flag-star="" cx="5.35" cy="0.55" r="0.12" />
                <circle data-flag-star="" cx="1.15" cy="1.45" r="0.12" />
                <circle data-flag-star="" cx="2.35" cy="1.45" r="0.12" />
                <circle data-flag-star="" cx="3.55" cy="1.45" r="0.12" />
                <circle data-flag-star="" cx="4.75" cy="1.45" r="0.12" />
                <circle data-flag-star="" cx="0.55" cy="2.35" r="0.12" />
                <circle data-flag-star="" cx="1.75" cy="2.35" r="0.12" />
                <circle data-flag-star="" cx="2.95" cy="2.35" r="0.12" />
                <circle data-flag-star="" cx="4.15" cy="2.35" r="0.12" />
                <circle data-flag-star="" cx="5.35" cy="2.35" r="0.12" />
                <circle data-flag-star="" cx="1.15" cy="3.25" r="0.12" />
                <circle data-flag-star="" cx="2.35" cy="3.25" r="0.12" />
                <circle data-flag-star="" cx="3.55" cy="3.25" r="0.12" />
                <circle data-flag-star="" cx="4.75" cy="3.25" r="0.12" />
              </g>
            </svg>
            <span>An official website of the United States government</span>
          </p>
          <details className="ashlar-banner__details">
            <summary>Here's how you know</summary>
            <div className="ashlar-banner__grid">
              <div>
                <strong>Official websites use .gov</strong>
                <p>
                  A .gov website belongs to an official government organization in the United
                  States.
                </p>
              </div>
              <div>
                <strong>Secure .gov websites use HTTPS</strong>
                <p>A lock or https:// means you have safely connected to the .gov website.</p>
              </div>
            </div>
          </details>
        </div>
      </section>

      <main className="case-shell">
        <header className="case-header">
          <div>
            <p className="eyebrow">Benefits operations</p>
            <h1>Case board for nutrition assistance renewals</h1>
            <p className="lead">
              Triage urgent applications, review verification gaps, and keep a same-day service
              queue moving across agency themes.
            </p>
          </div>
          <fieldset className="agency-switcher">
            <legend className="visually-hidden">Agency theme</legend>
            <span className="agency-status">
              <AgencyMark theme={selectedTheme} />
              <span>
                <span className="agency-trigger__label">Agency theme</span>
                <span className="agency-trigger__name">{selectedTheme?.label}</span>
              </span>
            </span>
            <button
              aria-controls="agency-switcher-dialog"
              aria-expanded={dialogOpen}
              aria-haspopup="dialog"
              className="agency-trigger"
              onClick={() => setDialogOpen(true)}
              type="button"
            >
              Switch agency
            </button>
          </fieldset>
          {dialogOpen ? (
            <div className="agency-dialog-backdrop" data-agency-dialog>
              <button
                aria-label="Close agency theme menu"
                className="agency-dialog-scrim"
                onClick={() => setDialogOpen(false)}
                type="button"
              />
              <div
                aria-describedby="agency-switcher-copy"
                aria-labelledby="agency-switcher-title"
                aria-modal="true"
                className="agency-panel"
                id="agency-switcher-dialog"
                role="dialog"
                tabIndex={-1}
              >
                <div className="agency-panel__header">
                  <div>
                    <span className="agency-panel__kicker">Theme</span>
                    <h2 className="agency-panel__title" id="agency-switcher-title">
                      Choose agency theme
                    </h2>
                    <p className="agency-panel__copy" id="agency-switcher-copy">
                      Apply a source-backed theme to preview how the same Ashlar components adapt
                      across agency systems.
                    </p>
                  </div>
                  <button
                    aria-label="Close agency theme menu"
                    className="agency-close"
                    onClick={() => setDialogOpen(false)}
                    type="button"
                  >
                    x
                  </button>
                </div>
                <fieldset className="agency-grid">
                  <legend className="visually-hidden">Agency theme</legend>
                  {themes.map((option) => (
                    <button
                      aria-pressed={theme === option.value}
                      className="agency-card"
                      data-theme={option.value}
                      key={option.value}
                      onClick={() => {
                        setTheme(option.value);
                        setDialogOpen(false);
                      }}
                      type="button"
                    >
                      <span>
                        <AgencyMark theme={option} />
                        <span className="agency-card__name">{option.label}</span>
                        <span className="agency-card__note">{option.note}</span>
                      </span>
                      <span className="agency-card__source">{option.source}</span>
                    </button>
                  ))}
                </fieldset>
                <fieldset className="mode-switch">
                  <legend className="visually-hidden">Color mode</legend>
                  {modes.map((option) => (
                    <button
                      aria-pressed={mode === option.value}
                      className="control-button"
                      key={option.value}
                      onClick={() => setMode(option.value)}
                      type="button"
                    >
                      {option.label}
                    </button>
                  ))}
                </fieldset>
              </div>
            </div>
          ) : null}
        </header>

        <section className="metrics" aria-label="Queue metrics">
          {metrics.map(([label, value]) => (
            <div className="metric" key={label}>
              <p className="metric__label">{label}</p>
              <p className="metric__value">{value}</p>
            </div>
          ))}
        </section>

        <div className="ashlar-alert" role="status">
          <p>Six cases need income verification before 3:00 PM. Two have interpreter requests.</p>
        </div>

        <section className="toolbar" aria-label="Board filters">
          <div className="ashlar-form-field">
            <label className="ashlar-form-field__label" htmlFor="case-search">
              Search cases
            </label>
            <p className="ashlar-form-field__hint" id="case-search-hint">
              Name, case ID, or county.
            </p>
            <input
              aria-describedby="case-search-hint"
              className="ashlar-text-input"
              defaultValue="Prince George's"
              id="case-search"
              name="case-search"
            />
          </div>
          <div className="ashlar-form-field">
            <label className="ashlar-form-field__label" htmlFor="program">
              Program
            </label>
            <select className="ashlar-select" id="program" name="program">
              <option>SNAP renewal</option>
              <option>WIC intake</option>
              <option>Summer EBT</option>
            </select>
          </div>
          <fieldset className="ashlar-radio-group view-toggle" aria-describedby="view-mode-hint">
            <legend className="ashlar-radio-group__legend">View</legend>
            <p className="ashlar-radio-group__hint" id="view-mode-hint">
              Choose queue layout.
            </p>
            <div className="ashlar-radio-option">
              <input
                className="ashlar-radio"
                defaultChecked
                id="view-board"
                name="view-mode"
                type="radio"
              />
              <label className="ashlar-radio-label" htmlFor="view-board">
                Board
              </label>
            </div>
            <div className="ashlar-radio-option">
              <input className="ashlar-radio" id="view-list" name="view-mode" type="radio" />
              <label className="ashlar-radio-label" htmlFor="view-list">
                List
              </label>
            </div>
          </fieldset>
          <div className="ashlar-checkbox-field">
            <input
              className="ashlar-checkbox"
              defaultChecked
              id="urgent-only"
              name="urgent-only"
              type="checkbox"
            />
            <label className="ashlar-checkbox-label" htmlFor="urgent-only">
              Urgent only
            </label>
          </div>
        </section>

        <section className="board" aria-label="Application case board">
          {columns.map((column) => (
            <article
              className="board-column"
              aria-labelledby={`${column.id}-title`}
              key={column.id}
            >
              <div className="board-column__header">
                <h2 id={`${column.id}-title`}>{column.title}</h2>
                <span className="board-count">{column.count}</span>
              </div>
              {column.cases.map((item) => (
                <section
                  className="case-card"
                  aria-labelledby={`case-${item.id}-title`}
                  key={item.id}
                >
                  <div className="case-card__header">
                    <div>
                      <p className="case-card__meta">{item.id}</p>
                      <h3 id={`case-${item.id}-title`}>{item.name}</h3>
                      <p className="case-card__program">{item.program}</p>
                    </div>
                    {item.priority ? <span className="priority">{item.priority}</span> : null}
                  </div>
                  <div className="tag-row">
                    {item.tags.map((tag) => (
                      <span className="tag" key={tag}>
                        {tag}
                      </span>
                    ))}
                  </div>
                  <div className="case-card__actions">
                    <button className="ashlar-button" data-variant="primary" type="button">
                      {item.primaryAction}
                    </button>
                    <button className="ashlar-button" data-variant="secondary" type="button">
                      {item.secondaryAction}
                    </button>
                  </div>
                </section>
              ))}
            </article>
          ))}
        </section>
      </main>

      <footer className="ashlar-identifier">
        <div className="ashlar-identifier__inner">
          <div className="ashlar-identifier__identity">
            <p className="ashlar-identifier__eyebrow">
              An official website of the United States government
            </p>
            <p className="ashlar-identifier__name">Example Benefits Agency</p>
          </div>
          <nav className="ashlar-identifier__nav" aria-label="Required agency links">
            <a href="/about">About</a>
            <a href="/accessibility">Accessibility</a>
            <a href="/foia">FOIA</a>
            <a href="/no-fear-act">No FEAR Act</a>
            <a href="/inspector-general">Office of Inspector General</a>
            <a href="/performance">Performance reports</a>
            <a href="/privacy">Privacy policy</a>
          </nav>
        </div>
      </footer>
    </>
  );
}

function AgencyMark({ theme }: { theme: { value: Theme; sigil: string; word: string } }) {
  return (
    <span className="agency-mark" data-agency={theme.value} aria-hidden="true">
      <span className="agency-mark__sigil">{theme.sigil}</span>
      <span className="agency-mark__word">{theme.word}</span>
    </span>
  );
}
