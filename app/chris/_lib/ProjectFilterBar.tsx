"use client";

import { useState, useCallback } from "react";
import Link from "next/link";

type Project = { id: string; name: string };

const C = {
  border: "#23262d",
  text: "#e7e9ee",
  textDim: "#9aa0aa",
  textFaint: "#6b7280",
  accent: "#c9a86a",
  accentText: "#1a1710",
};

const MONO = 'ui-monospace, SFMono-Regular, "SF Mono", Menlo, monospace';
const ALL = "__all__";
const UNASSIGNED = "__unassigned__";

export type FilterValue = typeof ALL | typeof UNASSIGNED | string;

export function ProjectFilterBar({
  projects,
  value,
  onChange,
  onCreateProject,
  storageKey,
  showManageLink = true,
}: {
  projects: Project[];
  value: FilterValue;
  onChange: (value: FilterValue) => void;
  onCreateProject: (name: string) => Promise<Project | null>;
  storageKey: string;
  showManageLink?: boolean;
}) {
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");

  const finishCreate = useCallback(async () => {
    if (!name.trim()) { setCreating(false); setName(""); return; }
    const p = await onCreateProject(name.trim());
    if (p) onChange(p.id);
    setName("");
    setCreating(false);
  }, [name, onCreateProject, onChange]);

  const chip = (
    label: string,
    active: boolean,
    onClick: () => void,
    muted?: boolean,
  ) => (
    <button
      key={label}
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
      {label}
    </button>
  );

  return (
    <div
      style={{
        display: "flex",
        flexWrap: "wrap",
        alignItems: "center",
        gap: 6,
        padding: "12px 4px 0",
      }}
    >
      {chip("All", value === ALL, () => onChange(ALL))}
      {chip("Unassigned", value === UNASSIGNED, () => onChange(UNASSIGNED), true)}
      {projects.map((p) =>
        chip(p.name, value === p.id, () => onChange(p.id))
      )}
      {creating ? (
        <input
          autoFocus
          value={name}
          onChange={(e) => setName(e.target.value)}
          onBlur={finishCreate}
          onKeyDown={(e) => {
            if (e.key === "Enter") finishCreate();
            if (e.key === "Escape") { setName(""); setCreating(false); }
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
          onClick={() => setCreating(true)}
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
      {showManageLink && (
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
      )}
    </div>
  );
}

export { ALL, UNASSIGNED };
