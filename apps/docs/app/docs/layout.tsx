import type { ReactNode } from "react";
import { DocsLayout } from "fumadocs-ui/layouts/docs";

import { source } from "@/lib/source";

export default function Layout({ children }: { children: ReactNode }) {
  return (
    <DocsLayout
      githubUrl="https://github.com/blencorp/ashlar"
      links={[
        {
          text: "Examples",
          url: "/docs/examples",
          active: "nested-url",
        },
        {
          text: "Status",
          url: "https://github.com/blencorp/ashlar/blob/main/STATUS.md",
          external: true,
        },
      ]}
      nav={{
        title: (
          <span className="ashlar-wordmark">
            Ashlar <span>Docs</span>
          </span>
        ),
        url: "/docs",
      }}
      tree={source.getPageTree()}
    >
      {children}
    </DocsLayout>
  );
}
