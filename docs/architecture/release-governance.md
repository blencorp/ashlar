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

## Publishing

Publishing remains manually gated by `Publish`, not automatic on every merge. That workflow requires a `publish` confirmation, runs `pnpm check`, `pnpm build`, `pnpm release:smoke`, local provenance preflight, and release readiness with explicit prototype escape hatches before `changeset publish`.

This split is deliberate:

- Conventional Commits keep review and squash history semantic.
- Changesets records package intent and generates version PRs.
- Trusted publishing and public provenance stay blocked until the release-trust gate is ready.
