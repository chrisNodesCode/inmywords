"use client";

// Small accent spinner for the playground's dark/terminal vibe. Self-contained:
// injects its own keyframes so it works without touching global CSS.
const MONO = 'ui-monospace, SFMono-Regular, "SF Mono", Menlo, monospace';

export function Spinner({
  size = 18,
  label,
  color = "var(--pg-accent)",
}: {
  size?: number;
  label?: string;
  color?: string;
}) {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 10 }}>
      <span
        aria-hidden
        style={{
          width: size,
          height: size,
          borderRadius: "50%",
          border: `2px solid rgba(255,255,255,0.10)`,
          borderTopColor: color,
          display: "inline-block",
          animation: "pg-spin 0.7s linear infinite",
        }}
      />
      {label && (
        <span style={{ fontFamily: MONO, fontSize: 13, color: "var(--pg-text-faint)" }}>{label}</span>
      )}
      <style>{"@keyframes pg-spin{to{transform:rotate(360deg)}}"}</style>
    </span>
  );
}
