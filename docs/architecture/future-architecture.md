# Future architecture

This document records architectural primitives that shape Ashlar's long-term direction without being part of v0.0 scope. Each is evaluated for **what it would deliver**, **what it would cost**, and **the conditions under which Ashlar would adopt it**.

The intent is to keep the v0.x architecture compatible with these directions, even if we do not exploit them yet. Decisions made now should not preclude any of them.

## 1. Signals as the reactive primitive

**Status**: Adopted (in v0.0, paired with Zag).

**What**: Signals model fine-grained reactive data flow. **TC39 Signals (Stage 1)** is the emerging platform standard. Solid Signals, Preact Signals, Angular Signals, and Vue Refs all align with the proposal.

**Ashlar uses signals for**: derived ARIA attributes, computed validity, filtered options, anything where reactive recomputation is more natural than statechart context updates.

**Forward conditions**: when TC39 Signals reaches Stage 3+ and ships in browsers, Ashlar migrates from a userland signals library to the platform implementation. The migration surface is contained (machine implementations and Lit shells); consumers should not see breaking changes.

## 2. Resumability-friendly serialization

**Status**: Design discipline (in v0.0, exploited later).

**What**: Standard SSR runs component logic on the server, sends HTML, then re-runs the same logic on the client to "hydrate." Resumability (Qwik's contribution) serializes the entire execution state — including a statechart's current state — into HTML, then resumes on the client without re-running setup.

**Ashlar discipline**: L1 components serialize machine state to `data-ashlar-state` and `data-ashlar-context` attributes. The custom element on the client reads these and jumps directly to that state.

**What this preserves**: future ability to ship a resumability-driven render mode (Qwik-style or successor framework). For government services on slow devices, kiosks, rural connections, this is materially better than hydration.

**Forward conditions**: when a resumability-friendly framework reaches enterprise-grade production maturity (Qwik, post-Qwik successor, or framework-neutral resumability standard), Ashlar ships an `@ashlar/resume` package that exploits the discipline. v0.3+ at the earliest.

## 3. Event-sourced patterns for L3

**Status**: Pattern category (planned for v0.2).

**What**: Every state change is an event; current state is a fold over the event log. Time-travel debugging, replay, and audit trails come for free.

**Government relevance**: federal benefits, eligibility, and case-management contexts have hard audit requirements. Every form submission, every eligibility determination, every benefits decision must be reconstructible from logs. **Event sourcing is the natural architecture for this.** Statecharts compose with it cleanly — every transition is an event.

**Ashlar pattern**: an "event-sourced form" pattern in L3 that consumers can adopt for audit-heavy flows. It includes:

- An event log API (consumer pluggable; can be IndexedDB locally, server-streamed, or fully server-side).
- Replay tooling for time-travel debugging.
- Audit-trail rendering primitives.
- Integration hooks for compliance reporting.

**Forward conditions**: ship one canonical event-sourced pattern in L3 (likely the application-review-and-submit pattern) once the pattern infrastructure is stable.

## 4. CRDT-friendly collaborative patterns

**Status**: Pattern category (planned for v0.3+).

**What**: Government services are increasingly collaborative — case management with multiple caseworkers, application forms reviewed by multiple staff, eligibility flows that survive intermittent connectivity. **CRDTs (Conflict-Free Replicated Data Types)** — Yjs, Automerge — let multiple clients edit shared state without coordination. **Local-first** sync engines — Replicache, ElectricSQL, RxDB, PowerSync — let apps work offline and sync on reconnect.

**Ashlar does not ship a sync engine.** Ashlar ships patterns and components that are **CRDT-aware**: form fields that can present a "this field was updated by another user" indicator, conflict-resolution UX, optimistic-update visuals.

**Forward conditions**: a pattern category, not a runtime requirement. Ships when an L3 pattern (likely "collaborative review" or "field case management") reaches priority and we have a clear consumer with a real CRDT integration.

## 5. Effect systems for typed accessibility

**Status**: Research track (v0.3+ at earliest).

**What**: Effect systems model side effects as typed operations the runtime knows about. Languages with first-class effects: OCaml 5, Koka, Eff. JavaScript libraries: **Effect-TS**.

**The application for design systems**: typed accessibility constraints. A Dialog component declares it "requires" `FocusTrap` and `InertSiblings` effects; the type system enforces the requirement. A consumer cannot use Dialog incorrectly because the compiler tells them at build time that they are missing a WCAG-required behavior.

**Why this is research**: Effect-TS is the most mature library, but it is not yet design-system-applied. The ergonomics of effect-typed components for everyday consumers are not yet validated.

**Forward conditions**: prototype track during v0.3+. Ships only if it passes a "does this make consumer code clearer or muddier?" usability bar with real product engineers, not just researchers.

## 6. Behavioral specifications as portable contracts

**Status**: Implicitly used (Zag machines are this); could be promoted to a portable spec format.

**What**: A capsule's behavior could be described in a portable specification language (state machine + ARIA + keyboard + focus + i18n constraints) from which the React component, Vue component, Lit shell, and even Web Component could be generated.

**Ashlar's current model**: Zag machines plus Lit shell plus auto-generated framework adapters already approximate this. The behavioral spec **is** the Zag machine.

**Forward conditions**: only promote to a separate spec format if (a) consumers ask for it, (b) we have a use case Zag cannot serve, or (c) a community standard emerges. Otherwise, Zag machines plus extended CEM is the de-facto behavioral contract.

## 7. WebAssembly-distributed validation engine

**Status**: Speculative.

**What**: Distribute the ast-grep validator engine as a WASM module that any tool (ESLint, Biome, Oxc, Cursor, Claude Code, custom CIs) can integrate without depending on the Rust binary.

**Why this could matter**: editor and CI integrations standardize. Less Rust binary friction in container/sandbox environments.

**Forward conditions**: only if the Rust binary distribution proves friction in real consumer environments. Currently single-binary works fine.

## 8. Distributed UI / multi-window primitives

**Status**: Out of scope for v0.x.

**What**: Multi-window government workflows (case management screens spread across monitors, kiosk applications driving multiple displays) benefit from process-calculus-derived primitives — CSP, π-calculus, channel-based communication. Erlang and Akka are inspired by these models.

**Why this is far-future**: not a current Ashlar-audience pain point. If federal call-center / casework systems become a target audience, this becomes relevant.

**Forward conditions**: only if a clear enterprise consumer asks. Otherwise out of scope indefinitely.

## 9. AI-driven component composition

**Status**: Adjacent, not core.

**What**: Beyond AI-generated component code, AI-driven composition: a designer describes a flow, the AI assembles patterns and components. Storybook MCP and Figma's design-token / component-mapping work are precursors.

**Ashlar's posture**: provide the primitives (extended CEM, MCP server, AGENTS.md, evidence packets, anti-patterns). Don't build the AI orchestrator; let the ecosystem do it.

**Forward conditions**: ongoing. Ashlar ships the contract; consumers and tool authors build the orchestration.

## 10. Local-first identity / authentication shells

**Status**: Pattern direction (v0.2+).

**What**: Patterns for federated identity (Login.gov, ID.me, DHS, agency SSO) without binding Ashlar to any specific provider. Local-first credential caches for offline-tolerant kiosks.

**Forward conditions**: ships when the identity pattern reaches priority. Most likely paired with the `account-creation` pattern in L3.

## How adoption decisions work

For each frontier above:

1. **Validate demand.** Real consumer ask, or strategic differentiation, or both?
2. **Prototype.** Build smallest thing that proves the bet on a single component or pattern.
3. **Measure.** Does it improve developer experience, accessibility, performance, or auditability without unacceptable cost?
4. **Document the decision.** ADR explaining why we adopted (or rejected) at the conditions specified.
5. **Land in a major version.** Architectural shifts go into `v0.x+1` or `v1.0`, not patches.

## What this list is not

- **Not a roadmap.** The roadmap is in [`roadmap/`](../roadmap/). Frontier items show up there only if they reach "validated demand + prototyped" status.
- **Not a wish list.** Items here are assessed against real engineering and product cost. We say no often.
- **Not exhaustive.** Other primitives (logic-based form validation, aspect-oriented accessibility, TLA+ for invariants) are mentioned in [`research/06-statecharts-and-frontier.md`](../research/06-statecharts-and-frontier.md) but not actively tracked here.

## References

- [research/06-statecharts-and-frontier.md](../research/06-statecharts-and-frontier.md)
- TC39 Signals: https://github.com/tc39/proposal-signals
- Effect-TS: https://effect.website/
- Qwik resumability: https://qwik.dev/docs/concepts/resumable/
- Yjs: https://github.com/yjs/yjs
- Automerge: https://automerge.org/
- ElectricSQL: https://electric-sql.com/
- Replicache: https://replicache.dev/
- Lamport, TLA+: https://lamport.azurewebsites.net/tla/tla.html
