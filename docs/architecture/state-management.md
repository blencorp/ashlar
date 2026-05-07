# State management

L1 components express behavior as **statecharts** (via Zag.js) plus **signals** (TC39-aligned reactive primitives). The Lit shell is a thin renderer that subscribes to the machine and reflects state to DOM.

This document describes how machines are authored, how signals integrate, and how the same machine drives the Lit custom element and every framework adapter.

## Why this combination

Statecharts (Harel, 1987) model **state and transitions** with hierarchy, orthogonality, and refined events — collapsing the combinatorial explosion of stateful UI components into tractable, visualizable, model-checkable structures.

Signals model **reactive data flow**: derivations, dependencies, and fine-grained updates. TC39 Signals (Stage 1) is the emerging platform standard; Solid, Preact, Angular, and Vue all align with the proposal.

The pairing is complementary:

- The machine encodes **what state the component is in** and **which transitions are valid**.
- Signals carry **reactive derived values** (filtered options, computed validity, derived ARIA attributes) that flow through those states.

## Authoring a machine

A capsule's L1 implementation has two key files: `*.machine.ts` (the statechart) and `*.element.ts` (the Lit shell that consumes it).

### Example: ComboBox machine (sketch)

```ts
// combobox.machine.ts
import { createMachine } from "@zag-js/core";
import { signal } from "@blen/ashlar-signals";

export interface ComboBoxContext {
  inputValue: string;
  selectedValue: string | null;
  filteredOptions: ReadonlyArray<Option>;
  loading: boolean;
}

export const comboboxMachine = createMachine<ComboBoxContext>({
  id: "combobox",
  context: {
    inputValue: "",
    selectedValue: null,
    filteredOptions: [],
    loading: false
  },
  initial: "closed",
  states: {
    closed: {
      on: {
        OPEN:    { target: "open" },
        FOCUS:   { target: "open" },
        TYPE:    { target: "open", actions: "syncInput" }
      }
    },
    open: {
      activities: ["trapTabFocus", "watchOutsideClick"],
      meta: { aria: { expanded: true } },
      states: {
        idle: {
          on: {
            TYPE:           { target: "filtering", actions: "syncInput" },
            ARROW_DOWN:     { actions: "focusNextOption" },
            ARROW_UP:       { actions: "focusPrevOption" },
            HOME:           { actions: "focusFirstOption" },
            END:            { actions: "focusLastOption" },
            ENTER:          { target: "#combobox.closed", actions: "select" },
            ESCAPE:         { target: "#combobox.closed" }
          }
        },
        filtering: {
          invoke: {
            src: "filterOptions",
            onDone:   { target: "idle", actions: "setFilteredOptions" },
            onError:  { target: "error" }
          }
        },
        error: {
          on: { TYPE: "filtering" }
        }
      },
      initial: "idle"
    }
  }
});
```

The machine declares states, transitions, hierarchy, and ARIA implications. Zag's runtime executes the machine; consumers (Lit shell, framework adapters) subscribe to its current state and emit DOM updates.

### Signals inside the machine

Reactive derived data uses signals (not the machine context) so that fine-grained reactivity is preserved across renders without state-explosion:

```ts
// combobox.signals.ts
import { computed, signal } from "@blen/ashlar-signals";

export function createComboBoxSignals(machine: Machine<ComboBoxContext>) {
  const inputValue = computed(() => machine.context.inputValue);
  const filteredOptions = computed(() => machine.context.filteredOptions);

  const ariaExpanded = computed(() =>
    machine.matches("open") ? "true" : "false"
  );
  const ariaActiveDescendant = computed(() => {
    const opt = machine.context.focusedOption;
    return opt ? `option-${opt.id}` : null;
  });

  return { inputValue, filteredOptions, ariaExpanded, ariaActiveDescendant };
}
```

## Lit shell

The Lit custom element is a thin renderer:

```ts
// combobox.element.ts
import { LitElement, html } from "lit";
import { customElement, property } from "lit/decorators.js";
import { comboboxMachine } from "./combobox.machine";
import { createComboBoxSignals } from "./combobox.signals";

@customElement("ashlar-combobox")
export class AshlarCombobox extends LitElement {
  @property({ type: Array }) options: Option[] = [];
  @property({ type: String }) value: string = "";

  // Use light DOM by default for theming; opt into shadow DOM only when needed
  createRenderRoot() { return this; }

  private machine = comboboxMachine.start();
  private signals = createComboBoxSignals(this.machine);

  connectedCallback() {
    super.connectedCallback();
    this.machine.subscribe(() => this.requestUpdate());
  }

  render() {
    return html`
      <div class="ashlar-combobox">
        <input
          type="text"
          role="combobox"
          aria-expanded=${this.signals.ariaExpanded.value}
          aria-activedescendant=${this.signals.ariaActiveDescendant.value ?? ""}
          .value=${this.signals.inputValue.value}
          @input=${(e: InputEvent) => this.machine.send({ type: "TYPE", value: (e.target as HTMLInputElement).value })}
          @keydown=${this.handleKeyDown}
        />
        ${this.machine.matches("open") ? this.renderListbox() : null}
      </div>
    `;
  }

  // ...
}
```

The shell:

- Defines the custom element.
- Subscribes to the machine; re-renders on transition.
- Forwards events from DOM into the machine.
- Maps signal values to ARIA attributes and visible content.
- Uses Light DOM by default (theming compatibility); Shadow DOM only when encapsulation matters.

## Framework adapters

Adapters are auto-generated from the capsule's CEM. They consume the machine directly (not through the Lit shell) for idiomatic framework integration.

### React adapter (auto-generated, simplified)

```tsx
// @blen/ashlar-react/combobox.tsx (generated)
import { useEffect, useRef, useState } from "react";
import { comboboxMachine } from "@blen/ashlar-components-source/combobox/machine";
import { createComboBoxSignals } from "@blen/ashlar-components-source/combobox/signals";

export function ComboBox(props: ComboBoxProps) {
  const machineRef = useRef(comboboxMachine.start());
  const signalsRef = useRef(createComboBoxSignals(machineRef.current));
  const [, force] = useState({});

  useEffect(() => {
    return machineRef.current.subscribe(() => force({}));
  }, []);

  const m = machineRef.current;
  const s = signalsRef.current;

  return (
    <div className="ashlar-combobox">
      <input
        type="text"
        role="combobox"
        aria-expanded={s.ariaExpanded.value === "true"}
        aria-activedescendant={s.ariaActiveDescendant.value ?? undefined}
        value={s.inputValue.value}
        onChange={(e) => m.send({ type: "TYPE", value: e.target.value })}
      />
      {m.matches("open") && <ListBox machine={m} signals={s} />}
    </div>
  );
}
```

The same machine drives both the Lit element and the React component. **No behavior drift between the two.**

## Inspectability

Each capsule's machine compiles to a Stately-Studio-compatible JSON representation:

```bash
ashlar inspect combobox    # opens machine in Stately Studio
```

The visualizer shows states, transitions, guards, actions, and ARIA implications. The machine plus its visualization is itself a form of accessibility evidence — the WCAG mapping in the evidence packet refers to specific transitions in the machine.

## Resumability discipline

L1 components serialize machine state into data attributes on the rendered DOM, so a server-rendered component can be "resumed" on the client without re-running setup logic.

```html
<ashlar-combobox
  data-ashlar-state="open.idle"
  data-ashlar-context='{"inputValue":"hello","selectedValue":null}'
>
  ...
</ashlar-combobox>
```

On client-side connect, the machine reads `data-ashlar-state` and `data-ashlar-context`, jumps to that state without replaying the transition history. This is a discipline (not a runtime requirement) that keeps Ashlar positioned for resumability-driven SSR architectures (Qwik-style, future frameworks).

## Firefox ARIA reflection fallback

`ElementInternals.aria*` reflection has incomplete support in Firefox as of April 2026. L1 components must set ARIA attributes directly on the host element (or on the relevant inner DOM) rather than rely on `internals.ariaLabel` etc.

```ts
// In the Lit shell:
this.setAttribute("aria-expanded", this.signals.ariaExpanded.value);
// NOT: this.internals.ariaExpanded = ...
```

This fallback discipline is documented per-component in the CEM `_ashlar.firefoxFallbacks` field.

## Testing machines

Machines are unit-testable without DOM:

```ts
// combobox.machine.test.ts
import { comboboxMachine } from "./combobox.machine";

test("Escape closes open combobox", () => {
  const m = comboboxMachine.start();
  m.send({ type: "OPEN" });
  expect(m.matches("open")).toBe(true);
  m.send({ type: "ESCAPE" });
  expect(m.matches("closed")).toBe(true);
});

test("Filtering enters error state on async failure", async () => {
  // ...
});
```

DOM-level tests (Playwright + axe) verify the integration between machine and rendered output. Both are required for stable status.

## References

- [ADR 0006 — State management](../adr/adr-0006-state-management.md)
- [research/06-statecharts-and-frontier.md](../research/06-statecharts-and-frontier.md)
- [Web Components architecture](./web-components.md)
- Zag.js: https://zagjs.com/
- TC39 Signals: https://github.com/tc39/proposal-signals
- Stately Studio: https://stately.ai/
