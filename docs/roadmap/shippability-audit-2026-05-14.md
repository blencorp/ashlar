# Shippability audit — 2026-05-14

This audit answers the current product question: are we building something real and testable, or just another AI UI library surface?

Short answer: Ashlar is now a coherent v0.0 public prototype candidate, but it is not shipped yet. The repo proves a serious direction: source-owned capsules, federal policy audit, provenance-aware install/update/verify, source-backed themes, examples across common stacks, AI-readable contracts, and release gates. The product is still blocked from external testing because the `@blen/*` packages are not published to npm.

## Research refresh

Checked against current public references on 2026-05-14:

- shadcn/ui theming still recommends CSS variables, semantic background/foreground pairs, a global CSS file, and Tailwind v4 `@theme inline` mappings. Source: https://ui.shadcn.com/docs/theming
- shadcn/ui `components.json` still uses `tailwind.css`, `tailwind.cssVariables`, `baseColor`, and a blank Tailwind config path for Tailwind v4 projects. Source: https://ui.shadcn.com/docs/components-json
- shadcn/ui registry docs frame the registry as framework-agnostic code distribution, not React-only packages. Source: https://ui.shadcn.com/docs/registry
- shadcn CLI v4 added `info`, `docs`, `registry:base`, and `registry:font`, which confirms that agent-readable project context and single-payload design-system setup are now table stakes. Source: https://ui.shadcn.com/docs/changelog/2026-03-cli-v4
- USWDS design tokens continue to expose systematic color, spacing, and typography primitives through tokens, functions, mixins, and utilities. Source: https://designsystem.digital.gov/design-tokens/
- DTCG 2025.10 is a stable W3C Community Group token format report with theming, modern color spaces, aliases, and cross-platform exchange. Source: https://www.w3.org/community/design-tokens/
- WHATWG custom elements support progressive enhancement and form-associated custom elements, but native HTML remains the safest default for simple controls. Source: https://html.spec.whatwg.org/dev/custom-elements.html
- MDN still notes Safari does not plan to support customized built-in elements, so Ashlar should not base the core gov-ready contract on that path. Source: https://developer.mozilla.org/en-US/docs/Web/API/Web_components/Using_custom_elements
- npm Trusted Publishing remains the long-term publishing target; first-publish bootstrap still needs an authenticated package publish path because the packages do not exist yet. Sources: https://docs.npmjs.com/trusted-publishers and https://docs.npmjs.com/cli/v11/commands/npm-trust/

## Current evidence

- Latest local commit on `main`: `2711007` (`ci: verify public installs during npm bootstrap`)
- Package manifests:
  - `@blen/ashlar@0.3.23`
  - `@blen/ashlar-cli@0.3.23`
  - `@blen/ashlar-schemas@0.1.5`
  - all have `publishConfig.access: "public"`, `publishConfig.provenance: true`, repository metadata, homepage links, issue links, keywords, bundled `README.md`, and bundled `LICENSE`
- Package smoke: `pnpm release:smoke` now requires `package/README.md` and `package/LICENSE` in all three public tarballs and verifies the packed CLI installs into a throwaway consumer app
- Public npm state: `npm view @blen/ashlar version --registry https://registry.npmjs.org` returns `E404`
- GitHub secret state: `gh secret list --repo blencorp/ashlar` lists `NPM_TOKEN` updated at `2026-05-14T20:16:32Z`
- GitHub Releases state: no releases yet
- Local browser evidence: `output/playwright/ashlar-vite-desktop.png`, `output/playwright/ashlar-vite-mobile.png`, and `output/playwright/ashlar-docs-desktop.png` capture the Vite case board and first-run docs surfaces
- Local dirty state before this audit refresh: `.gitignore` already had `.remember/`

## Prompt-to-artifact checklist

| Requirement | Current artifact or evidence | Status | Notes |
| --- | --- | --- | --- |
| Give developers something meaningful to test | Vite benefits case-board demo, first-run docs app, `pnpm release:smoke`, and public install smoke script | Partial | Local checkout is testable; public npm install is still impossible until first publish succeeds |
| Highly inspired by shadcn v4 | CLI supports `init/create`, `add`, `search/list`, `view/docs`, dry-run/diff/view paths, source-owned installed files, and registry metadata | Partial | Direction is right, but public docs and first-run UX still need real user testing after publish |
| Address shadcn weaknesses | Capsule manifests, index-pinned hashes, lockfile verification, update survival tests, evidence packets, SBOM/trust bundle, provenance gates | Partial | Stronger than plain copy-paste locally; public npm provenance and public capsule Sigstore trust remain open |
| Gov-ready foundation | Federal audit rules, USWDS migration mapper, banner/identifier checks, ICT Baseline/WCAG evidence model, source-backed agency themes | Partial | Not replacement-grade until stable evidence and external review records exist |
| Clear simple theming | `packages/cli/themes/*.tokens.json`, `theme sync`, `theme validate`, generated `theme.css`, Tailwind v4 `@theme`, typed `tokens.ts`, Default/VA/USDA examples, and refreshed first-run theming docs | Partial | Good v0.0 shape; broader DTCG export/design-tool path and more agency adapters are future work |
| Native web APIs and light footprint | Foundation capsules are semantic HTML/CSS, current capsule JavaScript budget is 0 B, bundle-budget gate exists | Pass for v0.0 foundations | Interactive controls are still future work |
| AI-native app development | Extended CEM metadata, AGENTS.md fanout, DESIGN.md export, read-only MCP server, deterministic AI eval harness | Partial | Good local substrate; hosted MCP/write tools and richer generated-output eval are intentionally deferred |
| Real framework examples | `examples/vanilla`, `react-spa`, `nextjs`, `svelte`, `vue`, `vite`, `plain-html`; `pnpm examples:visual` in CI | Pass | CI passed on latest `main` |
| Docs app | `apps/docs` rebuilt on Fumadocs; first-run docs now explain the shadcn-inspired wedge, the simple theme contract, what to test, and release claim boundaries | Partial | Needs post-publish user review for clarity and visual acceptance |
| Conventional release/version path | Changesets/version workflows, npm bootstrap workflow, tokenless publish workflow, guarded GitHub Release workflow | Partial | Workflows are present and CI-green; npm token/trusted-publisher setup is still external |
| Public npm package quality | Package READMEs, Apache license files, npm descriptions, keywords, homepage, bugs URL, and release-smoke tarball guards | Pass for first prototype publish | Does not replace real external install testing after publish |
| Public npm package | `npm-bootstrap.yml` can publish with `NPM_TOKEN` and now verifies `npx`, `pnpm dlx`, and `bunx` immediately after publish; `publish.yml` is the tokenless long-term path | Ready for approval | `NPM_TOKEN` exists; packages still return `E404` until bootstrap publish runs |
| GitHub Releases visible | `github-release.yml` creates `v<version>` only after npm packages and public install commands pass | Blocked | Cannot run until npm publish succeeds |

## Ship decision

Do not call this replacement-grade or public-alpha yet.

It is reasonable to ship a first public prototype once these gates pass:

1. Run `npm-bootstrap.yml` with `confirm=bootstrap-npm`; the workflow publishes,
   verifies public install commands, and verifies public npm provenance.
2. Verify public install:

   ```bash
   pnpm release:verify-public
   ```

3. Configure npm Trusted Publishing for:

   ```bash
   npm trust github @blen/ashlar --repo blencorp/ashlar --file publish.yml
   npm trust github @blen/ashlar-cli --repo blencorp/ashlar --file publish.yml
   npm trust github @blen/ashlar-schemas --repo blencorp/ashlar --file publish.yml
   ```

   Run these from an npm login session with npm 11.10+ and account 2FA enabled. The package must already exist on npm before these commands can configure trust.

4. Run `github-release.yml` with `confirm=release`.
5. Revoke/delete the bootstrap token after Trusted Publishing is confirmed.

## What not to do next

- Do not start another docs redesign before the package is public and testable.
- Do not add more component surfaces before the first public install path works.
- Do not claim USWDS replacement, accessibility-stable, or public-alpha status until stable evidence and external review records are complete.
- Do not route normal users through GitHub Packages; npmjs.com is the primary registry.

## Immediate release action

After the user approves the product surface, the next release action is the first npm publish:

```bash
gh workflow run npm-bootstrap.yml \
  --repo blencorp/ashlar \
  --ref main \
  -f confirm=bootstrap-npm
```

After that run passes, run:

```bash
pnpm release:verify-public
gh workflow run github-release.yml --repo blencorp/ashlar --ref main -f confirm=release
```
