# Strategy

Atrium is a government-first design-system infrastructure project. It is not a visual reskin of USWDS, a React component library, or a Tailwind theme. It is a modern delivery layer for public-service interfaces: source-owned components, evidence-backed accessibility, signed distribution, agency theming, polyglot validation, and AI-readable contracts.

## The case

Federal digital teams need a design system that is easier to adopt, easier to verify, and easier to keep current than the current USWDS implementation model. USWDS remains important and should be treated respectfully: it established shared public-service values, accessibility discipline, common components, and a civic language for federal digital services.

The opportunity is that the delivery environment changed:

- The 2026 web platform can handle much of what older design systems used JavaScript and Sass for.
- AI coding agents need structured component contracts, not only prose docs.
- Agencies need supply-chain provenance, CI evidence, and accessibility reporting they can defend.
- Government stacks are fragmented across React, Drupal/Twig, WordPress, Rails, Django, static HTML, and other systems.
- Prominent federal design work is showing appetite for more modern, product-like interfaces.

Atrium should make the strongest possible technical case to GSA, NDS, and agency teams: preserve USWDS values, modernize the delivery model.

## Positioning

Public positioning:

> Atrium is an evidence-backed, AI-native component registry for public-service interfaces. It helps teams build accessible, secure, themeable government experiences across frameworks and CMSs without forking a design system or depending on a heavy runtime.

What we should say:

- Atrium is informed by USWDS, not affiliated with it.
- Atrium is compatible with federal website standards and can provide USWDS migration aids.
- Atrium targets WCAG 2.2 AA engineering quality while recognizing that Section 508 currently incorporates WCAG 2.0 AA and ADA Title II uses WCAG 2.1 AA for state and local government.
- Atrium provides component-level evidence; it does not claim to make an application compliant by itself.
- Atrium is built for agencies, contractors, civic-tech teams, and regulated industries.

What we should avoid saying:

- "USWDS is dead."
- "Atrium makes you 508 compliant."
- "Atrium is official."
- "Atrium is the next USWDS."
- "Tailwind/shadcn/Web Components solve government UI by themselves."

## Why agencies would care

### Accessibility traceability

Every stable component ships an evidence packet: WCAG mapping, axe results, keyboard transcripts, manual screen-reader records, known limitations, and anti-pattern rules. This gives accessibility teams and auditors concrete material to inspect.

### Security and provenance

Capsules are signed, content-addressed, and tracked in a lockfile. Agencies can verify exactly what was installed, whether it changed locally, and whether it came from a trusted registry.

### CI-ready validation

`atrium audit` runs framework-agnostic rules across TSX, JSX, Vue, Svelte, Astro, HTML, Twig, Jinja, ERB, and Nunjucks. It can emit SARIF so agency findings show up in GitHub Advanced Security, GitLab, Azure DevOps, or other scanning dashboards.

### Cross-stack reach

Atrium's L0 components are semantic HTML and CSS. They work in CMSs and server-rendered stacks without React. L1 components use Web Components only where behavior requires JavaScript, with framework adapters generated from the same manifest.

### AI-native correctness

The extended Custom Elements Manifest is the source of truth for variants, slots, events, tokens, accessibility requirements, anti-patterns, and examples. MCP tools expose search, validation, migration, and evidence to coding agents.

### Safer source ownership

Teams get source code, like shadcn. Unlike shadcn, Atrium tracks provenance and supports updates through hashes, lockfiles, three-way merges, and codemods.

## The wedge

The first adoption wedge should not be "replace every USWDS component." That is too broad and too easy to dismiss.

The wedge should be:

1. Prove a modern federal form workflow with better accessibility evidence and smaller bundles.
2. Prove USWDS banner/identifier compatibility and migration mapping.
3. Prove CI validation that catches real Section 508 and Federal Website Standards problems.
4. Prove AI agents generate correct component usage when grounded by Atrium manifests.
5. Prove source updates can be safely merged after agency customization.

If these work, the conversation becomes practical: Atrium is not asking agencies to trust a new visual language first. It is giving them better infrastructure.

## Initial audience

Primary:

- GSA / TTS / USWDS-adjacent stakeholders.
- National Design Studio and America by Design teams.
- Federal agency digital service teams.
- Federal contractors building public-facing services.

Secondary:

- State and local government teams responding to ADA Title II accessibility pressure.
- Civic-tech nonprofits.
- Healthcare, finance, education, and other regulated teams that need evidence and provenance.

## What must be true before public GitHub launch

- The repository clearly says Atrium is not official USWDS or GSA work.
- License is finalized, preferably Apache-2.0.
- Public roadmap is concrete enough for contributors to understand priorities.
- Contribution model explains evidence gates, not just code style.
- Security policy exists before the first public package.
- The first demo shows a useful government workflow, not a component gallery.
- The first CLI milestone focuses on `init`, `add`, `audit`, `verify`, and `evidence`.

## Sources

- [America by Design executive order](https://www.whitehouse.gov/presidential-actions/2025/08/improving-our-nation-through-better-design/)
- [White House fact sheet on America by Design](https://www.whitehouse.gov/fact-sheets/2025/08/fact-sheet-president-donald-j-trump-improves-our-nation-through-better-design/)
- [Federal Website Standards](https://standards.digital.gov/standards/)
- [USWDS 3.13.0 release](https://github.com/uswds/uswds/releases)
- [Section508.gov guidance on USWDS](https://www.section508.gov/develop/accessible-design-using-uswds/)
- [ICT Testing Baseline Alignment Framework](https://baselinealignment.section508.gov/)
- [DTCG 2025.10 stable announcement](https://www.w3.org/community/design-tokens/2025/10/28/design-tokens-specification-reaches-first-stable-version/)
