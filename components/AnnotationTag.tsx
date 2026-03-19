"use client";

import { CATEGORIES, CategoryId } from "@/lib/theme";
import { useIMWTheme } from "@/components/ThemeProvider";

interface AnnotationTagProps {
  category: CategoryId;
  state: "confirmed" | "ai-suggested" | "unconfirmed";
  rationale?: string;
  onConfirm?: () => void;
  onDismiss?: () => void;
}

export default function AnnotationTag({
  category,
  state,
  rationale,
  onConfirm,
  onDismiss,
}: AnnotationTagProps) {
  const { prefs } = useIMWTheme();
  const cat = CATEGORIES.find((c) => c.id === category);
  if (!cat) return null;

  const colors = prefs.darkMode ? cat.colors.dark : cat.colors.light;

  const baseStyle: React.CSSProperties = {
    borderLeftColor: colors.color,
  };

  if (state === "confirmed") {
    baseStyle.backgroundColor = colors.bg;
    baseStyle.color = colors.color;
  } else if (state === "ai-suggested") {
    baseStyle.color = colors.color;
  }

  return (
    <span
      className={`imw-ann imw-ann--${state === "ai-suggested" ? "suggested" : state}`}
      style={{ ...baseStyle, display: "inline-flex", alignItems: "center", gap: 4 }}
      title={rationale}
    >
      {cat.label}
      {state === "ai-suggested" && (
        <>
          {onConfirm && (
            <button
              onClick={(e) => { e.stopPropagation(); onConfirm(); }}
              aria-label={`Confirm ${cat.label}`}
              style={{
                background: "none",
                border: "none",
                cursor: "pointer",
                padding: "0 1px",
                fontSize: 10,
                color: colors.color,
                lineHeight: 1,
                opacity: 0.7,
              }}
              title="Confirm this category"
            >
              ✓
            </button>
          )}
          {onDismiss && (
            <button
              onClick={(e) => { e.stopPropagation(); onDismiss(); }}
              aria-label={`Dismiss ${cat.label}`}
              style={{
                background: "none",
                border: "none",
                cursor: "pointer",
                padding: "0 1px",
                fontSize: 10,
                color: "var(--imw-text-tertiary)",
                lineHeight: 1,
                opacity: 0.7,
              }}
              title="Dismiss this suggestion"
            >
              ×
            </button>
          )}
        </>
      )}
    </span>
  );
}
