# Ashlar Docs App

Static first-run documentation app for Ashlar adoption.

```bash
pnpm --filter @ashlar/docs dev
pnpm --filter @ashlar/docs build
```

The app is intentionally custom Vite rather than a full docs framework for this
first slice. It is a low-footprint public docs boundary with a typed content
model and a registry-derived component index.
