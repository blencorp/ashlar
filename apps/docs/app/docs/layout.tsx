import type { ReactNode } from "react";

import { DocsSidebar } from "@/components/docs-sidebar";

export default function Layout({ children }: { children: ReactNode }) {
  return (
    <div className="ashlar-docs-layout">
      <DocsSidebar />
      {children}
    </div>
  );
}
