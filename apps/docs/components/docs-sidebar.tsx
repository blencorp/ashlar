"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

const primaryItems = [
  { href: "/docs", label: "Introduction" },
  { href: "/docs/installation", label: "Installation" },
  { href: "/docs/cli", label: "CLI" },
  { href: "/docs/components", label: "Components" },
  { href: "/docs/theming", label: "Theming" },
  { href: "/docs/examples", label: "Examples" },
  { href: "/docs/trust", label: "Trust and verification" },
];

function isActive(pathname: string, href: string): boolean {
  return href === "/docs" ? pathname === href : pathname.startsWith(href);
}

export function DocsSidebar() {
  const pathname = usePathname();
  const [dark, setDark] = useState(false);

  useEffect(() => {
    setDark(document.documentElement.classList.contains("dark"));
  }, []);

  function toggleTheme() {
    const nextDark = !dark;
    document.documentElement.classList.toggle("dark", nextDark);
    document.documentElement.style.colorScheme = nextDark ? "dark" : "light";
    localStorage.setItem("theme", nextDark ? "dark" : "light");
    setDark(nextDark);
  }

  return (
    <aside className="ashlar-docs-sidebar" aria-label="Documentation navigation">
      <div className="ashlar-docs-sidebar-inner">
        <Link className="ashlar-wordmark" href="/docs">
          Ashlar <span>Docs</span>
        </Link>

        <nav className="ashlar-docs-nav" aria-label="Sections">
          <p>Sections</p>
          {primaryItems.map((item) => (
            <Link
              aria-current={isActive(pathname, item.href) ? "page" : undefined}
              className="ashlar-docs-nav-link"
              data-active={isActive(pathname, item.href) ? "true" : undefined}
              href={item.href}
              key={item.href}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="ashlar-docs-sidebar-footer">
          <a href="https://github.com/blencorp/ashlar">GitHub</a>
          <button type="button" onClick={toggleTheme}>
            {dark ? "Light" : "Dark"}
          </button>
        </div>
      </div>
    </aside>
  );
}
