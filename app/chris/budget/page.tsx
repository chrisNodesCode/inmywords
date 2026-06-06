"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { SurfaceSwitcher } from "@/app/chris/_lib/SurfaceSwitcher";
import { Spinner } from "@/app/chris/_lib/Spinner";
import { FullscreenButton } from "@/app/chris/_lib/FullscreenButton";
import { ThemeControls } from "@/app/chris/_lib/ThemeControls";

// ── Types (shape of the budget API) ──────────────────────────────────────────

type Kind = "DEBIT" | "CREDIT";

type Category = { id: string; name: string; kind: Kind; color: string | null };
type CategoryRow = Category & { _count?: { items: number } };

type Item = {
  id: string;
  name: string;
  amount: number;
  note: string | null;
  category: Category | null;
  _count?: { entries: number };
};

type Entry = {
  id: string;
  date: string;
  paid: boolean;
  amountOverride: number | null; // null = use item.amount (canonical)
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
  accentText: "var(--pg-accent-text)",
};
const MONO = 'ui-monospace, SFMono-Regular, "SF Mono", Menlo, monospace';

// Semantic, fixed across themes.
const CREDIT_COLOR = "#5aa17a"; // money in
const DEBIT_COLOR = "#e0736a"; // money out

// ── Helpers ──────────────────────────────────────────────────────────────────

const fmtMoney = (n: number) =>
  n.toLocaleString("en-US", { style: "currency", currency: "USD" });
const fmtSigned = (n: number) => `${n < 0 ? "−" : "+"}${fmtMoney(Math.abs(n))}`;

// The amount actually used: an overridden occurrence wins over the item default.
function effectiveAmount(e: Entry): number {
  return e.amountOverride ?? e.item.amount;
}
// Checking view: credit adds, debit subtracts.
function signedAmount(e: Entry): number {
  const mag = effectiveAmount(e);
  return e.item.category?.kind === "CREDIT" ? mag : -mag;
}
// Savings view: a transfer INTO savings is stored as a checking debit, so the
// sign flips — a debit grows savings, a credit (withdrawal) shrinks it.
function savingsDelta(e: Entry): number {
  const mag = effectiveAmount(e);
  return e.item.category?.kind === "CREDIT" ? -mag : mag;
}
const SAVINGS_CATEGORY = "SAVINGS";
function kindColor(kind: Kind | undefined | null): string {
  return kind === "CREDIT" ? CREDIT_COLOR : DEBIT_COLOR;
}

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];
const monthKey = (iso: string) => iso.slice(0, 7);
function monthLabel(key: string): string {
  const [y, m] = key.split("-");
  return `${MONTH_NAMES[Number(m) - 1]} ${y}`;
}
function fmtDay(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    weekday: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}
function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

type Account = { id: string; key: string; label: string; balance: number; sortOrder: number };

type Row = { entry: Entry; amt: number; balance: number };
type MonthGroup = { key: string; rows: Row[]; net: number; endBalance: number };

// Group entries by month and walk a running balance from `start`, using `delta`
// for each entry's signed effect (differs between the checking & savings views).
function buildGroups(entries: Entry[], start: number, delta: (e: Entry) => number) {
  const map = new Map<string, Entry[]>();
  for (const e of entries) {
    const k = monthKey(e.date);
    const arr = map.get(k) ?? [];
    arr.push(e);
    map.set(k, arr);
  }
  let running = start;
  const groups: MonthGroup[] = [];
  for (const key of Array.from(map.keys()).sort()) {
    const monthEntries = map.get(key)!;
    let net = 0;
    const rows: Row[] = monthEntries.map((entry) => {
      const amt = delta(entry);
      net += amt;
      running += amt;
      return { entry, amt, balance: running };
    });
    groups.push({ key, rows, net, endBalance: running });
  }
  return { groups, end: running };
}

const TABS: { key: "calendar" | "savings"; label: string }[] = [
  { key: "calendar", label: "Calendar" },
  { key: "savings", label: "Savings" },
];
const TAB_KEY = "chris.budget.tab";

// ── Page ─────────────────────────────────────────────────────────────────────

export default function BudgetPage() {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [categories, setCategories] = useState<CategoryRow[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"calendar" | "savings">("calendar");

  // Modals
  const [entryModal, setEntryModal] = useState<Entry | "new" | null>(null);
  const [manageOpen, setManageOpen] = useState(false);

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    const saved = localStorage.getItem(TAB_KEY);
    if (saved === "calendar" || saved === "savings") setTab(saved);
  }, []);
  /* eslint-enable react-hooks/set-state-in-effect */
  const selectTab = (t: "calendar" | "savings") => {
    setTab(t);
    localStorage.setItem(TAB_KEY, t);
  };

  const reloadEntries = useCallback(async () => {
    const data = await (await fetch("/chris/api/budget/entries")).json();
    setEntries(data.entries ?? []);
  }, []);
  const reloadItems = useCallback(async () => {
    const data = await (await fetch("/chris/api/budget/items")).json();
    setItems(data.items ?? []);
  }, []);
  const reloadCategories = useCallback(async () => {
    const data = await (await fetch("/chris/api/budget/categories")).json();
    setCategories(data.categories ?? []);
  }, []);
  const reloadAccounts = useCallback(async () => {
    const data = await (await fetch("/chris/api/budget/accounts")).json();
    setAccounts(data.accounts ?? []);
  }, []);

  useEffect(() => {
    (async () => {
      await Promise.all([reloadEntries(), reloadItems(), reloadCategories(), reloadAccounts()]);
      setLoading(false);
    })();
  }, [reloadEntries, reloadItems, reloadCategories, reloadAccounts]);

  const accountBalance = (key: string) => accounts.find((a) => a.key === key)?.balance ?? 0;

  const saveAccount = async (key: string, balance: number) => {
    setAccounts((prev) => prev.map((a) => (a.key === key ? { ...a, balance } : a)));
    await fetch("/chris/api/budget/accounts", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key, balance }),
    });
    await reloadAccounts();
  };

  // ── Entry mutations ──
  const saveEntry = async (id: string | null, body: { date: string; itemId: string }) => {
    const url = id ? `/chris/api/budget/entries/${id}` : "/chris/api/budget/entries";
    await fetch(url, {
      method: id ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    await reloadEntries();
  };
  const deleteEntry = async (id: string) => {
    await fetch(`/chris/api/budget/entries/${id}`, { method: "DELETE" });
    await reloadEntries();
  };

  // Toggle paid status. The PATCH handler adjusts account balances server-side.
  const togglePaid = async (id: string, paid: boolean) => {
    // Optimistic update
    setEntries((prev) => prev.map((e) => (e.id === id ? { ...e, paid } : e)));
    await fetch(`/chris/api/budget/entries/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ paid }),
    });
    // Reload both entries and accounts (balances were adjusted server-side)
    await Promise.all([reloadEntries(), reloadAccounts()]);
  };

  // Set (number) or clear (null → relink to item default) one occurrence's amount.
  const setOverride = async (id: string, amountOverride: number | null) => {
    setEntries((prev) => prev.map((e) => (e.id === id ? { ...e, amountOverride } : e)));
    await fetch(`/chris/api/budget/entries/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ amountOverride }),
    });
    await reloadEntries();
  };

  // ── Item mutations (amounts/categories → refresh entries too) ──
  const saveItem = async (
    id: string | null,
    body: { name?: string; amount?: number; categoryId?: string | null }
  ) => {
    const url = id ? `/chris/api/budget/items/${id}` : "/chris/api/budget/items";
    await fetch(url, {
      method: id ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    await Promise.all([reloadItems(), reloadEntries()]);
  };
  const deleteItem = async (id: string) => {
    await fetch(`/chris/api/budget/items/${id}`, { method: "DELETE" });
    await Promise.all([reloadItems(), reloadEntries()]);
  };

  // ── Category mutations ──
  const saveCategory = async (
    id: string | null,
    body: { name?: string; kind?: Kind }
  ) => {
    const url = id ? `/chris/api/budget/categories/${id}` : "/chris/api/budget/categories";
    await fetch(url, {
      method: id ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    await Promise.all([reloadCategories(), reloadItems(), reloadEntries()]);
  };
  const deleteCategory = async (id: string) => {
    await fetch(`/chris/api/budget/categories/${id}`, { method: "DELETE" });
    await Promise.all([reloadCategories(), reloadItems(), reloadEntries()]);
  };

  const checking = accountBalance("checking");
  const savings = accountBalance("savings");

  const { groups, start, end } = useMemo(() => {
    if (tab === "savings") {
      const savingsEntries = entries.filter((e) => e.item.category?.name === SAVINGS_CATEGORY);
      const { groups, end } = buildGroups(savingsEntries, savings, savingsDelta);
      return { groups, start: savings, end };
    }
    const { groups, end } = buildGroups(entries, checking, signedAmount);
    return { groups, start: checking, end };
  }, [entries, tab, checking, savings]);

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
        <SurfaceSwitcher />
        <div style={{ display: "inline-flex", alignItems: "center", gap: 12 }}>
          {!loading && (
            <span style={{ fontFamily: MONO, fontSize: 12, color: C.textFaint }}>
              ending{" "}
              <span style={{ color: end < 0 ? DEBIT_COLOR : C.text }}>{fmtMoney(end)}</span>
            </span>
          )}
          <ThemeControls />
          <FullscreenButton />
        </div>
      </header>

      {/* Title + actions */}
      <div
        style={{
          marginTop: 28,
          display: "flex",
          alignItems: "flex-end",
          justifyContent: "space-between",
          gap: 12,
          flexWrap: "wrap",
        }}
      >
        <div>
          <h1 style={{ margin: "0 0 4px", fontSize: 22, fontWeight: 600, color: C.text, letterSpacing: "-0.01em" }}>
            Budget forecast
          </h1>
          <p style={{ margin: 0, fontSize: 13.5, color: C.textDim }}>
            Planned debits &amp; credits, grouped by month. Running balance carries across.
          </p>
        </div>
        <div style={{ display: "inline-flex", gap: 8 }}>
          <button onClick={() => setManageOpen(true)} style={ghostBtn}>
            Manage
          </button>
          <button onClick={() => setEntryModal("new")} style={primaryBtn}>
            + Entry
          </button>
        </div>
      </div>

      {/* Account cards */}
      {!loading && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 12, marginTop: 20 }}>
          {accounts.map((a) => (
            <AccountCard
              key={a.key}
              label={a.label}
              balance={a.balance}
              active={(tab === "savings" && a.key === "savings") || (tab === "calendar" && a.key === "checking")}
              onSave={(v) => saveAccount(a.key, v)}
            />
          ))}
        </div>
      )}

      {/* Tabs */}
      {!loading && (
        <div style={{ display: "flex", gap: 4, marginTop: 22, borderBottom: `1px solid ${C.border}` }}>
          {TABS.map((t) => {
            const on = tab === t.key;
            return (
              <button
                key={t.key}
                onClick={() => selectTab(t.key)}
                style={{
                  border: "none",
                  background: "transparent",
                  color: on ? C.text : C.textDim,
                  fontSize: 13.5,
                  fontWeight: on ? 600 : 400,
                  padding: "8px 14px",
                  cursor: "pointer",
                  borderBottom: `2px solid ${on ? "var(--pg-accent)" : "transparent"}`,
                  marginBottom: -1,
                }}
              >
                {t.label}
              </button>
            );
          })}
        </div>
      )}

      {loading ? (
        <div style={{ marginTop: 32 }}>
          <Spinner label="loading…" />
        </div>
      ) : groups.length === 0 ? (
        <div style={{ textAlign: "center", padding: "64px 0", color: C.textFaint }}>
          <div style={{ fontSize: 28, marginBottom: 12 }}>$</div>
          {tab === "savings" ? (
            <p style={{ margin: 0, fontSize: 13.5 }}>
              No savings activity yet. Line items in the <strong>{SAVINGS_CATEGORY}</strong> category show here.
            </p>
          ) : (
            <p style={{ margin: 0, fontSize: 14 }}>
              No budget entries yet. Add line items in{" "}
              <button onClick={() => setManageOpen(true)} style={linkBtn}>Manage</button>, then add an entry.
            </p>
          )}
        </div>
      ) : (
        <div style={{ marginTop: 20, display: "flex", flexDirection: "column", gap: 26 }}>
          <div style={{ fontFamily: MONO, fontSize: 11.5, color: C.textFaint, marginBottom: -10 }}>
            starting balance {fmtMoney(start)}
          </div>
          {groups.map((g) => (
            <MonthBlock
              key={g.key}
              group={g}
              onOpenEntry={(e) => setEntryModal(e)}
              onSetOverride={setOverride}
              onTogglePaid={togglePaid}
            />
          ))}
        </div>
      )}

      {entryModal && (
        <EntryModal
          entry={entryModal === "new" ? null : entryModal}
          items={items}
          onClose={() => setEntryModal(null)}
          onSave={async (body) => {
            await saveEntry(entryModal === "new" ? null : entryModal.id, body);
            setEntryModal(null);
          }}
          onDelete={
            entryModal === "new"
              ? undefined
              : async () => {
                  await deleteEntry(entryModal.id);
                  setEntryModal(null);
                }
          }
          onManage={() => {
            setEntryModal(null);
            setManageOpen(true);
          }}
        />
      )}

      {manageOpen && (
        <ManageModal
          categories={categories}
          items={items}
          onClose={() => setManageOpen(false)}
          onSaveCategory={saveCategory}
          onDeleteCategory={deleteCategory}
          onSaveItem={saveItem}
          onDeleteItem={deleteItem}
        />
      )}
    </main>
  );
}

// ── Month block ───────────────────────────────────────────────────────────────

const GRID = "28px 92px minmax(0, 1fr) auto 116px 128px";

function MonthBlock({
  group,
  onOpenEntry,
  onSetOverride,
  onTogglePaid,
}: {
  group: MonthGroup;
  onOpenEntry: (e: Entry) => void;
  onSetOverride: (id: string, amountOverride: number | null) => void;
  onTogglePaid: (id: string, paid: boolean) => void;
}) {
  return (
    <section>
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
        <h2 style={{ margin: 0, fontSize: 15, fontWeight: 600, color: C.text }}>{monthLabel(group.key)}</h2>
        <div style={{ display: "inline-flex", alignItems: "baseline", gap: 14, fontFamily: MONO, fontSize: 12 }}>
          <span style={{ color: C.textFaint }}>
            net <span style={{ color: group.net < 0 ? DEBIT_COLOR : CREDIT_COLOR }}>{fmtSigned(group.net)}</span>
          </span>
          <span style={{ color: C.textFaint }}>
            bal <span style={{ color: group.endBalance < 0 ? DEBIT_COLOR : C.text }}>{fmtMoney(group.endBalance)}</span>
          </span>
        </div>
      </div>

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
        <span /> {/* paid dot */}
        <span>Date</span>
        <span>Item</span>
        <span>Category</span>
        <span style={{ textAlign: "right" }}>Amount</span>
        <span style={{ textAlign: "right" }}>Balance</span>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        {group.rows.map(({ entry: e, amt, balance: running }) => {
          const isCredit = amt >= 0;
          const cat = e.item.category;
          const chip = cat ? kindColor(cat.kind) : C.textFaint;
          return (
            <div
              key={e.id}
              onClick={() => onOpenEntry(e)}
              role="button"
              tabIndex={0}
              onKeyDown={(ev) => {
                if (ev.key === "Enter" || ev.key === " ") {
                  ev.preventDefault();
                  onOpenEntry(e);
                }
              }}
              style={{
                display: "grid",
                gridTemplateColumns: GRID,
                gap: 12,
                alignItems: "center",
                border: `1px solid ${C.border}`,
                borderRadius: 10,
                background: C.card,
                padding: "10px 10px",
                cursor: "pointer",
                transition: "background 0.12s ease",
                opacity: e.paid ? 0.55 : 1,
              }}
              onMouseEnter={(ev) => (ev.currentTarget.style.background = C.cardHover)}
              onMouseLeave={(ev) => (ev.currentTarget.style.background = C.card)}
            >
              <PaidDot
                paid={e.paid}
                onToggle={(ev) => {
                  ev.stopPropagation();
                  onTogglePaid(e.id, !e.paid);
                }}
              />
              <span style={{ fontFamily: MONO, fontSize: 12, color: C.textDim }}>{fmtDay(e.date)}</span>
              <span
                style={{ fontSize: 13.5, color: C.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
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
                    <span style={{ width: 7, height: 7, borderRadius: 999, background: chip }} />
                    {cat.name}
                  </span>
                ) : (
                  <span style={{ fontSize: 11.5, color: C.textFaint, fontStyle: "italic" }}>uncategorized</span>
                )}
              </span>
              <InlineAmount
                magnitude={effectiveAmount(e)}
                signed={amt}
                isCredit={isCredit}
                isOverride={e.amountOverride != null}
                canonical={e.item.amount}
                onSet={(m) => onSetOverride(e.id, m)}
                onReset={() => onSetOverride(e.id, null)}
              />
              <span style={{ textAlign: "right", fontFamily: MONO, fontSize: 13, color: running < 0 ? DEBIT_COLOR : C.textDim }}>
                {fmtMoney(running)}
              </span>
            </div>
          );
        })}
      </div>
    </section>
  );
}

// ── Inline-editable amount cell (per-occurrence override) ────────────────────
// Clicking the amount edits just this occurrence. Any manual change delinks the
// value (sets amountOverride) — editing the item's canonical amount then no
// longer touches this row. The ↺ control relinks it to the item default.

function InlineAmount({
  magnitude,
  signed,
  isCredit,
  isOverride,
  canonical,
  onSet,
  onReset,
}: {
  magnitude: number;
  signed: number;
  isCredit: boolean;
  isOverride: boolean;
  canonical: number;
  onSet: (magnitude: number) => void;
  onReset: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(String(magnitude));
  const [dirty, setDirty] = useState(false);
  const [hover, setHover] = useState(false);
  const wrapRef = useRef<HTMLSpanElement>(null);
  const viaEnterRef = useRef(false);

  const begin = () => {
    setDraft(String(magnitude));
    setDirty(false);
    setEditing(true);
  };
  const commit = () => {
    setEditing(false);
    const viaEnter = viaEnterRef.current;
    viaEnterRef.current = false;
    if (dirty) {
      const n = parseFloat(draft.replace(/[^0-9.]/g, "")); // opened-but-untouched → no delink
      if (Number.isFinite(n)) onSet(n);
    }
    // Enter just saves; return focus to the row so a *second* Enter opens the
    // card. (Click-away blurs don't steal focus.)
    if (viaEnter) wrapRef.current?.closest<HTMLElement>('[role="button"]')?.focus();
  };

  const color = isCredit ? CREDIT_COLOR : DEBIT_COLOR;

  return (
    <span
      onClick={(e) => e.stopPropagation()}
      ref={wrapRef}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 5, minWidth: 0 }}
    >
      {editing ? (
        <input
          autoFocus
          value={draft}
          onChange={(e) => {
            setDraft(e.target.value);
            setDirty(true);
          }}
          onClick={(e) => e.stopPropagation()}
          onBlur={commit}
          onKeyDown={(e) => {
            // Keep keystrokes inside the input — don't let Enter/Space bubble to
            // the row, which would open the entry card.
            e.stopPropagation();
            if (e.key === "Enter") {
              viaEnterRef.current = true;
              (e.target as HTMLInputElement).blur();
            }
            if (e.key === "Escape") {
              setDirty(false);
              setEditing(false);
            }
          }}
          inputMode="decimal"
          style={{
            width: 84,
            textAlign: "right",
            background: C.bg,
            border: `1px solid ${C.accent}`,
            borderRadius: 7,
            outline: "none",
            color: C.text,
            fontFamily: MONO,
            fontSize: 13,
            padding: "3px 6px",
          }}
        />
      ) : (
        <>
          {isOverride && hover && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onReset();
              }}
              title={`Relink to item default (${fmtMoney(canonical)})`}
              aria-label="Relink to item default"
              style={{
                border: "none",
                background: "transparent",
                color: C.textFaint,
                cursor: "pointer",
                fontSize: 12,
                lineHeight: 1,
                padding: 0,
              }}
            >
              ↺
            </button>
          )}
          <button
            onClick={(e) => {
              e.stopPropagation();
              begin();
            }}
            title={
              isOverride
                ? `Overridden — item default is ${fmtMoney(canonical)}. Click to edit.`
                : "Click to override this occurrence's amount"
            }
            style={{
              border: "none",
              background: "transparent",
              cursor: "pointer",
              fontFamily: MONO,
              fontSize: 13,
              color,
              padding: "2px 0",
              borderBottom: isOverride ? `1px dotted ${color}` : "1px dotted transparent",
              display: "inline-flex",
              alignItems: "center",
              gap: 4,
            }}
          >
            {isOverride && (
              <span
                aria-hidden
                title="Overridden"
                style={{ width: 5, height: 5, borderRadius: 999, background: C.accent, flexShrink: 0 }}
              />
            )}
            {fmtSigned(signed)}
          </button>
        </>
      )}
    </span>
  );
}

// ── Paid indicator dot ────────────────────────────────────────────────────────

function PaidDot({ paid, onToggle }: { paid: boolean; onToggle: (e: React.MouseEvent) => void }) {
  const [hover, setHover] = useState(false);
  return (
    <button
      onClick={onToggle}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      aria-label={paid ? "Mark as unpaid" : "Mark as paid"}
      title={paid ? "Paid — click to unmark" : "Mark as paid"}
      style={{
        flexShrink: 0,
        width: 16,
        height: 16,
        borderRadius: 999,
        border: `1.5px solid ${paid ? "var(--pg-accent)" : hover ? "var(--pg-accent)" : C.border}`,
        background: paid ? "var(--pg-accent)" : "transparent",
        cursor: "pointer",
        display: "grid",
        placeItems: "center",
        padding: 0,
        transition: "border-color 0.12s ease, background 0.12s ease",
      }}
    >
      {paid && (
        <span aria-hidden style={{ fontSize: 9, color: "var(--pg-accent-text)", lineHeight: 1 }}>
          ✓
        </span>
      )}
    </button>
  );
}

// ── Account card (manually-tracked balance, editable) ────────────────────────

function AccountCard({
  label,
  balance,
  active,
  onSave,
}: {
  label: string;
  balance: number;
  active: boolean;
  onSave: (v: number) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(String(balance));

  const begin = () => {
    setDraft(String(balance));
    setEditing(true);
  };
  const commit = () => {
    setEditing(false);
    const n = parseFloat(draft.replace(/[^0-9.-]/g, ""));
    if (Number.isFinite(n) && n !== balance) onSave(n);
    else setDraft(String(balance));
  };

  return (
    <div
      style={{
        border: `1px solid ${active ? "var(--pg-accent)" : C.border}`,
        borderRadius: 14,
        background: active ? "color-mix(in srgb, var(--pg-accent) 6%, var(--pg-card))" : C.card,
        padding: "13px 16px 15px",
        display: "flex",
        flexDirection: "column",
        gap: 6,
        transition: "background 0.12s ease, border-color 0.12s ease",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <span
          style={{
            fontFamily: MONO,
            fontSize: 10.5,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            color: active ? "var(--pg-accent)" : C.textFaint,
          }}
        >
          {label}
        </span>
        <span style={{ fontFamily: MONO, fontSize: 9.5, color: C.textFaint }}>actual</span>
      </div>
      {editing ? (
        <input
          autoFocus
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === "Enter") (e.target as HTMLInputElement).blur();
            if (e.key === "Escape") {
              setDraft(String(balance));
              setEditing(false);
            }
          }}
          inputMode="decimal"
          style={{
            width: "100%",
            background: C.bg,
            border: `1px solid var(--pg-accent)`,
            borderRadius: 8,
            outline: "none",
            color: C.text,
            fontFamily: MONO,
            fontSize: 22,
            padding: "4px 8px",
          }}
        />
      ) : (
        <button
          onClick={begin}
          title="Edit balance"
          style={{
            border: "none",
            background: "transparent",
            textAlign: "left",
            cursor: "pointer",
            fontFamily: MONO,
            fontSize: 24,
            fontWeight: 600,
            color: balance < 0 ? DEBIT_COLOR : C.text,
            padding: 0,
          }}
        >
          {fmtMoney(balance)}
        </button>
      )}
    </div>
  );
}

// ── Shared modal overlay ──────────────────────────────────────────────────────

function Overlay({ onClose, children, maxWidth = 520 }: { onClose: () => void; children: React.ReactNode; maxWidth?: number }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);
  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 100,
        background: "rgba(0,0,0,0.55)",
        backdropFilter: "blur(3px)",
        WebkitBackdropFilter: "blur(3px)",
        display: "grid",
        placeItems: "center",
        padding: 24,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "100%",
          maxWidth,
          maxHeight: "86vh",
          overflowY: "auto",
          background: C.card,
          border: `1px solid ${C.border}`,
          borderRadius: 14,
          padding: "20px 22px 18px",
          boxShadow: "0 24px 60px rgba(0,0,0,0.55)",
        }}
      >
        {children}
      </div>
    </div>
  );
}

// ── Entry modal (create / edit one dated occurrence) ─────────────────────────

function EntryModal({
  entry,
  items,
  onClose,
  onSave,
  onDelete,
  onManage,
}: {
  entry: Entry | null;
  items: Item[];
  onClose: () => void;
  onSave: (body: { date: string; itemId: string }) => void | Promise<void>;
  onDelete?: () => void | Promise<void>;
  onManage: () => void;
}) {
  const [date, setDate] = useState(entry ? entry.date.slice(0, 10) : todayISO());
  const [itemId, setItemId] = useState(entry?.item.id ?? "");
  const [saving, setSaving] = useState(false);

  const selected = items.find((i) => i.id === itemId) ?? null;
  const signed = selected
    ? selected.category?.kind === "CREDIT" ? selected.amount : -selected.amount
    : 0;

  // Group items by category for the picker.
  const groups = useMemo(() => {
    const byCat = new Map<string, Item[]>();
    for (const it of items) {
      const k = it.category?.name ?? "Uncategorized";
      const arr = byCat.get(k) ?? [];
      arr.push(it);
      byCat.set(k, arr);
    }
    return Array.from(byCat.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  }, [items]);

  const save = async () => {
    if (!date || !itemId || saving) return;
    setSaving(true);
    try {
      await onSave({ date, itemId });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Overlay onClose={onClose} maxWidth={460}>
      <h2 style={{ margin: "0 0 16px", fontSize: 16, fontWeight: 600, color: C.text }}>
        {entry ? "Edit entry" : "Add entry"}
      </h2>

      <label style={labelStyle}>Date</label>
      <input
        type="date"
        value={date}
        onChange={(e) => setDate(e.target.value)}
        style={{ ...inputStyle, colorScheme: "dark", marginBottom: 14 }}
      />

      <label style={labelStyle}>Line item</label>
      {items.length === 0 ? (
        <p style={{ margin: "0 0 14px", fontSize: 13, color: C.textFaint }}>
          No line items yet —{" "}
          <button onClick={onManage} style={linkBtn}>add one in Manage</button>.
        </p>
      ) : (
        <select value={itemId} onChange={(e) => setItemId(e.target.value)} style={{ ...selectStyle, marginBottom: 10 }}>
          <option value="">Select an item…</option>
          {groups.map(([cat, list]) => (
            <optgroup key={cat} label={cat}>
              {list.map((it) => (
                <option key={it.id} value={it.id}>
                  {it.name} · {fmtMoney(it.amount)}
                </option>
              ))}
            </optgroup>
          ))}
        </select>
      )}

      {selected && (
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
          {selected.category && (
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
              }}
            >
              <span style={{ width: 7, height: 7, borderRadius: 999, background: kindColor(selected.category.kind) }} />
              {selected.category.name}
            </span>
          )}
          <span style={{ fontFamily: MONO, fontSize: 13, color: signed < 0 ? DEBIT_COLOR : CREDIT_COLOR }}>
            {fmtSigned(signed)}
          </span>
        </div>
      )}

      <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 20 }}>
        {onDelete && (
          <button
            onClick={onDelete}
            style={{ ...textBtn, color: DEBIT_COLOR }}
          >
            delete
          </button>
        )}
        <div style={{ flex: 1 }} />
        <button onClick={onClose} style={textBtn}>cancel</button>
        <button
          onClick={save}
          disabled={saving || !date || !itemId}
          style={{ ...primaryBtn, opacity: saving || !date || !itemId ? 0.5 : 1 }}
        >
          {saving ? "Saving…" : entry ? "Save" : "Add"}
        </button>
      </div>
    </Overlay>
  );
}

// ── Manage modal (categories + items) ────────────────────────────────────────

function ManageModal({
  categories,
  items,
  onClose,
  onSaveCategory,
  onDeleteCategory,
  onSaveItem,
  onDeleteItem,
}: {
  categories: CategoryRow[];
  items: Item[];
  onClose: () => void;
  onSaveCategory: (id: string | null, body: { name?: string; kind?: Kind }) => void | Promise<void>;
  onDeleteCategory: (id: string) => void | Promise<void>;
  onSaveItem: (id: string | null, body: { name?: string; amount?: number; categoryId?: string | null }) => void | Promise<void>;
  onDeleteItem: (id: string) => void | Promise<void>;
}) {
  const [tab, setTab] = useState<"items" | "categories">("items");

  return (
    <Overlay onClose={onClose} maxWidth={620}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
        <h2 style={{ margin: 0, fontSize: 16, fontWeight: 600, color: C.text }}>Manage</h2>
        <div style={{ display: "inline-flex", gap: 4, marginLeft: 4 }}>
          {(["items", "categories"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              style={{
                border: `1px solid ${tab === t ? C.accent : C.border}`,
                background: tab === t ? "color-mix(in srgb, var(--pg-accent) 12%, transparent)" : "transparent",
                color: tab === t ? C.text : C.textDim,
                borderRadius: 999,
                padding: "4px 12px",
                fontSize: 12.5,
                cursor: "pointer",
                textTransform: "capitalize",
              }}
            >
              {t}
            </button>
          ))}
        </div>
        <div style={{ flex: 1 }} />
        <button onClick={onClose} style={textBtn}>close</button>
      </div>

      {tab === "items" ? (
        <ItemsTab categories={categories} items={items} onSaveItem={onSaveItem} onDeleteItem={onDeleteItem} />
      ) : (
        <CategoriesTab categories={categories} onSaveCategory={onSaveCategory} onDeleteCategory={onDeleteCategory} />
      )}
    </Overlay>
  );
}

function ItemsTab({
  categories,
  items,
  onSaveItem,
  onDeleteItem,
}: {
  categories: CategoryRow[];
  items: Item[];
  onSaveItem: (id: string | null, body: { name?: string; amount?: number; categoryId?: string | null }) => void | Promise<void>;
  onDeleteItem: (id: string) => void | Promise<void>;
}) {
  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [categoryId, setCategoryId] = useState("");

  const add = async () => {
    const a = parseFloat(amount.replace(/[^0-9.-]/g, ""));
    if (!name.trim() || !Number.isFinite(a)) return;
    await onSaveItem(null, { name: name.trim(), amount: a, categoryId: categoryId || null });
    setName("");
    setAmount("");
    setCategoryId("");
  };

  return (
    <div>
      {/* Add row */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 92px 130px auto", gap: 8, marginBottom: 14 }}>
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="New item name" style={inputStyle} />
        <input value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="$0.00" inputMode="decimal" style={inputStyle} />
        <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)} style={selectStyle}>
          <option value="">No category</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
        <button onClick={add} disabled={!name.trim() || !amount.trim()} style={{ ...primaryBtn, opacity: !name.trim() || !amount.trim() ? 0.5 : 1 }}>
          Add
        </button>
      </div>

      {items.length === 0 ? (
        <p style={{ fontSize: 13, color: C.textFaint, margin: "8px 0" }}>No items yet.</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {items.map((it) => (
            <ItemRow key={it.id} item={it} categories={categories} onSave={onSaveItem} onDelete={onDeleteItem} />
          ))}
        </div>
      )}
    </div>
  );
}

function ItemRow({
  item,
  categories,
  onSave,
  onDelete,
}: {
  item: Item;
  categories: CategoryRow[];
  onSave: (id: string, body: { name?: string; amount?: number; categoryId?: string | null }) => void | Promise<void>;
  onDelete: (id: string) => void | Promise<void>;
}) {
  const [name, setName] = useState(item.name);
  const [amount, setAmount] = useState(String(item.amount));
  const count = item._count?.entries ?? 0;

  const commitName = () => {
    const v = name.trim();
    if (v && v !== item.name) onSave(item.id, { name: v });
    else setName(item.name);
  };
  const commitAmount = () => {
    const a = parseFloat(amount.replace(/[^0-9.-]/g, ""));
    if (Number.isFinite(a) && a !== item.amount) onSave(item.id, { amount: a });
    else setAmount(String(item.amount));
  };

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "1fr 92px 130px auto",
        gap: 8,
        alignItems: "center",
        border: `1px solid ${C.border}`,
        borderRadius: 9,
        background: C.bg,
        padding: 6,
      }}
    >
      <input value={name} onChange={(e) => setName(e.target.value)} onBlur={commitName} onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()} style={rowInput} />
      <input value={amount} onChange={(e) => setAmount(e.target.value)} onBlur={commitAmount} onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()} inputMode="decimal" style={{ ...rowInput, fontFamily: MONO }} />
      <select value={item.category?.id ?? ""} onChange={(e) => onSave(item.id, { categoryId: e.target.value || null })} style={{ ...rowInput, cursor: "pointer" }}>
        <option value="">No category</option>
        {categories.map((c) => (
          <option key={c.id} value={c.id}>{c.name}</option>
        ))}
      </select>
      <button
        onClick={() => {
          if (count > 0 && !confirm(`Delete "${item.name}" and its ${count} scheduled ${count === 1 ? "entry" : "entries"}?`)) return;
          onDelete(item.id);
        }}
        title={count > 0 ? `${count} entries — deleting removes them` : "Delete"}
        style={iconBtn}
      >
        ×
      </button>
    </div>
  );
}

function CategoriesTab({
  categories,
  onSaveCategory,
  onDeleteCategory,
}: {
  categories: CategoryRow[];
  onSaveCategory: (id: string | null, body: { name?: string; kind?: Kind }) => void | Promise<void>;
  onDeleteCategory: (id: string) => void | Promise<void>;
}) {
  const [name, setName] = useState("");
  const [kind, setKind] = useState<Kind>("DEBIT");

  const add = async () => {
    if (!name.trim()) return;
    await onSaveCategory(null, { name: name.trim(), kind });
    setName("");
    setKind("DEBIT");
  };

  return (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr auto auto", gap: 8, marginBottom: 14, alignItems: "center" }}>
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="New category name" style={inputStyle} />
        <KindToggle kind={kind} onChange={setKind} />
        <button onClick={add} disabled={!name.trim()} style={{ ...primaryBtn, opacity: !name.trim() ? 0.5 : 1 }}>Add</button>
      </div>

      {categories.length === 0 ? (
        <p style={{ fontSize: 13, color: C.textFaint, margin: "8px 0" }}>No categories yet.</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {categories.map((c) => (
            <CategoryRowEditor key={c.id} category={c} onSave={onSaveCategory} onDelete={onDeleteCategory} />
          ))}
        </div>
      )}
    </div>
  );
}

function CategoryRowEditor({
  category,
  onSave,
  onDelete,
}: {
  category: CategoryRow;
  onSave: (id: string, body: { name?: string; kind?: Kind }) => void | Promise<void>;
  onDelete: (id: string) => void | Promise<void>;
}) {
  const [name, setName] = useState(category.name);
  const count = category._count?.items ?? 0;

  const commitName = () => {
    const v = name.trim();
    if (v && v !== category.name) onSave(category.id, { name: v });
    else setName(category.name);
  };

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "1fr auto auto",
        gap: 8,
        alignItems: "center",
        border: `1px solid ${C.border}`,
        borderRadius: 9,
        background: C.bg,
        padding: 6,
      }}
    >
      <input value={name} onChange={(e) => setName(e.target.value)} onBlur={commitName} onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()} style={rowInput} />
      <KindToggle kind={category.kind} onChange={(k) => onSave(category.id, { kind: k })} />
      <button
        onClick={() => {
          if (count > 0 && !confirm(`Delete "${category.name}"? Its ${count} ${count === 1 ? "item" : "items"} will become uncategorized.`)) return;
          onDelete(category.id);
        }}
        title={count > 0 ? `${count} items — they become uncategorized` : "Delete"}
        style={iconBtn}
      >
        ×
      </button>
    </div>
  );
}

function KindToggle({ kind, onChange }: { kind: Kind; onChange: (k: Kind) => void }) {
  return (
    <div style={{ display: "inline-flex", border: `1px solid ${C.border}`, borderRadius: 999, overflow: "hidden" }}>
      {(["DEBIT", "CREDIT"] as const).map((k) => {
        const on = kind === k;
        const col = kindColor(k);
        return (
          <button
            key={k}
            onClick={() => onChange(k)}
            style={{
              border: "none",
              background: on ? `color-mix(in srgb, ${col} 20%, transparent)` : "transparent",
              color: on ? C.text : C.textFaint,
              padding: "5px 10px",
              fontSize: 11,
              fontFamily: MONO,
              letterSpacing: "0.04em",
              cursor: "pointer",
              display: "inline-flex",
              alignItems: "center",
              gap: 5,
            }}
          >
            <span style={{ width: 6, height: 6, borderRadius: 999, background: col, opacity: on ? 1 : 0.4 }} />
            {k === "CREDIT" ? "CR" : "DR"}
          </button>
        );
      })}
    </div>
  );
}

// ── Shared styles ─────────────────────────────────────────────────────────────

const inputStyle: React.CSSProperties = {
  width: "100%",
  background: C.bg,
  border: `1px solid ${C.border}`,
  borderRadius: 9,
  outline: "none",
  color: C.text,
  fontSize: 13.5,
  padding: "9px 11px",
};
const selectStyle: React.CSSProperties = { ...inputStyle, cursor: "pointer", colorScheme: "dark" };
const rowInput: React.CSSProperties = {
  width: "100%",
  background: "transparent",
  border: "none",
  outline: "none",
  color: C.text,
  fontSize: 13,
  padding: "6px 6px",
};
const labelStyle: React.CSSProperties = {
  display: "block",
  fontFamily: MONO,
  fontSize: 10.5,
  letterSpacing: "0.06em",
  textTransform: "uppercase",
  color: C.textFaint,
  margin: "0 0 6px 2px",
};
const primaryBtn: React.CSSProperties = {
  border: "none",
  borderRadius: 9,
  background: C.accent,
  color: C.accentText,
  fontWeight: 600,
  fontSize: 13,
  padding: "8px 14px",
  cursor: "pointer",
};
const ghostBtn: React.CSSProperties = {
  border: `1px solid ${C.border}`,
  background: "transparent",
  color: C.textDim,
  borderRadius: 9,
  fontSize: 13,
  padding: "8px 14px",
  cursor: "pointer",
};
const textBtn: React.CSSProperties = {
  border: "none",
  background: "transparent",
  color: C.textDim,
  cursor: "pointer",
  fontFamily: MONO,
  fontSize: 12,
  padding: "6px 10px",
};
const linkBtn: React.CSSProperties = {
  border: "none",
  background: "transparent",
  color: C.accent,
  cursor: "pointer",
  fontSize: "inherit",
  padding: 0,
  textDecoration: "underline",
};
const iconBtn: React.CSSProperties = {
  border: "none",
  background: "transparent",
  color: C.textFaint,
  cursor: "pointer",
  fontSize: 16,
  lineHeight: 1,
  padding: "4px 8px",
};
