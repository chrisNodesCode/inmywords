import type { Metadata } from "next";

// ─────────────────────────────────────────────────────────────────────────
// Chris's Playground — a deliberately separate area from InMyWords.
//
// This layout is intentionally self-contained: it does NOT use the InMyWords
// design tokens, sidebar, or theme providers. It nests under the root layout
// (so Clerk auth still gates it in production), but everything visual here is
// its own little world. Add playground modules as routes under /chris/*.
// ─────────────────────────────────────────────────────────────────────────

export const metadata: Metadata = {
  title: "Playground — Chris",
  robots: { index: false, follow: false },
};

export default function PlaygroundLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div
      style={{
        minHeight: "100vh",
        width: "100%",
        background: "#0e0f12",
        color: "#e7e9ee",
        fontFamily:
          'ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
        // CSS var used by children for the mono accent
        ["--pg-mono" as string]:
          'ui-monospace, SFMono-Regular, "SF Mono", Menlo, monospace',
      }}
    >
      {children}
    </div>
  );
}
