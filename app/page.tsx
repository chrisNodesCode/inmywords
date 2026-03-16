"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";

type JournalEntry = {
  id: string;
  content: string;
  createdAt: string;
  updatedAt: string;
  userId: string;
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function truncate(text: string, max = 120) {
  return text.length > max ? text.slice(0, max).trimEnd() + "…" : text;
}

export default function JournalPage() {
  const [content, setContent] = useState("");
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchEntries = useCallback(async () => {
    try {
      const res = await fetch("/api/entries");
      if (!res.ok) throw new Error("Failed to fetch entries");
      const data = await res.json();
      setEntries(data);
    } catch (err) {
      setError("Could not load entries.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchEntries();
  }, [fetchEntries]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!content.trim()) return;

    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch("/api/entries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      });

      if (!res.ok) throw new Error("Failed to save entry");

      setContent("");
      await fetchEntries();
    } catch (err) {
      setError("Could not save entry. Please try again.");
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-background py-12 px-4">
      <div className="mx-auto max-w-2xl space-y-8">

        <div>
          <h1 className="text-2xl font-semibold tracking-tight">InMyWords</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Write it down. It happened.
          </p>
        </div>

        {/* Entry composer */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-medium">New entry</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-3">
              <Textarea
                placeholder="What happened? What did you notice?"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                rows={5}
                disabled={submitting}
              />
              {error && (
                <p className="text-sm text-destructive">{error}</p>
              )}
              <div className="flex justify-end">
                <Button type="submit" disabled={submitting || !content.trim()}>
                  {submitting ? "Saving…" : "Save entry"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Entry list */}
        <div className="space-y-3">
          <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
            Past entries
          </h2>

          {loading && (
            <p className="text-sm text-muted-foreground">Loading…</p>
          )}

          {!loading && entries.length === 0 && (
            <p className="text-sm text-muted-foreground">
              No entries yet. Write your first one above.
            </p>
          )}

          {entries.map((entry) => (
            <Card key={entry.id}>
              <CardContent className="pt-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">
                    {formatDate(entry.createdAt)}
                  </span>
                  <Badge variant="secondary" className="text-xs font-mono">
                    {entry.id.slice(-6)}
                  </Badge>
                </div>
                <p className="text-sm leading-relaxed">
                  {truncate(entry.content)}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>

      </div>
    </div>
  );
}
