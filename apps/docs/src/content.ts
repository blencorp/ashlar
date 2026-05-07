export type CommandStep = {
  label: string;
  command: string;
  note: string;
};

export type DocPage = {
  id: string;
  nav: string;
  title: string;
  summary: string;
  intent: string;
  commands: CommandStep[];
  checkpoints: string[];
  links: Array<{ label: string; href: string }>;
};

const repoBlob = (path: string) => `https://github.com/blencorp/ashlar/blob/main/${path}`;
const repoTree = (path: string) => `https://github.com/blencorp/ashlar/tree/main/${path}`;

export const claimBoundary = {
  status:
    "Ashlar is a v0.0 prototype. STATUS.md is canonical when docs, demos, or roadmap language disagree.",
  allowed: "USWDS-compatible audit, migration, and source-capsule prototype for public-service UI.",
  blocked:
    "Do not claim USWDS replacement, public-alpha readiness, stable accessible components, public npm provenance, or public capsule Sigstore trust until strict readiness passes.",
};

export const pages: DocPage[] = [
  {
    id: "install",
    nav: "Install",
    title: "Install and inspect",
    summary:
      "Start from a local checkout, build the CLI once, then inspect the project before writing files.",
    intent:
      "Ashlar's first-run path should feel like shadcn/ui in speed, but it starts with a read-only status check so teams see trust, evidence, and registry state before source code is copied.",
    commands: [
      {
        label: "Install workspace dependencies",
        command: "pnpm install",
        note: "Uses the pinned workspace package manager and Node 24.15.0 baseline.",
      },
      {
        label: "Build the CLI",
        command: "pnpm --filter @ashlar/cli build",
        note: "Creates packages/cli/dist so local docs and examples can call the same binary CI uses.",
      },
      {
        label: "Read the current state",
        command: "node packages/cli/dist/index.js status --registry ./registry",
        note: "Reports initialization state, registry coverage, stable-evidence blockers, and next commands.",
      },
    ],
    checkpoints: [
      "No package publication is assumed.",
      "No source files are copied before the user chooses an add command.",
      "The status output must not hide external proof blockers.",
    ],
    links: [
      { label: "STATUS.md", href: repoBlob("STATUS.md") },
      { label: "Tooling baseline", href: repoBlob("docs/architecture/tooling-baseline.md") },
    ],
  },
  {
    id: "audit",
    nav: "Audit",
    title: "Run the first audit",
    summary:
      "Use Ashlar as a validator before adopting capsules. Existing federal markup can be inspected without installing a component.",
    intent:
      "The validator wedge is the safest entry point for contractors and agency teams because it surfaces concrete page-shell, USWDS, and component-contract findings in CI.",
    commands: [
      {
        label: "Audit a compliant reference page",
        command:
          "node packages/cli/dist/index.js audit --policy federal --explain examples/plain-html/index.html",
        note: "Shows the expected zero-finding path for a minimal federal page shell.",
      },
      {
        label: "Audit a legacy federal fixture",
        command:
          "node packages/cli/dist/index.js audit --policy federal --explain examples/legacy-federal-project/index.html",
        note: "Demonstrates adoption-wedge findings without requiring Ashlar components.",
      },
      {
        label: "Audit a service-flow proof",
        command:
          "node packages/cli/dist/index.js audit --policy all --registry ./registry examples/service-flow/benefit-application.pass.html",
        note: "Runs federal page-shell and component anti-pattern rules together.",
      },
    ],
    checkpoints: [
      "Federal policy findings carry standard status metadata.",
      "Component findings come from registry CEM anti-patterns.",
      "SARIF artifacts are produced in CI for code-scanning systems.",
    ],
    links: [
      { label: "Validation architecture", href: repoBlob("docs/architecture/validation.md") },
      { label: "Legacy fixture", href: repoTree("examples/legacy-federal-project") },
    ],
  },
  {
    id: "add",
    nav: "Add",
    title: "Add source capsules",
    summary:
      "Install capsules as source only after search, suggest, and migration output have shown what the registry can actually provide.",
    intent:
      "Ashlar keeps the source ownership that made shadcn/ui popular, but it records hashes, evidence, CEM contracts, and update metadata so source copies can be verified later.",
    commands: [
      {
        label: "Search registry metadata",
        command: "node packages/cli/dist/index.js search button --registry ./registry",
        note: "Returns policy, feature, layer, stability, evidence, and install command context.",
      },
      {
        label: "Ask for a task suggestion",
        command:
          'node packages/cli/dist/index.js suggest "Build a benefits application form" --registry ./registry',
        note: "Maps a public-service task to available capsules and explicit capability gaps.",
      },
      {
        label: "Preview installer writes",
        command: "node packages/cli/dist/index.js add button --dry-run --diff",
        note: "Verifies the capsule first, then shows planned writes and diffs without touching source.",
      },
      {
        label: "Install the core form path",
        command:
          "node packages/cli/dist/index.js add form-field text-input textarea date-input select radio-group checkbox button alert error-summary identifier",
        note: "Copies source, CEM, evidence, styles, lockfile entries, and agent instructions.",
      },
    ],
    checkpoints: [
      "Add fails when registry capsule hashes or signatures do not verify.",
      "Generated AGENTS.md and DESIGN.md tell AI tools which capsules are installed.",
      "Unavailable primitives should remain explicit gaps, not invented code.",
    ],
    links: [
      { label: "Capsule architecture", href: repoBlob("docs/architecture/capsule.md") },
      { label: "AI-native architecture", href: repoBlob("docs/architecture/ai-native.md") },
    ],
  },
  {
    id: "verify-update",
    nav: "Verify and update",
    title: "Verify before changing source",
    summary:
      "Ashlar's difference from a one-time source copy is the lockfile, capsule hashes, and cautious update path.",
    intent:
      "A government team should be able to customize source while still proving what came from upstream and whether a future update is safe to apply.",
    commands: [
      {
        label: "Verify installed source",
        command: "node packages/cli/dist/index.js verify",
        note: "Checks installed file hashes, registry manifests, index-pinned hashes, and signatures.",
      },
      {
        label: "Mirror the registry",
        command:
          "node packages/cli/dist/index.js registry mirror --registry ./registry --output ./ashlar-mirror",
        note: "Copies only a registry that passes capsule verification.",
      },
      {
        label: "Apply an upstream update",
        command: "node packages/cli/dist/index.js update button --yes",
        note: "Runs a three-way merge path and requires explicit approval for accessibility-critical files.",
      },
    ],
    checkpoints: [
      "Failed verify does not rewrite the lockfile into a false clean state.",
      "Accessibility-critical updates expose a review summary before writes.",
      "Offline mirrors are built from verified local registry material.",
    ],
    links: [
      { label: "Drift and updates", href: repoBlob("docs/architecture/drift-and-updates.md") },
      {
        label: "Distribution and registry",
        href: repoBlob("docs/architecture/distribution-and-registry.md"),
      },
    ],
  },
  {
    id: "themes",
    nav: "Themes",
    title: "Sync agency themes",
    summary:
      "Theme JSON is a contract: Ashlar validates required semantic tokens and generates CSS, Tailwind v4 output, and typed token helpers.",
    intent:
      "Agency teams should integrate existing brand sources without making Tailwind the component authoring layer or hard-coding colors into generated UI.",
    commands: [
      {
        label: "Sync theme outputs",
        command: "node packages/cli/dist/index.js theme sync",
        note: "Writes theme.css, tailwind-theme.css, and tokens.ts from local token JSON.",
      },
      {
        label: "Validate token contrast",
        command: "node packages/cli/dist/index.js theme validate",
        note: "Checks schema shape, required semantic tokens, and action color contrast.",
      },
      {
        label: "Build the Tailwind proof",
        command: "pnpm --filter @ashlar/example-vite build",
        note: "Proves Tailwind v4 can consume Ashlar's generated @theme output.",
      },
    ],
    checkpoints: [
      "Stock Default, VA, and USDA themes are illustrative, not official agency guidance.",
      "Generated token helpers are implementation outputs, not design authority.",
      "Theme switching must not remove focus or forced-colors behavior.",
    ],
    links: [
      { label: "Token architecture", href: repoBlob("docs/architecture/tokens.md") },
      { label: "Vite theme example", href: repoTree("examples/vite") },
    ],
  },
  {
    id: "ai",
    nav: "AI workflow",
    title: "Ground AI-generated UI",
    summary:
      "Ashlar gives coding agents registry facts, validation tools, and deterministic evals so generated public-service UI is checked against executable contracts.",
    intent:
      "The AI-native claim is useful only when agents can inspect installed capsules and validate output. Ashlar keeps v0.0 read-only until write tools have a separate threat model.",
    commands: [
      {
        label: "Start local MCP",
        command: "node packages/cli/dist/index.js mcp",
        note: "Runs the read-only local stdio server for registry, token, evidence, and validation tools.",
      },
      {
        label: "Run saved-output eval",
        command:
          "node packages/cli/dist/index.js ai-eval --suite examples/ai-eval/ashlar-ai-eval.json --registry ./registry",
        note: "Checks deterministic saved outputs against expected policy findings.",
      },
      {
        label: "Run generated-output corpus",
        command:
          "node packages/cli/dist/index.js ai-eval --suite examples/ai-eval/generated-output-corpus/ashlar-generated-output-corpus.json --registry ./registry",
        note: "Runs the seed public-service prompt corpus added for AI readiness review.",
      },
    ],
    checkpoints: [
      "The corpus is a seed corpus, not a broad model benchmark.",
      "Hosted MCP and write-capable tools are blocked until their threat model exists.",
      "Generated UI should fail loudly when it hallucinates unavailable capsules.",
    ],
    links: [
      { label: "AI-native architecture", href: repoBlob("docs/architecture/ai-native.md") },
      {
        label: "Generated-output corpus",
        href: repoTree("examples/ai-eval/generated-output-corpus"),
      },
    ],
  },
  {
    id: "trust",
    nav: "Trust and evidence",
    title: "Read the proof gates",
    summary:
      "Ashlar intentionally distinguishes local preparation from public proof. Strict readiness must fail until real evidence, reviews, provenance, and Sigstore trust exist.",
    intent:
      "Public-service teams need a library that says what is proven and what is not. A failed readiness gate is useful when it names the missing external proof.",
    commands: [
      {
        label: "Check strict readiness",
        command: "node packages/cli/dist/index.js release readiness --registry ./registry --json",
        note: "Expected today: fail on stable evidence, external review proof, npm provenance, and public Sigstore trust.",
      },
      {
        label: "Map the proof actions",
        command:
          "node packages/cli/dist/index.js release proof-plan --registry ./registry --output reports/proof-action-plan.md",
        note: "Turns the current blockers into issue-linked reviewer tracks and exact artifact commands.",
      },
      {
        label: "Prepare Button review intake",
        command:
          "node packages/cli/dist/index.js evidence prepare-stable button --registry ./registry --fixture registry/components/button/0.0.1/button.html --output reports/button-stable-review",
        note: "Writes reviewer intake; it does not create stable evidence.",
      },
      {
        label: "Generate release review pack",
        command:
          "node packages/cli/dist/index.js release review-pack --registry ./registry --output reports/review-pack",
        note: "Collects readiness, evidence, AI, bundle, SBOM, trust, and reviewer checklist artifacts.",
      },
    ],
    checkpoints: [
      "At least one L0 stable-evidence packet needs real keyboard and screen-reader review.",
      "External review records must be completed under docs/reviews/ before proof gates pass.",
      "Public npm provenance and public capsule Sigstore trust require real release artifacts.",
    ],
    links: [
      { label: "External review plan", href: repoBlob("docs/roadmap/external-review-plan.md") },
      {
        label: "Objective completion audit",
        href: repoBlob("docs/roadmap/objective-completion-audit.md"),
      },
    ],
  },
];

export function pageById(id: string): DocPage {
  return pages.find((page) => page.id === id) ?? pages[0] ?? unreachable();
}

function unreachable(): never {
  throw new Error("Ashlar docs requires at least one page.");
}
