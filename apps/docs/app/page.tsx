import Link from "next/link";

import { AshlarCommand } from "@/components/ashlar-command";

export default function HomePage() {
  return (
    <main className="ashlar-home">
      <div className="ashlar-home-shell">
        <nav className="ashlar-home-nav" aria-label="Primary">
          <Link className="ashlar-wordmark" href="/docs">
            Ashlar <span>Docs</span>
          </Link>
          <div className="ashlar-home-actions">
            <Link className="ashlar-button" href="/docs/installation">
              Get started
            </Link>
            <Link className="ashlar-button" data-variant="secondary" href="/docs/cli">
              CLI guide
            </Link>
          </div>
        </nav>

        <section className="ashlar-hero" aria-labelledby="ashlar-home-title">
          <p className="ashlar-kicker">Government-first source capsules</p>
          <h1 id="ashlar-home-title">Install public-service UI source into your app.</h1>
          <p>
            Ashlar works like a source registry: initialize your project, copy audited component
            source into your app, then verify what changed. No repo clone or local registry is
            required for the published path.
          </p>
          <div className="ashlar-action-row">
            <Link className="ashlar-button" href="/docs">
              Read the docs
            </Link>
            <a
              className="ashlar-button"
              data-variant="secondary"
              href="https://github.com/blencorp/ashlar"
            >
              GitHub
            </a>
          </div>
        </section>

        <section className="ashlar-status-band" aria-label="Documentation priorities">
          <div>
            <strong>Copyable</strong>
            <span>Every setup and CLI path starts with commands that can be pasted.</span>
          </div>
          <div>
            <strong>Source-owned</strong>
            <span>Installed files live in your codebase so teams can inspect and adapt them.</span>
          </div>
          <div>
            <strong>Framework-aware</strong>
            <span>Guides cover vanilla, React SPA, Next.js, Svelte, Vue, and Vite.</span>
          </div>
        </section>

        <AshlarCommand lines={["init", "add button alert text-input", "verify"]} />
      </div>
    </main>
  );
}
