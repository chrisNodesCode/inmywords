"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import Link from "next/link";

// ── Types ───────────────────────────────────────────────────────────────────

type Priority = "LOW" | "MEDIUM" | "HIGH";

type Todo = {
  id: string;
  title: string;
  note: string | null;
  priority: Priority | null;
  dueDate: string | null;
  completed: boolean;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
  entryId: string | null;
  entry: { id: string; title: string | null } | null;
  projectId: string | null;
  project: { id: string; name: string } | null;
};

type EntryLite = {
  id: string;
  title: string | null;
  snippet: string;
  createdAt: string;
};

type Project = { id: string; name: string };

const LAST_PROJECT_KEY = "chris.todos.lastProjectId";
const UNASSIGNED = "__unassigned__";

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
  accent: "#c9a86a", // sand — quiet InMyWords nod
};

const MONO = 'ui-monospace, SFMono-Regular, "SF Mono", Menlo, monospace';

const PRIORITY_META: Record<Priority, { label: string; color: string }> = {
  HIGH: { label: "High", color: "#e0736a" },
  MEDIUM: { label: "Medium", color: "#d9a441" },
  LOW: { label: "Low", color: "#6f8fd0" },
};
const PRIORITY_ORDER: (Priority | null)[] = [null, "HIGH", "MEDIUM", "LOW"];

// ── Date helpers ─────────────────────────────────────────────────────────────

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

function formatDue(iso: string): { label: string; overdue: boolean; soon: boolean } {
  const due = iso.slice(0, 10);
  const today = todayISO();
  const dueDate = new Date(due + "T00:00:00Z");
  const todayDate = new Date(today + "T00:00:00Z");
  const diffDays = Math.round((dueDate.getTime() - todayDate.getTime()) / 86400000);

  let label: string;
  if (diffDays === 0) label = "Today";
  else if (diffDays === 1) label = "Tomorrow";
  else if (diffDays === -1) label = "Yesterday";
  else
    label = dueDate.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      timeZone: "UTC",
    });

  return { label, overdue: diffDays < 0, soon: diffDays >= 0 && diffDays <= 1 };
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default function TodosPage() {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [loading, setLoading] = useState(true);

  // Quick-add state
  const [title, setTitle] = useState("");
  const [note, setNote] = useState("");
  const [priority, setPriority] = useState<Priority | null>(null);
  const [due, setDue] = useState("");
  const [expanded, setExpanded] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Entry-linking state
  const [entries, setEntries] = useState<EntryLite[] | null>(null);
  const [entriesLoading, setEntriesLoading] = useState(false);
  const [pickerForId, setPickerForId] = useState<string | null>(null);

  // Project state — same UX as shopping list active chip
  const [projects, setProjects] = useState<Project[]>([]);
  const [activeProjectId, setActiveProjectIdState] = useState<string | null>(null);
  const [projectPickerForId, setProjectPickerForId] = useState<string | null>(null);
  const [creatingProject, setCreatingProject] = useState(false);
  const [newProjectName, setNewProjectName] = useState("");

  const setActiveProjectId = useCallback((id: string | null) => {
    setActiveProjectIdState(id);
    if (typeof window !== "undefined") {
      localStorage.setItem(LAST_PROJECT_KEY, id ?? UNASSIGNED);
    }
  }, []);

  useEffect(() => {
    (async () => {
      const res = await fetch("/chris/api/projects");
      if (!res.ok) return;
      const data = await res.json();
      const loaded: Project[] = (data.projects ?? []).map(
        (p: { id: string; name: string }) => ({ id: p.id, name: p.name })
      );
      setProjects(loaded);
      const saved = localStorage.getItem(LAST_PROJECT_KEY);
      if (saved === UNASSIGNED) setActiveProjectIdState(null);
      else if (saved && loaded.some((p) => p.id === saved)) {
        setActiveProjectIdState(saved);
      }
    })();
  }, []);

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
    const p = { id: project.id, name: project.name };
    setProjects((prev) => [...prev, p]);
    return p;
  };

  const ensureEntries = useCallback(async () => {
    if (entries !== null || entriesLoading) return;
    setEntriesLoading(true);
    try {
      const res = await fetch("/chris/api/entries");
      const data = await res.json();
      setEntries(data.entries ?? []);
    } finally {
      setEntriesLoading(false);
    }
  }, [entries, entriesLoading]);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/chris/api/todos");
      const data = await res.json();
      setTodos(data.todos ?? []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const resetAdd = () => {
    setTitle("");
    setNote("");
    setPriority(null);
    setDue("");
    setExpanded(false);
  };

  const addTodo = async (projectIdOverride?: string | null) => {
    const t = title.trim();
    if (!t) return;
    const projectId =
      projectIdOverride !== undefined ? projectIdOverride : activeProjectId;
    const res = await fetch("/chris/api/todos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: t,
        note,
        priority,
        dueDate: due || null,
        projectId,
      }),
    });
    if (res.ok) {
      const { todo } = await res.json();
      setTodos((prev) => [todo, ...prev]);
      resetAdd();
      inputRef.current?.focus();
    }
  };

  const handleProjectChipClick = async (projectId: string | null) => {
    setActiveProjectId(projectId);
    if (title.trim()) {
      await addTodo(projectId);
    }
    inputRef.current?.focus();
  };

  const patchTodo = async (id: string, body: Partial<Todo>) => {
    // optimistic
    setTodos((prev) => prev.map((t) => (t.id === id ? { ...t, ...body } : t)));
    const res = await fetch(`/chris/api/todos/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (res.ok) {
      const { todo } = await res.json();
      setTodos((prev) => prev.map((t) => (t.id === id ? todo : t)));
    } else {
      load();
    }
  };

  const deleteTodo = async (id: string) => {
    setTodos((prev) => prev.filter((t) => t.id !== id));
    await fetch(`/chris/api/todos/${id}`, { method: "DELETE" });
  };

  const cyclePriority = (t: Todo) => {
    const idx = PRIORITY_ORDER.indexOf(t.priority);
    const next = PRIORITY_ORDER[(idx + 1) % PRIORITY_ORDER.length];
    patchTodo(t.id, { priority: next });
  };

  const openPicker = (todoId: string) => {
    setPickerForId(todoId);
    ensureEntries();
  };

  const linkEntry = async (todoId: string, entryId: string | null) => {
    setPickerForId(null);
    await patchTodo(todoId, { entryId });
  };

  const active = todos.filter((t) => !t.completed);
  const done = todos.filter((t) => t.completed);

  return (
    <main style={{ maxWidth: 640, margin: "0 auto", padding: "0 24px 96px" }}>
      {/* Top bar */}
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
          <span style={{ color: C.text }}>todos</span>
        </Link>
        <span style={{ fontFamily: MONO, fontSize: 12, color: C.textFaint }}>
          {active.length} open
        </span>
      </header>

      {/* Quick add */}
      <section style={{ marginTop: 28 }}>
        <div
          style={{
            border: `1px solid ${C.border}`,
            borderRadius: 14,
            background: C.card,
            padding: "4px 4px 4px 16px",
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          <input
            ref={inputRef}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onFocus={() => setExpanded(true)}
            onKeyDown={(e) => {
              if (e.key === "Enter") addTodo();
              if (e.key === "Escape") resetAdd();
            }}
            placeholder="Add a to-do…"
            style={{
              flex: 1,
              background: "transparent",
              border: "none",
              outline: "none",
              color: C.text,
              fontSize: 15.5,
              padding: "12px 0",
            }}
          />
          <button
            onClick={() => addTodo()}
            disabled={!title.trim()}
            style={{
              border: "none",
              borderRadius: 10,
              background: title.trim() ? C.accent : C.border,
              color: title.trim() ? "#1a1710" : C.textFaint,
              fontWeight: 600,
              fontSize: 14,
              padding: "10px 16px",
              cursor: title.trim() ? "pointer" : "default",
              transition: "background 0.15s ease",
            }}
          >
            Add
          </button>
        </div>

        {/* Project chips — always visible (mirrors shopping list) */}
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            alignItems: "center",
            gap: 6,
            padding: "12px 4px 0",
          }}
        >
          <button
            onClick={() => handleProjectChipClick(null)}
            style={{
              border: `1px solid ${activeProjectId === null ? C.accent : C.border}`,
              background: activeProjectId === null ? C.accent : "transparent",
              color: activeProjectId === null ? "#1a1710" : C.textFaint,
              borderRadius: 999,
              padding: "5px 12px",
              fontSize: 12.5,
              fontWeight: activeProjectId === null ? 600 : 400,
              fontStyle: activeProjectId === null ? "normal" : "italic",
              cursor: "pointer",
              transition: "background 0.15s ease, color 0.15s ease",
            }}
          >
            Unassigned
          </button>
          {projects.map((p) => {
            const active = activeProjectId === p.id;
            return (
              <button
                key={p.id}
                onClick={() => handleProjectChipClick(p.id)}
                style={{
                  border: `1px solid ${active ? C.accent : C.border}`,
                  background: active ? C.accent : "transparent",
                  color: active ? "#1a1710" : C.textDim,
                  borderRadius: 999,
                  padding: "5px 12px",
                  fontSize: 12.5,
                  fontWeight: active ? 600 : 400,
                  cursor: "pointer",
                  transition: "background 0.15s ease, color 0.15s ease",
                }}
              >
                {p.name}
              </button>
            );
          })}
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
        </div>

        {/* Optional details — appear once the field is engaged */}
        {expanded && (
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              alignItems: "center",
              gap: 10,
              padding: "12px 4px 0",
            }}
          >
            {/* Priority chips */}
            <div style={{ display: "flex", gap: 6 }}>
              {(["LOW", "MEDIUM", "HIGH"] as Priority[]).map((p) => {
                const on = priority === p;
                const meta = PRIORITY_META[p];
                return (
                  <button
                    key={p}
                    onClick={() => setPriority(on ? null : p)}
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 6,
                      border: `1px solid ${on ? meta.color : C.border}`,
                      background: on ? `${meta.color}22` : "transparent",
                      color: on ? C.text : C.textDim,
                      borderRadius: 999,
                      padding: "5px 11px",
                      fontSize: 12.5,
                      cursor: "pointer",
                    }}
                  >
                    <span
                      style={{
                        width: 7,
                        height: 7,
                        borderRadius: 999,
                        background: meta.color,
                      }}
                    />
                    {meta.label}
                  </button>
                );
              })}
            </div>

            {/* Due date */}
            <input
              type="date"
              value={due}
              onChange={(e) => setDue(e.target.value)}
              style={{
                background: "transparent",
                border: `1px solid ${C.border}`,
                borderRadius: 999,
                color: due ? C.text : C.textDim,
                fontSize: 12.5,
                padding: "5px 11px",
                colorScheme: "dark",
              }}
            />

            {/* Note */}
            <input
              value={note}
              onChange={(e) => setNote(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addTodo()}
              placeholder="Add a note (optional)"
              style={{
                flex: 1,
                minWidth: 160,
                background: "transparent",
                border: `1px solid ${C.border}`,
                borderRadius: 999,
                outline: "none",
                color: C.text,
                fontSize: 12.5,
                padding: "6px 12px",
              }}
            />
          </div>
        )}
      </section>

      {/* List */}
      <section style={{ marginTop: 28 }}>
        {loading ? (
          <p style={{ color: C.textFaint, fontFamily: MONO, fontSize: 13 }}>loading…</p>
        ) : active.length === 0 && done.length === 0 ? (
          <div style={{ textAlign: "center", padding: "56px 0", color: C.textFaint }}>
            <div style={{ fontSize: 28, marginBottom: 12 }}>◜◝</div>
            <p style={{ margin: 0, fontSize: 14 }}>Nothing here yet. Add your first to-do above.</p>
          </div>
        ) : (
          <>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {active.map((t) => (
                <TodoRow
                  key={t.id}
                  todo={t}
                  onToggle={() => patchTodo(t.id, { completed: !t.completed })}
                  onCyclePriority={() => cyclePriority(t)}
                  onEditTitle={(title) => patchTodo(t.id, { title })}
                  onDelete={() => deleteTodo(t.id)}
                  pickerOpen={pickerForId === t.id}
                  entries={entries}
                  entriesLoading={entriesLoading}
                  onOpenPicker={() => openPicker(t.id)}
                  onClosePicker={() => setPickerForId(null)}
                  onLink={(entryId) => linkEntry(t.id, entryId)}
                  projects={projects}
                  projectPickerOpen={projectPickerForId === t.id}
                  onOpenProjectPicker={() => setProjectPickerForId(t.id)}
                  onCloseProjectPicker={() => setProjectPickerForId(null)}
                  onAssignProject={(pid) => patchTodo(t.id, { projectId: pid } as Partial<Todo>)}
                />
              ))}
            </div>

            {done.length > 0 && (
              <div style={{ marginTop: 28 }}>
                <p
                  style={{
                    fontFamily: MONO,
                    fontSize: 11,
                    letterSpacing: "0.08em",
                    textTransform: "uppercase",
                    color: C.textFaint,
                    margin: "0 0 10px 4px",
                  }}
                >
                  Done · {done.length}
                </p>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {done.map((t) => (
                    <TodoRow
                      key={t.id}
                      todo={t}
                      onToggle={() => patchTodo(t.id, { completed: !t.completed })}
                      onCyclePriority={() => cyclePriority(t)}
                      onEditTitle={(title) => patchTodo(t.id, { title })}
                      onDelete={() => deleteTodo(t.id)}
                      pickerOpen={pickerForId === t.id}
                      entries={entries}
                      entriesLoading={entriesLoading}
                      onOpenPicker={() => openPicker(t.id)}
                      onClosePicker={() => setPickerForId(null)}
                      onLink={(entryId) => linkEntry(t.id, entryId)}
                      projects={projects}
                      projectPickerOpen={projectPickerForId === t.id}
                      onOpenProjectPicker={() => setProjectPickerForId(t.id)}
                      onCloseProjectPicker={() => setProjectPickerForId(null)}
                      onAssignProject={(pid) => patchTodo(t.id, { projectId: pid } as Partial<Todo>)}
                    />
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </section>
    </main>
  );
}

// ── Row ──────────────────────────────────────────────────────────────────────

function TodoRow({
  todo,
  onToggle,
  onCyclePriority,
  onEditTitle,
  onDelete,
  pickerOpen,
  entries,
  entriesLoading,
  onOpenPicker,
  onClosePicker,
  onLink,
  projects,
  projectPickerOpen,
  onOpenProjectPicker,
  onCloseProjectPicker,
  onAssignProject,
}: {
  todo: Todo;
  onToggle: () => void;
  onCyclePriority: () => void;
  onEditTitle: (title: string) => void;
  onDelete: () => void;
  pickerOpen: boolean;
  entries: EntryLite[] | null;
  entriesLoading: boolean;
  onOpenPicker: () => void;
  onClosePicker: () => void;
  onLink: (entryId: string | null) => void;
  projects: Project[];
  projectPickerOpen: boolean;
  onOpenProjectPicker: () => void;
  onCloseProjectPicker: () => void;
  onAssignProject: (projectId: string | null) => void;
}) {
  const [hover, setHover] = useState(false);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(todo.title);

  const pri = todo.priority ? PRIORITY_META[todo.priority] : null;
  const dueInfo = todo.dueDate ? formatDue(todo.dueDate) : null;

  const commitEdit = () => {
    const v = draft.trim();
    if (v && v !== todo.title) onEditTitle(v);
    else setDraft(todo.title);
    setEditing(false);
  };

  return (
    <div
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        position: "relative",
        display: "flex",
        alignItems: "flex-start",
        gap: 12,
        border: `1px solid ${C.border}`,
        borderRadius: 12,
        background: hover ? C.cardHover : C.card,
        padding: "13px 14px",
        transition: "background 0.12s ease",
      }}
    >
      {/* Checkbox */}
      <button
        onClick={onToggle}
        aria-label={todo.completed ? "Mark incomplete" : "Mark complete"}
        style={{
          flexShrink: 0,
          marginTop: 1,
          width: 20,
          height: 20,
          borderRadius: 999,
          border: `1.5px solid ${todo.completed ? C.accent : "#3a3e46"}`,
          background: todo.completed ? C.accent : "transparent",
          color: "#1a1710",
          display: "grid",
          placeItems: "center",
          cursor: "pointer",
          fontSize: 12,
          lineHeight: 1,
        }}
      >
        {todo.completed ? "✓" : ""}
      </button>

      {/* Body */}
      <div style={{ flex: 1, minWidth: 0 }}>
        {editing ? (
          <input
            autoFocus
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={commitEdit}
            onKeyDown={(e) => {
              if (e.key === "Enter") commitEdit();
              if (e.key === "Escape") {
                setDraft(todo.title);
                setEditing(false);
              }
            }}
            style={{
              width: "100%",
              background: "transparent",
              border: "none",
              borderBottom: `1px solid ${C.accent}`,
              outline: "none",
              color: C.text,
              fontSize: 15,
              padding: "1px 0",
            }}
          />
        ) : (
          <div
            onClick={() => !todo.completed && setEditing(true)}
            style={{
              fontSize: 15,
              lineHeight: 1.4,
              color: todo.completed ? C.textFaint : C.text,
              textDecoration: todo.completed ? "line-through" : "none",
              cursor: todo.completed ? "default" : "text",
              wordBreak: "break-word",
            }}
          >
            {todo.title}
          </div>
        )}

        {todo.note && (
          <div style={{ fontSize: 13, color: C.textDim, marginTop: 3, lineHeight: 1.4 }}>
            {todo.note}
          </div>
        )}

        {/* Meta row */}
        {(pri || dueInfo || todo.project) && (
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 7, flexWrap: "wrap" }}>
            {dueInfo && (
              <span
                style={{
                  fontSize: 12,
                  fontFamily: MONO,
                  color: dueInfo.overdue && !todo.completed ? "#e0736a" : C.textDim,
                }}
              >
                {dueInfo.label}
              </span>
            )}
            {todo.project && (
              <button
                onClick={() => (projectPickerOpen ? onCloseProjectPicker() : onOpenProjectPicker())}
                style={{
                  border: `1px solid ${C.border}`,
                  background: "transparent",
                  color: C.textDim,
                  borderRadius: 999,
                  padding: "2px 9px",
                  fontSize: 11.5,
                  cursor: "pointer",
                }}
                title="Change project"
              >
                <span style={{ color: C.accent, marginRight: 4 }}>◆</span>
                {todo.project.name}
              </button>
            )}
          </div>
        )}

        {/* Linked journal entry */}
        {todo.entry && (
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 8 }}>
            <Link
              href={`/entries/${todo.entry.id}`}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                maxWidth: "100%",
                border: `1px solid ${C.border}`,
                borderRadius: 999,
                padding: "3px 10px",
                fontSize: 12,
                color: C.textDim,
                textDecoration: "none",
                background: C.bg,
              }}
            >
              <span style={{ color: C.accent }}>↳</span>
              <span
                style={{
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {todo.entry.title?.trim() || "journal entry"}
              </span>
            </Link>
            <button
              onClick={() => onLink(null)}
              title="Unlink entry"
              aria-label="Unlink entry"
              style={{
                border: "none",
                background: "transparent",
                color: C.textFaint,
                cursor: "pointer",
                fontSize: 13,
                lineHeight: 1,
                padding: 2,
              }}
            >
              ×
            </button>
          </div>
        )}
      </div>

      {/* Priority dot — click to cycle */}
      <button
        onClick={onCyclePriority}
        title={pri ? `${pri.label} priority (click to change)` : "Set priority"}
        style={{
          flexShrink: 0,
          marginTop: 4,
          width: 14,
          height: 14,
          borderRadius: 999,
          border: pri ? "none" : `1.5px solid ${C.border}`,
          background: pri ? pri.color : "transparent",
          cursor: "pointer",
          opacity: pri || hover ? 1 : 0.45,
          transition: "opacity 0.12s ease",
        }}
      />

      {/* Project assignment */}
      <button
        onClick={() => (projectPickerOpen ? onCloseProjectPicker() : onOpenProjectPicker())}
        title={todo.project ? `Project: ${todo.project.name}` : "Assign to project"}
        aria-label="Assign project"
        style={{
          flexShrink: 0,
          marginTop: 3,
          width: 18,
          height: 18,
          borderRadius: 999,
          border: "none",
          background: "transparent",
          color: todo.project || projectPickerOpen ? C.accent : C.textFaint,
          cursor: "pointer",
          fontSize: 11,
          lineHeight: 1,
          opacity: todo.project || hover || projectPickerOpen ? 1 : 0,
          transition: "opacity 0.12s ease",
        }}
      >
        ◆
      </button>

      {/* Link to entry */}
      <button
        onClick={() => (pickerOpen ? onClosePicker() : onOpenPicker())}
        title={todo.entry ? "Change linked entry" : "Link a journal entry"}
        aria-label="Link a journal entry"
        style={{
          flexShrink: 0,
          marginTop: 1,
          width: 22,
          height: 22,
          borderRadius: 6,
          border: "none",
          background: "transparent",
          color: todo.entry || pickerOpen ? C.accent : C.textFaint,
          cursor: "pointer",
          fontSize: 13,
          lineHeight: 1,
          opacity: todo.entry || hover || pickerOpen ? 1 : 0,
          transition: "opacity 0.12s ease",
        }}
      >
        🔗
      </button>

      {/* Delete */}
      <button
        onClick={onDelete}
        aria-label="Delete"
        style={{
          flexShrink: 0,
          marginTop: 1,
          width: 22,
          height: 22,
          borderRadius: 6,
          border: "none",
          background: "transparent",
          color: C.textFaint,
          cursor: "pointer",
          fontSize: 15,
          lineHeight: 1,
          opacity: hover ? 1 : 0,
          transition: "opacity 0.12s ease",
        }}
      >
        ×
      </button>

      {pickerOpen && (
        <EntryPicker
          entries={entries}
          loading={entriesLoading}
          currentEntryId={todo.entryId}
          onPick={onLink}
          onClose={onClosePicker}
        />
      )}

      {projectPickerOpen && (
        <ProjectPicker
          projects={projects}
          currentProjectId={todo.projectId}
          onPick={(pid) => {
            onAssignProject(pid);
            onCloseProjectPicker();
          }}
          onClose={onCloseProjectPicker}
        />
      )}
    </div>
  );
}

// ── Entry picker dropdown ────────────────────────────────────────────────────

function EntryPicker({
  entries,
  loading,
  currentEntryId,
  onPick,
  onClose,
}: {
  entries: EntryLite[] | null;
  loading: boolean;
  currentEntryId: string | null;
  onPick: (entryId: string | null) => void;
  onClose: () => void;
}) {
  const [q, setQ] = useState("");

  const filtered = (entries ?? []).filter((e) => {
    if (!q.trim()) return true;
    const hay = `${e.title ?? ""} ${e.snippet}`.toLowerCase();
    return hay.includes(q.toLowerCase());
  });

  return (
    <>
      {/* click-away backdrop */}
      <div
        onClick={onClose}
        style={{ position: "fixed", inset: 0, zIndex: 40 }}
      />
      <div
        style={{
          position: "absolute",
          top: "calc(100% + 6px)",
          right: 0,
          width: 320,
          maxWidth: "calc(100vw - 48px)",
          zIndex: 50,
          background: C.card,
          border: `1px solid ${C.border}`,
          borderRadius: 12,
          boxShadow: "0 12px 32px rgba(0,0,0,0.45)",
          overflow: "hidden",
        }}
      >
        <div style={{ padding: 10, borderBottom: `1px solid ${C.borderSoft}` }}>
          <input
            autoFocus
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search journal entries…"
            style={{
              width: "100%",
              background: C.bg,
              border: `1px solid ${C.border}`,
              borderRadius: 8,
              outline: "none",
              color: C.text,
              fontSize: 13,
              padding: "7px 10px",
            }}
          />
        </div>

        <div style={{ maxHeight: 260, overflowY: "auto" }}>
          {currentEntryId && (
            <button
              onClick={() => onPick(null)}
              style={{
                width: "100%",
                textAlign: "left",
                background: "transparent",
                border: "none",
                borderBottom: `1px solid ${C.borderSoft}`,
                color: "#e0736a",
                cursor: "pointer",
                fontSize: 12.5,
                padding: "10px 12px",
              }}
            >
              Unlink current entry
            </button>
          )}

          {loading ? (
            <p style={{ color: C.textFaint, fontSize: 12.5, padding: "14px 12px", margin: 0 }}>
              loading entries…
            </p>
          ) : filtered.length === 0 ? (
            <p style={{ color: C.textFaint, fontSize: 12.5, padding: "14px 12px", margin: 0 }}>
              {entries && entries.length === 0 ? "No journal entries yet." : "No matches."}
            </p>
          ) : (
            filtered.map((e) => {
              const isCurrent = e.id === currentEntryId;
              return (
                <button
                  key={e.id}
                  onClick={() => onPick(e.id)}
                  style={{
                    display: "block",
                    width: "100%",
                    textAlign: "left",
                    background: isCurrent ? C.cardHover : "transparent",
                    border: "none",
                    borderBottom: `1px solid ${C.borderSoft}`,
                    cursor: "pointer",
                    padding: "10px 12px",
                  }}
                  onMouseEnter={(ev) => (ev.currentTarget.style.background = C.cardHover)}
                  onMouseLeave={(ev) =>
                    (ev.currentTarget.style.background = isCurrent ? C.cardHover : "transparent")
                  }
                >
                  <div
                    style={{
                      fontSize: 13,
                      color: C.text,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {e.title?.trim() || e.snippet || "Untitled entry"}
                  </div>
                  <div style={{ fontFamily: MONO, fontSize: 10.5, color: C.textFaint, marginTop: 2 }}>
                    {new Date(e.createdAt).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>
    </>
  );
}

// ── Project picker dropdown ──────────────────────────────────────────────────

function ProjectPicker({
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
          top: "calc(100% + 6px)",
          right: 0,
          width: 240,
          maxWidth: "calc(100vw - 48px)",
          zIndex: 50,
          background: C.card,
          border: `1px solid ${C.border}`,
          borderRadius: 12,
          boxShadow: "0 12px 32px rgba(0,0,0,0.45)",
          overflow: "hidden",
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
        {projects.length === 0 ? (
          <p style={{ color: C.textFaint, fontSize: 12.5, padding: "14px 12px", margin: 0 }}>
            No projects yet — create one in the chip row above.
          </p>
        ) : (
          projects.map((p) => (
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
          ))
        )}
      </div>
    </>
  );
}
