# @blen/ashlar-cli

CLI implementation package for Ashlar.

Most users should run the public entrypoint instead:

```bash
npx @blen/ashlar@latest init
pnpm dlx @blen/ashlar@latest init
bunx @blen/ashlar@latest init
```

This package owns the `ashlar` executable implementation used by
`@blen/ashlar`. It includes the built-in source capsule registry, agency theme
tokens, federal audit rules, provenance checks, release-readiness checks,
AI-readable component contracts, and the read-only MCP server.

Useful commands:

```bash
ashlar init
ashlar add button --dry-run --diff
ashlar verify
ashlar audit --policy federal --explain ./public/index.html
ashlar theme sync
ashlar suggest "Build a benefits application form"
ashlar mcp
```

Ashlar is a v0.0 prototype. It is independent open-source research and is not
affiliated with, endorsed by, or sponsored by GSA, USWDS, NDS, or the U.S.
federal government.

Docs and source: https://github.com/blencorp/ashlar

Built with love by the good people at BLEN: https://blencorp.com
