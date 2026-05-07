import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { CallToolResult, ToolAnnotations } from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod/v4";
import { findAuditTargets, runAudit, type AuditPolicy } from "./audit-runner.js";
import { suggestComponentsForTask } from "./component-suggest.js";
import { searchRegistryComponents } from "./component-search.js";
import { getComponent } from "./registry.js";
import { findThemeToken, listThemeTokens, loadStockThemes, type ThemeDefinition } from "./theme.js";

export type AshlarMcpServerOptions = {
  cwd: string;
  registryPath: string;
};

const readOnlyAnnotations = {
  readOnlyHint: true,
  destructiveHint: false,
  idempotentHint: true,
  openWorldHint: false,
} satisfies ToolAnnotations;

const policySchema = z.enum(["federal", "components", "all"]);
const tokenModeSchema = z.enum(["light", "dark"]);
const tokenListModeSchema = z.enum(["light", "dark", "all"]);

export function buildAshlarMcpServer(options: AshlarMcpServerOptions): McpServer {
  const server = new McpServer(
    {
      name: "ashlar",
      version: "0.0.0",
    },
    {
      instructions:
        "Use Ashlar tools to inspect evidence-backed public-service UI capsules and validate usage. This server is read-only.",
    },
  );

  server.registerTool(
    "search_components",
    {
      title: "Search Ashlar Capsules",
      description:
        "Search the local Ashlar registry by component, policy, platform feature, token, layer, stability, or evidence metadata.",
      inputSchema: z.object({
        query: z.string().optional().default(""),
        layer: z.enum(["L0", "L1", "L2", "L3", "L4"]).optional(),
        tier: z.enum(["foundation", "primitive", "composite", "pattern", "block"]).optional(),
        stability: z.enum(["proposal", "experimental", "beta", "stable", "deprecated"]).optional(),
        evidence: z.string().optional(),
        policy: z.string().optional(),
        feature: z.string().optional(),
        token: z.string().optional(),
        limit: z.number().int().min(1).max(50).optional().default(20),
      }),
      annotations: readOnlyAnnotations,
    },
    ({ query, layer, tier, stability, evidence, policy, feature, token, limit }) =>
      safeJsonResult(() => {
        const components = searchRegistryComponents({
          cwd: options.cwd,
          registryPath: options.registryPath,
          query,
          layer,
          tier,
          stability,
          evidence,
          policy,
          feature,
          token,
          limit,
        });

        return {
          registryPath: options.registryPath,
          count: components.length,
          components,
        };
      }),
  );

  server.registerTool(
    "get_component",
    {
      title: "Get Ashlar Capsule",
      description:
        "Return registry metadata, files, evidence status, and CEM metadata for a capsule.",
      inputSchema: z.object({
        name: z.string().min(1),
      }),
      annotations: readOnlyAnnotations,
    },
    ({ name }) =>
      safeJsonResult(() => ({
        component: getComponent(options.cwd, name, options.registryPath),
      })),
  );

  server.registerTool(
    "suggest_for_task",
    {
      title: "Suggest Ashlar Capsules For Task",
      description:
        "Return deterministic, metadata-backed capsule suggestions and an install command for a public-service UI task. This tool does not modify files.",
      inputSchema: z.object({
        task: z.string().min(1),
        limit: z.number().int().min(1).max(20).optional().default(8),
      }),
      annotations: readOnlyAnnotations,
    },
    ({ task, limit }) =>
      safeJsonResult(() =>
        suggestComponentsForTask({
          cwd: options.cwd,
          registryPath: options.registryPath,
          task,
          limit,
        }),
      ),
  );

  server.registerTool(
    "get_evidence",
    {
      title: "Get Ashlar Evidence",
      description: "Return evidence, policy mappings, and platform feature metadata for a capsule.",
      inputSchema: z.object({
        name: z.string().min(1),
      }),
      annotations: readOnlyAnnotations,
    },
    ({ name }) =>
      safeJsonResult(() => {
        const component = getComponent(options.cwd, name, options.registryPath);

        return {
          name: component.name,
          version: component.version,
          evidence: component.evidence,
          platformFeatures: component.platformFeatures,
          policyMappings: component.policyMappings,
        };
      }),
  );

  server.registerTool(
    "list_tokens",
    {
      title: "List Ashlar Tokens",
      description:
        "List agency-theme design tokens with their CSS variable names and resolved alias values.",
      inputSchema: z.object({
        theme: z.string().optional().default("default"),
        mode: tokenListModeSchema.optional().default("light"),
        query: z.string().optional().default(""),
        type: z.string().optional(),
        limit: z.number().int().min(1).max(200).optional().default(50),
      }),
      annotations: readOnlyAnnotations,
    },
    ({ theme, mode, query, type, limit }) =>
      safeJsonResult(() => {
        const selectedTheme = getTheme(theme);
        const normalizedQuery = query.toLowerCase();
        const modes = mode === "all" ? (["light", "dark"] as const) : ([mode] as const);
        const tokens = modes
          .flatMap((currentMode) => listThemeTokens(selectedTheme, currentMode))
          .filter(
            (token) =>
              (!type || token.type === type) &&
              (!normalizedQuery ||
                token.path.toLowerCase().includes(normalizedQuery) ||
                token.cssVariable.toLowerCase().includes(normalizedQuery) ||
                token.value.toLowerCase().includes(normalizedQuery)),
          )
          .slice(0, limit);

        return {
          theme: selectedTheme.name,
          title: selectedTheme.title,
          mode,
          count: tokens.length,
          tokens,
          availableThemes: loadStockThemes().map((item) => ({
            name: item.name,
            title: item.title,
            description: item.description,
          })),
        };
      }),
  );

  server.registerTool(
    "get_token",
    {
      title: "Get Ashlar Token",
      description:
        "Get one agency-theme token by DTCG path or CSS variable name, including CSS variable and resolved alias value.",
      inputSchema: z.object({
        path: z.string().min(1),
        theme: z.string().optional().default("default"),
        mode: tokenModeSchema.optional().default("light"),
      }),
      annotations: readOnlyAnnotations,
    },
    ({ path, theme, mode }) =>
      safeJsonResult(() => {
        const selectedTheme = getTheme(theme);
        const token = findThemeToken(selectedTheme, path, mode);
        if (!token) {
          throw new Error(`Unknown Ashlar token in ${selectedTheme.name}/${mode}: ${path}`);
        }

        return {
          requestedPath: path,
          requestedMode: mode,
          token,
        };
      }),
  );

  server.registerTool(
    "validate_usage",
    {
      title: "Validate Ashlar Usage",
      description:
        "Run the same local Ashlar audit policy as the CLI against a file or glob. Returns findings without modifying files.",
      inputSchema: z.object({
        fileOrGlob: z.string().min(1),
        policy: policySchema.optional().default("all"),
      }),
      annotations: readOnlyAnnotations,
    },
    ({ fileOrGlob, policy }) =>
      safeJsonResult(() => {
        const targets = findAuditTargets(options.cwd, fileOrGlob);
        const findings = runAudit({
          cwd: options.cwd,
          files: targets,
          policy: policy as AuditPolicy,
          registryPath: options.registryPath,
        });

        return {
          policy,
          fileOrGlob,
          targets,
          findings,
          summary: {
            errors: findings.filter((finding) => finding.level === "error").length,
            warnings: findings.filter((finding) => finding.level === "warning").length,
          },
        };
      }),
  );

  return server;
}

function getTheme(name: string): ThemeDefinition {
  const themes = loadStockThemes();
  const theme = themes.find((item) => item.name === name);
  if (!theme) {
    throw new Error(`Unknown Ashlar theme: ${name}`);
  }

  return theme;
}

function safeJsonResult(buildValue: () => unknown): CallToolResult {
  try {
    return jsonResult(buildValue());
  } catch (error) {
    return jsonResult(
      {
        error: error instanceof Error ? error.message : String(error),
      },
      true,
    );
  }
}

function jsonResult(value: unknown, isError = false): CallToolResult {
  return {
    content: [
      {
        type: "text",
        text: JSON.stringify(value, null, 2),
      },
    ],
    isError,
  };
}
