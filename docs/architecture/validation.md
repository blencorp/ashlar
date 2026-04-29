# Validation

Ashlar uses **ast-grep** with **tree-sitter** grammars as the validator engine. The same YAML rule validates component usage across the languages where ast-grep has real coverage today.

> **Status (2026-04-29)**: only the federal HTML policy pack (parser-backed via parse5) ships in slice 1. ast-grep integration and component-anti-pattern checks land in [v0.0 slice 2 — the validator wedge](../superpowers/specs/2026-04-29-v0-0-validator-wedge-spec.md). The support matrix below is the *target* state at v0.0 GATE, not what ships today. See [STATUS.md](../../STATUS.md).

This document specifies the rule format, rule generation from CEM, integration patterns, and the **honest** support matrix — what works first-party, what is opt-in via custom-language registration, and what is currently unsupported.

## Why not ESLint

ESLint is JavaScript-only. Ashlar's audience includes Drupal (Twig), Sitecore, AEM, server-rendered Django/Rails/PHP, plain HTML, and L4 templates in Nunjucks/Jinja/ERB. ESLint cannot validate component usage in any of these. Building per-template-language linters is multiplicative engineering effort with inconsistent rule expressiveness.

ast-grep is built on tree-sitter, which has grammars for every relevant target. One YAML rule, all languages. See [ADR 0007](../adr/adr-0007-validation-strategy.md) for the full rationale.

## Rule format

ast-grep rules are YAML. Each rule has an `id`, a target `language` list, a `rule` matcher, an optional `fix`, and human-readable metadata. Targets must come from the supported set in the matrix below; the validator returns `language-unsupported` (not silent pass) when asked to scan an unsupported language.

```yaml
id: ashlar/button/icon-only-needs-label
language: [html, tsx, jsx]
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

L0 components use the semantic markup (`<button class="ashlar-button">`) per [ADR-0011](../adr/adr-0011-l0-semantic-contract.md). The custom-element form (`<ashlar-button>`) is reserved for L1 components and never used in L0 anti-pattern rules.

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

## Honest support matrix

The validator declares what it can do and refuses to silently scan languages it cannot.

| Language | ast-grep support | Status in Ashlar | Notes |
|---|---|---|---|
| HTML | first-party (built-in) | **shipping** at v0.0 GATE | Used today via parse5 for federal policy; ast-grep takes over in slice 2. |
| TSX | first-party (built-in) | **shipping** at v0.0 GATE | Slice 2. |
| JSX | first-party (built-in) | **shipping** at v0.0 GATE | Slice 2. |
| CSS | first-party (built-in) | **shipping** at v0.0 GATE | Slice 2; for token-enforcement rules. |
| Vue SFC | third-party grammar (`tree-sitter-vue`) | opt-in via `ashlar.config.json` | User registers grammar path; grammar quality varies. |
| Svelte | third-party grammar (`tree-sitter-svelte`) | opt-in via `ashlar.config.json` | User registers grammar path. |
| Astro | third-party grammar (`tree-sitter-astro`) | opt-in via `ashlar.config.json` | virchau13/tree-sitter-astro; user registers grammar. |
| ERB | official tree-sitter grammar (`tree-sitter-embedded-template`) | opt-in via `ashlar.config.json` | Documented; not bundled. |
| Twig | **no maintained tree-sitter grammar** | **unsupported** | Validator returns `language-unsupported`. |
| Jinja | grammar is documented as incomplete | **unsupported** | Validator returns `language-unsupported`. |
| Nunjucks | no maintained tree-sitter grammar | **unsupported** | Validator returns `language-unsupported`. |

When a rule targets `language: [html, tsx, jsx]`, ast-grep applies the same pattern across the three first-party languages with no extra configuration. When a rule targets opt-in languages, the consumer must register the grammar in `ashlar.config.json`. Unsupported languages emit a clear, actionable finding rather than failing silently.

Twig, Jinja, and Nunjucks coverage will arrive when maintained tree-sitter grammars exist. Contributing a grammar upstream is one path; another is building rule expressiveness through alternative parsers (an HTML pre-pass for the Twig/Jinja templates that resolve to HTML at render time). Ashlar tracks this honestly rather than overpromising.

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
- uses: actions/upload-artifact@v4
  if: always()
  with: { name: ashlar-sarif, path: ashlar.sarif }
- uses: github/codeql-action/upload-sarif@v4
  continue-on-error: true
  with: { sarif_file: ashlar.sarif }
```

SARIF output integrates with GitHub Code Scanning, GitLab, and other CI systems. GitHub Code Scanning upload requires Code Security to be enabled on the repository, so CI should keep a SARIF artifact fallback.

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
