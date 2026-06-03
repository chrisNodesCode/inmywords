// Chris's Playground — landing dashboard.
//
// Each "module" below is a little app. Live ones have an `href`; the rest are
// placeholders. When you're ready to build one, give the details and we'll turn
// the tile into a real route under /chris/<module>.
import Link from "next/link";
import { FullscreenButton } from "@/app/chris/_lib/FullscreenButton";
import { ThemeControls } from "@/app/chris/_lib/ThemeControls";

const MONO =
  'ui-monospace, SFMono-Regular, "SF Mono", Menlo, monospace';

type Module = {
  key: string;
  name: string;
  blurb: string;
  glyph: string;
  href?: string;
};

// Placeholder modules — purely illustrative of the kinds of things this
// playground is meant to hold. Edit freely.
const MODULES: Module[] = [
  { key: "todos", name: "To-dos", blurb: "Quick capture + daily list", glyph: "✓", href: "/chris/todos" },
  { key: "projects", name: "Projects", blurb: "Organize prompts and to-dos", glyph: "◳", href: "/chris/projects" },
  { key: "journal", name: "Journal", blurb: "Write entries — shared with InMyWords", glyph: "✦", href: "/chris/journal" },
  { key: "shopping", name: "Shopping List", blurb: "Items grouped by retailer", glyph: "⟳", href: "/chris/shopping" },
  { key: "prompts", name: "Prompts", blurb: "Drafting space for LLM prompts", glyph: "✎", href: "/chris/prompts" },
  { key: "messages", name: "Messaging", blurb: "Draft messages → tune how they land", glyph: "✉", href: "/chris/messages" },
];

export default function PlaygroundHome() {
  return (
    <main style={{ maxWidth: 960, margin: "0 auto", padding: "0 24px 96px" }}>
      {/* Top bar */}
      <header
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          height: 64,
          borderBottom: "1px solid var(--pg-border)",
        }}
      >
        <span style={{ fontFamily: MONO, fontSize: 14, letterSpacing: "0.02em" }}>
          <span style={{ color: "var(--pg-text-faint)" }}>~/</span>
          <span style={{ color: "var(--pg-text)" }}>chris</span>
          <span style={{ color: "var(--pg-text-faint)" }}>/playground</span>
        </span>
        <div style={{ display: "inline-flex", alignItems: "center", gap: 12 }}>
          <span
            style={{
              fontFamily: MONO,
              fontSize: 11,
              color: "var(--pg-text-faint)",
              border: "1px solid var(--pg-border)",
              borderRadius: 999,
              padding: "3px 10px",
            }}
          >
            live
          </span>
          <ThemeControls />
          <FullscreenButton />
        </div>
      </header>

      {/* Module grid */}
      <section
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))",
          gap: 16,
          marginTop: 40,
        }}
      >
        {MODULES.map((m) => {
          const live = Boolean(m.href);
          const inner = (
            <div
              style={{
                position: "relative",
                height: "100%",
                border: `1px solid var(--pg-border)`,
                borderRadius: 14,
                background: "var(--pg-card)",
                padding: "20px 20px 22px",
                minHeight: 132,
                cursor: live ? "pointer" : "default",
              }}
            >
              <div
                aria-hidden
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 10,
                  display: "grid",
                  placeItems: "center",
                  background: "var(--pg-card-hover)",
                  border: "1px solid var(--pg-border)",
                  fontSize: 18,
                  color: live ? "var(--pg-accent)" : "var(--pg-text-dim)",
                }}
              >
                {m.glyph}
              </div>
              <h2 style={{ margin: "16px 0 4px", fontSize: 16, fontWeight: 600 }}>
                {m.name}
              </h2>
              <p style={{ margin: 0, color: "var(--pg-text-dim)", fontSize: 13.5, lineHeight: 1.5 }}>
                {m.blurb}
              </p>
              <span
                style={{
                  position: "absolute",
                  top: 18,
                  right: 18,
                  fontFamily: MONO,
                  fontSize: 10,
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                  color: live ? "var(--pg-accent)" : "var(--pg-text-faint)",
                }}
              >
                {live ? "open →" : "stub"}
              </span>
            </div>
          );

          return live ? (
            <Link key={m.key} href={m.href!} style={{ textDecoration: "none", color: "inherit" }}>
              {inner}
            </Link>
          ) : (
            <div key={m.key}>{inner}</div>
          );
        })}
      </section>

      {/* Footer note */}
      <p
        style={{
          marginTop: 40,
          fontFamily: MONO,
          fontSize: 12,
          color: "var(--pg-text-faint)",
        }}
      >
        db: nameless-block (shared with InMyWords) · auth: owner-gated
      </p>
    </main>
  );
}
