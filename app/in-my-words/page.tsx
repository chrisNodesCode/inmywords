"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useUser } from "@clerk/nextjs";
import type { AIAnalysisResult, AISuggestion } from "@/lib/types";
import { DSM_CRITERIA_IDS } from "@/lib/types";
import { useIMWTheme } from "@/components/ThemeProvider";

const devBypass = process.env.NEXT_PUBLIC_DEV_BYPASS_AUTH === "true";

// ── DSM criterion labels ───────────────────────────────────────────────────────

const DSM_LABELS: Record<string, string> = {
  A1: "Social-emotional reciprocity",
  A2: "Nonverbal communicative behaviors",
  A3: "Developing/maintaining/understanding relationships",
  B1: "Stereotyped or repetitive movements, speech, or object use",
  B2: "Insistence on sameness, inflexible routines",
  B3: "Highly restricted, fixated interests",
  B4: "Hyper or hyporeactivity to sensory input",
};

// ── Types ──────────────────────────────────────────────────────────────────────

type EntryRow = {
  id: string;
  title?: string | null;
  createdAt: string;
  aiSuggestions?: AIAnalysisResult | null;
  isChildhoodMemory: boolean;
  isFunctionalImpairment: boolean;
};

// ── Helpers ────────────────────────────────────────────────────────────────────

function formatShortDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function entryHasCriterion(entry: EntryRow, criterion: string): boolean {
  return entry.aiSuggestions?.dsmCriteria?.some((s) => s.category === criterion) ?? false;
}

function coverageCount(
  entries: EntryRow[],
  criterion: "A" | "B" | "C" | "D"
): number {
  if (criterion === "C") return entries.filter((e) => e.isChildhoodMemory).length;
  if (criterion === "D") return entries.filter((e) => e.isFunctionalImpairment).length;
  if (criterion === "A")
    return entries.filter((e) =>
      e.aiSuggestions?.dsmCriteria?.some((s) => ["A1", "A2", "A3"].includes(s.category))
    ).length;
  // B
  return entries.filter((e) =>
    e.aiSuggestions?.dsmCriteria?.some((s) => ["B1", "B2", "B3", "B4"].includes(s.category))
  ).length;
}

function stoplightColor(count: number): string {
  if (count === 0) return "#EF4444";
  if (count <= 2) return "#F59E0B";
  return "#22C55E";
}

// ── Small sub-components ───────────────────────────────────────────────────────

// Only rendered when ClerkProvider is available (i.e. not in dev bypass)
function ClerkFirstName() {
  const { user } = useUser();
  return <>{user?.firstName ?? null}</>;
}

function QualifierBadge({ label }: { label: string }) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        padding: "1px 5px",
        fontSize: 10,
        fontWeight: 600,
        borderRadius: 3,
        border: "0.5px solid var(--imw-border-medium)",
        color: "var(--imw-text-secondary)",
        letterSpacing: "0.04em",
      }}
    >
      {label}
    </span>
  );
}

// ── Stoplight rollup ───────────────────────────────────────────────────────────

function StoplightRollup({
  entries,
  firstName,
}: {
  entries: EntryRow[];
  firstName: string | null;
}) {
  const criteria = ["A", "B", "C", "D"] as const;
  const label = firstName ? `In ${firstName}'s words:` : "In your words:";

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 24,
        padding: "12px 16px",
        borderRadius: 6,
        border: "0.5px solid var(--imw-border-default)",
        background: "var(--imw-bg-sidebar)",
      }}
    >
      <span className="imw-ui-small" style={{ color: "var(--imw-text-secondary)", flexShrink: 0 }}>
        {label}
      </span>
      <div style={{ display: "flex", gap: 20 }}>
        {criteria.map((c) => {
          const count = coverageCount(entries, c);
          return (
            <div
              key={c}
              style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}
            >
              <span
                className="imw-label"
                style={{ color: "var(--imw-text-secondary)", fontSize: 11 }}
              >
                {c}
              </span>
              <span
                style={{
                  width: 10,
                  height: 10,
                  borderRadius: "50%",
                  background: stoplightColor(count),
                  flexShrink: 0,
                }}
                title={`${count} ${count === 1 ? "entry" : "entries"}`}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Accordion entry card ───────────────────────────────────────────────────────

function EntryCard({
  entry,
  criterion,
  fontFamily,
}: {
  entry: EntryRow;
  criterion: string;
  fontFamily: string;
}) {
  const suggestion = entry.aiSuggestions?.dsmCriteria?.find((s) => s.category === criterion);
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
            fontSize: 14,
            lineHeight: 1.55,
            color: "var(--imw-text-primary)",
            fontStyle: "italic",
          }}
        >
          "{suggestion.quote}"
        </blockquote>
      )}
      <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
        <Link
          href={`/entries/${entry.id}`}
          className="imw-ui-small"
          style={{ color: "var(--imw-ac)", textDecoration: "none" }}
        >
          {displayTitle}
        </Link>
        <span className="imw-caption" style={{ color: "var(--imw-text-tertiary)" }}>
          {formatShortDate(entry.createdAt)}
        </span>
        {entry.isChildhoodMemory && <QualifierBadge label="C" />}
        {entry.isFunctionalImpairment && <QualifierBadge label="D" />}
      </div>
    </div>
  );
}

// ── Criteria accordion ─────────────────────────────────────────────────────────

function CriteriaAccordion({ entries, fontFamily }: { entries: EntryRow[]; fontFamily: string }) {
  const [openSections, setOpenSections] = useState<Set<string>>(new Set());

  function toggleSection(id: string) {
    setOpenSections((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      {DSM_CRITERIA_IDS.map((criterion) => {
        const matchingEntries = entries.filter((e) => entryHasCriterion(e, criterion));
        const isOpen = openSections.has(criterion);
        const count = matchingEntries.length;

        return (
          <div
            key={criterion}
            style={{
              border: "0.5px solid var(--imw-border-default)",
              borderRadius: 6,
              overflow: "hidden",
            }}
          >
            <button
              onClick={() => toggleSection(criterion)}
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
                  {criterion}
                </span>
                <span className="imw-ui-small" style={{ color: "var(--imw-text-secondary)" }}>
                  — {DSM_LABELS[criterion]}
                </span>
                <span className="imw-caption" style={{ color: "var(--imw-text-tertiary)" }}>
                  ({count} {count === 1 ? "entry" : "entries"})
                </span>
              </span>
              <span
                style={{
                  color: "var(--imw-text-tertiary)",
                  fontSize: 12,
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
                {matchingEntries.length === 0 ? (
                  <p className="imw-caption" style={{ color: "var(--imw-text-tertiary)", margin: 0 }}>
                    No entries mapped here yet.
                  </p>
                ) : (
                  matchingEntries.map((entry) => (
                    <EntryCard
                      key={entry.id}
                      entry={entry}
                      criterion={criterion}
                      fontFamily={fontFamily}
                    />
                  ))
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── Coverage matrix ────────────────────────────────────────────────────────────

const ALL_MATRIX_COLS = [...DSM_CRITERIA_IDS, "C", "D"] as const;
type MatrixCol = (typeof ALL_MATRIX_COLS)[number];

function hasCriterionInMatrix(entry: EntryRow, col: MatrixCol): boolean {
  if (col === "C") return entry.isChildhoodMemory;
  if (col === "D") return entry.isFunctionalImpairment;
  return entryHasCriterion(entry, col);
}

function CoverageMatrix({ entries }: { entries: EntryRow[] }) {
  const relevant = entries.filter(
    (e) =>
      (e.aiSuggestions?.dsmCriteria?.length ?? 0) > 0 ||
      e.isChildhoodMemory ||
      e.isFunctionalImpairment
  );

  if (relevant.length === 0) {
    return (
      <p className="imw-caption" style={{ color: "var(--imw-text-tertiary)", margin: 0 }}>
        No entries with Eval Prep data yet. Analyze an entry to see it here.
      </p>
    );
  }

  return (
    <div style={{ overflowX: "auto" }}>
      <table
        style={{
          borderCollapse: "collapse",
          width: "100%",
          minWidth: 520,
          fontSize: 12,
        }}
      >
        <thead>
          <tr>
            <th
              style={{
                textAlign: "left",
                padding: "6px 10px",
                fontWeight: 500,
                color: "var(--imw-text-tertiary)",
                borderBottom: "0.5px solid var(--imw-border-default)",
                minWidth: 160,
                maxWidth: 200,
                position: "sticky",
                left: 0,
                background: "var(--imw-bg-base)",
              }}
            >
              entry
            </th>
            {ALL_MATRIX_COLS.map((col) => (
              <th
                key={col}
                style={{
                  padding: "6px 8px",
                  fontWeight: 500,
                  color: col === "C" || col === "D" ? "var(--imw-text-secondary)" : "var(--imw-text-tertiary)",
                  borderBottom: "0.5px solid var(--imw-border-default)",
                  textAlign: "center",
                  whiteSpace: "nowrap",
                }}
              >
                {col}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {relevant.map((entry, i) => {
            const displayTitle = entry.title ?? formatShortDate(entry.createdAt);
            return (
              <tr
                key={entry.id}
                style={{
                  borderBottom:
                    i < relevant.length - 1 ? "0.5px solid var(--imw-border-default)" : "none",
                }}
              >
                <td
                  style={{
                    padding: "7px 10px",
                    position: "sticky",
                    left: 0,
                    background: "var(--imw-bg-base)",
                    maxWidth: 200,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  <Link
                    href={`/entries/${entry.id}`}
                    style={{
                      color: "var(--imw-ac)",
                      textDecoration: "none",
                      fontSize: 12,
                    }}
                    title={displayTitle}
                  >
                    {displayTitle}
                  </Link>
                </td>
                {ALL_MATRIX_COLS.map((col) => (
                  <td
                    key={col}
                    style={{
                      padding: "7px 8px",
                      textAlign: "center",
                      color: hasCriterionInMatrix(entry, col)
                        ? "var(--imw-ac)"
                        : "var(--imw-border-medium)",
                    }}
                  >
                    {hasCriterionInMatrix(entry, col) ? "●" : "·"}
                  </td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ── Main page ──────────────────────────────────────────────────────────────────

export default function InMyWordsPage() {
  const [entries, setEntries] = useState<EntryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [firstName, setFirstName] = useState<string | null>(null);
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

  return (
    <div
      style={{
        minHeight: "100vh",
        backgroundColor: "var(--imw-bg-base)",
        padding: "0 24px 60px",
      }}
    >
      <div style={{ maxWidth: 720, margin: "0 auto" }}>

        {/* Page header */}
        <div style={{ paddingTop: 40, marginBottom: 32 }}>
          <h1 className="imw-h1" style={{ marginBottom: 6 }}>
            In My Words
          </h1>
          <p className="imw-caption" style={{ color: "var(--imw-text-tertiary)" }}>
            Your words, organized by pattern. Only a qualified clinician can diagnose.
          </p>
        </div>

        {loading ? (
          <p className="imw-body" style={{ color: "var(--imw-text-tertiary)" }}>Loading…</p>
        ) : (
          <>
            {/* IMW-45 — Stoplight rollup */}
            <section style={{ marginBottom: 32 }}>
              {devBypass ? (
                <StoplightRollup entries={entries} firstName={null} />
              ) : (
                <StoplightWithClerk entries={entries} onFirstName={setFirstName} />
              )}
            </section>

            {/* IMW-46 — Criteria accordion */}
            <section style={{ marginBottom: 32 }}>
              <h2
                className="imw-label"
                style={{ color: "var(--imw-text-tertiary)", marginBottom: 10 }}
              >
                by criterion
              </h2>
              <CriteriaAccordion entries={entries} fontFamily={fontFamily} />
            </section>

            {/* IMW-47 — Coverage matrix */}
            <section>
              <h2
                className="imw-label"
                style={{ color: "var(--imw-text-tertiary)", marginBottom: 10 }}
              >
                coverage matrix
              </h2>
              <CoverageMatrix entries={entries} />
            </section>
          </>
        )}
      </div>
    </div>
  );
}

// Separate component to load first name from Clerk without crashing in dev bypass
function StoplightWithClerk({
  entries,
  onFirstName,
}: {
  entries: EntryRow[];
  onFirstName: (name: string | null) => void;
}) {
  const { user, isLoaded } = useUser();

  useEffect(() => {
    if (isLoaded) onFirstName(user?.firstName ?? null);
  }, [isLoaded, user, onFirstName]);

  const firstName = isLoaded ? (user?.firstName ?? null) : null;
  return <StoplightRollup entries={entries} firstName={firstName} />;
}
