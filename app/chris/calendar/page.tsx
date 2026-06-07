"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { SurfaceSwitcher } from "@/app/chris/_lib/SurfaceSwitcher";
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
const WEEKDAYS_LONG = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const WEEKEND_KEY = "chris.calendar.weekendMode";

// The current-or-upcoming weekend: Friday, Saturday, Sunday. During the weekend
// (Fri/Sat/Sun) it anchors to that weekend; on weekdays it looks ahead to the
// next Friday.
function upcomingWeekend(today: Date): Date[] {
  const day = today.getDay(); // Sun=0 … Sat=6
  let delta: number;
  if (day === 5) delta = 0; // Fri
  else if (day === 6) delta = -1; // Sat
  else if (day === 0) delta = -2; // Sun
  else delta = 5 - day; // Mon–Thu → this week's Friday
  const friday = new Date(today);
  friday.setDate(today.getDate() + delta);
  return [0, 1, 2].map((i) => {
    const d = new Date(friday);
    d.setDate(friday.getDate() + i);
    return d;
  });
}

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

  // Weekend Mode — kanban of the upcoming Fri/Sat/Sun. Persisted preference.
  const [weekendMode, setWeekendMode] = useState(false);
  const [dragId, setDragId] = useState<string | null>(null);
  const [overCol, setOverCol] = useState<string | null>(null);

  useEffect(() => {
    if (localStorage.getItem(WEEKEND_KEY) === "1") setWeekendMode(true);
  }, []);
  const toggleWeekend = (on: boolean) => {
    setWeekendMode(on);
    localStorage.setItem(WEEKEND_KEY, on ? "1" : "0");
  };

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

  const weekendDays = useMemo(() => upcomingWeekend(today), [today]);
  const weekendKeys = useMemo(() => weekendDays.map(ymd), [weekendDays]);

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

  // Weekend mode toggle: when marking done, auto-sort the item to the top of the
  // completed group (right after the last uncompleted item in that column).
  const handleWeekendToggle = (t: Todo) => {
    const becomingCompleted = !t.completed;
    patchTodo(t.id, { completed: becomingCompleted });

    if (!becomingCompleted) return; // unchecking: no reorder needed

    const dayKey = t.dueDate?.slice(0, 10);
    if (!dayKey) return;

    const colTodos = todos.filter((x) => x.dueDate && x.dueDate.slice(0, 10) === dayKey);
    const uncompleted = colTodos.filter((x) => !x.completed && x.id !== t.id);
    const completed = colTodos.filter((x) => x.completed && x.id !== t.id);
    const newOrder = [...uncompleted, t, ...completed];

    setTodos((prev) => {
      const colSet = new Set(colTodos.map((x) => x.id));
      const others = prev.filter((x) => !colSet.has(x.id));
      return [...newOrder.map((x) => x.id === t.id ? { ...x, completed: true } : x), ...others];
    });

    fetch("/chris/api/todos/reorder", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids: newOrder.map((x) => x.id) }),
    });
  };

  // Weekend kanban: move a dragged to-do into `targetDay` at `targetIndex`.
  // Reorders within the column and, if the day changed, repoints its dueDate.
  const moveTodo = async (draggedId: string, targetDay: string, targetIndex: number) => {
    const dragged = todos.find((t) => t.id === draggedId);
    if (!dragged) return;
    const dayChanged = (dragged.dueDate ? dragged.dueDate.slice(0, 10) : null) !== targetDay;

    const cols = new Map<string, Todo[]>(weekendKeys.map((k) => [k, []]));
    const others: Todo[] = [];
    for (const t of todos) {
      if (t.id === draggedId) continue;
      const k = t.dueDate ? t.dueDate.slice(0, 10) : null;
      if (k && cols.has(k)) cols.get(k)!.push(t);
      else others.push(t);
    }
    const moved: Todo = { ...dragged, dueDate: `${targetDay}T00:00:00.000Z` };
    const col = cols.get(targetDay)!;
    const idx = Math.max(0, Math.min(targetIndex, col.length));
    col.splice(idx, 0, moved);
    const targetColIds = col.map((t) => t.id);

    setTodos([...weekendKeys.flatMap((k) => cols.get(k)!), ...others]);

    if (dayChanged) {
      await fetch(`/chris/api/todos/${draggedId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dueDate: targetDay }),
      });
    }
    await fetch("/chris/api/todos/reorder", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids: targetColIds }),
    });
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
        <SurfaceSwitcher />
        <div style={{ display: "inline-flex", alignItems: "center", gap: 12 }}>
          <ThemeControls />
          <FullscreenButton />
        </div>
      </header>

      {/* Controls */}
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
          {weekendMode ? "Weekend" : monthLabel}
        </h1>
        {weekendMode && (
          <span style={{ fontFamily: MONO, fontSize: 12, color: C.textFaint }}>
            {weekendDays[0].toLocaleDateString("en-US", { month: "short", day: "numeric" })} –{" "}
            {weekendDays[2].toLocaleDateString("en-US", { month: "short", day: "numeric" })}
          </span>
        )}
        <div style={{ flex: 1 }} />
        <WeekendToggle on={weekendMode} onChange={toggleWeekend} />
        {!weekendMode && (
          <>
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
          </>
        )}
      </div>

      {loading ? (
        <Spinner label="loading…" />
      ) : weekendMode ? (
        /* ── Weekend kanban ── */
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            gap: 12,
            alignItems: "start",
          }}
        >
          {weekendDays.map((d) => {
            const key = ymd(d);
            const colTodos = todos.filter((t) => t.dueDate && t.dueDate.slice(0, 10) === key);
            return (
              <WeekendColumn
                key={key}
                date={d}
                isToday={key === todayKey}
                isPast={key < todayKey}
                todos={colTodos}
                dragId={dragId}
                isOver={overCol === key}
                onSetOver={(over) => setOverCol(over ? key : null)}
                onAddClick={(el) => openAdd(key, el)}
                onOpenTodo={(id) => setDetailForId(id)}
                onToggle={(t) => handleWeekendToggle(t)}
                onDragStart={(id) => setDragId(id)}
                onDragEnd={() => {
                  setDragId(null);
                  setOverCol(null);
                }}
                onDropAt={(index, id) => {
                  const moveId = id || dragId;
                  if (moveId) moveTodo(moveId, key, index);
                  setDragId(null);
                  setOverCol(null);
                }}
              />
            );
          })}
        </div>
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
          prefer={weekendMode ? "below" : "above"}
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

// ── Weekend kanban column ────────────────────────────────────────────────────

function WeekendColumn({
  date,
  isToday,
  isPast,
  todos,
  dragId,
  isOver,
  onSetOver,
  onAddClick,
  onOpenTodo,
  onToggle,
  onDragStart,
  onDragEnd,
  onDropAt,
}: {
  date: Date;
  isToday: boolean;
  isPast: boolean;
  todos: Todo[];
  dragId: string | null;
  isOver: boolean;
  onSetOver: (over: boolean) => void;
  onAddClick: (el: HTMLElement) => void;
  onOpenTodo: (id: string) => void;
  onToggle: (t: Todo) => void;
  onDragStart: (id: string) => void;
  onDragEnd: () => void;
  onDropAt: (index: number, id: string) => void;
}) {
  const addBtnRef = useRef<HTMLButtonElement>(null);
  const weekday = WEEKDAYS_LONG[date.getDay()];
  const dateLabel = date.toLocaleDateString("en-US", { month: "short", day: "numeric" });

  return (
    <div
      onDragOver={(e) => {
        if (!dragId) return;
        e.preventDefault();
        e.dataTransfer.dropEffect = "move";
        onSetOver(true);
      }}
      onDragLeave={(e) => {
        // Only clear when leaving the column entirely, not when moving onto a child.
        if (!e.currentTarget.contains(e.relatedTarget as Node)) onSetOver(false);
      }}
      onDrop={(e) => {
        e.preventDefault();
        const id = e.dataTransfer.getData("text/plain");
        onDropAt(todos.length, id); // dropped on the column body → append
      }}
      style={{
        display: "flex",
        flexDirection: "column",
        border: `1px solid ${isToday ? "var(--pg-accent)" : C.border}`,
        borderRadius: 14,
        background: isOver
          ? "color-mix(in srgb, var(--pg-accent) 8%, var(--pg-card))"
          : isToday
            ? "color-mix(in srgb, var(--pg-accent) 6%, var(--pg-card))"
            : C.card,
        padding: 10,
        minHeight: 280,
        opacity: isPast ? 0.7 : 1,
        transition: "background 0.12s ease",
      }}
    >
      {/* Column header */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              fontSize: 14,
              fontWeight: 600,
              color: isToday ? "var(--pg-accent)" : C.text,
              display: "flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            {weekday}
            {isToday && (
              <span style={{ fontFamily: MONO, fontSize: 9.5, letterSpacing: "0.08em", color: "var(--pg-accent)" }}>
                TODAY
              </span>
            )}
          </div>
          <div style={{ fontFamily: MONO, fontSize: 11, color: C.textFaint, marginTop: 1 }}>
            {dateLabel}
          </div>
        </div>
        <button
          ref={addBtnRef}
          onClick={() => addBtnRef.current && onAddClick(addBtnRef.current)}
          aria-label={`Add a to-do for ${weekday}`}
          title="Add a to-do"
          style={{
            flexShrink: 0,
            width: 26,
            height: 26,
            borderRadius: 8,
            border: `1px solid ${C.border}`,
            background: "transparent",
            color: C.text,
            fontSize: 16,
            lineHeight: 1,
            cursor: "pointer",
            display: "grid",
            placeItems: "center",
          }}
        >
          +
        </button>
      </div>

      {/* Cards */}
      <div style={{ display: "flex", flexDirection: "column", gap: 7, flex: 1 }}>
        {todos.length === 0 ? (
          <div
            style={{
              flex: 1,
              minHeight: 80,
              display: "grid",
              placeItems: "center",
              border: `1px dashed ${C.borderSoft}`,
              borderRadius: 10,
              color: C.textFaint,
              fontSize: 12,
              textAlign: "center",
              padding: 12,
            }}
          >
            Drop here or + to plan
          </div>
        ) : (
          todos.map((t, i) => (
            <WeekendCard
              key={t.id}
              todo={t}
              index={i}
              isDragging={dragId === t.id}
              onOpen={() => onOpenTodo(t.id)}
              onToggle={() => onToggle(t)}
              onDragStart={() => onDragStart(t.id)}
              onDragEnd={onDragEnd}
              onDropBefore={(id) => onDropAt(i, id)}
            />
          ))
        )}
      </div>
    </div>
  );
}

function WeekendCard({
  todo,
  isDragging,
  onOpen,
  onToggle,
  onDragStart,
  onDragEnd,
  onDropBefore,
}: {
  todo: Todo;
  index: number;
  isDragging: boolean;
  onOpen: () => void;
  onToggle: () => void;
  onDragStart: () => void;
  onDragEnd: () => void;
  onDropBefore: (id: string) => void;
}) {
  const [over, setOver] = useState(false);
  const pri = todo.priority ? PRIORITY_META[todo.priority] : null;

  return (
    <div
      draggable
      onDragStart={(e) => {
        e.dataTransfer.effectAllowed = "move";
        try {
          e.dataTransfer.setData("text/plain", todo.id);
        } catch {
          /* Safari */
        }
        onDragStart();
      }}
      onDragEnd={onDragEnd}
      onDragOver={(e) => {
        e.preventDefault();
        e.stopPropagation();
        setOver(true);
      }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        e.stopPropagation();
        setOver(false);
        onDropBefore(e.dataTransfer.getData("text/plain"));
      }}
      onClick={(e) => {
        const el = e.target as HTMLElement;
        if (el.closest("button")) return;
        onOpen();
      }}
      title={todo.title}
      style={{
        display: "flex",
        alignItems: "flex-start",
        gap: 8,
        border: `1px solid ${C.border}`,
        borderRadius: 10,
        background: C.bg,
        padding: "9px 10px",
        cursor: "grab",
        opacity: isDragging ? 0.4 : 1,
        boxShadow: over && !isDragging ? "inset 0 2px 0 0 var(--pg-accent)" : "none",
        transition: "opacity 0.12s ease, box-shadow 0.12s ease",
      }}
    >
      <button
        onClick={onToggle}
        aria-label={todo.completed ? "Mark incomplete" : "Mark complete"}
        style={{
          flexShrink: 0,
          marginTop: 1,
          width: 16,
          height: 16,
          borderRadius: 999,
          border: `1.5px solid ${todo.completed ? "var(--pg-accent)" : C.border}`,
          background: todo.completed ? "var(--pg-accent)" : "transparent",
          color: "var(--pg-accent-text)",
          display: "grid",
          placeItems: "center",
          cursor: "pointer",
          fontSize: 10,
          lineHeight: 1,
          padding: 0,
        }}
      >
        {todo.completed ? "✓" : ""}
      </button>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontSize: 13,
            lineHeight: 1.35,
            color: todo.completed ? C.textFaint : C.text,
            textDecoration: todo.completed ? "line-through" : "none",
            wordBreak: "break-word",
          }}
        >
          {todo.title}
        </div>
        {(pri || todo.project) && (
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 5, flexWrap: "wrap" }}>
            {pri && (
              <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 11, color: C.textDim }}>
                <span style={{ width: 6, height: 6, borderRadius: 999, background: pri.color }} />
                {pri.label}
              </span>
            )}
            {todo.project && (
              <span style={{ fontSize: 11, color: C.textDim }}>
                <span style={{ color: "var(--pg-accent)", marginRight: 3 }}>◆</span>
                {todo.project.name}
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Weekend Mode toggle switch ───────────────────────────────────────────────

function WeekendToggle({ on, onChange }: { on: boolean; onChange: (on: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!on)}
      role="switch"
      aria-checked={on}
      title="Toggle Weekend Mode"
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 8,
        border: `1px solid ${on ? "var(--pg-accent)" : C.border}`,
        background: on ? "color-mix(in srgb, var(--pg-accent) 12%, transparent)" : "transparent",
        borderRadius: 999,
        padding: "5px 10px 5px 12px",
        cursor: "pointer",
      }}
    >
      <span style={{ fontSize: 12.5, color: on ? C.text : C.textDim, whiteSpace: "nowrap" }}>
        Weekend Mode
      </span>
      <span
        aria-hidden
        style={{
          position: "relative",
          width: 32,
          height: 18,
          borderRadius: 999,
          background: on ? "var(--pg-accent)" : C.border,
          transition: "background 0.15s ease",
          flexShrink: 0,
        }}
      >
        <span
          style={{
            position: "absolute",
            top: 2,
            left: on ? 16 : 2,
            width: 14,
            height: 14,
            borderRadius: 999,
            background: on ? "var(--pg-accent-text)" : C.card,
            transition: "left 0.15s ease",
          }}
        />
      </span>
    </button>
  );
}

// ── Anchored quick-add popover ───────────────────────────────────────────────
// Mirrors the to-do surface quick-add (title input + Add, optional project),
// but rendered as a small modal anchored above the clicked calendar square.

function QuickAddPopover({
  anchorRef,
  dayKey,
  projects,
  prefer = "above",
  onClose,
  onAdd,
}: {
  anchorRef: React.RefObject<HTMLElement | null>;
  dayKey: string;
  projects: Project[];
  prefer?: "above" | "below";
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
    <FixedDropdown anchorRef={anchorRef} onClose={onClose} width={300} maxHeight={220} prefer={prefer}>
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
