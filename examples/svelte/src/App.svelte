<script lang="ts">
type Theme = "default" | "va" | "usda";
type Mode = "light" | "dark" | "system";

const themes: Array<{ value: Theme; label: string; logo: string; note: string }> = [
  {
    value: "default",
    label: "Default",
    logo: "US",
    note: "USWDS color and type sources.",
  },
  {
    value: "va",
    label: "VA",
    logo: "VA",
    note: "VA.gov color and typography.",
  },
  {
    value: "usda",
    label: "USDA",
    logo: "USDA",
    note: "USDA brand plays plus USWDS.",
  },
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

let theme: Theme = "default";
let mode: Mode = "light";

$: selectedTheme = themes.find((option) => option.value === theme) ?? themes[0];

function selectTheme(event: MouseEvent, value: Theme) {
  theme = value;
  (event.currentTarget as HTMLElement).closest("details")?.removeAttribute("open");
}

$: if (typeof document !== "undefined") {
  document.documentElement.dataset.ashlarTheme = theme;
  document.documentElement.dataset.ashlarMode = mode;
}
</script>

<section class="ashlar-banner" aria-label="Official website of the United States government">
  <div class="ashlar-banner__inner">
    <p class="ashlar-banner__text">An official website of the United States government</p>
    <details class="ashlar-banner__details">
      <summary>Here's how you know</summary>
      <div class="ashlar-banner__grid">
        <div>
          <strong>Official websites use .gov</strong>
          <p>A .gov website belongs to an official government organization in the United States.</p>
        </div>
        <div>
          <strong>Secure .gov websites use HTTPS</strong>
          <p>A lock or https:// means you have safely connected to the .gov website.</p>
        </div>
      </div>
    </details>
  </div>
</section>

<main class="case-shell">
  <header class="case-header">
    <div>
      <p class="eyebrow">Benefits operations</p>
      <h1>Case board for nutrition assistance renewals</h1>
      <p class="lead">
        Triage urgent applications, review verification gaps, and keep a same-day service queue
        moving across agency themes.
      </p>
    </div>
    <details class="agency-picker">
      <summary class="agency-trigger">
        <span class="agency-trigger__body">
          <span class="agency-logo" data-agency={selectedTheme.value} aria-hidden="true">
            {selectedTheme.logo}
          </span>
          <span>
            <span class="agency-trigger__label">Agency</span>
            <span class="agency-trigger__name">{selectedTheme.label}</span>
          </span>
        </span>
      </summary>
      <div class="agency-panel">
        <div class="agency-panel__header">
          <div>
            <span class="agency-panel__kicker">Theme</span>
            <h2 class="agency-panel__title">Choose agency theme</h2>
          </div>
        </div>
        <fieldset class="agency-grid">
          <legend class="visually-hidden">Agency theme</legend>
          {#each themes as option}
            <button
              aria-pressed={theme === option.value}
              class="agency-card"
              on:click={(event) => selectTheme(event, option.value)}
              type="button"
            >
              <span class="agency-logo" data-agency={option.value} aria-hidden="true">
                {option.logo}
              </span>
              <span>
                <span class="agency-card__name">{option.label}</span>
                <span class="agency-card__note">{option.note}</span>
              </span>
            </button>
          {/each}
        </fieldset>
        <fieldset class="mode-switch">
          <legend class="visually-hidden">Color mode</legend>
          {#each modes as option}
            <button
              aria-pressed={mode === option.value}
              class="control-button"
              on:click={() => (mode = option.value)}
              type="button"
            >
              {option.label}
            </button>
          {/each}
        </fieldset>
      </div>
    </details>
  </header>

  <section class="metrics" aria-label="Queue metrics">
    {#each metrics as metric}
      <div class="metric">
        <p class="metric__label">{metric[0]}</p>
        <p class="metric__value">{metric[1]}</p>
      </div>
    {/each}
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
      />
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
        <input class="ashlar-radio" id="view-board" name="view-mode" type="radio" checked />
        <label class="ashlar-radio-label" for="view-board">Board</label>
      </div>
      <div class="ashlar-radio-option">
        <input class="ashlar-radio" id="view-list" name="view-mode" type="radio" />
        <label class="ashlar-radio-label" for="view-list">List</label>
      </div>
    </fieldset>
    <div class="ashlar-checkbox-field">
      <input class="ashlar-checkbox" id="urgent-only" name="urgent-only" type="checkbox" checked />
      <label class="ashlar-checkbox-label" for="urgent-only">Urgent only</label>
    </div>
  </section>

  <section class="board" aria-label="Application case board">
    {#each columns as column}
      <article class="board-column" aria-labelledby={`${column.id}-title`}>
        <div class="board-column__header">
          <h2 id={`${column.id}-title`}>{column.title}</h2>
          <span class="board-count">{column.count}</span>
        </div>
        {#each column.cases as item}
          <section class="case-card" aria-labelledby={`case-${item.id}-title`}>
            <div class="case-card__header">
              <div>
                <p class="case-card__meta">{item.id}</p>
                <h3 id={`case-${item.id}-title`}>{item.name}</h3>
                <p class="case-card__program">{item.program}</p>
              </div>
              {#if item.priority}
                <span class="priority">{item.priority}</span>
              {/if}
            </div>
            <div class="tag-row">
              {#each item.tags as tag}
                <span class="tag">{tag}</span>
              {/each}
            </div>
            <div class="case-card__actions">
              <button class="ashlar-button" data-variant="primary" type="button">
                {item.primaryAction}
              </button>
              <button class="ashlar-button" data-variant="secondary" type="button">
                {item.secondaryAction}
              </button>
            </div>
          </section>
        {/each}
      </article>
    {/each}
  </section>
</main>

<footer class="ashlar-identifier">
  <div class="ashlar-identifier__inner">
    <div class="ashlar-identifier__identity">
      <p class="ashlar-identifier__eyebrow">An official website of the United States government</p>
      <p class="ashlar-identifier__name">Example Benefits Agency</p>
    </div>
    <nav class="ashlar-identifier__nav" aria-label="Required agency links">
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
