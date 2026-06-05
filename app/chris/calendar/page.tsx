"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Spinner } from "@/app/chris/_lib/Spinner";
import { FullscreenButton } from "@/app/chris/_lib/FullscreenButton";
import { ThemeControls } from "@/app/chris/_lib/ThemeControls";
import { FixedDropdown } from "@/app/chris/_lib/FixedDropdown";
import {
  C,
  MONO,
  PRIORITY_META,
  TodoDetailModal,
  type Todo,
  type Project,
} from "@/app/chris/_lib/todoShared";

// ── Date helpers (local-time, ISO yyyy-mm-dd keys) ────────────────────────────

function ymd(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

// Build the 6×7 grid of dates for the month containing `anchor`. The grid
// starts on the Sunday on/before the 1st and always spans whole weeks.
function buildMonthGrid(year: number, month: number): Date[] {
  const first = new Date(year, month, 1);
  const start = new Date(first);
  start.setDate(first.getDate() - first.getDay()); // back up to Sunday
  const cells: Date[] = [];
  const cursor = new Date(start);
  // 6 rows guarantees every month fits and the grid height stays stable.
  for (let i = 0; i < 42; i++) {
    cells.push(new Date(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }
  return cells;
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default function CalendarPage() {
  const today = useMemo(() => new Date(), []);
  const todayKey = ymd(today);

  const [view, setView] = useState({ year: today.getFullYear(), month: today.getMonth() });
  const [todos, setTodos] = useState<Todo[]>([]);
  const [loading, setLoading] = useState(true);
  const [projects, setProjects] = useState<Project[]>([]);

  // Anchored quick-add: which day, and the cell element it anchors to.
  const [addFor, setAddFor] = useState<string | null>(null);
  const addAnchorRef = useRef<HTMLElement | null>(null);

  // Detail modal
  const [detailForId, setDetailForId] = useState<string | null>(null);

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

  useEffect(() => {
    (async () => {
      const res = await fetch("/chris/api/projects");
      if (!res.ok) return;
      const data = await res.json();
      setProjects(
        (data.projects ?? []).map((p: { id: string; name: string }) => ({ id: p.id, name: p.name }))
      );
    })();
  }, []);

  // Group todos by their due-date day key. Todos without a due date never
  // appear on the calendar.
  const byDay = useMemo(() => {
    const map = new Map<string, Todo[]>();
    for (const t of todos) {
      if (!t.dueDate) continue;
      const key = t.dueDate.slice(0, 10);
      const arr = map.get(key) ?? [];
      arr.push(t);
      map.set(key, arr);
    }
    return map;
  }, [todos]);

  const cells = useMemo(() => buildMonthGrid(view.year, view.month), [view]);

  const goPrev = () =>
    setView((v) => {
      const d = new Date(v.year, v.month - 1, 1);
      return { year: d.getFullYear(), month: d.getMonth() };
    });
  const goNext = () =>
    setView((v) => {
      const d = new Date(v.year, v.month + 1, 1);
      return { year: d.getFullYear(), month: d.getMonth() };
    });
  const goToday = () => setView({ year: today.getFullYear(), month: today.getMonth() });

  const openAdd = (dayKey: string, el: HTMLElement) => {
    addAnchorRef.current = el;
    setAddFor(dayKey);
  };

  const addTodo = async (dayKey: string, title: string, projectId: string | null) => {
    const t = title.trim();
    if (!t) return;
    const res = await fetch("/chris/api/todos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: t, projectId, dueDate: dayKey }),
    });
    if (res.ok) {
      const { todo } = await res.json();
      setTodos((prev) => [todo, ...prev]);
    }
  };

  const patchTodo = async (id: string, body: Partial<Todo>) => {
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

  const monthLabel = `${MONTH_NAMES[view.month]} ${view.year}`;

  return (
    <main style={{ maxWidth: 960, margin: "0 auto", padding: "0 24px 96px" }}>
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
          <span style={{ color: C.text }}>calendar</span>
        </Link>
        <div style={{ display: "inline-flex", alignItems: "center", gap: 12 }}>
          <ThemeControls />
          <FullscreenButton />
        </div>
      </header>

      {/* Month controls */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          marginTop: 28,
          marginBottom: 14,
        }}
      >
        <h1 style={{ margin: 0, fontSize: 22, fontWeight: 600, color: C.text, letterSpacing: "-0.01em" }}>
          {monthLabel}
        </h1>
        <div style={{ flex: 1 }} />
        <button onClick={goToday} style={pillBtn}>
          Today
        </button>
        <div style={{ display: "inline-flex", gap: 6 }}>
          <button onClick={goPrev} style={navBtn} aria-label="Previous month">
            ‹
          </button>
          <button onClick={goNext} style={navBtn} aria-label="Next month">
            ›
          </button>
        </div>
      </div>

      {loading ? (
        <Spinner label="loading…" />
      ) : (
        <>
          {/* Weekday header */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(7, 1fr)",
              gap: 8,
              marginBottom: 8,
            }}
          >
            {WEEKDAYS.map((w) => (
              <div
                key={w}
                style={{
                  fontFamily: MONO,
                  fontSize: 10.5,
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                  color: C.textFaint,
                  textAlign: "center",
                }}
              >
                {w}
              </div>
            ))}
          </div>

          {/* Day grid */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(7, 1fr)",
              gap: 8,
            }}
          >
            {cells.map((d) => {
              const key = ymd(d);
              const inMonth = d.getMonth() === view.month;
              const isToday = key === todayKey;
              const isPast = key < todayKey;
              const dayTodos = byDay.get(key) ?? [];
              return (
                <DayCell
                  key={key}
                  dayKey={key}
                  dayNum={d.getDate()}
                  inMonth={inMonth}
                  isToday={isToday}
                  isPast={isPast}
                  todos={dayTodos}
                  onAdd={openAdd}
                  onOpenTodo={(id) => setDetailForId(id)}
                  onToggle={(t) => patchTodo(t.id, { completed: !t.completed })}
                />
              );
            })}
          </div>
        </>
      )}

      {/* Anchored quick-add modal */}
      {addFor && (
        <QuickAddPopover
          anchorRef={addAnchorRef}
          dayKey={addFor}
          projects={projects}
          onClose={() => setAddFor(null)}
          onAdd={async (title, projectId) => {
            await addTodo(addFor, title, projectId);
          }}
        />
      )}

      {/* Detail modal — same pattern as the to-do feed */}
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

// ── Day cell ──────────────────────────────────────────────────────────────────

function DayCell({
  dayKey,
  dayNum,
  inMonth,
  isToday,
  isPast,
  todos,
  onAdd,
  onOpenTodo,
  onToggle,
}: {
  dayKey: string;
  dayNum: number;
  inMonth: boolean;
  isToday: boolean;
  isPast: boolean;
  todos: Todo[];
  onAdd: (dayKey: string, el: HTMLElement) => void;
  onOpenTodo: (id: string) => void;
  onToggle: (t: Todo) => void;
}) {
  const [hover, setHover] = useState(false);
  const cellRef = useRef<HTMLDivElement>(null);

  // Background: today gets a faint accent wash; past in-month days are dimmed.
  const background = isToday
    ? "color-mix(in srgb, var(--pg-accent) 10%, var(--pg-card))"
    : C.card;

  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const el = e.target as HTMLElement;
    if (el.closest("[data-todo-card]")) return; // clicks on cards handled there
    if (cellRef.current) onAdd(dayKey, cellRef.current);
  };

  return (
    <div
      ref={cellRef}
      onClick={handleClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        position: "relative",
        aspectRatio: "1 / 1",
        display: "flex",
        flexDirection: "column",
        border: `1px solid ${isToday ? "var(--pg-accent)" : C.border}`,
        borderRadius: 12,
        background,
        padding: 7,
        cursor: "pointer",
        overflow: "hidden",
        opacity: inMonth ? (isPast ? 0.62 : 1) : 0.3,
        transition: "background 0.12s ease, opacity 0.12s ease",
        boxShadow: hover && inMonth ? "inset 0 0 0 1px var(--pg-accent)" : "none",
      }}
    >
      {/* Day number */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 4,
          flexShrink: 0,
        }}
      >
        <span
          aria-hidden
          style={{
            fontFamily: MONO,
            fontSize: 12,
            fontWeight: isToday ? 700 : 500,
            width: 20,
            height: 20,
            display: "grid",
            placeItems: "center",
            borderRadius: 999,
            background: isToday ? "var(--pg-accent)" : "transparent",
            color: isToday ? "var(--pg-accent-text)" : isPast ? C.textFaint : C.textDim,
          }}
        >
          {dayNum}
        </span>
        {hover && inMonth && (
          <span
            aria-hidden
            style={{ fontFamily: MONO, fontSize: 14, color: C.textFaint, lineHeight: 1 }}
            title="Add a to-do"
          >
            +
          </span>
        )}
      </div>

      {/* Todo cards */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 4,
          overflowY: "auto",
          flex: 1,
          minHeight: 0,
        }}
      >
        {todos.map((t) => {
          const pri = t.priority ? PRIORITY_META[t.priority] : null;
          return (
            <div
              key={t.id}
              data-todo-card
              onClick={(e) => {
                e.stopPropagation();
                onOpenTodo(t.id);
              }}
              title={t.title}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 5,
                border: `1px solid ${C.borderSoft}`,
                borderRadius: 7,
                background: C.bg,
                padding: "3px 6px",
                cursor: "pointer",
                flexShrink: 0,
              }}
            >
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onToggle(t);
                }}
                aria-label={t.completed ? "Mark incomplete" : "Mark complete"}
                style={{
                  flexShrink: 0,
                  width: 12,
                  height: 12,
                  borderRadius: 999,
                  border: `1.5px solid ${t.completed ? "var(--pg-accent)" : C.border}`,
                  background: t.completed ? "var(--pg-accent)" : "transparent",
                  color: "var(--pg-accent-text)",
                  display: "grid",
                  placeItems: "center",
                  cursor: "pointer",
                  fontSize: 8,
                  lineHeight: 1,
                  padding: 0,
                }}
              >
                {t.completed ? "✓" : ""}
              </button>
              {pri && (
                <span
                  style={{ flexShrink: 0, width: 6, height: 6, borderRadius: 999, background: pri.color }}
                />
              )}
              <span
                style={{
                  flex: 1,
                  minWidth: 0,
                  fontSize: 11,
                  lineHeight: 1.25,
                  color: t.completed ? C.textFaint : C.text,
                  textDecoration: t.completed ? "line-through" : "none",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {t.title}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Anchored quick-add popover ───────────────────────────────────────────────
// Mirrors the to-do surface quick-add (title input + Add, optional project),
// but rendered as a small modal anchored above the clicked calendar square.

function QuickAddPopover({
  anchorRef,
  dayKey,
  projects,
  onClose,
  onAdd,
}: {
  anchorRef: React.RefObject<HTMLElement | null>;
  dayKey: string;
  projects: Project[];
  onClose: () => void;
  onAdd: (title: string, projectId: string | null) => Promise<void> | void;
}) {
  const [title, setTitle] = useState("");
  const [projectId, setProjectId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const label = new Date(dayKey + "T00:00:00").toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });

  const submit = async () => {
    if (!title.trim() || saving) return;
    setSaving(true);
    try {
      await onAdd(title, projectId);
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <FixedDropdown anchorRef={anchorRef} onClose={onClose} width={300} maxHeight={220} prefer="above">
      <div style={{ padding: 12 }}>
        <p
          style={{
            margin: "0 0 10px",
            fontFamily: MONO,
            fontSize: 10.5,
            letterSpacing: "0.06em",
            textTransform: "uppercase",
            color: C.textFaint,
          }}
        >
          Add to-do · {label}
        </p>
        <div
          style={{
            border: `1px solid ${C.border}`,
            borderRadius: 12,
            background: C.card,
            padding: "3px 3px 3px 12px",
            display: "flex",
            alignItems: "center",
            gap: 6,
          }}
        >
          <input
            autoFocus
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") submit();
              if (e.key === "Escape") onClose();
            }}
            placeholder="Add a to-do…"
            style={{
              flex: 1,
              minWidth: 0,
              background: "transparent",
              border: "none",
              outline: "none",
              color: C.text,
              fontSize: 14,
              padding: "8px 0",
            }}
          />
          <button
            onClick={submit}
            disabled={!title.trim() || saving}
            style={{
              border: "none",
              borderRadius: 9,
              background: title.trim() ? "var(--pg-accent)" : C.border,
              color: title.trim() ? "var(--pg-accent-text)" : C.textFaint,
              fontWeight: 600,
              fontSize: 13,
              padding: "8px 14px",
              cursor: title.trim() && !saving ? "pointer" : "default",
            }}
          >
            {saving ? "…" : "Add"}
          </button>
        </div>

        {/* Project selector */}
        {projects.length > 0 && (
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 10 }}>
            <span
              aria-hidden
              style={{ color: "var(--pg-accent)", fontSize: 12, flexShrink: 0 }}
            >
              ◆
            </span>
            <select
              value={projectId ?? ""}
              onChange={(e) => setProjectId(e.target.value || null)}
              style={{
                flex: 1,
                minWidth: 0,
                background: C.bg,
                border: `1px solid ${C.border}`,
                borderRadius: 9,
                color: projectId ? C.text : C.textDim,
                fontSize: 12.5,
                padding: "7px 28px 7px 10px",
                cursor: "pointer",
                outline: "none",
                appearance: "none",
                colorScheme: "dark",
                backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6'%3E%3Cpath d='M0 0l5 6 5-6z' fill='%236b7280'/%3E%3C/svg%3E")`,
                backgroundRepeat: "no-repeat",
                backgroundPosition: "right 10px center",
              }}
            >
              <option value="">No project</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>
        )}
      </div>
    </FixedDropdown>
  );
}

// ── Small shared button styles ───────────────────────────────────────────────

const pillBtn: React.CSSProperties = {
  border: `1px solid ${C.border}`,
  background: "transparent",
  color: C.textDim,
  borderRadius: 999,
  padding: "6px 14px",
  fontSize: 12.5,
  cursor: "pointer",
};

const navBtn: React.CSSProperties = {
  border: `1px solid ${C.border}`,
  background: "transparent",
  color: C.text,
  borderRadius: 9,
  width: 32,
  height: 32,
  fontSize: 18,
  lineHeight: 1,
  cursor: "pointer",
  display: "grid",
  placeItems: "center",
};
