# Ashlar Docs App

Next.js and Fumadocs documentation app for Ashlar adoption.

```bash
pnpm --filter @blen/ashlar-docs dev
pnpm --filter @blen/ashlar-docs build
pnpm --filter @blen/ashlar-docs typecheck
```

Content lives in `content/docs` as source-owned MDX. The app uses Fumadocs for
navigation, docs layout, MDX rendering, copyable code blocks, and search wiring.
