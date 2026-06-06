import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getPlaygroundUserId } from "@/lib/playground-auth";

function parseAmount(value: unknown): number | null {
  const n = typeof value === "number" ? value : typeof value === "string" ? parseFloat(value) : NaN;
  return Number.isFinite(n) ? n : null;
}

// Validate a categoryId belongs to this user. Returns the id, null (clear), or
// false (invalid).
async function resolveCategoryId(
  value: unknown,
  userId: string
): Promise<string | null | false> {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value !== "string") return false;
  const cat = await prisma.budgetCategory.findFirst({
    where: { id: value, userId },
    select: { id: true },
  });
  return cat ? cat.id : false;
}

// GET /chris/api/budget/items — list with category + entry counts
export async function GET() {
  const userId = await getPlaygroundUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const items = await prisma.budgetItem.findMany({
    where: { userId },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    include: {
      category: { select: { id: true, name: true, kind: true, color: true } },
      _count: { select: { entries: true } },
    },
  });
  return NextResponse.json({ items });
}

// POST /chris/api/budget/items — create (name + amount required)
export async function POST(req: NextRequest) {
  const userId = await getPlaygroundUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const name = typeof body.name === "string" ? body.name.trim() : "";
  if (!name) return NextResponse.json({ error: "Name is required" }, { status: 400 });
  const amount = parseAmount(body.amount);
  if (amount === null) return NextResponse.json({ error: "Valid amount is required" }, { status: 400 });

  const categoryId = await resolveCategoryId(body.categoryId, userId);
  if (categoryId === false) {
    return NextResponse.json({ error: "Invalid categoryId" }, { status: 400 });
  }

  const last = await prisma.budgetItem.findFirst({
    where: { userId },
    orderBy: { sortOrder: "desc" },
    select: { sortOrder: true },
  });
  const sortOrder = (last?.sortOrder ?? -1) + 1;

  const item = await prisma.budgetItem.create({
    data: {
      userId,
      name,
      amount,
      note: typeof body.note === "string" && body.note.trim() ? body.note.trim() : null,
      categoryId,
      sortOrder,
    },
    include: { category: { select: { id: true, name: true, kind: true, color: true } } },
  });
  return NextResponse.json({ item }, { status: 201 });
}
