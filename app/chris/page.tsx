// Chris's Playground — landing dashboard.
//
// Each "module" below is a little app. Live ones have an `href`; the rest are
// placeholders. When you're ready to build one, give the details and we'll turn
// the tile into a real route under /chris/<module>.
import Link from "next/link";

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
  { key: "ideas", name: "Idea Lab", blurb: "Webapp ideas & thought experiments", glyph: "✦" },
  { key: "shopping", name: "Shopping List", blurb: "Items grouped by retailer", glyph: "⟳", href: "/chris/shopping" },
  { key: "prompts", name: "Prompts", blurb: "Drafting space for LLM prompts", glyph: "✎", href: "/chris/prompts" },
  { key: "automations", name: "Automations", blurb: "Little helpers & scripts", glyph: "⚙" },
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
          borderBottom: "1px solid #23262d",
        }}
      >
        <span style={{ fontFamily: MONO, fontSize: 14, letterSpacing: "0.02em" }}>
          <span style={{ color: "#6b7280" }}>~/</span>
          <span style={{ color: "#e7e9ee" }}>chris</span>
          <span style={{ color: "#6b7280" }}>/playground</span>
        </span>
        <span
          style={{
            fontFamily: MONO,
            fontSize: 11,
            color: "#6b7280",
            border: "1px solid #23262d",
            borderRadius: 999,
            padding: "3px 10px",
          }}
        >
          scaffold · v0
        </span>
      </header>

      {/* Hero */}
      <section style={{ padding: "56px 0 40px" }}>
        <h1
          style={{
            margin: 0,
            fontSize: 34,
            lineHeight: 1.15,
            fontWeight: 650,
            letterSpacing: "-0.02em",
          }}
        >
          Your personal playground.
        </h1>
        <p
          style={{
            margin: "14px 0 0",
            maxWidth: 540,
            color: "#9aa0aa",
            fontSize: 15.5,
            lineHeight: 1.6,
          }}
        >
          A separate corner of the repo with its own database — for to-dos,
          project tracking, half-formed ideas, and the little automations you
          want everywhere you go. Nothing here is wired up yet.
        </p>
      </section>

      {/* Module grid */}
      <section
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))",
          gap: 16,
        }}
      >
        {MODULES.map((m) => {
          const live = Boolean(m.href);
          const inner = (
            <div
              style={{
                position: "relative",
                height: "100%",
                border: `1px solid ${live ? "#33373f" : "#23262d"}`,
                borderRadius: 14,
                background:
                  "linear-gradient(180deg, #15171c 0%, #121317 100%)",
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
                  background: "#1d2026",
                  border: "1px solid #2a2e36",
                  fontSize: 18,
                  color: live ? "#c9a86a" : "#c7ccd6",
                }}
              >
                {m.glyph}
              </div>
              <h2 style={{ margin: "16px 0 4px", fontSize: 16, fontWeight: 600 }}>
                {m.name}
              </h2>
              <p style={{ margin: 0, color: "#8b919b", fontSize: 13.5, lineHeight: 1.5 }}>
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
                  color: live ? "#c9a86a" : "#5a6066",
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
          color: "#5a6066",
        }}
      >
        db: playground (isolated) · auth: inherited · ready for instructions →
      </p>
    </main>
  );
}
