# Strategy

Ashlar is open-source supply-chain and validation infrastructure for federal-standards web interfaces.

It does three things federal teams cannot get from a component library alone:

- **Audit**. `ashlar audit` enforces Federal Web Standards, USWDS conventions, and component-level accessibility rules in CI, emitting SARIF that lands in GitHub Code Scanning, GitLab, and Azure DevOps. It runs against existing markup — TSX, JSX, plain HTML, ERB, and other languages where ast-grep has real coverage — without requiring agencies to install a new component library first.
- **Sign and verify**. Components ship as content-addressed *capsules* with cryptographically-verifiable releases. A lockfile records hashes; `ashlar verify` re-hashes installed files, validates the current local registry signatures, and can run trust-root-required Sigstore bundle verification with `cosign verify-blob`. Air-gapped agencies can mirror the registry with explicit trust material.
- **Update safely**. Capsules install as source code (shadcn-style ownership) but track provenance through a lockfile and three-way merge. Local customizations survive upstream updates; codemods carry breaking changes; accessibility-critical files force confirmation on update.

The accessibility evidence schema (axe + keyboard + manual screen-reader + WCAG mapping + ICT Baseline alignment) and the AI contract (extended Custom Elements Manifest, MCP server, AGENTS.md) are how each of those three verbs gets grounded — not separate pillars.

## What's true today vs. planned

This repository is in v0.0 prototype. See [STATUS.md](STATUS.md) for the live list of what is implemented, experimental, and planned. Headline claims that are not yet code or not yet publicly proven (real public capsule Sigstore bundles, npm provenance, hosted/write MCP, ast-grep validation across all languages eventually targeted, full DTCG token compiler) are explicitly marked. The strategy below describes where Ashlar is heading, with implementation status linked from each section.

## The case

Federal digital teams need a delivery model that is easier to verify, easier to keep current, and easier to integrate across the framework fragmentation that exists across federal stacks (React, Drupal/Twig, WordPress, Rails, Django, plain HTML, custom CMSs).

USWDS gave federal teams a shared civic design language: accessible, consistent, trustworthy, plain-language public services. Those values remain correct. The opportunity is the layer beneath them:

- The 2026 web platform delivers natively what older design systems shipped JavaScript for (`<dialog>`, popover, anchor positioning, `light-dark()`, cascade layers, `:has()`, `@scope`).
- Federal stacks need polyglot validation, not framework-specific linting.
- Agencies need supply-chain provenance, signed releases, and air-gapped operation that USWDS's npm-and-Sass model does not address.
- AI coding agents need executable component contracts, not prose docs they paraphrase incorrectly.
- The 21st Century IDEA Act and the August 2025 *America by Design* executive order both demand modernization of public-service interfaces; the Chief Design Officer's office needs a substrate it can cite without building.

Ashlar fills the layer beneath the components: the verifier, the signer, the updater, the contract.

## Public posture

- Ashlar is **informed by** USWDS — civic principles, accessibility discipline, plain-language guidance.
- Ashlar is **not affiliated** with USWDS, GSA, the U.S. federal government, or the National Design Studio.
- Ashlar is designed to **interoperate with USWDS**: USWDS markup passes Ashlar's federal policy audit; USWDS components can ship as Ashlar capsules; Ashlar's banner and identifier checks accept `<usa-banner>` and `usa-identifier` class tokens by default.
- Ashlar **engineers to WCAG 2.2 AA** while documenting the legal baselines clearly: Section 508 currently incorporates WCAG 2.0 AA; ADA Title II references 2.1 AA (compliance dates April 26, 2027 for 50,000+ population governments and April 26, 2028 for smaller); the European Accessibility Act references 2.1 AA via EN 301 549.
- Ashlar provides **component-level evidence**; it does not claim to make an application compliant by itself.
- Ashlar is built for federal teams as the center of gravity, with an audience that extends to state and local government (ADA Title II), regulated industries, and civic-tech organizations.

What Ashlar should never say:

- "USWDS is dead." It is not, and that framing burns the relationship Ashlar needs.
- "Ashlar makes you 508 compliant." It does not. Compliance is an application-level claim about a deployed system.
- "Ashlar is official." It is not.
- "Ashlar is the next USWDS." It is the substrate USWDS could run on.

## The three audiences

**Federal procurement and security review.** What they want to find: signed releases, content-addressed source, lockfile-tracked installation, SBOM, npm provenance, hardware-key signing posture, incident-response playbook, no problematic transitive dependencies, no telemetry. The reviewer's first question is not "does it work" — it is "can I defend this in a review board." The validator wedge (`ashlar audit` running on existing markup, no install) is the lowest-friction entry: a CI step is easier to land than a runtime dependency.

**Federal designers and the Chief Design Officer's office.** What they want: modernization that respects the civic values USWDS established. Plain language, progressive enhancement, accessibility evidence they can cite to auditors, agency theming that does not require forking. Ashlar's posture toward this audience is interop-first; the CDO's office should see Ashlar as a substrate they can recommend without conflict with USWDS or NDS work.

**Federal contractors.** What they want: ship sooner with fewer security-review fights. Delete custom React wrappers around USWDS Sass. Have CI catch banner/identifier/required-link issues before customers do. Be able to update components after customization without re-forking. Use AI coding tools that do not hallucinate USWDS component APIs.

Secondary audiences: state and local government (ADA Title II is forcing the conversation), civic-tech organizations, regulated industries (healthcare, finance, education), GovTech vendors building federal software.

## The wedge

The first adoption move is **validator-only**: `ashlar audit` running in CI against an agency's existing markup, with no Ashlar components installed, no runtime dependency added, just a single binary or `npx` step that emits SARIF. That sneaks past the procurement seam where new dependencies stall. It works on USWDS-rendered HTML, on raw Drupal Twig output, on plain HTML, on TSX. It demonstrates value before it asks for anything.

Once the validator is trusted, registry adoption becomes a consideration:

1. Validator-only adoption (no install, no runtime). `ashlar audit` in CI for federal-standards and component-level checks.
2. USWDS interop: agencies running USWDS install Ashlar capsules of USWDS components, getting source ownership + signed updates without changing their visual system.
3. Ashlar-original components: agencies adopt Ashlar components for new flows, with Ashlar's evidence packets and AI grounding, while keeping USWDS where it works.
4. Modernization migrations: codemods move React-USWDS wrappers and stale Sass to Ashlar capsules; updates happen safely.
5. AI-grounded development: coding agents use Ashlar's MCP server to validate generated code against extended CEM, refusing to ship code that fails component anti-pattern rules.

Wedge step 1 is the smallest credible artifact and the right v0.0 deliverable. Steps 2-5 are post-v0.0.

## Why agencies should care (when these are real)

### Federal-standards CI enforcement

Federal Website Standards (standards.digital.gov) currently lists the federal banner, HTML page title, and meta description as *pending* standards; contact pages as *draft*; site search and content timeliness as *research*. Ashlar's federal policy pack tracks each standard's status (pending, draft, research, required, guidance) and emits findings with that status visible in `--explain` and SARIF output. As pending standards become required, the same audit promotes warnings to errors with no rule rewrite. Identifier, accessibility statement, and privacy statement live in USWDS guidance and M-23-22 (not on standards.digital.gov); Ashlar's policy packs separate "Federal Web Standards" from "Federal trust-marker conventions" so the audit's claims map cleanly to source authority.

### Section 508 evidence chain

Every stable component ships an evidence packet: axe results, keyboard transcripts, manual screen-reader records (NVDA + VoiceOver minimum for stable, plus JAWS for LTS), WCAG criterion mappings, and explicit alignment to the Section 508 ICT Testing Baseline. Auditors get queryable evidence; agency 508 coordinators get something to point at; AI tools have something concrete to ground claims in. None of this replaces an application-level Section 508 review — it makes that review materially cheaper.

### Supply-chain provenance

The target distribution model is content-addressed capsules (SHA-256), signed with Sigstore (cosign sign-blob), tracked in a lockfile with original and current hashes, distributed via HTTP/CDN with signed Git mirrors as the air-gapped fallback. The prototype already verifies local registry signatures, declared Sigstore bundle metadata, and trust-root-required `cosign verify-blob`; real public bundle publication remains a release blocker. The npm path uses npm trusted publishing for provenance attestations. Federal mirrors operate offline by bundling a verification trust root. The supply-chain incident playbook (what happens when the Ashlar npm package or signing identity is compromised) is part of the security model, not an afterthought.

### Polyglot, framework-agnostic linting

ast-grep with tree-sitter grammars validates the same component-usage rule across the languages where ast-grep has real coverage today (TSX, JSX, HTML, CSS, ERB). Vue, Svelte, and Astro are supported via custom-language registration with third-party grammars. Twig, Jinja, and Nunjucks ship when maintained tree-sitter grammars exist; until then, the validator fails honestly rather than pretending. ESLint cannot validate any non-JS template language uniformly; that is the structural advantage Ashlar holds, scoped to what actually works.

### Cross-stack reach via L0 semantic markup

L0 capsules ship semantic HTML and CSS — `<button class="ashlar-button" data-variant="primary">`, not `<ashlar-button>`. The same DOM contract works in React, Vue, Astro, plain HTML, Drupal, Sitecore, Rails, Django, and other server-rendered stacks. L1 components (the ~30% that genuinely need state machines) ship as custom elements; L4 templates (Nunjucks, Twig, Jinja, ERB) emit the same markup the custom element would emit, so non-JS environments get markup that looks right and behaves passively until JavaScript loads.

### AI-grounded development

Extended Custom Elements Manifest is the structured contract — variants, anti-patterns, accessibility requirements, token consumption, platform features, policy mappings. Coding agents validate against the same contract humans consume. Ashlar's MCP server exposes search, evidence retrieval, validation, and migration as tools that agents call directly. The AI claim is durable to the extent that the underlying contracts (CEM, evidence, codemods) are real and executable; "AI-native" alone is parity by ship date.

## Federal Web Standards and the America by Design timeline

The August 2025 *America by Design* executive order requires initial results by July 4, 2026 — roughly two months from the date of this strategy. The Chief Design Officer's office is actively shaping engagements. Ashlar's posture toward that timeline is to ship a credible piece (working `audit` against USWDS markup, signed registry, one fully-evidenced component, MCP read-only server) before the deliverable cycle, not after, and to bring it to NDS conversations as a substrate they can cite without building.

## What must be true before public GitHub launch

- The repository clearly says Ashlar is independent of USWDS / GSA / federal government.
- License is finalized as Apache-2.0 (explicit patent grant for federal procurement).
- STATUS.md is the truthful index of "what is implemented, what is experimental, what is planned" and every doc claim links there.
- Public roadmap is staged as a slice graph (see [roadmap/00-roadmap.md](roadmap/00-roadmap.md)), not a calendar wish list.
- Contribution model explains evidence gates and review rhythm, not just code style.
- Security policy exists with a documented incident-response posture before the first public capsule release.
- The first demo is a credible federal workflow (form flow with audit + evidence + signed install), not a component gallery.
- The current v0.0 CLI surface includes `init`, `add`, `audit`, `verify`, `update`, `evidence`, `search`, `suggest`, `view`, `design sync`, `theme sync`, `theme validate`, `mcp`, `ai-eval`, `bundle budget`, `registry mirror`, and release-readiness tooling.
- At least one external maintainer is publicly named before the repo flips to public, addressing R3's bus-factor kill criterion.

## On absorption

The most likely failure mode for an independent civic-tech project is not GSA hostility — it is GSA absorption. If the registry, evidence schema, or MCP work proves useful, NDS or a future USWDS modernization may want to upstream it. Ashlar's posture: contribute upstream in good faith where the work fits USWDS's mandate; retain the verification, signing, and AI-contract substrate as Ashlar-specific so the independent project survives the absorption of any single component contribution. A foundation home (Linux Foundation Public Health, OpenJS, Sloan civic-tech, or an equivalent neutral host) is the structural protection. See [governance](governance/00-governance-model.md) for the model.

## Sources

- [America by Design executive order](https://www.whitehouse.gov/presidential-actions/2025/08/improving-our-nation-through-better-design/)
- [Federal Web Standards](https://standards.digital.gov/standards/)
- [Section 508 applicability](https://www.section508.gov/develop/applicability-conformance/)
- [Section 508 ICT Testing Baseline](https://baselinealignment.section508.gov/)
- [ADA Title II web/mobile rule](https://www.ada.gov/resources/2024-03-08-web-rule/)
- [USWDS 3.13.0 release](https://github.com/uswds/uswds/releases/tag/v3.13.0)
- [WCAG 2.2](https://www.w3.org/TR/WCAG22/)
- [DTCG 2025.10 Format Module — Community Group Final Report](https://www.w3.org/community/reports/design-tokens/CG-FINAL-format-20251028/)
- [npm trusted publishing](https://docs.npmjs.com/trusted-publishers/)
- [Sigstore documentation](https://docs.sigstore.dev/)
- [MCP specification](https://modelcontextprotocol.io/specification/2025-11-25)
- [AGENTS.md (Linux Foundation Agentic AI Foundation)](https://agents.md/)
