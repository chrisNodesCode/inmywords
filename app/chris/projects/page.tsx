"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";

type Project = {
  id: string;
  name: string;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
  _count: { prompts: number; todos: number };
};

const C = {
  bg: "#0e0f12",
  card: "#15171c",
  cardHover: "#181b21",
  border: "#23262d",
  text: "#e7e9ee",
  textDim: "#9aa0aa",
  textFaint: "#6b7280",
  accent: "#c9a86a",
  accentText: "#1a1710",
  danger: "#e0736a",
};
const MONO = 'ui-monospace, SFMono-Regular, "SF Mono", Menlo, monospace';

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
        setProjects(data.projects ?? []);
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
      setProjects((prev) => [...prev, { ...project, _count: { prompts: 0, todos: 0 } }]);
      setDraft("");
      inputRef.current?.focus();
    }
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
    const linked = p._count.prompts + p._count.todos;
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
        <Link href="/chris" style={{ textDecoration: "none", fontFamily: MONO, fontSize: 14 }}>
          <span style={{ color: C.textFaint }}>~/chris/</span>
          <span style={{ color: C.text }}>projects</span>
        </Link>
        <span style={{ fontFamily: MONO, fontSize: 12, color: C.textFaint }}>
          {projects.length} project{projects.length === 1 ? "" : "s"}
        </span>
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
          <p style={{ color: C.textFaint, fontFamily: MONO, fontSize: 13 }}>loading…</p>
        ) : projects.length === 0 ? (
          <div style={{ textAlign: "center", padding: "56px 0", color: C.textFaint }}>
            <div style={{ fontSize: 28, marginBottom: 12 }}>◜◝</div>
            <p style={{ margin: 0, fontSize: 14 }}>
              No projects yet. Create one above to start organizing prompts and to-dos.
            </p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {projects.map((p) => (
              <ProjectRow
                key={p.id}
                project={p}
                onRename={(name) => renameProject(p.id, name)}
                onDelete={() => deleteProject(p.id)}
              />
            ))}
          </div>
        )}
      </section>
    </main>
  );
}

function ProjectRow({
  project,
  onRename,
  onDelete,
}: {
  project: Project;
  onRename: (name: string) => void;
  onDelete: () => void;
}) {
  const [hover, setHover] = useState(false);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(project.name);

  const commit = () => {
    const v = draft.trim();
    if (v && v !== project.name) onRename(v);
    else setDraft(project.name);
    setEditing(false);
  };

  return (
    <div
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
        {project._count.prompts} prompt{project._count.prompts === 1 ? "" : "s"} ·{" "}
        {project._count.todos} todo{project._count.todos === 1 ? "" : "s"}
      </span>

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
