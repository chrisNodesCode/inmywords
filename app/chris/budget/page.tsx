"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Spinner } from "@/app/chris/_lib/Spinner";
import { FullscreenButton } from "@/app/chris/_lib/FullscreenButton";
import { ThemeControls } from "@/app/chris/_lib/ThemeControls";

// ── Types (shape of GET /chris/api/budget/entries) ───────────────────────────

type Kind = "DEBIT" | "CREDIT";

type Category = { id: string; name: string; kind: Kind; color: string | null };

type Entry = {
  id: string;
  date: string;
  item: {
    id: string;
    name: string;
    amount: number;
    note: string | null;
    category: Category | null;
  };
};

// ── Palette ──────────────────────────────────────────────────────────────────

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
};
const MONO = 'ui-monospace, SFMono-Regular, "SF Mono", Menlo, monospace';

// Semantic, fixed across themes (like priority/mood colors elsewhere).
const CREDIT_COLOR = "#5aa17a"; // money in
const DEBIT_COLOR = "#e0736a"; // money out

// ── Helpers ──────────────────────────────────────────────────────────────────

const fmtMoney = (n: number) =>
  n.toLocaleString("en-US", { style: "currency", currency: "USD" });

const fmtSigned = (n: number) =>
  `${n < 0 ? "−" : "+"}${fmtMoney(Math.abs(n))}`;

// CREDIT adds, everything else (DEBIT / uncategorized) subtracts.
function signedAmount(e: Entry): number {
  const credit = e.item.category?.kind === "CREDIT";
  return credit ? e.item.amount : -e.item.amount;
}

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function monthKey(iso: string): string {
  return iso.slice(0, 7); // YYYY-MM
}
function monthLabel(key: string): string {
  const [y, m] = key.split("-");
  return `${MONTH_NAMES[Number(m) - 1]} ${y}`;
}
function fmtDay(iso: string): string {
  // Date-only; render in UTC to avoid TZ drift off the stored midnight.
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", {
    weekday: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}

type Row = { entry: Entry; amt: number; balance: number }; // balance = running through this row

type MonthGroup = {
  key: string;
  rows: Row[];
  net: number; // credits − debits within the month
  endBalance: number; // running balance through end of this month
};

// ── Page ─────────────────────────────────────────────────────────────────────

export default function BudgetPage() {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/chris/api/budget/entries");
      const data = await res.json();
      setEntries(data.entries ?? []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // Group by month (entries already date-ascending from the API) and accumulate
  // a running balance across the whole forecast.
  const { groups, total } = useMemo(() => {
    const map = new Map<string, Entry[]>();
    for (const e of entries) {
      const k = monthKey(e.date);
      const arr = map.get(k) ?? [];
      arr.push(e);
      map.set(k, arr);
    }
    let running = 0;
    const groups: MonthGroup[] = [];
    for (const key of Array.from(map.keys()).sort()) {
      const monthEntries = map.get(key)!;
      let net = 0;
      const rows: Row[] = monthEntries.map((entry) => {
        const amt = signedAmount(entry);
        net += amt;
        running += amt;
        return { entry, amt, balance: running };
      });
      groups.push({ key, rows, net, endBalance: running });
    }
    return { groups, total: running };
  }, [entries]);

  return (
    <main style={{ maxWidth: 880, margin: "0 auto", padding: "0 24px 96px" }}>
      {/* Top bar */}
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
          <span style={{ color: C.text }}>budget</span>
        </Link>
        <div style={{ display: "inline-flex", alignItems: "center", gap: 12 }}>
          {!loading && entries.length > 0 && (
            <span style={{ fontFamily: MONO, fontSize: 12, color: C.textFaint }}>
              net{" "}
              <span style={{ color: total < 0 ? DEBIT_COLOR : CREDIT_COLOR }}>{fmtSigned(total)}</span>
            </span>
          )}
          <ThemeControls />
          <FullscreenButton />
        </div>
      </header>

      <div style={{ marginTop: 28 }}>
        <h1 style={{ margin: "0 0 4px", fontSize: 22, fontWeight: 600, color: C.text, letterSpacing: "-0.01em" }}>
          Budget forecast
        </h1>
        <p style={{ margin: 0, fontSize: 13.5, color: C.textDim }}>
          Planned debits &amp; credits, grouped by month. Running balance carries across.
        </p>
      </div>

      {loading ? (
        <div style={{ marginTop: 32 }}>
          <Spinner label="loading…" />
        </div>
      ) : entries.length === 0 ? (
        <div style={{ textAlign: "center", padding: "72px 0", color: C.textFaint }}>
          <div style={{ fontSize: 28, marginBottom: 12 }}>$</div>
          <p style={{ margin: 0, fontSize: 14 }}>No budget entries yet.</p>
          <p style={{ margin: "6px 0 0", fontSize: 12.5 }}>
            Once your Airtable data is ported, the forecast shows here.
          </p>
        </div>
      ) : (
        <div style={{ marginTop: 24, display: "flex", flexDirection: "column", gap: 26 }}>
          {groups.map((g) => (
            <MonthBlock key={g.key} group={g} />
          ))}
        </div>
      )}
    </main>
  );
}

// ── Month block ───────────────────────────────────────────────────────────────

const GRID = "92px minmax(0, 1fr) auto 116px 128px";

function MonthBlock({ group }: { group: MonthGroup }) {
  return (
    <section>
      {/* Month header */}
      <div
        style={{
          display: "flex",
          alignItems: "baseline",
          justifyContent: "space-between",
          marginBottom: 8,
          paddingBottom: 6,
          borderBottom: `1px solid ${C.border}`,
        }}
      >
        <h2 style={{ margin: 0, fontSize: 15, fontWeight: 600, color: C.text }}>
          {monthLabel(group.key)}
        </h2>
        <div style={{ display: "inline-flex", alignItems: "baseline", gap: 14, fontFamily: MONO, fontSize: 12 }}>
          <span style={{ color: C.textFaint }}>
            net{" "}
            <span style={{ color: group.net < 0 ? DEBIT_COLOR : CREDIT_COLOR }}>{fmtSigned(group.net)}</span>
          </span>
          <span style={{ color: C.textFaint }}>
            bal{" "}
            <span style={{ color: group.endBalance < 0 ? DEBIT_COLOR : C.text }}>{fmtMoney(group.endBalance)}</span>
          </span>
        </div>
      </div>

      {/* Column headers */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: GRID,
          gap: 12,
          padding: "0 10px 6px",
          fontFamily: MONO,
          fontSize: 10,
          letterSpacing: "0.07em",
          textTransform: "uppercase",
          color: C.textFaint,
        }}
      >
        <span>Date</span>
        <span>Item</span>
        <span>Category</span>
        <span style={{ textAlign: "right" }}>Amount</span>
        <span style={{ textAlign: "right" }}>Balance</span>
      </div>

      {/* Rows */}
      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        {group.rows.map(({ entry: e, amt, balance: running }) => {
          const isCredit = amt >= 0;
          const cat = e.item.category;
          const chipColor = cat ? (cat.kind === "CREDIT" ? CREDIT_COLOR : DEBIT_COLOR) : C.textFaint;
          return (
            <div
              key={e.id}
              style={{
                display: "grid",
                gridTemplateColumns: GRID,
                gap: 12,
                alignItems: "center",
                border: `1px solid ${C.border}`,
                borderRadius: 10,
                background: C.card,
                padding: "10px 10px",
              }}
            >
              <span style={{ fontFamily: MONO, fontSize: 12, color: C.textDim }}>{fmtDay(e.date)}</span>
              <span
                style={{
                  fontSize: 13.5,
                  color: C.text,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
                title={e.item.note ? `${e.item.name} — ${e.item.note}` : e.item.name}
              >
                {e.item.name}
              </span>
              <span>
                {cat ? (
                  <span
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 6,
                      border: `1px solid ${C.border}`,
                      borderRadius: 999,
                      padding: "2px 9px",
                      fontSize: 11.5,
                      color: C.textDim,
                      whiteSpace: "nowrap",
                    }}
                  >
                    <span style={{ width: 7, height: 7, borderRadius: 999, background: chipColor }} />
                    {cat.name}
                  </span>
                ) : (
                  <span style={{ fontSize: 11.5, color: C.textFaint, fontStyle: "italic" }}>uncategorized</span>
                )}
              </span>
              <span
                style={{
                  textAlign: "right",
                  fontFamily: MONO,
                  fontSize: 13,
                  color: isCredit ? CREDIT_COLOR : DEBIT_COLOR,
                }}
              >
                {fmtSigned(amt)}
              </span>
              <span
                style={{
                  textAlign: "right",
                  fontFamily: MONO,
                  fontSize: 13,
                  color: running < 0 ? DEBIT_COLOR : C.textDim,
                }}
              >
                {fmtMoney(running)}
              </span>
            </div>
          );
        })}
      </div>
    </section>
  );
}
