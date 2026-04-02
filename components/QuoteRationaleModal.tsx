"use client";

import React from "react";

interface QuoteRationaleModalProps {
  quote?: string;
  rationale?: string;
  onClose: () => void;
  /** Tag chip or criterion label rendered inline with the × close button */
  heading?: React.ReactNode;
}

export default function QuoteRationaleModal({ quote, rationale, onClose, heading }: QuoteRationaleModalProps) {
  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 200,
        background: "rgba(0,0,0,0.28)",
        backdropFilter: "blur(3px)",
        WebkitBackdropFilter: "blur(3px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "24px 16px",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "100%",
          maxWidth: 480,
          background: "var(--imw-bg-surface)",
          border: "2px solid var(--imw-text-primary)",
          boxShadow: "4px 4px 0 0 var(--imw-text-primary)",
          padding: "20px 22px 24px",
        }}
      >
        {/* Heading row: tag chip or criterion + close button */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 12,
            gap: 8,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", minWidth: 0 }}>
            {heading ?? null}
          </div>
          <button
            className="imw-btn imw-btn--ghost imw-btn--sm"
            onClick={onClose}
            aria-label="Close"
            style={{ flexShrink: 0 }}
          >
            ×
          </button>
        </div>

        {/* Sub-header */}
        <p
          style={{
            fontFamily: "var(--imw-font-ui)",
            fontSize: "0.6rem",
            fontWeight: 600,
            letterSpacing: "0.12em",
            textTransform: "uppercase",
            color: "var(--imw-text-tertiary)",
            margin: "0 0 12px",
          }}
        >
          Why this was tagged
        </p>

        {quote && (
          <blockquote
            style={{
              margin: "0 0 14px",
              padding: "0 0 0 12px",
              borderLeft: "2px solid var(--imw-border-medium)",
              fontFamily: "var(--imw-font-display)",
              fontWeight: 900,
              fontSize: "1rem",
              fontStyle: "italic",
              lineHeight: 1.55,
              color: "var(--imw-text-primary)",
            }}
          >
            &ldquo;{quote}&rdquo;
          </blockquote>
        )}

        {rationale && (
          <p
            style={{
              margin: 0,
              fontFamily: "var(--imw-font-ui)",
              fontSize: "0.8rem",
              lineHeight: 1.6,
              color: "var(--imw-text-secondary)",
            }}
          >
            {rationale}
          </p>
        )}
      </div>
    </div>
  );
}
