<script setup lang="ts">
import { computed, ref, watchEffect } from "vue";

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
    sigil: "Base",
    word: "Default",
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

const theme = ref<Theme>("default");
const mode = ref<Mode>("light");
const dialogOpen = ref(false);
const selectedTheme = computed<ThemeOption>(
  () => themes.find((option) => option.value === theme.value) ?? themes[0],
);

function selectTheme(value: Theme) {
  theme.value = value;
  dialogOpen.value = false;
}

watchEffect(() => {
  document.documentElement.dataset.ashlarTheme = theme.value;
  document.documentElement.dataset.ashlarMode = mode.value;
});
</script>

<template>
  <section class="ashlar-banner" aria-label="Official website of the United States government">
    <div class="ashlar-banner__inner">
      <p class="ashlar-banner__text">
        <svg
            class="ashlar-banner__flag"
            aria-hidden="true"
            focusable="false"
            viewBox="0 0 16 11"
            xmlns="http://www.w3.org/2000/svg"
          >
            <rect width="16" height="11" fill="#ffffff"></rect>
            <rect data-flag-stripe="" width="16" height="0.846" y="0" fill="#b31942"></rect>
            <rect data-flag-stripe="" width="16" height="0.846" y="1.692" fill="#b31942"></rect>
            <rect data-flag-stripe="" width="16" height="0.846" y="3.384" fill="#b31942"></rect>
            <rect data-flag-stripe="" width="16" height="0.846" y="5.076" fill="#b31942"></rect>
            <rect data-flag-stripe="" width="16" height="0.846" y="6.768" fill="#b31942"></rect>
            <rect data-flag-stripe="" width="16" height="0.846" y="8.46" fill="#b31942"></rect>
            <rect data-flag-stripe="" width="16" height="0.846" y="10.152" fill="#b31942"></rect>
            <rect data-flag-canton="" width="6.4" height="5.923" fill="#005ea8"></rect>
            <g fill="#ffffff">
              <circle data-flag-star="" cx="0.55" cy="0.55" r="0.12"></circle>
              <circle data-flag-star="" cx="1.75" cy="0.55" r="0.12"></circle>
              <circle data-flag-star="" cx="2.95" cy="0.55" r="0.12"></circle>
              <circle data-flag-star="" cx="4.15" cy="0.55" r="0.12"></circle>
              <circle data-flag-star="" cx="5.35" cy="0.55" r="0.12"></circle>
              <circle data-flag-star="" cx="1.15" cy="1.45" r="0.12"></circle>
              <circle data-flag-star="" cx="2.35" cy="1.45" r="0.12"></circle>
              <circle data-flag-star="" cx="3.55" cy="1.45" r="0.12"></circle>
              <circle data-flag-star="" cx="4.75" cy="1.45" r="0.12"></circle>
              <circle data-flag-star="" cx="0.55" cy="2.35" r="0.12"></circle>
              <circle data-flag-star="" cx="1.75" cy="2.35" r="0.12"></circle>
              <circle data-flag-star="" cx="2.95" cy="2.35" r="0.12"></circle>
              <circle data-flag-star="" cx="4.15" cy="2.35" r="0.12"></circle>
              <circle data-flag-star="" cx="5.35" cy="2.35" r="0.12"></circle>
              <circle data-flag-star="" cx="1.15" cy="3.25" r="0.12"></circle>
              <circle data-flag-star="" cx="2.35" cy="3.25" r="0.12"></circle>
              <circle data-flag-star="" cx="3.55" cy="3.25" r="0.12"></circle>
              <circle data-flag-star="" cx="4.75" cy="3.25" r="0.12"></circle>
            </g>
          </svg>
        <span>An official website of the United States government</span>
      </p>
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
      <fieldset class="agency-switcher">
        <legend class="visually-hidden">Agency theme</legend>
        <span class="agency-status">
          <span class="agency-mark" :data-agency="selectedTheme.value" aria-hidden="true">
            <span class="agency-mark__sigil">{{ selectedTheme.sigil }}</span>
            <span class="agency-mark__word">{{ selectedTheme.word }}</span>
          </span>
          <span>
            <span class="agency-trigger__label">Agency theme</span>
            <span class="agency-trigger__name">{{ selectedTheme.label }}</span>
          </span>
        </span>
        <button
          class="agency-trigger"
          type="button"
          aria-haspopup="dialog"
          :aria-expanded="dialogOpen"
          aria-controls="agency-switcher-dialog"
          @click="dialogOpen = true"
        >
          Switch agency
        </button>
      </fieldset>
      <div v-if="dialogOpen" class="agency-dialog-backdrop" data-agency-dialog>
        <button
          class="agency-dialog-scrim"
          type="button"
          aria-label="Close agency theme menu"
          @click="dialogOpen = false"
        ></button>
        <div
          id="agency-switcher-dialog"
          class="agency-panel"
          role="dialog"
          aria-modal="true"
          aria-labelledby="agency-switcher-title"
          aria-describedby="agency-switcher-copy"
          tabindex="-1"
        >
          <div class="agency-panel__header">
            <div>
              <span class="agency-panel__kicker">Theme</span>
              <h2 id="agency-switcher-title" class="agency-panel__title">Choose agency theme</h2>
              <p id="agency-switcher-copy" class="agency-panel__copy">
                Apply a source-backed theme to preview how the same Ashlar components adapt across
                agency systems.
              </p>
            </div>
            <button
              class="agency-close"
              type="button"
              aria-label="Close agency theme menu"
              @click="dialogOpen = false"
            >
              x
            </button>
          </div>
          <fieldset class="agency-grid">
            <legend class="visually-hidden">Agency theme</legend>
            <button
              v-for="option in themes"
              :key="option.value"
              :aria-pressed="theme === option.value"
              class="agency-card"
              :data-theme="option.value"
              type="button"
              @click="selectTheme(option.value)"
            >
              <span>
                <span class="agency-mark" :data-agency="option.value" aria-hidden="true">
                  <span class="agency-mark__sigil">{{ option.sigil }}</span>
                  <span class="agency-mark__word">{{ option.word }}</span>
                </span>
                <span class="agency-card__name">{{ option.label }}</span>
                <span class="agency-card__note">{{ option.note }}</span>
              </span>
              <span class="agency-card__source">{{ option.source }}</span>
            </button>
          </fieldset>
          <fieldset class="mode-switch">
            <legend class="visually-hidden">Color mode</legend>
            <button
              v-for="option in modes"
              :key="option.value"
              :aria-pressed="mode === option.value"
              class="control-button"
              type="button"
              @click="mode = option.value"
            >
              {{ option.label }}
            </button>
          </fieldset>
        </div>
      </div>
    </header>

    <section class="metrics" aria-label="Queue metrics">
      <div v-for="metric in metrics" :key="metric[0]" class="metric">
        <p class="metric__label">{{ metric[0] }}</p>
        <p class="metric__value">{{ metric[1] }}</p>
      </div>
    </section>

    <div class="ashlar-alert" role="status">
      <p>Six cases need income verification before 3:00 PM. Two have interpreter requests.</p>
    </div>

    <section class="toolbar" aria-label="Board filters">
      <div class="ashlar-form-field">
        <label class="ashlar-form-field__label" for="case-search">Search cases</label>
        <p id="case-search-hint" class="ashlar-form-field__hint">Name, case ID, or county.</p>
        <input
          id="case-search"
          class="ashlar-text-input"
          name="case-search"
          aria-describedby="case-search-hint"
          value="Prince George's"
        >
      </div>
      <div class="ashlar-form-field">
        <label class="ashlar-form-field__label" for="program">Program</label>
        <select id="program" class="ashlar-select" name="program">
          <option>SNAP renewal</option>
          <option>WIC intake</option>
          <option>Summer EBT</option>
        </select>
      </div>
      <fieldset class="ashlar-radio-group view-toggle" aria-describedby="view-mode-hint">
        <legend class="ashlar-radio-group__legend">View</legend>
        <p id="view-mode-hint" class="ashlar-radio-group__hint">Choose queue layout.</p>
        <div class="ashlar-radio-option">
          <input id="view-board" class="ashlar-radio" name="view-mode" type="radio" checked>
          <label class="ashlar-radio-label" for="view-board">Board</label>
        </div>
        <div class="ashlar-radio-option">
          <input id="view-list" class="ashlar-radio" name="view-mode" type="radio">
          <label class="ashlar-radio-label" for="view-list">List</label>
        </div>
      </fieldset>
      <div class="ashlar-checkbox-field">
        <input id="urgent-only" class="ashlar-checkbox" name="urgent-only" type="checkbox" checked>
        <label class="ashlar-checkbox-label" for="urgent-only">Urgent only</label>
      </div>
    </section>

    <section class="board" aria-label="Application case board">
      <article
        v-for="column in columns"
        :key="column.id"
        class="board-column"
        :aria-labelledby="`${column.id}-title`"
      >
        <div class="board-column__header">
          <h2 :id="`${column.id}-title`">{{ column.title }}</h2>
          <span class="board-count">{{ column.count }}</span>
        </div>
        <section
          v-for="item in column.cases"
          :key="item.id"
          class="case-card"
          :aria-labelledby="`case-${item.id}-title`"
        >
          <div class="case-card__header">
            <div>
              <p class="case-card__meta">{{ item.id }}</p>
              <h3 :id="`case-${item.id}-title`">{{ item.name }}</h3>
              <p class="case-card__program">{{ item.program }}</p>
            </div>
            <span v-if="item.priority" class="priority">{{ item.priority }}</span>
          </div>
          <div class="tag-row">
            <span v-for="tag in item.tags" :key="tag" class="tag">{{ tag }}</span>
          </div>
          <div class="case-card__actions">
            <button class="ashlar-button" data-variant="primary" type="button">
              {{ item.primaryAction }}
            </button>
            <button class="ashlar-button" data-variant="secondary" type="button">
              {{ item.secondaryAction }}
            </button>
          </div>
        </section>
      </article>
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
</template>
