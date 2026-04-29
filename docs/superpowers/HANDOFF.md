# HANDOFF — 2026-04-29 (updated)

For the next session picking up Ashlar work. Read this first; it should orient you in under five minutes. After this, read [STATUS.md](../../STATUS.md) (the canonical truth table) and scan the recent commits.

## Where we are

- **Branch**: `codex/standards-evidence-slice` (pushed to `origin`).
- **Phase**: v0.0 prototype.
- **Slices complete**: 1 (Standards & Evidence), 2 (Validator Wedge).
- **Slice in flight**: none. Slice 3 (Drift Management) is next, awaiting user green light.
- **Tests**: 48 passing under Node 24.15.0. `pnpm check` runs lint + typecheck + tests + build clean.

The repo and the docs are coherent. Every claim in `README.md`, `docs/strategy.md`, and `docs/philosophy.md` defers to [STATUS.md](../../STATUS.md). When a doc and STATUS disagree, STATUS wins.

## What was committed this session

Three trains. Most recent first:

```
1253135 feat(examples/vite): rebuild as a federal-compliant data-driven theme picker
b0bec08 feat(cli,schemas): theme system loads per-file JSON; rename Federal to Default
fb55810 feat(cli): aggregate generated entrypoint and component-subdir install layout
08ac780 docs: handoff note for the next session
a5c4078 chore: harden slice 2 — CI exercises components; standalone audit regression test
c19f150 docs: STATUS and validation reflect slice 2 shipped
b11c2dd feat(cli): ast-grep integration; CEM antiPatterns are now executable
6ee366c feat(cli): per-language support matrix; SARIF region from parse5 offsets
a259456 feat(schemas): publish ashlar-cem and config schemas; runtime Ajv validation
8863ce7 fix: make plain-html the federal-compliant CI audit target; vite is a workbench
44fa518 fix(cli): hasClassToken whole-token equality, AGENTS.md template, CI federal audit
ea51e1a docs: add risks R19-R22 (absorption, npm supply chain, Lit+Zag, evidence labor)
bcd3aac docs: correct factual errors and propagate ADR-0011 markup contract
c260480 docs: re-stage v0.0 as a six-slice graph and spec the validator wedge
ea5ba9f docs: sharpen positioning and add STATUS.md as honest claims index
```

**Train A — cleanup (5 commits, `ea5ba9f` → `8863ce7`)**: positioning rewrite, factual corrections (Carbon MCP, DTCG hedge, Lit+Zag), ADR-0011 markup propagation, four new risks (R19-R22), code defects fixed.

**Train B — validator wedge (5 commits, `a259456` → `a5c4078`)**: ast-grep via `@ast-grep/napi`, CEM-to-rule compiler, `audit --policy components` and `--policy all`. Button's `icon-only-needs-label` rule is executable.

**Train C — example rebuild (3 commits, `fb55810` → `1253135`)**: landed the previously-uncommitted CLI infrastructure (`styles.ts`, component-subdir install layout, ResolvedAshlarConfig types); refactored the theme system so themes live in per-file DTCG JSON under `packages/cli/themes/`, validated by a new `agency-theme.schema.json`; rebuilt `examples/vite/` from a fresh `pnpm create vite@latest --template vanilla-ts` scaffold into a federal-compliant data-driven theme picker. The "Federal" stock theme was renamed to "Default" everywhere.

## What is on the working tree (still uncommitted, unrelated to vite)

These predate any session work and remain unauthorized to commit:

```
?? apps/        — apps/www marketing scaffold, never committed
?? output/      — old vite screenshots, never committed
```

`packages/cli/src/lib/styles.ts`, `theme.ts`, related modifications, and `registry/components/button/0.0.1/button.css` polish are now all committed (Train C).

## What is next: Slice 3 — Drift Management

Spec: `docs/roadmap/01-v0.0-foundation.md` under "Slice 3 — Drift Management". The shadcn-killer differentiator and the load-bearing premise of the architecture (R1).

Scope:
- `ashlar update` command with per-file three-way merge using `git merge-file --diff3`.
- Codemod runner via `ast-grep` apply (the wrapper in `packages/cli/src/lib/astgrep.ts` is in place).
- Lockfile `current_hash` refreshed on every CLI invocation (currently seeded equal to `original_hash` and never updated).
- Accessibility-critical force-confirmation when a touched file has `_ashlar.criticalForA11y: true`.
- Conflict resolution UX with `<<<<<<<` markers and `update --resolved <component>` finalization.
- ≥10 instrumented test scenarios.
- Document failure modes textual merge doesn't handle (already in `docs/architecture/drift-and-updates.md`).

Wait for user green light before starting.

## Quick verification (run these first)

```bash
# Confirm clean state
pnpm check                                             # 17 tasks pass
pnpm --filter @ashlar/cli test                         # 48 tests pass

# Validator wedge end-to-end
echo '<button class="ashlar-button"><svg></svg></button>' > /tmp/icon.html
node packages/cli/dist/index.js audit --policy components --registry ./registry /tmp/icon.html
# Expected: ERROR ... ashlar/button/icon-only-needs-label

# Example boots cleanly
pnpm --filter @ashlar/example-vite dev &
sleep 3
curl -sf http://127.0.0.1:4173/ | grep -E "Ashlar Vite Example|ashlar-button" | head -3
kill %1

# Audit on the example passes
cd examples/vite
pnpm exec ashlar audit --policy all --registry ../../registry index.html
# Expected: "No findings"
cd -
```

## Open follow-ups (non-blocking)

1. **CLI hook for ast-grep custom languages** — matrix declares vue/svelte/astro/erb opt-in; CLI doesn't yet read `audit.languages.<name>` config to call `registerDynamicLanguage`. ~30 lines.
2. **`audit --print-rules`** debug output — useful for authors writing new component anti-patterns. Add when a second component lands.
3. **Token namespace pin** (slice 6) — `architecture/overview.md` uses `--ashlar-action-primary-bg`; `architecture/tokens.md` uses `--ashlar-color-action-primary-bg`. Pin canonical form during slice 6.
4. **`radius.control` defined? no** — Button CEM consumes it; tokens.md doesn't define it. Slice 6.
5. **Governance soften** — reads as if multi-organization maintenance and funded line exist. Soften to "will" / "is committed to". GitHub-launch-readiness gate.

## Key files

- [STATUS.md](../../STATUS.md) — what is real, what is experimental, what is planned. **Always read first.**
- [docs/strategy.md](../strategy.md) — positioning.
- [docs/philosophy.md](../philosophy.md) — design principles.
- [docs/roadmap/01-v0.0-foundation.md](../roadmap/01-v0.0-foundation.md) — six-slice graph.
- [docs/roadmap/risks-and-mitigations.md](../roadmap/risks-and-mitigations.md) — R1-R22.
- [packages/schemas/src/agency-theme.schema.json](../../packages/schemas/src/agency-theme.schema.json) — agency theme contract.
- [packages/cli/themes/](../../packages/cli/themes/) — stock theme JSON files. Add a file to add a theme.
- [packages/cli/src/lib/theme.ts](../../packages/cli/src/lib/theme.ts) — JSON loader replacing the prior hardcoded TS.
- [packages/cli/src/lib/policy/component.ts](../../packages/cli/src/lib/policy/component.ts) — CEM-to-rule compiler.
- [packages/cli/src/lib/policy/languages.ts](../../packages/cli/src/lib/policy/languages.ts) — per-language support matrix.
- [packages/cli/src/lib/astgrep.ts](../../packages/cli/src/lib/astgrep.ts) — ast-grep wrapper.
- [examples/vite/](../../examples/vite/) — federal-compliant Vite reference. `pnpm --filter @ashlar/example-vite dev` boots it on `127.0.0.1:4173`.
- [examples/plain-html/](../../examples/plain-html/) — federal-compliant static reference; CI audit target.

## Operational notes

- Node 24.15.0 (`source ~/.nvm/nvm.sh && nvm use 24.15.0`).
- pnpm 10.33.2.
- Catalog includes ajv ^8.17.1, ajv-formats ^3.0.1, @ast-grep/napi ^0.42.1.
- `verbatimModuleSyntax: true` + NodeNext: Ajv loaded via `createRequire` to avoid CJS interop friction (`schema-validate.ts:1-15`).
- Format: biome. Run `pnpm exec biome format . --write` if formatter complains.
- The `.github/workflows/ci.yml` audit step has a security hook that blocks complex multi-line edits. Use single-line edits for that file.
- The vite example's `.gitignore` overrides the repo-level `ashlar-lock.json` exclusion via `!ashlar-lock.json` etc. so the generated artifacts ship with the repo for clone-and-run.

## Honest gotchas

- Strategy framing ("federal contractor runs `npx @ashlar/cli audit`") describes target state. The validator *code* works; the *delivery path* via npm is gated on slice 4 (supply-chain hardening). STATUS.md flags this with a "Distribution caveat."
- `theme.ts` now reads from JSON files (one per theme). `init` copies the stock themes into the consumer project. Editing the consumer copies works for that project; editing `packages/cli/themes/<name>.tokens.json` is the upstream source.
- `verify` does not validate Sigstore signatures yet — it only re-hashes installed files against `original_hash`. Sigstore is slice 4.
- `audit` exits non-zero on error-level findings only. Federal findings are warnings; component findings are errors by default.
- The ast-grep linux-x64 binary install on GitHub Actions is unverified by direct test; it should resolve via `@ast-grep/napi`'s optionalDependencies. If CI fails on `pnpm install`, that's the cause.
- R3's three-org governance criterion is still being met silently (single-author commit history). Recruiting one external maintainer publicly is a GitHub-launch-readiness gate prerequisite.

## What I would do first as the new session

1. `git status` — verify only `apps/` and `output/` are still untracked.
2. `git log --oneline -15` — see the last session's commit story.
3. Read [STATUS.md](../../STATUS.md) end-to-end (~150 lines).
4. Run the verification commands above.
5. Wait for user green light on slice 3 vs. some other priority.

Good luck.
