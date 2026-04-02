"use client";

import { useState, useRef } from "react";
import { CATEGORIES, CategoryId } from "@/lib/theme";
import { useIMWTheme } from "@/components/ThemeProvider";

interface AnnotationTagProps {
  category: CategoryId;
  state: "confirmed" | "ai-suggested" | "unconfirmed";
  quote?: string;
  rationale?: string;
  onConfirm?: () => void;
  onDismiss?: () => void;
}

export default function AnnotationTag({
  category,
  state,
  quote,
  rationale,
  onConfirm,
  onDismiss,
}: AnnotationTagProps) {
  const { prefs } = useIMWTheme();
  const cat = CATEGORIES.find((c) => c.id === category);
  const tagRef = useRef<HTMLSpanElement>(null);
  const [tooltipState, setTooltipState] = useState<{ above: boolean; transformX: string } | null>(null);

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

  const hasTooltip = !!(quote || rationale);

  function handleMouseEnter() {
    if (!hasTooltip || !tagRef.current) return;
    const rect = tagRef.current.getBoundingClientRect();
    const tooltipHeight = 120;
    const buffer = 12;
    const tooltipWidth = 260;
    const above = rect.top >= tooltipHeight + buffer;
    const tagCenterX = rect.left + rect.width / 2;
    let transformX = "translateX(-50%)";
    const rightOverflow = tagCenterX + tooltipWidth / 2 - (window.innerWidth - 8);
    const leftOverflow = 8 - (tagCenterX - tooltipWidth / 2);
    if (rightOverflow > 0) {
      transformX = `translateX(calc(-50% - ${rightOverflow}px))`;
    } else if (leftOverflow > 0) {
      transformX = `translateX(calc(-50% + ${leftOverflow}px))`;
    }
    setTooltipState({ above, transformX });
  }

  return (
    <span
      ref={tagRef}
      style={{ position: "relative", display: "inline-flex" }}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={() => setTooltipState(null)}
    >
      <span
        className={`imw-ann imw-ann--${state === "ai-suggested" ? "suggested" : state}`}
        style={{ ...baseStyle, display: "inline-flex", alignItems: "center", gap: 4 }}
      >
        {cat.label}
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

      {tooltipState && hasTooltip && (
        <span
          style={{
            position: "absolute",
            ...(tooltipState.above
              ? { bottom: "calc(100% + 8px)", top: "auto" }
              : { top: "calc(100% + 8px)", bottom: "auto" }),
            left: "50%",
            transform: tooltipState.transformX,
            width: 260,
            background: "var(--imw-bg-surface)",
            border: "2px solid var(--imw-text-primary)",
            boxShadow: "3px 3px 0 0 var(--imw-text-primary)",
            padding: "10px 12px",
            zIndex: 100,
            pointerEvents: "none",
          }}
        >
          {quote && (
            <span
              style={{
                display: "block",
                borderLeft: "2px solid var(--imw-border-medium)",
                paddingLeft: 8,
                marginBottom: rationale ? 8 : 0,
                fontFamily: "var(--imw-font-display)",
                fontWeight: 400,
                fontSize: "0.72rem",
                fontStyle: "italic",
                lineHeight: 1.5,
                color: "var(--imw-text-primary)",
              }}
            >
              &ldquo;{quote}&rdquo;
            </span>
          )}
          {rationale && (
            <span
              style={{
                display: "block",
                fontFamily: "var(--imw-font-ui)",
                fontSize: "0.65rem",
                lineHeight: 1.5,
                color: "var(--imw-text-secondary)",
              }}
            >
              {rationale}
            </span>
          )}
        </span>
      )}
    </span>
  );
}
