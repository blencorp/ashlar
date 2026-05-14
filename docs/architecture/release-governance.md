# Release Governance

Ashlar uses Conventional Commits for human-readable history and Changesets for package version authority.

## Commit Contract

Pull request titles and commits must use:

```text
type(scope?): subject
```

Allowed types are `build`, `chore`, `ci`, `docs`, `feat`, `fix`, `perf`, `refactor`, `revert`, `style`, and `test`.

The `Conventional Commits` workflow checks both the pull request title and every commit in the pull request with `commitlint`. This keeps squash-merge titles release-ready while still preventing non-semantic commit history.

## Version Authority

Changesets is the single versioning authority. Do not add `semantic-release` as a second publisher; it would compete with Changesets for version bumps, changelog generation, tags, and npm publication.

For package-impacting changes:

```bash
pnpm changeset
```

Use semver intent in the changeset:

- `patch` for compatible fixes.
- `minor` for compatible features.
- `major` for breaking changes.

The `Version Packages` workflow runs on `main` and opens a version pull request with generated changelog and package version changes. The changelog uses GitHub-linked Changesets output so release notes point back to the relevant PRs and commits.

Every package-impacting pull request should include a changeset before merge.
Documentation-only, CI-only, and non-publishable example changes can skip a
changeset, but the PR description should say that explicitly. The Changesets
status workflow is the review-time guard; the Version Packages workflow is the
post-merge guard that turns accepted changesets into a release PR.

## Publishing

Publishing remains manually gated by `Publish`, not automatic on every merge. That workflow is main-only, requires a `publish` confirmation, runs `pnpm check`, `pnpm build`, `pnpm release:smoke`, local provenance preflight, and release readiness with explicit prototype escape hatches before `changeset publish`.

```bash
gh workflow run publish.yml --ref main -f confirm=publish
```

Release-trust artifact signing is a separate guarded workflow. Run it only
after the release candidate is on `main` and the public trust artifacts are
ready for review:

```bash
gh workflow run sigstore.yml --ref main -f confirm=sign
```

The public packages use the BLEN-owned npm namespace:

- `@blen/ashlar` is the public `npx @blen/ashlar` entrypoint and keeps the installed binary name as `ashlar`.
- `@blen/ashlar-cli` owns the CLI implementation.
- `@blen/ashlar-schemas` owns the JSON Schema package consumed by the CLI.

Publish public developer-facing releases to npmjs through GitHub Actions trusted publishing. Do not make GitHub Packages the default public registry for these packages: [GitHub's npm registry requires an access token](https://docs.github.com/en/packages/working-with-a-github-packages-registry/working-with-the-npm-registry#authenticating-to-github-packages) to publish, install, and delete public packages, which would break the low-friction `npx @blen/ashlar` adoption path.

### First npm publish

The first npm publish is a bootstrap exception because the `@blen/*` packages do
not exist on npm yet. Use `npm-bootstrap.yml` once with a short-lived granular
npm token that can publish public packages under the `@blen` scope and bypass
2FA for publish actions. Do not paste the token into chat, issue bodies, or
commit history.

```bash
read -rs NPM_TOKEN
gh secret set NPM_TOKEN --repo blencorp/ashlar --body "$NPM_TOKEN"
unset NPM_TOKEN

gh workflow run npm-bootstrap.yml \
  --repo blencorp/ashlar \
  --ref main \
  -f confirm=bootstrap-npm
```

After the workflow passes, verify the public install path before announcing the
release:

```bash
pnpm release:verify-public
```

That command checks that npmjs has the current package versions and that `npx`,
`pnpm dlx`, and `bunx` can execute `@blen/ashlar` from the public registry. The
GitHub Release workflow also runs this check and refuses to create a release
until the public install path works:

```bash
gh workflow run github-release.yml \
  --repo blencorp/ashlar \
  --ref main \
  -f confirm=release
```

Once the packages exist on npm, configure trusted publishers for the long-term
tokenless workflow. Run these commands from an interactive npm login session
with npm 11.10+ and account-level 2FA enabled; `npm trust` cannot configure a
package before it exists on the npm registry, and granular access tokens with
bypass 2FA do not work for the trust-management commands.

```bash
npm trust github @blen/ashlar --repo blencorp/ashlar --file publish.yml
npm trust github @blen/ashlar-cli --repo blencorp/ashlar --file publish.yml
npm trust github @blen/ashlar-schemas --repo blencorp/ashlar --file publish.yml
```

Then delete the `NPM_TOKEN` GitHub secret and revoke the npm token. Future
npmjs releases should use `publish.yml`, not `npm-bootstrap.yml`.

`GitHub Packages` is wired separately as an authenticated mirror/canary workflow for the BLEN-owned scope. It is manual-dispatch only, main-only, requires the `publish-github-packages` confirmation, grants `packages: write`, configures `@blen:registry=https://npm.pkg.github.com`, publishes with `BLEN_GITHUB_PACKAGES_TOKEN`, and disables npm provenance for that registry. `ashlar release github-packages-check` verifies this wiring before CI or an operator attempts the mirror publish. This does not satisfy `npm-provenance-public`; only the npmjs trusted-publishing path does.

```bash
gh workflow run github-packages.yml --ref main -f confirm=publish-github-packages
```

GitHub Packages first-publishes npm packages as private packages. If the mirror is meant to be publicly visible, an owner must change package visibility after the first publish and confirm package access inheritance from `blencorp/ashlar`. The committed root `.npmrc` must not route `@blen` to GitHub Packages by default; the scope mapping belongs in `github-packages.yml` so normal `npx @blen/ashlar` use still resolves through npmjs.

The token split is intentional. GitHub's npm registry can publish with `GITHUB_TOKEN` when packages are associated with the workflow repository, but these package names use the `@blen` scope while the repository currently lives under `blencorp/ashlar`. Until the repository or mirror workflow lives under the `blen` owner namespace, the GitHub Packages mirror needs a BLEN-scoped packages token exposed as `BLEN_GITHUB_PACKAGES_TOKEN`. If the repository moves to `blen/ashlar`, prefer switching the mirror back to `GITHUB_TOKEN`.

This split is deliberate:

- Conventional Commits keep review and squash history semantic.
- Changesets records package intent and generates version PRs.
- Trusted publishing and public provenance stay blocked until the release-trust gate is ready.
- GitHub Packages can hold authenticated mirrors or canaries, but it is not the public install path.

For UI, theme, or example-app changes, release readiness also depends on the
example visual-smoke gate:

```bash
pnpm build
pnpm examples:visual
```

That gate runs the production examples in Chromium and rejects horizontal
overflow, missing agency-theme controls, unreadable dark-mode text input styles,
agency modals outside the viewport, and nested-card regressions in the
case-board examples.

For a full local maintainer pass before opening or merging a PR, run:

```bash
pnpm repo:doctor
```

The doctor command runs the format, lint/typecheck/test, build, visual,
release-smoke, publish-readiness, diff-check, strict-readiness, and proof-plan
steps in one place. It writes `reports/doctor/summary.md` and exits 0 only when
local checks pass and strict readiness is blocked solely by the expected proof
gates. It does not count stable evidence, public npm provenance, public
Sigstore trust, or external reviews by itself.
