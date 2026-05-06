import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import type { Command } from "commander";
import { buildAshlarMcpServer } from "../lib/mcp-server.js";
import { readConfig } from "../lib/project.js";

type McpOptions = {
  registry?: string;
};

export function registerMcpCommand(program: Command) {
  program
    .command("mcp")
    .description("Start a read-only Ashlar MCP server over stdio")
    .option("--registry <path>", "Registry path (defaults to ashlar.config.json or ./registry)")
    .action(async (options: McpOptions) => {
      const config = readConfig();
      const server = buildAshlarMcpServer({
        cwd: process.cwd(),
        registryPath: options.registry ?? config.registry,
      });

      await server.connect(new StdioServerTransport());
    });
}
