import type { Metadata } from "next";
import { OwnerGate } from "./OwnerGate";
import { PlaygroundThemeProvider } from "./_lib/playgroundTheme";

// ─────────────────────────────────────────────────────────────────────────
// Chris's Playground — a deliberately separate area from InMyWords.
//
// Self-contained from InMyWords' design system, but it has its own theming:
// PlaygroundThemeProvider supplies dark/light + accent via --pg-* CSS vars
// (see _lib/playgroundTheme + _lib/palette). Add modules as routes under
// /chris/*.
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
    <PlaygroundThemeProvider>
      <OwnerGate>{children}</OwnerGate>
    </PlaygroundThemeProvider>
  );
}
