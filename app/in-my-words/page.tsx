"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import type { AIAnalysisResult, TagQuoteMap, TagQuote } from "@/lib/types";
import { CATEGORIES } from "@/lib/theme";
import { useIMWTheme } from "@/components/ThemeProvider";

// ── Types ──────────────────────────────────────────────────────────────────────

type EntryRow = {
  id: string;
  title?: string | null;
  createdAt: string;
  tags: string[];
  aiSuggestions?: AIAnalysisResult | null;
  tagQuotes?: TagQuoteMap | null;
};

// ── Helpers ────────────────────────────────────────────────────────────────────

function formatShortDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function getTagQuote(entry: EntryRow, catId: string): TagQuote | undefined {
  return entry.tagQuotes?.[catId] ?? undefined;
}

// ── Entry card ─────────────────────────────────────────────────────────────────

function EntryCard({
  entry,
  catId,
  fontFamily,
}: {
  entry: EntryRow;
  catId: string;
  fontFamily: string;
}) {
  const suggestion = getTagQuote(entry, catId);
  const displayTitle = entry.title ?? formatShortDate(entry.createdAt);

  return (
    <div
      style={{
        padding: "12px 14px",
        borderRadius: 4,
        border: "0.5px solid var(--imw-border-default)",
        background: "var(--imw-bg-base)",
      }}
    >
      {suggestion?.quote && (
        <blockquote
          style={{
            margin: "0 0 8px",
            padding: "0 0 0 10px",
            borderLeft: "2px solid var(--imw-border-medium)",
            fontFamily,
            fontSize: "1rem",
            lineHeight: 1.65,
            color: "var(--imw-text-primary)",
            fontStyle: "italic",
          }}
        >
          &ldquo;{suggestion.quote}&rdquo;
        </blockquote>
      )}
      <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
        <Link
          href={`/entries/${entry.id}`}
          style={{
            fontFamily: "var(--imw-font-ui)",
            fontSize: "0.7rem",
            fontWeight: 600,
            color: "var(--imw-ac-d)",
            textDecoration: "none",
          }}
        >
          {displayTitle}
        </Link>
        <span className="imw-caption" style={{ color: "var(--imw-text-tertiary)" }}>
          {formatShortDate(entry.createdAt)}
        </span>
        {suggestion?.rationale && (
          <span
            title={suggestion.rationale}
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              width: 14,
              height: 14,
              fontSize: "0.6rem",
              color: "var(--imw-text-tertiary)",
              cursor: "default",
              flexShrink: 0,
            }}
            aria-label="Reasoning"
          >
            ⓘ
          </span>
        )}
      </div>
    </div>
  );
}

// ── Tag accordion ──────────────────────────────────────────────────────────────

function TagAccordion({ entries, fontFamily }: { entries: EntryRow[]; fontFamily: string }) {
  const [openSections, setOpenSections] = useState<Set<string>>(new Set());

  function toggleSection(id: string) {
    setOpenSections((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  // Only show categories that have at least one confirmed entry
  const activeCategories = CATEGORIES.filter((cat) =>
    entries.some((e) => e.tags.includes(cat.id))
  );

  if (activeCategories.length === 0) {
    return (
      <p className="imw-body" style={{ color: "var(--imw-text-tertiary)", margin: 0 }}>
        No tagged entries yet. Analyze an entry to see patterns here.
      </p>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      {activeCategories.map((cat) => {
        const matchingEntries = entries.filter((e) => e.tags.includes(cat.id));
        const isOpen = openSections.has(cat.id);
        const count = matchingEntries.length;

        return (
          <div
            key={cat.id}
            style={{
              border: "0.5px solid var(--imw-border-default)",
              borderRadius: 6,
              overflow: "hidden",
            }}
          >
            <button
              onClick={() => toggleSection(cat.id)}
              style={{
                width: "100%",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "10px 14px",
                background: isOpen ? "var(--imw-bg-sidebar)" : "transparent",
                border: "none",
                cursor: "pointer",
                textAlign: "left",
                gap: 8,
              }}
            >
              <span style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
                <span
                  className="imw-ui-small"
                  style={{ fontWeight: 600, color: "var(--imw-text-primary)" }}
                >
                  {cat.label}
                </span>
                <span className="imw-caption" style={{ color: "var(--imw-text-tertiary)" }}>
                  ({count} {count === 1 ? "entry" : "entries"})
                </span>
              </span>
              <span
                style={{
                  color: "var(--imw-text-tertiary)",
                  fontSize: "0.7rem",
                  transform: isOpen ? "rotate(180deg)" : "none",
                  transition: "transform 0.15s",
                  flexShrink: 0,
                }}
              >
                ▾
              </span>
            </button>

            {isOpen && (
              <div
                style={{
                  padding: "0 14px 12px",
                  display: "flex",
                  flexDirection: "column",
                  gap: 8,
                  background: "var(--imw-bg-sidebar)",
                }}
              >
                {matchingEntries.map((entry) => (
                  <EntryCard
                    key={entry.id}
                    entry={entry}
                    catId={cat.id}
                    fontFamily={fontFamily}
                  />
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── Main page ──────────────────────────────────────────────────────────────────

export default function InMyWordsPage() {
  const [entries, setEntries] = useState<EntryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const { prefs } = useIMWTheme();

  const fontFamily =
    prefs.font === "noto"
      ? '"Noto Serif", Georgia, serif'
      : prefs.font === "pt"
      ? '"PT Serif", Georgia, serif'
      : prefs.font === "open"
      ? '"Open Sans", Arial, sans-serif'
      : '"DejaVu Sans", Arial, sans-serif';

  useEffect(() => {
    async function fetchEntries() {
      try {
        const res = await fetch("/api/entries");
        if (res.ok) {
          const data = await res.json();
          setEntries(Array.isArray(data) ? data : []);
        }
      } finally {
        setLoading(false);
      }
    }
    fetchEntries();
  }, []);

  const taggedCount = entries.filter((e) => e.tags.length > 0).length;
  const patternCount = new Set(entries.flatMap((e) => e.tags)).size;
  const quotesCount = entries.reduce((sum, e) => {
    return sum + (e.aiSuggestions?.livedExperience?.filter((s) => s.quote?.trim()).length ?? 0);
  }, 0);

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        minHeight: "100vh",
        backgroundColor: "var(--imw-bg-base)",
      }}
    >
      {/* Top bar */}
      <div className="imw-top-bar imw-deep-write-chrome">
        <span
          style={{
            fontSize: "0.6rem",
            fontWeight: 600,
            letterSpacing: "0.16em",
            textTransform: "uppercase",
            color: "var(--imw-text-tertiary)",
            fontFamily: "var(--imw-font-ui)",
          }}
        >
          In My Words
        </span>
      </div>

      {/* Content well */}
      <div
        style={{
          padding: "0 24px 60px",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
        }}
      >
        <div style={{ width: "100%", maxWidth: 720 }}>

          {/* Page header */}
          <div style={{ paddingTop: 36, marginBottom: 32 }}>
            <span
              style={{
                display: "block",
                fontSize: "0.6rem",
                fontWeight: 600,
                letterSpacing: "0.16em",
                textTransform: "uppercase",
                color: "var(--imw-text-tertiary)",
                fontFamily: "var(--imw-font-ui)",
                marginBottom: 8,
              }}
            >
              Patterns · Your lived experience
            </span>
            <h1
              style={{
                fontFamily: "var(--imw-font-display)",
                fontWeight: 900,
                fontSize: "1.55rem",
                lineHeight: 1.1,
                color: "var(--imw-text-primary)",
                margin: "0 0 10px",
              }}
            >
              In My Words
            </h1>
            <p
              style={{
                fontFamily: "var(--imw-font-ui)",
                fontSize: "0.85rem",
                color: "var(--imw-text-secondary)",
                margin: "0 0 20px",
                lineHeight: 1.5,
              }}
            >
              Your journal, organized by the patterns that showed up. Only a qualified clinician can diagnose.
            </p>

            {/* Stats row */}
            {!loading && (
              <div
                style={{
                  display: "flex",
                  borderTop: "2px solid var(--imw-text-primary)",
                  paddingTop: 16,
                }}
              >
                {[
                  { value: entries.length, label: "Entries" },
                  { value: taggedCount, label: "With tags" },
                  { value: patternCount, label: "Patterns found" },
                  { value: quotesCount, label: "Quotes" },
                ].map((stat, i, arr) => (
                  <div
                    key={stat.label}
                    style={{
                      flex: 1,
                      paddingRight: 20,
                      borderRight:
                        i < arr.length - 1 ? "1px solid var(--imw-border-medium)" : "none",
                      paddingLeft: i > 0 ? 20 : 0,
                    }}
                  >
                    <div
                      style={{
                        fontFamily: "var(--imw-font-display)",
                        fontWeight: 900,
                        fontSize: "1.4rem",
                        color: "var(--imw-text-primary)",
                        lineHeight: 1.1,
                        marginBottom: 4,
                      }}
                    >
                      {stat.value}
                    </div>
                    <div
                      style={{
                        fontFamily: "var(--imw-font-ui)",
                        fontSize: "0.6rem",
                        fontWeight: 600,
                        letterSpacing: "0.08em",
                        textTransform: "uppercase",
                        color: "var(--imw-text-tertiary)",
                      }}
                    >
                      {stat.label}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {loading ? (
            <p className="imw-body" style={{ color: "var(--imw-text-tertiary)" }}>
              Loading…
            </p>
          ) : (
            <section>
              <h2
                style={{
                  fontFamily: "var(--imw-font-display)",
                  fontWeight: 900,
                  fontSize: "0.8rem",
                  letterSpacing: "0.04em",
                  textTransform: "uppercase",
                  color: "var(--imw-text-primary)",
                  paddingBottom: 8,
                  borderBottom: "2px solid var(--imw-text-primary)",
                  marginTop: 0,
                  marginBottom: 14,
                }}
              >
                By Pattern
              </h2>
              <TagAccordion entries={entries} fontFamily={fontFamily} />
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
