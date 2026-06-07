"use client";

import { useEffect, useRef, useState } from "react";
import { SurfaceSwitcher } from "@/app/chris/_lib/SurfaceSwitcher";
import { useDragReorder } from "@/app/chris/_lib/dragReorder";
import { Spinner } from "@/app/chris/_lib/Spinner";
import { FullscreenButton } from "@/app/chris/_lib/FullscreenButton";
import { ThemeControls } from "@/app/chris/_lib/ThemeControls";
import { FixedDropdown } from "@/app/chris/_lib/FixedDropdown";
import {
  NOTE_FIELDS,
  type NoteFieldKey,
  type CustomFieldDef,
  type CustomFieldType,
  type CustomSlot,
  CUSTOM_FIELD_SLOTS,
  CUSTOM_FIELD_TYPES,
  MAX_CUSTOM_FIELDS,
  cleanFieldKeys,
  cleanCustomFields,
} from "@/app/chris/_lib/noteFields";

type Project = {
  id: string;
  name: string;
  sortOrder: number;
  noteFields: string[];
  customFields: CustomFieldDef[];
  createdAt: string;
  updatedAt: string;
  _count: { prompts: number; todos: number; notes: number };
};

const C = {
  bg: "var(--pg-bg)",
  card: "var(--pg-card)",
  cardHover: "var(--pg-card-hover)",
  border: "var(--pg-border)",
  text: "var(--pg-text)",
  textDim: "var(--pg-text-dim)",
  textFaint: "var(--pg-text-faint)",
  accent: "var(--pg-accent)",
  accentText: "var(--pg-accent-text)",
  danger: "#e0736a",
};
const MONO = 'ui-monospace, SFMono-Regular, "SF Mono", Menlo, monospace';

const sectionLabel: React.CSSProperties = {
  fontFamily: MONO,
  fontSize: 10,
  letterSpacing: "0.06em",
  textTransform: "uppercase",
  color: "var(--pg-text-faint)",
  margin: "0 0 8px",
};

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/chris/api/projects");
        const data = await res.json();
        setProjects(
          (data.projects ?? []).map((p: Project) => ({
            ...p,
            noteFields: Array.isArray(p.noteFields) ? p.noteFields : [],
            customFields: cleanCustomFields(p.customFields),
          }))
        );
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const createProject = async () => {
    const t = draft.trim();
    if (!t) return;
    const res = await fetch("/chris/api/projects", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: t }),
    });
    if (res.ok) {
      const { project } = await res.json();
      setProjects((prev) => [
        ...prev,
        { ...project, customFields: cleanCustomFields(project.customFields), _count: { prompts: 0, todos: 0, notes: 0 } },
      ]);
      setDraft("");
      inputRef.current?.focus();
    }
  };

  const setNoteFields = async (id: string, fields: NoteFieldKey[]) => {
    setProjects((prev) => prev.map((p) => (p.id === id ? { ...p, noteFields: fields } : p)));
    await fetch(`/chris/api/projects/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ noteFields: fields }),
    });
  };

  const setCustomFieldDefs = async (id: string, defs: CustomFieldDef[]) => {
    setProjects((prev) => prev.map((p) => (p.id === id ? { ...p, customFields: defs } : p)));
    await fetch(`/chris/api/projects/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ customFields: defs }),
    });
  };

  const renameProject = async (id: string, name: string) => {
    const t = name.trim();
    if (!t) return;
    setProjects((prev) => prev.map((p) => (p.id === id ? { ...p, name: t } : p)));
    await fetch(`/chris/api/projects/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: t }),
    });
  };

  const deleteProject = async (id: string) => {
    const p = projects.find((x) => x.id === id);
    if (!p) return;
    const linked = p._count.prompts + p._count.todos + p._count.notes;
    const msg =
      linked > 0
        ? `Delete "${p.name}"? ${linked} linked item${linked === 1 ? "" : "s"} will be unlinked (not deleted).`
        : `Delete "${p.name}"?`;
    if (!confirm(msg)) return;
    setProjects((prev) => prev.filter((x) => x.id !== id));
    await fetch(`/chris/api/projects/${id}`, { method: "DELETE" });
  };

  return (
    <main style={{ maxWidth: 640, margin: "0 auto", padding: "0 24px 96px" }}>
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
            {projects.length} project{projects.length === 1 ? "" : "s"}
          </span>
          <ThemeControls />
          <FullscreenButton />
        </div>
      </header>

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
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") createProject();
              if (e.key === "Escape") setDraft("");
            }}
            placeholder="New project name…"
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
            onClick={createProject}
            disabled={!draft.trim()}
            style={{
              border: "none",
              borderRadius: 10,
              background: draft.trim() ? C.accent : C.border,
              color: draft.trim() ? C.accentText : C.textFaint,
              fontWeight: 600,
              fontSize: 14,
              padding: "10px 16px",
              cursor: draft.trim() ? "pointer" : "default",
            }}
          >
            Add
          </button>
        </div>
      </section>

      <section style={{ marginTop: 24 }}>
        {loading ? (
          <Spinner label="loading…" />
        ) : projects.length === 0 ? (
          <div style={{ textAlign: "center", padding: "56px 0", color: C.textFaint }}>
            <div style={{ fontSize: 28, marginBottom: 12 }}>◜◝</div>
            <p style={{ margin: 0, fontSize: 14 }}>
              No projects yet. Create one above to start organizing prompts and to-dos.
            </p>
          </div>
        ) : (
          <ProjectsDragList
            projects={projects}
            applyReorder={(next) => {
              setProjects(next);
              void fetch("/chris/api/projects/reorder", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ ids: next.map((p) => p.id) }),
              });
            }}
            onRename={renameProject}
            onDelete={deleteProject}
            onSetNoteFields={setNoteFields}
            onSetCustomFields={setCustomFieldDefs}
          />
        )}
      </section>
    </main>
  );
}

function ProjectsDragList({
  projects,
  applyReorder,
  onRename,
  onDelete,
  onSetNoteFields,
  onSetCustomFields,
}: {
  projects: Project[];
  applyReorder: (next: Project[]) => void;
  onRename: (id: string, name: string) => void;
  onDelete: (id: string) => void;
  onSetNoteFields: (id: string, fields: NoteFieldKey[]) => void;
  onSetCustomFields: (id: string, defs: CustomFieldDef[]) => void;
}) {
  const { rowProps, rowStyle } = useDragReorder(projects, applyReorder);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {projects.map((p) => (
        <ProjectRow
          key={p.id}
          project={p}
          dragProps={rowProps(p.id)}
          dragStyle={rowStyle(p.id)}
          onRename={(name) => onRename(p.id, name)}
          onDelete={() => onDelete(p.id)}
          onSetNoteFields={(fields) => onSetNoteFields(p.id, fields)}
          onSetCustomFields={(defs) => onSetCustomFields(p.id, defs)}
        />
      ))}
    </div>
  );
}

function ProjectRow({
  project,
  dragProps,
  dragStyle,
  onRename,
  onDelete,
  onSetNoteFields,
  onSetCustomFields,
}: {
  project: Project;
  dragProps: React.HTMLAttributes<HTMLDivElement> & { draggable?: boolean };
  dragStyle: React.CSSProperties;
  onRename: (name: string) => void;
  onDelete: () => void;
  onSetNoteFields: (fields: NoteFieldKey[]) => void;
  onSetCustomFields: (defs: CustomFieldDef[]) => void;
}) {
  const [hover, setHover] = useState(false);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(project.name);
  const [fieldsOpen, setFieldsOpen] = useState(false);
  const fieldsBtnRef = useRef<HTMLButtonElement>(null);

  const template = cleanFieldKeys(project.noteFields);
  const toggleTemplateField = (k: NoteFieldKey) => {
    const set = new Set(template);
    if (set.has(k)) set.delete(k);
    else set.add(k);
    onSetNoteFields(cleanFieldKeys([...set]));
  };

  // ── Custom field defs (up to 3 slots) ──
  const customs = project.customFields;
  const usedSlots = new Set(customs.map((c) => c.key));
  const nextSlot = CUSTOM_FIELD_SLOTS.find((s) => !usedSlots.has(s));
  const addCustomField = () => {
    if (!nextSlot || customs.length >= MAX_CUSTOM_FIELDS) return;
    onSetCustomFields([...customs, { key: nextSlot, label: "", type: "text" }]);
  };
  const updateCustomField = (key: CustomSlot, patch: Partial<CustomFieldDef>) => {
    onSetCustomFields(
      customs.map((c) => (c.key === key ? { ...c, ...patch } : c))
    );
  };
  const removeCustomField = (key: CustomSlot) => {
    onSetCustomFields(customs.filter((c) => c.key !== key));
  };

  const commit = () => {
    const v = draft.trim();
    if (v && v !== project.name) onRename(v);
    else setDraft(project.name);
    setEditing(false);
  };

  return (
    <div
      {...dragProps}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 12,
        border: `1px solid ${C.border}`,
        borderRadius: 12,
        background: hover ? C.cardHover : C.card,
        padding: "13px 14px",
        transition: "background 0.12s ease",
        ...dragStyle,
      }}
    >
      {editing ? (
        <input
          autoFocus
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === "Enter") commit();
            if (e.key === "Escape") {
              setDraft(project.name);
              setEditing(false);
            }
          }}
          style={{
            flex: 1,
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
          onClick={() => setEditing(true)}
          style={{ flex: 1, fontSize: 15, color: C.text, cursor: "text" }}
        >
          {project.name}
        </div>
      )}

      <span
        style={{
          fontFamily: MONO,
          fontSize: 11.5,
          color: C.textFaint,
          whiteSpace: "nowrap",
        }}
      >
        {project._count.notes} note{project._count.notes === 1 ? "" : "s"} ·{" "}
        {project._count.todos} todo{project._count.todos === 1 ? "" : "s"} ·{" "}
        {project._count.prompts} prompt{project._count.prompts === 1 ? "" : "s"}
      </span>

      {/* Note-field template editor */}
      <button
        ref={fieldsBtnRef}
        onClick={() => setFieldsOpen((x) => !x)}
        title="Configure the note fields + custom fields for this project"
        style={{
          border: `1px solid ${template.length || customs.length ? C.accent : C.border}`,
          background: template.length || customs.length ? `${C.accent}1a` : "transparent",
          color: template.length || customs.length ? C.accent : C.textDim,
          borderRadius: 999,
          padding: "4px 11px",
          fontSize: 11.5,
          fontFamily: MONO,
          cursor: "pointer",
          whiteSpace: "nowrap",
        }}
      >
        fields{template.length || customs.length ? ` · ${template.length + customs.length}` : ""}
      </button>
      {fieldsOpen && (
        <FixedDropdown
          anchorRef={fieldsBtnRef}
          onClose={() => setFieldsOpen(false)}
          width={288}
          maxHeight={460}
        >
          <div style={{ padding: "10px 12px" }}>
            <p style={sectionLabel}>Note template</p>
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              {NOTE_FIELDS.map((f) => {
                const on = template.includes(f.key);
                return (
                  <button
                    key={f.key}
                    onClick={() => toggleTemplateField(f.key)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      width: "100%",
                      textAlign: "left",
                      border: `1px solid ${on ? C.accent : C.border}`,
                      background: on ? `${C.accent}1a` : "transparent",
                      color: on ? C.accent : C.textDim,
                      borderRadius: 8,
                      padding: "7px 10px",
                      fontSize: 13,
                      cursor: "pointer",
                    }}
                  >
                    <span aria-hidden style={{ width: 14, textAlign: "center" }}>{f.icon}</span>
                    <span style={{ flex: 1 }}>{f.label}</span>
                    <span style={{ fontFamily: MONO, fontSize: 12 }}>{on ? "✓" : ""}</span>
                  </button>
                );
              })}
            </div>

            {/* Custom fields */}
            <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", margin: "16px 0 8px" }}>
              <p style={{ ...sectionLabel, margin: 0 }}>Custom fields</p>
              <span style={{ fontFamily: MONO, fontSize: 10, color: C.textFaint }}>
                {customs.length}/{MAX_CUSTOM_FIELDS}
              </span>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {customs.map((cf) => (
                <div
                  key={cf.key}
                  style={{
                    border: `1px solid ${C.border}`,
                    borderRadius: 8,
                    padding: 8,
                    display: "flex",
                    flexDirection: "column",
                    gap: 6,
                  }}
                >
                  <input
                    value={cf.label}
                    onChange={(e) => updateCustomField(cf.key, { label: e.target.value })}
                    placeholder="Field label (e.g. Sq Ft)"
                    style={{
                      width: "100%",
                      background: "var(--pg-bg)",
                      border: `1px solid ${C.border}`,
                      borderRadius: 7,
                      outline: "none",
                      color: C.text,
                      fontSize: 13,
                      padding: "6px 9px",
                    }}
                  />
                  <div style={{ display: "flex", gap: 6 }}>
                    <select
                      value={cf.type}
                      onChange={(e) => updateCustomField(cf.key, { type: e.target.value as CustomFieldType })}
                      style={{
                        flex: 1,
                        background: "var(--pg-bg)",
                        border: `1px solid ${C.border}`,
                        borderRadius: 7,
                        color: C.text,
                        fontSize: 12.5,
                        padding: "6px 8px",
                        cursor: "pointer",
                        outline: "none",
                        colorScheme: "dark",
                      }}
                    >
                      {CUSTOM_FIELD_TYPES.map((t) => (
                        <option key={t.value} value={t.value}>{t.label}</option>
                      ))}
                    </select>
                    <button
                      onClick={() => removeCustomField(cf.key)}
                      title="Remove custom field"
                      style={{
                        border: `1px solid ${C.border}`,
                        background: "transparent",
                        color: C.danger,
                        borderRadius: 7,
                        padding: "0 10px",
                        fontSize: 13,
                        cursor: "pointer",
                      }}
                    >
                      ×
                    </button>
                  </div>
                </div>
              ))}
              {customs.length < MAX_CUSTOM_FIELDS && (
                <button
                  onClick={addCustomField}
                  style={{
                    border: `1px dashed ${C.border}`,
                    background: "transparent",
                    color: C.textDim,
                    borderRadius: 8,
                    padding: "8px 10px",
                    fontSize: 12.5,
                    cursor: "pointer",
                  }}
                >
                  + add custom field
                </button>
              )}
            </div>
          </div>
        </FixedDropdown>
      )}

      <button
        onClick={onDelete}
        aria-label="Delete project"
        style={{
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
