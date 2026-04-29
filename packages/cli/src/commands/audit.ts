import { existsSync, readFileSync } from "node:fs";
import type { Command } from "commander";
import fg from "fast-glob";
import { auditFile, type ComponentRule } from "../lib/policy/component.js";
import { auditFederalHtml, type PolicyFinding } from "../lib/policy/federal.js";
import { listComponents, getComponent } from "../lib/registry.js";
import { toSarif } from "../lib/sarif.js";

type AuditOptions = {
  explain?: boolean;
  policy?: string;
  sarif?: boolean;
  registry?: string;
};

const knownPolicies = new Set(["federal", "components", "all"]);

function findHtmlFiles(cwd: string): string[] {
  return fg.sync("**/*.html", {
    cwd,
    onlyFiles: true,
    ignore: ["**/.git/**", "**/node_modules/**", "**/dist/**", "**/.turbo/**", "**/coverage/**"],
  });
}

function findComponentTargetFiles(cwd: string): string[] {
  return fg.sync("**/*.{html,tsx,jsx,css}", {
    cwd,
    onlyFiles: true,
    ignore: ["**/.git/**", "**/node_modules/**", "**/dist/**", "**/.turbo/**", "**/coverage/**"],
  });
}

function auditFederalFiles(files: string[]): PolicyFinding[] {
  const findings: PolicyFinding[] = [];

  for (const file of files) {
    if (!existsSync(file)) {
      findings.push({
        ruleId: "ashlar/file-not-found",
        message: `Audit target not found: ${file}`,
        file,
        level: "error",
        standardStatus: "required",
        helpUri: "https://ashlar.dev/docs/audit",
      });
      continue;
    }

    findings.push(...auditFederalHtml(readFileSync(file, "utf8"), file));
  }

  return findings;
}

function loadComponentRules(cwd: string, registryPath: string): ComponentRule[] {
  const rules: ComponentRule[] = [];

  let components: ReturnType<typeof listComponents>;
  try {
    components = listComponents(cwd, registryPath);
  } catch {
    return rules;
  }

  for (const item of components) {
    let detail: ReturnType<typeof getComponent>;
    try {
      detail = getComponent(cwd, item.name, registryPath);
    } catch {
      continue;
    }

    const declarations = detail.cem.modules?.flatMap((module) => module.declarations ?? []) ?? [];
    for (const declaration of declarations) {
      const ashlar = declaration._ashlar as
        | { antiPatterns?: ComponentRule["antiPattern"][] }
        | undefined;
      if (!ashlar?.antiPatterns) {
        continue;
      }

      for (const antiPattern of ashlar.antiPatterns) {
        if (!antiPattern || typeof antiPattern !== "object") {
          continue;
        }
        if (!Array.isArray(antiPattern.languages) || antiPattern.languages.length === 0) {
          continue;
        }
        rules.push({
          componentName: item.name,
          componentVersion: detail.version,
          antiPattern,
        });
      }
    }
  }

  return rules;
}

function auditComponentFiles(cwd: string, registryPath: string, files: string[]): PolicyFinding[] {
  const rules = loadComponentRules(cwd, registryPath);
  if (rules.length === 0) {
    return [];
  }

  const findings: PolicyFinding[] = [];
  for (const file of files) {
    if (!existsSync(file)) {
      findings.push({
        ruleId: "ashlar/file-not-found",
        message: `Audit target not found: ${file}`,
        file,
        level: "error",
        standardStatus: "required",
        helpUri: "https://ashlar.dev/docs/audit",
      });
      continue;
    }

    findings.push(
      ...auditFile(readFileSync(file, "utf8"), file, {
        rules,
        configuredLanguages: new Set(),
      }),
    );
  }

  return findings;
}

function printFindings(findings: PolicyFinding[], explain: boolean): void {
  if (findings.length === 0) {
    console.log("No findings");
    return;
  }

  for (const finding of findings) {
    console.log(`${finding.level.toUpperCase()} ${finding.file} ${finding.ruleId}`);
    console.log(`  ${finding.message}`);

    if (explain) {
      console.log(`  Standard status: ${finding.standardStatus}`);
      console.log(`  Help: ${finding.helpUri}`);
      if (finding.evidence) {
        console.log(`  Evidence: ${finding.evidence}`);
      }
      if (finding.region) {
        console.log(
          `  Location: ${finding.file}:${finding.region.startLine}:${finding.region.startColumn}`,
        );
      }
      if (finding.tags?.length) {
        console.log(`  Tags: ${finding.tags.join(", ")}`);
      }
    }
  }
}

export function registerAuditCommand(program: Command) {
  program
    .command("audit")
    .description("Validate Ashlar usage")
    .argument("[files...]", "Files to audit")
    .option("--explain", "Print explanatory help for findings")
    .option("--policy <name>", "Run a named policy pack: federal, components, or all")
    .option("--sarif", "Emit SARIF")
    .option("--registry <path>", "Registry path (defaults to ./registry)")
    .action((files: string[] | undefined, options: AuditOptions) => {
      if (options.policy && !knownPolicies.has(options.policy)) {
        console.error(`Unknown Ashlar policy pack: ${options.policy}`);
        console.error(`Known policies: ${[...knownPolicies].sort().join(", ")}`);
        process.exitCode = 1;
        return;
      }

      const registryPath = options.registry ?? "./registry";
      const cwd = process.cwd();
      const policy = options.policy ?? null;

      const findings: PolicyFinding[] = [];

      if (policy === "federal" || policy === "all") {
        const targets = files && files.length > 0 ? files : findHtmlFiles(cwd);
        findings.push(...auditFederalFiles(targets));
      }

      if (policy === "components" || policy === "all") {
        const targets = files && files.length > 0 ? files : findComponentTargetFiles(cwd);
        findings.push(...auditComponentFiles(cwd, registryPath, targets));
      }

      if (options.sarif) {
        console.log(JSON.stringify(toSarif(findings), null, 2));
      } else if (policy === null) {
        console.log(
          "No policy selected. Pass --policy federal, --policy components, or --policy all.",
        );
      } else {
        printFindings(findings, Boolean(options.explain));
      }

      if (findings.some((finding) => finding.level === "error")) {
        process.exitCode = 1;
      }
    });
}
