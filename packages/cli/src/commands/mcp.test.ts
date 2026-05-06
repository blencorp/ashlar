import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { buildAshlarMcpServer } from "../lib/mcp-server.js";

const here = fileURLToPath(new URL(".", import.meta.url));
const repoRoot = resolve(here, "..", "..", "..", "..");

type ToolResult = {
  content: Array<{
    type: string;
    text?: string;
  }>;
  isError?: boolean;
};

async function withMcpClient(
  run: (client: Client, server: McpServer) => Promise<void>,
): Promise<void> {
  const server = buildAshlarMcpServer({
    cwd: repoRoot,
    registryPath: "./registry",
  });
  const client = new Client({ name: "ashlar-test", version: "0.0.0" });
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();

  await server.connect(serverTransport);
  await client.connect(clientTransport);

  try {
    await run(client, server);
  } finally {
    await client.close();
    await server.close();
  }
}

function parseToolJson<T>(result: unknown): T {
  const toolResult = asToolResult(result);
  const content = toolResult.content.at(0);
  if (content?.type !== "text" || typeof content.text !== "string") {
    throw new Error("Expected text tool response");
  }

  return JSON.parse(content.text) as T;
}

function asToolResult(result: unknown): ToolResult {
  if (
    !result ||
    typeof result !== "object" ||
    !("content" in result) ||
    !Array.isArray((result as { content: unknown }).content)
  ) {
    throw new Error("Expected MCP tool result with content");
  }

  return result as ToolResult;
}

describe("ashlar mcp server", () => {
  it("exposes read-only capsule and validation tools", async () => {
    await withMcpClient(async (client) => {
      const list = await client.listTools();

      expect(list.tools.map((tool) => tool.name).sort()).toEqual([
        "get_component",
        "get_evidence",
        "get_token",
        "list_tokens",
        "search_components",
        "suggest_for_task",
        "validate_usage",
      ]);
      expect(list.tools.every((tool) => tool.annotations?.readOnlyHint === true)).toBe(true);
      expect(list.tools.every((tool) => tool.annotations?.destructiveHint === false)).toBe(true);
    });
  });

  it("searches components and returns evidence metadata", async () => {
    await withMcpClient(async (client) => {
      const search = parseToolJson<{
        components: Array<{ name: string; description: string; reasons: string[] }>;
      }>(
        await client.callTool({
          name: "search_components",
          arguments: { query: "official website", policy: "Federal Website Standards", limit: 5 },
        }),
      );
      expect(search.components.at(0)?.name).toBe("banner");
      expect(search.components.at(0)?.reasons.join(" ")).toContain(
        "policy: Federal Website Standards",
      );

      const evidence = parseToolJson<{
        evidence: { component: string; accessibilityStatus: string };
        policyMappings: Array<{ source: string }>;
      }>(
        await client.callTool({
          name: "get_evidence",
          arguments: { name: "form-field" },
        }),
      );
      expect(evidence.evidence.component).toBe("form-field");
      expect(evidence.evidence.accessibilityStatus).toBe("not-reviewed");
      expect(evidence.policyMappings.length).toBeGreaterThan(0);
    });
  });

  it("suggests capsules for public-service tasks without write access", async () => {
    await withMcpClient(async (client) => {
      const result = parseToolJson<{
        gaps: Array<{ capability: string; plannedComponent?: string }>;
        installCommand?: string;
        suggestions: Array<{ name: string; reasons: string[] }>;
      }>(
        await client.callTool({
          name: "suggest_for_task",
          arguments: { task: "Build a benefits eligibility form with yes/no questions" },
        }),
      );

      expect(result.suggestions.map((suggestion) => suggestion.name)).toContain(
        "benefit-application",
      );
      expect(result.suggestions.map((suggestion) => suggestion.name)).toContain("radio-group");
      expect(result.installCommand).toContain("ashlar add");
      expect(result.gaps.map((gap) => gap.plannedComponent)).not.toContain("radio-group");
    });
  });

  it("exposes design tokens for coding-agent context", async () => {
    await withMcpClient(async (client) => {
      const list = parseToolJson<{
        theme: string;
        tokens: Array<{ path: string; cssVariable: string; value: string; resolvedValue: string }>;
        availableThemes: Array<{ name: string }>;
      }>(
        await client.callTool({
          name: "list_tokens",
          arguments: { theme: "default", query: "action.primary", limit: 10 },
        }),
      );
      expect(list.theme).toBe("default");
      expect(list.availableThemes.map((theme) => theme.name)).toEqual(["default", "va", "usda"]);
      expect(list.tokens.map((token) => token.cssVariable)).toContain(
        "--ashlar-color-action-primary-bg",
      );

      const token = parseToolJson<{
        requestedPath: string;
        token: { path: string; cssVariable: string; value: string; resolvedValue: string };
      }>(
        await client.callTool({
          name: "get_token",
          arguments: { path: "--ashlar-button-radius", theme: "default", mode: "dark" },
        }),
      );
      expect(token.requestedPath).toBe("--ashlar-button-radius");
      expect(token.token.path).toBe("component.button.radius");
      expect(token.token.cssVariable).toBe("--ashlar-button-radius");
      expect(token.token.resolvedValue).toBe("var(--ashlar-radius-control)");
    });
  });

  it("validates service-flow usage through the same audit runner as the CLI", async () => {
    await withMcpClient(async (client) => {
      const pass = parseToolJson<{
        findings: unknown[];
        summary: { errors: number; warnings: number };
      }>(
        await client.callTool({
          name: "validate_usage",
          arguments: {
            fileOrGlob: "examples/service-flow/benefit-application.pass.html",
            policy: "all",
          },
        }),
      );
      expect(pass.findings).toHaveLength(0);
      expect(pass.summary).toEqual({ errors: 0, warnings: 0 });

      const fail = parseToolJson<{
        findings: Array<{ ruleId: string; level: string }>;
        summary: { errors: number; warnings: number };
      }>(
        await client.callTool({
          name: "validate_usage",
          arguments: {
            fileOrGlob: "examples/service-flow/benefit-application.fail.html",
            policy: "all",
          },
        }),
      );
      expect(fail.summary.errors).toBeGreaterThan(0);
      expect(fail.findings.map((finding) => finding.ruleId)).toContain(
        "ashlar/text-input/invalid-input-needs-describedby",
      );
      expect(fail.findings.map((finding) => finding.ruleId)).toContain(
        "federal/page-title-min-length",
      );
    });
  });

  it("returns structured tool errors without writing to the project", async () => {
    await withMcpClient(async (client) => {
      const result = asToolResult(
        await client.callTool({
          name: "get_component",
          arguments: { name: "missing-capsule" },
        }),
      );
      const payload = parseToolJson<{ error: string }>(result);

      expect(result.isError).toBe(true);
      expect(payload.error).toContain("Unknown Ashlar component: missing-capsule");
    });
  });
});
