# ADR 0005 — Accessibility target: WCAG 2.2 AA with structured evidence packets

## Status

Proposed.

## Decision

Engineer to **WCAG 2.2 AA** where practical. Document legal baselines (Section 508 ↔ WCAG 2.0 AA; ADA Title II ↔ WCAG 2.1 AA; EAA ↔ WCAG 2.1 AA via EN 301 549) separately. Ship a structured **evidence packet** with every stable component: machine-readable WCAG criterion mapping, automated test results (axe), keyboard interaction transcripts, manual screen reader test notes, and known limitations.

A component cannot be marked **stable** without a complete evidence packet.

## Rationale

WCAG 2.2 AA is the forward-looking engineering target. Federal Section 508 currently incorporates WCAG 2.0 AA; ADA Title II web/mobile rules reference WCAG 2.1 AA; the European Accessibility Act enforced June 2025 references WCAG 2.1 AA via EN 301 549. Targeting 2.2 future-proofs the system without overpromising compliance for any single legal regime.

"Accessible by default" without evidence is a marketing claim. A government design system needs verifiable truth. Structured evidence packets:

- Make accessibility claims auditable by reviewers.
- Let AI tools ground their accessibility advice in real test results.
- Surface known limitations as machine-readable JSON rather than scattered prose.
- Form a contract that consumers can rely on (and that implementers must satisfy to ship a stable component).

## Consequences

**Positive**

- Forward-looking accessibility posture.
- Auditable, comparable, queryable evidence.
- Clear stable-component gates prevent silent regressions.
- AI assistants can cite evidence when offering accessibility advice.

**Negative**

- More testing effort per component than "we ran axe."
- Manual screen reader testing (NVDA, VoiceOver, JAWS) is slow and human.
- Legal baselines differ by context; consumers may misunderstand component-level support as application-level compliance.

**Mitigations**

- Compliance language in docs explicitly disclaims application-level compliance.
- Evidence packets include `knownLimitations` so consumers see gaps.
- Audit tooling (`ashlar audit`) catches common application-level misuse.
- Manual SR test scripts are templated and concise so they are repeatable, not labor-prohibitive.

## References

- [Accessibility architecture](../architecture/accessibility.md)
- WCAG 2.2: https://www.w3.org/TR/WCAG22/
- Section 508 — laws and policies: https://www.section508.gov/manage/laws-and-policies/
- ADA Title II rule: https://www.ada.gov/resources/2024-03-08-web-rule/
- EAA WCAG 2.2 alignment — WCAG.com: https://www.wcag.com/compliance/european-accessibility-act/
