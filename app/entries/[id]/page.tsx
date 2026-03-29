"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Settings2, Maximize2, Minimize2, Sparkles, Pencil, Trash2, Save, X } from "lucide-react";
import type { Editor } from "@tiptap/react";
import { IMWEditor, IMWReadView, WriteControlsDrawer } from "@/components/editor";
import AnnotationTag from "@/components/AnnotationTag";
import { useIMWTheme } from "@/components/ThemeProvider";
import { LINE_WIDTH_VALUES, CATEGORIES, type CategoryId } from "@/lib/theme";
import { parseEntryContent, extractPlainText } from "@/lib/tiptap-content";
import type { AISuggestion, AIAnalysisResult } from "@/lib/types";
import { DSM_CRITERIA_IDS } from "@/lib/types";
import { useMobile } from "@/hooks/useMobile";
import { usePlan } from "@/components/PlanProvider";

const MOODS = ["overwhelmed", "drained", "okay", "grounded", "good", "uncertain"];

type JournalEntry = {
  id: string;
  content: string;
  title?: string | null;
  mood?: string | null;
  tags: string[];
  aiSuggestions?: AIAnalysisResult | null;
  isChildhoodMemory: boolean;
  isFunctionalImpairment: boolean;
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
  const [deleteConfirming, setDeleteConfirming] = useState(false);

  // Drawer + editor instance
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editorInstance, setEditorInstance] = useState<Editor | null>(null);

  // AI state
  const [aiSuggestions, setAiSuggestions] = useState<AISuggestion[]>([]);
  const [analyzing, setAnalyzing] = useState(false);

  const { prefs, setDeepWriteDefault } = useIMWTheme();
  const { isASDUser } = usePlan();
  const [isDeepWrite, setIsDeepWrite] = useState(false);
  const isMobile = useMobile();
  const resolvedLineWidth =
    LINE_WIDTH_VALUES[prefs.editorLineWidth as keyof typeof LINE_WIDTH_VALUES] ?? "640px";

  // Rationale lookup map: category id → rationale string, derived from saved AI suggestions
  const rationaleMap = useMemo(
    () =>
      Object.fromEntries(
        (entry?.aiSuggestions?.livedExperience ?? []).map((s: AISuggestion) => [s.category, s.rationale])
      ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [entry?.aiSuggestions]
  );

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
      if (data.aiSuggestions?.livedExperience?.length > 0) {
        const notYetConfirmed = (data.aiSuggestions.livedExperience as AISuggestion[]).filter(
          (s) => !data.tags.includes(s.category) && !(DSM_CRITERIA_IDS as ReadonlyArray<string>).includes(s.category)
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

      // Auto-analyze on save if preference is on (asd_user only)
      if (isASDUser && prefs.autoAnalyze) {
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
        const result: AIAnalysisResult | null = data.suggestions ?? null;
        if (result?.livedExperience) {
          // Exclude any categories already confirmed
          const confirmedTags = entry.tags;
          const fresh = result.livedExperience.filter(
            (s) => !confirmedTags.includes(s.category) && !(DSM_CRITERIA_IDS as ReadonlyArray<string>).includes(s.category)
          );
          setAiSuggestions(fresh);
          // Refresh entry to get updated aiSuggestions + boolean flags from DB
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

  async function handleQualifierToggle(field: "isChildhoodMemory" | "isFunctionalImpairment") {
    if (!entry) return;
    const newValue = !entry[field];
    setEntry({ ...entry, [field]: newValue });
    await fetch(`/api/entries/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ [field]: newValue }),
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
  const confirmedCount = entry?.tags?.length ?? 0;
  const pendingCount = aiSuggestions.length;

  const moodChipStyle = (m: string) => ({
    fontSize: '0.65rem',
    fontWeight: 600 as const,
    textTransform: 'uppercase' as const,
    letterSpacing: '0.04em',
    padding: '3px 9px',
    border: `1.5px solid ${editMood === m ? 'var(--imw-ac-b)' : 'var(--imw-border-medium)'}`,
    background: editMood === m ? 'var(--imw-ac-l)' : 'none',
    color: editMood === m ? 'var(--imw-ac-d)' : 'var(--imw-text-secondary)',
    cursor: 'pointer',
    borderRadius: 0,
    fontFamily: 'var(--imw-font-ui)',
  });

  return (
    <div style={{ minHeight: "100vh", backgroundColor: "var(--imw-bg-base)", display: "flex", flexDirection: "column" }}>

      {/* ── Top bar (UI-05) ── */}
      {!isDeepWrite && !isMobile && (
        <div className="imw-top-bar imw-deep-write-chrome">
          {/* Left: breadcrumb */}
          <button
            onClick={() => router.push("/")}
            style={{ background: "none", border: "none", cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 5, fontFamily: "var(--imw-font-ui)", fontSize: "0.75rem", color: "var(--imw-text-secondary)" }}
          >
            <ArrowLeft size={12} />
            Journal{entry?.title ? ` / ${entry.title}` : ""}
          </button>
          {/* Right: actions */}
          {!loading && entry && (
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              {isEditing && (
                <button
                  type="button"
                  className="imw-btn imw-btn--ghost imw-btn--sm"
                  onClick={() => setDrawerOpen(true)}
                  aria-label="Writing controls"
                >
                  <Settings2 size={13} />
                </button>
              )}
              {isEditing ? (
                <>
                  <button
                    type="button"
                    className="imw-btn imw-btn--ghost imw-btn--sm"
                    onClick={isDeepWrite ? exitDeepWrite : enterDeepWrite}
                    aria-label={isDeepWrite ? "Exit Deep Write" : "Enter Deep Write"}
                  >
                    {isDeepWrite ? <Minimize2 size={13} /> : <Maximize2 size={13} />}
                  </button>
                  <button
                    className="imw-btn imw-btn--ghost imw-btn--sm"
                    onClick={() => { setIsEditing(false); setEditorInstance(null); setEditTitle(entry.title ?? ""); setDeleteConfirming(false); }}
                    disabled={saving}
                  >
                    Cancel
                  </button>
                  <button
                    className="imw-btn imw-btn--primary imw-btn--sm"
                    onClick={handleSave}
                    disabled={saving || (editorInstance?.isEmpty ?? true)}
                    style={{ opacity: saving || (editorInstance?.isEmpty ?? true) ? 0.5 : 1 }}
                  >
                    {saving ? "Saving…" : "Save"}
                  </button>
                  {deleteConfirming ? (
                    <>
                      <button
                        className="imw-btn imw-btn--ghost imw-btn--sm"
                        onClick={() => setDeleteConfirming(false)}
                      >
                        Cancel
                      </button>
                      <button
                        className="imw-btn imw-btn--ghost imw-btn--sm"
                        onClick={handleDelete}
                        disabled={deleting}
                        style={{ color: "var(--imw-error-text)" }}
                      >
                        {deleting ? "Deleting…" : "Are you sure?"}
                      </button>
                    </>
                  ) : (
                    <button
                      className="imw-btn imw-btn--ghost imw-btn--sm"
                      onClick={() => setDeleteConfirming(true)}
                      disabled={deleting}
                      aria-label="Delete entry"
                    >
                      <Trash2 size={12} />
                    </button>
                  )}
                </>
              ) : (
                <>
                  <button
                    className="imw-btn imw-btn--ghost imw-btn--sm"
                    onClick={() => { setEditContent(entry.content); setEditTitle(entry.title ?? ""); setIsEditing(true); }}
                    disabled={deleting}
                  >
                    <Pencil size={12} />
                    Edit
                  </button>
                  {deleteConfirming ? (
                    <>
                      <button
                        className="imw-btn imw-btn--ghost imw-btn--sm"
                        onClick={() => setDeleteConfirming(false)}
                      >
                        Cancel
                      </button>
                      <button
                        className="imw-btn imw-btn--ghost imw-btn--sm"
                        onClick={handleDelete}
                        disabled={deleting}
                        style={{ color: "var(--imw-error-text)" }}
                      >
                        {deleting ? "Deleting…" : "Are you sure?"}
                      </button>
                    </>
                  ) : (
                    <button
                      className="imw-btn imw-btn--ghost imw-btn--sm"
                      onClick={() => setDeleteConfirming(true)}
                      disabled={deleting}
                    >
                      <Trash2 size={12} />
                      Delete
                    </button>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── Scrollable content ── */}
      <div style={{ flex: 1, padding: isMobile ? "72px 16px 120px" : "32px 24px 120px", display: "flex", flexDirection: "column", alignItems: "center" }}>
        <div style={{ width: "100%", maxWidth: 720 }}>

          {loading && <p className="imw-body" style={{ color: "var(--imw-text-tertiary)" }}>Loading…</p>}

          {!loading && notFound && (
            <div>
              <p className="imw-body" style={{ color: "var(--imw-text-tertiary)", marginBottom: 8 }}>Entry not found.</p>
              <Link href="/" className="imw-body" style={{ color: "var(--imw-ac)", textDecoration: "underline" }}>Return to journal</Link>
            </div>
          )}

          {/* Mobile header (only on mobile) */}
          {isMobile && !loading && entry && (
            <div style={{ marginBottom: 12 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <Link href="/" style={{ display: "inline-flex", alignItems: "center", gap: 5, color: "var(--imw-ac)", textDecoration: "none", fontSize: "0.75rem" }}>
                  <ArrowLeft size={12} />
                  Back
                </Link>
                {!isDeepWrite && (
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    {isEditing ? (
                      <>
                        <button
                          type="button"
                          className="imw-btn imw-btn--ghost imw-btn--sm"
                          onClick={() => setDrawerOpen(true)}
                          aria-label="Writing controls"
                        >
                          <Settings2 size={13} />
                        </button>
                        <button
                          type="button"
                          className="imw-btn imw-btn--ghost imw-btn--sm"
                          onClick={enterDeepWrite}
                          aria-label="Enter Deep Write"
                        >
                          <Maximize2 size={13} />
                        </button>
                        <button
                          className="imw-btn imw-btn--ghost imw-btn--sm"
                          onClick={() => { setIsEditing(false); setEditorInstance(null); setEditTitle(entry.title ?? ""); setDeleteConfirming(false); }}
                          disabled={saving}
                        >
                          Cancel
                        </button>
                        <button
                          className="imw-btn imw-btn--primary imw-btn--sm"
                          onClick={handleSave}
                          disabled={saving || (editorInstance?.isEmpty ?? true)}
                          style={{ opacity: saving || (editorInstance?.isEmpty ?? true) ? 0.5 : 1 }}
                        >
                          {saving ? "Saving…" : "Save"}
                        </button>
                        {deleteConfirming ? (
                          <>
                            <button
                              className="imw-btn imw-btn--ghost imw-btn--sm"
                              onClick={() => setDeleteConfirming(false)}
                            >
                              Cancel
                            </button>
                            <button
                              className="imw-btn imw-btn--ghost imw-btn--sm"
                              onClick={handleDelete}
                              disabled={deleting}
                              style={{ color: "var(--imw-error-text)" }}
                            >
                              {deleting ? "Deleting…" : "Are you sure?"}
                            </button>
                          </>
                        ) : (
                          <button
                            className="imw-btn imw-btn--ghost imw-btn--sm"
                            onClick={() => setDeleteConfirming(true)}
                            disabled={deleting}
                            aria-label="Delete entry"
                          >
                            <Trash2 size={12} />
                          </button>
                        )}
                      </>
                    ) : (
                      <button
                        className="imw-btn imw-btn--ghost imw-btn--sm"
                        onClick={() => { setEditContent(entry.content); setEditTitle(entry.title ?? ""); setIsEditing(true); }}
                        disabled={deleting}
                      >
                        <Pencil size={12} />
                        Edit
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {!loading && entry && (
            <>
              {/* Entry title (UI-09) */}
              {isEditing ? (
                <input
                  type="text"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  placeholder="Untitled entry"
                  className="imw-entry-title-input"
                  style={{
                    background: "transparent",
                    border: "none",
                    outline: "none",
                    fontFamily: "var(--imw-font-display)",
                    fontSize: '1.7rem',
                    fontWeight: 900,
                    lineHeight: 1.1,
                    color: editTitle ? "var(--imw-text-primary)" : "var(--imw-text-tertiary)",
                    padding: "0 0 8px 44px",
                    caretColor: "var(--imw-ac)",
                    width: "100%",
                    marginBottom: 8,
                  }}
                />
              ) : entry.title ? (
                <h1 style={{ fontFamily: 'var(--imw-font-display)', fontWeight: 900, fontSize: '1.7rem', lineHeight: 1.1, color: 'var(--imw-text-primary)', marginBottom: 12 }}>
                  {entry.title}
                </h1>
              ) : null}

              {/* Date / mood metadata */}
              <div>
                <p style={{ fontSize: '0.65rem', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--imw-text-tertiary)', marginBottom: 4 }}>
                  {formatDate(entry.createdAt)}
                </p>
                {wasEdited && (
                  <p className="imw-caption" style={{ color: "var(--imw-text-tertiary)", marginBottom: 4 }}>
                    Last edited {formatShortDate(entry.updatedAt)}
                  </p>
                )}
                {/* Mood (read view) */}
                {entry.mood && !isEditing && (
                  <p style={{ fontSize: '0.65rem', color: 'var(--imw-text-tertiary)', marginBottom: 4 }}>
                    mood: {entry.mood}
                  </p>
                )}
              </div>

              {/* Divider before annotation chips */}
              {!isDeepWrite && (
                <div className="imw-divider" style={{ marginTop: 14, marginBottom: 22 }} />
              )}

              {/* Category tags + qualifier toggles (below divider) */}
              {!isDeepWrite && (
                <div style={{ marginBottom: 20 }}>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 8 }}>
                    {CATEGORIES.map((cat) => {
                      const isConfirmed = entry.tags.includes(cat.id);
                      if (!isConfirmed) return null;
                      return (
                        <button key={cat.id} onClick={() => handleTagToggle(cat.id)} style={{ background: "none", border: "none", cursor: "pointer", padding: 0 }} title="Click to remove">
                          <AnnotationTag category={cat.id as CategoryId} state="confirmed" rationale={rationaleMap[cat.id]} />
                        </button>
                      );
                    })}
                    {aiSuggestions.map((s) => (
                      CATEGORIES.some((c) => c.id === s.category) && (
                        <AnnotationTag key={s.category} category={s.category as CategoryId} state="ai-suggested" rationale={s.rationale} onConfirm={() => confirmSuggestion(s)} onDismiss={() => dismissSuggestion(s.category)} />
                      )
                    ))}
                    {analyzing && (
                      <span className="imw-ann imw-ann--unconfirmed" style={{ fontStyle: "italic", opacity: 0.7, display: "inline-flex", alignItems: "center" }}>
                        <span className="imw-spinner" />analyzing…
                      </span>
                    )}
                    {CATEGORIES.filter((c) => !entry.tags.includes(c.id) && !aiSuggestions.some((s) => s.category === c.id)).length > 0 && (
                      <select
                        onChange={(e) => { if (e.target.value) handleTagToggle(e.target.value); e.target.value = ""; }}
                        style={{ fontSize: '0.65rem', padding: "3px 8px", borderRadius: 0, border: "0.5px dashed var(--imw-border-medium)", background: "transparent", color: "var(--imw-text-tertiary)", cursor: "pointer" }}
                        defaultValue=""
                      >
                        <option value="" disabled>+ add tag</option>
                        {CATEGORIES.filter((c) => !entry.tags.includes(c.id) && !aiSuggestions.some((s) => s.category === c.id)).map((c) => (
                          <option key={c.id} value={c.id}>{c.label}</option>
                        ))}
                      </select>
                    )}
                    {!analyzing && (
                      <button onClick={triggerAnalysis} disabled={isASDUser ? (editorInstance?.isEmpty ?? false) : true} className="imw-btn imw-btn--ghost imw-btn--sm" style={{ fontSize: '0.65rem', padding: "3px 7px", opacity: isASDUser ? 0.8 : 0.4, gap: 4, cursor: isASDUser ? undefined : "not-allowed" }} title={isASDUser ? "Re-analyze" : "Upgrade to Articulate to unlock AI tag suggestions"}>
                        <Sparkles size={11} />
                        analyze
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* Edit mode mood chips */}
              {isEditing && (
                <div style={{ marginBottom: 16 }}>
                  <p style={{ fontFamily: 'var(--imw-font-ui)', fontSize: '0.6rem', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--imw-text-tertiary)', marginBottom: 6 }}>Mood</p>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
                    {MOODS.map((m) => (
                      <button key={m} type="button" onClick={() => setEditMood(editMood === m ? "" : m)} style={moodChipStyle(m)}>{m}</button>
                    ))}
                  </div>
                </div>
              )}

              {/* Body text (UI-09) */}
              <div style={{ fontSize: '1rem', lineHeight: 1.85 }}>
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
            </>
          )}
        </div>
      </div>

      {/* ── Sticky footer bar (UI-09) ── */}
      {!loading && entry && !isEditing && (
        <div style={{ position: "sticky", bottom: 0, background: "var(--imw-bg-surface)", borderTop: "1.5px solid var(--imw-border-medium)", padding: "10px 24px", display: "flex", justifyContent: "space-between", alignItems: "center", zIndex: 10 }}>
          <span style={{ fontSize: '0.65rem', color: 'var(--imw-text-tertiary)', fontFamily: 'var(--imw-font-ui)' }}>
            {confirmedCount} confirmed · {pendingCount} pending
          </span>
          {pendingCount > 0 && (
            <button className="imw-btn imw-btn--ghost imw-btn--sm">Mark Reviewed</button>
          )}
        </div>
      )}

      {/* Deep Write: icon buttons fixed upper-right */}
      {isDeepWrite && (
        <div style={{ position: "fixed", top: 14, right: 16, zIndex: 40, display: "flex", gap: 6, alignItems: "center" }}>
          <button
            type="button"
            className="imw-btn imw-btn--ghost imw-btn--sm"
            onClick={handleSave}
            disabled={saving || (editorInstance?.isEmpty ?? true)}
            aria-label="Save"
          >
            <Save size={13} />
          </button>
          {deleteConfirming ? (
            <>
              <button
                type="button"
                className="imw-btn imw-btn--ghost imw-btn--sm"
                onClick={() => setDeleteConfirming(false)}
                aria-label="Cancel delete"
              >
                <X size={13} />
              </button>
              <button
                type="button"
                className="imw-btn imw-btn--ghost imw-btn--sm"
                onClick={handleDelete}
                disabled={deleting}
                aria-label="Confirm delete"
                style={{ color: "var(--imw-error-text)" }}
              >
                <Trash2 size={13} />
              </button>
            </>
          ) : (
            <button
              type="button"
              className="imw-btn imw-btn--ghost imw-btn--sm"
              onClick={() => setDeleteConfirming(true)}
              aria-label="Delete entry"
            >
              <Trash2 size={13} />
            </button>
          )}
          <button
            type="button"
            className="imw-btn imw-btn--ghost imw-btn--sm"
            onClick={() => setDrawerOpen(true)}
            aria-label="Writing controls"
          >
            <Settings2 size={13} />
          </button>
          <button
            type="button"
            className="imw-btn imw-btn--ghost imw-btn--sm"
            onClick={exitDeepWrite}
            aria-label="Exit Deep Write"
          >
            <Minimize2 size={13} />
          </button>
        </div>
      )}

      <WriteControlsDrawer
        isOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        editor={editorInstance}
        mood={editMood}
        onMoodChange={setEditMood}
      />
      {drawerOpen && (
        <div className="imw-drawer-backdrop" onClick={() => setDrawerOpen(false)} aria-hidden="true" />
      )}
    </div>
  );
}
