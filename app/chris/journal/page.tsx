"use client";

import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import Link from "next/link";
import { IMWEditor } from "@/components/editor";
import { parseEntryContent, extractPlainText } from "@/lib/tiptap-content";
import { useDragReorder } from "@/app/chris/_lib/dragReorder";
import { Spinner } from "@/app/chris/_lib/Spinner";
import { FullscreenButton } from "@/app/chris/_lib/FullscreenButton";
import { ThemeControls } from "@/app/chris/_lib/ThemeControls";
import { useAutosave } from "@/app/chris/_lib/useAutosave";
import { FixedDropdown } from "@/app/chris/_lib/FixedDropdown";
import { ProjectSelect } from "@/app/chris/_lib/ProjectSelect";
import { ALL, UNASSIGNED, type FilterValue } from "@/app/chris/_lib/ProjectFilterBar";

// ── Types ───────────────────────────────────────────────────────────────────

type Project = { id: string; name: string };

type Entry = {
  id: string;
  title: string | null;
  content: string;
  mood: string | null;
  projectId: string | null;
  project: { id: string; name: string } | null;
  createdAt: string;
  updatedAt: string;
};

// ── Palette ──────────────────────────────────────────────────────────────────

const C = {
  bg: "var(--pg-bg)",
  card: "var(--pg-card)",
  cardHover: "var(--pg-card-hover)",
  border: "var(--pg-border)",
  borderSoft: "var(--pg-border-soft)",
  text: "var(--pg-text)",
  textDim: "var(--pg-text-dim)",
  textFaint: "var(--pg-text-faint)",
  accent: "var(--pg-accent)",
  accentText: "var(--pg-accent-text)",
};
const MONO = 'ui-monospace, SFMono-Regular, "SF Mono", Menlo, monospace';
const SERIF = 'ui-serif, Georgia, "Times New Roman", serif';

const LAST_PROJECT_KEY = "chris.journal.lastProjectId";
const MOODS = ["Neutral", "Anxious", "Excited", "Mad", "Happy", "Not Sure"];

// ── Helpers ──────────────────────────────────────────────────────────────────

function snippetFromContent(content: string, max = 200): string {
  try {
    return extractPlainText(parseEntryContent(content)).slice(0, max);
  } catch {
    return content.slice(0, max);
  }
}

function isContentEmpty(content: string): boolean {
  return snippetFromContent(content, 500).trim().length === 0;
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const sameYear = d.getFullYear() === now.getFullYear();
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    ...(sameYear ? {} : { year: "numeric" }),
  });
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default function JournalPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(true);

  // Composer state
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [mood, setMood] = useState<string | null>(null);
  const [editorKey, setEditorKey] = useState(0);
  const [deepWrite, setDeepWrite] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  // In-place editing of an existing entry
  const [editingId, setEditingId] = useState<string | null>(null);
  const transitionTo = (apply: () => void) => {
    const doc = document as unknown as {
      startViewTransition?: (cb: () => void) => unknown;
    };
    if (typeof document !== "undefined" && doc.startViewTransition) {
      doc.startViewTransition(apply);
    } else {
      apply();
    }
  };
  const expandEdit = (id: string) => transitionTo(() => setEditingId(id));
  const collapseEdit = () => transitionTo(() => setEditingId(null));

  const patchEntry = async (
    id: string,
    body: { title?: string | null; content?: string; mood?: string | null; projectId?: string | null }
  ) => {
    const res = await fetch(`/api/entries/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (res.ok) {
      const updated = await res.json();
      setEntries((prev) => prev.map((e) => (e.id === id ? updated : e)));
    }
  };

  const [filterValue, setFilterValueState] = useState<FilterValue>(ALL);
  const setFilterValue = useCallback((v: FilterValue) => {
    setFilterValueState(v);
    if (typeof window !== "undefined") localStorage.setItem(LAST_PROJECT_KEY, v);
  }, []);

  // ── Load initial data ──
  useEffect(() => {
    (async () => {
      try {
        const [pr, er] = await Promise.all([
          fetch("/chris/api/projects"),
          fetch("/api/entries"),
        ]);
        const pd = await pr.json();
        const ed = await er.json();
        const loadedProjects: Project[] = (pd.projects ?? []).map(
          (p: { id: string; name: string }) => ({ id: p.id, name: p.name })
        );
        setProjects(loadedProjects);
        setEntries(Array.isArray(ed) ? ed : []);

        const saved = localStorage.getItem(LAST_PROJECT_KEY);
        if (saved === ALL || saved === UNASSIGNED) setFilterValueState(saved as FilterValue);
        else if (saved && loadedProjects.some((p) => p.id === saved)) {
          setFilterValueState(saved);
        }
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // ── Deep write ──
  useEffect(() => {
    const handler = () => {
      if (!document.fullscreenElement && deepWrite) setDeepWrite(false);
    };
    document.addEventListener("fullscreenchange", handler);
    return () => document.removeEventListener("fullscreenchange", handler);
  }, [deepWrite]);

  const toggleDeepWrite = async () => {
    if (deepWrite) {
      if (document.fullscreenElement) await document.exitFullscreen().catch(() => {});
      setDeepWrite(false);
    } else {
      try {
        await document.documentElement.requestFullscreen();
        setDeepWrite(true);
      } catch {
        setDeepWrite(true);
      }
    }
  };

  // ── Project CRUD ──
  const activeProjectId = filterValue === ALL || filterValue === UNASSIGNED ? null : filterValue;

  // ── Save entry ──
  const saveEntry = async (projectIdOverride?: string | null) => {
    if (isContentEmpty(content)) return;
    const projectId =
      projectIdOverride !== undefined ? projectIdOverride : activeProjectId;
    const res = await fetch("/api/entries", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        content,
        title: title.trim() || undefined,
        mood,
        projectId,
      }),
    });
    if (res.ok) {
      const entry = await res.json();
      setEntries((prev) => [entry, ...prev]);
      setTitle("");
      setContent("");
      setMood(null);
      setEditorKey((k) => k + 1);
      // Auto-name in the background when the writer didn't supply a title.
      if (!entry.title) void autoNameEntry(entry.id);
    }
  };

  // Ask Claude to name the entry from its saved content, then persist it — but
  // only if the entry is still untitled (the writer may have added one). The
  // generate-title route is owner-gated under /chris; the PATCH reuses the main
  // entries route, same as manual edits.
  const autoNameEntry = async (id: string) => {
    try {
      const res = await fetch(`/chris/api/entries/${id}/generate-title`, {
        method: "POST",
      });
      if (!res.ok) return;
      const { title: aiTitle } = await res.json();
      if (!aiTitle) return;

      const patchRes = await fetch(`/api/entries/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: aiTitle }),
      });
      if (!patchRes.ok) return;
      const updated = await patchRes.json();
      setEntries((prev) =>
        prev.map((e) => (e.id === id && !e.title ? updated : e))
      );
    } catch {
      // best-effort — leave the entry untitled on failure
    }
  };

  const handleFilterChange = async (v: FilterValue) => {
    setFilterValue(v);
    const pid = v === ALL || v === UNASSIGNED ? null : v;
    if (!isContentEmpty(content)) {
      await saveEntry(pid);
    }
  };

  // ── Filtered entries ──
  const filteredEntries = useMemo(() => {
    if (filterValue === ALL) return entries;
    if (filterValue === UNASSIGNED) return entries.filter((e) => !e.projectId);
    return entries.filter((e) => e.projectId === filterValue);
  }, [entries, filterValue]);

  // ── Entry actions ──
  const deleteEntry = async (id: string) => {
    if (!confirm("Delete this entry?")) return;
    setEntries((prev) => prev.filter((e) => e.id !== id));
    await fetch(`/api/entries/${id}`, { method: "DELETE" });
  };

  const draftEmpty = isContentEmpty(content);

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <main
      style={{
        maxWidth: deepWrite ? "100%" : 720,
        margin: "0 auto",
        padding: deepWrite ? "0" : "0 24px 96px",
      }}
    >
      {/* Top bar */}
      {!deepWrite && (
        <header
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            height: 64,
            borderBottom: `1px solid ${C.border}`,
          }}
        >
          <Link href="/chris" style={{ textDecoration: "none", fontFamily: MONO, fontSize: 14 }}>
            <span style={{ color: C.textFaint }}>~/chris/</span>
            <span style={{ color: C.text }}>journal</span>
          </Link>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 12 }}>
            <span style={{ fontFamily: MONO, fontSize: 12, color: C.textFaint }}>
              {filteredEntries.length} entr{filteredEntries.length === 1 ? "y" : "ies"}
            </span>
            <ThemeControls />
          <FullscreenButton />
          </div>
        </header>
      )}

      {/* Composer — hidden while editing an existing entry in-place */}
      {editingId === null && (
      <section style={{ marginTop: deepWrite ? 0 : 28 }}>
        <div
          ref={wrapperRef}
          className={deepWrite ? "chris-editor-wrap chris-editor-wrap--deep" : "chris-editor-wrap"}
          style={{
            background: deepWrite ? C.bg : C.card,
            border: deepWrite ? "none" : `1px solid ${C.border}`,
            borderRadius: deepWrite ? 0 : 14,
            padding: deepWrite ? "56px 24px 96px" : "22px 24px 14px",
            minHeight: deepWrite ? "100vh" : 260,
          }}
        >
          <div
            style={{
              maxWidth: deepWrite ? 720 : "none",
              margin: deepWrite ? "0 auto" : 0,
            }}
          >
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Title (optional)"
              style={{
                width: "100%",
                background: "transparent",
                border: "none",
                outline: "none",
                color: C.text,
                fontFamily: SERIF,
                fontSize: 24,
                fontWeight: 600,
                letterSpacing: "-0.01em",
                padding: "0 0 12px",
                marginBottom: 8,
                borderBottom: `1px solid ${C.borderSoft}`,
              }}
            />
            <IMWEditor
              key={editorKey}
              placeholder="What did today actually feel like?"
              fontSize={16}
              lineWidth="100%"
              onChange={setContent}
              autoFocus={false}
            />
          </div>
        </div>

        {/* Action bar */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            padding: deepWrite ? "16px 24px" : "12px 4px 0",
            position: deepWrite ? "fixed" : "static",
            bottom: deepWrite ? 0 : undefined,
            left: deepWrite ? 0 : undefined,
            right: deepWrite ? 0 : undefined,
            background: deepWrite ? C.bg : "transparent",
            borderTop: deepWrite ? `1px solid ${C.border}` : "none",
            flexWrap: "wrap",
          }}
        >
          <button
            onClick={toggleDeepWrite}
            title={deepWrite ? "Exit deep write" : "Deep write mode"}
            style={{
              border: `1px solid ${C.border}`,
              background: "transparent",
              color: C.textDim,
              borderRadius: 999,
              padding: "6px 12px",
              fontSize: 12.5,
              cursor: "pointer",
              fontFamily: MONO,
            }}
          >
            {deepWrite ? "exit" : "deep write"}
          </button>

          {/* Mood chips */}
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {MOODS.map((m) => {
              const active = mood === m;
              return (
                <button
                  key={m}
                  onClick={() => setMood(active ? null : m)}
                  style={{
                    border: `1px solid ${active ? C.accent : C.border}`,
                    background: active ? `${C.accent}22` : "transparent",
                    color: active ? C.text : C.textDim,
                    borderRadius: 999,
                    padding: "5px 11px",
                    fontSize: 12,
                    cursor: "pointer",
                    transition: "background 0.15s ease",
                  }}
                >
                  {m}
                </button>
              );
            })}
          </div>

          <div style={{ flex: 1 }} />
          <button
            onClick={() => saveEntry()}
            disabled={draftEmpty}
            style={{
              border: "none",
              borderRadius: 10,
              background: draftEmpty ? C.border : C.accent,
              color: draftEmpty ? C.textFaint : C.accentText,
              fontWeight: 600,
              fontSize: 14,
              padding: "10px 18px",
              cursor: draftEmpty ? "default" : "pointer",
            }}
          >
            Save entry
          </button>
        </div>

        {/* Project filter */}
        {!deepWrite && (
          <ProjectSelect
            projects={projects}
            value={filterValue}
            onChange={handleFilterChange}
          />
        )}
      </section>
      )}

      {/* Feed */}
      {!deepWrite && (
        <section style={{ marginTop: 32 }}>
          {loading ? (
            <Spinner label="loading…" />
          ) : filteredEntries.length === 0 ? (
            <div style={{ textAlign: "center", padding: "48px 0", color: C.textFaint }}>
              <p style={{ margin: 0, fontSize: 14 }}>No entries yet. Write one above.</p>
            </div>
          ) : (
            <EntryFeed
              entries={filteredEntries}
              projects={projects}
              editingId={editingId}
              onDelete={deleteEntry}
              onEdit={expandEdit}
              onCancelEdit={collapseEdit}
              onSaveEdit={async (id, data) => {
                const existing = entries.find((e) => e.id === id);
                await patchEntry(id, data);
                collapseEdit();
                // Re-name on content edits while still untitled.
                if (existing && !data.title?.trim() && !existing.title) {
                  void autoNameEntry(id);
                }
              }}
              onAutosave={(id, data) => patchEntry(id, data)}
              applyReorder={(next) => {
                setEntries(next);
                void fetch("/api/entries/reorder", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ ids: next.map((e) => e.id) }),
                });
              }}
            />
          )}
        </section>
      )}
    </main>
  );
}

// ── Feed ─────────────────────────────────────────────────────────────────────

function EntryFeed({
  entries,
  projects,
  editingId,
  onDelete,
  onEdit,
  onCancelEdit,
  onSaveEdit,
  onAutosave,
  applyReorder,
}: {
  entries: Entry[];
  projects: Project[];
  editingId: string | null;
  onDelete: (id: string) => void;
  onEdit: (id: string) => void;
  onCancelEdit: () => void;
  onSaveEdit: (
    id: string,
    data: { title: string | null; content: string; mood: string | null; projectId: string | null }
  ) => Promise<void>;
  onAutosave: (
    id: string,
    data: { title: string | null; content: string; mood: string | null; projectId: string | null }
  ) => void;
  applyReorder: (next: Entry[]) => void;
}) {
  const { rowProps, rowStyle } = useDragReorder(entries, applyReorder);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {entries.map((entry) =>
        editingId === entry.id ? (
          <EntryEditingCard
            key={entry.id}
            entry={entry}
            projects={projects}
            onSave={(data) => onSaveEdit(entry.id, data)}
            onAutosave={(data) => onAutosave(entry.id, data)}
            onCancel={onCancelEdit}
            onDelete={() => {
              onDelete(entry.id);
              onCancelEdit();
            }}
          />
        ) : (
          <EntryRow
            key={entry.id}
            entry={entry}
            dragProps={rowProps(entry.id)}
            dragStyle={rowStyle(entry.id)}
            onDelete={() => onDelete(entry.id)}
            onEdit={() => onEdit(entry.id)}
          />
        )
      )}
    </div>
  );
}

function EntryRow({
  entry,
  dragProps,
  dragStyle,
  onDelete,
  onEdit,
}: {
  entry: Entry;
  dragProps: React.HTMLAttributes<HTMLDivElement> & { draggable?: boolean };
  dragStyle: React.CSSProperties;
  onDelete: () => void;
  onEdit: () => void;
}) {
  const [hover, setHover] = useState(false);
  const snippet = useMemo(() => snippetFromContent(entry.content, 240), [entry.content]);

  return (
    <div
      {...dragProps}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      onClick={onEdit}
      title="Click to edit · drag to reorder"
      style={{
        position: "relative",
        border: `1px solid ${C.border}`,
        borderRadius: 12,
        background: hover ? C.cardHover : C.card,
        padding: "16px 18px",
        transition: "background 0.12s ease",
        viewTransitionName: `entry-${entry.id}`,
        ...dragStyle,
      } as React.CSSProperties}
    >
      <div style={{ display: "flex", alignItems: "baseline", gap: 12, marginBottom: 6 }}>
        <div
          style={{
            color: C.text,
            fontFamily: SERIF,
            fontSize: 18,
            fontWeight: 600,
            letterSpacing: "-0.01em",
            flex: 1,
            minWidth: 0,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {entry.title?.trim() || (
            <span style={{ color: C.textFaint, fontStyle: "italic", fontWeight: 400 }}>
              Untitled
            </span>
          )}
        </div>
        <span style={{ fontFamily: MONO, fontSize: 11.5, color: C.textFaint, whiteSpace: "nowrap" }}>
          {formatDate(entry.createdAt)}
        </span>
      </div>

      <p style={{ margin: 0, fontSize: 13.5, lineHeight: 1.55, color: C.textDim }}>{snippet}</p>

      <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 12, flexWrap: "wrap" }}>
        {entry.project && (
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 5,
              border: `1px solid ${C.border}`,
              background: C.bg,
              color: C.textDim,
              borderRadius: 999,
              padding: "3px 10px",
              fontSize: 11.5,
            }}
          >
            <span style={{ color: C.accent }}>◆</span>
            {entry.project.name}
          </span>
        )}
        {entry.mood && (
          <span style={{ fontFamily: MONO, fontSize: 11, color: C.textFaint }}>
            mood · {entry.mood.toLowerCase()}
          </span>
        )}
        <div style={{ flex: 1 }} />
        <Link
          href={`/entries/${entry.id}`}
          onClick={(e) => e.stopPropagation()}
          style={{
            fontFamily: MONO,
            fontSize: 11,
            color: C.textFaint,
            textDecoration: "none",
          }}
        >
          open →
        </Link>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          aria-label="Delete entry"
          style={{
            border: "none",
            background: "transparent",
            color: C.textFaint,
            cursor: "pointer",
            fontSize: 14,
            lineHeight: 1,
            padding: "3px 6px",
            opacity: hover ? 1 : 0,
            transition: "opacity 0.12s ease",
          }}
        >
          ×
        </button>
      </div>
    </div>
  );
}

// ── In-place editing card ────────────────────────────────────────────────────

function EntryEditingCard({
  entry,
  projects,
  onSave,
  onAutosave,
  onCancel,
  onDelete,
}: {
  entry: Entry;
  projects: Project[];
  onSave: (data: {
    title: string | null;
    content: string;
    mood: string | null;
    projectId: string | null;
  }) => Promise<void>;
  onAutosave: (data: {
    title: string | null;
    content: string;
    mood: string | null;
    projectId: string | null;
  }) => void;
  onCancel: () => void;
  onDelete: () => void;
}) {
  const [title, setTitle] = useState(entry.title ?? "");
  const [content, setContent] = useState(entry.content);
  const [mood, setMood] = useState<string | null>(entry.mood);
  const [projectId, setProjectId] = useState<string | null>(entry.projectId);

  // Autosave edits; the Save button also collapses the card.
  useAutosave([title, content, mood, projectId], () =>
    onAutosave({ title: title.trim() || null, content, mood, projectId })
  );
  const [pickerOpen, setPickerOpen] = useState(false);
  const [deepWrite, setDeepWrite] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const projectBtnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const handler = () => {
      if (!document.fullscreenElement && deepWrite) setDeepWrite(false);
    };
    document.addEventListener("fullscreenchange", handler);
    return () => document.removeEventListener("fullscreenchange", handler);
  }, [deepWrite]);

  const toggleDeepWrite = async () => {
    if (deepWrite) {
      if (document.fullscreenElement) await document.exitFullscreen().catch(() => {});
      setDeepWrite(false);
    } else {
      try {
        await document.documentElement.requestFullscreen();
        setDeepWrite(true);
      } catch {
        setDeepWrite(true);
      }
    }
  };

  const titleClean = title.trim() || null;
  const dirty =
    titleClean !== (entry.title?.trim() || null) ||
    content !== entry.content ||
    mood !== entry.mood ||
    projectId !== entry.projectId;
  const canSave = dirty && !isContentEmpty(content);
  const projectName =
    projectId ? projects.find((p) => p.id === projectId)?.name ?? "Unassigned" : "Unassigned";

  return (
    <div
      ref={wrapperRef}
      className={deepWrite ? "chris-editor-wrap chris-editor-wrap--deep" : "chris-editor-wrap"}
      style={{
        position: "relative",
        background: deepWrite ? C.bg : C.card,
        border: deepWrite ? "none" : `1px solid ${C.accent}55`,
        borderRadius: deepWrite ? 0 : 14,
        padding: deepWrite ? "56px 24px 96px" : "20px 22px 14px",
        minHeight: deepWrite ? "100vh" : 260,
        viewTransitionName: `entry-${entry.id}`,
      } as React.CSSProperties}
    >
      <div
        style={{
          maxWidth: deepWrite ? 720 : "none",
          margin: deepWrite ? "0 auto" : 0,
        }}
      >
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Title (optional)"
          style={{
            width: "100%",
            background: "transparent",
            border: "none",
            outline: "none",
            color: C.text,
            fontFamily: SERIF,
            fontSize: 22,
            fontWeight: 600,
            letterSpacing: "-0.01em",
            padding: "0 0 10px",
            marginBottom: 8,
            borderBottom: `1px solid ${C.borderSoft}`,
          }}
        />
        <IMWEditor
          key={entry.id}
          initialContent={entry.content}
          placeholder="What did today actually feel like?"
          fontSize={16}
          lineWidth="100%"
          onChange={setContent}
          autoFocus
        />
      </div>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          marginTop: 14,
          flexWrap: "wrap",
          position: deepWrite ? "fixed" : "static",
          bottom: deepWrite ? 0 : undefined,
          left: deepWrite ? 0 : undefined,
          right: deepWrite ? 0 : undefined,
          padding: deepWrite ? "14px 24px" : 0,
          background: deepWrite ? C.bg : "transparent",
          borderTop: deepWrite ? `1px solid ${C.border}` : "none",
        }}
      >
        <button
          onClick={toggleDeepWrite}
          style={{
            border: `1px solid ${C.border}`,
            background: "transparent",
            color: C.textDim,
            borderRadius: 999,
            padding: "5px 11px",
            fontSize: 12,
            cursor: "pointer",
            fontFamily: MONO,
          }}
        >
          {deepWrite ? "exit" : "deep write"}
        </button>

        <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
          {MOODS.map((m) => {
            const active = mood === m;
            return (
              <button
                key={m}
                onClick={() => setMood(active ? null : m)}
                style={{
                  border: `1px solid ${active ? C.accent : C.border}`,
                  background: active ? `${C.accent}22` : "transparent",
                  color: active ? C.text : C.textDim,
                  borderRadius: 999,
                  padding: "4px 10px",
                  fontSize: 11.5,
                  cursor: "pointer",
                }}
              >
                {m}
              </button>
            );
          })}
        </div>

        <div style={{ position: "relative" }}>
          <button
            ref={projectBtnRef}
            onClick={() => setPickerOpen((x) => !x)}
            style={{
              border: `1px solid ${C.border}`,
              background: "transparent",
              color: C.textDim,
              borderRadius: 999,
              padding: "5px 11px",
              fontSize: 12,
              cursor: "pointer",
            }}
          >
            <span style={{ color: C.accent, marginRight: 5 }}>◆</span>
            {projectName}
          </button>
          {pickerOpen && (
            <EntryProjectPickerDropdown
              anchorRef={projectBtnRef}
              projects={projects}
              currentProjectId={projectId}
              onPick={(pid) => {
                setProjectId(pid);
                setPickerOpen(false);
              }}
              onClose={() => setPickerOpen(false)}
            />
          )}
        </div>

        <div style={{ flex: 1 }} />

        <button
          onClick={onDelete}
          style={{
            border: "none",
            background: "transparent",
            color: "#e0736a",
            cursor: "pointer",
            fontFamily: MONO,
            fontSize: 12,
            padding: "5px 8px",
          }}
        >
          delete
        </button>
        <button
          onClick={onCancel}
          style={{
            border: "none",
            background: "transparent",
            color: C.textDim,
            cursor: "pointer",
            fontFamily: MONO,
            fontSize: 12,
            padding: "5px 10px",
          }}
        >
          cancel
        </button>
        <button
          onClick={() => onSave({ title: titleClean, content, mood, projectId })}
          disabled={!canSave}
          style={{
            border: "none",
            borderRadius: 10,
            background: canSave ? C.accent : C.border,
            color: canSave ? C.accentText : C.textFaint,
            fontWeight: 600,
            fontSize: 13,
            padding: "8px 16px",
            cursor: canSave ? "pointer" : "default",
          }}
        >
          Save
        </button>
      </div>
    </div>
  );
}

function EntryProjectPickerDropdown({
  projects,
  currentProjectId,
  onPick,
  onClose,
  anchorRef,
}: {
  projects: Project[];
  currentProjectId: string | null;
  onPick: (projectId: string | null) => void;
  onClose: () => void;
  anchorRef: React.RefObject<HTMLElement | null>;
}) {
  return (
    <FixedDropdown anchorRef={anchorRef} onClose={onClose} width={220} maxHeight={260}>
      <button
        onClick={() => onPick(null)}
        style={{
          display: "block", width: "100%", textAlign: "left",
          background: currentProjectId === null ? C.cardHover : "transparent",
          border: "none", borderBottom: `1px solid ${C.borderSoft}`,
          color: C.textDim, fontStyle: "italic", cursor: "pointer",
          padding: "10px 14px", fontSize: 13,
        }}
      >
        Unassigned
      </button>
      {projects.map((p) => (
        <button
          key={p.id}
          onClick={() => onPick(p.id)}
          style={{
            display: "block", width: "100%", textAlign: "left",
            background: currentProjectId === p.id ? C.cardHover : "transparent",
            border: "none", borderBottom: `1px solid ${C.borderSoft}`,
            color: C.text, cursor: "pointer",
            padding: "10px 14px", fontSize: 13,
          }}
        >
          {p.name}
        </button>
      ))}
    </FixedDropdown>
  );
}
