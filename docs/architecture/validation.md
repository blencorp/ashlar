# Validation

Atrium uses **ast-grep** with **tree-sitter** grammars as the polyglot validator engine. The same YAML rule validates component usage in TSX, JSX, Vue SFCs, Svelte, Astro, plain HTML, and Drupal Twig.

This document specifies the rule format, rule generation from CEM, integration patterns, and the polyglot support matrix.

## Why not ESLint

ESLint is JavaScript-only. Atrium's audience includes Drupal (Twig), Sitecore, AEM, server-rendered Django/Rails/PHP, plain HTML, and L4 templates in Nunjucks/Jinja/ERB. ESLint cannot validate component usage in any of these. Building per-template-language linters is multiplicative engineering effort with inconsistent rule expressiveness.

ast-grep is built on tree-sitter, which has grammars for every relevant target. One YAML rule, all languages. See [ADR 0007](../adr/adr-0007-validation-strategy.md) for the full rationale.

## Rule format

ast-grep rules are YAML. Each rule has an `id`, a target `language` list, a `rule` matcher, an optional `fix`, and human-readable metadata.

```yaml
id: atrium/button-icon-only-needs-label
language: [tsx, jsx, vue, svelte, astro, html, twig]
severity: error
message: "Icon-only Button requires aria-label (WCAG 4.1.2)"
note: "Buttons with only icon content must have an accessible name."
rule:
  pattern: <button class="atrium-button">$ICON</button>
  has:
    pattern: <svg/>
  not:
    has:
      pattern: aria-label="$_"
fix: |
  <button class="atrium-button" aria-label="TODO">$ICON</button>
```

## Generating rules from CEM

Component manifests declare anti-patterns in `_atrium.antiPatterns`. The Atrium build pipeline reads these and emits ast-grep rules.

CEM excerpt:

```json
{
  "_atrium": {
    "antiPatterns": [
      {
        "id": "icon-only-needs-label",
        "pattern": "<button class=\"atrium-button\">$ICON</button>",
        "constraint": { "has": "<svg/>", "not_has": "aria-label" },
        "fix": "<button class=\"atrium-button\" aria-label=\"TODO\">$ICON</button>",
        "wcag": "4.1.2",
        "severity": "error"
      }
    ]
  }
}
```

Generated rule:

```yaml
id: atrium/button-icon-only-needs-label
language: [tsx, jsx, vue, svelte, astro, html, twig]
severity: error
message: "Icon-only Button requires aria-label (WCAG 4.1.2)"
rule:
  pattern: <button class="atrium-button">$ICON</button>
  has:
    pattern: <svg/>
  not:
    has:
      pattern: aria-label="$_"
fix: |
  <button class="atrium-button" aria-label="TODO">$ICON</button>
```

Most rules are auto-generated. Hand-authored rules live alongside in the registry's `rules/` folder.

## Polyglot support matrix

| Language | Tree-sitter grammar | Atrium rule support |
|---|---|---|
| TSX, JSX | tree-sitter-typescript | Full |
| Vue SFC | tree-sitter-vue | Template + script blocks |
| Svelte | tree-sitter-svelte | Full |
| Astro | tree-sitter-astro (virchau13) | Full |
| Plain HTML | tree-sitter-html | Full |
| Twig (Drupal/Symfony) | tree-sitter-twig (community) | Full for Atrium component usage |
| Jinja (Python) | tree-sitter-jinja (community) | Full |
| ERB (Rails) | tree-sitter-embedded-template | Full |
| Nunjucks | tree-sitter-jinja (compatible) | Full |

When a rule targets `language: [html, twig, jinja, erb, njk]`, ast-grep applies the same pattern across all five.

## Categories of rules

Rules generated from CEM cover:

1. **Required accessibility names** — icon-only controls, links without text, labels for inputs.
2. **Variant validity** — `variant="huge"` flagged as not in the manifest's `_atrium.variants`.
3. **Forbidden props** — unsafe HTML-injection patterns, framework escape hatches that bypass Atrium safety nets.
4. **Token enforcement** — color values that aren't tokens (`color: red` in component overrides).
5. **Anti-patterns** — `<button class="atrium-button" onClick={navigate}>` for navigation (use Link), `placeholder` as the only label, etc.
6. **Composition rules** — `<atrium-form-field>` wrapping non-input content, `<atrium-dialog>` without `title` prop.
7. **Migration** — codemods for breaking changes from prior versions.

Hand-authored rules cover patterns that are difficult to derive automatically (e.g., heading-order checks across a page, focus-order analysis).

## Running the validator

`atrium audit` invokes ast-grep with the rules currently installed for the consumer's lockfile-tracked components.

```
$ atrium audit

Scanning 247 source files across [tsx, vue, html, twig]...

src/components/Header.tsx:34:3
  ⚠ atrium/button-icon-only-needs-label
  Icon-only Button requires aria-label (WCAG 4.1.2)

      <atrium-button onClick={() => setOpen(true)}>
        <SvgMenu />
      </atrium-button>

  Suggested fix:
      <atrium-button aria-label="Menu" onClick={() => setOpen(true)}>
        <SvgMenu />
      </atrium-button>

src/templates/article.html.twig:12:5
  ✗ atrium/dialog-needs-title
  Dialog component requires a title for accessible naming (WCAG 2.4.6)

1 error, 1 warning across 247 files.
```

`atrium audit --fix` applies suggested fixes where deterministic.

## Integration

### Pre-commit hook

```bash
#!/usr/bin/env bash
# .githooks/pre-commit
npx atrium audit --staged --severity error
```

Fails commit if any error-level rule fires on staged files.

### CI

```yaml
# .github/workflows/ci.yml
- name: Atrium audit
  run: npx atrium audit --severity error --output sarif > atrium.sarif
- uses: github/codeql-action/upload-sarif@v3
  with: { sarif_file: atrium.sarif }
```

SARIF output integrates with GitHub Code Scanning, GitLab, and other CI systems.

### Optional ESLint shim

For teams with existing ESLint workflows:

```js
// eslint.config.js
import atriumESLint from "@atrium/eslint-shim";

export default [
  ...atriumESLint.configs.recommended  // delegates to ast-grep under the hood
];
```

The shim invokes ast-grep on the file being linted and translates results into ESLint diagnostics. Slower than direct ast-grep usage; offered for compatibility.

## Performance

ast-grep is Rust; processes ~50k LOC per second on typical hardware. A full audit on a mid-size federal app (~200k LOC) completes in under 5 seconds. Per-file `--staged` mode runs in milliseconds.

## Distribution

ast-grep is a single Rust binary, ~3MB. Atrium ships:

- `@atrium/cli` (Node) — invokes the bundled ast-grep binary.
- `@atrium/cli` ships ast-grep as a postinstall download (npm `optionalDependencies` for platform-specific binaries; `nypm` handles cross-PM compatibility).
- For air-gapped environments, the binary can be vendored separately.

## Authoring custom rules

Consumers can author project-specific rules in `atrium.config.json`:

```json
{
  "audit": {
    "rules": [
      "rules/no-inline-styles.yaml",
      "rules/agency-brand-colors-only.yaml"
    ]
  }
}
```

Rule DSL documentation includes examples per template language. Custom rules participate in the same polyglot pipeline.

## References

- [ADR 0007 — Validation strategy](../adr/adr-0007-validation-strategy.md)
- [AI-native architecture](./ai-native.md) (CEM source for generated rules)
- [research/05-ai-tooling-and-drift.md](../research/05-ai-tooling-and-drift.md)
- ast-grep: https://ast-grep.github.io/
- Tree-sitter: https://tree-sitter.github.io/tree-sitter/
- tree-sitter-astro: https://github.com/virchau13/tree-sitter-astro
- SARIF specification: https://docs.oasis-open.org/sarif/sarif/v2.1.0/sarif-v2.1.0.html
