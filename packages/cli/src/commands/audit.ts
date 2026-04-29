import { existsSync, readFileSync } from "node:fs";
import type { Command } from "commander";
import fg from "fast-glob";
import { auditFederalHtml, type PolicyFinding } from "../lib/policy/federal.js";
import { toSarif } from "../lib/sarif.js";

type AuditOptions = {
  explain?: boolean;
  policy?: string;
  sarif?: boolean;
};

function findHtmlFiles(cwd: string): string[] {
  return fg.sync("**/*.html", {
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
    }
  }
}

export function registerAuditCommand(program: Command) {
  program
    .command("audit")
    .description("Validate Ashlar usage")
    .argument("[files...]", "Files to audit")
    .option("--explain", "Print explanatory help for findings")
    .option("--policy <name>", "Run a named policy pack")
    .option("--sarif", "Emit SARIF")
    .action((files: string[] | undefined, options: AuditOptions) => {
      if (options.policy && options.policy !== "federal") {
        console.error(`Unknown Ashlar policy pack: ${options.policy}`);
        process.exitCode = 1;
        return;
      }

      if (options.policy === "federal") {
        const targets = files && files.length > 0 ? files : findHtmlFiles(process.cwd());
        const findings = auditFederalFiles(targets);

        if (options.sarif) {
          console.log(JSON.stringify(toSarif(findings), null, 2));
        } else {
          printFindings(findings, Boolean(options.explain));
        }

        if (findings.some((finding) => finding.level === "error")) {
          process.exitCode = 1;
        }
        return;
      }

      if (options.sarif) {
        console.log(JSON.stringify(toSarif([]), null, 2));
        return;
      }

      console.log("No findings");
    });
}
