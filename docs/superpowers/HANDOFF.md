# HANDOFF — 2026-05-06 proof-gate checkpoint

For the next session picking up Ashlar work. Read this first; it should orient you in under five minutes. After this, read [STATUS.md](../../STATUS.md) (the canonical truth table) and scan the recent commits.

## Where we are

- **Branch**: active foundation PR stack ending at `codex/npx-ashlar-entrypoint`.
- **Phase**: v0.0 prototype.
- **Slices shipped/prototyped**: 1 (Standards & Evidence), 2 (Validator Wedge), 3 (Drift Management prototype), plus started substrate for 4 (Supply-chain Hardening), 5 (AI Contracts), and 6 (Token Pipeline).
- **Current posture**: coherent standards/evidence foundation, not replacement-grade yet.
- **Strict readiness blockers**: `stable-markup-evidence`, `external-review-proof`, `npm-provenance-public`, and `sigstore-public-trust`.
- **Proof tracking**: milestone [Replacement-grade proof gates](https://github.com/blencorp/ashlar/milestone/1), issues [#22](https://github.com/blencorp/ashlar/issues/22), [#23](https://github.com/blencorp/ashlar/issues/23), and [#24](https://github.com/blencorp/ashlar/issues/24).
- **Next real work**: collect external proof for Button stable evidence, public release trust/provenance, and one design-partner validation. Do not create placeholder `docs/reviews/*.md` records.
- **Apps surface**: `examples/plain-html/` (CI audit target), `examples/vite/` (theme picker reference), `apps/www/` (marketing landing).
- **Tests**: use Node 24.15.0. The current PR stack has green CI; `pnpm check`, `pnpm build`, `pnpm release:smoke`, provenance readiness, SBOM/trust-bundle generation, evidence checks, AI eval, migration report, bundle budgets, and audits run in CI.

The repo and the docs are coherent. Every claim in `README.md`, `docs/strategy.md`, and `docs/philosophy.md` defers to [STATUS.md](../../STATUS.md). When a doc and STATUS disagree, STATUS wins.

The older notes below preserve useful background, but treat branch names, completed-slice counts, PR state, and next-step recommendations from the 2026-04-29 session as historical unless STATUS.md agrees with them.

## Decision: docs framework is Astro Starlight (planned for next session)

After surveying 16 OSS projects' doc setups in 2026, the recommendation for `apps/docs` is **Astro Starlight**. Starlight ships `~12 kB JS per content page`, supports air-gapped static search via Pagefind, has a component override system that accommodates the federal-shell furniture (banner + identifier), and is run in production by Cloudflare Docs, Netlify Docs, Effect-TS, Biome, Font Awesome, and freeCodeCamp. Cloudflare acquired Astro in 2025, which gives the project an enterprise-tier maintenance floor.

Runner-up: **Fumadocs** (Next.js, used by shadcn/ui). Easier path to live-React previews and shadcn-style component embedding, but at ~85 kB JS per page, mandatory Next.js coupling, and a "vibes-coded modern" default look that reads as startup-y rather than infrastructural to a federal procurement audience. For Ashlar's audience the tradeoffs go the wrong way.

What we'll get out of Starlight directly:
- **Component pages auto-generated from registry data** via Astro Content Collections + a dynamic `src/pages/components/[name].astro` that walks `registry/components/*/{cem,evidence}.json`.
- **Pagefind static search** built from the rendered HTML at build time. No network calls; works on air-gapped GovCloud.
- **Component overrides** for `Header.astro`, `Footer.astro`, `PageFrame.astro` so we can drop in a federal banner and an identifier with the seven required links.
- **Built-in tabs / code blocks / dark mode / i18n / edit-this-page** without writing them.
- **Live theme picker** as a deliberate `client:visible` island (one well-built component, reused across pages — not a React-everywhere site).

Open question for next session: do we add `@astrojs/react` or use vanilla JS islands for the theme picker? Vanilla aligns better with the philosophy; React would be slightly more ergonomic for the in-progress `/components/<name>` pages. Decide on day one and stay consistent.

## What was committed this session

Three trains. Most recent first:

```
1253135 feat(examples/vite): rebuild as a federal-compliant data-driven theme picker
b0bec08 feat(cli,schemas): theme system loads per-file JSON; make Default the baseline theme
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

**Train C — example rebuild (3 commits, `fb55810` → `1253135`)**: landed the previously-uncommitted CLI infrastructure (`styles.ts`, component-subdir install layout, ResolvedAshlarConfig types); refactored the theme system so themes live in per-file DTCG JSON under `packages/cli/themes/`, validated by a new `agency-theme.schema.json`; rebuilt `examples/vite/` from a fresh `pnpm create vite@latest --template vanilla-ts` scaffold into a federal-compliant data-driven theme picker. The stock baseline theme is now named "Default" everywhere.

**Train D — marketing site v1 (1 commit)**: deleted stale `output/` PNG screenshots, gitignored the directory; rebuilt `apps/www/` from `pnpm create vite@latest` into a marketing landing page. First pass dogfooded Ashlar tokens. Superseded by Train E.

**Train E — marketing site v2, pixel-perfect from Claude Design handoff (current pass)**: replaced the v1 landing with a vanilla-TS implementation of the "Ashlar Landing v2.html" prototype the design tool produced. Massive "Ashlar" wordmark hero (clamp 112–232px) with animated running-bond ashlar pattern (programmatic SVG: 13 horizontal courses sweep left-to-right, vertical stones rise course-by-course on a wave, then a radial veil fades in centered on the wordmark). Federal disclosure strip with real US flag SVG. Compare grid contrasting "federal stack today" with "with Ashlar". Animated terminal that loops `ashlar init / add field button alert / verify`. Four pillars (own / signed / two render targets / receipts). Navy footer with beating-heart "BLEN" attribution. Geist + Geist Mono fonts. Civic palette is the page's own (`#0A2240` navy, `#B22234` red), not Ashlar agency tokens — the marketing site has its own visual identity. Dropped `@blen/ashlar-cli` workspace devDep + `ashlar init`/`add` artifacts from `apps/www/` since the design uses native button styling, not the Ashlar Button capsule. Dark-mode toggle from the design is implemented in CSS (data-theme + 4 dark palettes) but hidden from the UI for now per user direction. Bundle: ~10.6 kB gzipped (3.3 HTML + 3.7 CSS + 3.6 JS).

## What is on the working tree

The tree should be clean after this session's commits. If `git status` shows anything unexpected, surface it before doing substantive work.

## What is next

Two useful tracks remain; user picks the order.

### Track A — land the foundation stack and close public-proof gates

The active PR stack is the product substrate. Get it reviewed/merged before opening more broad implementation surfaces, then close the gates that make the "replacement-grade" language true.

Scope:
- Keep the current PR stack green and mergeable: foundation, review-pack docs, release-trust path portability/typecheck isolation, and the scoped `@blen/ashlar` npx entrypoint.
- Collect and publish one real Button stable-evidence packet: automated run, keyboard transcript, screen-reader transcript, reviewed packet, graduated packet, local publication receipt, and `docs/reviews/stable-evidence-*.md`.
- Run the first real npm trusted-publishing release for `@blen/ashlar`, `@blen/ashlar-cli`, and `@blen/ashlar-schemas`, then attach `ashlar-npm-provenance.json`.
- Run the Sigstore workflow on release artifacts and attach `ashlar-public-trust.json`.
- Create the completed release-trust and design-partner review records, then require strict `ashlar release readiness` without local escape hatches.

### Track B — `apps/docs` Astro Starlight scaffold

Stand up the docs site so the project has a public-facing surface beyond `apps/www`.

Scope (proposed for one session):
1. `cd apps && pnpm create astro@latest docs -- --template starlight` (or the modern equivalent — verify against `https://starlight.astro.build/`).
2. Workspace-ify the package (`@blen/ashlar-docs`, devDeps via catalog where possible, dev port 4175 to avoid clashing with vite=4173 and www=4174).
3. Customize:
   - Override `Header.astro` to inject the federal banner above content.
   - Override `Footer.astro` to add the identifier-style links.
   - Apply Ashlar tokens to the Starlight theme (CSS custom-property override).
4. Author content:
   - Landing page (`/`) — short hero pointing to `apps/www` for marketing; immediate "Get started" CTA.
   - `/docs/install` — the canonical install + first audit + first add walk-through.
   - `/docs/audit` — federal policy + component policy explained.
   - `/docs/themes` — how to add an agency theme JSON file.
   - `/docs/standards` — Section 508 / ADA / Federal Web Standards posture.
5. Component pages auto-generated from `registry/components/*/{cem,evidence}.json` via Astro Content Collections + `getStaticPaths` walking the registry.
6. Live theme picker as a `client:visible` island; reuse the patterns from `examples/vite/src/main.ts`.
7. Pagefind search (Starlight default).
8. Verify: `pnpm --filter @blen/ashlar-docs build` produces static HTML in `dist/`.

Wait for user green light before starting either track.

## Quick verification (run these first)

```bash
# Confirm clean state
pnpm check                                             # 17 tasks pass
pnpm --filter @blen/ashlar-cli test                         # 48 tests pass

# Validator wedge end-to-end
echo '<button class="ashlar-button"><svg></svg></button>' > /tmp/icon.html
node packages/cli/dist/index.js audit --policy components --registry ./registry /tmp/icon.html
# Expected: ERROR ... ashlar/button/icon-only-needs-label

# Example boots cleanly
pnpm --filter @blen/ashlar-example-vite dev &
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
3. ~~**Token namespace pin** (slice 6) — `architecture/overview.md` uses `--ashlar-action-primary-bg`; `architecture/tokens.md` uses `--ashlar-color-action-primary-bg`.~~ Fixed 2026-05-05.
4. ~~**`radius.control` defined? no** — Button CEM consumes it; tokens.md doesn't define it.~~ Fixed 2026-05-05.
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
- [examples/vite/](../../examples/vite/) — federal-compliant Vite reference. `pnpm --filter @blen/ashlar-example-vite dev` boots it on `127.0.0.1:4173`.
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

- Strategy framing ("federal contractor runs `npx @blen/ashlar audit`") describes target state. The validator *code* works; the *delivery path* via npm is gated on slice 4 (supply-chain hardening). STATUS.md flags this with a "Distribution caveat."
- `theme.ts` now reads from JSON files (one per theme). `init` copies the stock themes into the consumer project. Editing the consumer copies works for that project; editing `packages/cli/themes/<name>.tokens.json` is the upstream source.
- `verify` re-hashes installed files, checks registry capsule hashes and local signatures, validates declared capsule Sigstore bundle metadata when present, and runs `cosign verify-blob` when the trust root requires it. Real public bundle publication is still slice 4 work.
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
