<script lang="ts">
type Theme = "default" | "va" | "usda";
type Mode = "light" | "dark" | "system";

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
let mode: Mode = "system";

$: if (typeof document !== "undefined") {
  document.documentElement.dataset.ashlarTheme = theme;
  document.documentElement.dataset.ashlarMode = mode;
}
</script>

<section class="ashlar-banner" aria-label="Official website of the United States government">
  <p class="ashlar-banner__text">An official website of the United States government</p>
  <details class="ashlar-banner__details">
    <summary>How you know</summary>
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
    <section class="theme-switcher" aria-labelledby="theme-title">
      <h2 id="theme-title">Agency theme</h2>
      <div class="theme-switcher__row">
        {#each themes as option}
          <button
            aria-pressed={theme === option.value}
            class="control-button"
            on:click={() => (theme = option.value)}
            type="button"
          >
            {option.label}
          </button>
        {/each}
      </div>
      <div class="theme-switcher__row">
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
      </div>
    </section>
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
              <button class="ashlar-button" type="button">{item.secondaryAction}</button>
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
