"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import Link from "next/link";
import { useDragReorder } from "@/app/chris/_lib/dragReorder";
import { Spinner } from "@/app/chris/_lib/Spinner";
import { FullscreenButton } from "@/app/chris/_lib/FullscreenButton";
import { FixedDropdown } from "@/app/chris/_lib/FixedDropdown";
import { ProjectSelect } from "@/app/chris/_lib/ProjectSelect";
import { ALL, UNASSIGNED as UNASSIGNED_FILTER, type FilterValue } from "@/app/chris/_lib/ProjectFilterBar";

// ── Types ───────────────────────────────────────────────────────────────────

type Priority = "LOW" | "MEDIUM" | "HIGH";

type Todo = {
  id: string;
  title: string;
  note: string | null;
  priority: Priority | null;
  dueDate: string | null;
  phone: string | null;
  url: string | null;
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

  // "+ new entry" modal: stub a new journal entry and link it to a todo
  const [newEntryFor, setNewEntryFor] = useState<
    { todoId: string; defaultText: string } | null
  >(null);

  const [projects, setProjects] = useState<Project[]>([]);
  const [filterValue, setFilterValueState] = useState<FilterValue>(ALL);
  const [projectPickerForId, setProjectPickerForId] = useState<string | null>(null);
  const [detailForId, setDetailForId] = useState<string | null>(null);

  const setFilterValue = useCallback((v: FilterValue) => {
    setFilterValueState(v);
    if (typeof window !== "undefined") localStorage.setItem(LAST_PROJECT_KEY, v);
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
      if (saved === ALL || saved === UNASSIGNED_FILTER) setFilterValueState(saved as FilterValue);
      else if (saved && loaded.some((p) => p.id === saved)) {
        setFilterValueState(saved);
      }
    })();
  }, []);

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

  const activeProjectId = filterValue === ALL || filterValue === UNASSIGNED_FILTER ? null : filterValue;

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

  const handleFilterChange = async (v: FilterValue) => {
    setFilterValue(v);
    const pid = v === ALL || v === UNASSIGNED_FILTER ? null : v;
    if (title.trim()) {
      await addTodo(pid);
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

  const filtered = filterValue === ALL
    ? todos
    : filterValue === UNASSIGNED_FILTER
      ? todos.filter((t) => !t.projectId)
      : todos.filter((t) => t.projectId === filterValue);
  const active = filtered.filter((t) => !t.completed);
  const done = filtered.filter((t) => t.completed);

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
        <div style={{ display: "inline-flex", alignItems: "center", gap: 12 }}>
          <span style={{ fontFamily: MONO, fontSize: 12, color: C.textFaint }}>
            {active.length} open
          </span>
          <FullscreenButton />
        </div>
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

        {/* Project filter */}
        <ProjectSelect
          projects={projects}
          value={filterValue}
          onChange={handleFilterChange}
        />

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
          <Spinner label="loading…" />
        ) : active.length === 0 && done.length === 0 ? (
          <div style={{ textAlign: "center", padding: "56px 0", color: C.textFaint }}>
            <div style={{ fontSize: 28, marginBottom: 12 }}>◜◝</div>
            <p style={{ margin: 0, fontSize: 14 }}>Nothing here yet. Add your first to-do above.</p>
          </div>
        ) : (
          <>
            <TodoGroupView
              items={active}
              applyGroupReorder={(orderedIds) => {
                setTodos((prev) => {
                  const inGroup = new Set(orderedIds);
                  const reordered = orderedIds
                    .map((id) => prev.find((x) => x.id === id)!)
                    .filter(Boolean);
                  const others = prev.filter((x) => !inGroup.has(x.id));
                  return [...reordered, ...others];
                });
                void fetch("/chris/api/todos/reorder", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ ids: orderedIds }),
                });
              }}
              renderRow={(t, dragProps, dragStyle) => (
                <TodoRow
                  key={t.id}
                  todo={t}
                  dragProps={dragProps}
                  dragStyle={dragStyle}
                  onToggle={() => patchTodo(t.id, { completed: !t.completed })}
                  onCyclePriority={() => cyclePriority(t)}
                  onOpenDetail={() => setDetailForId(t.id)}
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
                  onAddNewEntry={async () => {
                    const projectName = t.project?.name ?? "(no project)";
                    const text = `Stub - placeholder for journal entry related to: ${projectName}: ${t.title}`;
                    setNewEntryFor({ todoId: t.id, defaultText: text });
                  }}
                />
              )}
            />

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
                      onOpenDetail={() => setDetailForId(t.id)}
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
                      onAddNewEntry={async () => {
                        const projectName = t.project?.name ?? "(no project)";
                        const text = `Stub - placeholder for journal entry related to: ${projectName}: ${t.title}`;
                        setNewEntryFor({ todoId: t.id, defaultText: text });
                      }}
                    />
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </section>

      {newEntryFor && (
        <NewEntryModal
          defaultText={newEntryFor.defaultText}
          onCancel={() => setNewEntryFor(null)}
          onSave={async (text) => {
            // Create new journal entry
            const content = JSON.stringify({
              type: "doc",
              content: [
                {
                  type: "paragraph",
                  content: text ? [{ type: "text", text }] : [],
                },
              ],
            });
            const res = await fetch("/api/entries", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ content }),
            });
            if (res.ok) {
              const entry = await res.json();
              // Link the todo to the new entry
              await patchTodo(newEntryFor.todoId, {
                entryId: entry.id,
              } as Partial<Todo>);
              // Refresh the entries cache so the picker can show it next time
              setEntries(null);
            }
            setNewEntryFor(null);
          }}
        />
      )}

      {detailForId && (() => {
        const t = todos.find((x) => x.id === detailForId);
        if (!t) return null;
        return (
          <TodoDetailModal
            todo={t}
            projects={projects}
            onClose={() => setDetailForId(null)}
            onSave={(body) => patchTodo(t.id, body as Partial<Todo>)}
            onDelete={() => {
              deleteTodo(t.id);
              setDetailForId(null);
            }}
          />
        );
      })()}
    </main>
  );
}

// ── Row ──────────────────────────────────────────────────────────────────────

function TodoRow({
  todo,
  dragProps,
  dragStyle,
  onToggle,
  onCyclePriority,
  onOpenDetail,
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
  onAddNewEntry,
}: {
  todo: Todo;
  dragProps?: React.HTMLAttributes<HTMLDivElement> & { draggable?: boolean };
  dragStyle?: React.CSSProperties;
  onToggle: () => void;
  onCyclePriority: () => void;
  onOpenDetail: () => void;
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
  onAddNewEntry: () => void;
}) {
  const [hover, setHover] = useState(false);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(todo.title);
  const linkBtnRef = useRef<HTMLButtonElement>(null);
  const projectBtnRef = useRef<HTMLButtonElement>(null);

  const pri = todo.priority ? PRIORITY_META[todo.priority] : null;
  const dueInfo = todo.dueDate ? formatDue(todo.dueDate) : null;

  const commitEdit = () => {
    const v = draft.trim();
    if (v && v !== todo.title) onEditTitle(v);
    else setDraft(todo.title);
    setEditing(false);
  };

  // Clicking the card background opens the modal — but not when the click lands
  // on an interactive child (buttons, links, inputs) or the title (inline edit).
  const handleCardClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (editing) return;
    const el = e.target as HTMLElement;
    if (el.closest("button, a, input, textarea, [data-todo-title]")) return;
    onOpenDetail();
  };

  return (
    <div
      {...(dragProps ?? {})}
      onClick={handleCardClick}
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
        cursor: "pointer",
        ...(dragStyle ?? {}),
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
            data-todo-title
            onClick={(e) => {
              e.stopPropagation();
              if (!todo.completed) setEditing(true);
            }}
            title={todo.completed ? undefined : "Click to rename"}
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
                ref={projectBtnRef}
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
        ref={linkBtnRef}
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
          anchorRef={linkBtnRef}
          entries={entries}
          loading={entriesLoading}
          currentEntryId={todo.entryId}
          onPick={onLink}
          onClose={onClosePicker}
          onAddNewEntry={() => {
            onClosePicker();
            onAddNewEntry();
          }}
        />
      )}

      {projectPickerOpen && (
        <ProjectPicker
          anchorRef={projectBtnRef}
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
  anchorRef,
  entries,
  loading,
  currentEntryId,
  onPick,
  onClose,
  onAddNewEntry,
}: {
  anchorRef: React.RefObject<HTMLElement | null>;
  entries: EntryLite[] | null;
  loading: boolean;
  currentEntryId: string | null;
  onPick: (entryId: string | null) => void;
  onClose: () => void;
  onAddNewEntry: () => void;
}) {
  const [q, setQ] = useState("");

  const filtered = (entries ?? []).filter((e) => {
    if (!q.trim()) return true;
    const hay = `${e.title ?? ""} ${e.snippet}`.toLowerCase();
    return hay.includes(q.toLowerCase());
  });

  return (
    <FixedDropdown anchorRef={anchorRef} onClose={onClose} width={320} maxHeight={380}>
      <div>
        <button
          onClick={onAddNewEntry}
          style={{
            display: "block",
            width: "100%",
            textAlign: "left",
            background: "transparent",
            border: "none",
            borderBottom: `1px solid ${C.borderSoft}`,
            color: C.accent,
            cursor: "pointer",
            fontSize: 12.5,
            padding: "10px 12px",
            fontWeight: 600,
          }}
        >
          + new journal entry
        </button>
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
    </FixedDropdown>
  );
}

// ── Project picker dropdown ──────────────────────────────────────────────────

function ProjectPicker({
  anchorRef,
  projects,
  currentProjectId,
  onPick,
  onClose,
}: {
  anchorRef: React.RefObject<HTMLElement | null>;
  projects: Project[];
  currentProjectId: string | null;
  onPick: (projectId: string | null) => void;
  onClose: () => void;
}) {
  return (
    <FixedDropdown anchorRef={anchorRef} onClose={onClose} width={240} maxHeight={300}>
      <div>
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
    </FixedDropdown>
  );
}

// ── Drag-and-drop group ──────────────────────────────────────────────────────

function TodoGroupView({
  items,
  applyGroupReorder,
  renderRow,
}: {
  items: Todo[];
  applyGroupReorder: (orderedIds: string[]) => void;
  renderRow: (
    t: Todo,
    dragProps: React.HTMLAttributes<HTMLDivElement> & { draggable?: boolean },
    dragStyle: React.CSSProperties
  ) => React.ReactNode;
}) {
  const { rowProps, rowStyle } = useDragReorder(items, (next) =>
    applyGroupReorder(next.map((t) => t.id))
  );
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {items.map((t) => renderRow(t, rowProps(t.id), rowStyle(t.id)))}
    </div>
  );
}

// ── New-entry modal ──────────────────────────────────────────────────────────

function NewEntryModal({
  defaultText,
  onCancel,
  onSave,
}: {
  defaultText: string;
  onCancel: () => void;
  onSave: (text: string) => Promise<void> | void;
}) {
  const [text, setText] = useState(defaultText);
  const [saving, setSaving] = useState(false);

  return (
    <div
      onClick={onCancel}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 100,
        background: "rgba(0,0,0,0.55)",
        backdropFilter: "blur(3px)",
        WebkitBackdropFilter: "blur(3px)",
        display: "grid",
        placeItems: "center",
        padding: 24,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "100%",
          maxWidth: 560,
          background: C.card,
          border: `1px solid ${C.border}`,
          borderRadius: 14,
          padding: "22px 22px 14px",
          boxShadow: "0 24px 60px rgba(0,0,0,0.55)",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            marginBottom: 14,
          }}
        >
          <h2
            style={{
              margin: 0,
              fontSize: 15,
              fontWeight: 600,
              color: C.text,
            }}
          >
            New journal entry
          </h2>
          <span style={{ fontFamily: MONO, fontSize: 11, color: C.textFaint }}>
            (linked to this to-do)
          </span>
        </div>

        <textarea
          autoFocus
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={6}
          style={{
            width: "100%",
            background: C.bg,
            border: `1px solid ${C.border}`,
            borderRadius: 10,
            outline: "none",
            color: C.text,
            fontSize: 14,
            lineHeight: 1.6,
            padding: "12px 14px",
            resize: "vertical",
            fontFamily: "inherit",
          }}
        />

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            marginTop: 14,
          }}
        >
          <span
            style={{
              fontFamily: MONO,
              fontSize: 11,
              color: C.textFaint,
              flex: 1,
            }}
          >
            Accept the stub or write a full entry — either creates and links.
          </span>
          <button
            onClick={onCancel}
            disabled={saving}
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
            onClick={async () => {
              if (saving) return;
              setSaving(true);
              try {
                await onSave(text.trim() || defaultText);
              } finally {
                setSaving(false);
              }
            }}
            disabled={saving}
            style={{
              border: "none",
              borderRadius: 10,
              background: C.accent,
              color: "#1a1710",
              fontWeight: 600,
              fontSize: 13,
              padding: "8px 18px",
              cursor: saving ? "default" : "pointer",
              opacity: saving ? 0.6 : 1,
            }}
          >
            {saving ? "Saving…" : "Save & link"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Todo detail modal — all fields, with toggleable optional inputs ──────────

type FieldKey = "note" | "due" | "priority" | "phone" | "url" | "project";

const FIELD_DEFS: { key: FieldKey; icon: string; label: string }[] = [
  { key: "note", icon: "✎", label: "Note" },
  { key: "due", icon: "◷", label: "Due date" },
  { key: "priority", icon: "⚑", label: "Priority" },
  { key: "phone", icon: "☎", label: "Phone" },
  { key: "url", icon: "↗", label: "Link" },
  { key: "project", icon: "◆", label: "Project" },
];

function normalizeUrl(u: string): string {
  return /^https?:\/\//i.test(u) ? u : `https://${u}`;
}

function TodoDetailModal({
  todo,
  projects,
  onClose,
  onSave,
  onDelete,
}: {
  todo: Todo;
  projects: Project[];
  onClose: () => void;
  onSave: (body: {
    title: string;
    note: string | null;
    priority: Priority | null;
    dueDate: string | null;
    phone: string | null;
    url: string | null;
    projectId: string | null;
  }) => void | Promise<void>;
  onDelete: () => void;
}) {
  const [title, setTitle] = useState(todo.title);
  const [note, setNote] = useState(todo.note ?? "");
  const [priority, setPriority] = useState<Priority | null>(todo.priority);
  const [due, setDue] = useState(todo.dueDate ? todo.dueDate.slice(0, 10) : "");
  const [phone, setPhone] = useState(todo.phone ?? "");
  const [url, setUrl] = useState(todo.url ?? "");
  const [projectId, setProjectId] = useState<string | null>(todo.projectId);
  const [saving, setSaving] = useState(false);
  const [revealed, setRevealed] = useState<Set<FieldKey>>(new Set());

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const hasValue: Record<FieldKey, boolean> = {
    note: note.trim() !== "",
    due: due !== "",
    priority: priority !== null,
    phone: phone.trim() !== "",
    url: url.trim() !== "",
    project: projectId !== null,
  };
  const isShown = (k: FieldKey) => hasValue[k] || revealed.has(k);
  const toggle = (k: FieldKey) =>
    setRevealed((prev) => {
      const n = new Set(prev);
      if (n.has(k)) n.delete(k);
      else n.add(k);
      return n;
    });

  const save = async () => {
    setSaving(true);
    try {
      await onSave({
        title: title.trim() || todo.title,
        note: note.trim() || null,
        priority,
        dueDate: due || null,
        phone: phone.trim() || null,
        url: url.trim() || null,
        projectId,
      });
      onClose();
    } finally {
      setSaving(false);
    }
  };

  const inputStyle: React.CSSProperties = {
    width: "100%",
    background: C.bg,
    border: `1px solid ${C.border}`,
    borderRadius: 10,
    outline: "none",
    color: C.text,
    fontSize: 14,
    padding: "10px 12px",
  };
  const labelStyle: React.CSSProperties = {
    fontFamily: MONO,
    fontSize: 10.5,
    letterSpacing: "0.06em",
    textTransform: "uppercase",
    color: C.textFaint,
    margin: "0 0 6px 2px",
  };
  const fieldWrap: React.CSSProperties = { marginTop: 14 };

  const openLink = (
    <a
      href={url.trim() ? normalizeUrl(url) : "#"}
      target="_blank"
      rel="noopener noreferrer"
      onClick={(e) => !url.trim() && e.preventDefault()}
      style={{
        fontFamily: MONO,
        fontSize: 11.5,
        color: url.trim() ? C.accent : C.textFaint,
        textDecoration: "none",
        whiteSpace: "nowrap",
      }}
    >
      open ↗
    </a>
  );
  const callLink = (
    <a
      href={phone.trim() ? `tel:${phone.replace(/\s+/g, "")}` : "#"}
      onClick={(e) => !phone.trim() && e.preventDefault()}
      style={{
        fontFamily: MONO,
        fontSize: 11.5,
        color: phone.trim() ? C.accent : C.textFaint,
        textDecoration: "none",
        whiteSpace: "nowrap",
      }}
    >
      call ↗
    </a>
  );

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 100,
        background: "rgba(0,0,0,0.55)",
        backdropFilter: "blur(3px)",
        WebkitBackdropFilter: "blur(3px)",
        display: "grid",
        placeItems: "center",
        padding: 24,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "100%",
          maxWidth: 540,
          maxHeight: "86vh",
          overflowY: "auto",
          background: C.card,
          border: `1px solid ${C.border}`,
          borderRadius: 14,
          padding: "20px 22px 16px",
          boxShadow: "0 24px 60px rgba(0,0,0,0.55)",
        }}
      >
        {/* Title */}
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="To-do title"
          style={{
            width: "100%",
            background: "transparent",
            border: "none",
            outline: "none",
            color: C.text,
            fontSize: 18,
            fontWeight: 600,
            padding: "2px 0 10px",
            borderBottom: `1px solid ${C.borderSoft}`,
          }}
        />

        {/* Field toggle row */}
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 14 }}>
          {FIELD_DEFS.map((f) => {
            const on = isShown(f.key);
            return (
              <button
                key={f.key}
                onClick={() => toggle(f.key)}
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
                  opacity: hasValue[f.key] ? 0.9 : 1,
                }}
              >
                <span aria-hidden style={{ fontSize: 12 }}>{f.icon}</span>
                {f.label}
              </button>
            );
          })}
        </div>

        {/* Fields */}
        {isShown("note") && (
          <div style={fieldWrap}>
            <p style={labelStyle}>Note</p>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={3}
              autoFocus={revealed.has("note")}
              style={{ ...inputStyle, resize: "vertical", lineHeight: 1.5, fontFamily: "inherit" }}
            />
          </div>
        )}

        {isShown("due") && (
          <div style={fieldWrap}>
            <p style={labelStyle}>Due date</p>
            <input
              type="date"
              value={due}
              onChange={(e) => setDue(e.target.value)}
              style={{ ...inputStyle, colorScheme: "dark", width: "auto" }}
            />
          </div>
        )}

        {isShown("priority") && (
          <div style={fieldWrap}>
            <p style={labelStyle}>Priority</p>
            <div style={{ display: "flex", gap: 6 }}>
              {(["LOW", "MEDIUM", "HIGH"] as Priority[]).map((p) => {
                const sel = priority === p;
                const meta = PRIORITY_META[p];
                return (
                  <button
                    key={p}
                    onClick={() => setPriority(sel ? null : p)}
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 6,
                      border: `1px solid ${sel ? meta.color : C.border}`,
                      background: sel ? `${meta.color}22` : "transparent",
                      color: sel ? C.text : C.textDim,
                      borderRadius: 999,
                      padding: "6px 12px",
                      fontSize: 12.5,
                      cursor: "pointer",
                    }}
                  >
                    <span style={{ width: 7, height: 7, borderRadius: 999, background: meta.color }} />
                    {meta.label}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {isShown("phone") && (
          <div style={fieldWrap}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
              <p style={labelStyle}>Phone</p>
              {phone.trim() && callLink}
            </div>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+1 555 123 4567"
              autoFocus={revealed.has("phone")}
              style={inputStyle}
            />
          </div>
        )}

        {isShown("url") && (
          <div style={fieldWrap}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
              <p style={labelStyle}>Link</p>
              {url.trim() && openLink}
            </div>
            <input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="example.com/page"
              autoFocus={revealed.has("url")}
              style={inputStyle}
            />
          </div>
        )}

        {isShown("project") && (
          <div style={fieldWrap}>
            <p style={labelStyle}>Project</p>
            <select
              value={projectId ?? ""}
              onChange={(e) => setProjectId(e.target.value || null)}
              style={{ ...inputStyle, cursor: "pointer", colorScheme: "dark" }}
            >
              <option value="">Unassigned</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>
        )}

        {/* Footer */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 22 }}>
          <button
            onClick={onDelete}
            style={{
              border: "none",
              background: "transparent",
              color: "#e0736a",
              cursor: "pointer",
              fontFamily: MONO,
              fontSize: 12,
              padding: "6px 8px",
            }}
          >
            delete
          </button>
          <div style={{ flex: 1 }} />
          <button
            onClick={onClose}
            style={{
              border: "none",
              background: "transparent",
              color: C.textDim,
              cursor: "pointer",
              fontFamily: MONO,
              fontSize: 12,
              padding: "6px 10px",
            }}
          >
            cancel
          </button>
          <button
            onClick={save}
            disabled={saving}
            style={{
              border: "none",
              borderRadius: 10,
              background: C.accent,
              color: "#1a1710",
              fontWeight: 600,
              fontSize: 13,
              padding: "8px 18px",
              cursor: saving ? "default" : "pointer",
              opacity: saving ? 0.6 : 1,
            }}
          >
            {saving ? "Saving…" : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}
