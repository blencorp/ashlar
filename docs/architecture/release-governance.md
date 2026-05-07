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

Publishing remains manually gated by `Publish`, not automatic on every merge. That workflow requires a `publish` confirmation, runs `pnpm check`, `pnpm build`, `pnpm release:smoke`, local provenance preflight, and release readiness with explicit prototype escape hatches before `changeset publish`.

The public packages use the BLEN-owned npm namespace:

- `@blen/ashlar` is the public `npx @blen/ashlar` entrypoint and keeps the installed binary name as `ashlar`.
- `@blen/ashlar-cli` owns the CLI implementation.
- `@blen/ashlar-schemas` owns the JSON Schema package consumed by the CLI.

Publish public developer-facing releases to npmjs through GitHub Actions trusted publishing. Do not make GitHub Packages the default public registry for these packages: [GitHub's npm registry requires an access token](https://docs.github.com/en/packages/working-with-a-github-packages-registry/working-with-the-npm-registry#authenticating-to-github-packages) to publish, install, and delete public packages, which would break the low-friction `npx @blen/ashlar` adoption path. If we later need internal or canary packages on GitHub Packages, add a separate workflow and scope mapping such as `@blen:registry=https://npm.pkg.github.com` instead of changing the public npmjs release path.

This split is deliberate:

- Conventional Commits keep review and squash history semantic.
- Changesets records package intent and generates version PRs.
- Trusted publishing and public provenance stay blocked until the release-trust gate is ready.

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
