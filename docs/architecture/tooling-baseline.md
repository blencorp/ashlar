# Tooling baseline

This document records the concrete tool versions the repository is pinned to. Ashlar should stay current, but only on stable release lines suitable for agency and regulated-industry adoption.

Baseline date: **April 29, 2026**.

## Runtime

| Tool | Baseline | Policy |
|---|---:|---|
| Node.js | 24.15.0 LTS | Use the newest Active LTS patch. Do not move to Current releases for repository tooling until they become LTS. |
| pnpm | 10.33.2 | Use the latest stable pnpm 10 release. |

Node.js 26 is Current, not LTS, on this date. Ashlar stays on Node 24 LTS until the next even-numbered Current line is promoted to LTS.

## Workspace and Build

| Tool | Baseline | Use |
|---|---:|---|
| Turborepo | 2.9.6 | Package-task orchestration, dependency-aware builds, cacheable `dist/**` outputs. |
| TypeScript | 6.0.3 | Strict ESM packages with project references. |
| Vitest | 4.1.5 | Unit tests. |
| Biome | 2.4.13 | Formatting and JS/TS linting. |
| Changesets | 2.31.0 | Package versioning and changelog workflow. |
| Commander | 14.0.3 | CLI command surface. |
| @types/node | 24.12.2 | Node 24 type definitions. |

## Monorepo Rules

- Root scripts delegate to `turbo run`; package scripts do the real work.
- Dependency versions are centralized in `pnpm-workspace.yaml` catalogs.
- Internal package dependencies use `workspace:` ranges when introduced.
- Package builds emit to `dist/**` and are cacheable.
- TypeScript packages use `composite`, declaration output, and a root solution `tsconfig.json`.
- pnpm-specific settings live in `pnpm-workspace.yaml`, not `.npmrc`, so npm-based inspection commands do not emit unknown-config warnings.

## Sources

- Node.js releases: https://nodejs.org/en/about/previous-releases
- Node.js 24.15.0 release: https://nodejs.org/en/blog/release/v24.15.0
- pnpm workspaces: https://pnpm.io/workspaces
- pnpm catalogs: https://pnpm.io/catalogs
- Turborepo task configuration: https://turborepo.dev/docs/crafting-your-repository/configuring-tasks
- TypeScript project references: https://www.typescriptlang.org/docs/handbook/project-references
