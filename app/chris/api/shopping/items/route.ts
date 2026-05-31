import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getPlaygroundUserId } from "@/lib/playground-auth";

// GET /chris/api/shopping/items — list this user's items (across all lists)
export async function GET() {
  const userId = await getPlaygroundUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const items = await prisma.shoppingItem.findMany({
    where: { userId },
    orderBy: [{ completed: "asc" }, { sortOrder: "asc" }, { createdAt: "desc" }],
    include: { entry: { select: { id: true, title: true } } },
  });
  return NextResponse.json({ items });
}

// POST /chris/api/shopping/items — create an item; listId required
export async function POST(req: NextRequest) {
  const userId = await getPlaygroundUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const name = typeof body.name === "string" ? body.name.trim() : "";
  const listId = typeof body.listId === "string" ? body.listId : "";
  if (!name) return NextResponse.json({ error: "Name is required" }, { status: 400 });
  if (!listId) return NextResponse.json({ error: "listId is required" }, { status: 400 });

  // Verify the list belongs to this user
  const list = await prisma.shoppingList.findFirst({
    where: { id: listId, userId },
    select: { id: true },
  });
  if (!list) return NextResponse.json({ error: "Invalid listId" }, { status: 400 });

  // Optional entry link
  let entryId: string | null = null;
  if (typeof body.entryId === "string" && body.entryId) {
    const entry = await prisma.journalEntry.findFirst({
      where: { id: body.entryId, userId },
      select: { id: true },
    });
    if (!entry) return NextResponse.json({ error: "Invalid entryId" }, { status: 400 });
    entryId = entry.id;
  }

  // Optional quantity / unitPrice (typically not set at create time, but
  // accept them so the API is consistent).
  const quantity =
    typeof body.quantity === "number" && Number.isFinite(body.quantity) && body.quantity > 0
      ? Math.floor(body.quantity)
      : null;
  const unitPrice =
    typeof body.unitPrice === "number" && Number.isFinite(body.unitPrice) && body.unitPrice >= 0
      ? body.unitPrice
      : null;

  const item = await prisma.shoppingItem.create({
    data: { userId, listId, name, entryId, quantity, unitPrice },
    include: { entry: { select: { id: true, title: true } } },
  });
  return NextResponse.json({ item }, { status: 201 });
}
