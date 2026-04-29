# Patterns and templates (L3 + L4)

L0 (CSS+HTML primitives) and L1 (stateful Web Components) are the building blocks. **L3 (patterns)** composes them into service flows that solve real government UX problems. **L4 (templates)** ships the same components rendered as Nunjucks, Twig, Jinja, ERB, and plain HTML so non-JS stacks can consume them without a build step.

## L3 — Patterns

A pattern is a capsule that composes components into a complete service flow, ships content guidance (plain-language defaults), accessibility considerations specific to the flow, and links to the user research that informed it.

### What ships

Initial pattern set, drawn from common federal service flows:

- **Eligibility check** — "are you eligible?" wizard with branching questions, explanation of criteria, save-and-resume.
- **Document upload** — chunked, resumable, progress, drag-drop, screen-reader-friendly status.
- **Address form** — autocomplete-aware, country-specific, postal-code-validated.
- **Account creation** — email/SSO/Login.gov shell (no binding to specific provider), password rules, MFA scaffold.
- **Feedback widget** — sticky/inline, plain-language prompts, accessibility-friendly submission.
- **Emergency alert** — banner-style alert with content escalation rules.
- **Identity verification shell** — UX shell only, does not bind to ID.me / Login.gov / DHS.
- **Application review and submit** — multi-step wizard with cross-step validation and accessible error summary.

Each pattern is itself a capsule with a manifest, evidence packet, and codemods.

### Pattern capsule structure

```
patterns/eligibility-check/
├── eligibility-check.css
├── eligibility-check.html.njk          # canonical Nunjucks
├── eligibility-check.html.twig         # Drupal Twig
├── eligibility-check.html.jinja        # Python/Django/Flask
├── eligibility-check.html.erb          # Rails
├── eligibility-check.element.ts        # Lit shell (if dynamic)
├── eligibility-check.machine.ts        # Zag flow machine
├── eligibility-check.cem.json          # extended CEM
├── eligibility-check.evidence.json
├── eligibility-check.codemods.yaml
├── eligibility-check.docs.md           # human + AI docs
├── eligibility-check.research.md       # user research notes
├── eligibility-check.content.md        # plain-language content guidance
└── eligibility-check.lock.json
```

### Composition

Patterns reference component capsules as registry dependencies:

```json
{
  "name": "eligibility-check",
  "tier": "pattern",
  "layer": "L3",
  "stability": "beta",
  "registryDependencies": [
    "form-field@^1",
    "text-input@^1",
    "radio@^1",
    "alert@^1",
    "button@^1",
    "stepper@^1"
  ],
  "tokens": [
    "color.action.primary.bg",
    "color.surface.raised",
    "spacing.4"
  ]
}
```

Adding a pattern via `ashlar add pattern/eligibility-check` installs the pattern's files plus any missing component dependencies.

### Content guidance (plain language)

Every pattern ships content guidance — a markdown file describing recommended copy, voice, error messages, and cross-language considerations. Not enforced; provided as a starting point.

```markdown
# Eligibility check — content guidance

## Plain-language voice
- Use short sentences (15 words max).
- Use second person ("Are you employed?").
- Define acronyms on first use.
- Avoid bureaucratic jargon ("commenced" → "started").

## Error messages
- Focus on the user's next action: "Enter your date of birth" rather than "Date of birth is invalid."
- Avoid blame: "We couldn't find that record" rather than "You entered an incorrect SSN."

## Multilingual
- Provide language toggle at flow start, not buried in footer.
- Test reading-level for translated copy independently.
```

### Research notes

Patterns informed by USWDS user research, federal-service usability studies, or original Blen research cite their sources in the `research.md` file. This is what distinguishes a pattern from a "block" (a less-evidenced composition).

### Pattern-specific accessibility requirements

Some flows have flow-level a11y requirements beyond per-component:

- Wizard flows must announce progress (`aria-live` region with step state).
- Eligibility branches must communicate to screen readers when criteria change the next question.
- Error summaries must be focusable and listed in document order.
- Save-and-resume must be discoverable without mouse.

These are tested in pattern evidence packets in addition to component-level evidence.

## L4 — Templates

The L4 layer answers GOV.UK Frontend's empirical observation that government runs 24+ template languages. Ashlar ships the same component as multiple templates so server-rendered, CMS, and framework-less stacks can consume without a build step.

### Supported template languages

Initial:

- **Nunjucks** (`*.html.njk`) — generic JS templating; widely interoperable.
- **Twig** (`*.html.twig`) — Drupal, Symfony, Craft CMS.
- **Jinja** (`*.html.jinja`) — Python (Django, Flask, FastAPI).
- **ERB** (`*.html.erb`) — Ruby on Rails.
- **Plain HTML** (`*.html`) — copy-paste reference.

Additional targets considered for v0.2+:

- Liquid (Shopify, Jekyll).
- Mustache / Handlebars.
- Razor (.NET).
- Pug (Node.js).

### Template structure

Each template renders the same DOM contract — same class names, same data attributes, same ARIA — so the CSS and any L1 enhancement work identically.

```twig
{# button.html.twig #}
{% set variant = variant|default('primary') %}
{% set type = type|default('button') %}

<button
  class="ashlar-button"
  data-variant="{{ variant }}"
  type="{{ type }}"
  {% if disabled %}disabled{% endif %}
  {% if aria_label %}aria-label="{{ aria_label }}"{% endif %}
>
  {% if icon_start %}<span class="ashlar-button__icon-start">{{ icon_start|raw }}</span>{% endif %}
  {{ label|default('Submit') }}
  {% if icon_end %}<span class="ashlar-button__icon-end">{{ icon_end|raw }}</span>{% endif %}
</button>
```

### Drupal integration

For Drupal sites, Ashlar publishes a companion module/theme:

- `@ashlar/drupal-theme` — installs Ashlar tokens and Twig partials.
- Theme functions/preprocess hooks make Ashlar components feel native to Drupal.
- Compatible with USWDS's Drupal theme migration path (token mapping, class-name compatibility shim).

### Server-side rendering of L1

For L1 components (stateful WC), templates render the initial DOM with attributes (machine state serialized to `data-ashlar-state`/`data-ashlar-context`); the custom element upgrades on the client. See [`web-components.md`](./web-components.md) for the resumability discipline.

### Template generation pipeline

Templates are not handwritten per language. The Ashlar build pipeline:

1. Authors maintain a single canonical Nunjucks template per component.
2. A template transpiler (custom, or a tool like `nunjucks-to-twig`) generates Twig, Jinja, ERB, and plain-HTML versions.
3. Tests render each template with the same fixture data and snapshot the resulting HTML for parity.

Snapshot equality is enforced — the same input must produce the same DOM contract across all template targets.

## Pattern + template combination

A pattern shipped as both rendered HTML (L4) and as a Lit element (L1) can serve:

- Drupal site: `{% include '@ashlar/eligibility-check' with {...} %}`.
- Rails site: `<%= render 'ashlar/eligibility_check', ... %>`.
- Next.js: `<EligibilityCheck options={...} />`.
- Plain HTML: include CSS + JS; use `<ashlar-eligibility-check>`.

All four render the same DOM, share the same CSS, share the same accessibility evidence.

## Why this matters

USWDS components are HTML snippets. Teams either copy-paste (drift), wrap in their framework (parallel ecosystem), or struggle. Ashlar's L3+L4 model meets each stack where it lives:

- React/Vue teams: framework adapters (L2).
- Drupal teams: Twig partial (L4).
- Rails teams: ERB partial (L4).
- Plain HTML pages: include CSS + the WC delivery (L1) or just CSS+HTML (L0).

Same component, same evidence, multiple universes.

## References

- [Architecture overview](./overview.md)
- [Capsule format](./capsule.md)
- [Web Components architecture](./web-components.md)
- [research/04-web-components.md](../research/04-web-components.md)
- USWDS — pattern research: https://designsystem.digital.gov/about/research/
- GOV.UK Frontend — design patterns: https://design-system.service.gov.uk/patterns/
