import type { ReactNode } from "react";

import { DocsSidebar } from "@/components/docs-sidebar";
import { DocsTopNav } from "@/components/docs-top-nav";

export default function Layout({ children }: { children: ReactNode }) {
  return (
    <div className="ashlar-docs-shell">
      <DocsTopNav />
      <div className="ashlar-docs-layout">
        <DocsSidebar />
        {children}
      </div>
    </div>
  );
}
