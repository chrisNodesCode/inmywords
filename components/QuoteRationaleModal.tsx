"use client";

interface QuoteRationaleModalProps {
  quote?: string;
  rationale?: string;
  onClose: () => void;
}

export default function QuoteRationaleModal({ quote, rationale, onClose }: QuoteRationaleModalProps) {
  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 200,
        background: "rgba(0,0,0,0.35)",
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
          position: "relative",
        }}
      >
        {/* Close button */}
        <button
          className="imw-btn imw-btn--ghost imw-btn--sm"
          onClick={onClose}
          aria-label="Close"
          style={{ position: "absolute", top: 12, right: 12 }}
        >
          ×
        </button>

        {/* Header */}
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
