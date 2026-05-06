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
