# Supply-Chain Incident Playbook

Status: v0.0 operational draft  
Owner: Ashlar maintainers  
Scope: npm packages, registry capsules, release artifacts, trust roots, and generated evidence artifacts.

This playbook defines what maintainers do when Ashlar's release, registry, signing, or evidence chain may be compromised. It is intentionally conservative: when provenance is uncertain, stop publishing and make verification fail closed.

## Triage Triggers

Open an incident when any of these occur:

- npm package ownership, maintainer account, trusted publisher, or package metadata changes unexpectedly.
- A published tarball hash differs from the release SBOM or local `release:smoke` output.
- `ashlar verify`, `ashlar registry mirror`, or `ashlar release verify-trust-bundle` reports capsule hash, manifest, signature, trust-root, SBOM, or attestation drift.
- A registry capsule, evidence transcript, CEM, codemod, or policy rule is found to be malicious, unauthorized, or materially different from reviewed source.
- A signing key, GitHub release workflow, npm trusted publisher configuration, maintainer device, or CI environment is suspected compromised.
- A downstream consumer reports reproducible install/update behavior that cannot be explained by a known release.

## Severity Levels

- **SEV-1 package compromise**: npm package, release workflow, signing identity, or registry trust root is actively compromised or likely compromised.
- **SEV-2 registry compromise**: capsule manifest, capsule source, evidence, codemod, or registry index drift is detected, but npm package integrity is not yet implicated.
- **SEV-3 evidence or policy defect**: evidence, accessibility status, or audit rules are wrong enough to mislead consumers, but no malicious release path is suspected.
- **SEV-4 advisory**: documentation, metadata, or trust material needs correction without known consumer exposure.

## Immediate Containment

For SEV-1 or SEV-2:

1. Freeze all release, publish, evidence-publish, registry-mirror, and signing work.
2. Disable or remove npm trusted publishers for affected packages until the release path is understood.
3. Protect the repository branch and block manual workflow dispatches that can publish or sign.
4. Preserve evidence: workflow run IDs, Git commits, npm package versions, tarball shasums, registry index hash, trust-root hash, capsule hashes, SBOM, attestation, and local logs.
5. Reproduce the failure from a fresh checkout and a clean consumer project.
6. Publish an initial advisory if consumers may be exposed, even before root cause is complete.

For SEV-3:

1. Freeze the affected component's stability graduation and evidence publication.
2. Mark the component `known-issue` or downgrade stability if the current packet overclaims.
3. Prepare corrected evidence or rules through the normal review path.

## Consumer Detection

Ask consumers to collect these artifacts before changing local state:

```bash
npx ashlar verify
npx ashlar registry mirror --registry <current-registry> --output ./ashlar-registry-snapshot
npx ashlar evidence --check --registry <current-registry>
npx ashlar release verify-trust-bundle \
  --registry <current-registry> \
  --bundle <release-trust-bundle.json> \
  --sbom <ashlar-sbom.spdx.json> \
  --attestation <ashlar-sbom.attestation.json>
npm audit signatures
```

Consumers should preserve `ashlar-lock.json`, installed `src/ashlar/**` files, `package-lock.json` / `pnpm-lock.yaml`, CI logs, and the exact package manager command used to install or update Ashlar.

## Credential And Key Rotation

Rotate in this order:

1. GitHub maintainer sessions, fine-grained tokens, deploy keys, and repository secrets.
2. npm maintainer sessions, package access, organization membership, and trusted publisher records.
3. Local Ed25519 registry keys used by the prototype.
4. Future Sigstore/TUF trust material, Rekor inclusion expectations, and signed mirror metadata.
5. Any third-party tokens used only for release evidence, SBOM upload, or artifact publishing.

After rotation, publish a new trust root and make older compromised roots fail verification. If compromise scope is unclear, assume all roots active during the window are unsafe.

## Revocation And Trust Root Updates

Every revocation advisory must include:

- Affected package names and versions.
- Affected registry index hash, trust-root hash, and capsule hashes.
- The first known-good package version and registry index hash.
- The revoked key IDs or trusted publisher configuration.
- Commands consumers can run to detect exposure.
- Expected `ashlar verify` or `release verify-trust-bundle` failure text.
- Upgrade or rollback guidance.

For local Ed25519 prototype trust roots, commit the replacement `registry/trust-root.json`, re-sign affected capsule manifests, update `registry/index.json`, and run the registry, evidence, bundle, release, and mirror verification checks before publication.

For future Sigstore/TUF trust roots, publish signed replacement metadata and document Rekor/TUF material required for offline verification.

## Public Disclosure Timeline

- **0-2 hours**: acknowledge investigation when consumer exposure is plausible.
- **0-8 hours**: publish affected versions, temporary mitigation, and verification commands.
- **0-24 hours**: publish root-cause status, rotated trust material, and known-good version guidance.
- **0-72 hours**: publish full incident report or explain why investigation remains open.
- **Within 14 days**: publish post-incident actions and any process changes.

Do not wait for perfect root cause before telling consumers how to stop using suspect artifacts.

## Consumer Remediation

Recommended order for consumers:

1. Stop running `ashlar add`, `ashlar update`, and package upgrades until the advisory names a known-good version.
2. Run `ashlar verify` and preserve the output.
3. Pin to the known-good `@ashlar/cli` and `@ashlar/schemas` versions.
4. Replace the registry mirror or trust root with the advisory-provided known-good material.
5. Re-run `ashlar verify`, `ashlar evidence --check`, and project tests.
6. Review local diffs in installed Ashlar source before merging regenerated files.

If installed files were generated from a compromised capsule, treat them as source code changes from an untrusted contributor and review or revert them accordingly.

## Post-Incident Review

The final report must include:

- Timeline from first signal through containment and recovery.
- Affected artifacts and consumers.
- Root cause and contributing controls that failed.
- Verification commands that would have caught the issue earlier.
- Changes to release workflow, trust-root policy, evidence gates, package access, or maintainer review.
- Follow-up owners and due dates.

Readiness cannot return to replacement-grade until the follow-up controls are implemented and `ashlar release readiness` passes the relevant local gates.
