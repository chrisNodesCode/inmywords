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
// Filter constants
const ALL_PROJECTS = "__all__";
const UNASSIGNED_PROJECT = "__unassigned__";
const ALL_STATUSES = "__all_statuses__";

// ── Types ───────────────────────────────────────────────────────────────────

type Project = {
  id: string;
  name: string;
};

type PromptStatus = "draft" | "in-progress" | "done" | "wont-do";

type Prompt = {
  id: string;
  title: string | null;
  content: string;
  status: PromptStatus;
  projectId: string | null;
  project: { id: string; name: string } | null;
  createdAt: string;
  updatedAt: string;
};

const PROMPT_STATUSES: { value: PromptStatus; label: string; color: string }[] = [
  { value: "draft", label: "Draft", color: "var(--pg-text-faint)" },
  { value: "in-progress", label: "In Progress", color: "#60a5fa" },
  { value: "done", label: "Done", color: "#34d399" },
  { value: "wont-do", label: "Won't Do", color: "#f87171" },
];

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
const LAST_PROJECT_KEY = "chris.prompts.lastProjectId";
const LAST_STATUS_KEY = "chris.prompts.lastStatusFilter";
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

export default function PromptsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [prompts, setPrompts] = useState<Prompt[]>([]);
  const [loading, setLoading] = useState(true);

  // Editor state
  const [draftContent, setDraftContent] = useState("");
  const [editorKey, setEditorKey] = useState(0); // bump to remount/reset
  const [deepWrite, setDeepWrite] = useState(false);
  const editorWrapperRef = useRef<HTMLDivElement>(null);

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
  const [statusFilter, setStatusFilterState] = useState(ALL_STATUSES);
  const setStatusFilter = useCallback((v: string) => {
    setStatusFilterState(v);
    if (typeof window !== "undefined") localStorage.setItem(LAST_STATUS_KEY, v);
  }, []);

  // Load initial data
  useEffect(() => {
    (async () => {
      try {
        const [pr, prr] = await Promise.all([
          fetch("/chris/api/projects"),
          fetch("/chris/api/prompts"),
        ]);
        const pd = await pr.json();
        const prd = await prr.json();
        const loadedProjects: Project[] = (pd.projects ?? []).map((p: { id: string; name: string }) => ({
          id: p.id,
          name: p.name,
        }));
        setProjects(loadedProjects);
        setPrompts(prd.prompts ?? []);

        const saved = localStorage.getItem(LAST_PROJECT_KEY);
        if (saved === ALL_PROJECTS || saved === UNASSIGNED_PROJECT) setProjectFilterState(saved);
        else if (saved && loadedProjects.some((p) => p.id === saved)) {
          setProjectFilterState(saved);
        }
        const savedStatus = localStorage.getItem(LAST_STATUS_KEY);
        if (savedStatus === ALL_STATUSES || PROMPT_STATUSES.some((s) => s.value === savedStatus)) {
          setStatusFilterState(savedStatus!);
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

  const savePrompt = async (projectIdOverride?: string | null) => {
    if (isContentEmpty(draftContent)) return;
    const projectId = projectIdOverride !== undefined ? projectIdOverride : activeProjectId;
    const res = await fetch("/chris/api/prompts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: draftContent, projectId }),
    });
    if (res.ok) {
      const { prompt } = await res.json();
      setPrompts((prev) => [prompt, ...prev]);
      setDraftContent("");
      setEditorKey((k) => k + 1);
      // Auto-name in the background, claude.ai-style. Best-effort; never blocks.
      if (!prompt.title) void autoNamePrompt(prompt.id);
    }
  };

  // Ask Claude for a title based on the saved content, then persist it — but
  // only if the user hasn't typed their own title in the meantime.
  const autoNamePrompt = async (id: string) => {
    try {
      const res = await fetch(`/chris/api/prompts/${id}/generate-title`, {
        method: "POST",
      });
      if (!res.ok) return;
      const { title } = await res.json();
      if (!title) return;

      const patchRes = await fetch(`/chris/api/prompts/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title }),
      });
      if (!patchRes.ok) return;
      const { prompt: updated } = await patchRes.json();
      setPrompts((prev) =>
        prev.map((p) => (p.id === id && !p.title ? updated : p))
      );
    } catch {
      // best-effort — leave the prompt untitled on failure
    }
  };

  const handleProjectFilterChange = async (v: string) => {
    setProjectFilter(v);
    const pid = v === ALL_PROJECTS || v === UNASSIGNED_PROJECT ? null : v;
    if (!isContentEmpty(draftContent)) {
      await savePrompt(pid);
    }
  };

  // ── Prompt row actions ────────────────────────────────────────────────────

  const deletePrompt = async (id: string) => {
    setPrompts((prev) => prev.filter((p) => p.id !== id));
    await fetch(`/chris/api/prompts/${id}`, { method: "DELETE" });
  };

  const patchPrompt = async (
    id: string,
    body: { content?: string; projectId?: string | null; status?: PromptStatus }
  ) => {
    const res = await fetch(`/chris/api/prompts/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (res.ok) {
      const { prompt } = await res.json();
      setPrompts((prev) => prev.map((p) => (p.id === id ? prompt : p)));
    }
  };

  const reassignPrompt = async (id: string, projectId: string | null) => {
    setPrompts((prev) =>
      prev.map((p) =>
        p.id === id
          ? {
              ...p,
              projectId,
              project: projectId ? projects.find((x) => x.id === projectId) ?? null : null,
            }
          : p
      )
    );
    await fetch(`/chris/api/prompts/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ projectId }),
    });
  };

  const setPromptStatus = async (id: string, status: PromptStatus) => {
    setPrompts((prev) => prev.map((p) => (p.id === id ? { ...p, status } : p)));
    await fetch(`/chris/api/prompts/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
  };

  const copyPrompt = async (content: string) => {
    const text = extractPreview(content, 10_000);
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      // ignore
    }
  };

  // ── Derived: filter then group prompts by project ─────────────────────────

  const grouped = useMemo(() => {
    let list = prompts;

    // Project filter
    if (projectFilter === UNASSIGNED_PROJECT) list = list.filter((p) => !p.projectId);
    else if (projectFilter !== ALL_PROJECTS) list = list.filter((p) => p.projectId === projectFilter);

    // Status filter
    if (statusFilter !== ALL_STATUSES) list = list.filter((p) => p.status === statusFilter);

    const groups: { id: string; name: string; items: Prompt[] }[] = [];
    const unassigned = list.filter((p) => !p.projectId);
    if (unassigned.length) groups.push({ id: UNASSIGNED, name: "Unassigned", items: unassigned });
    for (const proj of projects) {
      const items = list.filter((p) => p.projectId === proj.id);
      if (items.length) groups.push({ id: proj.id, name: proj.name, items });
    }
    return groups;
  }, [prompts, projects, projectFilter, statusFilter]);

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
          <Link href="/chris" style={{ textDecoration: "none", fontFamily: MONO, fontSize: 14 }}>
            <span style={{ color: C.textFaint }}>~/chris/</span>
            <span style={{ color: C.text }}>prompts</span>
          </Link>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 12 }}>
            <span style={{ fontFamily: MONO, fontSize: 12, color: C.textFaint }}>
              {prompts.length} prompt{prompts.length === 1 ? "" : "s"}
            </span>
            <ThemeControls />
          <FullscreenButton />
          </div>
        </header>
      )}

      {/* Composer — hidden while editing an existing prompt in-place */}
      {editingId === null && (
      <section style={{ marginTop: deepWrite ? 0 : 28 }}>
        <div
          ref={editorWrapperRef}
          className="chris-editor-wrap"
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
            <IMWEditor
              key={editorKey}
              placeholder="Draft a prompt — instructions, system context, examples…"
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
          <div style={{ flex: 1 }} />
          <button
            onClick={() => savePrompt()}
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
            Save prompt
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

            {/* Status dropdown */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              style={{
                background: C.card,
                border: `1px solid ${C.border}`,
                borderRadius: 8,
                color: statusFilter === ALL_STATUSES
                  ? C.text
                  : (PROMPT_STATUSES.find((s) => s.value === statusFilter)?.color ?? C.text),
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
              <option value={ALL_STATUSES}>All Statuses</option>
              {PROMPT_STATUSES.map((s) => (
                <option key={s.value} value={s.value}>{s.label}</option>
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
      {!deepWrite && (
        <section style={{ marginTop: 32 }}>
          {loading ? (
            <Spinner label="loading…" />
          ) : grouped.length === 0 ? (
            <div style={{ textAlign: "center", padding: "48px 0", color: C.textFaint }}>
              <p style={{ margin: 0, fontSize: 14 }}>No prompts yet. Write one above.</p>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
              {grouped.map((group) => (
                <PromptGroupView
                  key={group.id}
                  group={group}
                  projects={projects}
                  editingId={editingId}
                  applyGroupReorder={(orderedIds) => {
                    // Merge new order back into the global prompts array,
                    // preserving the order of items not in this group.
                    setPrompts((prev) => {
                      const inGroup = new Set(orderedIds);
                      const groupItems = orderedIds
                        .map((id) => prev.find((p) => p.id === id)!)
                        .filter(Boolean);
                      const others = prev.filter((p) => !inGroup.has(p.id));
                      return [...groupItems, ...others];
                    });
                    void fetch("/chris/api/prompts/reorder", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ ids: orderedIds }),
                    });
                  }}
                  onPatchSave={async (id, data) => {
                    const existing = prompts.find((p) => p.id === id);
                    await patchPrompt(id, data);
                    collapseEdit();
                    // Re-name on content edits while still untitled.
                    if (existing && !existing.title) void autoNamePrompt(id);
                  }}
                  onAutosave={(id, data) => patchPrompt(id, data)}
                  onCancelEdit={collapseEdit}
                  onDelete={deletePrompt}
                  onReassign={reassignPrompt}
                  onStatusChange={setPromptStatus}
                  onCopy={copyPrompt}
                  onEdit={expandEdit}
                />
              ))}
            </div>
          )}
        </section>
      )}
    </main>
  );
}

// ── Prompt row ───────────────────────────────────────────────────────────────

function PromptGroupView({
  group,
  projects,
  editingId,
  applyGroupReorder,
  onPatchSave,
  onAutosave,
  onCancelEdit,
  onDelete,
  onReassign,
  onStatusChange,
  onCopy,
  onEdit,
}: {
  group: { id: string; name: string; items: Prompt[] };
  projects: Project[];
  editingId: string | null;
  applyGroupReorder: (orderedIds: string[]) => void;
  onPatchSave: (
    id: string,
    data: { content: string; projectId: string | null }
  ) => Promise<void>;
  onAutosave: (
    id: string,
    data: { content: string; projectId: string | null; status?: PromptStatus }
  ) => void;
  onCancelEdit: () => void;
  onDelete: (id: string) => void;
  onReassign: (id: string, projectId: string | null) => void;
  onStatusChange: (id: string, status: PromptStatus) => void;
  onCopy: (content: string) => void;
  onEdit: (id: string) => void;
}) {
  const { rowProps, rowStyle } = useDragReorder(group.items, (next) =>
    applyGroupReorder(next.map((p) => p.id))
  );
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
        {group.items.map((prompt) =>
          editingId === prompt.id ? (
            <PromptEditingCard
              key={prompt.id}
              prompt={prompt}
              projects={projects}
              onSave={(data) => onPatchSave(prompt.id, data)}
              onAutosave={(data) => onAutosave(prompt.id, data)}
              onCancel={onCancelEdit}
              onDelete={() => {
                onDelete(prompt.id);
                onCancelEdit();
              }}
            />
          ) : (
            <PromptRow
              key={prompt.id}
              prompt={prompt}
              projects={projects}
              dragProps={rowProps(prompt.id)}
              dragStyle={rowStyle(prompt.id)}
              onDelete={() => onDelete(prompt.id)}
              onReassign={(pid) => onReassign(prompt.id, pid)}
              onStatusChange={(s) => onStatusChange(prompt.id, s)}
              onCopy={() => onCopy(prompt.content)}
              onEdit={() => onEdit(prompt.id)}
            />
          )
        )}
      </div>
    </div>
  );
}

function PromptRow({
  prompt,
  projects,
  dragProps,
  dragStyle,
  onDelete,
  onReassign,
  onStatusChange,
  onCopy,
  onEdit,
}: {
  prompt: Prompt;
  projects: Project[];
  dragProps: React.HTMLAttributes<HTMLDivElement> & { draggable?: boolean };
  dragStyle: React.CSSProperties;
  onDelete: () => void;
  onReassign: (projectId: string | null) => void;
  onStatusChange: (status: PromptStatus) => void;
  onCopy: () => void;
  onEdit: () => void;
}) {
  const [hover, setHover] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [statusOpen, setStatusOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const projectBtnRef = useRef<HTMLButtonElement>(null);
  const statusBtnRef = useRef<HTMLButtonElement>(null);

  const preview = useMemo(() => extractPreview(prompt.content, 200), [prompt.content]);
  const statusInfo = PROMPT_STATUSES.find((s) => s.value === prompt.status) ?? PROMPT_STATUSES[0];

  const handleCopy = async () => {
    await onCopy();
    setCopied(true);
    setTimeout(() => setCopied(false), 1200);
  };

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
        viewTransitionName: `prompt-${prompt.id}`,
        ...dragStyle,
      } as React.CSSProperties}
    >
      <div onClick={onEdit} title="Click to edit" style={{ cursor: "pointer" }}>
        {prompt.title && (
          <div
            style={{
              fontSize: 14.5,
              fontWeight: 600,
              color: C.text,
              marginBottom: 5,
              wordBreak: "break-word",
            }}
          >
            {prompt.title}
          </div>
        )}
        <div
          style={{
            fontSize: prompt.title ? 13 : 14,
            lineHeight: 1.55,
            color: prompt.title ? C.textDim : C.text,
            wordBreak: "break-word",
          }}
        >
          {preview}
          {prompt.content.length > 200 && (
            <span style={{ color: C.textFaint }}> …</span>
          )}
        </div>
      </div>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          marginTop: 10,
        }}
      >
        <span style={{ fontFamily: MONO, fontSize: 11, color: C.textFaint }}>
          {formatRelative(prompt.updatedAt)}
        </span>
        <div style={{ position: "relative" }}>
          <button
            ref={statusBtnRef}
            onClick={() => setStatusOpen((x) => !x)}
            style={{
              border: `1px solid ${statusInfo.color}44`,
              background: `${statusInfo.color}15`,
              color: statusInfo.color,
              borderRadius: 999,
              padding: "3px 10px",
              fontSize: 11,
              cursor: "pointer",
              fontFamily: MONO,
            }}
            title="Change status"
          >
            {statusInfo.label}
          </button>
          {statusOpen && (
            <FixedDropdown
              anchorRef={statusBtnRef}
              onClose={() => setStatusOpen(false)}
              width={160}
              maxHeight={200}
            >
              {PROMPT_STATUSES.map((s) => (
                <button
                  key={s.value}
                  onClick={() => { onStatusChange(s.value); setStatusOpen(false); }}
                  style={{
                    display: "block",
                    width: "100%",
                    textAlign: "left",
                    border: "none",
                    background: prompt.status === s.value ? `${s.color}22` : "transparent",
                    color: s.color,
                    padding: "8px 14px",
                    fontSize: 12.5,
                    cursor: "pointer",
                    fontFamily: MONO,
                  }}
                >
                  {s.label}
                </button>
              ))}
            </FixedDropdown>
          )}
        </div>
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
          {prompt.project?.name ?? "Unassigned"}
        </button>
        <button
          onClick={handleCopy}
          style={{
            border: "none",
            background: "transparent",
            color: copied ? C.accent : C.textFaint,
            cursor: "pointer",
            fontFamily: MONO,
            fontSize: 11.5,
            padding: "3px 6px",
            opacity: hover || copied ? 1 : 0.6,
            transition: "opacity 0.12s ease",
          }}
        >
          {copied ? "copied ✓" : "copy"}
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
            currentProjectId={prompt.projectId}
            projects={projects}
            onPick={(pid) => { onReassign(pid); setPickerOpen(false); }}
          />
        </FixedDropdown>
      )}
    </div>
  );
}

// ── In-place editing card ────────────────────────────────────────────────────

function PromptEditingCard({
  prompt,
  projects,
  onSave,
  onAutosave,
  onCancel,
  onDelete,
}: {
  prompt: Prompt;
  projects: Project[];
  onSave: (data: { content: string; projectId: string | null; status?: PromptStatus }) => Promise<void>;
  onAutosave: (data: { content: string; projectId: string | null; status?: PromptStatus }) => void;
  onCancel: () => void;
  onDelete: () => void;
}) {
  const [content, setContent] = useState(prompt.content);
  const [projectId, setProjectId] = useState<string | null>(prompt.projectId);
  const [status, setStatus] = useState<PromptStatus>(prompt.status);

  // Autosave edits; the Save button also collapses the card.
  useAutosave([content, projectId, status], () => onAutosave({ content, projectId, status }));
  const [pickerOpen, setPickerOpen] = useState(false);
  const [statusOpen, setStatusOpen] = useState(false);
  const [deepWrite, setDeepWrite] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const projectBtnRef = useRef<HTMLButtonElement>(null);
  const statusBtnRef = useRef<HTMLButtonElement>(null);

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

  const dirty =
    content !== prompt.content || projectId !== prompt.projectId || status !== prompt.status;
  const canSave = dirty && !isContentEmpty(content);
  const editStatusInfo = PROMPT_STATUSES.find((s) => s.value === status) ?? PROMPT_STATUSES[0];
  const projectName =
    projectId ? projects.find((p) => p.id === projectId)?.name ?? "Unassigned" : "Unassigned";

  return (
    <div
      ref={wrapperRef}
      className="chris-editor-wrap"
      style={{
        position: "relative",
        background: deepWrite ? C.bg : C.card,
        border: deepWrite ? "none" : `1px solid ${C.accent}55`,
        borderRadius: deepWrite ? 0 : 14,
        padding: deepWrite ? "56px 24px 96px" : "18px 20px 12px",
        minHeight: deepWrite ? "100vh" : 220,
        // Match preview row's view-transition-name so the browser animates one
        // into the other smoothly.
        viewTransitionName: `prompt-${prompt.id}`,
      } as React.CSSProperties}
    >
      <div
        style={{
          maxWidth: deepWrite ? 720 : "none",
          margin: deepWrite ? "0 auto" : 0,
        }}
      >
        <IMWEditor
          key={prompt.id}
          initialContent={prompt.content}
          placeholder="Edit prompt…"
          fontSize={16}
          lineWidth="100%"
          onChange={setContent}
          autoFocus
        />
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

        {/* Status picker */}
        <div style={{ position: "relative" }}>
          <button
            ref={statusBtnRef}
            onClick={() => setStatusOpen((x) => !x)}
            style={{
              border: `1px solid ${editStatusInfo.color}44`,
              background: `${editStatusInfo.color}15`,
              color: editStatusInfo.color,
              borderRadius: 999,
              padding: "5px 11px",
              fontSize: 12,
              cursor: "pointer",
              fontFamily: MONO,
            }}
            title="Change status"
          >
            {editStatusInfo.label}
          </button>
          {statusOpen && (
            <FixedDropdown
              anchorRef={statusBtnRef}
              onClose={() => setStatusOpen(false)}
              width={160}
              maxHeight={200}
            >
              {PROMPT_STATUSES.map((s) => (
                <button
                  key={s.value}
                  onClick={() => { setStatus(s.value); setStatusOpen(false); }}
                  style={{
                    display: "block",
                    width: "100%",
                    textAlign: "left",
                    border: "none",
                    background: status === s.value ? `${s.color}22` : "transparent",
                    color: s.color,
                    padding: "8px 14px",
                    fontSize: 12.5,
                    cursor: "pointer",
                    fontFamily: MONO,
                  }}
                >
                  {s.label}
                </button>
              ))}
            </FixedDropdown>
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
          onClick={() => onSave({ content, projectId, status })}
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
