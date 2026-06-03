"use client";

import { createContext, useContext, useEffect, useState } from "react";

// Playground theming: dark/light mode + accent color, mirroring InMyWords.
// Structural colors are CSS variables (--pg-*) flipped by a data-pg-theme attr;
// the accent is a single --pg-accent var set per (accent, mode). Pages reference
// these via the shared `C` palette (see ./palette).

export type PgMode = "dark" | "light";
export type PgAccentId = "sand" | "slate" | "iris" | "sage" | "dusk" | "storm";

export const PG_ACCENTS: { id: PgAccentId; label: string; dark: string; light: string }[] = [
  { id: "sand", label: "Sand", dark: "#c9a86a", light: "#a87f3f" },
  { id: "slate", label: "Slate", dark: "#7aaacf", light: "#5b7fa6" },
  { id: "iris", label: "Iris", dark: "#9e98e8", light: "#7f77dd" },
  { id: "sage", label: "Sage", dark: "#6ab882", light: "#5a8f72" },
  { id: "dusk", label: "Dusk", dark: "#c48aa0", light: "#a06880" },
  { id: "storm", label: "Storm", dark: "#7a98b0", light: "#4a6078" },
];

const DEFAULT_MODE: PgMode = "dark";
const DEFAULT_ACCENT: PgAccentId = "sand";
const MODE_KEY = "chris.theme.mode";
const ACCENT_KEY = "chris.theme.accent";

// Token blocks injected once. (--pg-accent is set per-selection below.)
const TOKEN_CSS = `
[data-pg-theme="dark"]{--pg-bg:#0e0f12;--pg-card:#15171c;--pg-card-hover:#181b21;--pg-border:#23262d;--pg-border-soft:#1f2228;--pg-text:#e7e9ee;--pg-text-dim:#9aa0aa;--pg-text-faint:#6b7280;--pg-accent-text:#1a1710;}
[data-pg-theme="light"]{--pg-bg:#f7f6f3;--pg-card:#ffffff;--pg-card-hover:#fbfaf8;--pg-border:#e6e3dc;--pg-border-soft:#efece6;--pg-text:#1b1c1f;--pg-text-dim:#5c6066;--pg-text-faint:#9a9ea6;--pg-accent-text:#ffffff;}
`;

type Ctx = {
  mode: PgMode;
  accent: PgAccentId;
  setMode: (m: PgMode) => void;
  toggleMode: () => void;
  setAccent: (a: PgAccentId) => void;
};

const ThemeContext = createContext<Ctx | null>(null);

export function usePlaygroundTheme(): Ctx {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("usePlaygroundTheme must be used within PlaygroundThemeProvider");
  return ctx;
}

export function PlaygroundThemeProvider({ children }: { children: React.ReactNode }) {
  const [mode, setModeState] = useState<PgMode>(DEFAULT_MODE);
  const [accent, setAccentState] = useState<PgAccentId>(DEFAULT_ACCENT);

  // Restore saved preference after mount (avoids SSR/client hydration mismatch).
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    const m = localStorage.getItem(MODE_KEY);
    if (m === "dark" || m === "light") setModeState(m);
    const a = localStorage.getItem(ACCENT_KEY);
    if (a && PG_ACCENTS.some((x) => x.id === a)) setAccentState(a as PgAccentId);
  }, []);
  /* eslint-enable react-hooks/set-state-in-effect */

  const setMode = (m: PgMode) => {
    setModeState(m);
    localStorage.setItem(MODE_KEY, m);
  };
  const toggleMode = () => setMode(mode === "dark" ? "light" : "dark");
  const setAccent = (a: PgAccentId) => {
    setAccentState(a);
    localStorage.setItem(ACCENT_KEY, a);
  };

  const accentValue = PG_ACCENTS.find((a) => a.id === accent)?.[mode] ?? "#c9a86a";

  return (
    <ThemeContext.Provider value={{ mode, accent, setMode, toggleMode, setAccent }}>
      <style>{TOKEN_CSS}</style>
      <div
        data-pg-theme={mode}
        style={{
          minHeight: "100vh",
          width: "100%",
          background: "var(--pg-bg)",
          color: "var(--pg-text)",
          ["--pg-accent" as string]: accentValue,
          ["--pg-mono" as string]:
            'ui-monospace, SFMono-Regular, "SF Mono", Menlo, monospace',
          fontFamily:
            'ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
          transition: "background 0.2s ease, color 0.2s ease",
        }}
      >
        {children}
      </div>
    </ThemeContext.Provider>
  );
}
