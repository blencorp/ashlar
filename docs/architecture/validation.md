# Validation

Ashlar uses **ast-grep** with **tree-sitter** grammars as the polyglot validator engine. The same YAML rule validates component usage in TSX, JSX, Vue SFCs, Svelte, Astro, plain HTML, and Drupal Twig.

This document specifies the rule format, rule generation from CEM, integration patterns, and the polyglot support matrix.

## Why not ESLint

ESLint is JavaScript-only. Ashlar's audience includes Drupal (Twig), Sitecore, AEM, server-rendered Django/Rails/PHP, plain HTML, and L4 templates in Nunjucks/Jinja/ERB. ESLint cannot validate component usage in any of these. Building per-template-language linters is multiplicative engineering effort with inconsistent rule expressiveness.

ast-grep is built on tree-sitter, which has grammars for every relevant target. One YAML rule, all languages. See [ADR 0007](../adr/adr-0007-validation-strategy.md) for the full rationale.

## Rule format

ast-grep rules are YAML. Each rule has an `id`, a target `language` list, a `rule` matcher, an optional `fix`, and human-readable metadata.

```yaml
id: ashlar/button-icon-only-needs-label
language: [tsx, jsx, vue, svelte, astro, html, twig]
severity: error
message: "Icon-only Button requires aria-label (WCAG 4.1.2)"
note: "Buttons with only icon content must have an accessible name."
rule:
  pattern: <button class="ashlar-button">$ICON</button>
  has:
    pattern: <svg/>
  not:
    has:
      pattern: aria-label="$_"
fix: |
  <button class="ashlar-button" aria-label="TODO">$ICON</button>
```

## Generating rules from CEM

Component manifests declare anti-patterns in `_ashlar.antiPatterns`. The Ashlar build pipeline reads these and emits ast-grep rules.

CEM excerpt:

```json
{
  "_ashlar": {
    "antiPatterns": [
      {
        "id": "icon-only-needs-label",
        "pattern": "<button class=\"ashlar-button\">$ICON</button>",
        "constraint": { "has": "<svg/>", "not_has": "aria-label" },
        "fix": "<button class=\"ashlar-button\" aria-label=\"TODO\">$ICON</button>",
        "wcag": "4.1.2",
        "severity": "error"
      }
    ]
  }
}
```

Generated rule:

```yaml
id: ashlar/button-icon-only-needs-label
language: [tsx, jsx, vue, svelte, astro, html, twig]
severity: error
message: "Icon-only Button requires aria-label (WCAG 4.1.2)"
rule:
  pattern: <button class="ashlar-button">$ICON</button>
  has:
    pattern: <svg/>
  not:
    has:
      pattern: aria-label="$_"
fix: |
  <button class="ashlar-button" aria-label="TODO">$ICON</button>
```

Most rules are auto-generated. Hand-authored rules live alongside in the registry's `rules/` folder.

## Polyglot support matrix

| Language | Tree-sitter grammar | Ashlar rule support |
|---|---|---|
| TSX, JSX | tree-sitter-typescript | Full |
| Vue SFC | tree-sitter-vue | Template + script blocks |
| Svelte | tree-sitter-svelte | Full |
| Astro | tree-sitter-astro (virchau13) | Full |
| Plain HTML | tree-sitter-html | Full |
| Twig (Drupal/Symfony) | tree-sitter-twig (community) | Full for Ashlar component usage |
| Jinja (Python) | tree-sitter-jinja (community) | Full |
| ERB (Rails) | tree-sitter-embedded-template | Full |
| Nunjucks | tree-sitter-jinja (compatible) | Full |

When a rule targets `language: [html, twig, jinja, erb, njk]`, ast-grep applies the same pattern across all five.

## Categories of rules

Rules generated from CEM cover:

1. **Required accessibility names** — icon-only controls, links without text, labels for inputs.
2. **Variant validity** — `variant="huge"` flagged as not in the manifest's `_ashlar.variants`.
3. **Forbidden props** — unsafe HTML-injection patterns, framework escape hatches that bypass Ashlar safety nets.
4. **Token enforcement** — color values that aren't tokens (`color: red` in component overrides).
5. **Anti-patterns** — `<button class="ashlar-button" onClick={navigate}>` for navigation (use Link), `placeholder` as the only label, etc.
6. **Composition rules** — `<ashlar-form-field>` wrapping non-input content, `<ashlar-dialog>` without `title` prop.
7. **Migration** — codemods for breaking changes from prior versions.

Hand-authored rules cover patterns that are difficult to derive automatically (e.g., heading-order checks across a page, focus-order analysis).

## Running the validator

`ashlar audit` invokes ast-grep with the rules currently installed for the consumer's lockfile-tracked components.

```
$ ashlar audit

Scanning 247 source files across [tsx, vue, html, twig]...

src/components/Header.tsx:34:3
  ⚠ ashlar/button-icon-only-needs-label
  Icon-only Button requires aria-label (WCAG 4.1.2)

      <ashlar-button onClick={() => setOpen(true)}>
        <SvgMenu />
      </ashlar-button>

  Suggested fix:
      <ashlar-button aria-label="Menu" onClick={() => setOpen(true)}>
        <SvgMenu />
      </ashlar-button>

src/templates/article.html.twig:12:5
  ✗ ashlar/dialog-needs-title
  Dialog component requires a title for accessible naming (WCAG 2.4.6)

1 error, 1 warning across 247 files.
```

`ashlar audit --fix` applies suggested fixes where deterministic.

## Integration

### Pre-commit hook

```bash
#!/usr/bin/env bash
# .githooks/pre-commit
npx ashlar audit --staged --severity error
```

Fails commit if any error-level rule fires on staged files.

### CI

```yaml
# .github/workflows/ci.yml
- name: Ashlar audit
  run: npx ashlar audit --severity error --output sarif > ashlar.sarif
- uses: github/codeql-action/upload-sarif@v3
  with: { sarif_file: ashlar.sarif }
```

SARIF output integrates with GitHub Code Scanning, GitLab, and other CI systems.

### Optional ESLint shim

For teams with existing ESLint workflows:

```js
// eslint.config.js
import ashlarESLint from "@ashlar/eslint-shim";

export default [
  ...ashlarESLint.configs.recommended  // delegates to ast-grep under the hood
];
```

The shim invokes ast-grep on the file being linted and translates results into ESLint diagnostics. Slower than direct ast-grep usage; offered for compatibility.

## Performance

ast-grep is Rust; processes ~50k LOC per second on typical hardware. A full audit on a mid-size federal app (~200k LOC) completes in under 5 seconds. Per-file `--staged` mode runs in milliseconds.

## Distribution

ast-grep is a single Rust binary, ~3MB. Ashlar ships:

- `@ashlar/cli` (Node) — invokes the bundled ast-grep binary.
- `@ashlar/cli` ships ast-grep as a postinstall download (npm `optionalDependencies` for platform-specific binaries; `nypm` handles cross-PM compatibility).
- For air-gapped environments, the binary can be vendored separately.

## Authoring custom rules

Consumers can author project-specific rules in `ashlar.config.json`:

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
