# Ashlar Examples

These examples prove the source-capsule flow across the stacks government teams actually use. Each runnable app installs Ashlar capsules as source, imports the generated `src/ashlar/ashlar.css` entrypoint, and implements the same benefits-operations case board so framework differences are easy to compare.

| Path | Stack | Primary proof |
| --- | --- | --- |
| [`plain-html`](./plain-html/) | Static HTML | Existing no-build federal page shell audit. |
| [`vanilla`](./vanilla/) | Vanilla TypeScript + Vite | Case-board app with no framework adapter. |
| [`react-spa`](./react-spa/) | React SPA + Vite | TSX case-board source usage plus rendered audit fixture. |
| [`nextjs`](./nextjs/) | Next.js App Router | Metadata/layout integration plus rendered audit fixture. |
| [`svelte`](./svelte/) | Svelte + Vite | Svelte case-board app consuming generated Ashlar CSS. |
| [`vue`](./vue/) | Vue + Vite | Vue case-board app consuming generated Ashlar CSS. |
| [`vite`](./vite/) | Vite + Tailwind v4 | Theme workbench and Tailwind `@theme` proof. |

Run all framework examples through the workspace checks:

```bash
pnpm check
pnpm build
```

Vue and Svelte currently use rendered HTML audit fixtures because Ashlar's first-party component validator targets HTML, TSX, JSX, and CSS today. The language matrix is intentionally honest: Vue and Svelte grammar registration is tracked as opt-in validator work rather than silently claiming source scanning that does not exist yet.
