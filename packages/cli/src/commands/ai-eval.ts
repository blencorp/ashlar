import type { Command } from "commander";
import { runAiEvalSuite } from "../lib/ai-eval.js";

type AiEvalOptions = {
  json?: boolean;
  registry?: string;
  suite: string;
};

export function registerAiEvalCommand(program: Command) {
  program
    .command("ai-eval")
    .description("Run saved AI-generated UI outputs against Ashlar validation expectations")
    .requiredOption("--suite <path>", "AI eval suite JSON file")
    .option("--registry <path>", "Registry path (defaults to ./registry)")
    .option("--json", "Print the structured JSON report")
    .action((options: AiEvalOptions) => {
      try {
        const report = runAiEvalSuite({
          cwd: process.cwd(),
          registryPath: options.registry ?? "./registry",
          suitePath: options.suite,
        });

        if (options.json) {
          console.log(JSON.stringify(report, null, 2));
        } else {
          printTextReport(report);
        }

        if (report.status === "fail") {
          process.exitCode = 1;
        }
      } catch (error) {
        console.error(error instanceof Error ? error.message : String(error));
        process.exitCode = 1;
      }
    });
}

function printTextReport(report: ReturnType<typeof runAiEvalSuite>): void {
  const label = report.status === "pass" ? "passed" : "failed";
  const count = report.status === "pass" ? report.summary.total : report.summary.failed;
  console.log(`AI eval ${label}: ${count} case(s)`);

  for (const testCase of report.cases) {
    const marker = testCase.status === "pass" ? "PASS" : "FAIL";
    console.log(`${marker} ${testCase.id}`);
    for (const failure of testCase.failures) {
      console.log(`  - ${failure}`);
    }
  }
}
