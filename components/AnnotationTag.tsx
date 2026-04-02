"use client";

import { useState } from "react";
import { CATEGORIES, CategoryId } from "@/lib/theme";
import { useIMWTheme } from "@/components/ThemeProvider";
import QuoteRationaleModal from "@/components/QuoteRationaleModal";

interface AnnotationTagProps {
  category: CategoryId;
  state: "confirmed" | "ai-suggested" | "unconfirmed";
  quote?: string;
  rationale?: string;
  onConfirm?: () => void;
  onDismiss?: () => void;
  /** For confirmed tags on the entry detail page — removes the tag */
  onRemove?: () => void;
}

export default function AnnotationTag({
  category,
  state,
  quote,
  rationale,
  onConfirm,
  onDismiss,
  onRemove,
}: AnnotationTagProps) {
  const { prefs } = useIMWTheme();
  const cat = CATEGORIES.find((c) => c.id === category);
  const [modalOpen, setModalOpen] = useState(false);

  if (!cat) return null;

  const colors = prefs.darkMode ? cat.colors.dark : cat.colors.light;

  const baseStyle: React.CSSProperties = {};

  if (state === "confirmed") {
    baseStyle.backgroundColor = "var(--imw-ac-l)";
    baseStyle.color = "var(--imw-ac-d)";
    baseStyle.borderLeftColor = "var(--imw-ac)";
    baseStyle.borderLeftWidth = 2;
  } else if (state === "ai-suggested") {
    baseStyle.borderLeftColor = colors.color;
    baseStyle.color = colors.color;
  }

  const hasModal = state === "confirmed" && !!(quote || rationale);

  return (
    <span style={{ position: "relative", display: "inline-flex" }}>
      <span
        className={`imw-ann imw-ann--${state === "ai-suggested" ? "suggested" : state}`}
        style={{
          ...baseStyle,
          display: "inline-flex",
          alignItems: "center",
          gap: 4,
          cursor: hasModal ? "pointer" : "default",
        }}
        onClick={hasModal ? () => setModalOpen(true) : undefined}
        title={hasModal ? "View quote & rationale" : undefined}
      >
        {cat.label}

        {/* Confirmed tag: remove button (circle ×) */}
        {state === "confirmed" && onRemove && (
          <button
            onClick={(e) => { e.stopPropagation(); onRemove(); }}
            aria-label={`Remove ${cat.label}`}
            title="Remove tag"
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              width: 14,
              height: 14,
              borderRadius: "50%",
              border: "1px solid currentColor",
              background: "none",
              cursor: "pointer",
              color: "inherit",
              fontSize: "0.55rem",
              lineHeight: 1,
              padding: 0,
              marginLeft: 2,
              opacity: 0.65,
              flexShrink: 0,
            }}
          >
            ×
          </button>
        )}

        {/* AI-suggested tag: confirm + dismiss buttons (unchanged) */}
        {state === "ai-suggested" && (
          <>
            {onConfirm && (
              <button
                onClick={(e) => { e.stopPropagation(); onConfirm(); }}
                aria-label={`Confirm ${cat.label}`}
                style={{ fontSize: "0.6rem", padding: "1px 5px", border: "1px solid currentColor", background: "none", cursor: "pointer", borderRadius: 0, color: "inherit", marginLeft: 3 }}
                title="Confirm this category"
              >
                ✓
              </button>
            )}
            {onDismiss && (
              <button
                onClick={(e) => { e.stopPropagation(); onDismiss(); }}
                aria-label={`Dismiss ${cat.label}`}
                style={{ fontSize: "0.6rem", padding: "1px 4px", border: "none", background: "none", cursor: "pointer", color: "var(--imw-text-tertiary)", borderRadius: 0 }}
                title="Dismiss this suggestion"
              >
                ×
              </button>
            )}
          </>
        )}
      </span>

      {modalOpen && (
        <QuoteRationaleModal
          quote={quote}
          rationale={rationale}
          onClose={() => setModalOpen(false)}
        />
      )}
    </span>
  );
}
