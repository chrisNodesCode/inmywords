"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { BookOpen, Settings2, Maximize2, Minimize2 } from "lucide-react";
import type { Editor } from "@tiptap/react";
import { IMWEditor, WriteControlsDrawer } from "@/components/editor";
import { useIMWTheme } from "@/components/ThemeProvider";
import { LINE_WIDTH_VALUES } from "@/lib/theme";
import { parseEntryContent, extractPlainText } from "@/lib/tiptap-content";

type JournalEntry = {
  id: string;
  content: string;
  mood?: string | null;
  tags: string[];
  createdAt: string;
  updatedAt: string;
  userId: string;
};

const STARTER_PROMPTS = [
  "Today was harder than I expected. ",
  "Something happened at work I want to document. ",
  "I noticed something about how I was feeling today — ",
];

function formatDate(iso: string) {
  return new Date(iso).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function truncate(text: string, max = 120) {
  return text.length > max ? text.slice(0, max).trimEnd() + "…" : text;
}

function getPreviewText(raw: string): string {
  try {
    return extractPlainText(parseEntryContent(raw));
  } catch {
    return raw;
  }
}

export default function JournalPage() {
  const [content, setContent] = useState("");
  const [mood, setMood] = useState("");
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editorInstance, setEditorInstance] = useState<Editor | null>(null);

  const { prefs, setDeepWriteDefault } = useIMWTheme();
  const [isDeepWrite, setIsDeepWrite] = useState(false);
  const resolvedLineWidth =
    LINE_WIDTH_VALUES[prefs.editorLineWidth as keyof typeof LINE_WIDTH_VALUES] ?? "640px";

  const fetchEntries = useCallback(async () => {
    try {
      const res = await fetch("/api/entries");
      if (!res.ok) throw new Error("Failed to fetch entries");
      const data = await res.json();
      setEntries(data);
    } catch (err) {
      setError("Could not load entries.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchEntries();
  }, [fetchEntries]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    // Validate content: extract plain text from JSON (or raw string) and check non-empty
    let hasText = false;
    try {
      const parsed = parseEntryContent(content);
      hasText = extractPlainText(parsed).trim().length > 0;
    } catch {
      hasText = content.trim().length > 0;
    }
    if (!hasText) return;

    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch("/api/entries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content, mood: mood || undefined }),
      });

      if (!res.ok) throw new Error("Failed to save entry");

      setContent("");
      setMood("");
      await fetchEntries();
    } catch (err) {
      setError("Could not save entry. Please try again.");
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  }

  function enterDeepWrite() {
    setIsDeepWrite(true);
    document.documentElement.classList.add("imw-deep-write-active");
    document.documentElement.requestFullscreen().catch(() => {
      // Fullscreen may be blocked in embedded/sandboxed environments — CSS-only still applies
    });
    setDeepWriteDefault(true);
  }

  function exitDeepWrite() {
    setIsDeepWrite(false);
    document.documentElement.classList.remove("imw-deep-write-active");
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => {});
    }
    setDeepWriteDefault(false);
  }

  // Sync state when user exits fullscreen via browser (Escape key)
  useEffect(() => {
    function handleFullscreenChange() {
      if (!document.fullscreenElement && isDeepWrite) {
        setIsDeepWrite(false);
        document.documentElement.classList.remove("imw-deep-write-active");
      }
    }
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, [isDeepWrite]);

  // Determine if editor has actual text content (for button disabled state)
  function hasContent(): boolean {
    try {
      return extractPlainText(parseEntryContent(content)).trim().length > 0;
    } catch {
      return content.trim().length > 0;
    }
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        padding: isDeepWrite ? "0 24px" : "40px 24px",
        backgroundColor: "var(--imw-bg-base)",
        ...(isDeepWrite && {
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }),
      }}
    >
      <div style={{ maxWidth: 720, margin: "0 auto", width: "100%" }}>

        {/* Entry composer */}
        <div
          style={isDeepWrite ? {
            background: "transparent",
            border: "none",
            borderRadius: 0,
            padding: "20px 24px",
            marginBottom: 0,
            maxHeight: "min(900px, 80vh)",
            overflowY: "auto",
          } : {
            background: "var(--imw-bg-surface)",
            border: "0.5px solid var(--imw-border-default)",
            borderRadius: 12,
            padding: "20px 24px",
            marginBottom: 32,
          }}
        >
          <form onSubmit={handleSubmit}>
            {/* Composer top bar */}
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 12,
              }}
            >
              <span className="imw-h3 imw-deep-write-chrome" style={{ color: "var(--imw-text-primary)" }}>
                New entry
              </span>
              <div style={{ display: "flex", gap: 4 }}>
                <button
                  type="button"
                  className="imw-btn imw-btn--ghost imw-btn--sm"
                  onClick={isDeepWrite ? exitDeepWrite : enterDeepWrite}
                  aria-label={isDeepWrite ? "Exit deep write" : "Deep write"}
                  title={isDeepWrite ? "Exit deep write" : "Deep write — full focus mode"}
                >
                  {isDeepWrite ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
                </button>
                <button
                  type="button"
                  className="imw-btn imw-btn--ghost imw-btn--sm"
                  onClick={() => setDrawerOpen(true)}
                  aria-label="Writing controls"
                >
                  <Settings2 size={14} />
                </button>
              </div>
            </div>

            <IMWEditor
              initialContent=""
              onChange={setContent}
              onEditorReady={setEditorInstance}
              placeholder="What happened? What did you notice?"
              fontSize={prefs.editorFontSize}
              lineWidth={resolvedLineWidth}
              disabled={submitting}
            />

            {error && (
              <p className="imw-caption" style={{ color: "var(--imw-text-destructive)", marginTop: 8 }}>
                {error}
              </p>
            )}

            <div className="imw-deep-write-chrome" style={{ display: "flex", justifyContent: "flex-end", marginTop: 12 }}>
              <button
                type="submit"
                disabled={submitting || !hasContent()}
                className="imw-btn imw-btn--primary"
                style={{ opacity: submitting || !hasContent() ? 0.5 : 1 }}
              >
                {submitting ? "Saving…" : "Save entry"}
              </button>
            </div>
          </form>
        </div>

        {/* Entry list */}
        <div className="imw-deep-write-chrome" style={isDeepWrite ? { display: "none" } : {}}>
          <p className="imw-label" style={{ marginBottom: 12 }}>Past entries</p>

          {/* Search */}
          <div style={{ position: "relative", marginBottom: 16 }}>
            <Input
              placeholder="Search entries…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                style={{
                  position: "absolute",
                  right: 12,
                  top: "50%",
                  transform: "translateY(-50%)",
                  color: "var(--imw-text-tertiary)",
                  fontSize: 14,
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                }}
                aria-label="Clear search"
              >
                ×
              </button>
            )}
          </div>

          {loading && (
            <p className="imw-body" style={{ color: "var(--imw-text-tertiary)" }}>Loading…</p>
          )}

          {/* Empty state — IMW-53 */}
          {!loading && entries.length === 0 && (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                textAlign: "center",
                padding: "64px 24px",
                gap: 24,
              }}
            >
              {/* Accent icon */}
              <div
                style={{
                  width: 56,
                  height: 56,
                  borderRadius: "50%",
                  background: "var(--imw-ac-l)",
                  border: "1.5px solid var(--imw-ac-b)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "var(--imw-ac)",
                }}
              >
                <BookOpen size={24} />
              </div>

              <div style={{ maxWidth: 380 }}>
                <p className="imw-h2" style={{ color: "var(--imw-text-primary)", marginBottom: 8 }}>
                  This is yours. No right way to begin.
                </p>
                <p className="imw-body" style={{ color: "var(--imw-text-secondary)" }}>
                  Write what happened, what you felt, or what&apos;s hard to say out loud.
                  InMyWords holds it — and helps you use it later.
                </p>
              </div>

              <button
                className="imw-btn imw-btn--primary"
                onClick={() => editorInstance?.commands.focus("end")}
              >
                Write an entry
              </button>

              {/* Prompt divider */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  width: "100%",
                  maxWidth: 360,
                }}
              >
                <div className="imw-divider" style={{ flex: 1 }} />
                <span className="imw-label">or start with a prompt</span>
                <div className="imw-divider" style={{ flex: 1 }} />
              </div>

              {/* Starter prompt chips */}
              <div style={{ display: "flex", flexDirection: "column", gap: 8, width: "100%", maxWidth: 360 }}>
                {STARTER_PROMPTS.map((prompt) => (
                  <button
                    key={prompt}
                    className="imw-btn imw-btn--secondary"
                    style={{
                      justifyContent: "flex-start",
                      textAlign: "left",
                      whiteSpace: "normal",
                      height: "auto",
                      padding: "9px 14px",
                    }}
                    onClick={() => {
                      // Set content to a TipTap doc with the prompt pre-filled
                      const doc = JSON.stringify({
                        type: "doc",
                        content: [{ type: "paragraph", content: [{ type: "text", text: prompt }] }],
                      });
                      setContent(doc);
                      // Focus the editor and move cursor to end
                      if (editorInstance) {
                        editorInstance.commands.setContent({
                          type: "doc",
                          content: [{ type: "paragraph", content: [{ type: "text", text: prompt }] }],
                        });
                        editorInstance.commands.focus("end");
                      }
                    }}
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            </div>
          )}

          {!loading && entries.length > 0 && searchQuery && entries.filter((e) => {
            const preview = getPreviewText(e.content);
            return preview.toLowerCase().includes(searchQuery.toLowerCase());
          }).length === 0 && (
            <p className="imw-body" style={{ color: "var(--imw-text-tertiary)" }}>
              No entries match your search.
            </p>
          )}

          {(() => {
            const filtered = entries.filter((e) => {
              if (!searchQuery) return true;
              const preview = getPreviewText(e.content);
              return preview.toLowerCase().includes(searchQuery.toLowerCase());
            });

            const groups = new Map<string, JournalEntry[]>();
            for (const entry of filtered) {
              const label = new Date(entry.createdAt).toLocaleString("en-US", {
                month: "long",
                year: "numeric",
              });
              if (!groups.has(label)) groups.set(label, []);
              groups.get(label)!.push(entry);
            }

            return Array.from(groups.entries()).map(([label, groupEntries]) => (
              <div key={label} style={{ marginBottom: 24 }}>
                <p
                  className="imw-label"
                  style={{ color: "var(--imw-text-tertiary)", marginBottom: 8, paddingTop: 8 }}
                >
                  {label}
                </p>
                {groupEntries.map((entry) => (
                  <Link
                    key={entry.id}
                    href={`/entries/${entry.id}`}
                    style={{ display: "block", textDecoration: "none", marginBottom: 8 }}
                    className="imw-entry-card"
                  >
                    <div
                      style={{
                        background: "var(--imw-bg-surface)",
                        border: "0.5px solid var(--imw-border-default)",
                        borderRadius: 10,
                        padding: "14px 16px",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          marginBottom: 6,
                        }}
                      >
                        <span className="imw-caption" style={{ color: "var(--imw-text-tertiary)" }}>
                          {formatDate(entry.createdAt)}
                        </span>
                        <Badge variant="secondary" className="text-xs font-mono">
                          {entry.id.slice(-6)}
                        </Badge>
                      </div>
                      <p className="imw-body" style={{ color: "var(--imw-text-secondary)" }}>
                        {truncate(getPreviewText(entry.content))}
                      </p>
                    </div>
                  </Link>
                ))}
              </div>
            ));
          })()}
        </div>
      </div>

      {/* Writing controls drawer — IMW-49 */}
      <WriteControlsDrawer
        isOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        editor={editorInstance}
        mood={mood}
        onMoodChange={setMood}
      />
      {drawerOpen && (
        <div
          className="imw-drawer-backdrop"
          onClick={() => setDrawerOpen(false)}
          aria-hidden="true"
        />
      )}
    </div>
  );
}
