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

  const addTodo = async () => {
    const t = title.trim();
    if (!t) return;
    const res = await fetch("/chris/api/todos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: t, note, priority, dueDate: due || null }),
    });
    if (res.ok) {
      const { todo } = await res.json();
      setTodos((prev) => [todo, ...prev]);
      resetAdd();
      inputRef.current?.focus();
    }
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
            onClick={addTodo}
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
}: {
  todo: Todo;
  onToggle: () => void;
  onCyclePriority: () => void;
  onEditTitle: (title: string) => void;
  onDelete: () => void;
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
        {(pri || dueInfo) && (
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 7 }}>
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
    </div>
  );
}
