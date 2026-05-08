# @blen/ashlar-cli

## 0.3.15

### Patch Changes

- [#129](https://github.com/blencorp/ashlar/pull/129) [`4f00eea`](https://github.com/blencorp/ashlar/commit/4f00eeab37ba4688241eb3d13f731749da729119) Thanks [@naodya](https://github.com/naodya)! - Reject incomplete manual transcript worksheets during `ashlar evidence transcript-validate` so stable-evidence reviewer handoffs cannot treat schema-valid placeholders as completed accessibility evidence.

- [#131](https://github.com/blencorp/ashlar/pull/131) [`7f14c6e`](https://github.com/blencorp/ashlar/commit/7f14c6e5871ba6be3c17bf559dd3e6655084f962) Thanks [@naodya](https://github.com/naodya)! - Remove internal tier labels from normal CLI discovery, preview, metadata, and evidence-report output so users see product families, stability, and evidence state instead.

## 0.3.14

### Patch Changes

- [#123](https://github.com/blencorp/ashlar/pull/123) [`bd393b9`](https://github.com/blencorp/ashlar/commit/bd393b91e185604ee2b9eb3b7eb12b23cc08b312) Thanks [@naodya](https://github.com/naodya)! - Use the repository-local `pnpm ashlar` command path across release-trust and design-partner review handoff templates and generated reviewer checklists.

## 0.3.13

### Patch Changes

- [#121](https://github.com/blencorp/ashlar/pull/121) [`7114e74`](https://github.com/blencorp/ashlar/commit/7114e743957e906e4ee0cff239b0a6a783b121ad) Thanks [@naodya](https://github.com/naodya)! - Use the repository-local `pnpm ashlar` command path in generated release proof plans and stable-evidence review handoff templates, with the current `finalize-stable` stable evidence flow.

## 0.3.12

### Patch Changes

- [#119](https://github.com/blencorp/ashlar/pull/119) [`2a8cdd1`](https://github.com/blencorp/ashlar/commit/2a8cdd1fbbef654c5a33ab37d97a7d0b64da6a98) Thanks [@naodya](https://github.com/naodya)! - Make generated stable-evidence review bundles use the repository-local `pnpm ashlar` command path while documenting the published `ashlar` and `npx @blen/ashlar` alternatives for external reviewers.

## 0.3.11

### Patch Changes

- [#113](https://github.com/blencorp/ashlar/pull/113) [`8b27dda`](https://github.com/blencorp/ashlar/commit/8b27ddaa613822eb99a379907ca3212f3d9d7499) Thanks [@naodya](https://github.com/naodya)! - Include the guarded GitHub Packages mirror workflow in the release proof plan so operators do not miss the authenticated `@blen` package mirror step.

## 0.3.10

### Patch Changes

- [#111](https://github.com/blencorp/ashlar/pull/111) [`ea37c2a`](https://github.com/blencorp/ashlar/commit/ea37c2a2f39fdc41030abc5cc1db76b4f32fd1ca) Thanks [@naodya](https://github.com/naodya)! - Fix the release proof-plan workflow commands so npm publishing and Sigstore signing include the required manual confirmation inputs.

## 0.3.9

### Patch Changes

- [#100](https://github.com/blencorp/ashlar/pull/100) [`62daf57`](https://github.com/blencorp/ashlar/commit/62daf57e281a79a22e4d112349220cb2393b1813) Thanks [@naodya](https://github.com/naodya)! - Add a GitHub Packages mirror readiness check that verifies BLEN-scoped package names, workflow registry/auth configuration, and the npmjs-first distribution split before publishing.

## 0.3.8

### Patch Changes

- [#98](https://github.com/blencorp/ashlar/pull/98) [`f59d23b`](https://github.com/blencorp/ashlar/commit/f59d23b9d530187a063172ec247a2f9924329355) Thanks [@naodya](https://github.com/naodya)! - Prefer public capsule family language in CLI output, help text, and MCP search filters while keeping the legacy `--layer` search alias working for existing scripts.

## 0.3.7

### Patch Changes

- [#93](https://github.com/blencorp/ashlar/pull/93) [`33e37bb`](https://github.com/blencorp/ashlar/commit/33e37bb04650d4d034719685438c0c22ee9116ac) Thanks [@naodya](https://github.com/naodya)! - Require the npm trusted-publishing workflow to be restricted to `main` during release provenance preflight.

## 0.3.6

### Patch Changes

- [#89](https://github.com/blencorp/ashlar/pull/89) [`e285840`](https://github.com/blencorp/ashlar/commit/e2858405ffa199d55a16c7fb12e2481262d7fa94) Thanks [@naodya](https://github.com/naodya)! - Replace public internal labels with human-readable family slugs across CLI output,
  schemas, registry metadata, generated examples, and release-readiness gates.
- Updated dependencies [[`e285840`](https://github.com/blencorp/ashlar/commit/e2858405ffa199d55a16c7fb12e2481262d7fa94)]:
  - @blen/ashlar-schemas@0.1.5

## 0.3.5

### Patch Changes

- [#85](https://github.com/blencorp/ashlar/pull/85) [`0824b7a`](https://github.com/blencorp/ashlar/commit/0824b7ae216c4fe290c0831875a2c30a75a54903) Thanks [@naodya](https://github.com/naodya)! - Move the publishable packages to the BLEN-owned npm namespace while keeping the `ashlar` CLI binary.

- [#87](https://github.com/blencorp/ashlar/pull/87) [`4711340`](https://github.com/blencorp/ashlar/commit/471134010e9fb02273caf74639a4b8d27a0689c0) Thanks [@naodya](https://github.com/naodya)! - Clarify registry layer language in CLI output around human-readable layer slugs such as `markup-primitives`, `interactive-components`, `service-patterns`, and `application-blocks`.

- Updated dependencies [[`0824b7a`](https://github.com/blencorp/ashlar/commit/0824b7ae216c4fe290c0831875a2c30a75a54903)]:
  - @blen/ashlar-schemas@0.1.4

## 0.3.4

### Patch Changes

- [#83](https://github.com/blencorp/ashlar/pull/83) [`df9b68c`](https://github.com/blencorp/ashlar/commit/df9b68c8eca11658f28eec381d0b48a0cbba0c04) Thanks [@naodya](https://github.com/naodya)! - Extend the shadcn v4 compatibility surface with init scaffold flags plus add path, silent, and overwrite behaviors while preserving Ashlar's branded TUI output.

## 0.3.3

### Patch Changes

- [#79](https://github.com/blencorp/ashlar/pull/79) [`9c39443`](https://github.com/blencorp/ashlar/commit/9c39443bc57a2f0c1fdadd89beb58eeac9079b14) Thanks [@naodya](https://github.com/naodya)! - Package the complete signed registry directory in Sigstore release artifacts so reviewers can rerun public trust verification from a downloaded workflow artifact.

## 0.3.2

### Patch Changes

- [#77](https://github.com/blencorp/ashlar/pull/77) [`deda0e7`](https://github.com/blencorp/ashlar/commit/deda0e76de687775199ae7a3892fc31456501250) Thanks [@naodya](https://github.com/naodya)! - Add shadcn-v4-compatible CLI ergonomics: `create` as an `init` alias, `-c/--cwd` for common discovery/install commands, `search -q/-l`, and `add --all` previews for the configured Ashlar registry.

## 0.3.1

### Patch Changes

- [#75](https://github.com/blencorp/ashlar/pull/75) [`77e4b3f`](https://github.com/blencorp/ashlar/commit/77e4b3f58df974dc2560ec09e9783341231d8cb7) Thanks [@naodya](https://github.com/naodya)! - Replace the Banner capsule's CSS-painted flag with a source-owned inline SVG flag and harden the example visual smoke so framework demos fail if the government banner regresses to a fake background block.

## 0.3.0

### Minor Changes

- [`c9f509a`](https://github.com/blencorp/ashlar/commit/c9f509a917ba7c7a27a96448764bcf775b827520) Thanks [@naodya](https://github.com/naodya)! - Add shadcn-v4-style installer preview flags for `ashlar add`: `--view`, `--dry-run`, and `--diff` verify capsules before showing metadata, planned writes, or source diffs without changing consumer files.

## 0.2.0

### Minor Changes

- [`d552e1e`](https://github.com/blencorp/ashlar/commit/d552e1efa98213f45d5d95d36592d4d39c01d596) Thanks [@naodya](https://github.com/naodya)! - Add `ashlar release proof-plan`, a reviewer-facing action map that ties strict readiness blockers to the stable-evidence, release-trust, and design-partner proof tracks.

## 0.1.5

### Patch Changes

- [#69](https://github.com/blencorp/ashlar/pull/69) [`f551c83`](https://github.com/blencorp/ashlar/commit/f551c83c021cede314d7c6268aa6b5903efc3fd0) Thanks [@naodya](https://github.com/naodya)! - Require reviewed agency-theme provenance metadata, expose it through theme validation, DESIGN.md, and MCP token tools, and refresh stock theme source records with retrieval dates.

- Updated dependencies [[`f551c83`](https://github.com/blencorp/ashlar/commit/f551c83c021cede314d7c6268aa6b5903efc3fd0)]:
  - @blen/ashlar-schemas@0.1.3

## 0.1.4

### Patch Changes

- [#67](https://github.com/blencorp/ashlar/pull/67) [`f74a0d8`](https://github.com/blencorp/ashlar/commit/f74a0d801b941659a172f68c5e5ccc47f4e8c0e8) Thanks [@naodya](https://github.com/naodya)! - Polish the CLI TUI with branded help, BLEN attribution, shadcn-style aliases, and structured command output while preserving JSON-safe agent modes.

## 0.1.3

### Patch Changes

- [#64](https://github.com/blencorp/ashlar/pull/64) [`181b359`](https://github.com/blencorp/ashlar/commit/181b3596d096a6603277c88c13847a97bba92d5e) Thanks [@naodya](https://github.com/naodya)! - Require agency theme source provenance, expose theme sources through generated DESIGN.md and MCP token tools, and document source-backed stock themes.

- Updated dependencies [[`181b359`](https://github.com/blencorp/ashlar/commit/181b3596d096a6603277c88c13847a97bba92d5e)]:
  - @blen/ashlar-schemas@0.1.2

## 0.1.2

### Patch Changes

- [#62](https://github.com/blencorp/ashlar/pull/62) [`e39bc6d`](https://github.com/blencorp/ashlar/commit/e39bc6d5013fcf7643c5d0fa7792482298adacad) Thanks [@naodya](https://github.com/naodya)! - Add flat workflow-surface guidance to generated DESIGN.md files so AI-assisted edits avoid nested cards.

## 0.1.1

### Patch Changes

- [#57](https://github.com/blencorp/ashlar/pull/57) [`51c247f`](https://github.com/blencorp/ashlar/commit/51c247ffe367ff491a0f02d9c6f6f9a39a8ec00a) Thanks [@naodya](https://github.com/naodya)! - Add source provenance to agency theme JSON and clean up agency-theme example UIs.

- Updated dependencies [[`51c247f`](https://github.com/blencorp/ashlar/commit/51c247ffe367ff491a0f02d9c6f6f9a39a8ec00a)]:
  - @blen/ashlar-schemas@0.1.1

## 0.1.0

### Minor Changes

- [#42](https://github.com/blencorp/ashlar/pull/42) [`22bf011`](https://github.com/blencorp/ashlar/commit/22bf011885378b87707c2ea80da9998285d7270d) Thanks [@naodya](https://github.com/naodya)! - Add the standards evidence foundation: source-owned capsule install/update/verify, federal audit and USWDS migration tooling, evidence review and publication flows, release readiness and provenance gates, external review intake, AI/MCP surfaces, and schema-backed registry/release artifacts.

### Patch Changes

- Updated dependencies [[`22bf011`](https://github.com/blencorp/ashlar/commit/22bf011885378b87707c2ea80da9998285d7270d)]:
  - @blen/ashlar-schemas@0.1.0
