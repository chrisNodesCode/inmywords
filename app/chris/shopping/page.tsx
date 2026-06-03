"use client";

import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import Link from "next/link";
import { useDragReorder } from "@/app/chris/_lib/dragReorder";
import { Spinner } from "@/app/chris/_lib/Spinner";
import { FullscreenButton } from "@/app/chris/_lib/FullscreenButton";
import { ThemeControls } from "@/app/chris/_lib/ThemeControls";

// ── Types ───────────────────────────────────────────────────────────────────

type List = {
  id: string;
  name: string;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
};

type Item = {
  id: string;
  listId: string;
  name: string;
  quantity: number | null;
  unitPrice: number | null;
  completed: boolean;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

// ── Money helpers ────────────────────────────────────────────────────────────

const fmtMoney = (n: number) =>
  n.toLocaleString("en-US", { style: "currency", currency: "USD" });

const itemTotal = (it: Item) => (it.quantity ?? 1) * (it.unitPrice ?? 0);

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
  danger: "#e0736a",
};

const MONO = 'ui-monospace, SFMono-Regular, "SF Mono", Menlo, monospace';

const LAST_LIST_KEY = "chris.shopping.lastListId";
const SUGGESTED_LISTS = ["Target", "Walmart", "Amazon"];

// ── Page ─────────────────────────────────────────────────────────────────────

export default function ShoppingPage() {
  const [lists, setLists] = useState<List[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);

  // Active list = where Enter/Add saves to. Persisted to localStorage.
  const [activeListId, setActiveListIdState] = useState<string | null>(null);
  const setActiveListId = useCallback((id: string | null) => {
    setActiveListIdState(id);
    if (typeof window !== "undefined") {
      if (id) localStorage.setItem(LAST_LIST_KEY, id);
      else localStorage.removeItem(LAST_LIST_KEY);
    }
  }, []);

  // Quick-add state
  const [draft, setDraft] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  // List management state
  const [editingLists, setEditingLists] = useState(false);
  const [creatingList, setCreatingList] = useState(false);
  const [newListName, setNewListName] = useState("");

  // Initial load
  useEffect(() => {
    (async () => {
      try {
        const [lr, ir] = await Promise.all([
          fetch("/chris/api/shopping/lists"),
          fetch("/chris/api/shopping/items"),
        ]);
        const ld = await lr.json();
        const id = await ir.json();
        const loadedLists: List[] = ld.lists ?? [];
        setLists(loadedLists);
        setItems(id.items ?? []);

        // Restore active list from localStorage, fall back to first list
        const saved = localStorage.getItem(LAST_LIST_KEY);
        const valid = loadedLists.find((l) => l.id === saved);
        if (valid) setActiveListIdState(valid.id);
        else if (loadedLists.length) setActiveListIdState(loadedLists[0].id);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // ── List CRUD ─────────────────────────────────────────────────────────────

  const createList = async (name: string): Promise<List | null> => {
    const t = name.trim();
    if (!t) return null;
    const res = await fetch("/chris/api/shopping/lists", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: t }),
    });
    if (!res.ok) return null;
    const { list } = await res.json();
    setLists((prev) => [...prev, list]);
    return list as List;
  };

  const renameList = async (id: string, name: string) => {
    const t = name.trim();
    if (!t) return;
    setLists((prev) => prev.map((l) => (l.id === id ? { ...l, name: t } : l)));
    await fetch(`/chris/api/shopping/lists/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: t }),
    });
  };

  const deleteList = async (id: string) => {
    const list = lists.find((l) => l.id === id);
    const itemCount = items.filter((i) => i.listId === id).length;
    const msg =
      itemCount > 0
        ? `Delete "${list?.name}" and its ${itemCount} item${itemCount === 1 ? "" : "s"}?`
        : `Delete "${list?.name}"?`;
    if (!confirm(msg)) return;
    setLists((prev) => prev.filter((l) => l.id !== id));
    setItems((prev) => prev.filter((i) => i.listId !== id));
    if (activeListId === id) {
      const next = lists.find((l) => l.id !== id);
      setActiveListId(next ? next.id : null);
    }
    await fetch(`/chris/api/shopping/lists/${id}`, { method: "DELETE" });
  };

  // ── Item CRUD ─────────────────────────────────────────────────────────────

  const addItem = async (name: string, listId: string) => {
    const t = name.trim();
    if (!t || !listId) return;
    const res = await fetch("/chris/api/shopping/items", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: t, listId }),
    });
    if (!res.ok) return;
    const { item } = await res.json();
    setItems((prev) => [item, ...prev]);
    setDraft("");
    inputRef.current?.focus();
  };

  // Enter/Add button → save to active list
  const submitToActive = async () => {
    if (!draft.trim() || !activeListId) return;
    await addItem(draft, activeListId);
  };

  // Click a chip → set as active. If draft has text, also save there.
  const handleChipClick = async (listId: string) => {
    setActiveListId(listId);
    if (draft.trim()) {
      await addItem(draft, listId);
    }
    inputRef.current?.focus();
  };

  const patchItem = async (id: string, body: Partial<Item>) => {
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, ...body } : i)));
    const res = await fetch(`/chris/api/shopping/items/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (res.ok) {
      const { item } = await res.json();
      setItems((prev) => prev.map((i) => (i.id === id ? item : i)));
    }
  };

  const deleteItem = async (id: string) => {
    setItems((prev) => prev.filter((i) => i.id !== id));
    await fetch(`/chris/api/shopping/items/${id}`, { method: "DELETE" });
  };

  // ── Derived ───────────────────────────────────────────────────────────────

  const openCount = items.filter((i) => !i.completed).length;
  const grandTotal = items
    .filter((i) => !i.completed)
    .reduce((sum, i) => sum + itemTotal(i), 0);

  // Typeahead suggestions — distinct item names matching the current draft,
  // excluding exact matches (Enter handles those) and case-insensitive.
  const suggestions = useMemo(() => {
    const q = draft.trim().toLowerCase();
    if (!q) return [];
    const seen = new Set<string>();
    const matches: string[] = [];
    for (const it of items) {
      const name = it.name.trim();
      if (!name) continue;
      const lower = name.toLowerCase();
      if (lower === q) continue;
      if (!lower.includes(q)) continue;
      if (seen.has(lower)) continue;
      seen.add(lower);
      matches.push(name);
      if (matches.length >= 6) break;
    }
    return matches;
  }, [draft, items]);
  const [suggestionsOpen, setSuggestionsOpen] = useState(true);

  // Group items by list (in list sortOrder); skip lists with zero items
  const grouped = useMemo(() => {
    return lists
      .map((list) => ({
        list,
        items: items.filter((i) => i.listId === list.id),
      }))
      .filter((g) => g.items.length > 0);
  }, [lists, items]);

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <main style={{ maxWidth: 640, margin: "0 auto", padding: "0 24px 96px" }}>
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
          <span style={{ color: C.text }}>shopping</span>
        </Link>
        <div style={{ display: "inline-flex", alignItems: "center", gap: 12 }}>
          <span style={{ fontFamily: MONO, fontSize: 12, color: C.textFaint }}>
            {openCount} item{openCount === 1 ? "" : "s"}
            {grandTotal > 0 && (
              <>
                <span style={{ color: C.borderSoft, margin: "0 6px" }}>|</span>
                <span style={{ color: C.accent }}>{fmtMoney(grandTotal)}</span>
              </>
            )}
          </span>
          <ThemeControls />
          <FullscreenButton />
        </div>
      </header>

      {/* Quick add */}
      <section style={{ marginTop: 28, position: "relative" }}>
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
            onChange={(e) => {
              setDraft(e.target.value);
              setSuggestionsOpen(true);
            }}
            onFocus={() => setSuggestionsOpen(true)}
            onKeyDown={(e) => {
              if (e.key === "Enter") submitToActive();
              if (e.key === "Escape") {
                if (suggestionsOpen && suggestions.length) setSuggestionsOpen(false);
                else setDraft("");
              }
            }}
            placeholder={
              lists.length === 0
                ? "Create a list below first…"
                : "Add an item…"
            }
            disabled={lists.length === 0}
            style={{
              flex: 1,
              background: "transparent",
              border: "none",
              outline: "none",
              color: C.text,
              fontSize: 15.5,
              padding: "12px 0",
              opacity: lists.length === 0 ? 0.5 : 1,
            }}
          />
          <button
            onClick={submitToActive}
            disabled={!draft.trim() || !activeListId}
            style={{
              border: "none",
              borderRadius: 10,
              background: draft.trim() && activeListId ? C.accent : C.border,
              color: draft.trim() && activeListId ? C.accentText : C.textFaint,
              fontWeight: 600,
              fontSize: 14,
              padding: "10px 16px",
              cursor: draft.trim() && activeListId ? "pointer" : "default",
              transition: "background 0.15s ease",
            }}
          >
            Add
          </button>
        </div>

        {/* Typeahead suggestions */}
        {suggestionsOpen && suggestions.length > 0 && activeListId && (
          <div
            style={{
              position: "absolute",
              top: "calc(100% + 4px)",
              left: 0,
              right: 0,
              zIndex: 30,
              background: C.card,
              border: `1px solid ${C.border}`,
              borderRadius: 12,
              boxShadow: "0 12px 32px rgba(0,0,0,0.45)",
              overflow: "hidden",
              maxHeight: 260,
              overflowY: "auto",
            }}
          >
            {suggestions.map((name) => (
              <button
                key={name}
                onClick={async () => {
                  await addItem(name, activeListId);
                  setDraft("");
                  setSuggestionsOpen(false);
                  inputRef.current?.focus();
                }}
                style={{
                  display: "block",
                  width: "100%",
                  textAlign: "left",
                  background: "transparent",
                  border: "none",
                  borderBottom: `1px solid ${C.borderSoft}`,
                  color: C.text,
                  cursor: "pointer",
                  fontSize: 14,
                  padding: "10px 14px",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = C.cardHover)}
                onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
              >
                <span style={{ color: C.accent, marginRight: 8 }}>+</span>
                {name}
                <span
                  style={{
                    fontFamily: MONO,
                    fontSize: 10.5,
                    color: C.textFaint,
                    float: "right",
                  }}
                >
                  add again
                </span>
              </button>
            ))}
          </div>
        )}

        {/* Chip row */}
        <ChipRow
          lists={lists}
          activeListId={activeListId}
          editingLists={editingLists}
          setEditingLists={setEditingLists}
          creatingList={creatingList}
          setCreatingList={setCreatingList}
          newListName={newListName}
          setNewListName={setNewListName}
          onChipClick={handleChipClick}
          onCreateList={async (name) => {
            const list = await createList(name);
            if (list) setActiveListId(list.id);
            setNewListName("");
            setCreatingList(false);
          }}
          onRenameList={renameList}
          onDeleteList={deleteList}
        />

        {/* Active-list hint — confirms where Enter/Add will save */}
        {lists.length > 0 && activeListId && (
          <p
            style={{
              margin: "12px 4px 0",
              fontFamily: MONO,
              fontSize: 11.5,
              color: C.textFaint,
            }}
          >
            ↵ adds to{" "}
            <span style={{ color: C.accent }}>
              {lists.find((l) => l.id === activeListId)?.name}
            </span>
          </p>
        )}
      </section>

      {/* Feed (grouped by list) */}
      <section style={{ marginTop: 28 }}>
        {loading ? (
          <Spinner label="loading…" />
        ) : lists.length === 0 ? (
          <EmptyNoLists
            onPick={async (name) => {
              const list = await createList(name);
              if (list) setActiveListId(list.id);
            }}
          />
        ) : grouped.length === 0 ? (
          <div style={{ textAlign: "center", padding: "48px 0", color: C.textFaint }}>
            <p style={{ margin: 0, fontSize: 14 }}>No items yet. Add one above.</p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
            {grouped.map(({ list, items: groupItems }) => (
              <ShoppingItemGroup
                key={list.id}
                list={list}
                groupItems={groupItems}
                onToggle={(id, completed) => patchItem(id, { completed })}
                onEditName={(id, name) => patchItem(id, { name })}
                onEditQuantity={(id, qty) => patchItem(id, { quantity: qty })}
                onEditUnitPrice={(id, price) => patchItem(id, { unitPrice: price })}
                onDelete={(id) => deleteItem(id)}
                applyGroupReorder={(orderedIds) => {
                  // Merge new order into global items array
                  setItems((prev) => {
                    const inGroup = new Set(orderedIds);
                    const groupItemsOrdered = orderedIds
                      .map((id) => prev.find((i) => i.id === id)!)
                      .filter(Boolean);
                    const others = prev.filter((i) => !inGroup.has(i.id));
                    return [...groupItemsOrdered, ...others];
                  });
                  void fetch("/chris/api/shopping/items/reorder", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ ids: orderedIds }),
                  });
                }}
              />
            ))}
          </div>
        )}
      </section>
    </main>
  );
}

// ── Chip row ─────────────────────────────────────────────────────────────────

function ChipRow({
  lists,
  activeListId,
  editingLists,
  setEditingLists,
  creatingList,
  setCreatingList,
  newListName,
  setNewListName,
  onChipClick,
  onCreateList,
  onRenameList,
  onDeleteList,
}: {
  lists: List[];
  activeListId: string | null;
  editingLists: boolean;
  setEditingLists: (b: boolean) => void;
  creatingList: boolean;
  setCreatingList: (b: boolean) => void;
  newListName: string;
  setNewListName: (s: string) => void;
  onChipClick: (id: string) => void;
  onCreateList: (name: string) => void;
  onRenameList: (id: string, name: string) => void;
  onDeleteList: (id: string) => void;
}) {
  if (lists.length === 0 && !creatingList) return null;

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
      {lists.map((list) =>
        editingLists ? (
          <EditableChip
            key={list.id}
            list={list}
            onRename={(name) => onRenameList(list.id, name)}
            onDelete={() => onDeleteList(list.id)}
          />
        ) : (
          <ListChip
            key={list.id}
            list={list}
            active={list.id === activeListId}
            onClick={() => onChipClick(list.id)}
          />
        )
      )}

      {/* + new list */}
      {creatingList ? (
        <input
          autoFocus
          value={newListName}
          onChange={(e) => setNewListName(e.target.value)}
          onBlur={() => {
            if (newListName.trim()) onCreateList(newListName);
            else setCreatingList(false);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") onCreateList(newListName);
            if (e.key === "Escape") {
              setNewListName("");
              setCreatingList(false);
            }
          }}
          placeholder="List name"
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
          onClick={() => setCreatingList(true)}
          aria-label="Add list"
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
          + list
        </button>
      )}

      {/* edit / done */}
      {lists.length > 0 && (
        <button
          onClick={() => setEditingLists(!editingLists)}
          style={{
            marginLeft: "auto",
            border: "none",
            background: "transparent",
            color: editingLists ? C.accent : C.textFaint,
            cursor: "pointer",
            fontFamily: MONO,
            fontSize: 11,
            padding: "5px 4px",
          }}
        >
          {editingLists ? "done" : "edit"}
        </button>
      )}
    </div>
  );
}

function ListChip({
  list,
  active,
  onClick,
}: {
  list: List;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      title={active ? `Active — adds save here` : `Save to ${list.name}`}
      style={{
        border: `1px solid ${active ? C.accent : C.border}`,
        background: active ? C.accent : "transparent",
        color: active ? C.accentText : C.textDim,
        borderRadius: 999,
        padding: "5px 12px",
        fontSize: 12.5,
        fontWeight: active ? 600 : 400,
        cursor: "pointer",
        transition: "background 0.15s ease, color 0.15s ease",
      }}
    >
      {list.name}
    </button>
  );
}

function EditableChip({
  list,
  onRename,
  onDelete,
}: {
  list: List;
  onRename: (name: string) => void;
  onDelete: () => void;
}) {
  const [name, setName] = useState(list.name);
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 4,
        border: `1px solid ${C.border}`,
        background: C.cardHover,
        borderRadius: 999,
        padding: "3px 4px 3px 10px",
      }}
    >
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        onBlur={() => {
          if (name.trim() && name.trim() !== list.name) onRename(name);
          else setName(list.name);
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter") (e.target as HTMLInputElement).blur();
          if (e.key === "Escape") {
            setName(list.name);
            (e.target as HTMLInputElement).blur();
          }
        }}
        style={{
          background: "transparent",
          border: "none",
          outline: "none",
          color: C.text,
          fontSize: 12.5,
          width: Math.max(60, name.length * 7 + 6),
        }}
      />
      <button
        onClick={onDelete}
        aria-label="Delete list"
        title="Delete list"
        style={{
          border: "none",
          background: "transparent",
          color: C.danger,
          cursor: "pointer",
          fontSize: 14,
          lineHeight: 1,
          padding: "2px 6px",
          borderRadius: 999,
        }}
      >
        ×
      </button>
    </span>
  );
}

// ── Item row ─────────────────────────────────────────────────────────────────

function ShoppingItemGroup({
  list,
  groupItems,
  onToggle,
  onEditName,
  onEditQuantity,
  onEditUnitPrice,
  onDelete,
  applyGroupReorder,
}: {
  list: List;
  groupItems: Item[];
  onToggle: (id: string, completed: boolean) => void;
  onEditName: (id: string, name: string) => void;
  onEditQuantity: (id: string, qty: number | null) => void;
  onEditUnitPrice: (id: string, price: number | null) => void;
  onDelete: (id: string) => void;
  applyGroupReorder: (orderedIds: string[]) => void;
}) {
  const open = groupItems.filter((i) => !i.completed);
  const done = groupItems.filter((i) => i.completed);
  // Only the open items are draggable; done items keep their completedAt-ish
  // order at the bottom.
  const { rowProps, rowStyle } = useDragReorder(open, (next) => {
    // Persist [...openOrdered, ...done] for this list's items
    applyGroupReorder([...next, ...done].map((i) => i.id));
  });
  return (
    <div>
      <div
        style={{
          display: "flex",
          alignItems: "baseline",
          gap: 8,
          margin: "0 4px 10px",
        }}
      >
        <h3
          style={{
            margin: 0,
            fontSize: 14,
            fontWeight: 600,
            color: C.text,
            letterSpacing: "-0.005em",
          }}
        >
          {list.name}
        </h3>
        <span style={{ fontFamily: MONO, fontSize: 11, color: C.textFaint }}>
          {open.length} open
          {done.length > 0 && ` · ${done.length} done`}
        </span>
        {(() => {
          const listTotal = open.reduce((s, i) => s + itemTotal(i), 0);
          if (listTotal <= 0) return null;
          return (
            <span style={{ fontFamily: MONO, fontSize: 11, color: C.textFaint }}>
              <span style={{ color: C.borderSoft, margin: "0 6px" }}>|</span>
              <span style={{ color: C.accent }}>{fmtMoney(listTotal)}</span>
            </span>
          );
        })()}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {open.map((item) => (
          <ItemRow
            key={item.id}
            item={item}
            dragProps={rowProps(item.id)}
            dragStyle={rowStyle(item.id)}
            onToggle={() => onToggle(item.id, !item.completed)}
            onEditName={(name) => onEditName(item.id, name)}
            onEditQuantity={(qty) => onEditQuantity(item.id, qty)}
            onEditUnitPrice={(price) => onEditUnitPrice(item.id, price)}
            onDelete={() => onDelete(item.id)}
          />
        ))}
        {done.map((item) => (
          <ItemRow
            key={item.id}
            item={item}
            onToggle={() => onToggle(item.id, !item.completed)}
            onEditName={(name) => onEditName(item.id, name)}
            onEditQuantity={(qty) => onEditQuantity(item.id, qty)}
            onEditUnitPrice={(price) => onEditUnitPrice(item.id, price)}
            onDelete={() => onDelete(item.id)}
          />
        ))}
      </div>
    </div>
  );
}

function ItemRow({
  item,
  dragProps,
  dragStyle,
  onToggle,
  onEditName,
  onEditQuantity,
  onEditUnitPrice,
  onDelete,
}: {
  item: Item;
  dragProps?: React.HTMLAttributes<HTMLDivElement> & { draggable?: boolean };
  dragStyle?: React.CSSProperties;
  onToggle: () => void;
  onEditName: (name: string) => void;
  onEditQuantity: (qty: number | null) => void;
  onEditUnitPrice: (price: number | null) => void;
  onDelete: () => void;
}) {
  const [hover, setHover] = useState(false);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(item.name);

  const commitEdit = () => {
    const v = draft.trim();
    if (v && v !== item.name) onEditName(v);
    else setDraft(item.name);
    setEditing(false);
  };

  return (
    <div
      {...(dragProps ?? {})}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 12,
        border: `1px solid ${C.border}`,
        borderRadius: 10,
        background: hover ? C.cardHover : C.card,
        padding: "10px 12px",
        transition: "background 0.12s ease",
        ...(dragStyle ?? {}),
      }}
    >
      <button
        onClick={onToggle}
        aria-label={item.completed ? "Mark unbought" : "Mark bought"}
        style={{
          flexShrink: 0,
          width: 18,
          height: 18,
          borderRadius: 999,
          border: `1.5px solid ${item.completed ? C.accent : "#3a3e46"}`,
          background: item.completed ? C.accent : "transparent",
          color: C.accentText,
          display: "grid",
          placeItems: "center",
          cursor: "pointer",
          fontSize: 11,
          lineHeight: 1,
        }}
      >
        {item.completed ? "✓" : ""}
      </button>

      {editing ? (
        <input
          autoFocus
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commitEdit}
          onKeyDown={(e) => {
            if (e.key === "Enter") commitEdit();
            if (e.key === "Escape") {
              setDraft(item.name);
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
            fontSize: 14.5,
            padding: "1px 0",
          }}
        />
      ) : (
        <div
          onClick={() => !item.completed && setEditing(true)}
          style={{
            flex: 1,
            fontSize: 14.5,
            color: item.completed ? C.textFaint : C.text,
            textDecoration: item.completed ? "line-through" : "none",
            cursor: item.completed ? "default" : "text",
            wordBreak: "break-word",
          }}
        >
          {item.name}
        </div>
      )}

      {/* Inline quantity + unit-price (justified right) */}
      <InlineNumber
        value={item.quantity}
        placeholder="qty"
        format={(n) => `${n}×`}
        parse={(s) => {
          const n = parseInt(s, 10);
          return Number.isFinite(n) && n > 0 ? n : null;
        }}
        onCommit={onEditQuantity}
        muted={item.completed}
      />
      <InlineNumber
        value={item.unitPrice}
        placeholder="$0.00"
        format={(n) => fmtMoney(n)}
        parse={(s) => {
          const cleaned = s.replace(/[^0-9.]/g, "");
          const n = parseFloat(cleaned);
          return Number.isFinite(n) && n >= 0 ? n : null;
        }}
        onCommit={onEditUnitPrice}
        muted={item.completed}
      />

      <button
        onClick={onDelete}
        aria-label="Delete item"
        style={{
          flexShrink: 0,
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

// ── Empty state (no lists) ──────────────────────────────────────────────────

function EmptyNoLists({ onPick }: { onPick: (name: string) => void }) {
  return (
    <div style={{ textAlign: "center", padding: "56px 0" }}>
      <div style={{ fontSize: 28, color: C.textFaint, marginBottom: 14 }}>◜◝</div>
      <p style={{ margin: "0 0 18px", color: C.textFaint, fontSize: 14 }}>
        Make your first list — usually a retailer like Target or Amazon.
      </p>
      <div style={{ display: "flex", justifyContent: "center", flexWrap: "wrap", gap: 8 }}>
        {SUGGESTED_LISTS.map((name) => (
          <button
            key={name}
            onClick={() => onPick(name)}
            style={{
              border: `1px solid ${C.border}`,
              background: C.card,
              color: C.text,
              borderRadius: 999,
              padding: "7px 16px",
              fontSize: 13,
              cursor: "pointer",
            }}
          >
            + {name}
          </button>
        ))}
      </div>
    </div>
  );
}

// ── Inline number input (qty / price) ────────────────────────────────────────

function InlineNumber({
  value,
  placeholder,
  format,
  parse,
  onCommit,
  muted,
}: {
  value: number | null;
  placeholder: string;
  format: (n: number) => string;
  parse: (s: string) => number | null;
  onCommit: (v: number | null) => void;
  muted?: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<string>(value != null ? String(value) : "");

  const commit = () => {
    setEditing(false);
    if (draft.trim() === "") {
      if (value != null) onCommit(null);
      return;
    }
    const next = parse(draft);
    if (next === null) {
      // invalid → revert
      setDraft(value != null ? String(value) : "");
      return;
    }
    if (next !== value) onCommit(next);
  };

  if (editing) {
    return (
      <input
        autoFocus
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter") commit();
          if (e.key === "Escape") {
            setDraft(value != null ? String(value) : "");
            setEditing(false);
          }
        }}
        style={{
          flexShrink: 0,
          width: 64,
          textAlign: "right",
          background: "transparent",
          border: "none",
          borderBottom: `1px solid ${C.accent}`,
          outline: "none",
          color: C.text,
          fontFamily: MONO,
          fontSize: 12.5,
          padding: "1px 4px",
        }}
      />
    );
  }

  const empty = value == null;
  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        setDraft(value != null ? String(value) : "");
        setEditing(true);
      }}
      style={{
        flexShrink: 0,
        background: "transparent",
        border: "none",
        color: empty ? C.textFaint : muted ? C.textFaint : C.textDim,
        cursor: "pointer",
        fontFamily: MONO,
        fontSize: 12.5,
        padding: "3px 6px",
        fontStyle: empty ? "italic" : "normal",
        minWidth: 48,
        textAlign: "right",
        opacity: empty ? 0.6 : 1,
      }}
    >
      {empty ? placeholder : format(value as number)}
    </button>
  );
}
