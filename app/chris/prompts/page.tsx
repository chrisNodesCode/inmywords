"use client";

import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import Link from "next/link";
import { IMWEditor } from "@/components/editor";
import { parseEntryContent, extractPlainText } from "@/lib/tiptap-content";
import { useDragReorder } from "@/app/chris/_lib/dragReorder";

// ── Types ───────────────────────────────────────────────────────────────────

type Project = {
  id: string;
  name: string;
};

type Prompt = {
  id: string;
  title: string | null;
  content: string;
  projectId: string | null;
  project: { id: string; name: string } | null;
  createdAt: string;
  updatedAt: string;
};

// ── Palette ──────────────────────────────────────────────────────────────────

const C = {
  bg: "#0e0f12",
  card: "#15171c",
  cardHover: "#181b21",
  border: "#23262d",
  borderSoft: "#1f2228",
  text: "#e7e9ee",
  textDim: "#9aa0aa",
  textFaint: "#6b7280",
  accent: "#c9a86a",
  accentText: "#1a1710",
  danger: "#e0736a",
};
const MONO = 'ui-monospace, SFMono-Regular, "SF Mono", Menlo, monospace';
const LAST_PROJECT_KEY = "chris.prompts.lastProjectId";
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

  // Active project — null means "Unassigned"
  const [activeProjectId, setActiveProjectIdState] = useState<string | null>(null);
  const setActiveProjectId = useCallback((id: string | null) => {
    setActiveProjectIdState(id);
    if (typeof window !== "undefined") {
      localStorage.setItem(LAST_PROJECT_KEY, id ?? UNASSIGNED);
    }
  }, []);

  // List management
  const [creatingProject, setCreatingProject] = useState(false);
  const [newProjectName, setNewProjectName] = useState("");

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
        if (saved === UNASSIGNED) setActiveProjectIdState(null);
        else if (saved && loadedProjects.some((p) => p.id === saved)) {
          setActiveProjectIdState(saved);
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
        await editorWrapperRef.current?.requestFullscreen();
        setDeepWrite(true);
      } catch {
        // fullscreen denied; still toggle visual mode
        setDeepWrite(true);
      }
    }
  };

  // ── Save & chip actions ───────────────────────────────────────────────────

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
    }
  };

  const handleChipClick = async (projectId: string | null) => {
    setActiveProjectId(projectId);
    if (!isContentEmpty(draftContent)) {
      await savePrompt(projectId);
    }
  };

  const createProject = async (name: string): Promise<Project | null> => {
    const t = name.trim();
    if (!t) return null;
    const res = await fetch("/chris/api/projects", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: t }),
    });
    if (!res.ok) return null;
    const { project } = await res.json();
    const p: Project = { id: project.id, name: project.name };
    setProjects((prev) => [...prev, p]);
    return p;
  };

  // ── Prompt row actions ────────────────────────────────────────────────────

  const deletePrompt = async (id: string) => {
    setPrompts((prev) => prev.filter((p) => p.id !== id));
    await fetch(`/chris/api/prompts/${id}`, { method: "DELETE" });
  };

  const patchPrompt = async (
    id: string,
    body: { content?: string; projectId?: string | null }
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

  const copyPrompt = async (content: string) => {
    const text = extractPreview(content, 10_000);
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      // ignore
    }
  };

  // ── Derived: group prompts by project ─────────────────────────────────────

  const grouped = useMemo(() => {
    const groups: { id: string; name: string; items: Prompt[] }[] = [];
    const unassigned = prompts.filter((p) => !p.projectId);
    if (unassigned.length) groups.push({ id: UNASSIGNED, name: "Unassigned", items: unassigned });
    for (const proj of projects) {
      const items = prompts.filter((p) => p.projectId === proj.id);
      if (items.length) groups.push({ id: proj.id, name: proj.name, items });
    }
    return groups;
  }, [prompts, projects]);

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
          <span style={{ fontFamily: MONO, fontSize: 12, color: C.textFaint }}>
            {prompts.length} prompt{prompts.length === 1 ? "" : "s"}
          </span>
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
            padding: deepWrite ? "56px 24px 24px" : "20px 22px 8px",
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

        {/* Project chip row — hidden in deep write */}
        {!deepWrite && (
          <>
            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                alignItems: "center",
                gap: 6,
                padding: "12px 4px 0",
              }}
            >
              <ProjectChip
                name="Unassigned"
                active={activeProjectId === null}
                onClick={() => handleChipClick(null)}
                muted
              />
              {projects.map((p) => (
                <ProjectChip
                  key={p.id}
                  name={p.name}
                  active={activeProjectId === p.id}
                  onClick={() => handleChipClick(p.id)}
                />
              ))}
              {creatingProject ? (
                <input
                  autoFocus
                  value={newProjectName}
                  onChange={(e) => setNewProjectName(e.target.value)}
                  onBlur={async () => {
                    const p = await createProject(newProjectName);
                    if (p) setActiveProjectId(p.id);
                    setNewProjectName("");
                    setCreatingProject(false);
                  }}
                  onKeyDown={async (e) => {
                    if (e.key === "Enter") {
                      const p = await createProject(newProjectName);
                      if (p) setActiveProjectId(p.id);
                      setNewProjectName("");
                      setCreatingProject(false);
                    }
                    if (e.key === "Escape") {
                      setNewProjectName("");
                      setCreatingProject(false);
                    }
                  }}
                  placeholder="Project name"
                  style={{
                    background: "transparent",
                    border: `1px solid ${C.accent}`,
                    borderRadius: 999,
                    outline: "none",
                    color: C.text,
                    fontSize: 12.5,
                    padding: "5px 11px",
                    minWidth: 120,
                  }}
                />
              ) : (
                <button
                  onClick={() => setCreatingProject(true)}
                  style={{
                    border: `1px dashed ${C.border}`,
                    background: "transparent",
                    color: C.textDim,
                    borderRadius: 999,
                    padding: "5px 12px",
                    fontSize: 12.5,
                    cursor: "pointer",
                  }}
                >
                  + project
                </button>
              )}
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
            {/* Save target hint */}
            <p style={{ margin: "12px 4px 0", fontFamily: MONO, fontSize: 11.5, color: C.textFaint }}>
              saves to{" "}
              <span style={{ color: C.accent }}>
                {activeProjectId
                  ? projects.find((p) => p.id === activeProjectId)?.name ?? "Unassigned"
                  : "Unassigned"}
              </span>
            </p>
          </>
        )}
      </section>
      )}

      {/* Feed */}
      {!deepWrite && (
        <section style={{ marginTop: 32 }}>
          {loading ? (
            <p style={{ color: C.textFaint, fontFamily: MONO, fontSize: 13 }}>loading…</p>
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
                    await patchPrompt(id, data);
                    collapseEdit();
                  }}
                  onCancelEdit={collapseEdit}
                  onDelete={deletePrompt}
                  onReassign={reassignPrompt}
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

// ── Chip ─────────────────────────────────────────────────────────────────────

function ProjectChip({
  name,
  active,
  onClick,
  muted,
}: {
  name: string;
  active: boolean;
  onClick: () => void;
  muted?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        border: `1px solid ${active ? C.accent : C.border}`,
        background: active ? C.accent : "transparent",
        color: active ? C.accentText : muted ? C.textFaint : C.textDim,
        borderRadius: 999,
        padding: "5px 12px",
        fontSize: 12.5,
        fontWeight: active ? 600 : 400,
        cursor: "pointer",
        fontStyle: muted && !active ? "italic" : "normal",
        transition: "background 0.15s ease, color 0.15s ease",
      }}
    >
      {name}
    </button>
  );
}

// ── Prompt row ───────────────────────────────────────────────────────────────

function PromptGroupView({
  group,
  projects,
  editingId,
  applyGroupReorder,
  onPatchSave,
  onCancelEdit,
  onDelete,
  onReassign,
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
  onCancelEdit: () => void;
  onDelete: (id: string) => void;
  onReassign: (id: string, projectId: string | null) => void;
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
  onCopy,
  onEdit,
}: {
  prompt: Prompt;
  projects: Project[];
  dragProps: React.HTMLAttributes<HTMLDivElement> & { draggable?: boolean };
  dragStyle: React.CSSProperties;
  onDelete: () => void;
  onReassign: (projectId: string | null) => void;
  onCopy: () => void;
  onEdit: () => void;
}) {
  const [hover, setHover] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const preview = useMemo(() => extractPreview(prompt.content, 200), [prompt.content]);

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
      <div
        onClick={onEdit}
        title="Click to edit"
        style={{
          fontSize: 14,
          lineHeight: 1.55,
          color: C.text,
          cursor: "pointer",
          wordBreak: "break-word",
        }}
      >
        {preview}
        {prompt.content.length > 200 && (
          <span style={{ color: C.textFaint }}> …</span>
        )}
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
        <div style={{ flex: 1 }} />
        <button
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
        <>
          <div onClick={() => setPickerOpen(false)} style={{ position: "fixed", inset: 0, zIndex: 40 }} />
          <div
            style={{
              position: "absolute",
              right: 16,
              bottom: -8,
              transform: "translateY(100%)",
              zIndex: 50,
              background: C.card,
              border: `1px solid ${C.border}`,
              borderRadius: 12,
              boxShadow: "0 12px 32px rgba(0,0,0,0.45)",
              minWidth: 220,
              maxHeight: 280,
              overflowY: "auto",
            }}
          >
            <button
              onClick={() => {
                onReassign(null);
                setPickerOpen(false);
              }}
              style={{
                display: "block",
                width: "100%",
                textAlign: "left",
                background: prompt.projectId === null ? C.cardHover : "transparent",
                border: "none",
                borderBottom: `1px solid ${C.borderSoft}`,
                color: C.textDim,
                fontStyle: "italic",
                cursor: "pointer",
                padding: "10px 14px",
                fontSize: 13,
              }}
            >
              Unassigned
            </button>
            {projects.map((p) => (
              <button
                key={p.id}
                onClick={() => {
                  onReassign(p.id);
                  setPickerOpen(false);
                }}
                style={{
                  display: "block",
                  width: "100%",
                  textAlign: "left",
                  background: prompt.projectId === p.id ? C.cardHover : "transparent",
                  border: "none",
                  borderBottom: `1px solid ${C.borderSoft}`,
                  color: C.text,
                  cursor: "pointer",
                  padding: "10px 14px",
                  fontSize: 13,
                }}
              >
                {p.name}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// ── In-place editing card ────────────────────────────────────────────────────

function PromptEditingCard({
  prompt,
  projects,
  onSave,
  onCancel,
  onDelete,
}: {
  prompt: Prompt;
  projects: Project[];
  onSave: (data: { content: string; projectId: string | null }) => Promise<void>;
  onCancel: () => void;
  onDelete: () => void;
}) {
  const [content, setContent] = useState(prompt.content);
  const [projectId, setProjectId] = useState<string | null>(prompt.projectId);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [deepWrite, setDeepWrite] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

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
        await wrapperRef.current?.requestFullscreen();
        setDeepWrite(true);
      } catch {
        setDeepWrite(true);
      }
    }
  };

  const dirty =
    content !== prompt.content || projectId !== prompt.projectId;
  const canSave = dirty && !isContentEmpty(content);
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
        padding: deepWrite ? "56px 24px 24px" : "18px 20px 12px",
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
          onClick={() => onSave({ content, projectId })}
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

// Small shared dropdown — used by the editing card and the row pill
const C_danger = "#e0736a";
const _ = C_danger; // keep import-shape sane

function ProjectPickerDropdown({
  projects,
  currentProjectId,
  onPick,
  onClose,
}: {
  projects: Project[];
  currentProjectId: string | null;
  onPick: (projectId: string | null) => void;
  onClose: () => void;
}) {
  return (
    <>
      <div onClick={onClose} style={{ position: "fixed", inset: 0, zIndex: 40 }} />
      <div
        style={{
          position: "absolute",
          left: 0,
          top: "calc(100% + 6px)",
          width: 220,
          zIndex: 50,
          background: C.card,
          border: `1px solid ${C.border}`,
          borderRadius: 12,
          boxShadow: "0 12px 32px rgba(0,0,0,0.45)",
          maxHeight: 260,
          overflowY: "auto",
        }}
      >
        <button
          onClick={() => onPick(null)}
          style={{
            display: "block",
            width: "100%",
            textAlign: "left",
            background: currentProjectId === null ? C.cardHover : "transparent",
            border: "none",
            borderBottom: `1px solid ${C.borderSoft}`,
            color: C.textDim,
            fontStyle: "italic",
            cursor: "pointer",
            padding: "10px 14px",
            fontSize: 13,
          }}
        >
          Unassigned
        </button>
        {projects.map((p) => (
          <button
            key={p.id}
            onClick={() => onPick(p.id)}
            style={{
              display: "block",
              width: "100%",
              textAlign: "left",
              background: currentProjectId === p.id ? C.cardHover : "transparent",
              border: "none",
              borderBottom: `1px solid ${C.borderSoft}`,
              color: C.text,
              cursor: "pointer",
              padding: "10px 14px",
              fontSize: 13,
            }}
          >
            {p.name}
          </button>
        ))}
      </div>
    </>
  );
}
