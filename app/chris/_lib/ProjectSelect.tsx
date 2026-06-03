"use client";

import Link from "next/link";

// Dropdown-style project filter/selector — the pattern introduced on the
// prompts page, shared so todos / journal / messaging all match. Values are
// ALL ("__all__"), UNASSIGNED ("__unassigned__"), or a project id.

const ALL = "__all__";
const UNASSIGNED = "__unassigned__";
export type ProjectFilterValue = typeof ALL | typeof UNASSIGNED | string;

const C = {
  card: "var(--pg-card)",
  border: "var(--pg-border)",
  text: "var(--pg-text)",
  textFaint: "var(--pg-text-faint)",
};
const MONO = 'ui-monospace, SFMono-Regular, "SF Mono", Menlo, monospace';

export function ProjectSelect({
  projects,
  value,
  onChange,
  showManageLink = true,
}: {
  projects: { id: string; name: string }[];
  value: ProjectFilterValue;
  onChange: (value: ProjectFilterValue) => void;
  showManageLink?: boolean;
}) {
  return (
    <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 10, padding: "12px 4px 0" }}>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={{
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
        }}
      >
        <option value={ALL}>All Projects</option>
        <option value={UNASSIGNED}>Unassigned</option>
        {projects.map((p) => (
          <option key={p.id} value={p.id}>{p.name}</option>
        ))}
      </select>
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

export { ALL as PROJECT_ALL, UNASSIGNED as PROJECT_UNASSIGNED };
