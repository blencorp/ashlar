# 02 — Industry landscape: what modern UI systems are converging toward

## Summary

The front-end design-system landscape has moved away from monolithic installed component packages as the only model. Current practice is converging around:

- source-code distribution;
- headless primitives;
- tokens as cross-platform data;
- CSS custom properties;
- utility-compatible styling;
- framework-specific ergonomics;
- machine-readable registries;
- AI-assisted code generation and modification;
- stronger accessibility primitives;
- cross-framework future paths through state machines and Web Components.

Atrium should not copy one project. It should synthesize the strongest ideas into a government-grade model.

## shadcn/ui: the pivotal model shift

The key idea in shadcn/ui is not the visual style. It is the distribution model. The docs explicitly describe it as “not a component library” but a code distribution platform. Its principles include open code, composition, distribution, beautiful defaults, and AI readiness.

That changes the ownership model:

- The team gets actual source code.
- Components are customizable without fighting package internals.
- AI tools can inspect the code directly.
- The registry can distribute components, blocks, themes, hooks, libraries, and styles.
- Teams can add only what they need.

For Atrium, this is the most important pattern to learn from.

### What shadcn/ui gets right

- **Source ownership:** teams can edit components rather than override opaque packages.
- **Composability:** components are generally small and built from primitives.
- **Registry extensibility:** registry items can include files, dependencies, CSS variables, blocks, fonts, styles, and config.
- **AI compatibility:** because the code is local, AI tools can reason about the exact implementation.
- **Tasteful defaults:** strong defaults reduce blank-canvas friction.

### What shadcn/ui does not solve for government by itself

- **Update drift:** copied source becomes local code; version updates need clear diffing and codemods.
- **Accessibility evidence:** primitives can be accessible, but local modifications can break behavior.
- **Governance:** a registry can distribute almost anything unless there is maturity review.
- **Policy traceability:** government teams need mapping to 508, WCAG, M-23-22, and official website requirements.
- **Agency theming consistency:** without a strict token contract, agency themes can fragment.
- **Procurement trust:** teams may need a vetted baseline, security review, and support model.

Atrium should adopt open-code distribution but add a stricter trust layer.

## Design Tokens Community Group: token standardization

The W3C Design Tokens Community Group published stable reports for token format, color, and resolver modules. The Design Tokens site describes the format as vendor-neutral and production-ready, supporting themes, multi-brand systems, modern color spaces such as Display P3 and OKLCH, aliases, relationships, and cross-platform consistency.

This is directly relevant. USWDS has meaningful tokens, but a successor should store tokens in a standardized, portable format and emit platform-specific outputs. That gives government agencies a way to theme websites, mobile apps, design tools, and future platforms from one contract.

## Tailwind CSS v4: CSS-first tokens and utility surface

Tailwind v4 introduced CSS-first configuration through CSS rather than requiring a `tailwind.config.js` file. Its theme variables are CSS custom properties defined with `@theme`, and those variables drive utility classes.

For Atrium, Tailwind should be treated as an output surface, not the whole design system. The token source should remain DTCG JSON. Outputs can include CSS variables, Tailwind v4 `@theme` variables, typed TypeScript token maps, Figma variables, and optional Sass maps for backwards compatibility.

This avoids forcing Tailwind while still meeting the current market where many modern teams are using it.

## Radix UI: unstyled React primitives

Radix provides unstyled, accessible React primitives. It is useful when teams want low-level behavior with full styling control. Radix is especially strong for common overlay and interaction primitives such as Dialog, Popover, Dropdown Menu, Tooltip, Tabs, Accordion, and Radio Group.

Radix’s accessibility docs emphasize ARIA practices, labels, keyboard interactions, and focus management. That is valuable, but government-grade components still need additional evidence and policy mapping.

## React Aria: accessibility and internationalization depth

React Aria is a strong candidate for complex, accessibility-sensitive and internationalization-heavy components. The docs emphasize style-free components and hooks, customizable states/slots/render props, and built-in internationalization across languages, date/number formatting, calendar systems, numbering systems, and right-to-left support.

This matters for government services because agencies serve multilingual, assistive-technology, and complex-form contexts. Date inputs, combo boxes, select/listbox patterns, calendar widgets, tables/grids, menus, and overlays are difficult to implement correctly. React Aria should be seriously considered for these.

## Ark UI and Zag: cross-framework state machines

Ark UI provides headless accessible components for React, Solid, Vue, and Svelte, built on Zag.js finite state machines. This model is strategically interesting because government design systems need to support varied agency stacks.

A state-machine core could reduce duplication across frameworks. The tradeoff is that adopting Ark/Zag deeply may impose its own API model and community size constraints. For the first MVP, React-first is safer; Ark/Zag should be evaluated for framework parity after the registry and token model are proven.

## Headless UI: Tailwind-aligned unstyled components

Headless UI provides unstyled accessible components for React and Vue and integrates naturally with Tailwind. It is useful but less strategically central for Atrium than React Aria, Radix, or Ark because it is tied to a narrower set of components and often to Tailwind-oriented workflows.

## Lit and Web Components: framework independence

Lit positions itself as a lightweight library for building native Web Components. Lit components work in plain HTML, frameworks, CMSs, and static sites. Lit is small and useful for shareable design-system components across stacks.

For Atrium, Web Components are attractive because government agencies have a wide range of tech stacks. But a full Web Component suite has risks:

- framework integration can be uneven;
- server rendering and hydration models vary;
- forms and validation can be tricky;
- styling through Shadow DOM can conflict with token/theming needs;
- some teams prefer framework-native components.

Recommended approach: use Web Components first for official government shell elements and no-framework contexts. Keep the main MVP React source registry.

## Open UI: future alignment with the platform

Open UI is a W3C community effort focused on understanding and standardizing controls, states, behaviors, accessibility, and extensibility so design systems can align better with web platform primitives.

This should inform Atrium’s long-term research. A public design system should not reinvent controls forever. It should track Open UI and prefer platform-native improvements where possible.

## Model Context Protocol and AI-native tooling

AI-native design systems need more than markdown docs. The Model Context Protocol is an open standard for connecting AI applications to external data and tools. A design system can expose component docs, registry items, token schemas, examples, and audit tools as MCP resources/tools.

That said, MCP introduces security and trust concerns. Any future MCP server for Atrium should be read-only by default, avoid arbitrary code execution, sign manifests, and clearly separate advisory output from automated project changes.

## Strategic takeaway

Atrium should be:

- shadcn-inspired in distribution;
- DTCG-native in tokens;
- Tailwind-compatible but not Tailwind-dependent;
- React-first but cross-framework-aware;
- primitive-backed for difficult interactions;
- Web Component-aware for official government shell elements;
- Open UI-aware for future standards;
- AI-readable by design;
- much stricter than private-sector libraries about accessibility evidence and governance.

## References

- shadcn/ui docs: https://ui.shadcn.com/docs
- shadcn registry docs: https://ui.shadcn.com/docs/registry/registry-item-json
- shadcn/ui GitHub: https://github.com/shadcn-ui/ui
- Design Tokens Community Group: https://www.designtokens.org/
- DTCG format module: https://www.designtokens.org/TR/format/
- Tailwind CSS v4 announcement: https://tailwindcss.com/blog/tailwindcss-v4
- Tailwind theme variables: https://tailwindcss.com/docs/theme
- Radix Primitives: https://www.radix-ui.com/primitives
- Radix accessibility: https://www.radix-ui.com/primitives/docs/overview/accessibility
- React Aria: https://react-spectrum.adobe.com/react-aria/index.html
- React Spectrum repository: https://github.com/adobe/react-spectrum
- Ark UI: https://ark-ui.com/
- Ark UI about: https://ark-ui.com/docs/overview/about
- Ark UI GitHub: https://github.com/chakra-ui/ark
- Headless UI: https://headlessui.com/
- Lit: https://lit.dev/
- Lit components: https://lit.dev/docs/components/overview/
- MDN custom elements: https://developer.mozilla.org/en-US/docs/Web/API/Web_components/Using_custom_elements
- Open UI: https://open-ui.org/
- W3C Open UI Community Group: https://www.w3.org/community/open-ui/
- Model Context Protocol specification: https://modelcontextprotocol.io/specification/2025-11-25
- MCP announcement: https://www.anthropic.com/news/model-context-protocol
