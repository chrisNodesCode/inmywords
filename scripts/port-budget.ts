/**
 * One-off importer: Airtable "calendar" CSV export → Budget models.
 *
 * The CSV is already a denormalized view of the Airtable categories/items/calendar
 * tables, so we derive all three of our models from it:
 *   - lookup_category (+ transaction_type) → BudgetCategory (name, kind)
 *   - items (+ lookup_amount)              → BudgetItem (name, amount, category)
 *   - date (+ item)                        → BudgetEntry (one per row)
 * Dropped as cruft: month, SELECT, paid, running_total, Daylight/Sunrise/Sunset.
 * Month is derived from the date in the UI, which also fixes the stale "Jun"
 * month labels on the Sep–Dec IRS rows.
 *
 * Idempotent: wipes the target user's existing Budget rows first, then re-imports.
 *
 * Usage:
 *   npx tsx scripts/port-budget.ts [path/to/calendar-cal.csv]
 *   BUDGET_USER_ID=<clerkUserId> npx tsx scripts/port-budget.ts   # for prod
 *
 * Defaults to userId "dev-user-local" (the dev-bypass identity) so the data shows
 * in the local preview. Pass BUDGET_USER_ID to attribute to a real Clerk user.
 */
import "dotenv/config";
import { readFileSync } from "node:fs";
import { prisma } from "../lib/prisma";
import type { BudgetKind } from "@prisma/client";

const USER_ID = process.env.BUDGET_USER_ID || "dev-user-local";
const CSV_PATH =
  process.argv[2] || "/Users/fto-chrislam/Desktop/receipts/calendar-cal.csv";

type Row = Record<string, string>;

function parseCsv(text: string): Row[] {
  const lines = text.split(/\r?\n/).filter((l) => l.trim() !== "");
  const headers = lines[0].split(",").map((h) => h.trim());
  return lines.slice(1).map((line) => {
    const cells = line.split(",");
    const row: Row = {};
    headers.forEach((h, i) => (row[h] = (cells[i] ?? "").trim()));
    return row;
  });
}

function parseAmount(raw: string): number {
  const n = parseFloat(raw.replace(/[^0-9.-]/g, ""));
  return Number.isFinite(n) ? n : 0;
}

function parseKind(raw: string): BudgetKind {
  return raw.trim().toUpperCase() === "CREDIT" ? "CREDIT" : "DEBIT";
}

// "2026-06-15 12:00am" → Date at UTC midnight of that calendar day (time is just
// an Airtable intra-day ordering hack; we preserve order via sortOrder instead).
function parseDate(raw: string): Date {
  const day = raw.trim().slice(0, 10); // yyyy-mm-dd
  return new Date(`${day}T00:00:00.000Z`);
}

async function main() {
  const rows = parseCsv(readFileSync(CSV_PATH, "utf8"));
  console.log(`Parsed ${rows.length} calendar rows from ${CSV_PATH}`);

  // 1) Wipe existing budget data for this user (categories cascade nothing, but
  //    deleting items cascades their entries; delete entries/items/categories).
  await prisma.budgetEntry.deleteMany({ where: { userId: USER_ID } });
  await prisma.budgetItem.deleteMany({ where: { userId: USER_ID } });
  await prisma.budgetCategory.deleteMany({ where: { userId: USER_ID } });

  // 2) Categories — distinct lookup_category, kind from transaction_type.
  const catKind = new Map<string, BudgetKind>();
  for (const r of rows) {
    const name = r["lookup_category"]?.trim();
    if (!name) continue;
    if (!catKind.has(name)) catKind.set(name, parseKind(r["transaction_type"]));
  }
  const catId = new Map<string, string>();
  let cOrder = 0;
  for (const [name, kind] of catKind) {
    const c = await prisma.budgetCategory.create({
      data: { userId: USER_ID, name, kind, sortOrder: cOrder++ },
    });
    catId.set(name, c.id);
  }
  console.log(`Created ${catId.size} categories`);

  // 2b) Accounts — the two manually-tracked "CURRENT" rows become editable
  //     account balances (not line items), and are excluded from the calendar.
  const ACCOUNTS: { itemName: string; key: string; label: string; sortOrder: number }[] = [
    { itemName: "CHECKING CURRENT", key: "checking", label: "Checking", sortOrder: 0 },
    { itemName: "SAVINGS CURRENT", key: "savings", label: "Savings", sortOrder: 1 },
  ];
  const accountItemNames = new Set(ACCOUNTS.map((a) => a.itemName));
  for (const a of ACCOUNTS) {
    const row = rows.find((r) => r["items"]?.trim() === a.itemName);
    const balance = row ? parseAmount(row["lookup_amount"]) : 0;
    await prisma.budgetAccount.upsert({
      where: { userId_key: { userId: USER_ID, key: a.key } },
      update: { balance },
      create: { userId: USER_ID, key: a.key, label: a.label, balance, sortOrder: a.sortOrder },
    });
  }
  console.log(`Set ${ACCOUNTS.length} account balances`);

  // 3) Items — distinct `items` name; amount from lookup_amount; link category.
  //    (The account "CURRENT" rows are excluded — they're accounts now.)
  const itemMeta = new Map<string, { amount: number; category: string }>();
  for (const r of rows) {
    const name = r["items"]?.trim();
    if (!name || accountItemNames.has(name)) continue;
    if (!itemMeta.has(name)) {
      itemMeta.set(name, {
        amount: parseAmount(r["lookup_amount"]),
        category: r["lookup_category"]?.trim() || "",
      });
    }
  }
  const itemId = new Map<string, string>();
  let iOrder = 0;
  for (const [name, meta] of itemMeta) {
    const it = await prisma.budgetItem.create({
      data: {
        userId: USER_ID,
        name,
        amount: meta.amount,
        categoryId: catId.get(meta.category) ?? null,
        sortOrder: iOrder++,
      },
    });
    itemId.set(name, it.id);
  }
  console.log(`Created ${itemId.size} items`);

  // 4) Entries — one per CSV row; sortOrder preserves CSV (intra-day) order.
  let made = 0;
  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    const item = itemId.get(r["items"]?.trim());
    if (!item) continue;
    await prisma.budgetEntry.create({
      data: { userId: USER_ID, date: parseDate(r["date"]), itemId: item, sortOrder: i },
    });
    made++;
  }
  console.log(`Created ${made} entries for userId="${USER_ID}"`);
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
