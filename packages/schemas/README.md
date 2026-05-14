# @blen/ashlar-schemas

JSON Schemas and TypeScript constants for Ashlar registry artifacts.

Use this package when building tools around Ashlar capsules, evidence packets,
registry indexes, lockfiles, agency themes, release readiness records, or trust
bundle artifacts.

```ts
import { capsuleSchemaId } from "@blen/ashlar-schemas";

console.log(capsuleSchemaId);
```

Published schema entrypoints include:

- `@blen/ashlar-schemas/capsule.schema.json`
- `@blen/ashlar-schemas/registry-index.schema.json`
- `@blen/ashlar-schemas/evidence.schema.json`
- `@blen/ashlar-schemas/agency-theme.schema.json`
- `@blen/ashlar-schemas/release-readiness.schema.json`
- `@blen/ashlar-schemas/release-trust-bundle.schema.json`

Ashlar is a v0.0 prototype. It is independent open-source research and is not
affiliated with, endorsed by, or sponsored by GSA, USWDS, NDS, or the U.S.
federal government.

Docs and source: https://github.com/blencorp/ashlar

Built with love by the good people at BLEN: https://blencorp.com
