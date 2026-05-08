import type { ReactNode } from "react";
import { DocsLayout } from "fumadocs-ui/layouts/docs";

import { source } from "@/lib/source";

export default function Layout({ children }: { children: ReactNode }) {
  return (
    <DocsLayout
      tree={source.getPageTree()}
      nav={{
        title: "Ashlar",
        url: "/docs",
      }}
      githubUrl="https://github.com/blencorp/ashlar"
      links={[
        { text: "Docs", url: "/docs", active: "nested-url" },
        { text: "Components", url: "/docs/components", active: "nested-url" },
        { text: "CLI", url: "/docs/cli", active: "nested-url" },
        { text: "Examples", url: "/docs/examples", active: "nested-url" },
      ]}
    >
      {children}
    </DocsLayout>
  );
}
