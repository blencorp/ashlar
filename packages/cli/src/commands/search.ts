import type { Command } from "commander";
import { searchRegistryComponents } from "../lib/component-search.js";
import type { RegistryLayer, RegistryStability, RegistryTier } from "../lib/registry.js";
import { applyCommandCwd, type CwdOption } from "../lib/cwd.js";
import { readConfig } from "../lib/project.js";
import {
  printBrandHeader,
  printCommand,
  printFooter,
  printKeyValue,
  printSection,
} from "../lib/tui.js";

type SearchOptions = {
  json?: boolean;
  layer?: RegistryLayer;
  tier?: RegistryTier;
  stability?: RegistryStability;
  evidence?: string;
  policy?: string;
  query?: string;
  feature?: string;
  token?: string;
  limit?: string;
  offset?: string;
} & CwdOption;

export function registerSearchCommand(program: Command) {
  program
    .command("search")
    .alias("list")
    .description(
      "Search the local Ashlar registry by component, policy, feature, token, or evidence metadata",
    )
    .argument("[query]", "Component name or description text")
    .option("-c, --cwd <path>", "Working directory. Defaults to the current directory.")
    .option("-q, --query <text>", "Query string. Mirrors shadcn search -q.")
    .option("--layer <layer>", "Filter by layer, such as L0 or L3")
    .option("--tier <tier>", "Filter by tier: foundation, primitive, composite, pattern, or block")
    .option("--stability <stability>", "Filter by stability")
    .option("--evidence <status>", "Filter by evidence status")
    .option("--policy <text>", "Filter by policy source or requirement text")
    .option("--feature <text>", "Filter by platform feature")
    .option("--token <text>", "Filter by consumed design token")
    .option("-l, --limit <count>", "Maximum results", "20")
    .option("-o, --offset <count>", "Number of results to skip", "0")
    .option("--json", "Emit JSON")
    .action((query = "", options: SearchOptions) => {
      try {
        applyCommandCwd(options);
        const config = readConfig();
        const searchQuery = options.query ?? query;
        const limit = Number.parseInt(options.limit ?? "20", 10);
        if (!Number.isInteger(limit) || limit < 1) {
          throw new Error("--limit must be a positive integer");
        }
        const offset = Number.parseInt(options.offset ?? "0", 10);
        if (!Number.isInteger(offset) || offset < 0) {
          throw new Error("--offset must be a non-negative integer");
        }
        const components = searchRegistryComponents({
          cwd: process.cwd(),
          registryPath: config.registry,
          query: searchQuery,
          layer: options.layer,
          tier: options.tier,
          stability: options.stability,
          evidence: options.evidence,
          policy: options.policy,
          feature: options.feature,
          token: options.token,
          limit: limit + offset,
        }).slice(offset, offset + limit);

        if (options.json) {
          console.log(
            JSON.stringify({ query: searchQuery, count: components.length, components }, null, 2),
          );
          return;
        }

        if (components.length === 0) {
          printBrandHeader("Registry search");
          console.log("No Ashlar components matched.");
          printFooter();
          return;
        }

        printBrandHeader("Registry search");
        printKeyValue("query", searchQuery || "(all)");
        printKeyValue("results", components.length);
        printKeyValue("offset", offset);
        for (const item of components) {
          printSection(`${item.name}@${item.version}`);
          console.log(
            `${item.name}@${item.version} [${item.layer}, ${item.tier}, ${item.stability}] ${item.description}`,
          );
          console.log(`  Evidence: ${item.evidenceStatus}`);
          console.log(`  Reasons: ${item.reasons.join("; ")}`);
          console.log(`  Install: ${item.installCommand}`);
        }
        printSection("Next");
        printCommand(
          "ashlar view <component>",
          "Inspect files, policy mappings, and evidence before install.",
        );
        printCommand("ashlar add <component>", "Install the capsule as source into your project.");
        printFooter();
      } catch (error) {
        console.error(error instanceof Error ? error.message : String(error));
        process.exitCode = 1;
      }
    });
}
