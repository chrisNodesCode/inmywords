"use client";

// Shared to-do primitives — types, palette, helpers, and the detail modal.
// Used by both the To-dos surface (`/chris/todos`) and the Calendar surface
// (`/chris/calendar`) so the two stay visually and behaviourally in sync.

import { useEffect, useState } from "react";
import { useAutosave } from "@/app/chris/_lib/useAutosave";

// ── Types ───────────────────────────────────────────────────────────────────

export type Priority = "LOW" | "MEDIUM" | "HIGH";

export type Todo = {
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

export type Project = { id: string; name: string };

// ── Palette ──────────────────────────────────────────────────────────────────

export const C = {
  bg: "var(--pg-bg)",
  card: "var(--pg-card)",
  cardHover: "var(--pg-card-hover)",
  border: "var(--pg-border)",
  borderSoft: "var(--pg-border-soft)",
  text: "var(--pg-text)",
  textDim: "var(--pg-text-dim)",
  textFaint: "var(--pg-text-faint)",
  accent: "var(--pg-accent)", // sand — quiet InMyWords nod
};

export const MONO = 'ui-monospace, SFMono-Regular, "SF Mono", Menlo, monospace';

export const PRIORITY_META: Record<Priority, { label: string; color: string }> = {
  HIGH: { label: "High", color: "#e0736a" },
  MEDIUM: { label: "Medium", color: "#d9a441" },
  LOW: { label: "Low", color: "#6f8fd0" },
};
export const PRIORITY_ORDER: (Priority | null)[] = [null, "HIGH", "MEDIUM", "LOW"];

// ── Date helpers ─────────────────────────────────────────────────────────────

export function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

export function formatDue(iso: string): { label: string; overdue: boolean; soon: boolean } {
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

export function normalizeUrl(u: string): string {
  return /^https?:\/\//i.test(u) ? u : `https://${u}`;
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

export function TodoDetailModal({
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

  const persist = () => {
    onSave({
      title: title.trim() || todo.title,
      note: note.trim() || null,
      priority,
      dueDate: due || null,
      phone: phone.trim() || null,
      url: url.trim() || null,
      projectId,
    });
  };

  // Autosave on any field change; the Save button still persists + closes.
  useAutosave([title, note, priority, due, phone, url, projectId], persist);

  const save = async () => {
    setSaving(true);
    try {
      await persist();
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
          maxWidth: 900,
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
              color: "var(--pg-accent-text)",
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
