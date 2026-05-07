import type { Command } from "commander";
import { checkBundleBudget } from "../lib/bundle-budget.js";
import { readConfig } from "../lib/project.js";

type BundleBudgetOptions = {
  json?: boolean;
  maxCssGzip?: string;
  maxJsGzip?: string;
  registry?: string;
};

export function registerBundleCommand(program: Command) {
  const bundle = program.command("bundle").description("Measure Ashlar runtime asset budgets");

  bundle
    .command("budget")
    .description("Check component runtime asset gzip sizes against configured budgets")
    .argument(
      "[components...]",
      "Component names; defaults to all markup primitive registry capsules",
    )
    .option("--max-css-gzip <bytes>", "Maximum combined gzipped CSS bytes")
    .option("--max-js-gzip <bytes>", "Maximum combined gzipped JavaScript bytes")
    .option("--registry <path>", "Registry path (defaults to ashlar.config.json or ./registry)")
    .option("--json", "Print the structured JSON report")
    .action((components: string[] | undefined, options: BundleBudgetOptions) => {
      const config = readConfig();
      const maxCssGzipBytes =
        options.maxCssGzip === undefined
          ? undefined
          : parseBudgetOption("--max-css-gzip", options.maxCssGzip);
      const parsedMaxJsGzipBytes =
        options.maxJsGzip === undefined
          ? undefined
          : parseBudgetOption("--max-js-gzip", options.maxJsGzip);
      if (maxCssGzipBytes === null || parsedMaxJsGzipBytes === null) {
        process.exitCode = 1;
        return;
      }

      try {
        const report = checkBundleBudget({
          cwd: process.cwd(),
          registryPath: options.registry ?? config.registry,
          components: components ?? [],
          maxCssGzipBytes,
          maxJsGzipBytes: parsedMaxJsGzipBytes,
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

function printTextReport(report: ReturnType<typeof checkBundleBudget>): void {
  const summary = report.summary;
  const status = report.status === "pass" ? "passed" : "failed";
  const cssOverage = summary.cssGzipBytes - summary.maxCssGzipBytes;
  const jsOverage =
    summary.maxJsGzipBytes === null ? 0 : summary.jsGzipBytes - summary.maxJsGzipBytes;
  const jsBudget =
    summary.maxJsGzipBytes === null ? "not gated" : formatBytes(summary.maxJsGzipBytes);

  console.log(
    `Bundle budget ${status}: css gzip ${formatBytes(summary.cssGzipBytes)} / ${formatBytes(
      summary.maxCssGzipBytes,
    )}, js gzip ${formatBytes(summary.jsGzipBytes)} / ${jsBudget} for ${
      summary.componentCount
    } component(s)`,
  );
  if (cssOverage > 0) {
    console.log(
      `  Combined CSS exceeds ${formatBytes(summary.maxCssGzipBytes)} by ${formatBytes(cssOverage)}`,
    );
  }
  if (jsOverage > 0 && summary.maxJsGzipBytes !== null) {
    console.log(
      `  Combined JavaScript exceeds ${formatBytes(summary.maxJsGzipBytes)} by ${formatBytes(
        jsOverage,
      )}`,
    );
  }

  for (const component of report.components) {
    console.log(
      `  ${component.name}@${component.version}: css raw ${formatBytes(
        component.cssRawBytes,
      )}, css gzip ${formatBytes(component.cssGzipBytes)} (${
        component.cssFiles.join(", ") || "no css"
      }); js raw ${formatBytes(component.jsRawBytes)}, js gzip ${formatBytes(
        component.jsGzipBytes,
      )} (${component.jsFiles.join(", ") || "no js"})`,
    );
  }
}

function parseBudgetOption(option: string, value: string): number | null {
  const bytes = Number.parseInt(value, 10);
  if (!Number.isSafeInteger(bytes) || bytes < 0) {
    console.error(`Invalid ${option} value: ${value}`);
    return null;
  }

  return bytes;
}

function formatBytes(value: number): string {
  return `${value} B`;
}
