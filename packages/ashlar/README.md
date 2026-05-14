# @blen/ashlar

Public CLI entrypoint for Ashlar.

Ashlar is source-owned, evidence-backed UI infrastructure for public-service
teams. It installs semantic component capsules into your app, audits federal web
rules, verifies local provenance, and keeps agency theme tokens in plain CSS.

This package is the public `npx` / `pnpm dlx` / `bunx` entrypoint. It delegates
to `@blen/ashlar-cli` and keeps the executable name as `ashlar`.

```bash
# npm
npx @blen/ashlar@latest init
npx @blen/ashlar@latest add button alert text-input
npx @blen/ashlar@latest verify

# pnpm
pnpm dlx @blen/ashlar@latest init

# bun
bunx @blen/ashlar@latest init
```

Common checks:

```bash
npx @blen/ashlar@latest status
npx @blen/ashlar@latest search button
npx @blen/ashlar@latest audit --policy federal --explain ./public/index.html
npx @blen/ashlar@latest theme sync
```

Ashlar is a v0.0 prototype. It is independent open-source research and is not
affiliated with, endorsed by, or sponsored by GSA, USWDS, NDS, or the U.S.
federal government.

Docs and source: https://github.com/blencorp/ashlar

Built with love by the good people at BLEN: https://blencorp.com
