"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import Link from "next/link";
import { IMWEditor } from "@/components/editor";
import { parseEntryContent, extractPlainText, tiptapToMarkdown } from "@/lib/tiptap-content";
import { useDragReorder } from "@/app/chris/_lib/dragReorder";
import { Spinner } from "@/app/chris/_lib/Spinner";
import { FullscreenButton } from "@/app/chris/_lib/FullscreenButton";
import { ThemeControls } from "@/app/chris/_lib/ThemeControls";
import { useAutosave } from "@/app/chris/_lib/useAutosave";
import {
  PROJECT_ALL,
  PROJECT_UNASSIGNED,
  type ProjectFilterValue,
} from "@/app/chris/_lib/ProjectSelect";

// ── Types ───────────────────────────────────────────────────────────────────

type Channel = "slack" | "email" | "text";
type Status = "draft" | "response" | "final";
type Mode = "professional" | "dating" | "friends";

type Project = { id: string; name: string };

type Message = {
  id: string;
  channel: Channel;
  draft: string; // TipTap JSON
  response: string | null; // plain text
  finalDraft: string | null; // TipTap JSON
  status: Status;
  projectId: string | null;
  project: Project | null;
  createdAt: string;
  updatedAt: string;
};

type Preset = {
  id: string;
  key: Mode;
  label: string;
  prompt: string;
};

const CHANNELS: { value: Channel; label: string }[] = [
  { value: "slack", label: "Slack" },
  { value: "email", label: "Email" },
  { value: "text", label: "Text" },
];

// Mode metadata is duplicated client-side on purpose: lib/translate-message.ts
// pulls in server-only code (the Anthropic client), so it must not be imported
// here. Prompt text lives in the DB and is loaded via /chris/api/message-presets.
const MODES: { value: Mode; label: string; blurb: string }[] = [
  { value: "professional", label: "Professional", blurb: "Neurodivergent → neurotypical, professional workplace" },
  { value: "dating", label: "Dating", blurb: "Messages to women on dating apps" },
  { value: "friends", label: "Friends", blurb: "Casual messages to friends" },
];

const ALL_CHANNELS = "__all_channels__";
const ALL_STATUSES = "__all_statuses__";

const STATUSES: { value: Status; label: string; color: string }[] = [
  { value: "draft", label: "Draft", color: "var(--pg-text-dim)" },
  { value: "response", label: "Suggested", color: "#60a5fa" },
  { value: "final", label: "Final", color: "#34d399" },
];

// ── Palette (shared with the rest of the playground) ─────────────────────────

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
  danger: "#e0736a",
  suggest: "#60a5fa",
};
const MONO = 'ui-monospace, SFMono-Regular, "SF Mono", Menlo, monospace';
const LAST_CHANNEL_KEY = "chris.messages.lastChannel";
const LAST_STATUS_KEY = "chris.messages.lastStatusFilter";
const LAST_MODE_KEY = "chris.messages.mode";
const LAST_PROJECT_KEY = "chris.messages.lastProjectId";

// ── Helpers ──────────────────────────────────────────────────────────────────

function previewJSON(content: string, max = 220): string {
  try {
    return extractPlainText(parseEntryContent(content)).slice(0, max);
  } catch {
    return content.slice(0, max);
  }
}

function isJSONEmpty(content: string): boolean {
  return previewJSON(content, 500).trim().length === 0;
}

function statusInfo(s: Status) {
  return STATUSES.find((x) => x.value === s) ?? STATUSES[0];
}

function formatRelative(iso: string): string {
  const d = new Date(iso);
  const mins = Math.floor((Date.now() - d.getTime()) / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

// ── Channel segmented control ────────────────────────────────────────────────

function ChannelToggle({
  value,
  onChange,
  size = "md",
}: {
  value: Channel;
  onChange: (c: Channel) => void;
  size?: "sm" | "md";
}) {
  const pad = size === "sm" ? "4px 10px" : "6px 14px";
  const fs = size === "sm" ? 12 : 13;
  return (
    <div
      style={{
        display: "inline-flex",
        border: `1px solid ${C.border}`,
        borderRadius: 999,
        padding: 2,
        gap: 2,
        background: C.bg,
      }}
    >
      {CHANNELS.map((ch) => {
        const active = ch.value === value;
        return (
          <button
            key={ch.value}
            onClick={() => onChange(ch.value)}
            style={{
              border: "none",
              borderRadius: 999,
              padding: pad,
              fontSize: fs,
              fontFamily: MONO,
              cursor: "pointer",
              background: active ? C.accent : "transparent",
              color: active ? C.accentText : C.textDim,
              fontWeight: active ? 600 : 400,
              transition: "background 0.12s ease, color 0.12s ease",
            }}
          >
            {ch.label}
          </button>
        );
      })}
    </div>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default function MessagesPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);

  // Composer
  const [draftContent, setDraftContent] = useState("");
  const [channel, setChannel] = useState<Channel>("email");
  const [editorKey, setEditorKey] = useState(0);
  const [busy, setBusy] = useState(false);

  // Persona presets + active mode
  const [presets, setPresets] = useState<Preset[]>([]);
  const [mode, setModeState] = useState<Mode>("professional");
  const setMode = useCallback((m: Mode) => {
    setModeState(m);
    if (typeof window !== "undefined") localStorage.setItem(LAST_MODE_KEY, m);
  }, []);
  const [modalOpen, setModalOpen] = useState(false);

  const [editingId, setEditingId] = useState<string | null>(null);

  const transitionTo = (apply: () => void) => {
    const doc = document as unknown as { startViewTransition?: (cb: () => void) => unknown };
    if (typeof document !== "undefined" && doc.startViewTransition) doc.startViewTransition(apply);
    else apply();
  };
  const expandEdit = (id: string) => transitionTo(() => setEditingId(id));
  const collapseEdit = () => transitionTo(() => setEditingId(null));

  const [channelFilter, setChannelFilterState] = useState(ALL_CHANNELS);
  const setChannelFilter = useCallback((v: string) => {
    setChannelFilterState(v);
    if (typeof window !== "undefined") localStorage.setItem(LAST_CHANNEL_KEY, v);
  }, []);
  const [statusFilter, setStatusFilterState] = useState(ALL_STATUSES);
  const setStatusFilter = useCallback((v: string) => {
    setStatusFilterState(v);
    if (typeof window !== "undefined") localStorage.setItem(LAST_STATUS_KEY, v);
  }, []);

  const [projects, setProjects] = useState<Project[]>([]);
  const [projectFilter, setProjectFilterState] = useState<ProjectFilterValue>(PROJECT_ALL);
  const setProjectFilter = useCallback((v: ProjectFilterValue) => {
    setProjectFilterState(v);
    if (typeof window !== "undefined") localStorage.setItem(LAST_PROJECT_KEY, v);
  }, []);
  const activeProjectId =
    projectFilter === PROJECT_ALL || projectFilter === PROJECT_UNASSIGNED ? null : projectFilter;

  // Load
  useEffect(() => {
    (async () => {
      try {
        const [msgRes, presetRes, projRes] = await Promise.all([
          fetch("/chris/api/messages"),
          fetch("/chris/api/message-presets"),
          fetch("/chris/api/projects"),
        ]);
        const data = await msgRes.json();
        setMessages(data.messages ?? []);
        const pdata = await presetRes.json();
        setPresets(pdata.presets ?? []);
        const projData = await projRes.json();
        const loadedProjects: Project[] = (projData.projects ?? []).map(
          (p: { id: string; name: string }) => ({ id: p.id, name: p.name })
        );
        setProjects(loadedProjects);

        const savedProject = localStorage.getItem(LAST_PROJECT_KEY);
        if (
          savedProject === PROJECT_ALL ||
          savedProject === PROJECT_UNASSIGNED ||
          (savedProject && loadedProjects.some((p) => p.id === savedProject))
        ) {
          setProjectFilterState(savedProject as ProjectFilterValue);
        }

        const savedChannel = localStorage.getItem(LAST_CHANNEL_KEY);
        if (savedChannel === ALL_CHANNELS || CHANNELS.some((c) => c.value === savedChannel)) {
          setChannelFilterState(savedChannel!);
        }
        const savedStatus = localStorage.getItem(LAST_STATUS_KEY);
        if (savedStatus === ALL_STATUSES || STATUSES.some((s) => s.value === savedStatus)) {
          setStatusFilterState(savedStatus!);
        }
        const savedMode = localStorage.getItem(LAST_MODE_KEY);
        if (savedMode && MODES.some((m) => m.value === savedMode)) {
          setModeState(savedMode as Mode);
        }
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const savePreset = async (id: string, body: { prompt?: string; reset?: boolean }) => {
    const res = await fetch(`/chris/api/message-presets/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) return null;
    const { preset } = await res.json();
    setPresets((prev) => prev.map((p) => (p.id === id ? preset : p)));
    return preset as Preset;
  };

  // ── Actions ────────────────────────────────────────────────────────────────

  const upsertLocal = (msg: Message) =>
    setMessages((prev) => {
      const exists = prev.some((m) => m.id === msg.id);
      return exists ? prev.map((m) => (m.id === msg.id ? msg : m)) : [msg, ...prev];
    });

  // Create a draft from the composer. Returns the new message (or null).
  const createDraft = async (): Promise<Message | null> => {
    if (isJSONEmpty(draftContent)) return null;
    const res = await fetch("/chris/api/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ draft: draftContent, channel, projectId: activeProjectId }),
    });
    if (!res.ok) return null;
    const { message } = await res.json();
    upsertLocal(message);
    return message;
  };

  const resetComposer = () => {
    setDraftContent("");
    setEditorKey((k) => k + 1);
  };

  // Save draft only (no translation).
  const handleSaveDraft = async () => {
    setBusy(true);
    try {
      const msg = await createDraft();
      if (msg) resetComposer();
    } finally {
      setBusy(false);
    }
  };

  // Save the draft AND translate it, then open the workspace on the result.
  const handleGetSuggestion = async () => {
    setBusy(true);
    try {
      const msg = await createDraft();
      if (!msg) return;
      resetComposer();
      const translated = await translate(msg.id, channel);
      expandEdit(translated?.id ?? msg.id);
    } finally {
      setBusy(false);
    }
  };

  // Ask Claude to translate the stored draft (optionally for a new channel).
  // Persists draft edits passed in first so the rewrite reflects them.
  const translate = async (
    id: string,
    forChannel: Channel,
    draftOverride?: string
  ): Promise<Message | null> => {
    if (draftOverride !== undefined) {
      await fetch(`/chris/api/messages/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ draft: draftOverride, channel: forChannel }),
      });
    }
    const res = await fetch(`/chris/api/messages/${id}/translate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ channel: forChannel, mode }),
    });
    if (!res.ok) return null;
    const { message } = await res.json();
    upsertLocal(message);
    return message;
  };

  const patchMessage = async (
    id: string,
    body: { draft?: string; finalDraft?: string | null; channel?: Channel; status?: Status }
  ): Promise<Message | null> => {
    const res = await fetch(`/chris/api/messages/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) return null;
    const { message } = await res.json();
    upsertLocal(message);
    return message;
  };

  const deleteMessage = async (id: string) => {
    setMessages((prev) => prev.filter((m) => m.id !== id));
    await fetch(`/chris/api/messages/${id}`, { method: "DELETE" });
  };

  // ── Derived ──────────────────────────────────────────────────────────────

  const filtered = useMemo(() => {
    let list = messages;
    if (channelFilter !== ALL_CHANNELS) list = list.filter((m) => m.channel === channelFilter);
    if (statusFilter !== ALL_STATUSES) list = list.filter((m) => m.status === statusFilter);
    if (projectFilter === PROJECT_UNASSIGNED) list = list.filter((m) => !m.projectId);
    else if (projectFilter !== PROJECT_ALL) list = list.filter((m) => m.projectId === projectFilter);
    return list;
  }, [messages, channelFilter, statusFilter, projectFilter]);

  const draftEmpty = isJSONEmpty(draftContent);

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <main style={{ maxWidth: 720, margin: "0 auto", padding: "0 24px 96px" }}>
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
          <span style={{ color: C.text }}>messages</span>
        </Link>
        <div style={{ display: "inline-flex", alignItems: "center", gap: 12 }}>
          <span style={{ fontFamily: MONO, fontSize: 12, color: C.textFaint }}>
            {messages.length} message{messages.length === 1 ? "" : "s"}
          </span>
          <ThemeControls />
          <FullscreenButton />
        </div>
      </header>

      {/* Composer — hidden while a workspace is open */}
      {editingId === null && (
        <section style={{ marginTop: 28 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              flexWrap: "wrap",
              gap: 10,
              marginBottom: 12,
            }}
          >
            <ModeSelect value={mode} onChange={setMode} />
            <ChannelToggle value={channel} onChange={setChannel} />
            <div style={{ flex: 1 }} />
            <button
              onClick={() => setModalOpen(true)}
              title="View & edit the prompts sent to Claude"
              style={{
                border: `1px solid ${C.border}`,
                background: "transparent",
                color: C.textDim,
                borderRadius: 999,
                padding: "6px 12px",
                fontSize: 12,
                cursor: "pointer",
                fontFamily: MONO,
              }}
            >
              ✎ edit prompts
            </button>
          </div>

          <div
            className="chris-editor-wrap"
            style={{
              background: C.card,
              border: `1px solid ${C.border}`,
              borderRadius: 14,
              padding: "20px 22px 8px",
              minHeight: 168,
            }}
          >
            <IMWEditor
              key={editorKey}
              placeholder="Just get it out — write the message however it comes. We'll smooth how it lands."
              fontSize={16}
              lineWidth="100%"
              onChange={setDraftContent}
              autoFocus={false}
            />
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 4px 0" }}>
            <div style={{ flex: 1 }} />
            <button
              onClick={handleSaveDraft}
              disabled={draftEmpty || busy}
              style={{
                border: `1px solid ${C.border}`,
                borderRadius: 10,
                background: "transparent",
                color: draftEmpty || busy ? C.textFaint : C.textDim,
                fontSize: 13.5,
                padding: "9px 14px",
                cursor: draftEmpty || busy ? "default" : "pointer",
                fontFamily: MONO,
              }}
            >
              save draft
            </button>
            <button
              onClick={handleGetSuggestion}
              disabled={draftEmpty || busy}
              style={{
                border: "none",
                borderRadius: 10,
                background: draftEmpty || busy ? C.border : C.accent,
                color: draftEmpty || busy ? C.textFaint : C.accentText,
                fontWeight: 600,
                fontSize: 14,
                padding: "10px 18px",
                cursor: draftEmpty || busy ? "default" : "pointer",
              }}
            >
              {busy ? "thinking…" : "Get suggestion →"}
            </button>
          </div>

          {/* Filters */}
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              alignItems: "center",
              gap: 10,
              padding: "16px 4px 0",
            }}
          >
            <FilterSelect
              value={channelFilter}
              onChange={setChannelFilter}
              options={[
                { value: ALL_CHANNELS, label: "All Channels" },
                ...CHANNELS.map((c) => ({ value: c.value, label: c.label })),
              ]}
            />
            <FilterSelect
              value={statusFilter}
              onChange={setStatusFilter}
              color={
                statusFilter === ALL_STATUSES
                  ? C.text
                  : statusInfo(statusFilter as Status).color
              }
              options={[
                { value: ALL_STATUSES, label: "All Stages" },
                ...STATUSES.map((s) => ({ value: s.value, label: s.label })),
              ]}
            />
            <FilterSelect
              value={projectFilter}
              onChange={(v) => setProjectFilter(v as ProjectFilterValue)}
              options={[
                { value: PROJECT_ALL, label: "All Projects" },
                { value: PROJECT_UNASSIGNED, label: "Unassigned" },
                ...projects.map((p) => ({ value: p.id, label: p.name })),
              ]}
            />
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
          </div>
        </section>
      )}

      {/* Feed */}
      <section style={{ marginTop: editingId === null ? 30 : 28 }}>
        {loading ? (
          <Spinner label="loading…" />
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: "center", padding: "48px 0", color: C.textFaint }}>
            <p style={{ margin: 0, fontSize: 14 }}>
              No messages yet. Draft one above and get a suggestion.
            </p>
          </div>
        ) : (
          <MessageFeed
            messages={filtered}
            editingId={editingId}
            modeLabel={MODES.find((m) => m.value === mode)?.label ?? ""}
            onEdit={expandEdit}
            onCancelEdit={collapseEdit}
            onTranslate={translate}
            onPatch={patchMessage}
            onDelete={deleteMessage}
            applyReorder={(orderedIds) => {
              setMessages((prev) => {
                const inOrder = orderedIds
                  .map((id) => prev.find((m) => m.id === id)!)
                  .filter(Boolean);
                const others = prev.filter((m) => !orderedIds.includes(m.id));
                return [...inOrder, ...others];
              });
              void fetch("/chris/api/messages/reorder", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ ids: orderedIds }),
              });
            }}
          />
        )}
      </section>

      {modalOpen && (
        <PromptModal
          presets={presets}
          activeMode={mode}
          onSave={(id, prompt) => savePreset(id, { prompt })}
          onReset={(id) => savePreset(id, { reset: true })}
          onClose={() => setModalOpen(false)}
        />
      )}
    </main>
  );
}

// ── Mode select (persona picker) ─────────────────────────────────────────────

function ModeSelect({ value, onChange }: { value: Mode; onChange: (m: Mode) => void }) {
  const active = MODES.find((m) => m.value === value);
  return (
    <label
      title={active?.blurb}
      style={{ display: "inline-flex", alignItems: "center", gap: 7 }}
    >
      <span style={{ fontFamily: MONO, fontSize: 11, color: C.textFaint }}>mode</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as Mode)}
        style={{
          background: C.card,
          border: `1px solid ${C.accent}66`,
          borderRadius: 999,
          color: C.accent,
          fontSize: 13,
          fontFamily: MONO,
          fontWeight: 600,
          padding: "6px 30px 6px 13px",
          cursor: "pointer",
          outline: "none",
          appearance: "none",
          backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6'%3E%3Cpath d='M0 0l5 6 5-6z' fill='%23c9a86a'/%3E%3C/svg%3E")`,
          backgroundRepeat: "no-repeat",
          backgroundPosition: "right 12px center",
        }}
      >
        {MODES.map((m) => (
          <option key={m.value} value={m.value}>
            {m.label}
          </option>
        ))}
      </select>
    </label>
  );
}

// ── Prompt editor modal ──────────────────────────────────────────────────────

function PromptModal({
  presets,
  activeMode,
  onSave,
  onReset,
  onClose,
}: {
  presets: Preset[];
  activeMode: Mode;
  onSave: (id: string, prompt: string) => Promise<Preset | null>;
  onReset: (id: string) => Promise<Preset | null>;
  onClose: () => void;
}) {
  // Which mode's prompt is being viewed in the modal (starts on the active one).
  const [tab, setTab] = useState<Mode>(activeMode);
  const current = useMemo(
    () => presets.find((p) => p.key === tab) ?? null,
    [presets, tab]
  );
  const [draft, setDraft] = useState(current?.prompt ?? "");
  const [savedFlash, setSavedFlash] = useState(false);
  const [working, setWorking] = useState(false);

  // Re-seed the textarea whenever the tab (or its stored prompt) changes.
  useEffect(() => {
    setDraft(current?.prompt ?? "");
  }, [current?.id, current?.prompt]);

  // Close on Escape.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const dirty = current ? draft !== current.prompt : false;
  const modeMeta = MODES.find((m) => m.value === tab);

  const flash = () => {
    setSavedFlash(true);
    setTimeout(() => setSavedFlash(false), 1400);
  };

  // Autosave edits to the active preset prompt (only when actually changed).
  useAutosave([draft], () => {
    if (current && draft !== current.prompt) {
      void onSave(current.id, draft).then((u) => u && flash());
    }
  });

  const handleSave = async () => {
    if (!current || !dirty || working) return;
    setWorking(true);
    try {
      const updated = await onSave(current.id, draft);
      if (updated) flash();
    } finally {
      setWorking(false);
    }
  };

  const handleReset = async () => {
    if (!current || working) return;
    setWorking(true);
    try {
      const updated = await onReset(current.id);
      if (updated) {
        setDraft(updated.prompt);
        flash();
      }
    } finally {
      setWorking(false);
    }
  };

  return (
    <div
      onMouseDown={onClose}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.6)",
        display: "grid",
        placeItems: "center",
        padding: 24,
        zIndex: 100,
      }}
    >
      <div
        onMouseDown={(e) => e.stopPropagation()}
        style={{
          width: "min(680px, 100%)",
          maxHeight: "88vh",
          display: "flex",
          flexDirection: "column",
          background: C.card,
          border: `1px solid ${C.border}`,
          borderRadius: 16,
          overflow: "hidden",
          boxShadow: "0 24px 64px rgba(0,0,0,0.5)",
        }}
      >
        {/* Header */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            padding: "16px 18px",
            borderBottom: `1px solid ${C.border}`,
          }}
        >
          <span style={{ fontSize: 15, fontWeight: 600, color: C.text }}>
            Translation prompts
          </span>
          <span style={{ fontFamily: MONO, fontSize: 11, color: C.textFaint }}>
            sent to Claude with your draft
          </span>
          <div style={{ flex: 1 }} />
          <button
            onClick={onClose}
            aria-label="Close"
            style={{
              border: "none",
              background: "transparent",
              color: C.textDim,
              cursor: "pointer",
              fontSize: 18,
              lineHeight: 1,
              padding: 4,
            }}
          >
            ×
          </button>
        </div>

        {/* Mode tabs */}
        <div style={{ display: "flex", gap: 6, padding: "12px 18px 0" }}>
          {MODES.map((m) => {
            const on = m.value === tab;
            return (
              <button
                key={m.value}
                onClick={() => setTab(m.value)}
                style={{
                  border: `1px solid ${on ? C.accent : C.border}`,
                  background: on ? `${C.accent}1a` : "transparent",
                  color: on ? C.accent : C.textDim,
                  borderRadius: 999,
                  padding: "6px 14px",
                  fontSize: 12.5,
                  fontFamily: MONO,
                  fontWeight: on ? 600 : 400,
                  cursor: "pointer",
                }}
              >
                {m.label}
              </button>
            );
          })}
        </div>

        {/* Body */}
        <div style={{ padding: "12px 18px 0", overflowY: "auto" }}>
          <p style={{ margin: "4px 0 10px", fontSize: 12.5, color: C.textFaint, lineHeight: 1.5 }}>
            {modeMeta?.blurb}. This text is the system prompt sent with your draft.
            The selected channel (Slack / Email / Text) is appended as a short delivery-medium note.
          </p>
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            spellCheck={false}
            style={{
              width: "100%",
              minHeight: 280,
              resize: "vertical",
              background: C.bg,
              border: `1px solid ${C.border}`,
              borderRadius: 10,
              color: C.text,
              fontFamily: MONO,
              fontSize: 12.5,
              lineHeight: 1.6,
              padding: "12px 14px",
              outline: "none",
            }}
          />
        </div>

        {/* Footer actions */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            padding: "14px 18px",
          }}
        >
          <button
            onClick={handleReset}
            disabled={working}
            style={{
              border: `1px solid ${C.border}`,
              background: "transparent",
              color: C.textDim,
              borderRadius: 10,
              padding: "8px 14px",
              fontSize: 12.5,
              fontFamily: MONO,
              cursor: working ? "default" : "pointer",
            }}
          >
            reset to default
          </button>
          <span
            style={{
              fontFamily: MONO,
              fontSize: 11.5,
              color: savedFlash ? C.suggest : C.textFaint,
            }}
          >
            {savedFlash ? "saved ✓" : dirty ? "unsaved changes" : ""}
          </span>
          <div style={{ flex: 1 }} />
          <button
            onClick={onClose}
            style={{
              border: "none",
              background: "transparent",
              color: C.textDim,
              cursor: "pointer",
              fontFamily: MONO,
              fontSize: 12.5,
              padding: "8px 10px",
            }}
          >
            close
          </button>
          <button
            onClick={handleSave}
            disabled={!dirty || working}
            style={{
              border: "none",
              borderRadius: 10,
              background: !dirty || working ? C.border : C.accent,
              color: !dirty || working ? C.textFaint : C.accentText,
              fontWeight: 600,
              fontSize: 13,
              padding: "8px 18px",
              cursor: !dirty || working ? "default" : "pointer",
            }}
          >
            {working ? "saving…" : "Save prompt"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Filter select (matches prompts styling) ──────────────────────────────────

function FilterSelect({
  value,
  onChange,
  options,
  color = C.text,
}: {
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
  color?: string;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      style={{
        background: C.card,
        border: `1px solid ${C.border}`,
        borderRadius: 8,
        color,
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
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}

// ── Feed ─────────────────────────────────────────────────────────────────────

function MessageFeed({
  messages,
  editingId,
  modeLabel,
  onEdit,
  onCancelEdit,
  onTranslate,
  onPatch,
  onDelete,
  applyReorder,
}: {
  messages: Message[];
  editingId: string | null;
  modeLabel: string;
  onEdit: (id: string) => void;
  onCancelEdit: () => void;
  onTranslate: (id: string, channel: Channel, draftOverride?: string) => Promise<Message | null>;
  onPatch: (
    id: string,
    body: { draft?: string; finalDraft?: string | null; channel?: Channel; status?: Status }
  ) => Promise<Message | null>;
  onDelete: (id: string) => void;
  applyReorder: (orderedIds: string[]) => void;
}) {
  const { rowProps, rowStyle } = useDragReorder(messages, (next) =>
    applyReorder(next.map((m) => m.id))
  );
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {messages.map((m) =>
        editingId === m.id ? (
          <MessageWorkspace
            key={m.id}
            message={m}
            modeLabel={modeLabel}
            onTranslate={onTranslate}
            onPatch={onPatch}
            onClose={onCancelEdit}
            onDelete={() => {
              onDelete(m.id);
              onCancelEdit();
            }}
          />
        ) : (
          <MessageRow
            key={m.id}
            message={m}
            dragProps={rowProps(m.id)}
            dragStyle={rowStyle(m.id)}
            onOpen={() => onEdit(m.id)}
            onDelete={() => onDelete(m.id)}
          />
        )
      )}
    </div>
  );
}

// ── Collapsed row ────────────────────────────────────────────────────────────

function MessageRow({
  message,
  dragProps,
  dragStyle,
  onOpen,
  onDelete,
}: {
  message: Message;
  dragProps: React.HTMLAttributes<HTMLDivElement> & { draggable?: boolean };
  dragStyle: React.CSSProperties;
  onOpen: () => void;
  onDelete: () => void;
}) {
  const [hover, setHover] = useState(false);
  const [copied, setCopied] = useState(false);
  const si = statusInfo(message.status);
  const channelLabel = CHANNELS.find((c) => c.value === message.channel)?.label ?? message.channel;

  // Show the most advanced stage available.
  const { label: stageLabel, text } = useMemo(() => {
    if (message.finalDraft && !isJSONEmpty(message.finalDraft))
      return { label: "final draft", text: previewJSON(message.finalDraft, 200) };
    if (message.response) return { label: "suggested", text: message.response.slice(0, 200) };
    return { label: "your draft", text: previewJSON(message.draft, 200) };
  }, [message]);

  const copyText = useMemo(() => {
    if (message.finalDraft && !isJSONEmpty(message.finalDraft)) return tiptapToMarkdown(message.finalDraft);
    if (message.response) return message.response;
    return tiptapToMarkdown(message.draft);
  }, [message]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(copyText);
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    } catch {
      /* ignore */
    }
  };

  return (
    <div
      {...dragProps}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        position: "relative",
        border: `1px solid ${C.border}`,
        borderRadius: 12,
        background: hover ? C.cardHover : C.card,
        padding: "14px 16px",
        transition: "background 0.12s ease",
        viewTransitionName: `message-${message.id}`,
        ...dragStyle,
      } as React.CSSProperties}
    >
      {/* Header chips */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 9 }}>
        <span
          style={{
            fontFamily: MONO,
            fontSize: 11,
            color: C.textDim,
            border: `1px solid ${C.border}`,
            borderRadius: 999,
            padding: "2px 9px",
          }}
        >
          {channelLabel}
        </span>
        <span
          style={{
            fontSize: 11,
            fontFamily: MONO,
            color: si.color,
            border: `1px solid ${si.color}44`,
            background: `${si.color}15`,
            borderRadius: 999,
            padding: "2px 9px",
          }}
        >
          {si.label}
        </span>
        {message.project && (
          <span
            style={{
              fontSize: 11,
              color: C.textDim,
              border: `1px solid ${C.border}`,
              borderRadius: 999,
              padding: "2px 9px",
            }}
          >
            <span style={{ color: C.accent, marginRight: 4 }}>◆</span>
            {message.project.name}
          </span>
        )}
        <div style={{ flex: 1 }} />
        <span style={{ fontFamily: MONO, fontSize: 11, color: C.textFaint }}>
          {formatRelative(message.updatedAt)}
        </span>
      </div>

      {/* Body */}
      <div onClick={onOpen} title="Open workspace" style={{ cursor: "pointer" }}>
        <span
          style={{
            fontFamily: MONO,
            fontSize: 10,
            letterSpacing: "0.06em",
            textTransform: "uppercase",
            color: C.textFaint,
          }}
        >
          {stageLabel}
        </span>
        <div
          style={{
            fontSize: 14,
            lineHeight: 1.55,
            color: C.text,
            marginTop: 4,
            wordBreak: "break-word",
          }}
        >
          {text}
          {text.length >= 200 && <span style={{ color: C.textFaint }}> …</span>}
        </div>
      </div>

      {/* Footer actions */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 12 }}>
        <button
          onClick={onOpen}
          style={{
            border: `1px solid ${C.border}`,
            background: "transparent",
            color: C.textDim,
            borderRadius: 999,
            padding: "4px 12px",
            fontSize: 12,
            cursor: "pointer",
            fontFamily: MONO,
          }}
        >
          open →
        </button>
        <div style={{ flex: 1 }} />
        <button
          onClick={handleCopy}
          style={{
            border: "none",
            background: "transparent",
            color: copied ? C.accent : C.textFaint,
            cursor: "pointer",
            fontFamily: MONO,
            fontSize: 11.5,
            padding: "3px 6px",
            opacity: hover || copied ? 1 : 0.6,
          }}
        >
          {copied ? "copied ✓" : "copy"}
        </button>
        <button
          onClick={onDelete}
          aria-label="Delete"
          style={{
            border: "none",
            background: "transparent",
            color: C.textFaint,
            cursor: "pointer",
            fontSize: 14,
            lineHeight: 1,
            padding: "3px 4px",
            opacity: hover ? 1 : 0,
            transition: "opacity 0.12s ease",
          }}
        >
          ×
        </button>
      </div>
    </div>
  );
}

// ── Expanded workspace — the draft → suggestion → final-draft flow ───────────

function StepHeader({ n, label, color }: { n: number; label: string; color: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
      <span
        style={{
          width: 22,
          height: 22,
          borderRadius: 999,
          display: "grid",
          placeItems: "center",
          fontFamily: MONO,
          fontSize: 11.5,
          fontWeight: 600,
          color: C.bg,
          background: color,
        }}
      >
        {n}
      </span>
      <span style={{ fontSize: 13.5, fontWeight: 600, color: C.text }}>{label}</span>
    </div>
  );
}

function MessageWorkspace({
  message,
  modeLabel,
  onTranslate,
  onPatch,
  onClose,
  onDelete,
}: {
  message: Message;
  modeLabel: string;
  onTranslate: (id: string, channel: Channel, draftOverride?: string) => Promise<Message | null>;
  onPatch: (
    id: string,
    body: { draft?: string; finalDraft?: string | null; channel?: Channel; status?: Status }
  ) => Promise<Message | null>;
  onClose: () => void;
  onDelete: () => void;
}) {
  const [channel, setChannel] = useState<Channel>(message.channel);
  const [draft, setDraft] = useState(message.draft);
  const [response, setResponse] = useState<string | null>(message.response);

  // Final-draft editor is seeded from finalDraft, or from the suggestion when
  // the writer clicks "Use as final draft". Remount via key to re-seed.
  const [finalSeed, setFinalSeed] = useState(message.finalDraft ?? "");
  const [finalContent, setFinalContent] = useState(message.finalDraft ?? "");
  const [finalKey, setFinalKey] = useState(0);

  const [translating, setTranslating] = useState(false);
  const [savingFinal, setSavingFinal] = useState(false);
  const [respCopied, setRespCopied] = useState(false);
  const [finalCopied, setFinalCopied] = useState(false);

  const draftDirty = draft !== message.draft || channel !== message.channel;

  const runTranslate = async () => {
    setTranslating(true);
    try {
      const updated = await onTranslate(message.id, channel, draftDirty ? draft : undefined);
      if (updated) setResponse(updated.response);
    } finally {
      setTranslating(false);
    }
  };

  const useAsFinal = () => {
    if (!response) return;
    setFinalSeed(response);
    setFinalContent(response);
    setFinalKey((k) => k + 1);
  };

  // Autosave draft / final-draft / channel edits; Save also closes the workspace.
  useAutosave([draft, finalContent, channel], () => {
    void onPatch(message.id, { draft, finalDraft: finalContent, channel });
  });

  const saveFinal = async () => {
    setSavingFinal(true);
    try {
      await onPatch(message.id, { draft, finalDraft: finalContent, channel });
      onClose();
    } finally {
      setSavingFinal(false);
    }
  };

  const copy = async (text: string, which: "resp" | "final") => {
    try {
      await navigator.clipboard.writeText(text);
      if (which === "resp") {
        setRespCopied(true);
        setTimeout(() => setRespCopied(false), 1200);
      } else {
        setFinalCopied(true);
        setTimeout(() => setFinalCopied(false), 1200);
      }
    } catch {
      /* ignore */
    }
  };

  const responseParas = useMemo(
    () => (response ?? "").split(/\n{2,}/).map((p) => p.trim()).filter(Boolean),
    [response]
  );
  const finalEmpty = isJSONEmpty(finalContent);

  return (
    <div
      className="chris-editor-wrap"
      style={{
        position: "relative",
        background: C.card,
        border: `1px solid ${C.accent}55`,
        borderRadius: 14,
        padding: "18px 20px 16px",
        viewTransitionName: `message-${message.id}`,
      } as React.CSSProperties}
    >
      {/* Top bar: channel + close */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
        <ChannelToggle value={channel} onChange={setChannel} size="sm" />
        <div style={{ flex: 1 }} />
        <button
          onClick={onDelete}
          style={{
            border: "none",
            background: "transparent",
            color: C.danger,
            cursor: "pointer",
            fontFamily: MONO,
            fontSize: 12,
            padding: "4px 8px",
          }}
        >
          delete
        </button>
        <button
          onClick={onClose}
          style={{
            border: "none",
            background: "transparent",
            color: C.textDim,
            cursor: "pointer",
            fontFamily: MONO,
            fontSize: 12,
            padding: "4px 8px",
          }}
        >
          close
        </button>
      </div>

      {/* Step 1 — Your draft */}
      <section style={{ marginBottom: 22 }}>
        <StepHeader n={1} label="Your draft" color={C.textDim} />
        <div
          style={{
            background: C.bg,
            border: `1px solid ${C.border}`,
            borderRadius: 12,
            padding: "12px 14px 2px",
          }}
        >
          <IMWEditor
            key={`draft-${message.id}`}
            initialContent={message.draft}
            placeholder="Write it however it comes…"
            fontSize={15}
            lineWidth="100%"
            onChange={setDraft}
            autoFocus={false}
          />
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 10 }}>
          <span style={{ fontFamily: MONO, fontSize: 11, color: C.textFaint }}>
            mode: <span style={{ color: C.accent }}>{modeLabel}</span>
          </span>
          <div style={{ flex: 1 }} />
          <button
            onClick={runTranslate}
            disabled={translating || isJSONEmpty(draft)}
            style={{
              border: "none",
              borderRadius: 10,
              background: translating || isJSONEmpty(draft) ? C.border : C.suggest,
              color: translating || isJSONEmpty(draft) ? C.textFaint : "#0a1420",
              fontWeight: 600,
              fontSize: 13,
              padding: "8px 16px",
              cursor: translating || isJSONEmpty(draft) ? "default" : "pointer",
            }}
          >
            {translating ? "translating…" : response ? "Regenerate suggestion" : "Get suggestion →"}
          </button>
        </div>
      </section>

      {/* Step 2 — Suggested rewrite */}
      <section style={{ marginBottom: 22 }}>
        <StepHeader n={2} label="Suggested rewrite — how it'll land" color={C.suggest} />
        {translating && !response ? (
          <div
            style={{
              border: `1px solid ${C.border}`,
              borderRadius: 12,
              padding: "18px 16px",
              color: C.textFaint,
              fontFamily: MONO,
              fontSize: 13,
            }}
          >
            reading the room…
          </div>
        ) : response ? (
          <div
            style={{
              border: `1px solid ${C.suggest}44`,
              background: `${C.suggest}0d`,
              borderRadius: 12,
              padding: "14px 16px",
            }}
          >
            {responseParas.map((p, i) => (
              <p
                key={i}
                style={{
                  margin: i === 0 ? 0 : "10px 0 0",
                  fontSize: 14.5,
                  lineHeight: 1.6,
                  color: C.text,
                  whiteSpace: "pre-wrap",
                  wordBreak: "break-word",
                }}
              >
                {p}
              </p>
            ))}
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 14 }}>
              <button
                onClick={useAsFinal}
                style={{
                  border: "none",
                  borderRadius: 10,
                  background: C.accent,
                  color: C.accentText,
                  fontWeight: 600,
                  fontSize: 12.5,
                  padding: "7px 14px",
                  cursor: "pointer",
                }}
              >
                Use as final draft ↓
              </button>
              <div style={{ flex: 1 }} />
              <button
                onClick={() => copy(response, "resp")}
                style={{
                  border: "none",
                  background: "transparent",
                  color: respCopied ? C.accent : C.textFaint,
                  cursor: "pointer",
                  fontFamily: MONO,
                  fontSize: 11.5,
                  padding: "3px 6px",
                }}
              >
                {respCopied ? "copied ✓" : "copy"}
              </button>
            </div>
          </div>
        ) : (
          <div
            style={{
              border: `1px dashed ${C.border}`,
              borderRadius: 12,
              padding: "16px",
              color: C.textFaint,
              fontSize: 13,
            }}
          >
            Get a suggestion above and Claude&apos;s neurotypical-professional rewrite shows up here.
          </div>
        )}
      </section>

      {/* Step 3 — Final draft */}
      <section>
        <StepHeader n={3} label="Final draft — make it yours" color={C.accent} />
        <div
          style={{
            background: C.bg,
            border: `1px solid ${C.border}`,
            borderRadius: 12,
            padding: "12px 14px 2px",
          }}
        >
          <IMWEditor
            key={`final-${message.id}-${finalKey}`}
            initialContent={finalSeed}
            placeholder="Edit the suggestion into your own send-ready message…"
            fontSize={15}
            lineWidth="100%"
            onChange={setFinalContent}
            autoFocus={false}
          />
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 10 }}>
          <button
            onClick={() => copy(tiptapToMarkdown(finalContent), "final")}
            disabled={finalEmpty}
            style={{
              border: `1px solid ${C.border}`,
              background: "transparent",
              color: finalEmpty ? C.textFaint : finalCopied ? C.accent : C.textDim,
              borderRadius: 10,
              padding: "8px 14px",
              fontSize: 12.5,
              cursor: finalEmpty ? "default" : "pointer",
              fontFamily: MONO,
            }}
          >
            {finalCopied ? "copied ✓" : "copy final"}
          </button>
          <div style={{ flex: 1 }} />
          <button
            onClick={saveFinal}
            disabled={savingFinal}
            style={{
              border: "none",
              borderRadius: 10,
              background: C.accent,
              color: C.accentText,
              fontWeight: 600,
              fontSize: 13,
              padding: "8px 18px",
              cursor: savingFinal ? "default" : "pointer",
            }}
          >
            {savingFinal ? "saving…" : "Save"}
          </button>
        </div>
      </section>
    </div>
  );
}
