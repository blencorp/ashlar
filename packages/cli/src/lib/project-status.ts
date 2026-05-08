import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { checkExternalReviewRecords } from "./external-review-record.js";
import { formatRegistryLayerCapsules } from "./layers.js";
import { defaultRegistryPath, isDefaultRegistryAlias } from "./default-registry.js";
import {
  defaultConfig,
  normalizeConfig,
  type AshlarConfig,
  type AshlarLockfile,
  type ResolvedAshlarConfig,
} from "./project.js";
import { getComponent, listComponents, resolveRegistryRoot } from "./registry.js";

export type ProjectStatusLevel = "pass" | "action" | "blocked";

export type ProjectStatusCheck = {
  id: string;
  status: ProjectStatusLevel;
  summary: string;
  details: string[];
};

export type ProjectStatusAction = {
  command: string;
  reason: string;
};

export type ProjectStatusReport = {
  schemaVersion: "1.0";
  status: "ready" | "action-needed" | "blocked";
  project: {
    initialized: boolean;
    configPath: string;
    lockfilePath: string;
    registry: string;
    componentsDir: string;
    installedComponents: Array<{
      name: string;
      version: string;
      stability?: string;
    }>;
  };
  registry: {
    available: boolean;
    componentCount: number;
    markupPrimitiveCount: number;
    stableEvidenceMarkupPrimitiveCount: number;
  };
  checks: ProjectStatusCheck[];
  nextActions: ProjectStatusAction[];
};

type ProjectStatusInput = {
  cwd: string;
  registryPath?: string;
};

function readProjectConfig(cwd: string): { config: ResolvedAshlarConfig; initialized: boolean } {
  const path = join(cwd, "ashlar.config.json");
  if (!existsSync(path)) {
    return { config: defaultConfig(), initialized: false };
  }

  return {
    config: normalizeConfig(JSON.parse(readFileSync(path, "utf8")) as AshlarConfig),
    initialized: true,
  };
}

function readProjectLockfile(cwd: string): { lockfile: AshlarLockfile; exists: boolean } {
  const path = join(cwd, "ashlar-lock.json");
  if (!existsSync(path)) {
    return {
      exists: false,
      lockfile: { version: "1", registry: defaultRegistryPath(), components: {} },
    };
  }

  return {
    exists: true,
    lockfile: JSON.parse(readFileSync(path, "utf8")) as AshlarLockfile,
  };
}

function check(
  id: string,
  status: ProjectStatusLevel,
  summary: string,
  details: string[] = [],
): ProjectStatusCheck {
  return { id, status, summary, details };
}

function addAction(actions: ProjectStatusAction[], command: string, reason: string): void {
  if (actions.some((action) => action.command === command)) {
    return;
  }

  actions.push({ command, reason });
}

function overallStatus(checks: ProjectStatusCheck[]): ProjectStatusReport["status"] {
  if (checks.some((item) => item.status === "blocked")) {
    return "blocked";
  }
  if (checks.some((item) => item.status === "action")) {
    return "action-needed";
  }
  return "ready";
}

export function buildProjectStatus(input: ProjectStatusInput): ProjectStatusReport {
  const { config, initialized } = readProjectConfig(input.cwd);
  const { exists: lockfileExists, lockfile } = readProjectLockfile(input.cwd);
  const registryPath = input.registryPath ?? config.registry;
  const installedComponents = Object.entries(lockfile.components)
    .map(([name, item]) => ({
      name,
      stability: item.stability,
      version: item.version,
    }))
    .sort((a, b) => a.name.localeCompare(b.name));
  const checks: ProjectStatusCheck[] = [];
  const nextActions: ProjectStatusAction[] = [];

  checks.push(
    initialized && lockfileExists
      ? check("project-initialized", "pass", "Ashlar config and lockfile are present.")
      : check("project-initialized", "action", "Ashlar is not initialized in this project.", [
          "ashlar.config.json and ashlar-lock.json are both expected for project-local guidance.",
        ]),
  );
  if (!initialized || !lockfileExists) {
    addAction(
      nextActions,
      isDefaultRegistryAlias(registryPath)
        ? "ashlar init"
        : `ashlar init --registry ${registryPath}`,
      "Create config, lockfile, themes, AGENTS.md, and DESIGN.md.",
    );
  }

  checks.push(
    installedComponents.length > 0
      ? check(
          "installed-capsules",
          "pass",
          `${installedComponents.length} Ashlar capsule(s) are installed.`,
          installedComponents.map(
            (component) =>
              `${component.name}@${component.version}${component.stability ? ` (${component.stability})` : ""}`,
          ),
        )
      : check("installed-capsules", "action", "No Ashlar capsules are installed yet.", [
          "Use search or suggest before adding source-owned capsules.",
        ]),
  );
  if (installedComponents.length === 0) {
    addAction(
      nextActions,
      'ashlar suggest "Build a benefits application form"',
      "Discover the current capsule set and any missing capability gaps.",
    );
    addAction(
      nextActions,
      "ashlar migrate uswds <legacy-file-or-glob>",
      "Map existing USWDS markup to available Ashlar capsules and explicit gaps before rewriting.",
    );
    addAction(
      nextActions,
      "ashlar add banner form-field text-input textarea date-input select radio-group checkbox button error-summary alert identifier",
      "Install the first signed source-owned service-flow building blocks.",
    );
  } else {
    addAction(
      nextActions,
      "ashlar verify",
      "Check local files against the Ashlar lockfile and signed registry.",
    );
    addAction(
      nextActions,
      "ashlar audit --policy all <path-or-glob>",
      "Validate current markup against federal and component policy rules.",
    );
  }

  let registryAvailable = false;
  let componentCount = 0;
  let markupPrimitiveCount = 0;
  let stableEvidenceMarkupPrimitiveCount = 0;
  try {
    const components = listComponents(input.cwd, registryPath).map((component) =>
      getComponent(input.cwd, component.name, registryPath),
    );
    registryAvailable = true;
    componentCount = components.length;
    markupPrimitiveCount = components.filter(
      (component) => component.layer === "markup-primitives",
    ).length;
    stableEvidenceMarkupPrimitiveCount = components.filter(
      (component) =>
        component.layer === "markup-primitives" &&
        component.evidence.stability === "stable" &&
        component.evidence.accessibilityStatus === "stable-evidence",
    ).length;

    checks.push(
      check(
        "registry-available",
        "pass",
        `Registry is readable with ${componentCount} capsule(s).`,
        [resolveRegistryRoot(input.cwd, registryPath)],
      ),
    );
    checks.push(
      markupPrimitiveCount >= 5
        ? check(
            "markup-coverage",
            "pass",
            `${markupPrimitiveCount} ${formatRegistryLayerCapsules("markup-primitives")} are available.`,
          )
        : check(
            "markup-coverage",
            "action",
            `Only ${markupPrimitiveCount} ${formatRegistryLayerCapsules("markup-primitives")} are available.`,
            ["Replacement-grade coverage needs a broader markup primitive surface."],
          ),
    );
    checks.push(
      stableEvidenceMarkupPrimitiveCount > 0
        ? check(
            "stable-markup-evidence",
            "pass",
            `${stableEvidenceMarkupPrimitiveCount} ${formatRegistryLayerCapsules("markup-primitives")} have stable evidence.`,
          )
        : check(
            "stable-markup-evidence",
            "blocked",
            `No markup primitive capsule has stable evidence yet.`,
            [
              "Generated reviewer bundles are preparation only; real keyboard and screen-reader review remains required.",
            ],
          ),
    );
    if (stableEvidenceMarkupPrimitiveCount === 0) {
      addAction(
        nextActions,
        `ashlar evidence prepare-stable-all --registry ${registryPath} --output reports/markup-primitive-stable-review`,
        "Prepare reviewer intake bundles for all markup primitive capsules without claiming stable evidence.",
      );
    }
  } catch (error) {
    checks.push(
      check("registry-available", "blocked", "Ashlar registry is not readable.", [
        error instanceof Error ? error.message : String(error),
      ]),
    );
  }

  const externalReview = checkExternalReviewRecords({ cwd: input.cwd });
  checks.push(
    externalReview.status === "pass"
      ? check(
          "external-review-proof",
          "pass",
          "Completed external review records exist for stable evidence, release trust, and design partner review.",
          externalReview.records.map((record) => record.file),
        )
      : check("external-review-proof", "blocked", "External review proof is incomplete.", [
          ...externalReview.missing,
          "Do not create placeholder docs/reviews records.",
        ]),
  );
  if (externalReview.status === "fail") {
    addAction(
      nextActions,
      "ashlar release design-partner-checklist --output reports/ashlar-design-partner-checklist.md",
      "Prepare design-partner review material; strict readiness still needs a real reviewer record.",
    );
    addAction(
      nextActions,
      "ashlar release review-record-check",
      "Preflight completed external review records before release readiness counts them.",
    );
  }

  addAction(
    nextActions,
    `ashlar release readiness --registry ${registryPath} --report reports/release-readiness.md --json-output reports/release-readiness.json`,
    "Run the strict replacement-grade gate and keep public claims bounded to its result.",
  );

  return {
    schemaVersion: "1.0",
    status: overallStatus(checks),
    project: {
      initialized: initialized && lockfileExists,
      configPath: join(input.cwd, "ashlar.config.json"),
      lockfilePath: join(input.cwd, "ashlar-lock.json"),
      registry: registryPath,
      componentsDir: config.componentsDir,
      installedComponents,
    },
    registry: {
      available: registryAvailable,
      componentCount,
      markupPrimitiveCount,
      stableEvidenceMarkupPrimitiveCount,
    },
    checks,
    nextActions,
  };
}
