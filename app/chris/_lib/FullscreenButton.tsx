"use client";

import { useEffect, useState } from "react";

// Browser-fullscreen toggle for any playground surface — the same fullscreen
// the editors' "deep write" uses, but available from the top bar everywhere.
const MONO = 'ui-monospace, SFMono-Regular, "SF Mono", Menlo, monospace';

export function FullscreenButton({ color = "var(--pg-text-dim)" }: { color?: string }) {
  const [fs, setFs] = useState(false);

  useEffect(() => {
    const onChange = () => setFs(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, []);

  const toggle = async () => {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else await document.documentElement.requestFullscreen();
    } catch {
      /* fullscreen can be denied; ignore */
    }
  };

  return (
    <button
      onClick={toggle}
      title={fs ? "Exit full screen" : "Full screen"}
      aria-label={fs ? "Exit full screen" : "Enter full screen"}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        border: "1px solid var(--pg-border)",
        background: "transparent",
        color,
        borderRadius: 8,
        padding: "5px 9px",
        fontSize: 13,
        lineHeight: 1,
        cursor: "pointer",
        fontFamily: MONO,
      }}
    >
      <FullscreenIcon exit={fs} />
    </button>
  );
}

function FullscreenIcon({ exit }: { exit: boolean }) {
  // Expand corners normally; inward corners when already fullscreen.
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      {exit ? (
        <>
          <path d="M5 1v4H1" />
          <path d="M9 1v4h4" />
          <path d="M5 13V9H1" />
          <path d="M9 13V9h4" />
        </>
      ) : (
        <>
          <path d="M1 5V1h4" />
          <path d="M13 5V1H9" />
          <path d="M1 9v4h4" />
          <path d="M13 9v4H9" />
        </>
      )}
    </svg>
  );
}
