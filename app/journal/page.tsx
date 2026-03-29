"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { BookOpen, Settings2, Maximize2, Minimize2, X, Sparkles, RefreshCw, RotateCcw, Save, Trash2 } from "lucide-react";
import type { Editor } from "@tiptap/react";
import { IMWEditor, WriteControlsDrawer } from "@/components/editor";
import { useIMWTheme } from "@/components/ThemeProvider";
import AnnotationTag from "@/components/AnnotationTag";
import { LINE_WIDTH_VALUES, CATEGORIES, type CategoryId } from "@/lib/theme";
import { parseEntryContent, extractPlainText } from "@/lib/tiptap-content";
import type { AISuggestion } from "@/lib/types";
import { useMobile } from "@/hooks/useMobile";
import { usePlan } from "@/components/PlanProvider";

const MOODS = ["overwhelmed", "drained", "okay", "grounded", "good", "uncertain"];

type JournalEntry = {
  id: string;
  content: string;
  title?: string | null;
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

function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

export default function JournalPage() {
  const [content, setContent] = useState("");
  const [title, setTitle] = useState("");
  const [titleTouched, setTitleTouched] = useState(false);
  const [titleIsAI, setTitleIsAI] = useState(false);
  const [titleGenerating, setTitleGenerating] = useState(false);
  const [titleEverShown, setTitleEverShown] = useState(false);
  const [mood, setMood] = useState("");
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [newEntryId, setNewEntryId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  // Composer analyze state (inline tags panel)
  const [showDetails, setShowDetails] = useState(false);
  const [composerAiSuggestions, setComposerAiSuggestions] = useState<AISuggestion[]>([]);
  const [composerAnalyzing, setComposerAnalyzing] = useState(false);
  const [savedEntryId, setSavedEntryId] = useState<string | null>(null);
  const [composerTags, setComposerTags] = useState<string[]>([]);
  const [editorInstance, setEditorInstance] = useState<Editor | null>(null);
  const [composerDiscardConfirming, setComposerDiscardConfirming] = useState(false);

  const router = useRouter();
  const isMobile = useMobile();
  const { prefs, setDeepWriteDefault } = useIMWTheme();
  const { isASDUser } = usePlan();
  const titleVisible = isASDUser ? !!(title || titleEverShown) : true;
  const [isDeepWrite, setIsDeepWrite] = useState(false);
  const resolvedLineWidth =
    LINE_WIDTH_VALUES[prefs.editorLineWidth as keyof typeof LINE_WIDTH_VALUES] ?? "640px";

  // Debounce timer ref for auto-title generation
  const titleDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Track whether we've already auto-generated at this session to avoid re-firing
  const titleGeneratedRef = useRef(false);
  // Ref for auto-resizing title textarea
  const titleTextareaRef = useRef<HTMLTextAreaElement | null>(null);

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

  // Auto-trigger title generation at 40-character threshold (debounced)
  useEffect(() => {
    if (!isASDUser) return; // Title auto-generation is an asd_user feature
    if (titleTouched) return; // User typed a custom title — never auto-fill
    if (titleGeneratedRef.current) return; // Already generated once this session

    const plainText = getPreviewText(content);

    if (plainText.trim().length < 40) return;

    if (titleDebounceRef.current) clearTimeout(titleDebounceRef.current);

    titleDebounceRef.current = setTimeout(async () => {
      if (titleTouched || titleGeneratedRef.current) return;
      setTitleGenerating(true);
      try {
        const res = await fetch("/api/entries/new/generate-title", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ content: plainText }),
        });
        if (res.ok) {
          const data = await res.json();
          if (data.title && !titleTouched) {
            setTitle(data.title);
            setTitleIsAI(true);
            setTitleEverShown(true);
            titleGeneratedRef.current = true;
          }
        }
      } catch {
        // Silent fail — title generation is non-blocking
      } finally {
        setTitleGenerating(false);
      }
    }, 1500);

    return () => {
      if (titleDebounceRef.current) clearTimeout(titleDebounceRef.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [content, titleTouched, isASDUser]);

  async function saveEntry() {
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
        body: JSON.stringify({
          content,
          mood: mood || undefined,
          title: title.trim() || undefined,
        }),
      });

      if (!res.ok) throw new Error("Failed to save entry");

      const newEntry = await res.json();

      if (isDeepWrite) {
        exitDeepWrite();
        router.push(`/entries/${newEntry.id}`);
      } else {
        // Clear the TipTap editor content directly
        editorInstance?.commands.clearContent(true);
        setContent("");
        setTitle("");
        setTitleTouched(false);
        setTitleIsAI(false);
        setTitleEverShown(false);
        titleGeneratedRef.current = false;
        setMood("");
        setNewEntryId(newEntry.id);
        await fetchEntries();
        // Clear the animation class after it completes
        setTimeout(() => setNewEntryId(null), 800);
      }
    } catch (err) {
      setError("Could not save entry. Please try again.");
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    await saveEntry();
  }

  function discardDraft() {
    setContent("");
    setTitle("");
    setTitleTouched(false);
    setTitleIsAI(false);
    setTitleEverShown(false);
    titleGeneratedRef.current = false;
    setMood("");
    editorInstance?.commands.clearContent();
    setDrawerOpen(false);
    setIsResetting(false);
    setShowDetails(false);
    setComposerAiSuggestions([]);
    setSavedEntryId(null);
    setComposerTags([]);
  }

  async function retryTitleGeneration() {
    const plainText = getPreviewText(content);
    if (plainText.trim().length < 40) return;
    titleGeneratedRef.current = false;
    setTitleIsAI(false);
    setTitleGenerating(true);
    try {
      const res = await fetch("/api/entries/new/generate-title", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: plainText }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.title) {
          setTitle(data.title);
          setTitleIsAI(true);
          setTitleEverShown(true);
          titleGeneratedRef.current = true;
        }
      }
    } catch {
      // Silent fail
    } finally {
      setTitleGenerating(false);
    }
  }

  /** Save the current entry silently (no editor clear), return the entry ID. */
  async function saveSilentForAnalysis(): Promise<string | null> {
    // If already saved this draft, return the existing ID
    if (savedEntryId) return savedEntryId;
    let hasText = false;
    try {
      const parsed = parseEntryContent(content);
      hasText = extractPlainText(parsed).trim().length > 0;
    } catch {
      hasText = content.trim().length > 0;
    }
    if (!hasText) return null;
    try {
      const res = await fetch("/api/entries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content,
          mood: mood || undefined,
          title: title.trim() || undefined,
        }),
      });
      if (!res.ok) return null;
      const newEntry = await res.json();
      setSavedEntryId(newEntry.id);
      return newEntry.id;
    } catch {
      return null;
    }
  }

  async function analyzeComposerEntry() {
    setComposerAnalyzing(true);
    try {
      const entryId = await saveSilentForAnalysis();
      if (!entryId) return;
      const res = await fetch(`/api/entries/${entryId}/analyze`, { method: "POST" });
      if (!res.ok) return;
      const data = await res.json();
      const suggestions: AISuggestion[] = [
        ...(data.livedExperience ?? []),
      ];
      setComposerAiSuggestions(suggestions);
      setShowDetails(true);
    } catch {
      // Silent fail
    } finally {
      setComposerAnalyzing(false);
    }
  }

  function enterDeepWrite() {
    setIsDeepWrite(true);
    document.documentElement.classList.add("imw-deep-write-active");
    document.documentElement.requestFullscreen().catch(() => {});
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
    if (!searchOpen) return;
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape" || e.key === "Enter") setSearchOpen(false);
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [searchOpen]);

  useEffect(() => {
    function handleOpenSearch() { setSearchOpen(true); }
    window.addEventListener("imw:open-search", handleOpenSearch);
    return () => window.removeEventListener("imw:open-search", handleOpenSearch);
  }, []);

  function hasContent(): boolean {
    try {
      return extractPlainText(parseEntryContent(content)).trim().length > 0;
    } catch {
      return content.trim().length > 0;
    }
  }

  const moodChipStyle = (m: string) => ({
    fontSize: '0.65rem',
    fontWeight: 600 as const,
    textTransform: 'uppercase' as const,
    letterSpacing: '0.04em',
    padding: '3px 9px',
    border: `1.5px solid ${mood === m ? 'var(--imw-ac-b)' : 'var(--imw-border-medium)'}`,
    background: mood === m ? 'var(--imw-ac-l)' : 'none',
    color: mood === m ? 'var(--imw-ac-d)' : 'var(--imw-text-secondary)',
    cursor: 'pointer',
    borderRadius: 0,
    fontFamily: 'var(--imw-font-ui)',
  });

  return (
    <div style={{ minHeight: "100vh", backgroundColor: "var(--imw-bg-base)", display: "flex", flexDirection: "column" }}>

      {/* ── Top bar (UI-05) ── */}
      {!isMobile && (
        <div className="imw-top-bar imw-deep-write-chrome">
          <span style={{ fontFamily: 'var(--imw-font-ui)', fontSize: '0.6rem', fontWeight: 600, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--imw-text-tertiary)' }}>
            Journal
          </span>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            {prefs.autoAnalyze && (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: '0.6rem', fontWeight: 600, color: 'var(--imw-ac)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--imw-ac)', animation: 'imw-blink 1.4s ease infinite' }} />
                AI Ready
              </span>
            )}
            <button
              type="button"
              className="imw-btn imw-btn--ghost imw-btn--sm"
              onClick={isDeepWrite ? exitDeepWrite : enterDeepWrite}
              title="Deep write — full focus mode"
            >
              {isDeepWrite ? <Minimize2 size={13} /> : <Maximize2 size={13} />}
              <span style={{ marginLeft: 3 }}>Deep Write</span>
            </button>
          </div>
        </div>
      )}

      {/* ── Scrollable content (UI-04: centered 720px well) ── */}
      <div
        style={{
          flex: 1,
          ...(isDeepWrite ? {
            paddingTop: "calc(10vh - 50px)",
            paddingRight: "24px",
            paddingBottom: "5vh",
            paddingLeft: "24px",
          } : {
            padding: isMobile ? "72px 16px 40px" : "48px 24px 60px",
          }),
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
        }}
      >
        <div style={{ width: "100%", maxWidth: 720 }}>

          {/* ── Composer (UI-06: borderless) ── */}
          <div
            style={{
              background: "transparent",
              border: "none",
              padding: isMobile ? "16px 0" : "20px 0",
              marginBottom: isDeepWrite ? 0 : 28,
            }}
          >
            <form onSubmit={handleSubmit}>
              {/* Mobile controls — only show enter deep write; exit is handled by the fixed overlay bar */}
              {isMobile && !isDeepWrite && (
                <div style={{ display: "flex", gap: 4, justifyContent: "flex-end", marginBottom: 8 }}>
                  <button
                    type="button"
                    className="imw-btn imw-btn--ghost imw-btn--sm"
                    onClick={enterDeepWrite}
                  >
                    <Maximize2 size={14} />
                  </button>
                </div>
              )}

              {/* Title row — asd_user: hidden until AI suggests or user types; free_user: always visible */}
              <div style={{
                maxHeight: titleVisible ? "200px" : "0px",
                opacity: titleVisible ? 1 : 0,
                overflow: "hidden",
                marginBottom: titleVisible ? 14 : 0,
                paddingBottom: titleVisible ? 4 : 0,
                transition: "max-height 0.5s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.45s ease, margin-bottom 0.4s ease",
              }}>
                <div style={{ position: "relative" }}>
                  <textarea
                    ref={titleTextareaRef}
                    value={title}
                    rows={1}
                    onChange={(e) => {
                      setTitle(e.target.value);
                      setTitleTouched(true);
                      setTitleIsAI(false);
                      setTitleEverShown(true);
                      // Auto-resize
                      e.target.style.height = "auto";
                      e.target.style.height = e.target.scrollHeight + "px";
                    }}
                    placeholder={isASDUser ? "" : "Give this entry a title (optional)"}
                    disabled={submitting}
                    className={isASDUser && titleEverShown && !title ? "imw-title-pulse" : ""}
                    style={{
                      width: "100%",
                      background: "transparent",
                      border: "none",
                      borderBottom: isASDUser && titleEverShown && !title ? undefined : "none",
                      outline: "none",
                      fontFamily: "var(--imw-font-body)",
                      fontSize: 22,
                      fontWeight: 400,
                      color: "var(--imw-text-primary)",
                      padding: "4px 110px 8px 44px",
                      caretColor: "var(--imw-ac)",
                      resize: "none",
                      overflow: "hidden",
                      overflowWrap: "break-word",
                      wordBreak: "break-word",
                      lineHeight: 1.3,
                      display: "block",
                    }}
                  />
                  {/* AI suggested label + retry button — asd_user only */}
                  {isASDUser && <div style={{
                    position: "absolute",
                    right: 0,
                    top: "50%",
                    transform: "translateY(-50%)",
                    display: "flex",
                    alignItems: "center",
                    gap: 4,
                    flexShrink: 0,
                  }}>
                    {(titleIsAI || titleGenerating) && (
                      <button
                        type="button"
                        className="imw-caption"
                        onClick={() => {
                          setTitle("");
                          setTitleIsAI(false);
                          titleTextareaRef.current?.focus();
                        }}
                        style={{
                          color: "var(--imw-ac)",
                          fontStyle: "italic",
                          background: "none",
                          border: "none",
                          cursor: "pointer",
                          padding: 0,
                          fontFamily: "inherit",
                          fontSize: "inherit",
                          lineHeight: "inherit",
                        }}
                        title="Click to clear AI title"
                      >
                        {titleGenerating ? "suggesting…" : "AI suggested"}
                      </button>
                    )}
                    {titleIsAI && !titleGenerating && (
                      <button
                        type="button"
                        onClick={retryTitleGeneration}
                        style={{
                          background: "none",
                          border: "none",
                          cursor: "pointer",
                          color: "var(--imw-ac)",
                          padding: "0 0 0 2px",
                          display: "flex",
                          alignItems: "center",
                          opacity: 0.7,
                        }}
                        title="Regenerate title"
                        aria-label="Regenerate title"
                      >
                        <RefreshCw size={11} />
                      </button>
                    )}
                  </div>}
                </div>
              </div>

              {/* Divider — only shown after title appears */}
              {title && <div className="imw-divider" style={{ marginBottom: 12 }} />}

              {/* Editor scroll area */}
              <div
                className={isDeepWrite ? "imw-composer-wrap" : undefined}
                style={isDeepWrite ? { maxHeight: "calc(80vh - 160px)", overflowY: "auto" } : {}}
              >
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
                  <p className="imw-caption" style={{ color: "var(--imw-error-text)", marginTop: 8 }}>
                    {error}
                  </p>
                )}
              </div>

              {/* Footer (UI-07: mood chips + save) */}
              <div
                className="imw-deep-write-chrome"
                style={{ marginTop: 12, paddingTop: 10, paddingLeft: "44px" }}
              >
                {/* Mood chips */}
                <div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginBottom: 10 }}>
                  {MOODS.map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setMood(mood === m ? "" : m)}
                      style={moodChipStyle(m)}
                    >
                      {m}
                    </button>
                  ))}
                </div>
                {/* Save + Reset row */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  {/* Reset entry — low-prominence recovery option */}
                  {hasContent() && (
                    isResetting ? (
                      <span style={{ display: "inline-flex", alignItems: "center", gap: 8, fontSize: "0.7rem", color: "var(--imw-text-tertiary)", fontFamily: "var(--imw-font-ui)" }}>
                        Clear everything?
                        <button
                          type="button"
                          onClick={discardDraft}
                          style={{ background: "none", border: "none", cursor: "pointer", color: "var(--imw-text-secondary)", fontSize: "0.7rem", fontFamily: "var(--imw-font-ui)", padding: 0, textDecoration: "underline" }}
                        >
                          Yes, reset
                        </button>
                        <button
                          type="button"
                          onClick={() => setIsResetting(false)}
                          style={{ background: "none", border: "none", cursor: "pointer", color: "var(--imw-text-tertiary)", fontSize: "0.7rem", fontFamily: "var(--imw-font-ui)", padding: 0 }}
                        >
                          Cancel
                        </button>
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setIsResetting(true)}
                        style={{
                          background: "none",
                          border: "none",
                          cursor: "pointer",
                          color: "var(--imw-text-tertiary)",
                          fontSize: "0.7rem",
                          fontFamily: "var(--imw-font-ui)",
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 4,
                          padding: 0,
                          opacity: 0.7,
                        }}
                        title="Clear title and content"
                      >
                        <RotateCcw size={11} />
                        Reset entry
                      </button>
                    )
                  )}
                  {!hasContent() && <span />}
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    {/* Analyze button — hidden while analyzing */}
                    {!composerAnalyzing && (
                      <button
                        type="button"
                        onClick={analyzeComposerEntry}
                        disabled={isASDUser ? (editorInstance?.isEmpty ?? true) : true}
                        className="imw-btn imw-btn--ghost imw-btn--sm"
                        style={{ opacity: isASDUser && !(editorInstance?.isEmpty ?? true) ? 0.8 : 0.4, gap: 4, fontSize: "0.7rem", cursor: isASDUser ? undefined : "not-allowed" }}
                        title={isASDUser ? "Analyze entry for categories" : "Upgrade to Articulate to unlock AI tag suggestions"}
                      >
                        <Sparkles size={11} />
                        Analyze
                      </button>
                    )}
                    <button
                      type="submit"
                      disabled={submitting || (editorInstance?.isEmpty ?? true)}
                      className="imw-btn imw-btn--primary"
                      style={{ opacity: submitting || (editorInstance?.isEmpty ?? true) ? 0.5 : 1 }}
                    >
                      {submitting ? "Saving…" : "Save entry"}
                    </button>
                  </div>
                </div>

                {/* Inline details panel — tag suggestions + Show details toggle */}
                {(showDetails || composerAiSuggestions.length > 0) && (
                  <div style={{ marginTop: 12 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
                      <button
                        type="button"
                        onClick={() => setShowDetails(!showDetails)}
                        style={{
                          background: "none",
                          border: "none",
                          cursor: "pointer",
                          color: "var(--imw-text-tertiary)",
                          fontSize: "0.65rem",
                          fontFamily: "var(--imw-font-ui)",
                          fontWeight: 600,
                          letterSpacing: "0.06em",
                          textTransform: "uppercase",
                          padding: 0,
                        }}
                      >
                        {showDetails ? "▾ Hide details" : "▸ Show details"}
                      </button>
                    </div>
                    {showDetails && (
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                        {composerTags.map((tag) => (
                          <button
                            key={tag}
                            type="button"
                            onClick={() => setComposerTags(composerTags.filter((t) => t !== tag))}
                            style={{ background: "none", border: "none", cursor: "pointer", padding: 0 }}
                            title="Click to remove"
                          >
                            <AnnotationTag category={tag as CategoryId} state="confirmed" />
                          </button>
                        ))}
                        {composerAiSuggestions.map((s) =>
                          CATEGORIES.some((c) => c.id === s.category) && (
                            <AnnotationTag
                              key={s.category}
                              category={s.category as CategoryId}
                              state="ai-suggested"
                              rationale={s.rationale}
                              onConfirm={() => {
                                setComposerTags([...composerTags.filter((t) => t !== s.category), s.category]);
                                setComposerAiSuggestions(composerAiSuggestions.filter((x) => x.category !== s.category));
                              }}
                              onDismiss={() => setComposerAiSuggestions(composerAiSuggestions.filter((x) => x.category !== s.category))}
                            />
                          )
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </form>
          </div>

          {/* ── Entry list (UI-08: editorial rows) ── */}
          <div className="imw-deep-write-chrome" style={isDeepWrite ? { display: "none" } : { paddingLeft: isMobile ? 0 : "44px" }}>
            {loading && (
              <p className="imw-body" style={{ color: "var(--imw-text-tertiary)" }}>Loading…</p>
            )}

            {!loading && entries.length === 0 && (
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", padding: "64px 24px", gap: 24 }}>
                <div style={{ width: 56, height: 56, background: "var(--imw-ac-l)", border: "1.5px solid var(--imw-ac-b)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--imw-ac)" }}>
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
                <button className="imw-btn imw-btn--primary" onClick={() => editorInstance?.commands.focus("end")}>
                  Write an entry
                </button>
                <div style={{ display: "flex", alignItems: "center", gap: 12, width: "100%", maxWidth: 360 }}>
                  <div className="imw-divider" style={{ flex: 1 }} />
                  <span className="imw-label">or start with a prompt</span>
                  <div className="imw-divider" style={{ flex: 1 }} />
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 8, width: "100%", maxWidth: 360 }}>
                  {STARTER_PROMPTS.map((prompt) => (
                    <button
                      key={prompt}
                      className="imw-btn imw-btn--secondary"
                      style={{ justifyContent: "flex-start", textAlign: "left", whiteSpace: "normal", height: "auto", padding: "9px 14px" }}
                      onClick={() => {
                        const doc = JSON.stringify({ type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text: prompt }] }] });
                        setContent(doc);
                        if (editorInstance) {
                          editorInstance.commands.setContent({ type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text: prompt }] }] });
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
              const q = searchQuery.toLowerCase();
              return preview.toLowerCase().includes(q) || (e.title ?? "").toLowerCase().includes(q);
            }).length === 0 && (
              <p className="imw-body" style={{ color: "var(--imw-text-tertiary)" }}>No entries match your search.</p>
            )}

            {(() => {
              const filtered = entries.filter((e) => {
                if (!searchQuery) return true;
                const preview = getPreviewText(e.content);
                const q = searchQuery.toLowerCase();
                return preview.toLowerCase().includes(q) || (e.title ?? "").toLowerCase().includes(q);
              });

              const groups = new Map<string, JournalEntry[]>();
              for (const entry of filtered) {
                const label = new Date(entry.createdAt).toLocaleString("en-US", { month: "long", year: "numeric" });
                if (!groups.has(label)) groups.set(label, []);
                groups.get(label)!.push(entry);
              }

              return Array.from(groups.entries()).map(([label, groupEntries]) => (
                <div key={label}>
                  {/* Month group label */}
                  <p style={{ fontFamily: 'var(--imw-font-ui)', fontSize: '0.6rem', fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--imw-text-tertiary)', padding: '14px 0 6px' }}>
                    {label}
                  </p>
                  {/* Editorial rows */}
                  {groupEntries.map((entry, idx) => (
                    <Link
                      key={entry.id}
                      href={`/entries/${entry.id}`}
                      style={{ display: "block", textDecoration: "none" }}
                    >
                      <div className={`imw-feed-row${idx === 0 ? ' imw-feed-row--first' : ''}${entry.id === newEntryId ? ' imw-feed-row--new' : ''}`}>
                        <div className="imw-feed-meta">{formatDate(entry.createdAt)}</div>
                        <div className="imw-feed-title">
                          {entry.title ?? truncate(getPreviewText(entry.content), 45)}
                        </div>
                        {entry.title && (() => {
                          // Skip the opening ~60 chars so the excerpt doesn't repeat
                          // what the title likely paraphrases from the opening line.
                          // Snap to the next word boundary to avoid mid-word cuts.
                          const preview = getPreviewText(entry.content);
                          const spaceIdx = preview.indexOf(" ", 60);
                          const excerpt = spaceIdx !== -1 ? preview.slice(spaceIdx + 1).trimStart() : "";
                          return excerpt.length > 10 ? (
                            <div className="imw-feed-excerpt">
                              {truncate(excerpt, 100)}
                            </div>
                          ) : null;
                        })()}
                        {entry.tags && entry.tags.length > 0 && (
                          <div className="imw-feed-tags">
                            {entry.tags.map((tag) => (
                              <AnnotationTag key={tag} category={tag as CategoryId} state="confirmed" />
                            ))}
                          </div>
                        )}
                      </div>
                    </Link>
                  ))}
                </div>
              ));
            })()}
          </div>
        </div>
      </div>

      {/* Search modal */}
      {searchOpen && (
        <>
          <div
            onClick={() => setSearchOpen(false)}
            style={{ position: "fixed", inset: 0, zIndex: 50, background: "rgba(0,0,0,0.4)" }}
            aria-hidden="true"
          />
          <div
            style={{
              position: "fixed",
              top: "30%",
              left: "50%",
              transform: "translateX(-50%)",
              width: "min(480px, 90vw)",
              background: "var(--imw-bg-surface)",
              border: "0.5px solid var(--imw-border-default)",
              padding: 20,
              zIndex: 51,
            }}
          >
            <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
              <input
                autoFocus
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  flex: 1,
                  background: "transparent",
                  border: "none",
                  outline: "none",
                  fontFamily: "var(--imw-font-body)",
                  fontSize: '1rem',
                  color: "var(--imw-text-primary)",
                  caretColor: "var(--imw-ac)",
                  padding: "4px 0",
                }}
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  style={{ background: "none", border: "none", cursor: "pointer", color: "var(--imw-text-tertiary)", padding: 0, flexShrink: 0, display: "flex", alignItems: "center" }}
                  aria-label="Clear search"
                >
                  <X size={14} />
                </button>
              )}
            </div>
            {searchQuery && (() => {
              const count = entries.filter((e) => {
                const preview = getPreviewText(e.content);
                const q = searchQuery.toLowerCase();
                return preview.toLowerCase().includes(q) || (e.title ?? "").toLowerCase().includes(q);
              }).length;
              return (
                <p className="imw-caption" style={{ color: "var(--imw-text-tertiary)", marginTop: 8 }}>
                  {count} {count === 1 ? "entry" : "entries"} match
                </p>
              );
            })()}
          </div>
        </>
      )}

      {/* Deep Write: icon buttons fixed upper-right */}
      {isDeepWrite && (
        <div style={{ position: "fixed", top: 14, right: 16, zIndex: 40, display: "flex", gap: 6, alignItems: "center" }}>
          <button
            type="button"
            className="imw-btn imw-btn--ghost imw-btn--sm"
            onClick={saveEntry}
            disabled={submitting || (editorInstance?.isEmpty ?? true)}
            aria-label="Save entry"
          >
            <Save size={13} />
          </button>
          {composerDiscardConfirming ? (
            <>
              <button
                type="button"
                className="imw-btn imw-btn--ghost imw-btn--sm"
                onClick={() => setComposerDiscardConfirming(false)}
                aria-label="Cancel discard"
              >
                <X size={13} />
              </button>
              <button
                type="button"
                className="imw-btn imw-btn--ghost imw-btn--sm"
                onClick={() => { discardDraft(); setComposerDiscardConfirming(false); }}
                aria-label="Confirm discard"
                style={{ color: "var(--imw-error-text)" }}
              >
                <Trash2 size={13} />
              </button>
            </>
          ) : (
            <button
              type="button"
              className="imw-btn imw-btn--ghost imw-btn--sm"
              onClick={() => setComposerDiscardConfirming(true)}
              aria-label="Discard draft"
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
        mood={mood}
        onMoodChange={setMood}
      />
      {drawerOpen && (
        <div className="imw-drawer-backdrop" onClick={() => setDrawerOpen(false)} aria-hidden="true" />
      )}
    </div>
  );
}

