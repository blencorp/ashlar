# Drift management and updates

shadcn's most-cited unfixed problem is that copied components drift after install with no safe upgrade path. Atrium's lockfile and three-way merge protocol is the direct, mechanical fix.

This document specifies the lockfile format, the update protocol, conflict resolution UX, and codemod application.

## The lockfile (`atrium-lock.json`)

Located at the consumer project root. Records every installed capsule, content hashes, signatures, and per-file install state.

```json
{
  "$schema": "https://atrium.dev/schemas/lock.schema.json",
  "version": "1",
  "registry": "https://registry.atrium.dev",
  "components": {
    "button": {
      "version": "1.2.3",
      "capsule_hash": "sha256:abc...",
      "signature": "sigstore:...",
      "installed_at": "2026-04-27T10:00:00Z",
      "installed_via": "atrium-cli@0.1.0",
      "files": {
        "src/components/atrium/button.css": {
          "original_hash": "sha256:def...",
          "current_hash": "sha256:def...",
          "critical_for_a11y": true
        },
        "src/components/atrium/button.html.njk": {
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
  "themes": ["atrium/default", "agency/example"]
}
```

`original_hash` is the content hash at install time.
`current_hash` is recomputed every time the CLI runs, to detect local edits.
`critical_for_a11y` is sourced from the capsule's `_atrium.criticalForA11y` flag in the CEM.

## The drift detection model

Three states for any installed file:

| `original_hash` vs file | `original_hash` vs upstream | State |
|---|---|---|
| Match | Match | **Clean** — no local edits, no upstream changes. |
| Match | Differ | **Upgradeable** — upstream changed, no local edits. Safe replace. |
| Differ | Match | **Forked** — local edits, upstream unchanged. No update needed. |
| Differ | Differ | **Conflicted** — local edits AND upstream changed. Three-way merge required. |

## `atrium update` protocol

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

Codemods ship in the capsule as ast-grep YAML rules:

```yaml
# button.codemods.yaml
- id: button-rename-color-prop
  from: 1.1.x
  to: 1.2.x
  language: [tsx, jsx, vue, svelte, astro, html, twig]
  rule:
    pattern: <atrium-button color="$VAL">
  fix: <atrium-button variant="$VAL">
  message: "color prop renamed to variant in 1.2.0"
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
$ atrium update button

Updating button: 1.1.5 → 1.2.0

Running codemods (1.1.x → 1.2.x):
  ✓ button-rename-color-prop applied to 3 files
  ✓ button-deprecate-rounded-class applied to 1 file

Merging files:
  ✓ button.css         (clean merge, 2 upstream changes accepted)
  ⚠ button.html.njk    (conflict — review required)
  ✓ button.cem.json    (replaced, no local edits)

Conflict in src/components/atrium/button.html.njk:

  <<<<<<< local
    <button class="atrium-button atrium-button--{{ variant }}">
  ||||||| base
    <button class="atrium-button atrium-button--{{ color }}">
  =======
    <button class="atrium-button" data-variant="{{ variant }}">
  >>>>>>> upstream

Resolve the conflict and run `atrium update --resolved button` to finalize.
```

`atrium update --resolved button`:

1. Verifies no `<<<<<<<` markers remain in the file.
2. Computes new `current_hash` and `original_hash` (set to upstream's new content).
3. Updates the lockfile entry.

## Accessibility-critical force-confirmation

For any file with `critical_for_a11y: true`:

```
$ atrium update dialog

Updating dialog: 1.0.4 → 1.1.0

dialog.element.ts is marked accessibility-critical (focus management).
Upstream change summary:
  - Updates focus-trap behavior to comply with WCAG 2.4.3 update
  - Touched: lines 47-58 (handleKeyDown), lines 72-81 (focusable-target query)

Continue? [y/N]
```

Even on a clean merge, the user must explicitly accept. This is the safety net for "AI generated code, the merge looked fine, but it broke focus management for screen-reader users."

## Verifying no tampering: `atrium verify`

`atrium verify` re-hashes every installed file and checks against the lockfile's `original_hash` (for unmodified files) or notes presence of local edits. It also re-verifies the registry signature on the capsule.

```
$ atrium verify

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
$ atrium registry mirror --output ./atrium-mirror
$ atrium update --registry ./atrium-mirror
```

`registry mirror` produces a tarball of the entire signed registry plus a verification keyring. The lockfile records `registry: "./atrium-mirror"`. Updates work entirely offline.

## What this means in practice

**Day-1**: install components, lockfile records original hashes.
**Day-30**: customize a button to add an icon slot. Lockfile sees the drift but does nothing.
**Day-60**: registry releases button 1.3.0 with a focus-handling fix. Run `atrium update`. CLI runs codemods (none for this version), three-way merges your local icon-slot edit with the upstream focus fix, presents one minor conflict in the click handler, you resolve it, run `atrium update --resolved button`, and you have the upstream a11y fix plus your local feature, with both diffed cleanly.

shadcn cannot do this. Atrium can.

## References

- [ADR 0001 — Distribution model](../adr/adr-0001-distribution-model.md)
- [Capsule format](./capsule.md)
- [Distribution and registry](./distribution-and-registry.md)
- [Validation](./validation.md)
- shadcn discussion #790: https://github.com/shadcn-ui/ui/discussions/790
- git merge-file: https://git-scm.com/docs/git-merge-file
- Three-way merge: https://blog.jcoglan.com/2017/05/08/merging-with-diff3/
