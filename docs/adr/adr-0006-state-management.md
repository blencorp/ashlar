# ADR 0006 — State management: statecharts (Zag) plus signals (TC39-aligned)

## Status

Proposed.

## Decision

Express L1 component behavior as:

- **Statecharts** (via Zag.js) for discrete state transitions, ARIA orchestration, keyboard handling, and focus management.
- **Signals** (Solid- or Preact-style, aligned with TC39 Signals Stage 1 proposal) for fine-grained reactive data flow within components.

The Lit custom element shell is a thin renderer that defines the custom element, handles SSR via Declarative Shadow DOM where appropriate, subscribes to the Zag machine, and updates the DOM in response to signal changes.

## Rationale

David Harel's statecharts (1987) solved the combinatorial explosion of finite-state machines for complex stateful systems. Hierarchy, orthogonality, and broadcast events let a Combobox or Date Picker be modeled tractably. Statecharts are inspectable (visualizable in Stately Studio), exhaustively enumerable, and can be mapped one-to-one to WCAG criteria — they are themselves a form of accessibility evidence.

Zag is the production-ready statechart implementation for UI components: framework-agnostic, with adapters for React, Vue, Solid, Svelte, and vanilla JavaScript. It is battle-tested in Chakra v3, Ark UI, and Park UI. Years of accessibility bug reports across these consumers have been absorbed into the machines, which gives Ashlar an enormous head start on ARIA correctness without re-litigating "how does Tab behave in a Listbox with multi-select."

Signals model **reactive data flow** — a different abstraction from state transitions. Filtered options, computed validity, derived ARIA attributes are naturally signal-shaped. TC39 Signals (Stage 1) is the emerging platform standard; Solid Signals, Preact Signals, Angular Signals, and Vue Refs all align with it. Building on signals positions Ashlar for the post-React framework era without committing to any specific framework.

Statecharts and signals are complementary: statecharts define the component's discrete states and transitions; signals carry the reactive data that flows through those states.

## Consequences

**Positive**

- ARIA correctness inherited from a maintained, production-grade engine (Zag).
- Multi-framework support is collapse-able — one machine, many adapters.
- Statechart is itself accessibility evidence (mapping states to WCAG).
- Signals position Ashlar for TC39 platform-level reactivity.
- L1 components are smaller than equivalent shadcn/Radix combinations because behavior amortizes across a small machine library.

**Negative**

- Zag is a dependency; tied to its release cadence and design choices.
- Statechart authoring has a learning curve for engineers unfamiliar with the model.
- Vanilla adapter (for Drupal/HTML) is less mature than framework adapters.
- TC39 Signals is Stage 1; the proposal could change before standardization.

**Mitigations**

- Zag is mature (Chakra UI team, multi-year track record); risk is manageable.
- Statechart documentation includes diagrams, examples, and visualization.
- Lit shell wraps Zag-Vanilla for the WC delivery path; we control that wrapping if Vanilla adapter has gaps.
- Signal usage is encapsulated in machines plus the Lit shell; if TC39 Signals shifts, the migration surface is contained.

## References

- [State management architecture](../architecture/state-management.md)
- [research/06-statecharts-and-frontier.md](../research/06-statecharts-and-frontier.md)
- Harel, "Statecharts: A Visual Formalism," 1987: https://www.wisdom.weizmann.ac.il/~harel/papers/Statecharts.pdf
- Zag.js: https://zagjs.com/
- TC39 Signals proposal: https://github.com/tc39/proposal-signals
- Solid Signals: https://www.solidjs.com/docs/latest/api#createsignal
- Preact Signals: https://preactjs.com/guide/v10/signals/
