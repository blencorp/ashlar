import type { Command } from "commander";
import {
  isKnownAuditPolicy,
  knownAuditPolicies,
  runAudit,
  type AuditPolicy,
} from "../lib/audit-runner.js";
import { defaultRegistryPath } from "../lib/default-registry.js";
import type { PolicyFinding } from "../lib/policy/federal.js";
import { toSarif } from "../lib/sarif.js";

type AuditOptions = {
  explain?: boolean;
  policy?: string;
  sarif?: boolean;
  registry?: string;
};

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
    .option("--registry <path>", "Registry path or built-in registry alias")
    .action((files: string[] | undefined, options: AuditOptions) => {
      if (options.policy && !isKnownAuditPolicy(options.policy)) {
        console.error(`Unknown Ashlar policy pack: ${options.policy}`);
        console.error(`Known policies: ${[...knownAuditPolicies].sort().join(", ")}`);
        process.exitCode = 1;
        return;
      }

      const registryPath = options.registry ?? defaultRegistryPath();
      const cwd = process.cwd();
      const policy = (options.policy ?? null) as AuditPolicy | null;
      const findings = policy ? runAudit({ cwd, files, policy, registryPath }) : [];

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
