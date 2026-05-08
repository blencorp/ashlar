"use client";

import { CodeBlock, Pre } from "fumadocs-ui/components/codeblock";
import { Tab, Tabs } from "fumadocs-ui/components/tabs";

type PackageManager = "npm" | "pnpm" | "bun";

const packageManagers: Array<{
  id: PackageManager;
  label: string;
  runner: string;
}> = [
  { id: "npm", label: "npm", runner: "npx @blen/ashlar@latest" },
  { id: "pnpm", label: "pnpm", runner: "pnpm dlx @blen/ashlar@latest" },
  { id: "bun", label: "bun", runner: "bunx @blen/ashlar@latest" },
];

export function AshlarCommand({
  args,
  lines,
  defaultManager = "npm",
}: {
  args?: string;
  lines?: string[];
  defaultManager?: PackageManager;
}) {
  const commandLines = (lines ?? (args ? [args] : [""])).map((line) => line.trim());
  const defaultIndex = Math.max(
    0,
    packageManagers.findIndex((manager) => manager.id === defaultManager),
  );

  return (
    <Tabs
      defaultIndex={defaultIndex}
      items={packageManagers.map((manager) => manager.label)}
      label="Package manager"
    >
      {packageManagers.map((manager) => (
        <Tab key={manager.id} value={manager.label}>
          <CodeBlock>
            <Pre className="!w-full whitespace-pre-wrap break-words px-4">
              <code className="whitespace-pre-wrap break-words pr-12">
                {formatCommand(manager.runner, commandLines)}
              </code>
            </Pre>
          </CodeBlock>
        </Tab>
      ))}
    </Tabs>
  );
}

function formatCommand(runner: string, commandLines: string[]) {
  return commandLines.map((line) => `${runner}${line ? ` ${line}` : ""}`).join("\n");
}
