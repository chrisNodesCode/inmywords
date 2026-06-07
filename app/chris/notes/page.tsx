"use client";

import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import Link from "next/link";
import { SurfaceSwitcher } from "@/app/chris/_lib/SurfaceSwitcher";
import { IMWEditor } from "@/components/editor";
import { parseEntryContent, extractPlainText } from "@/lib/tiptap-content";
import { useDragReorder } from "@/app/chris/_lib/dragReorder";
import { Spinner } from "@/app/chris/_lib/Spinner";
import { FullscreenButton } from "@/app/chris/_lib/FullscreenButton";
import { ThemeControls } from "@/app/chris/_lib/ThemeControls";
import { useAutosave } from "@/app/chris/_lib/useAutosave";
import { FixedDropdown } from "@/app/chris/_lib/FixedDropdown";
import {
  NOTE_FIELDS,
  type NoteFieldKey,
  type CustomFieldDef,
  type CustomValues,
  type CompareConfig,
  formatNoteValue,
  formatCustomValue,
  normalizeUrl,
  cleanCustomFields,
  cleanCompareConfig,
  compareFieldsForProject,
} from "@/app/chris/_lib/noteFields";
import { ComparePanel } from "@/app/chris/notes/ComparePanel";

// Filter constants
const ALL_PROJECTS = "__all__";
const UNASSIGNED_PROJECT = "__unassigned__";

// ── Types ───────────────────────────────────────────────────────────────────

type Project = {
  id: string;
  name: string;
  noteFields: string[];
  customFields: CustomFieldDef[];
  compareConfig: CompareConfig | null;
};

type Note = {
  id: string;
  title: string | null;
  content: string;
  projectId: string | null;
  project: { id: string; name: string } | null;
  amount: number | null;
  distance: number | null;
  rating: number | null;
  date: string | null;
  phone: string | null;
  email: string | null;
  url: string | null;
  address: string | null;
  enabledFields: string[];
  customValues: CustomValues | null;
  createdAt: string;
  updatedAt: string;
};

// Partial update payload for a note — content/project plus any structured field.
type NotePatch = {
  content?: string;
  title?: string | null;
  projectId?: string | null;
  amount?: number | null;
  distance?: number | null;
  rating?: number | null;
  date?: string | null;
  phone?: string | null;
  email?: string | null;
  url?: string | null;
  address?: string | null;
  enabledFields?: string[];
  customValues?: CustomValues;
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
  danger: "#e0736a",
};
const MONO = 'ui-monospace, SFMono-Regular, "SF Mono", Menlo, monospace';
const LAST_PROJECT_KEY = "chris.notes.lastProjectId";
const UNASSIGNED = "__unassigned__";

// ── Helpers ──────────────────────────────────────────────────────────────────

function extractPreview(content: string, max = 240): string {
  try {
    return extractPlainText(parseEntryContent(content)).slice(0, max);
  } catch {
    return content.slice(0, max);
  }
}

function isContentEmpty(content: string): boolean {
  return extractPreview(content).trim().length === 0;
}

function formatRelative(iso: string): string {
  const d = new Date(iso);
  const now = Date.now();
  const diffMs = now - d.getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default function NotesPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"notes" | "compare">("notes");

  // Editor state
  const [draftContent, setDraftContent] = useState("");
  const [editorKey, setEditorKey] = useState(0); // bump to remount/reset
  const [deepWrite, setDeepWrite] = useState(false);
  const editorWrapperRef = useRef<HTMLDivElement>(null);

  // Auto-title: on by default (Claude names the note on save). Toggling off
  // reveals a manual title input and suppresses the auto-name API call.
  const [autoTitle, setAutoTitle] = useState(true);
  const [titleDraft, setTitleDraft] = useState("");

  // Which feed card is being edited in-place (null = none)
  const [editingId, setEditingId] = useState<string | null>(null);

  // View Transitions API — animate sibling reflow when expanding/collapsing.
  // Falls back to plain state change in unsupported browsers.
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

  const [projectFilter, setProjectFilterState] = useState(ALL_PROJECTS);
  const setProjectFilter = useCallback((v: string) => {
    setProjectFilterState(v);
    if (typeof window !== "undefined") localStorage.setItem(LAST_PROJECT_KEY, v);
  }, []);

  // Load initial data
  useEffect(() => {
    (async () => {
      try {
        const [pr, nr] = await Promise.all([
          fetch("/chris/api/projects"),
          fetch("/chris/api/notes"),
        ]);
        const pd = await pr.json();
        const nd = await nr.json();
        const loadedProjects: Project[] = (pd.projects ?? []).map(
          (p: { id: string; name: string; noteFields?: string[]; customFields?: unknown; compareConfig?: unknown }) => ({
            id: p.id,
            name: p.name,
            noteFields: Array.isArray(p.noteFields) ? p.noteFields : [],
            customFields: cleanCustomFields(p.customFields),
            compareConfig: p.compareConfig
              ? cleanCompareConfig(
                  p.compareConfig,
                  new Set([
                    ...compareFieldsForProject(cleanCustomFields(p.customFields)).map((f) => f.key),
                    "title",
                  ])
                )
              : null,
          })
        );
        setProjects(loadedProjects);
        setNotes(nd.notes ?? []);

        const saved = localStorage.getItem(LAST_PROJECT_KEY);
        if (saved === ALL_PROJECTS || saved === UNASSIGNED_PROJECT) setProjectFilterState(saved);
        else if (saved && loadedProjects.some((p) => p.id === saved)) {
          setProjectFilterState(saved);
        }
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // Deep write fullscreen sync
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
        // fullscreen denied; still toggle visual mode
        setDeepWrite(true);
      }
    }
  };

  // ── Save & chip actions ───────────────────────────────────────────────────

  const activeProjectId = projectFilter === ALL_PROJECTS || projectFilter === UNASSIGNED_PROJECT ? null : projectFilter;

  const saveNote = async (projectIdOverride?: string | null) => {
    if (isContentEmpty(draftContent)) return;
    const projectId = projectIdOverride !== undefined ? projectIdOverride : activeProjectId;
    const manualTitle = autoTitle ? undefined : titleDraft.trim() || undefined;
    const res = await fetch("/chris/api/notes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: draftContent, projectId, ...(manualTitle ? { title: manualTitle } : {}) }),
    });
    if (res.ok) {
      const { note } = await res.json();
      setNotes((prev) => [note, ...prev]);
      setDraftContent("");
      setTitleDraft("");
      setEditorKey((k) => k + 1);
      // Auto-name in the background, claude.ai-style — only when auto-title is on
      // and the note didn't already get a manual title.
      if (autoTitle && !note.title) void autoNameNote(note.id);
    }
  };

  // Ask Claude for a title based on the saved content, then persist it — but
  // only if the user hasn't typed their own title in the meantime.
  const autoNameNote = async (id: string) => {
    try {
      const res = await fetch(`/chris/api/notes/${id}/generate-title`, {
        method: "POST",
      });
      if (!res.ok) return;
      const { title } = await res.json();
      if (!title) return;

      const patchRes = await fetch(`/chris/api/notes/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title }),
      });
      if (!patchRes.ok) return;
      const { note: updated } = await patchRes.json();
      setNotes((prev) =>
        prev.map((n) => (n.id === id && !n.title ? updated : n))
      );
    } catch {
      // best-effort — leave the note untitled on failure
    }
  };

  const handleProjectFilterChange = async (v: string) => {
    setProjectFilter(v);
    const pid = v === ALL_PROJECTS || v === UNASSIGNED_PROJECT ? null : v;
    if (!isContentEmpty(draftContent)) {
      await saveNote(pid);
    }
  };

  // ── Note row actions ──────────────────────────────────────────────────────

  const deleteNote = async (id: string) => {
    setNotes((prev) => prev.filter((n) => n.id !== id));
    await fetch(`/chris/api/notes/${id}`, { method: "DELETE" });
  };

  const patchNote = async (
    id: string,
    body: NotePatch
  ) => {
    const res = await fetch(`/chris/api/notes/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (res.ok) {
      const { note } = await res.json();
      setNotes((prev) => prev.map((n) => (n.id === id ? note : n)));
    }
  };

  const reassignNote = async (id: string, projectId: string | null) => {
    setNotes((prev) =>
      prev.map((n) =>
        n.id === id
          ? {
              ...n,
              projectId,
              project: projectId ? projects.find((x) => x.id === projectId) ?? null : null,
            }
          : n
      )
    );
    await fetch(`/chris/api/notes/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ projectId }),
    });
  };

  // Persist a project's compare config (from the Compare tab).
  const saveCompareConfig = async (projectId: string, config: CompareConfig) => {
    setProjects((prev) =>
      prev.map((p) => (p.id === projectId ? { ...p, compareConfig: config } : p))
    );
    await fetch(`/chris/api/projects/${projectId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ compareConfig: config }),
    });
  };

  // ── Derived: filter then group notes by project ───────────────────────────

  const grouped = useMemo(() => {
    let list = notes;

    // Project filter
    if (projectFilter === UNASSIGNED_PROJECT) list = list.filter((n) => !n.projectId);
    else if (projectFilter !== ALL_PROJECTS) list = list.filter((n) => n.projectId === projectFilter);

    const groups: { id: string; name: string; items: Note[] }[] = [];
    const unassigned = list.filter((n) => !n.projectId);
    if (unassigned.length) groups.push({ id: UNASSIGNED, name: "Unassigned", items: unassigned });
    for (const proj of projects) {
      const items = list.filter((n) => n.projectId === proj.id);
      if (items.length) groups.push({ id: proj.id, name: proj.name, items });
    }
    return groups;
  }, [notes, projects, projectFilter]);

  const draftEmpty = isContentEmpty(draftContent);

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <main
      style={{
        maxWidth: deepWrite ? "100%" : 720,
        margin: "0 auto",
        padding: deepWrite ? "0" : "0 24px 96px",
      }}
    >
      {/* Top bar — hidden in deep write */}
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
          <SurfaceSwitcher />
          <div style={{ display: "inline-flex", alignItems: "center", gap: 12 }}>
            <span style={{ fontFamily: MONO, fontSize: 12, color: C.textFaint }}>
              {notes.length} note{notes.length === 1 ? "" : "s"}
            </span>
            <ThemeControls />
            <FullscreenButton />
          </div>
        </header>
      )}

      {/* Tabs */}
      {!deepWrite && (
        <div style={{ display: "flex", gap: 4, marginTop: 18 }}>
          {(["notes", "compare"] as const).map((t) => {
            const on = tab === t;
            return (
              <button
                key={t}
                onClick={() => setTab(t)}
                style={{
                  border: "none",
                  background: "transparent",
                  color: on ? C.text : C.textFaint,
                  borderBottom: `2px solid ${on ? C.accent : "transparent"}`,
                  borderRadius: 0,
                  padding: "6px 12px",
                  fontSize: 13.5,
                  fontWeight: on ? 600 : 500,
                  cursor: "pointer",
                  textTransform: "capitalize",
                }}
              >
                {t}
              </button>
            );
          })}
        </div>
      )}

      {/* Composer — hidden while editing an existing note in-place */}
      {tab === "notes" && editingId === null && (
      <section style={{ marginTop: deepWrite ? 0 : 28 }}>
        <div
          ref={editorWrapperRef}
          className={deepWrite ? "chris-editor-wrap chris-editor-wrap--deep" : "chris-editor-wrap"}
          style={{
            background: deepWrite ? C.bg : C.card,
            border: deepWrite ? "none" : `1px solid ${C.border}`,
            borderRadius: deepWrite ? 0 : 14,
            padding: deepWrite ? "56px 24px 96px" : "20px 22px 8px",
            minHeight: deepWrite ? "100vh" : 200,
          }}
        >
          <div
            style={{
              maxWidth: deepWrite ? 720 : "none",
              margin: deepWrite ? "0 auto" : 0,
            }}
          >
            {!autoTitle && (
              <input
                value={titleDraft}
                onChange={(e) => setTitleDraft(e.target.value)}
                placeholder="Title"
                style={titleInputStyle}
              />
            )}
            <IMWEditor
              key={editorKey}
              placeholder="Capture a note — a listing, a link, something to compare later…"
              fontSize={16}
              lineWidth="100%"
              onChange={setDraftContent}
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
          <AutoTitleToggle on={autoTitle} onChange={setAutoTitle} />
          <div style={{ flex: 1 }} />
          <button
            onClick={() => saveNote()}
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
            Save note
          </button>
        </div>

        {/* Filters — hidden in deep write */}
        {!deepWrite && (
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              alignItems: "center",
              gap: 10,
              padding: "12px 4px 0",
            }}
          >
            {/* Project dropdown */}
            <select
              value={projectFilter}
              onChange={(e) => handleProjectFilterChange(e.target.value)}
              style={{
                background: C.card,
                border: `1px solid ${C.border}`,
                borderRadius: 8,
                color: C.text,
                fontSize: 12.5,
                fontFamily: MONO,
                padding: "6px 28px 6px 10px",
                cursor: "pointer",
                outline: "none",
                appearance: "none",
                backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6'%3E%3Cpath d='M0 0l5 6 5-6z' fill='%236b7280'/%3E%3C/svg%3E")`,
                backgroundRepeat: "no-repeat",
                backgroundPosition: "right 10px center",
              }}
            >
              <option value={ALL_PROJECTS}>All Projects</option>
              <option value={UNASSIGNED_PROJECT}>Unassigned</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>

            <Link
              href="/chris/projects"
              style={{
                marginLeft: "auto",
                fontFamily: MONO,
                fontSize: 11,
                color: C.textFaint,
                textDecoration: "none",
              }}
            >
              manage →
            </Link>
          </div>
        )}
      </section>
      )}

      {/* Feed */}
      {tab === "notes" && !deepWrite && (
        <section style={{ marginTop: 32 }}>
          {loading ? (
            <Spinner label="loading…" />
          ) : grouped.length === 0 ? (
            <div style={{ textAlign: "center", padding: "48px 0", color: C.textFaint }}>
              <p style={{ margin: 0, fontSize: 14 }}>No notes yet. Write one above.</p>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
              {grouped.map((group) => (
                <NoteGroupView
                  key={group.id}
                  group={group}
                  projects={projects}
                  editingId={editingId}
                  applyGroupReorder={(orderedIds) => {
                    // Merge new order back into the global notes array,
                    // preserving the order of items not in this group.
                    setNotes((prev) => {
                      const inGroup = new Set(orderedIds);
                      const groupItems = orderedIds
                        .map((id) => prev.find((n) => n.id === id)!)
                        .filter(Boolean);
                      const others = prev.filter((n) => !inGroup.has(n.id));
                      return [...groupItems, ...others];
                    });
                    void fetch("/chris/api/notes/reorder", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ ids: orderedIds }),
                    });
                  }}
                  onPatchSave={async (id, data) => {
                    const existing = notes.find((n) => n.id === id);
                    await patchNote(id, data);
                    collapseEdit();
                    // Re-name on content edits while still untitled — but only
                    // when the card left auto-title on (it omits `title` from the
                    // payload; with auto-title off, a manual title is included).
                    if (!("title" in data) && existing && !existing.title) void autoNameNote(id);
                  }}
                  onAutosave={(id, data) => patchNote(id, data)}
                  onCancelEdit={collapseEdit}
                  onDelete={deleteNote}
                  onReassign={reassignNote}
                  onEdit={expandEdit}
                />
              ))}
            </div>
          )}
        </section>
      )}

      {/* Compare tab */}
      {tab === "compare" && !deepWrite && (
        <section style={{ marginTop: 24 }}>
          {loading ? (
            <Spinner label="loading…" />
          ) : (
            <ComparePanel
              projects={projects}
              notes={notes}
              onSaveConfig={saveCompareConfig}
              onOpenNote={(id) => {
                setTab("notes");
                setProjectFilter(
                  notes.find((n) => n.id === id)?.projectId ?? ALL_PROJECTS
                );
                expandEdit(id);
              }}
            />
          )}
        </section>
      )}
    </main>
  );
}

// ── Note group ───────────────────────────────────────────────────────────────

function NoteGroupView({
  group,
  projects,
  editingId,
  applyGroupReorder,
  onPatchSave,
  onAutosave,
  onCancelEdit,
  onDelete,
  onReassign,
  onEdit,
}: {
  group: { id: string; name: string; items: Note[] };
  projects: Project[];
  editingId: string | null;
  applyGroupReorder: (orderedIds: string[]) => void;
  onPatchSave: (
    id: string,
    data: NotePatch
  ) => Promise<void>;
  onAutosave: (
    id: string,
    data: NotePatch
  ) => void;
  onCancelEdit: () => void;
  onDelete: (id: string) => void;
  onReassign: (id: string, projectId: string | null) => void;
  onEdit: (id: string) => void;
}) {
  const { rowProps, rowStyle } = useDragReorder(group.items, (next) =>
    applyGroupReorder(next.map((n) => n.id))
  );
  // Custom field defs for this group's project (Unassigned has none).
  const groupCustoms = projects.find((p) => p.id === group.id)?.customFields ?? [];
  return (
    <div>
      <div
        style={{
          display: "flex",
          alignItems: "baseline",
          gap: 8,
          margin: "0 4px 10px",
        }}
      >
        <h3 style={{ margin: 0, fontSize: 14, fontWeight: 600, color: C.text }}>
          {group.name}
        </h3>
        <span style={{ fontFamily: MONO, fontSize: 11, color: C.textFaint }}>
          {group.items.length}
        </span>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {group.items.map((note) =>
          editingId === note.id ? (
            <NoteEditingCard
              key={note.id}
              note={note}
              projects={projects}
              customFields={groupCustoms}
              onSave={(data) => onPatchSave(note.id, data)}
              onAutosave={(data) => onAutosave(note.id, data)}
              onDelete={() => {
                onDelete(note.id);
                onCancelEdit();
              }}
            />
          ) : (
            <NoteRow
              key={note.id}
              note={note}
              projects={projects}
              customFields={groupCustoms}
              dragProps={rowProps(note.id)}
              dragStyle={rowStyle(note.id)}
              onDelete={() => onDelete(note.id)}
              onReassign={(pid) => onReassign(note.id, pid)}
              onEdit={() => onEdit(note.id)}
            />
          )
        )}
      </div>
    </div>
  );
}

// Compact read-only chips for whichever structured fields hold a value. Phone /
// email / link become actionable; the rest are plain text.
function NoteStats({ note, customFields }: { note: Note; customFields: CustomFieldDef[] }) {
  const chips = NOTE_FIELDS.map((f) => {
    const display = formatNoteValue(f.key, note);
    if (!display) return null;
    return { key: f.key as string, icon: f.icon, display, label: "" };
  }).filter(Boolean) as { key: string; icon: string; display: string; label: string }[];

  // Project custom fields with a value, shown as labeled chips.
  for (const def of customFields) {
    const display = formatCustomValue(def, note.customValues?.[def.key]);
    if (display) chips.push({ key: def.key, icon: "", display, label: def.label });
  }

  if (chips.length === 0) return null;

  const chipStyle: React.CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    gap: 5,
    border: `1px solid ${C.border}`,
    background: C.bg,
    borderRadius: 999,
    padding: "3px 10px",
    fontSize: 11.5,
    color: C.textDim,
    textDecoration: "none",
    maxWidth: 240,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  };

  const stop = (e: React.MouseEvent) => e.stopPropagation();

  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 10 }}>
      {chips.map((c) => {
        // Amount's "$" and rating's stars are already in the formatted value,
        // so skip the leading icon for those to avoid doubling up.
        const showIcon = c.key !== "rating" && c.key !== "amount";
        const iconEl = showIcon ? (
          <span aria-hidden style={{ color: C.accent, fontSize: 11 }}>
            {c.icon}
          </span>
        ) : null;
        if (c.key === "url" && note.url) {
          return (
            <a key={c.key} href={normalizeUrl(note.url)} target="_blank" rel="noopener noreferrer" onClick={stop} title={note.url} style={{ ...chipStyle, color: C.accent }}>
              {iconEl}{c.display}
            </a>
          );
        }
        if (c.key === "phone" && note.phone) {
          return (
            <a key={c.key} href={`tel:${note.phone.replace(/\s+/g, "")}`} onClick={stop} style={{ ...chipStyle, color: C.accent }}>
              {iconEl}{c.display}
            </a>
          );
        }
        if (c.key === "email" && note.email) {
          return (
            <a key={c.key} href={`mailto:${note.email.trim()}`} onClick={stop} style={{ ...chipStyle, color: C.accent }}>
              {iconEl}{c.display}
            </a>
          );
        }
        return (
          <span key={c.key} style={chipStyle} title={c.label ? `${c.label}: ${c.display}` : c.display}>
            {c.label ? (
              <span style={{ color: C.textFaint }}>{c.label}</span>
            ) : (
              iconEl
            )}
            {c.display}
          </span>
        );
      })}
    </div>
  );
}

function NoteRow({
  note,
  projects,
  customFields,
  dragProps,
  dragStyle,
  onDelete,
  onReassign,
  onEdit,
}: {
  note: Note;
  projects: Project[];
  customFields: CustomFieldDef[];
  dragProps: React.HTMLAttributes<HTMLDivElement> & { draggable?: boolean };
  dragStyle: React.CSSProperties;
  onDelete: () => void;
  onReassign: (projectId: string | null) => void;
  onEdit: () => void;
}) {
  const [hover, setHover] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const projectBtnRef = useRef<HTMLButtonElement>(null);

  const preview = useMemo(() => extractPreview(note.content, 200), [note.content]);

  return (
    <div
      {...dragProps}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        position: "relative",
        border: `1px solid ${C.border}`,
        borderRadius: 12,
        background: hover ? C.cardHover : C.card,
        padding: "14px 16px",
        transition: "background 0.12s ease",
        // View transition: shared element between preview & editing card
        viewTransitionName: `note-${note.id}`,
        ...dragStyle,
      } as React.CSSProperties}
    >
      <div onClick={onEdit} title="Click to edit" style={{ cursor: "pointer" }}>
        {note.title && (
          <div
            style={{
              fontSize: 14.5,
              fontWeight: 600,
              color: C.text,
              marginBottom: 5,
              wordBreak: "break-word",
            }}
          >
            {note.title}
          </div>
        )}
        <div
          style={{
            fontSize: note.title ? 13 : 14,
            lineHeight: 1.55,
            color: note.title ? C.textDim : C.text,
            wordBreak: "break-word",
          }}
        >
          {preview}
          {note.content.length > 200 && (
            <span style={{ color: C.textFaint }}> …</span>
          )}
        </div>
      </div>

      <NoteStats note={note} customFields={customFields} />

      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          marginTop: 10,
        }}
      >
        <span style={{ fontFamily: MONO, fontSize: 11, color: C.textFaint }}>
          {formatRelative(note.updatedAt)}
        </span>
        <div style={{ flex: 1 }} />
        <button
          ref={projectBtnRef}
          onClick={() => setPickerOpen((x) => !x)}
          style={{
            border: `1px solid ${C.border}`,
            background: "transparent",
            color: C.textDim,
            borderRadius: 999,
            padding: "3px 10px",
            fontSize: 11.5,
            cursor: "pointer",
          }}
          title="Change project"
        >
          {note.project?.name ?? "Unassigned"}
        </button>
        <button
          onClick={onDelete}
          aria-label="Delete"
          style={{
            border: "none",
            background: "transparent",
            color: C.textFaint,
            cursor: "pointer",
            fontSize: 14,
            lineHeight: 1,
            padding: "3px 4px",
            opacity: hover ? 1 : 0,
            transition: "opacity 0.12s ease",
          }}
        >
          ×
        </button>
      </div>

      {pickerOpen && (
        <FixedDropdown
          anchorRef={projectBtnRef}
          onClose={() => setPickerOpen(false)}
          width={220}
          maxHeight={280}
        >
          <ProjectOptionsList
            currentProjectId={note.projectId}
            projects={projects}
            onPick={(pid) => { onReassign(pid); setPickerOpen(false); }}
          />
        </FixedDropdown>
      )}
    </div>
  );
}

// Manual-title input shown when auto-title is toggled off (composer + card).
const titleInputStyle: React.CSSProperties = {
  width: "100%",
  background: "transparent",
  border: "none",
  borderBottom: `1px solid ${C.borderSoft}`,
  outline: "none",
  color: C.text,
  fontSize: 18,
  fontWeight: 600,
  padding: "0 0 8px",
  marginBottom: 10,
};

// Pill switch toggling Claude auto-naming. On = Claude names the note on save;
// off = a manual title input is revealed and the auto-name call is suppressed.
function AutoTitleToggle({ on, onChange }: { on: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!on)}
      role="switch"
      aria-checked={on}
      title={on ? "Auto-title on — Claude names this note on save" : "Auto-title off — type your own title"}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 7,
        border: `1px solid ${on ? C.accent : C.border}`,
        background: on ? `${C.accent}1a` : "transparent",
        color: on ? C.accent : C.textDim,
        borderRadius: 999,
        padding: "5px 11px 5px 9px",
        fontSize: 12,
        fontFamily: MONO,
        cursor: "pointer",
      }}
    >
      <span
        aria-hidden
        style={{
          position: "relative",
          width: 26,
          height: 15,
          borderRadius: 999,
          background: on ? C.accent : C.border,
          flexShrink: 0,
          transition: "background 0.15s ease",
        }}
      >
        <span
          style={{
            position: "absolute",
            top: 2,
            left: on ? 13 : 2,
            width: 11,
            height: 11,
            borderRadius: 999,
            background: on ? "var(--pg-accent-text)" : C.card,
            transition: "left 0.15s ease",
          }}
        />
      </span>
      auto-title
    </button>
  );
}

// ── In-place editing card ────────────────────────────────────────────────────

// Shared styles + label wrapper for the structured-field inputs.
const fieldInputBox: React.CSSProperties = {
  width: "100%",
  height: 38,
  background: C.bg,
  border: `1px solid ${C.border}`,
  borderRadius: 9,
  outline: "none",
  color: C.text,
  fontSize: 13.5,
  padding: "0 10px",
};
const bareInput: React.CSSProperties = {
  flex: 1,
  minWidth: 0,
  background: "transparent",
  border: "none",
  outline: "none",
  color: C.text,
  fontSize: 13.5,
};
function FieldShell({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p
        style={{
          fontFamily: MONO,
          fontSize: 10,
          letterSpacing: "0.06em",
          textTransform: "uppercase",
          color: C.textFaint,
          margin: "0 0 5px 2px",
        }}
      >
        {label}
      </p>
      {children}
    </div>
  );
}

function NoteEditingCard({
  note,
  projects,
  customFields,
  onSave,
  onAutosave,
  onDelete,
}: {
  note: Note;
  projects: Project[];
  customFields: CustomFieldDef[];
  onSave: (data: NotePatch) => Promise<void>;
  onAutosave: (data: NotePatch) => void;
  onDelete: () => void;
}) {
  const [content, setContent] = useState(note.content);
  const [projectId, setProjectId] = useState<string | null>(note.projectId);

  // Auto-title: on by default. Off reveals a manual title input and stops the
  // auto-name API call from firing when this card saves.
  const [autoTitle, setAutoTitle] = useState(true);
  const [titleDraft, setTitleDraft] = useState(note.title ?? "");

  // Custom field draft values, keyed by slot. Text/number/currency held as
  // strings; booleans as booleans.
  const [customDraft, setCustomDraft] = useState<Record<string, string | boolean>>(() => {
    const init: Record<string, string | boolean> = {};
    for (const def of customFields) {
      const v = note.customValues?.[def.key];
      if (v === undefined || v === null) continue;
      init[def.key] = def.type === "boolean" ? Boolean(v) : String(v);
    }
    return init;
  });
  const setCustom = (slot: string, value: string | boolean) =>
    setCustomDraft((prev) => ({ ...prev, [slot]: value }));

  // Resolve the draft into a storage-ready customValues object.
  const buildCustomValues = (): CustomValues => {
    const out: CustomValues = {};
    for (const def of customFields) {
      const raw = customDraft[def.key];
      if (def.type === "boolean") {
        if (raw === true) out[def.key] = true;
        else if (raw === false) out[def.key] = false;
      } else if (def.type === "number" || def.type === "currency") {
        const s = typeof raw === "string" ? raw.trim() : "";
        if (s !== "") {
          const n = Number(s);
          if (Number.isFinite(n)) out[def.key] = n;
        }
      } else {
        const s = typeof raw === "string" ? raw.trim() : "";
        if (s !== "") out[def.key] = s;
      }
    }
    return out;
  };

  // Structured fields — numbers/date kept as strings while editing, parsed on save.
  const [amount, setAmount] = useState(note.amount != null ? String(note.amount) : "");
  const [distance, setDistance] = useState(note.distance != null ? String(note.distance) : "");
  const [rating, setRating] = useState<number | null>(note.rating);
  const [date, setDate] = useState(note.date ? note.date.slice(0, 10) : "");
  const [phone, setPhone] = useState(note.phone ?? "");
  const [email, setEmail] = useState(note.email ?? "");
  const [url, setUrl] = useState(note.url ?? "");
  const [address, setAddress] = useState(note.address ?? "");
  const [enabled, setEnabled] = useState<Set<NoteFieldKey>>(
    () => new Set(note.enabledFields.filter((k): k is NoteFieldKey =>
      NOTE_FIELDS.some((f) => f.key === k)))
  );

  const numOrNull = (s: string): number | null => {
    const t = s.trim();
    if (t === "") return null;
    const n = Number(t);
    return Number.isFinite(n) ? n : null;
  };
  const strOrNull = (s: string): string | null => (s.trim() === "" ? null : s.trim());

  const hasValue: Record<NoteFieldKey, boolean> = {
    amount: amount.trim() !== "",
    distance: distance.trim() !== "",
    rating: rating !== null,
    date: date !== "",
    phone: phone.trim() !== "",
    email: email.trim() !== "",
    url: url.trim() !== "",
    address: address.trim() !== "",
  };
  const isShown = (k: NoteFieldKey) => hasValue[k] || enabled.has(k);
  const toggleField = (k: NoteFieldKey) =>
    setEnabled((prev) => {
      const n = new Set(prev);
      if (n.has(k)) n.delete(k);
      else n.add(k);
      return n;
    });

  // The payload sent on save/autosave — content, project, and all field values.
  // `title` is only included when auto-title is off (manual mode); omitting it
  // signals the parent to leave the title alone / run auto-naming.
  const buildPayload = (): NotePatch => ({
    content,
    projectId,
    amount: numOrNull(amount),
    distance: numOrNull(distance),
    rating,
    date: date || null,
    phone: strOrNull(phone),
    email: strOrNull(email),
    url: strOrNull(url),
    address: strOrNull(address),
    enabledFields: [...enabled],
    customValues: buildCustomValues(),
    ...(autoTitle ? {} : { title: titleDraft.trim() || null }),
  });

  // Autosave edits; the Close button also collapses the card.
  useAutosave(
    [content, projectId, amount, distance, rating, date, phone, email, url, address, [...enabled].join(","), JSON.stringify(customDraft), autoTitle, titleDraft],
    () => onAutosave(buildPayload())
  );
  const [pickerOpen, setPickerOpen] = useState(false);
  const [deepWrite, setDeepWrite] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const projectBtnRef = useRef<HTMLButtonElement>(null);

  // Sync deep write with browser fullscreen
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
        padding: deepWrite ? "56px 24px 96px" : "18px 20px 12px",
        minHeight: deepWrite ? "100vh" : 220,
        // Match preview row's view-transition-name so the browser animates one
        // into the other smoothly.
        viewTransitionName: `note-${note.id}`,
      } as React.CSSProperties}
    >
      <div
        style={{
          maxWidth: deepWrite ? 720 : "none",
          margin: deepWrite ? "0 auto" : 0,
        }}
      >
        {!autoTitle && (
          <input
            value={titleDraft}
            onChange={(e) => setTitleDraft(e.target.value)}
            placeholder="Title"
            style={titleInputStyle}
          />
        )}
        <IMWEditor
          key={note.id}
          initialContent={note.content}
          placeholder="Edit note…"
          fontSize={16}
          lineWidth="100%"
          onChange={setContent}
          autoFocus
        />
      </div>

      {/* Structured fields — toggle row + inputs for whatever's shown */}
      <div style={{ marginTop: 14 }}>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
          {NOTE_FIELDS.map((f) => {
            const on = isShown(f.key);
            return (
              <button
                key={f.key}
                onClick={() => toggleField(f.key)}
                disabled={hasValue[f.key]}
                title={
                  hasValue[f.key]
                    ? `${f.label} (clear its value to hide)`
                    : on
                      ? `Hide ${f.label}`
                      : `Add ${f.label}`
                }
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  border: `1px solid ${on ? C.accent : C.border}`,
                  background: on ? `${C.accent}1a` : "transparent",
                  color: on ? C.accent : C.textDim,
                  borderRadius: 999,
                  padding: "4px 11px",
                  fontSize: 12,
                  fontFamily: MONO,
                  cursor: hasValue[f.key] ? "default" : "pointer",
                }}
              >
                <span aria-hidden style={{ fontSize: 12 }}>{f.icon}</span>
                {f.label}
              </button>
            );
          })}
        </div>

        {NOTE_FIELDS.some((f) => isShown(f.key)) && (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
              gap: 12,
              marginTop: 14,
            }}
          >
            {isShown("amount") && (
              <FieldShell label="Amount">
                <div style={{ display: "flex", alignItems: "center", gap: 6, ...fieldInputBox }}>
                  <span style={{ color: C.textFaint }}>$</span>
                  <input
                    type="number"
                    inputMode="decimal"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="0"
                    style={bareInput}
                  />
                </div>
              </FieldShell>
            )}
            {isShown("distance") && (
              <FieldShell label="Distance">
                <div style={{ display: "flex", alignItems: "center", gap: 6, ...fieldInputBox }}>
                  <input
                    type="number"
                    inputMode="decimal"
                    value={distance}
                    onChange={(e) => setDistance(e.target.value)}
                    placeholder="0"
                    style={bareInput}
                  />
                  <span style={{ color: C.textFaint, fontSize: 12 }}>mi</span>
                </div>
              </FieldShell>
            )}
            {isShown("rating") && (
              <FieldShell label="Rating">
                <div style={{ display: "flex", alignItems: "center", gap: 4, height: 38 }}>
                  {[1, 2, 3, 4, 5].map((n) => (
                    <button
                      key={n}
                      onClick={() => setRating(rating === n ? null : n)}
                      aria-label={`${n} star${n === 1 ? "" : "s"}`}
                      style={{
                        border: "none",
                        background: "transparent",
                        cursor: "pointer",
                        fontSize: 20,
                        lineHeight: 1,
                        padding: 0,
                        color: rating != null && n <= rating ? "#d9a441" : C.border,
                      }}
                    >
                      ★
                    </button>
                  ))}
                </div>
              </FieldShell>
            )}
            {isShown("date") && (
              <FieldShell label="Date">
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  style={{ ...fieldInputBox, colorScheme: "dark" } as React.CSSProperties}
                />
              </FieldShell>
            )}
            {isShown("phone") && (
              <FieldShell label="Phone">
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+1 555 123 4567"
                  style={fieldInputBox}
                />
              </FieldShell>
            )}
            {isShown("email") && (
              <FieldShell label="Email">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  style={fieldInputBox}
                />
              </FieldShell>
            )}
            {isShown("url") && (
              <FieldShell label="Link">
                <input
                  type="url"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="example.com/page"
                  style={fieldInputBox}
                />
              </FieldShell>
            )}
            {isShown("address") && (
              <FieldShell label="Address">
                <input
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="123 Main St, City"
                  style={fieldInputBox}
                />
              </FieldShell>
            )}
          </div>
        )}

        {/* Project custom fields — always shown for notes in this project */}
        {customFields.length > 0 && (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
              gap: 12,
              marginTop: 14,
            }}
          >
            {customFields.map((def) => {
              const raw = customDraft[def.key];
              if (def.type === "boolean") {
                const val = raw === true;
                return (
                  <FieldShell key={def.key} label={def.label}>
                    <button
                      onClick={() => setCustom(def.key, !val)}
                      role="switch"
                      aria-checked={val}
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 8,
                        height: 38,
                        border: `1px solid ${val ? C.accent : C.border}`,
                        background: val ? `${C.accent}1a` : "transparent",
                        color: val ? C.accent : C.textDim,
                        borderRadius: 9,
                        padding: "0 12px",
                        fontSize: 13,
                        cursor: "pointer",
                      }}
                    >
                      {val ? "Yes" : "No"}
                    </button>
                  </FieldShell>
                );
              }
              const isNum = def.type === "number" || def.type === "currency";
              return (
                <FieldShell key={def.key} label={def.label}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, ...fieldInputBox }}>
                    {def.type === "currency" && <span style={{ color: C.textFaint }}>$</span>}
                    <input
                      type={isNum ? "number" : "text"}
                      inputMode={isNum ? "decimal" : undefined}
                      value={typeof raw === "string" ? raw : ""}
                      onChange={(e) => setCustom(def.key, e.target.value)}
                      placeholder={isNum ? "0" : ""}
                      style={bareInput}
                    />
                  </div>
                </FieldShell>
              );
            })}
          </div>
        )}
      </div>

      {/* Action bar */}
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

        <AutoTitleToggle on={autoTitle} onChange={setAutoTitle} />

        {/* Project picker */}
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
            title="Change project"
          >
            <span style={{ color: C.accent, marginRight: 5 }}>◆</span>
            {projectName}
          </button>
          {pickerOpen && (
            <ProjectPickerDropdown
              projects={projects}
              currentProjectId={projectId}
              anchorRef={projectBtnRef}
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
            color: C.danger,
            cursor: "pointer",
            fontFamily: MONO,
            fontSize: 12,
            padding: "5px 8px",
          }}
        >
          delete
        </button>
        <button
          onClick={() => onSave(buildPayload())}
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
          Close
        </button>
      </div>
    </div>
  );
}

// Shared project option list — rendered inside FixedDropdown
function ProjectOptionsList({
  projects,
  currentProjectId,
  onPick,
}: {
  projects: Project[];
  currentProjectId: string | null;
  onPick: (projectId: string | null) => void;
}) {
  return (
    <>
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
    </>
  );
}

function ProjectPickerDropdown({
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
      <ProjectOptionsList
        currentProjectId={currentProjectId}
        projects={projects}
        onPick={onPick}
      />
    </FixedDropdown>
  );
}
