import type { Command } from "commander";
import { searchRegistryComponents } from "../lib/component-search.js";
import type { RegistryLayer, RegistryStability, RegistryTier } from "../lib/registry.js";
import { readConfig } from "../lib/project.js";

type SearchOptions = {
  json?: boolean;
  layer?: RegistryLayer;
  tier?: RegistryTier;
  stability?: RegistryStability;
  evidence?: string;
  policy?: string;
  feature?: string;
  token?: string;
  limit?: string;
};

export function registerSearchCommand(program: Command) {
  program
    .command("search")
    .description("Search the local Ashlar registry by component, policy, feature, token, or evidence metadata")
    .argument("[query]", "Component name or description text")
    .option("--layer <layer>", "Filter by layer, such as L0 or L3")
    .option("--tier <tier>", "Filter by tier: foundation, primitive, composite, pattern, or block")
    .option("--stability <stability>", "Filter by stability")
    .option("--evidence <status>", "Filter by evidence status")
    .option("--policy <text>", "Filter by policy source or requirement text")
    .option("--feature <text>", "Filter by platform feature")
    .option("--token <text>", "Filter by consumed design token")
    .option("--limit <count>", "Maximum results", "20")
    .option("--json", "Emit JSON")
    .action((query = "", options: SearchOptions) => {
      try {
        const config = readConfig();
        const limit = Number.parseInt(options.limit ?? "20", 10);
        if (!Number.isInteger(limit) || limit < 1) {
          throw new Error("--limit must be a positive integer");
        }
        const components = searchRegistryComponents({
          cwd: process.cwd(),
          registryPath: config.registry,
          query,
          layer: options.layer,
          tier: options.tier,
          stability: options.stability,
          evidence: options.evidence,
          policy: options.policy,
          feature: options.feature,
          token: options.token,
          limit,
        });

        if (options.json) {
          console.log(JSON.stringify({ query, count: components.length, components }, null, 2));
          return;
        }

        if (components.length === 0) {
          console.log("No Ashlar components matched.");
          return;
        }

        for (const item of components) {
          console.log(
            `${item.name}@${item.version} [${item.layer}, ${item.tier}, ${item.stability}] ${item.description}`,
          );
          console.log(`  Evidence: ${item.evidenceStatus}`);
          console.log(`  Reasons: ${item.reasons.join("; ")}`);
          console.log(`  Install: ${item.installCommand}`);
        }
      } catch (error) {
        console.error(error instanceof Error ? error.message : String(error));
        process.exitCode = 1;
      }
    });
}
