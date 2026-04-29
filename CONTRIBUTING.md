# Contributing

Ashlar is independent open-source research and implementation work. It is not affiliated with, endorsed by, or sponsored by GSA, USWDS, NDS, or the U.S. federal government.

## Current Project State

The project is pre-alpha. Early contributions should focus on repository setup, architecture validation, CLI/registry foundations, accessibility evidence structure, and documentation quality. Component count should not scale until registry, validation, evidence, update, and security mechanics work.

## Development Setup

Prerequisites:

- Node.js 24 LTS. Current baseline: 24.15.0.
- pnpm 10.
- Git.

Commands:

```bash
pnpm install
pnpm build
pnpm typecheck
pnpm test
pnpm lint
```

## Contribution Standards

All code changes should include appropriate tests. Changes to components must consider:

- semantic HTML contract;
- keyboard behavior;
- accessible names and descriptions;
- forced-colors behavior;
- token usage;
- evidence packet impact;
- generated validation rules;
- update and migration impact.

Stable components require evidence packets. Experimental components may ship with incomplete evidence, but must be clearly marked `experimental`.

## Pull Requests

Before opening a PR:

- run the local checks;
- update docs when behavior changes;
- add or update tests;
- add a changeset for publishable package changes once packages are public;
- avoid implying official USWDS, GSA, NDS, or federal endorsement.

## Component Proposals

Component proposals should include:

- user need and problem statement;
- scan of existing USWDS and peer-government approaches;
- DOM/API sketch;
- token impact;
- accessibility plan;
- evidence plan;
- migration/update considerations.

The lifecycle is documented in [docs/governance/00-governance-model.md](docs/governance/00-governance-model.md).
