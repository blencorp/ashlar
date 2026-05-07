import { claimBoundary, pageById, pages, type DocPage } from "./content";
import { components } from "./registry";
import "./styles.css";

const app = document.querySelector<HTMLDivElement>("#app");

if (!app) {
  throw new Error("Ashlar docs root #app not found.");
}

const root = app;

function activePageId(): string {
  const hash = window.location.hash.replace(/^#\/?/, "");
  return pages.some((page) => page.id === hash) ? hash : (pages[0]?.id ?? "install");
}

function render(): void {
  const page = pageById(activePageId());
  root.innerHTML = `
    <div class="federal-strip">
      <span class="flag" aria-hidden="true"></span>
      <span>Independent open-source research. Not affiliated with GSA, USWDS, NDS, or the U.S. federal government.</span>
    </div>
    <div class="layout">
      <aside class="sidebar" aria-label="Documentation sections">
        <a class="brand" href="#install" aria-label="Ashlar docs home">
          <span>Ashlar</span>
          <strong>Docs</strong>
        </a>
        <nav class="nav">${renderNav(page.id)}</nav>
        <div class="status-box">
          <span>Status</span>
          <strong>Prototype, proof-gated</strong>
          <p>${claimBoundary.status}</p>
        </div>
      </aside>
      <main class="main">
        ${renderHero(page)}
        ${renderCommands(page)}
        ${renderComponents(page.id)}
        ${renderBoundaries(page.id)}
      </main>
    </div>
  `;
}

function renderNav(activeId: string): string {
  return pages
    .map(
      (page) =>
        `<a href="#${page.id}" class="${page.id === activeId ? "active" : ""}">${escapeHtml(page.nav)}</a>`,
    )
    .join("");
}

function renderHero(page: DocPage): string {
  return `
    <section class="hero" aria-labelledby="page-title">
      <p class="eyebrow">First-run path</p>
      <h1 id="page-title">${escapeHtml(page.title)}</h1>
      <p class="lede">${escapeHtml(page.summary)}</p>
      <p class="intent">${escapeHtml(page.intent)}</p>
      <div class="quick-links">
        ${page.links
          .map((link) => `<a href="${escapeAttribute(link.href)}">${escapeHtml(link.label)}</a>`)
          .join("")}
      </div>
    </section>
  `;
}

function renderCommands(page: DocPage): string {
  return `
    <section class="content-grid" aria-label="Commands and checkpoints">
      <div class="command-list">
        <h2>Commands</h2>
        ${page.commands
          .map(
            (step, index) => `
              <article class="command-step">
                <span class="step-index">${index + 1}</span>
                <div>
                  <h3>${escapeHtml(step.label)}</h3>
                  <pre><code>${escapeHtml(step.command)}</code></pre>
                  <p>${escapeHtml(step.note)}</p>
                </div>
              </article>
            `,
          )
          .join("")}
      </div>
      <aside class="checkpoints">
        <h2>Checkpoints</h2>
        <ul>
          ${page.checkpoints.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}
        </ul>
      </aside>
    </section>
  `;
}

function renderComponents(activeId: string): string {
  if (activeId !== "add") {
    return "";
  }

  return `
    <section class="components" aria-labelledby="components-title">
      <div class="section-heading">
        <p class="eyebrow">Registry-derived</p>
        <h2 id="components-title">Current capsules</h2>
        <p>
          This index is derived from checked-in registry CEM and evidence JSON. It is not a stable
          accessibility claim; every current component still reports its evidence status explicitly.
        </p>
      </div>
      <div class="component-table" role="table" aria-label="Ashlar registry components">
        <div class="component-row head" role="row">
          <span role="columnheader">Capsule</span>
          <span role="columnheader">Layer</span>
          <span role="columnheader">Evidence</span>
          <span role="columnheader">Contract</span>
        </div>
        ${components.map(renderComponentRow).join("")}
      </div>
    </section>
  `;
}

function renderComponentRow(component: (typeof components)[number]): string {
  return `
    <article class="component-row" role="row">
      <span role="cell">
        <strong>${escapeHtml(component.name)}</strong>
        <small>${escapeHtml(component.description)}</small>
      </span>
      <span role="cell">${escapeHtml(component.layer)} · ${escapeHtml(component.stability)}</span>
      <span role="cell">${escapeHtml(component.evidenceStatus)}</span>
      <span role="cell">
        <code>${escapeHtml(component.selector)}</code>
        <small>${escapeHtml(component.platformFeatures.slice(0, 3).join(", ") || component.tagName)}</small>
      </span>
    </article>
  `;
}

function renderBoundaries(activeId: string): string {
  if (activeId !== "trust") {
    return "";
  }

  return `
    <section class="boundaries" aria-labelledby="boundaries-title">
      <div>
        <p class="eyebrow">Claim boundary</p>
        <h2 id="boundaries-title">What docs may say now</h2>
      </div>
      <dl>
        <div>
          <dt>Allowed</dt>
          <dd>${escapeHtml(claimBoundary.allowed)}</dd>
        </div>
        <div>
          <dt>Blocked</dt>
          <dd>${escapeHtml(claimBoundary.blocked)}</dd>
        </div>
      </dl>
    </section>
  `;
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function escapeAttribute(value: string): string {
  return escapeHtml(value).replaceAll("`", "&#96;");
}

window.addEventListener("hashchange", render);
render();
