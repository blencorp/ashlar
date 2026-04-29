# Drift management and updates

shadcn's most-cited unfixed problem is that copied components drift after install with no safe upgrade path. Ashlar addresses this with a lockfile + three-way merge + codemods. The textual three-way merge fixes the cases where line-stable file formats let `git merge-file` reach a clean result; codemods are the escape hatch for cases where line-based merge cannot reason about the change.

> **Status (2026-04-29)**: the lockfile substrate exists today (per-file `original_hash` + `current_hash`). The `update` command, three-way merge runner, codemod application, and accessibility-critical confirmation prompt land in [v0.0 slice 3](../roadmap/01-v0.0-foundation.md). See [STATUS.md](../../STATUS.md).

This document specifies the lockfile format, the update protocol, conflict resolution UX, codemod application, and the **explicit list of failure modes textual merge does not handle safely**.

## The lockfile (`ashlar-lock.json`)

Located at the consumer project root. Records every installed capsule, content hashes, signatures, and per-file install state.

```json
{
  "$schema": "https://ashlar.dev/schemas/lock.schema.json",
  "version": "1",
  "registry": "https://registry.ashlar.dev",
  "components": {
    "button": {
      "version": "1.2.3",
      "capsule_hash": "sha256:abc...",
      "signature": "sigstore:...",
      "installed_at": "2026-04-27T10:00:00Z",
      "installed_via": "ashlar-cli@0.1.0",
      "files": {
        "src/components/ashlar/button.css": {
          "original_hash": "sha256:def...",
          "current_hash": "sha256:def...",
          "critical_for_a11y": true
        },
        "src/components/ashlar/button.html.njk": {
          "original_hash": "sha256:ghi...",
          "current_hash": "sha256:ghi...",
          "critical_for_a11y": false
        }
      }
    }
  },
  "tokens": {
    "version": "0.5.0",
    "signature": "sigstore:..."
  },
  "themes": ["ashlar/default", "agency/example"]
}
```

`original_hash` is the content hash at install time.
`current_hash` is recomputed every time the CLI runs, to detect local edits.
`critical_for_a11y` is sourced from the capsule's `_ashlar.criticalForA11y` flag in the CEM.

## The drift detection model

Three states for any installed file:

| `original_hash` vs file | `original_hash` vs upstream | State |
|---|---|---|
| Match | Match | **Clean** — no local edits, no upstream changes. |
| Match | Differ | **Upgradeable** — upstream changed, no local edits. Safe replace. |
| Differ | Match | **Forked** — local edits, upstream unchanged. No update needed. |
| Differ | Differ | **Conflicted** — local edits AND upstream changed. Three-way merge required. |

## `ashlar update` protocol

### Per-component flow

For each installed capsule:

1. **Fetch upstream**: download the new capsule version from the registry. Verify signature against installed-version's signing chain plus any pinned trust roots.
2. **Skip-version detection**: if the new version is more than one minor ahead, run all intermediate codemods in version order before merging.
3. **Per-file three-way merge**:

   ```
   base   = original_hash content (from registry at locked version)
   local  = consumer's current file content
   new    = upstream content at new version
   merged = git merge-file --diff3 local base new
   ```

4. **Clean merge** (no conflicts): write `merged`, update `original_hash` and `current_hash` to the new content's hash.
5. **Conflict** (`<<<<<<<` markers): write the conflicted file, present a summary, halt the update for that component.
6. **Accessibility-critical confirmation**: even if the merge is clean, if any touched file has `critical_for_a11y: true`, prompt the user to confirm the change before writing.

### Codemod application

Codemods ship in the capsule as ast-grep YAML rules. L0 codemods target the semantic markup form (`<button class="ashlar-button">`) per [ADR-0011](../adr/adr-0011-l0-semantic-contract.md); L1 codemods target the custom-element form (`<ashlar-combobox>`).

```yaml
# button.codemods.yaml — L0 example
- id: button-rename-color-attr
  from: 1.1.x
  to: 1.2.x
  language: [html, tsx, jsx]
  rule:
    pattern: <button class="ashlar-button" color="$VAL">
  fix: <button class="ashlar-button" data-variant="$VAL">
  message: "color attribute renamed to data-variant in 1.2.0"
  confirm: false
```

Application order:

1. CLI computes the version delta (e.g., 1.1.2 → 1.3.0).
2. Loads codemods from intermediate versions (1.1.x → 1.2.x, 1.2.x → 1.3.x).
3. Runs each codemod against consumer source via ast-grep, in version order.
4. Reports applied transformations.
5. Then proceeds with three-way merge of capsule files.

For codemods marked `confirm: true`, CLI pauses for user approval before applying.

## Conflict resolution UX

When `git merge-file` produces conflicts:

```
$ ashlar update button

Updating button: 1.1.5 → 1.2.0

Running codemods (1.1.x → 1.2.x):
  ✓ button-rename-color-attr applied to 3 files
  ✓ button-deprecate-rounded-class applied to 1 file

Merging files:
  ✓ button.css         (clean merge, 2 upstream changes accepted)
  ⚠ button.html.njk    (conflict — review required)
  ✓ button.cem.json    (replaced, no local edits)

Conflict in src/components/ashlar/button.html.njk:

  <<<<<<< local
    <button class="ashlar-button ashlar-button--{{ variant }}">
  ||||||| base
    <button class="ashlar-button ashlar-button--{{ color }}">
  =======
    <button class="ashlar-button" data-variant="{{ variant }}">
  >>>>>>> upstream

Resolve the conflict and run `ashlar update --resolved button` to finalize.
```

## Failure modes textual three-way merge does not handle

`git merge-file --diff3` is line-based. It produces *textually* clean results in cases where the file format is line-stable. It produces silently-wrong results, or unresolvable noise, in several cases that Ashlar capsule files routinely encounter. The architecture is honest about these limits rather than pretending textual merge is sufficient:

1. **CSS custom-property renames**. A consumer renames `--ashlar-color-action-primary-bg` to `--brand-button-bg` for theming, and upstream changes the value. Textual merge produces a file that no longer tracks the upstream rename. *Mitigation*: codemod ships with the version that rolls out a custom-property rename; codemod runs before merge.
2. **Cascade-layer reordering**. A consumer moves a rule from `@layer ashlar.components` into `@layer my-app.overrides` to take precedence; upstream adds a new rule into the original layer. Textual merge accepts both; cascade order produces unintended specificity. *Mitigation*: layer order is documented as part of the capsule contract; `ashlar audit` flags components touching layers outside the capsule's declared set.
3. **Selector specificity changes via `@scope`**. Consumer wraps capsule rules in a custom `@scope`; upstream changes a selector. Textual merge applies the upstream selector but the scope wrapper still applies; specificity drift can be silent. *Mitigation*: codemod for any version that changes scope or selector identity.
4. **TypeScript state-machine refactors (L1)**. A Zag (or successor) state-machine version renames states, transitions, or actors. Textual merge applies the rename but consumer code that referenced the old state names breaks at runtime. *Mitigation*: codemod is the only safe path; force-confirmation on `criticalForA11y` files prompts the user to read the changelog.
5. **JSON formatting drift in CEM**. `button.cem.json` reformats (indentation, key order). Textual merge produces a noisy diff that is mechanically clean but human-unreadable. *Mitigation*: capsule build pipeline canonicalizes JSON (sorted keys, two-space indent) so reformatting drift does not happen.
6. **HTML attribute order**. Consumer reorders `class` and `data-variant`; upstream rewrites the same attributes in a different order. Textual merge sees a diff where there is no semantic change. *Mitigation*: HTML files are canonicalized during build (attribute alphabetical order) so attribute-order drift does not happen on the upstream side; consumer drift is tolerated as a clean merge.

Categories 1, 3, and 4 are **safety-critical** — silently-wrong merges can introduce accessibility regressions. Codemods are the architectural answer; v0.0 slice 3 (drift management) ships the codemod runner, and breaking changes that affect these categories ship a codemod or are not breaking changes.

When `_ashlar.criticalForA11y: true` is set on a file, even a textually-clean merge prompts the user to confirm — the safety net is loud rather than quiet because textual cleanliness is not semantic correctness.

`ashlar update --resolved button`:

1. Verifies no `<<<<<<<` markers remain in the file.
2. Computes new `current_hash` and `original_hash` (set to upstream's new content).
3. Updates the lockfile entry.

## Accessibility-critical force-confirmation

For any file with `critical_for_a11y: true`:

```
$ ashlar update dialog

Updating dialog: 1.0.4 → 1.1.0

dialog.element.ts is marked accessibility-critical (focus management).
Upstream change summary:
  - Updates focus-trap behavior to comply with WCAG 2.4.3 update
  - Touched: lines 47-58 (handleKeyDown), lines 72-81 (focusable-target query)

Continue? [y/N]
```

Even on a clean merge, the user must explicitly accept. This is the safety net for "AI generated code, the merge looked fine, but it broke focus management for screen-reader users."

## Verifying no tampering: `ashlar verify`

`ashlar verify` re-hashes every installed file and checks against the lockfile's `original_hash` (for unmodified files) or notes presence of local edits. It also re-verifies the registry signature on the capsule.

```
$ ashlar verify

Components:
  ✓ button         (1.2.3) — files match, signature valid
  ⚠ form-field    (0.8.0) — local edits in form-field.css
  ✗ dialog        (1.1.0) — signature invalid (registry tampered or different signing chain)

3 components verified. 1 warning, 1 error.
```

A signature mismatch is treated as a hard error — the consumer is shown which capsule failed and given remediation guidance (re-fetch from canonical registry; check for trust-root drift).

## Air-gapped operation

For environments that cannot reach the public registry:

```
$ ashlar registry mirror --output ./ashlar-mirror
$ ashlar update --registry ./ashlar-mirror
```

`registry mirror` produces a tarball of the entire signed registry plus a verification keyring. The lockfile records `registry: "./ashlar-mirror"`. Updates work entirely offline.

## What this means in practice

**Initial install**: install components, lockfile records original hashes.
**After customization**: customize a button to add an icon slot. Lockfile sees the drift but does nothing.
**After upstream release**: registry releases button 1.3.0 with a focus-handling fix. Run `ashlar update`. CLI runs codemods (none for this version), three-way merges your local icon-slot edit with the upstream focus fix, presents one minor conflict in the click handler, you resolve it, run `ashlar update --resolved button`, and you have the upstream a11y fix plus your local feature, with both diffed cleanly.

shadcn cannot do this. Ashlar can.

## References

- [ADR 0001 — Distribution model](../adr/adr-0001-distribution-model.md)
- [Capsule format](./capsule.md)
- [Distribution and registry](./distribution-and-registry.md)
- [Validation](./validation.md)
- shadcn discussion #790: https://github.com/shadcn-ui/ui/discussions/790
- git merge-file: https://git-scm.com/docs/git-merge-file
- Three-way merge: https://blog.jcoglan.com/2017/05/08/merging-with-diff3/
