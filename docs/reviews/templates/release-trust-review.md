# Release Trust Review: <release-or-commit>

Record status: completed external review only

Reviewer:
Reviewer affiliation:
Review date:
Source issue:
Repo commit:
Release candidate:

## Scope

- Packages reviewed:
- Registry artifacts reviewed:
- Workflows reviewed:
- Trust-root policy reviewed:

## Evidence Artifacts

- npm provenance verification: reports/ashlar-npm-provenance.json
- Capsule Sigstore verification: reports/ashlar-public-trust.json
- Release SBOM:
- Release SBOM attestation:
- Release trust bundle:
- Release trust reviewer checklist:
- Supply-chain incident playbook:
- GitHub workflow run:

## Command Output

```text
ashlar release provenance-verify-public --package @ashlar/cli@<version> @ashlar/schemas@<version>
ashlar release provenance-verify-public --package @ashlar/cli@<version> @ashlar/schemas@<version> --json > reports/ashlar-npm-provenance.json
ashlar release public-trust-verify --registry ./registry
ashlar release public-trust-verify --registry ./registry --json > reports/ashlar-public-trust.json
ashlar release verify-trust-bundle --bundle <bundle> --registry ./registry --sbom <sbom> --attestation <attestation>
```

Result:

## Findings

- Blocking findings:
- Non-blocking findings:
- Follow-up required:

## Decision

Decision: pass | blocked

Rationale:

## Links

- GitHub issue:
- Pull request:
- Published npm package:
- Workflow artifact:
