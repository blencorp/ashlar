# ADR 0011 - L0 DOM contract: semantic HTML, not custom elements

## Status

Accepted.

## Decision

Ashlar L0 capsules use semantic platform HTML plus Ashlar classes and data attributes as the canonical DOM contract.

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

L1 components may use custom elements when JavaScript behavior is genuinely required.

## Rationale

The L0 layer exists specifically to work without JavaScript, framework adapters, hydration, or custom-element registration. Semantic HTML preserves built-in accessibility behavior, form participation, keyboard activation, progressive enhancement, CMS compatibility, and low bundle cost.

Custom elements remain appropriate for L1 stateful components such as ComboBox, Date Picker, Toast, and rich Upload controls.

## Consequences

- L0 CEM files may set `tagName` to the native element and include `_ashlar.selector`.
- L0 validation rules target semantic markup, classes, data attributes, and native attributes.
- AI examples for L0 must generate native HTML.
- Framework adapters for L0 should render native elements, not custom elements.
- L1 examples continue to use `ashlar-*` custom-element names where appropriate.

## References

- [Architecture overview](../architecture/overview.md)
- [Validation](../architecture/validation.md)
- [Capsule format](../architecture/capsule.md)
