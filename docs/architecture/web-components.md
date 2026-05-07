# Web Components architecture

interactive components are delivered as **Lit-based Web Components** that wrap Zag statecharts (see [`state-management.md`](./state-management.md)). This document covers the Lit shell architecture, Light DOM versus Shadow DOM choices, SSR via Declarative Shadow DOM, form-associated custom elements, and the framework-adapter generation pipeline.

## Why Lit

- **Mature** — Lit 3.x is production-grade, used by Spectrum, Carbon, Web Awesome.
- **Small** — ~5KB minified+gzipped runtime.
- **Standards-aligned** — produces native custom elements; no Lit-specific runtime in the consumer's app beyond Lit itself.
- **Aligned with USWDS Elements direction** — preserves future upstream-contribution potential.
- **Rich SSR story** — `@lit-labs/ssr` renders to Declarative Shadow DOM.

Stencil was considered as an alternative (auto-generated framework wrappers, smaller per-component runtime). Lit was chosen for ecosystem alignment and community size.

## Shell pattern

The Lit element is a thin shell that:

1. Defines the custom element via `@customElement`.
2. Declares observable properties and attributes.
3. Subscribes to the Zag machine; calls `requestUpdate()` on transitions.
4. Renders DOM via `lit-html` templates.
5. Forwards DOM events into the machine.
6. Sets ARIA attributes directly (Firefox `ElementInternals.aria*` reflection is incomplete; see below).

```ts
@customElement("ashlar-combobox")
export class AshlarCombobox extends LitElement {
  @property({ type: Array }) options: Option[] = [];
  @property({ type: String }) value: string = "";

  private machine = comboboxMachine.start();
  private signals = createComboBoxSignals(this.machine);

  createRenderRoot() {
    return this;  // Light DOM by default
  }

  connectedCallback() {
    super.connectedCallback();
    this.unsubscribe = this.machine.subscribe(() => this.requestUpdate());
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this.unsubscribe?.();
    this.machine.stop();
  }

  render() { /* ... */ }
}
```

## Light DOM by default

Light DOM is the default render root. Reasons:

- **Theming compatibility.** CSS variables flow naturally; consumer styles cascade in.
- **Forms.** Inputs inside light DOM participate in `<form>` natively without ElementInternals gymnastics.
- **SSR simplicity.** No DSD strategy required.
- **Drupal/CMS friendliness.** Server-rendered HTML is just HTML; no shadow boundaries to reason about.

Shadow DOM is opted into only when encapsulation is genuinely required:

- The component renders user-supplied content that must not be styled by the consumer (rare).
- The component's internal styles use selectors that cannot be safely scoped via `@scope` or class-prefix conventions.

When Shadow DOM is used, **Declarative Shadow DOM** is the SSR strategy:

```html
<ashlar-tooltip>
  <template shadowrootmode="open">
    <style>/* ... */</style>
    <slot></slot>
  </template>
</ashlar-tooltip>
```

DSD support: Chrome 111+, Firefox 123+, Safari 16.4+, Edge 111+. Global ~94.6% (April 2026); Baseline projected August 2026.

## SSR strategy

interactive components render server-side via two paths:

1. **application-block templates (preferred)** — Nunjucks/Twig/Jinja/ERB partials emit the same HTML the WC would emit, including ARIA attributes resolved from initial machine state. The custom element upgrades to behavior on the client.

2. **Lit SSR (escape hatch)** — `@lit-labs/ssr` renders Lit components to HTML strings (with DSD where used). This is **labs/experimental** and not promised as streaming SSR. Use for Node-rendered apps that need component-level SSR.

The application-block template path is preferred because:

- It works without Lit installed on the server.
- Drupal/Sitecore/AEM/Rails/Django integrators get the rendering they expect.
- It is more performant (no Lit runtime on the server).

## Form-associated custom elements

interactive input components (custom inputs, custom selects) participate in `<form>` via `ElementInternals`:

```ts
@customElement("ashlar-input")
export class AshlarInput extends LitElement {
  static formAssociated = true;
  private internals = this.attachInternals();

  setValue(v: string) {
    this.internals.setFormValue(v);
    this.internals.setValidity(/* ValidityState */);
  }
}
```

Browser support: Chrome 77+, Edge 79+, Firefox 98+, Safari 16.4+. Global ~94.92%.

### Firefox ARIA reflection fallback

Firefox's `ElementInternals` implementation has **partial coverage of ARIA reflection** as of April 2026. Setting `internals.ariaLabel`, `internals.ariaExpanded`, etc. does not propagate to assistive tech reliably.

**Mitigation**: set ARIA attributes directly on the host or inner element rather than via `internals.aria*`:

```ts
// Reliable across browsers:
this.setAttribute("aria-expanded", state);

// Unreliable in Firefox (do not use as the only path):
this.internals.ariaExpanded = state;
```

The fallback is documented per-component in the CEM `_ashlar.firefoxFallbacks` field. Tests verify ARIA propagation in Firefox specifically.

## Framework adapters

Adapters are auto-generated from each capsule's extended CEM. The generator reads:

- Tag name and class
- Attributes and properties
- Slots
- Events (and event detail types)
- `_ashlar.variants`, `_ashlar.sizes`, etc.

And emits framework-idiomatic wrappers.

### React adapter

Generated via `@lit/labs/gen-wrapper-react`-style tooling, customized for Ashlar's CEM extensions:

```tsx
// @blen/ashlar-react/combobox.tsx (generated)
import { createComponent } from "@lit/react";
import { AshlarCombobox } from "@blen/ashlar-element/combobox";

export const ComboBox = createComponent({
  tagName: "ashlar-combobox",
  elementClass: AshlarCombobox,
  react: React,
  events: {
    onSelect: "ashlar-select",
    onOpen: "ashlar-open",
    onClose: "ashlar-close"
  }
});

// Plus typed props derived from CEM
export type ComboBoxProps = React.ComponentProps<typeof ComboBox>;
```

For SSR + React 19, the adapter handles `"use client"` boundaries appropriately.

### Vue adapter

```vue
<!-- @blen/ashlar-vue/combobox.vue (generated) -->
<script setup lang="ts">
import { onMounted } from "vue";
import "@blen/ashlar-element/combobox";

defineProps<{
  options?: Option[];
  modelValue?: string;
}>();

defineEmits<{
  "update:modelValue": [value: string];
  select: [value: string];
}>();
</script>

<template>
  <ashlar-combobox
    :options="options"
    :value="modelValue"
    @ashlar-select="$emit('select', $event.detail)"
  />
</template>
```

### Svelte / Solid adapters

Analogous patterns. Generated from the same CEM.

### Vanilla / Element delivery

For Drupal, Sitecore, AEM, plain HTML — the custom element itself is the delivery:

```html
<script type="module">
  import "@blen/ashlar-element/combobox";
</script>

<ashlar-combobox></ashlar-combobox>
```

No framework, no adapter, no build step required.

## Adapter generation pipeline

```
capsule.cem.json + capsule.element.ts
              │
              ▼
       adapter generator
              │
   ┌──────────┼──────────┬──────────┬──────────┐
   ▼          ▼          ▼          ▼          ▼
@blen/     @blen/     @blen/     @blen/     @blen/
ashlar-    ashlar-    ashlar-    ashlar-    ashlar-
react      vue        svelte     solid      element
```

When a capsule's machine or shell changes:

1. Capsule rebuild updates `capsule.cem.json`.
2. Adapter generator detects changes; regenerates adapters.
3. Adapter packages are republished as part of the registry release.

Adapters never drift from the canonical implementation because they are not hand-maintained.

## Bundle math

For a typical interactive component (Combobox), gzipped:

- Lit runtime (shared): ~5KB
- Zag core (shared): ~4KB
- Combobox machine: ~2KB
- Lit shell: ~1.5KB
- React adapter (if used): ~1KB

**Total for first interactive component**: ~13KB. Each additional interactive component on top: ~3KB (machine + shell only). Compared to shadcn's Combobox at ~30KB and Carbon WC's at ~35KB, Ashlar ships materially smaller.

## References

- [ADR 0010 — Framework strategy](../adr/adr-0010-framework-strategy.md)
- [State management](./state-management.md)
- [Capsule format](./capsule.md)
- [research/04-web-components.md](../research/04-web-components.md)
- Lit 3.x: https://lit.dev/
- `@lit-labs/ssr`: https://github.com/lit/lit/tree/main/packages/labs/ssr
- `@lit/react`: https://www.npmjs.com/package/@lit/react
- Custom Elements Manifest: https://github.com/webcomponents/custom-elements-manifest
- Declarative Shadow DOM: https://web.dev/articles/declarative-shadow-dom
