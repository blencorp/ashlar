# Shippability audit — 2026-05-14

This audit answers the current product question: are we building something real and testable, or just another AI UI library surface?

Short answer: Ashlar is now a coherent v0.0 public prototype candidate, but it is not shipped yet. The repo proves a serious direction: source-owned capsules, federal policy audit, provenance-aware install/update/verify, source-backed themes, examples across common stacks, AI-readable contracts, and release gates. The product is still blocked from external testing because the `@blen/*` packages are not published to npm.

## Research refresh

Checked against current public references:

- shadcn/ui registry model: source distribution through registry items, `init`, `add`, `view`, namespaced registries, and URL-backed registries. Source: https://ui.shadcn.com/docs/registry/namespace
- shadcn/ui registry setup/build docs: registry index/item structure and code distribution model. Source: https://ui.shadcn.com/docs/registry/getting-started
- USWDS design tokens: federal design systems should expose reusable tokens across color, typography, spacing, and related style primitives. Source: https://designsystem.digital.gov/design-tokens/
- USWDS spacing/token conventions: token names and output values must be systematic rather than ad hoc CSS literals. Source: https://designsystem.digital.gov/design-tokens/spacing-units/
- Tailwind v4 `@theme`: design tokens can be emitted as CSS variables and made available to utilities without JavaScript config sprawl. Source: https://tailwindcss.com/docs/theme
- npm Trusted Publishing: long-term publishing should use GitHub Actions OIDC and npm provenance; first-publish bootstrap still needs an authenticated package publish path because the packages do not exist yet. `npm trust` itself also requires npm 11.10+, package write access, account-level 2FA, and an already-published package. Sources: https://docs.npmjs.com/trusted-publishers and https://docs.npmjs.com/cli/v11/commands/npm-trust/

## Current evidence

- Latest commit on `main`: `02f348e` (`docs: document first npm publish runbook`)
- CI passed: https://github.com/blencorp/ashlar/actions/runs/25870676243
- Version Packages passed: https://github.com/blencorp/ashlar/actions/runs/25870676251
- Package manifests:
  - `@blen/ashlar@0.3.23`
  - `@blen/ashlar-cli@0.3.23`
  - `@blen/ashlar-schemas@0.1.5`
  - all have `publishConfig.access: "public"` and `publishConfig.provenance: true`
- Public npm state: `npm view @blen/ashlar version --registry https://registry.npmjs.org` returns `E404`
- GitHub secret state: `gh secret list --repo blencorp/ashlar` currently does not list `NPM_TOKEN`
- GitHub Releases state: no releases yet
- Local dirty state: one unrelated `.gitignore` modification remains outside this audit

## Prompt-to-artifact checklist

| Requirement | Current artifact or evidence | Status | Notes |
| --- | --- | --- | --- |
| Give developers something meaningful to test | `pnpm release:smoke` packs and installs `@blen/ashlar` into a throwaway consumer; `scripts/public-install-smoke.mjs` verifies `npx`, `pnpm dlx`, and `bunx` after publish | Blocked | Public npm install is still impossible until first publish succeeds |
| Highly inspired by shadcn v4 | CLI supports `init/create`, `add`, `search/list`, `view/docs`, dry-run/diff/view paths, source-owned installed files, and registry metadata | Partial | Direction is right, but public docs and first-run UX still need real user testing after publish |
| Address shadcn weaknesses | Capsule manifests, index-pinned hashes, lockfile verification, update survival tests, evidence packets, SBOM/trust bundle, provenance gates | Partial | Stronger than plain copy-paste locally; public npm provenance and public capsule Sigstore trust remain open |
| Gov-ready foundation | Federal audit rules, USWDS migration mapper, banner/identifier checks, ICT Baseline/WCAG evidence model, source-backed agency themes | Partial | Not replacement-grade until stable evidence and external review records exist |
| Clear simple theming | `packages/cli/themes/*.tokens.json`, `theme sync`, `theme validate`, generated `theme.css`, Tailwind v4 `@theme`, typed `tokens.ts`, Default/VA/USDA examples | Partial | Good v0.0 shape; broader DTCG export/design-tool path and more agency adapters are future work |
| Native web APIs and light footprint | Foundation capsules are semantic HTML/CSS, current capsule JavaScript budget is 0 B, bundle-budget gate exists | Pass for v0.0 foundations | Interactive controls are still future work |
| AI-native app development | Extended CEM metadata, AGENTS.md fanout, DESIGN.md export, read-only MCP server, deterministic AI eval harness | Partial | Good local substrate; hosted MCP/write tools and richer generated-output eval are intentionally deferred |
| Real framework examples | `examples/vanilla`, `react-spa`, `nextjs`, `svelte`, `vue`, `vite`, `plain-html`; `pnpm examples:visual` in CI | Pass | CI passed on latest `main` |
| Docs app | `apps/docs` rebuilt on Fumadocs, CI build passes | Partial | Technically green; needs post-publish user review for clarity and visual acceptance |
| Conventional release/version path | Changesets/version workflows, npm bootstrap workflow, tokenless publish workflow, guarded GitHub Release workflow | Partial | Workflows are present and CI-green; npm token/trusted-publisher setup is still external |
| Public npm package | `npm-bootstrap.yml` can publish with `NPM_TOKEN`; `publish.yml` is tokenless long-term path | Blocked | No `NPM_TOKEN` secret exists; packages return `E404` |
| GitHub Releases visible | `github-release.yml` creates `v<version>` only after npm packages and public install commands pass | Blocked | Cannot run until npm publish succeeds |

## Ship decision

Do not call this replacement-grade or public-alpha yet.

It is reasonable to ship a first public prototype once these gates pass:

1. Set `NPM_TOKEN` in `blencorp/ashlar`.
2. Run `npm-bootstrap.yml` with `confirm=bootstrap-npm`.
3. Verify public install:

   ```bash
   pnpm release:verify-public
   ```

4. Configure npm Trusted Publishing for:

   ```bash
   npm trust github @blen/ashlar --repo blencorp/ashlar --file publish.yml
   npm trust github @blen/ashlar-cli --repo blencorp/ashlar --file publish.yml
   npm trust github @blen/ashlar-schemas --repo blencorp/ashlar --file publish.yml
   ```

   Run these from an npm login session with npm 11.10+ and account 2FA enabled. The package must already exist on npm before these commands can configure trust.

5. Run `github-release.yml` with `confirm=release`.
6. Revoke/delete the bootstrap token after Trusted Publishing is confirmed.

## What not to do next

- Do not start another docs redesign before the package is public and testable.
- Do not add more component surfaces before the first public install path works.
- Do not claim USWDS replacement, accessibility-stable, or public-alpha status until stable evidence and external review records are complete.
- Do not route normal users through GitHub Packages; npmjs.com is the primary registry.

## Immediate next action

The next action is not more code. It is the first npm publish:

```bash
read -rs NPM_TOKEN
gh secret set NPM_TOKEN --repo blencorp/ashlar --body "$NPM_TOKEN"
unset NPM_TOKEN

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
