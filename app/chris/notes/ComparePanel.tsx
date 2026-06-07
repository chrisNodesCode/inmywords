"use client";

import { useEffect, useMemo, useState } from "react";
import {
  type CustomFieldDef,
  type CompareConfig,
  type CompareField,
  formatNoteValue,
  formatCustomValue,
  compareFieldsForProject,
} from "@/app/chris/_lib/noteFields";

// ── Palette (mirrors the Notes surface) ──────────────────────────────────────
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

// Minimal structural shapes (kept local to avoid importing the page component).
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
  projectId: string | null;
  amount: number | null;
  distance: number | null;
  rating: number | null;
  date: string | null;
  phone: string | null;
  email: string | null;
  url: string | null;
  address: string | null;
  customValues: Record<string, string | number | boolean | null> | null;
};

const LAST_COMPARE_PROJECT = "chris.notes.compareProjectId";

function defaultConfig(project: Project): CompareConfig {
  const valid = new Set(compareFieldsForProject(project.customFields).map((f) => f.key));
  const fields = [
    ...project.noteFields.filter((k) => valid.has(k)),
    ...project.customFields.map((c) => c.key),
  ];
  return { fields, sortBy: fields[0] ?? null, sortDir: "asc" };
}

// Raw comparable value for sorting (number for numeric fields, lowercased
// string otherwise, null when empty).
function sortValue(note: Note, field: CompareField): number | string | null {
  if (field.custom) {
    const raw = note.customValues?.[field.key];
    if (raw === undefined || raw === null || raw === "") return null;
    if (field.numeric) {
      const n = typeof raw === "number" ? raw : Number(raw);
      return Number.isFinite(n) ? n : null;
    }
    if (typeof raw === "boolean") return raw ? "yes" : "no";
    return String(raw).toLowerCase();
  }
  const k = field.key as keyof Note;
  if (field.key === "date") return note.date ? new Date(note.date).getTime() : null;
  const v = note[k];
  if (v === undefined || v === null || v === "") return null;
  if (typeof v === "number") return v;
  return String(v).toLowerCase();
}

function displayValue(note: Note, field: CompareField, customDefs: CustomFieldDef[]): string {
  if (field.custom) {
    const def = customDefs.find((d) => d.key === field.key);
    if (!def) return "—";
    return formatCustomValue(def, note.customValues?.[field.key]) ?? "—";
  }
  // formatNoteValue expects the built-in value bag; Note satisfies it.
  return formatNoteValue(field.key as never, note as never) ?? "—";
}

export function ComparePanel({
  projects,
  notes,
  onSaveConfig,
  onOpenNote,
}: {
  projects: Project[];
  notes: Note[];
  onSaveConfig: (projectId: string, config: CompareConfig) => void;
  onOpenNote: (id: string) => void;
}) {
  const [projectId, setProjectId] = useState<string>("");

  // Pick an initial project: last used, else the first one.
  useEffect(() => {
    if (projects.length === 0) return;
    const saved = typeof window !== "undefined" ? localStorage.getItem(LAST_COMPARE_PROJECT) : null;
    const initial = saved && projects.some((p) => p.id === saved) ? saved : projects[0].id;
    setProjectId((cur) => cur || initial);
  }, [projects]);

  const project = projects.find((p) => p.id === projectId) ?? null;

  const allFields = useMemo(
    () => (project ? compareFieldsForProject(project.customFields) : []),
    [project]
  );

  // Working config (editable; saved back to the project).
  const [config, setConfig] = useState<CompareConfig>({ fields: [], sortBy: null, sortDir: "asc" });

  // Load the project's saved config (or a sensible default) when it changes.
  useEffect(() => {
    if (!project) return;
    setConfig(project.compareConfig ?? defaultConfig(project));
    if (typeof window !== "undefined") localStorage.setItem(LAST_COMPARE_PROJECT, project.id);
  }, [project]);

  const selectedFields = useMemo(
    () => allFields.filter((f) => config.fields.includes(f.key)),
    [allFields, config.fields]
  );

  const rows = useMemo(() => {
    if (!project) return [];
    const list = notes.filter((n) => n.projectId === project.id);
    const sortField = allFields.find((f) => f.key === config.sortBy);
    if (sortField) {
      const dir = config.sortDir === "desc" ? -1 : 1;
      list.sort((a, b) => {
        const av = sortValue(a, sortField);
        const bv = sortValue(b, sortField);
        if (av === null && bv === null) return 0;
        if (av === null) return 1; // empties last regardless of dir
        if (bv === null) return -1;
        if (av < bv) return -1 * dir;
        if (av > bv) return 1 * dir;
        return 0;
      });
    }
    return list;
  }, [project, notes, allFields, config.sortBy, config.sortDir]);

  const dirty = useMemo(() => {
    if (!project) return false;
    return JSON.stringify(config) !== JSON.stringify(project.compareConfig ?? defaultConfig(project));
  }, [config, project]);

  const toggleField = (key: string) =>
    setConfig((c) => {
      const has = c.fields.includes(key);
      const fields = has ? c.fields.filter((f) => f !== key) : [...c.fields, key];
      // keep sortBy valid
      const sortBy = c.sortBy && fields.includes(c.sortBy) ? c.sortBy : fields[0] ?? null;
      return { ...c, fields, sortBy };
    });

  if (projects.length === 0) {
    return (
      <div style={{ textAlign: "center", padding: "48px 0", color: C.textFaint }}>
        <p style={{ margin: 0, fontSize: 14 }}>Create a project first to compare notes.</p>
      </div>
    );
  }

  const selectStyle: React.CSSProperties = {
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
  };

  return (
    <div>
      {/* Controls */}
      <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 10, marginBottom: 6 }}>
        <select value={projectId} onChange={(e) => setProjectId(e.target.value)} style={selectStyle}>
          {projects.map((p) => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>

        {project && (
          <>
            <span style={{ fontFamily: MONO, fontSize: 11.5, color: C.textFaint }}>sort</span>
            <select
              value={config.sortBy ?? ""}
              onChange={(e) => setConfig((c) => ({ ...c, sortBy: e.target.value || null }))}
              style={selectStyle}
            >
              <option value="">— none —</option>
              {selectedFields.map((f) => (
                <option key={f.key} value={f.key}>{f.label}</option>
              ))}
            </select>
            <button
              onClick={() => setConfig((c) => ({ ...c, sortDir: c.sortDir === "asc" ? "desc" : "asc" }))}
              title="Toggle sort direction"
              style={{
                border: `1px solid ${C.border}`,
                background: "transparent",
                color: C.textDim,
                borderRadius: 8,
                padding: "6px 10px",
                fontSize: 12.5,
                fontFamily: MONO,
                cursor: "pointer",
              }}
            >
              {config.sortDir === "asc" ? "↑ asc" : "↓ desc"}
            </button>

            <div style={{ flex: 1 }} />
            <button
              onClick={() => project && onSaveConfig(project.id, config)}
              disabled={!dirty}
              style={{
                border: "none",
                borderRadius: 9,
                background: dirty ? C.accent : C.border,
                color: dirty ? C.accentText : C.textFaint,
                fontWeight: 600,
                fontSize: 12.5,
                padding: "7px 14px",
                cursor: dirty ? "pointer" : "default",
              }}
            >
              {dirty ? "Save config" : "Saved"}
            </button>
          </>
        )}
      </div>

      {/* Field picker */}
      {project && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 18 }}>
          {allFields.map((f) => {
            const on = config.fields.includes(f.key);
            return (
              <button
                key={f.key}
                onClick={() => toggleField(f.key)}
                style={{
                  border: `1px solid ${on ? C.accent : C.border}`,
                  background: on ? `${C.accent}1a` : "transparent",
                  color: on ? C.accent : C.textDim,
                  borderRadius: 999,
                  padding: "4px 11px",
                  fontSize: 12,
                  fontFamily: MONO,
                  cursor: "pointer",
                }}
                title={f.custom ? "Custom field" : "Built-in field"}
              >
                {f.label}{f.custom ? " ·" : ""}
              </button>
            );
          })}
        </div>
      )}

      {/* Comparison table */}
      {project && (
        rows.length === 0 ? (
          <div style={{ textAlign: "center", padding: "40px 0", color: C.textFaint }}>
            <p style={{ margin: 0, fontSize: 14 }}>No notes in this project yet.</p>
          </div>
        ) : selectedFields.length === 0 ? (
          <div style={{ textAlign: "center", padding: "40px 0", color: C.textFaint }}>
            <p style={{ margin: 0, fontSize: 14 }}>Pick at least one field to compare.</p>
          </div>
        ) : (
          <div style={{ overflowX: "auto", border: `1px solid ${C.border}`, borderRadius: 12 }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr>
                  <th style={thStyle}>Note</th>
                  {selectedFields.map((f) => (
                    <th key={f.key} style={{ ...thStyle, cursor: "pointer" }}
                      onClick={() => setConfig((c) => ({
                        ...c,
                        sortBy: f.key,
                        sortDir: c.sortBy === f.key && c.sortDir === "asc" ? "desc" : "asc",
                      }))}
                      title="Click to sort"
                    >
                      {f.label}
                      {config.sortBy === f.key ? (config.sortDir === "asc" ? " ↑" : " ↓") : ""}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((n) => (
                  <tr
                    key={n.id}
                    onClick={() => onOpenNote(n.id)}
                    style={{ cursor: "pointer", borderTop: `1px solid ${C.borderSoft}` }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = C.cardHover)}
                    onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                  >
                    <td style={{ ...tdStyle, color: C.text, fontWeight: 500, maxWidth: 240 }}>
                      {n.title?.trim() || <span style={{ color: C.textFaint, fontStyle: "italic" }}>Untitled</span>}
                    </td>
                    {selectedFields.map((f) => {
                      const v = displayValue(n, f, project.customFields);
                      return (
                        <td key={f.key} style={{ ...tdStyle, color: v === "—" ? C.textFaint : C.textDim }}>
                          {v}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      )}
    </div>
  );
}

const thStyle: React.CSSProperties = {
  textAlign: "left",
  padding: "10px 14px",
  fontFamily: MONO,
  fontSize: 10.5,
  letterSpacing: "0.06em",
  textTransform: "uppercase",
  color: C.textFaint,
  background: C.card,
  whiteSpace: "nowrap",
};
const tdStyle: React.CSSProperties = {
  padding: "11px 14px",
  whiteSpace: "nowrap",
  overflow: "hidden",
  textOverflow: "ellipsis",
};
