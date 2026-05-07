# Drift management and updates

shadcn's most-cited unfixed problem is that copied components drift after install with no safe upgrade path. Ashlar addresses this with a lockfile + three-way merge + codemods. The textual three-way merge fixes the cases where line-stable file formats let `git merge-file` reach a clean result; codemods are the escape hatch for cases where line-based merge cannot reason about the change.

> **Status (2026-05-05)**: the lockfile substrate exists today (per-file `original_hash` + `current_hash`). A prototype `update` command verifies registry capsule manifests against index-pinned hashes and local Ed25519 signatures, runs matching integrity-covered `manifest.codemods` JSON files through a schema-backed narrow ast-grep `pattern` / fixed `rewrite` subset before merge, handles clean replacement, `git merge-file --diff3` clean merges, conflict-marker writes, `update --resolved <component>`, and explicit approval before touching accessibility-critical files or `confirm: true` codemods. Accessibility-critical updates print a component/version review summary with touched files and upstream diff preview before any writes; `--prompt` can apply the reviewed update after a yes/no answer, while `--yes` remains the non-interactive approval path. Confirmed codemods report rule ids and targets before requiring approval. Codemod rule targets are bounded to listed files inside the installed component directory, skipped-version updates apply intermediate codemods in registry version order, and `--survival-report <path>` emits structured per-component update metrics. The current test harness covers 11 throwaway-consumer scenarios with conflict-rate measurement and merge-correctness samples, plus a copied `examples/vite` consumer update that must still build with Vite after merge. See [STATUS.md](../../STATUS.md).

This document specifies the lockfile format, the update protocol, conflict resolution UX, codemod application, and the **explicit list of failure modes textual merge does not handle safely**.

## The lockfile (`ashlar-lock.json`)

Located at the consumer project root. Records every installed capsule, content hashes, future signatures, and per-file install state.

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

1. **Fetch upstream**: download the new capsule version from the registry. Verify the capsule manifest, index-pinned capsule hash, local registry signature, and file hashes. When slice 4 is complete, replace the local signature with Sigstore chain validation plus any pinned trust roots.
2. **Codemod preparation**: walk the registry `versions` list from the installed version to the target version and run each capsule-listed codemod whose `component`, `from`, and `to` match that step.
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

Codemods currently ship in the capsule as JSON files referenced by `manifest.codemods`. That list is part of the capsule hash/signature payload when present, codemod files must also be listed in `manifest.files`, and codemod files validate against `codemod.schema.json` before any rewrite runs. The prototype runner supports a deliberately small ast-grep subset: one target file, one `language`, one `pattern`, and one fixed `rewrite`. Rule targets must stay inside the installed component directory and be listed in the capsule manifest. Markup primitive codemods target the semantic markup form (`<button class="ashlar-button">`) per [ADR-0011](../adr/adr-0011-l0-semantic-contract.md); interactive component codemods target the custom-element form (`<ashlar-combobox>`).

```json
{
  "schemaVersion": "1.0",
  "component": "button",
  "from": "1.1.0",
  "to": "1.2.0",
  "rules": [
    {
      "id": "button-rename-color-token",
      "target": "button.css",
      "language": "css",
      "pattern": "color: var(--ashlar-color-action-primary-bg);",
      "rewrite": "color: var(--ashlar-color-action-primary-surface);"
    }
  ]
}
```

Application order:

1. CLI computes the version delta (e.g., 1.1.2 → 1.3.0).
2. Loads matching codemods from each intermediate capsule's `codemods` manifest list.
3. Runs each matching codemod against installed consumer capsule files via ast-grep before merge, advancing the codemod `from` version after each registry version step.
4. Reports applied transformations.
5. Then proceeds with three-way merge of capsule files.

For codemods marked `confirm: true`, the prototype runner requires explicit `--yes` approval before applying and reports the specific rule ids plus target files. An interactive apply/abort prompt remains planned.

For survival instrumentation, `ashlar update --survival-report <path>` writes JSON with per-component file counts (`added`, `replaced`, `merged`, `conflicts`), codemod counts, touched accessibility-critical files, and aggregate conflict rate. The current harness exercises 11 update scenarios against throwaway projects and a copied Vite consumer that must still produce a production build after update. This is CI evidence for the drift substrate, not a substitute for semantic accessibility review.

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
4. **TypeScript state-machine refactors (interactive components)**. A Zag (or successor) state-machine version renames states, transitions, or actors. Textual merge applies the rename but consumer code that referenced the old state names breaks at runtime. *Mitigation*: codemod is the only safe path; force-confirmation on `criticalForA11y` files prompts the user to read the changelog.
5. **JSON formatting drift in CEM**. `button.cem.json` reformats (indentation, key order). Textual merge produces a noisy diff that is mechanically clean but human-unreadable. *Mitigation*: capsule build pipeline canonicalizes JSON (sorted keys, two-space indent) so reformatting drift does not happen.
6. **HTML attribute order**. Consumer reorders `class` and `data-variant`; upstream rewrites the same attributes in a different order. Textual merge sees a diff where there is no semantic change. *Mitigation*: HTML files are canonicalized during build (attribute alphabetical order) so attribute-order drift does not happen on the upstream side; consumer drift is tolerated as a clean merge.

Categories 1, 3, and 4 are **safety-critical** — silently-wrong merges can introduce accessibility regressions. Codemods are the architectural answer; the current prototype proves the runner path, but v0.0 still needs richer confirmation UX and broader merge-survival testing before breaking changes that affect these categories can be considered safe.

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

Current `ashlar verify` re-hashes every installed file, checks against the lockfile's `original_hash` (for unmodified files) or notes presence of local edits, compares the lockfile `capsule_hash` to the registry index when the registry is available, verifies local Ed25519 registry signatures, validates declared capsule Sigstore bundle metadata when present, and runs trust-root-required `cosign verify-blob`. The target slice 4 behavior completes this with real public bundle publication and Sigstore/TUF material for offline review.

```
$ ashlar verify

Components:
  ✓ button         (1.2.3) — files match, index hash matches
  ⚠ form-field    (0.8.0) — local edits in form-field.css
  ✗ dialog        (1.1.0) — lockfile capsule hash does not match registry index

3 components verified. 1 warning, 1 error.
```

Local signature mismatches, invalid declared Sigstore metadata, and failed trust-root-required cosign verification are treated as hard errors today. Public Sigstore verification in slice 4 keeps that behavior and adds real published bundle material with remediation guidance (re-fetch from canonical registry; check for trust-root drift).

## Air-gapped operation

For environments that cannot reach the public registry:

```
$ ashlar registry mirror --output ./ashlar-mirror
# then point ashlar.config.json at ./ashlar-mirror
$ ashlar update --yes
```

The prototype `registry mirror` command verifies the source registry index, capsule manifests, index-pinned hashes, and local Ed25519 signatures before copying the registry directory. The project config records `registry: "./ashlar-mirror"`. Updates work entirely offline.

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
