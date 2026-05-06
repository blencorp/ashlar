import { useEffect, useState } from "react";

type Theme = "default" | "va" | "usda";
type Mode = "light" | "dark" | "system";

type CaseItem = {
  id: string;
  name: string;
  program: string;
  priority?: string;
  tags: string[];
  primaryAction: string;
  secondaryAction: string;
};

type Column = {
  id: string;
  title: string;
  count: number;
  cases: CaseItem[];
};

const themes: Array<{ value: Theme; label: string }> = [
  { value: "default", label: "Federal" },
  { value: "va", label: "VA" },
  { value: "usda", label: "USDA" },
];

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

const columns: Column[] = [
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

export function App() {
  const [theme, setTheme] = useState<Theme>("default");
  const [mode, setMode] = useState<Mode>("system");

  useEffect(() => {
    document.documentElement.dataset.ashlarTheme = theme;
    document.documentElement.dataset.ashlarMode = mode;
  }, [theme, mode]);

  return (
    <>
      <FederalBanner />
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
          <ThemeSwitcher mode={mode} setMode={setMode} setTheme={setTheme} theme={theme} />
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

        <Filters />

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
                <CaseCard item={item} key={item.id} />
              ))}
            </article>
          ))}
        </section>
      </main>
      <AgencyIdentifier />
    </>
  );
}

function FederalBanner() {
  return (
    <section
      className="ashlar-banner"
      aria-label="Official website of the United States government"
    >
      <p className="ashlar-banner__text">An official website of the United States government</p>
      <details className="ashlar-banner__details">
        <summary>How you know</summary>
        <div className="ashlar-banner__grid">
          <div>
            <strong>Official websites use .gov</strong>
            <p>
              A .gov website belongs to an official government organization in the United States.
            </p>
          </div>
          <div>
            <strong>Secure .gov websites use HTTPS</strong>
            <p>A lock or https:// means you have safely connected to the .gov website.</p>
          </div>
        </div>
      </details>
    </section>
  );
}

function ThemeSwitcher(props: {
  mode: Mode;
  setMode: (mode: Mode) => void;
  setTheme: (theme: Theme) => void;
  theme: Theme;
}) {
  return (
    <section className="theme-switcher" aria-labelledby="theme-title">
      <h2 id="theme-title">Agency theme</h2>
      <div className="theme-switcher__row">
        {themes.map((option) => (
          <button
            aria-pressed={props.theme === option.value}
            className="control-button"
            key={option.value}
            onClick={() => props.setTheme(option.value)}
            type="button"
          >
            {option.label}
          </button>
        ))}
      </div>
      <div className="theme-switcher__row">
        {modes.map((option) => (
          <button
            aria-pressed={props.mode === option.value}
            className="control-button"
            key={option.value}
            onClick={() => props.setMode(option.value)}
            type="button"
          >
            {option.label}
          </button>
        ))}
      </div>
    </section>
  );
}

function Filters() {
  return (
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
  );
}

function CaseCard({ item }: { item: CaseItem }) {
  return (
    <section className="case-card" aria-labelledby={`case-${item.id}-title`}>
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
        <button className="ashlar-button" type="button">
          {item.secondaryAction}
        </button>
      </div>
    </section>
  );
}

function AgencyIdentifier() {
  return (
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
  );
}
