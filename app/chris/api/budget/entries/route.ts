import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getPlaygroundUserId } from "@/lib/playground-auth";
import type { Prisma } from "@prisma/client";

function parseDate(value: unknown): Date | null {
  if (!value || typeof value !== "string") return null;
  const d = new Date(value);
  return isNaN(d.getTime()) ? null : d;
}

const entryInclude = {
  item: {
    include: { category: { select: { id: true, name: true, kind: true, color: true } } },
  },
} satisfies Prisma.BudgetEntryInclude;

// GET /chris/api/budget/entries — list (the v1 inspection table's source).
// Optional ?from=YYYY-MM-DD&to=YYYY-MM-DD date window.
export async function GET(req: NextRequest) {
  const userId = await getPlaygroundUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const from = parseDate(req.nextUrl.searchParams.get("from"));
  const to = parseDate(req.nextUrl.searchParams.get("to"));
  const dateFilter: Prisma.DateTimeFilter = {};
  if (from) dateFilter.gte = from;
  if (to) dateFilter.lte = to;

  const entries = await prisma.budgetEntry.findMany({
    where: { userId, ...(from || to ? { date: dateFilter } : {}) },
    orderBy: [{ date: "asc" }, { sortOrder: "asc" }],
    include: entryInclude,
  });
  return NextResponse.json({ entries });
}

// POST /chris/api/budget/entries — create one occurrence (date + itemId required)
export async function POST(req: NextRequest) {
  const userId = await getPlaygroundUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const date = parseDate(body.date);
  if (!date) return NextResponse.json({ error: "Valid date is required" }, { status: 400 });

  const itemId = typeof body.itemId === "string" ? body.itemId : "";
  const item = itemId
    ? await prisma.budgetItem.findFirst({ where: { id: itemId, userId }, select: { id: true } })
    : null;
  if (!item) return NextResponse.json({ error: "Invalid itemId" }, { status: 400 });

  const ovRaw = body.amountOverride;
  const amountOverride =
    typeof ovRaw === "number" && Number.isFinite(ovRaw)
      ? ovRaw
      : typeof ovRaw === "string" && Number.isFinite(parseFloat(ovRaw))
        ? parseFloat(ovRaw)
        : null;

  const entry = await prisma.budgetEntry.create({
    data: { userId, date, itemId: item.id, amountOverride },
    include: entryInclude,
  });
  return NextResponse.json({ entry }, { status: 201 });
}
