import Link from "next/link";

const navItems = [
  { href: "/docs", label: "Docs" },
  { href: "/docs/components", label: "Components" },
  { href: "/docs/cli", label: "CLI" },
  { href: "/docs/theming", label: "Theming" },
  { href: "/docs/examples", label: "Examples" },
];

export function DocsTopNav() {
  return (
    <header className="ashlar-docs-topbar">
      <div className="ashlar-docs-topbar-inner">
        <Link className="ashlar-docs-logo" href="/docs" aria-label="Ashlar docs">
          Ashlar
        </Link>
        <nav aria-label="Primary documentation">
          {navItems.map((item) => (
            <Link className="ashlar-docs-topbar-link" href={item.href} key={item.href}>
              {item.label}
            </Link>
          ))}
        </nav>
        <a className="ashlar-docs-github" href="https://github.com/blencorp/ashlar">
          GitHub
        </a>
      </div>
    </header>
  );
}
