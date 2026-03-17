"use client";

import { X } from "lucide-react";
import type { Editor } from "@tiptap/react";
import { useIMWTheme } from "@/components/ThemeProvider";

interface WriteControlsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  editor: Editor | null;
  mood: string;
  onMoodChange: (mood: string) => void;
  isDeepWrite?: boolean;
  onSave?: () => void;
  onDiscard?: () => void;
  submitting?: boolean;
  hasContent?: boolean;
}

const MOODS = ["overwhelmed", "drained", "okay", "grounded", "good", "uncertain"];

const LINE_WIDTHS = [
  { id: "narrow" as const, label: "narrow" },
  { id: "mid" as const, label: "mid" },
  { id: "wide" as const, label: "wide" },
];

export function WriteControlsDrawer({
  isOpen,
  onClose,
  editor,
  mood,
  onMoodChange,
  isDeepWrite = false,
  onSave,
  onDiscard,
  submitting = false,
  hasContent = false,
}: WriteControlsDrawerProps) {
  const { prefs, setEditorFontSize, setEditorLineWidth } = useIMWTheme();

  const text = editor?.getText() ?? "";
  const wordCount = text.trim() ? text.trim().split(/\s+/).length : 0;
  const charCount = text.length;
  const readTime = Math.max(1, Math.ceil(wordCount / 200));

  return (
    <div
      role="dialog"
      aria-label="Writing controls"
      style={{
        position: "fixed",
        top: 0,
        right: 0,
        height: "100vh",
        width: 280,
        background: "var(--imw-bg-raised)",
        borderLeft: "0.5px solid var(--imw-border-medium)",
        boxShadow: "-4px 0 24px rgba(0,0,0,0.08)",
        transform: isOpen ? "translateX(0)" : "translateX(100%)",
        transition: "transform 0.25s ease",
        zIndex: 50,
        overflowY: "auto",
        padding: "20px 16px",
        display: "flex",
        flexDirection: "column",
        gap: 20,
      }}
    >
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span className="imw-label">writing controls</span>
        <button
          className="imw-btn imw-btn--ghost imw-btn--sm"
          onClick={onClose}
          aria-label="Close drawer"
        >
          <X size={14} />
        </button>
      </div>

      {/* Word count */}
      <div style={{ display: "flex", gap: 16 }}>
        <div>
          <p className="imw-label" style={{ marginBottom: 4 }}>words</p>
          <p className="imw-ui">{wordCount}</p>
        </div>
        <div>
          <p className="imw-label" style={{ marginBottom: 4 }}>chars</p>
          <p className="imw-ui">{charCount}</p>
        </div>
        <div>
          <p className="imw-label" style={{ marginBottom: 4 }}>read</p>
          <p className="imw-ui">{readTime} min</p>
        </div>
      </div>

      <div className="imw-divider" />

      {/* Font size stepper */}
      <div>
        <p className="imw-label" style={{ marginBottom: 8 }}>font size</p>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <button
            className="imw-btn imw-btn--ghost imw-btn--sm"
            onClick={() => setEditorFontSize(Math.max(13, prefs.editorFontSize - 1))}
            disabled={prefs.editorFontSize <= 13}
            aria-label="Decrease font size"
          >
            −
          </button>
          <span className="imw-ui" style={{ minWidth: 36, textAlign: "center" }}>
            {prefs.editorFontSize}px
          </span>
          <button
            className="imw-btn imw-btn--ghost imw-btn--sm"
            onClick={() => setEditorFontSize(Math.min(22, prefs.editorFontSize + 1))}
            disabled={prefs.editorFontSize >= 22}
            aria-label="Increase font size"
          >
            +
          </button>
        </div>
      </div>

      {/* Line width */}
      <div>
        <p className="imw-label" style={{ marginBottom: 8 }}>line width</p>
        <div style={{ display: "flex", gap: 6 }}>
          {LINE_WIDTHS.map((w) => (
            <button
              key={w.id}
              className={`imw-btn imw-btn--sm${prefs.editorLineWidth === w.id ? " imw-btn--secondary" : " imw-btn--ghost"}`}
              onClick={() => setEditorLineWidth(w.id)}
            >
              {w.label}
            </button>
          ))}
        </div>
      </div>

      {/* Mood */}
      <div>
        <p className="imw-label" style={{ marginBottom: 8 }}>mood</p>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
          {MOODS.map((m) => (
            <button
              key={m}
              className={`imw-btn imw-btn--sm${mood === m ? " imw-btn--secondary" : " imw-btn--ghost"}`}
              onClick={() => onMoodChange(mood === m ? "" : m)}
            >
              {m}
            </button>
          ))}
        </div>
      </div>

      {/* Deep Write actions */}
      {isDeepWrite && (
        <>
          <div className="imw-divider" />
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <button
              className="imw-btn imw-btn--primary"
              onClick={onSave}
              disabled={submitting || !hasContent}
              style={{ opacity: submitting || !hasContent ? 0.5 : 1, justifyContent: "center" }}
            >
              {submitting ? "Saving…" : "Save entry"}
            </button>
            <button
              className="imw-btn imw-btn--danger"
              onClick={onDiscard}
              disabled={submitting}
              style={{ justifyContent: "center" }}
            >
              Discard draft
            </button>
          </div>
        </>
      )}
    </div>
  );
}
