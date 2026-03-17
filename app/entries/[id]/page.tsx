"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Settings2, Maximize2, Minimize2 } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import type { Editor } from "@tiptap/react";
import { IMWEditor, IMWReadView, WriteControlsDrawer } from "@/components/editor";
import { useIMWTheme } from "@/components/ThemeProvider";
import { LINE_WIDTH_VALUES } from "@/lib/theme";
import { parseEntryContent, extractPlainText } from "@/lib/tiptap-content";

type JournalEntry = {
  id: string;
  content: string;
  mood?: string | null;
  tags: string[];
  createdAt: string;
  updatedAt: string;
  userId: string;
};

const CATEGORIES = [
  "Executive Function",
  "Sensory Processing",
  "Social/Communication",
  "Emotional Dysregulation",
  "Functional Impairment",
  "Masking/Coping",
  "Workplace/Academic",
  "Medical/Clinical",
];

function formatDate(iso: string) {
  return new Date(iso).toLocaleString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatShortDate(iso: string) {
  return new Date(iso).toLocaleString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

export default function EntryPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [entry, setEntry] = useState<JournalEntry | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  // Edit state
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState("");
  const [editMood, setEditMood] = useState("");
  const [saving, setSaving] = useState(false);

  // Delete state
  const [deleting, setDeleting] = useState(false);

  // Drawer + editor instance
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editorInstance, setEditorInstance] = useState<Editor | null>(null);

  const { prefs, setDeepWriteDefault } = useIMWTheme();
  const [isDeepWrite, setIsDeepWrite] = useState(false);
  const resolvedLineWidth =
    LINE_WIDTH_VALUES[prefs.editorLineWidth as keyof typeof LINE_WIDTH_VALUES] ?? "640px";

  useEffect(() => {
    async function fetchEntry() {
      try {
        const res = await fetch(`/api/entries/${id}`);
        if (res.status === 404) {
          setNotFound(true);
          return;
        }
        if (!res.ok) throw new Error("Failed to fetch entry");
        const data = await res.json();
        setEntry(data);
        setEditMood(data.mood ?? "");
      } catch {
        setNotFound(true);
      } finally {
        setLoading(false);
      }
    }
    fetchEntry();
  }, [id]);

  function enterDeepWrite() {
    setIsDeepWrite(true);
    document.documentElement.classList.add("imw-deep-write-active");
    document.documentElement.requestFullscreen().catch(() => {});
    setDeepWriteDefault(true);
  }

  function exitDeepWrite() {
    setIsDeepWrite(false);
    document.documentElement.classList.remove("imw-deep-write-active");
    if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
    setDeepWriteDefault(false);
  }

  // Sync when browser exits fullscreen (Escape key)
  useEffect(() => {
    function handleFullscreenChange() {
      if (!document.fullscreenElement && isDeepWrite) {
        setIsDeepWrite(false);
        document.documentElement.classList.remove("imw-deep-write-active");
      }
    }
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, [isDeepWrite]);

  // Clean up deep write class when navigating away
  useEffect(() => {
    return () => { document.documentElement.classList.remove("imw-deep-write-active"); };
  }, []);

  async function handleSave() {
    if (!entry) return;

    // Validate rich content has text
    let hasText = false;
    try {
      hasText = extractPlainText(parseEntryContent(editContent)).trim().length > 0;
    } catch {
      hasText = editContent.trim().length > 0;
    }
    if (!hasText) return;

    setSaving(true);
    try {
      const res = await fetch(`/api/entries/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: editContent, mood: editMood || null }),
      });
      if (!res.ok) throw new Error("Failed to save");
      const updated = await res.json();
      setEntry(updated);
      setIsEditing(false);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    setDeleting(true);
    try {
      const res = await fetch(`/api/entries/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete");
      router.push("/");
    } finally {
      setDeleting(false);
    }
  }

  async function handleTagToggle(tag: string) {
    if (!entry) return;
    const newTags = entry.tags.includes(tag)
      ? entry.tags.filter((t) => t !== tag)
      : [...entry.tags, tag];
    setEntry({ ...entry, tags: newTags });
    await fetch(`/api/entries/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tags: newTags }),
    });
  }

  const wasEdited = entry && entry.updatedAt !== entry.createdAt;

  return (
    <div
      style={{
        minHeight: "100vh",
        backgroundColor: "var(--imw-bg-base)",
        padding: "40px 24px",
      }}
    >
      <div style={{ maxWidth: 720, margin: "0 auto" }}>

        <Link
          href="/"
          className="imw-deep-write-chrome"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            color: "var(--imw-ac)",
            textDecoration: "none",
            fontSize: 13,
            marginBottom: 32,
          }}
        >
          <ArrowLeft size={14} />
          Back to journal
        </Link>

        {loading && (
          <p className="imw-body" style={{ color: "var(--imw-text-tertiary)" }}>Loading…</p>
        )}

        {!loading && notFound && (
          <div>
            <p className="imw-body" style={{ color: "var(--imw-text-tertiary)", marginBottom: 8 }}>
              Entry not found.
            </p>
            <Link href="/" className="imw-body" style={{ color: "var(--imw-ac)", textDecoration: "underline" }}>
              Return to journal
            </Link>
          </div>
        )}

        {!loading && entry && (
          <div>
            {/* Header: date + actions */}
            <div
              style={{
                display: "flex",
                alignItems: "flex-start",
                justifyContent: "space-between",
                gap: 16,
                marginBottom: 24,
              }}
            >
              <div>
                <p className="imw-ui" style={{ color: "var(--imw-text-secondary)" }}>
                  {formatDate(entry.createdAt)}
                </p>
                {wasEdited && (
                  <p className="imw-caption" style={{ color: "var(--imw-text-tertiary)", marginTop: 2 }}>
                    Last edited {formatShortDate(entry.updatedAt)}
                  </p>
                )}
                {entry.mood && (
                  <p className="imw-caption" style={{ color: "var(--imw-text-tertiary)", marginTop: 4 }}>
                    mood: {entry.mood}
                  </p>
                )}
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
                <button
                  type="button"
                  className="imw-btn imw-btn--ghost imw-btn--sm"
                  onClick={() => setDrawerOpen(true)}
                  aria-label="Writing controls"
                >
                  <Settings2 size={14} />
                </button>
                <button
                  className="imw-btn imw-btn--ghost imw-btn--sm"
                  onClick={isDeepWrite ? exitDeepWrite : enterDeepWrite}
                  aria-label={isDeepWrite ? "Exit deep write" : "Deep write"}
                  title={isDeepWrite ? "Exit deep write" : "Deep write — full focus mode"}
                >
                  {isDeepWrite ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
                </button>
                <button
                  className="imw-btn imw-btn--ghost imw-btn--sm"
                  onClick={() => {
                    setEditContent(entry.content);
                    setIsEditing(true);
                  }}
                  disabled={isEditing || deleting}
                >
                  Edit
                </button>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <button
                      className="imw-btn imw-btn--ghost imw-btn--sm"
                      disabled={isEditing || deleting}
                    >
                      {deleting ? "Deleting…" : "Delete"}
                    </button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete this entry?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This cannot be undone.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={handleDelete}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      >
                        Delete
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </div>

            {/* Tag chips — hidden in deep write (conditional render avoids layout ghost) */}
            {!isDeepWrite && (
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 24 }}>
                {CATEGORIES.map((cat) => {
                  const selected = entry.tags.includes(cat);
                  return (
                    <Badge
                      key={cat}
                      variant={selected ? "default" : "outline"}
                      className="cursor-pointer select-none"
                      style={selected ? {
                        backgroundColor: "var(--imw-ac)",
                        borderColor: "var(--imw-ac)",
                        color: "#fff",
                      } : undefined}
                      onClick={() => handleTagToggle(cat)}
                    >
                      {cat}
                    </Badge>
                  );
                })}
              </div>
            )}

            {/* Entry content */}
            <div style={{ borderTop: "0.5px solid var(--imw-border-default)", paddingTop: 24 }}>
              {isEditing ? (
                <div>
                  <IMWEditor
                    initialContent={entry.content}
                    onChange={setEditContent}
                    onEditorReady={setEditorInstance}
                    fontSize={prefs.editorFontSize}
                    lineWidth={resolvedLineWidth}
                    disabled={saving}
                    autoFocus
                  />

                  <div
                    className="imw-deep-write-chrome"
                    style={{
                      display: "flex",
                      gap: 8,
                      justifyContent: "flex-end",
                      marginTop: 16,
                    }}
                  >
                    <button
                      onClick={() => {
                        setIsEditing(false);
                        setEditorInstance(null);
                      }}
                      disabled={saving}
                      className="imw-btn imw-btn--ghost"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleSave}
                      disabled={saving}
                      className="imw-btn imw-btn--primary"
                      style={{ opacity: saving ? 0.5 : 1 }}
                    >
                      {saving ? "Saving…" : "Save"}
                    </button>
                  </div>
                </div>
              ) : (
                // View mode — rich content renderer
                <IMWReadView
                  content={entry.content}
                  fontSize={prefs.editorFontSize}
                  lineWidth={resolvedLineWidth}
                />
              )}
            </div>
          </div>
        )}
      </div>

      {/* Writing controls drawer */}
      <WriteControlsDrawer
        isOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        editor={editorInstance}
        mood={editMood}
        onMoodChange={setEditMood}
      />
      {drawerOpen && (
        <div
          className="imw-drawer-backdrop"
          onClick={() => setDrawerOpen(false)}
          aria-hidden="true"
        />
      )}
    </div>
  );
}
