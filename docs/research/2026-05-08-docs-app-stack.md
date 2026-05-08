# Docs App Stack Research

## Decision

Use a source-owned Next.js App Router docs app with Fumadocs MDX and Fumadocs UI.
This replaces the custom Vite docs renderer in `apps/docs`.

## Why

- shadcn's current `apps/v4` docs app uses Next.js with the Fumadocs package
  family, including `fumadocs-core`, `fumadocs-mdx`, and `fumadocs-ui`.
- Fumadocs official docs describe the Next integration through `createMDX` in
  `next.config`, source-owned docs in `source.config.ts`, `collections/server`,
  `DocsLayout`, `DocsPage`, and default MDX components for code blocks, callouts,
  cards, and headings.
- This keeps Ashlar close to the DX users already expect from shadcn while giving
  us enough room for registry-generated pages, public proof gates, agency-theme
  research notes, and copyable CLI commands.

## Alternatives

- Nextra: good Next + MDX documentation framework, but it is not what shadcn is
  currently using.
- Starlight: strong Astro docs framework, but it would add a second app platform
  while this repo already ships Next examples and has Next/React in the catalog.
- Hosted docs products: too much product dependency for a source-capsule registry
  that needs checked-in operational docs.

## Sources

- https://github.com/shadcn-ui/ui/blob/main/apps/v4/package.json
- https://github.com/fuma-nama/fumadocs/blob/dev/apps/docs/content/docs/mdx/(integrations)/next.mdx
- https://github.com/fuma-nama/fumadocs/blob/dev/apps/docs/content/docs/(framework)/manual-installation/next.mdx
- https://www.fumadocs.dev/docs
