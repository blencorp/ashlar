# Generated Output Corpus

This directory is a small, fixed corpus for checking whether Ashlar catches common AI-generated public-service UI failures. It is not a live-model benchmark and must not be used to claim broad model quality.

## Methodology

- Prompts are stored in `prompts.json`.
- Fixtures are stored in `fixtures/`.
- Provenance is stored in `metadata.json`.
- The runnable suite is `ashlar-generated-output-corpus.json`.

Each prompt has a grounded fixture generated with Ashlar registry, CEM, audit, and federal page-shell context available, plus an ungrounded counterexample fixture that intentionally omits or hallucinates required contracts. The ungrounded fixtures are expected to fail validation with specific findings; the eval passes only when those findings remain visible.

Run locally:

```sh
node packages/cli/dist/index.js ai-eval --suite examples/ai-eval/generated-output-corpus/ashlar-generated-output-corpus.json --registry ./registry
```

## Limitations

- This seed corpus was generated in one Codex session on 2026-05-06.
- It covers five public-service prompt categories, not the full range of agency applications.
- It tests Ashlar validator grounding and regression behavior, not comparative model performance.
- Future corpus additions should add independent model/tool outputs with their own provenance entries.
