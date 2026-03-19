"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Settings2, Maximize2, Minimize2, Sparkles } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import type { Editor } from "@tiptap/react";
import { IMWEditor, IMWReadView, WriteControlsDrawer } from "@/components/editor";
import AnnotationTag from "@/components/AnnotationTag";
import { useIMWTheme } from "@/components/ThemeProvider";
import { LINE_WIDTH_VALUES, CATEGORIES, type CategoryId } from "@/lib/theme";
import { parseEntryContent, extractPlainText } from "@/lib/tiptap-content";

type AISuggestion = {
  category: string;
  confidence: number;
  rationale: string;
};

type JournalEntry = {
  id: string;
  content: string;
  title?: string | null;
  mood?: string | null;
  tags: string[];
  aiSuggestions?: AISuggestion[] | null;
  createdAt: string;
  updatedAt: string;
  userId: string;
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatShortDate(iso: string) {
  return new Date(iso).toLocaleString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

export default function EntryPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [entry, setEntry] = useState<JournalEntry | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  // Edit state
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState("");
  const [editMood, setEditMood] = useState("");
  const [editTitle, setEditTitle] = useState("");
  const [saving, setSaving] = useState(false);

  // Delete state
  const [deleting, setDeleting] = useState(false);

  // Drawer + editor instance
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editorInstance, setEditorInstance] = useState<Editor | null>(null);

  // AI state
  const [aiSuggestions, setAiSuggestions] = useState<AISuggestion[]>([]);
  const [analyzing, setAnalyzing] = useState(false);

  const { prefs, setDeepWriteDefault } = useIMWTheme();
  const [isDeepWrite, setIsDeepWrite] = useState(false);
  const resolvedLineWidth =
    LINE_WIDTH_VALUES[prefs.editorLineWidth as keyof typeof LINE_WIDTH_VALUES] ?? "640px";

  const fetchEntry = useCallback(async () => {
    try {
      const res = await fetch(`/api/entries/${id}`);
      if (res.status === 404) { setNotFound(true); return; }
      if (!res.ok) throw new Error("Failed to fetch entry");
      const data = await res.json();
      setEntry(data);
      setEditMood(data.mood ?? "");
      setEditTitle(data.title ?? "");
      // Restore saved AI suggestions if present
      if (Array.isArray(data.aiSuggestions) && data.aiSuggestions.length > 0) {
        // Only restore suggestions not already in confirmed tags
        const notYetConfirmed = data.aiSuggestions.filter(
          (s: AISuggestion) => !data.tags.includes(s.category)
        );
        setAiSuggestions(notYetConfirmed);
      }
    } catch {
      setNotFound(true);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { fetchEntry(); }, [fetchEntry]);

  function enterDeepWrite() {
    setIsDeepWrite(true);
    document.documentElement.classList.add("imw-deep-write-active");
    document.documentElement.requestFullscreen().catch(() => {});
    setDeepWriteDefault(true);
  }

  function exitDeepWrite() {
    setIsDeepWrite(false);
    document.documentElement.classList.remove("imw-deep-write-active");
    if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
    setDeepWriteDefault(false);
  }

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

  useEffect(() => {
    return () => { document.documentElement.classList.remove("imw-deep-write-active"); };
  }, []);

  async function handleSave() {
    if (!entry) return;

    let hasText = false;
    try {
      hasText = extractPlainText(parseEntryContent(editContent)).trim().length > 0;
    } catch {
      hasText = editContent.trim().length > 0;
    }
    if (!hasText) return;

    setSaving(true);
    try {
      const res = await fetch(`/api/entries/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: editContent,
          mood: editMood || null,
          title: editTitle.trim() || null,
        }),
      });
      if (!res.ok) throw new Error("Failed to save");
      const updated = await res.json();
      setEntry(updated);
      setIsEditing(false);

      // Auto-analyze on save if preference is on
      if (prefs.autoAnalyze) {
        triggerAnalysis();
      }
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    setDeleting(true);
    try {
      const res = await fetch(`/api/entries/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete");
      router.push("/");
    } finally {
      setDeleting(false);
    }
  }

  async function triggerAnalysis() {
    if (!entry) return;
    setAnalyzing(true);
    // Clear existing AI suggestions (not confirmed tags)
    setAiSuggestions([]);
    try {
      const res = await fetch(`/api/entries/${id}/analyze`, { method: "POST" });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.suggestions)) {
          // Exclude any categories already confirmed
          const confirmedTags = entry.tags;
          const fresh = data.suggestions.filter(
            (s: AISuggestion) => !confirmedTags.includes(s.category)
          );
          setAiSuggestions(fresh);
          // Refresh entry to get updated aiSuggestions from DB
          const refreshed = await fetch(`/api/entries/${id}`);
          if (refreshed.ok) setEntry(await refreshed.json());
        }
      }
    } catch {
      // Silent fail
    } finally {
      setAnalyzing(false);
    }
  }

  async function handleTagToggle(tag: string) {
    if (!entry) return;
    const newTags = entry.tags.includes(tag)
      ? entry.tags.filter((t) => t !== tag)
      : [...entry.tags, tag];
    setEntry({ ...entry, tags: newTags });
    await fetch(`/api/entries/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tags: newTags }),
    });
  }

  async function confirmSuggestion(suggestion: AISuggestion) {
    if (!entry) return;
    const newTags = entry.tags.includes(suggestion.category)
      ? entry.tags
      : [...entry.tags, suggestion.category];
    setEntry({ ...entry, tags: newTags });
    setAiSuggestions((prev) => prev.filter((s) => s.category !== suggestion.category));
    await fetch(`/api/entries/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tags: newTags }),
    });
  }

  function dismissSuggestion(category: string) {
    setAiSuggestions((prev) => prev.filter((s) => s.category !== category));
  }

  const wasEdited = entry && entry.updatedAt !== entry.createdAt;

  return (
    <div
      style={{
        minHeight: "100vh",
        backgroundColor: "var(--imw-bg-base)",
        padding: "0 24px 40px",
      }}
    >
      <div style={{ maxWidth: 720, margin: "0 auto" }}>

        {/* Sticky header */}
        <div
          style={{
            position: "sticky",
            top: 0,
            background: "var(--imw-bg-base)",
            zIndex: 10,
            paddingTop: 40,
            paddingBottom: 16,
            borderBottom: "0.5px solid var(--imw-border-default)",
            marginBottom: 24,
          }}
        >
          <Link
            href="/"
            className="imw-deep-write-chrome"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              color: "var(--imw-ac)",
              textDecoration: "none",
              fontSize: 13,
              marginBottom: 16,
            }}
          >
            <ArrowLeft size={14} />
            Back to journal
          </Link>

          {!loading && entry && (
            <>
              {/* Header row: title (or date) + action buttons */}
              <div
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  justifyContent: "space-between",
                  gap: 16,
                }}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  {/* Entry title — prominent in header */}
                  {isEditing ? (
                    <input
                      type="text"
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                      placeholder="Untitled entry"
                      style={{
                        background: "transparent",
                        border: "none",
                        outline: "none",
                        fontFamily: "var(--imw-font-body)",
                        fontSize: 22,
                        fontWeight: 400,
                        color: editTitle ? "var(--imw-text-primary)" : "var(--imw-text-tertiary)",
                        padding: "0 0 4px",
                        caretColor: "var(--imw-ac)",
                        width: "100%",
                      }}
                    />
                  ) : entry.title ? (
                    <p className="imw-h1" style={{ marginBottom: 4 }}>{entry.title}</p>
                  ) : null}
                  <p className="imw-ui" style={{ color: "var(--imw-text-secondary)" }}>
                    {formatDate(entry.createdAt)}
                  </p>
                  {wasEdited && (
                    <p className="imw-caption" style={{ color: "var(--imw-text-tertiary)", marginTop: 2 }}>
                      Last edited {formatShortDate(entry.updatedAt)}
                    </p>
                  )}
                  {entry.mood && (
                    <p className="imw-caption" style={{ color: "var(--imw-text-tertiary)", marginTop: 4 }}>
                      mood: {entry.mood}
                    </p>
                  )}
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
                  <button
                    type="button"
                    className="imw-btn imw-btn--ghost imw-btn--sm"
                    onClick={() => setDrawerOpen(true)}
                    aria-label="Writing controls"
                  >
                    <Settings2 size={14} />
                  </button>
                  <button
                    className="imw-btn imw-btn--ghost imw-btn--sm"
                    onClick={isDeepWrite ? exitDeepWrite : enterDeepWrite}
                    aria-label={isDeepWrite ? "Exit deep write" : "Deep write"}
                  >
                    {isDeepWrite ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
                  </button>
                  {isEditing ? (
                    <>
                      <button
                        className="imw-btn imw-btn--ghost imw-btn--sm"
                        onClick={() => {
                          setIsEditing(false);
                          setEditorInstance(null);
                          setEditTitle(entry.title ?? "");
                        }}
                        disabled={saving}
                      >
                        Cancel
                      </button>
                      <button
                        className="imw-btn imw-btn--primary imw-btn--sm"
                        onClick={handleSave}
                        disabled={saving}
                        style={{ opacity: saving ? 0.5 : 1 }}
                      >
                        {saving ? "Saving…" : "Save"}
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        className="imw-btn imw-btn--ghost imw-btn--sm"
                        onClick={() => {
                          setEditContent(entry.content);
                          setEditTitle(entry.title ?? "");
                          setIsEditing(true);
                        }}
                        disabled={deleting}
                      >
                        Edit
                      </button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <button className="imw-btn imw-btn--ghost imw-btn--sm" disabled={deleting}>
                            {deleting ? "Deleting…" : "Delete"}
                          </button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete this entry?</AlertDialogTitle>
                            <AlertDialogDescription>This cannot be undone.</AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={handleDelete}
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            >
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </>
                  )}
                </div>
              </div>

              {/* Category tags + AI suggestions — hidden in deep write */}
              {!isDeepWrite && (
                <div style={{ marginTop: 16 }}>
                  {/* Confirmed tags */}
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                    {CATEGORIES.map((cat) => {
                      const isConfirmed = entry.tags.includes(cat.id);
                      if (!isConfirmed) return null;
                      return (
                        <button
                          key={cat.id}
                          onClick={() => handleTagToggle(cat.id)}
                          style={{ background: "none", border: "none", cursor: "pointer", padding: 0 }}
                          title="Click to remove"
                        >
                          <AnnotationTag category={cat.id as CategoryId} state="confirmed" />
                        </button>
                      );
                    })}

                    {/* AI suggested tags (not yet confirmed) */}
                    {aiSuggestions.map((s) => (
                      CATEGORIES.some((c) => c.id === s.category) && (
                        <AnnotationTag
                          key={s.category}
                          category={s.category as CategoryId}
                          state="ai-suggested"
                          rationale={s.rationale}
                          onConfirm={() => confirmSuggestion(s)}
                          onDismiss={() => dismissSuggestion(s.category)}
                        />
                      )
                    ))}

                    {/* Loading skeleton */}
                    {analyzing && (
                      <span
                        className="imw-ann imw-ann--unconfirmed"
                        style={{ fontStyle: "italic", opacity: 0.6 }}
                      >
                        analyzing…
                      </span>
                    )}

                    {/* Manually add category button */}
                    {CATEGORIES.filter(
                      (c) =>
                        !entry.tags.includes(c.id) &&
                        !aiSuggestions.some((s) => s.category === c.id)
                    ).length > 0 && (
                      <div style={{ position: "relative" }}>
                        <select
                          onChange={(e) => {
                            if (e.target.value) handleTagToggle(e.target.value);
                            e.target.value = "";
                          }}
                          style={{
                            fontSize: 11,
                            padding: "3px 8px",
                            borderRadius: 3,
                            border: "0.5px dashed var(--imw-border-medium)",
                            background: "transparent",
                            color: "var(--imw-text-tertiary)",
                            cursor: "pointer",
                          }}
                          defaultValue=""
                        >
                          <option value="" disabled>+ add tag</option>
                          {CATEGORIES
                            .filter((c) => !entry.tags.includes(c.id) && !aiSuggestions.some((s) => s.category === c.id))
                            .map((c) => (
                              <option key={c.id} value={c.id}>{c.label}</option>
                            ))
                          }
                        </select>
                      </div>
                    )}

                    {/* Re-analyze button (subtle) */}
                    <button
                      onClick={triggerAnalysis}
                      disabled={analyzing}
                      className="imw-btn imw-btn--ghost imw-btn--sm"
                      style={{
                        fontSize: 11,
                        padding: "3px 7px",
                        opacity: analyzing ? 0.5 : 0.8,
                        gap: 4,
                      }}
                      title="Re-analyze entry for category suggestions"
                    >
                      <Sparkles size={11} />
                      {analyzing ? "analyzing…" : "analyze"}
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {loading && (
          <p className="imw-body" style={{ color: "var(--imw-text-tertiary)" }}>Loading…</p>
        )}

        {!loading && notFound && (
          <div>
            <p className="imw-body" style={{ color: "var(--imw-text-tertiary)", marginBottom: 8 }}>
              Entry not found.
            </p>
            <Link href="/" className="imw-body" style={{ color: "var(--imw-ac)", textDecoration: "underline" }}>
              Return to journal
            </Link>
          </div>
        )}

        {!loading && entry && (
          <div style={{ paddingTop: 8 }}>
            {isEditing ? (
              <IMWEditor
                initialContent={entry.content}
                onChange={setEditContent}
                onEditorReady={setEditorInstance}
                fontSize={prefs.editorFontSize}
                lineWidth={resolvedLineWidth}
                disabled={saving}
                autoFocus
              />
            ) : (
              <IMWReadView
                content={entry.content}
                fontSize={prefs.editorFontSize}
                lineWidth={resolvedLineWidth}
              />
            )}
          </div>
        )}
      </div>

      <WriteControlsDrawer
        isOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        editor={editorInstance}
        mood={editMood}
        onMoodChange={setEditMood}
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
