"use client";

import { useEffect, useRef, useState } from "react";
import { PG_ACCENTS, usePlaygroundTheme } from "./playgroundTheme";

// Dark/light toggle + accent swatch picker for the playground top bars.
const btnStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  border: "1px solid var(--pg-border)",
  background: "transparent",
  color: "var(--pg-text-dim)",
  borderRadius: 8,
  width: 28,
  height: 28,
  padding: 0,
  cursor: "pointer",
};

export function ThemeControls() {
  const { mode, accent, toggleMode, setAccent } = usePlaygroundTheme();
  const [open, setOpen] = useState(false);
  const popRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (popRef.current && !popRef.current.contains(e.target as Node)) setOpen(false);
    };
    window.addEventListener("mousedown", onDown);
    return () => window.removeEventListener("mousedown", onDown);
  }, [open]);

  return (
    <div style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
      {/* Mode toggle */}
      <button
        onClick={toggleMode}
        title={mode === "dark" ? "Switch to light mode" : "Switch to dark mode"}
        aria-label={mode === "dark" ? "Switch to light mode" : "Switch to dark mode"}
        style={btnStyle}
      >
        {mode === "dark" ? <MoonIcon /> : <SunIcon />}
      </button>

      {/* Accent picker */}
      <div ref={popRef} style={{ position: "relative", display: "inline-flex" }}>
        <button
          onClick={() => setOpen((o) => !o)}
          title="Accent color"
          aria-label="Choose accent color"
          style={{ ...btnStyle, width: "auto", padding: "0 7px", gap: 0 }}
        >
          <span
            style={{
              width: 14,
              height: 14,
              borderRadius: 999,
              background: "var(--pg-accent)",
              border: "1px solid rgba(255,255,255,0.18)",
            }}
          />
        </button>
        {open && (
          <div
            style={{
              position: "absolute",
              top: "calc(100% + 8px)",
              right: 0,
              zIndex: 200,
              background: "var(--pg-card)",
              border: "1px solid var(--pg-border)",
              borderRadius: 12,
              padding: 10,
              display: "grid",
              gridTemplateColumns: "repeat(3, 1fr)",
              gap: 8,
              boxShadow: "0 16px 40px rgba(0,0,0,0.35)",
            }}
          >
            {PG_ACCENTS.map((a) => {
              const selected = a.id === accent;
              return (
                <button
                  key={a.id}
                  onClick={() => {
                    setAccent(a.id);
                    setOpen(false);
                  }}
                  title={a.label}
                  aria-label={a.label}
                  style={{
                    width: 26,
                    height: 26,
                    borderRadius: 999,
                    cursor: "pointer",
                    background: a[mode],
                    border: selected
                      ? "2px solid var(--pg-text)"
                      : "2px solid transparent",
                    outline: "1px solid var(--pg-border)",
                  }}
                />
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function MoonIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
    </svg>
  );
}

function SunIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
    </svg>
  );
}
