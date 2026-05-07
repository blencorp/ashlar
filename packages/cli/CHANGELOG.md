# @ashlar/cli

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
  - @ashlar/schemas@0.1.3

## 0.1.4

### Patch Changes

- [#67](https://github.com/blencorp/ashlar/pull/67) [`f74a0d8`](https://github.com/blencorp/ashlar/commit/f74a0d801b941659a172f68c5e5ccc47f4e8c0e8) Thanks [@naodya](https://github.com/naodya)! - Polish the CLI TUI with branded help, BLEN attribution, shadcn-style aliases, and structured command output while preserving JSON-safe agent modes.

## 0.1.3

### Patch Changes

- [#64](https://github.com/blencorp/ashlar/pull/64) [`181b359`](https://github.com/blencorp/ashlar/commit/181b3596d096a6603277c88c13847a97bba92d5e) Thanks [@naodya](https://github.com/naodya)! - Require agency theme source provenance, expose theme sources through generated DESIGN.md and MCP token tools, and document source-backed stock themes.

- Updated dependencies [[`181b359`](https://github.com/blencorp/ashlar/commit/181b3596d096a6603277c88c13847a97bba92d5e)]:
  - @ashlar/schemas@0.1.2

## 0.1.2

### Patch Changes

- [#62](https://github.com/blencorp/ashlar/pull/62) [`e39bc6d`](https://github.com/blencorp/ashlar/commit/e39bc6d5013fcf7643c5d0fa7792482298adacad) Thanks [@naodya](https://github.com/naodya)! - Add flat workflow-surface guidance to generated DESIGN.md files so AI-assisted edits avoid nested cards.

## 0.1.1

### Patch Changes

- [#57](https://github.com/blencorp/ashlar/pull/57) [`51c247f`](https://github.com/blencorp/ashlar/commit/51c247ffe367ff491a0f02d9c6f6f9a39a8ec00a) Thanks [@naodya](https://github.com/naodya)! - Add source provenance to agency theme JSON and clean up agency-theme example UIs.

- Updated dependencies [[`51c247f`](https://github.com/blencorp/ashlar/commit/51c247ffe367ff491a0f02d9c6f6f9a39a8ec00a)]:
  - @ashlar/schemas@0.1.1

## 0.1.0

### Minor Changes

- [#42](https://github.com/blencorp/ashlar/pull/42) [`22bf011`](https://github.com/blencorp/ashlar/commit/22bf011885378b87707c2ea80da9998285d7270d) Thanks [@naodya](https://github.com/naodya)! - Add the standards evidence foundation: source-owned capsule install/update/verify, federal audit and USWDS migration tooling, evidence review and publication flows, release readiness and provenance gates, external review intake, AI/MCP surfaces, and schema-backed registry/release artifacts.

### Patch Changes

- Updated dependencies [[`22bf011`](https://github.com/blencorp/ashlar/commit/22bf011885378b87707c2ea80da9998285d7270d)]:
  - @ashlar/schemas@0.1.0
