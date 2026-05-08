"use client";

import { useMemo, useState } from "react";

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
  defaultManager = "pnpm",
}: {
  args?: string;
  lines?: string[];
  defaultManager?: PackageManager;
}) {
  const [activeManager, setActiveManager] = useState<PackageManager>(defaultManager);
  const [copied, setCopied] = useState(false);

  const commandLines = useMemo(() => {
    const source = lines ?? (args ? [args] : [""]);
    return source.map((line) => line.trim());
  }, [args, lines]);

  const command = useMemo(() => {
    const manager = packageManagers.find((item) => item.id === activeManager) ?? packageManagers[0];

    if (!manager) {
      return commandLines.join("\n");
    }

    return commandLines.map((line) => `${manager.runner}${line ? ` ${line}` : ""}`).join("\n");
  }, [activeManager, commandLines]);

  async function copyCommand() {
    await navigator.clipboard.writeText(command);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1400);
  }

  return (
    <div className="ashlar-command-tabs">
      <div className="ashlar-command-tabs-header">
        <div aria-label="Package manager" role="tablist">
          {packageManagers.map((manager) => (
            <button
              aria-selected={activeManager === manager.id}
              key={manager.id}
              onClick={() => setActiveManager(manager.id)}
              role="tab"
              type="button"
            >
              {manager.label}
            </button>
          ))}
        </div>
        <button type="button" onClick={copyCommand}>
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
      <pre>
        <code>{command}</code>
      </pre>
    </div>
  );
}
