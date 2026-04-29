# 06 — Statecharts and the architectural frontier

This document records the conceptual lineage behind Atrium's L1 state-management decisions and surveys the architectural primitives — beyond statecharts — that may shape the long-term direction.

It is reference material for the architecture, not a delivery plan. The actionable subset is captured in the [`architecture/state-management.md`](../architecture/state-management.md) document and in the [`adr/`](../adr/) folder.

## Statecharts — the foundation

David Harel published "Statecharts: A Visual Formalism for Complex Systems" in 1987. The motivation was the combinatorial explosion of traditional finite-state machines — a UI with five binary state flags theoretically requires 2^5 = 32 states.

Harel's three additions made FSM-derived modeling tractable for UI:

1. **Hierarchy (nested states)** — states contain substates. A `Dialog.Open` state can contain `Idle`, `Submitting`, `Error` substates. Transitions defined at the parent level apply to all children. The modal's "Escape closes" transition is written once, not once per substate.

2. **Orthogonality (parallel state regions)** — multiple state machines run simultaneously. A combobox can be in `Open × Filtering × MultiSelect` — three independent dimensions concurrently — without spelling out 2×2×2 combinations.

3. **Broadcast events with refinement** — events propagate through the hierarchy; transitions can have guards, internal-versus-external semantics, and history states (return to the last active substate when re-entering a parent).

Statecharts became part of UML and were standardized as **SCXML** (W3C State Chart XML, 2015). David Khourshid implemented them in JavaScript as **XState** in 2017. **Zag.js** is XState's spiritual descendant — same underlying model, optimized API for component primitives, with framework adapters baked in for React, Vue, Solid, Svelte, and vanilla JavaScript.

The architectural significance for Atrium: a statechart is **inspectable, exhaustively enumerable, and verifiable**. You can map every state and transition to WCAG criteria. You can model-check that focus never escapes a trap. **A statechart is itself a kind of accessibility evidence**, not just a behavior model.

## Beyond statecharts — the frontier

Statecharts model state and transitions. They do not solve everything UI needs. Five frontier areas are worth knowing about, ranked by relevance to Atrium.

### 1. Signals / fine-grained reactivity (most immediately relevant)

Signals are a different abstraction from statecharts. Statecharts model **state transitions**; signals model **reactive data flow**. Where a statechart says "when the user types, transition to `Searching`," signals say "this filtered list is derived from the input value and re-computes when it changes."

**TC39 Signals is in Stage 1** as a JavaScript language proposal (Rob Eisenberg, Daniel Ehrenberg, framework authors). If it ships, signals become a platform primitive the way `Promise` is — every framework converges on the same reactive core. Solid Signals, Preact Signals, Angular Signals, and Vue Refs already align with the proposal.

**For Atrium**: signals plus statecharts is the right pairing. Statecharts for discrete state (Open/Closed, Idle/Loading); signals for continuous reactive data (filtered options, computed validity, derived ARIA attributes). Zag uses signals internally for its newer machines. A design system built on signals plus statecharts in 2026 is positioned for whatever the post-React era looks like.

### 2. Algebraic effects / effect systems

Statecharts model state. **Effect systems model side effects** — network calls, timers, DOM mutations, focus changes — as typed operations the runtime knows about.

Languages with first-class effects: OCaml 5, Koka, Eff. JavaScript libraries: **Effect-TS** (Michael Arnaldi and team, post-fp-ts), some flavors in Effect-Schema.

The interesting application for a design system is **typed accessibility effects**:

```ts
const Dialog = component<DialogProps>()
  .requires(FocusTrap)         // effect: must trap focus
  .requires(InertSiblings)     // effect: siblings get inert
  .provides(ScreenReaderTitle) // effect: announces title on open
```

The type system enforces these effects. A Dialog component cannot ship without satisfying the focus-trap requirement. The compiler tells you at build time that you are missing a WCAG-required behavior.

**Statecharts say what state means; effects say what consequences a state must have.** Both are needed for comprehensive accessibility correctness.

This is research-y in 2026. Effect-TS is the most mature library, but it is not yet design-system-applied. **Atrium research track for v0.3+**, not v0.0 scope.

### 3. Resumability (Qwik's contribution)

Standard SSR runs the component logic on the server, sends HTML, then re-runs the same logic on the client to "hydrate" — wasteful. **Resumability** serializes the entire execution state (including a statechart's current state) into HTML, then resumes on the client without re-running setup.

For government services on slow devices, poor connections, kiosks, or rural-area sites, this is materially better than hydration. Qwik proved it works. The idea is not Qwik-specific — it is an architectural pattern.

**For Atrium**: L1 components should serialize their machine state to data attributes so the entire SSR plus client-takeover flow can resume without re-execution. This is a design discipline, not a runtime requirement. The cost is small; the future option is large.

### 4. CRDTs and local-first sync

Government services are increasingly collaborative: case management with multiple caseworkers, application forms reviewed by multiple staff, eligibility flows that survive intermittent connectivity (mobile field workers, rural areas, offline kiosks).

**CRDTs (Conflict-Free Replicated Data Types)** — Yjs, Automerge — let multiple clients edit shared state without coordination, with mathematically guaranteed convergence. **Local-first** sync engines — Replicache, ElectricSQL, RxDB, PowerSync — let apps work offline and sync when connected.

**For Atrium**: not a v0.x bet. A pattern category we should design **for** in L3 (patterns). An eligibility flow that works in flight mode and syncs back on reconnect is genuinely transformative for federal field services. Atrium does not need to ship the sync engine; Atrium's patterns must work with one.

### 5. Event sourcing

Every state change is an event; current state is a fold over the event log. Time-travel debugging, replay, and audit trails come for free.

Government has hard audit requirements — every form submission, every eligibility determination, every benefits decision must be reconstructible from logs. **Event sourcing is the natural architecture for this**, and statecharts compose with it cleanly (every transition is an event).

**For Atrium**: a design system that ships an "event-sourced form" pattern in L3 would be uniquely useful for federal benefits, eligibility, and case-management contexts. **Realistic v0.2+ deliverable**, after the L3 patterns infrastructure exists.

## Other primitives worth knowing about

- **Behavior trees** (game AI) — hierarchical task models; less relevant for UI than statecharts.
- **Petri nets** — concurrent systems with token flow; mostly for workflow systems.
- **Process calculi (CSP, π-calculus, CCS)** — formal models of concurrent communication. Could matter for distributed UI (multi-window, multi-device). Erlang and Akka are inspired by these.
- **TLA+** (Lamport) — specification language for distributed systems; could spec component invariants and model-check them.
- **Functional Reactive Programming (FRP)** — Conal Elliott, Paul Hudak, Cycle.js (André Staltz). Models state as streams of events with combinators. Different from statecharts (data flow vs state transitions). Complementary to statecharts in spirit; signals are the modern FRP-derived practice.
- **Linear Temporal Logic** (Lamport, Pnueli) — formal specification of "the focus eventually returns to the trigger when the modal closes" as a verifiable property.
- **Aspect-Oriented Programming for Accessibility** — define accessibility aspects that get applied across components. Theoretical but interesting.
- **Logic-based form validation** — JSON Schema, declarative validation rules, derive client and server validation from one source.

Most of these are background context, not active bets.

## What we adopt and when

| Primitive | Status in Atrium | Phase |
|---|---|---|
| Statecharts via Zag | Adopted | v0.0 (L1) |
| Signals (Solid-style or Preact-aligned with TC39) | Adopted | v0.0 (L1, paired with Zag) |
| Resumability-friendly serialization | Design discipline | v0.0 (L1 design constraint) |
| Event-sourced patterns | Pattern category | v0.2 (L3) |
| CRDT-friendly patterns | Pattern category | v0.3 (L3) |
| Effect systems for typed accessibility | Research track | v0.3+ |
| TLA+ specs for critical invariants | Research track | v0.3+ |

## Architectural thesis in one sentence

The frontier is moving from "describe state transitions" (statecharts) to "describe state transitions × reactive data × typed effects × distributed sync × audit semantics" as one coherent model. Atrium bets on **statecharts plus signals** as the v0.x foundation, with the remaining primitives left available as the architecture matures.

## Sources

- David Harel, "Statecharts: A Visual Formalism for Complex Systems," 1987 (Science of Computer Programming): https://www.wisdom.weizmann.ac.il/~harel/papers/Statecharts.pdf
- W3C SCXML: https://www.w3.org/TR/scxml/
- XState: https://xstate.js.org/
- Stately Studio: https://stately.ai/
- Zag.js: https://zagjs.com/
- TC39 Signals proposal: https://github.com/tc39/proposal-signals
- Solid Signals: https://www.solidjs.com/docs/latest/api#createsignal
- Preact Signals: https://preactjs.com/guide/v10/signals/
- Effect-TS: https://effect.website/
- Qwik resumability: https://qwik.dev/docs/concepts/resumable/
- Yjs (CRDTs): https://github.com/yjs/yjs
- Automerge: https://automerge.org/
- ElectricSQL: https://electric-sql.com/
- Replicache: https://replicache.dev/
- Cycle.js (FRP for UI): https://cycle.js.org/
- Lamport, "The Temporal Logic of Actions," 1994: https://lamport.azurewebsites.net/pubs/lamport-actions.pdf
- TLA+: https://lamport.azurewebsites.net/tla/tla.html
