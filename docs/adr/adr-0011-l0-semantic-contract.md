# ADR 0011 - Markup primitive DOM contract: semantic HTML, not custom elements

## Status

Accepted.

## Decision

Ashlar markup primitive capsules, stored internally as layer `L0`, use semantic platform HTML plus Ashlar classes and data attributes as the canonical DOM contract.

For example, Button is:

```html
<button class="ashlar-button" data-variant="primary" type="button">
  Apply
</button>
```

It is not:

```html
<ashlar-button variant="primary">Apply</ashlar-button>
```

Interactive components, stored internally as layer `L1`, may use custom elements when JavaScript behavior is genuinely required.

## Rationale

The markup primitive layer exists specifically to work without JavaScript, framework adapters, hydration, or custom-element registration. Semantic HTML preserves built-in accessibility behavior, form participation, keyboard activation, progressive enhancement, CMS compatibility, and low bundle cost.

Custom elements remain appropriate for interactive stateful components such as ComboBox, Date Picker, Toast, and rich Upload controls.

## Consequences

- Markup primitive CEM files may set `tagName` to the native element and include `_ashlar.selector`.
- Markup primitive validation rules target semantic markup, classes, data attributes, and native attributes.
- AI examples for markup primitives must generate native HTML.
- Framework adapters for markup primitives should render native elements, not custom elements.
- Interactive component examples continue to use `ashlar-*` custom-element names where appropriate.

## References

- [Architecture overview](../architecture/overview.md)
- [Validation](../architecture/validation.md)
- [Capsule format](../architecture/capsule.md)
