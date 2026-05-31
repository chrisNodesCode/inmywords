import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getPlaygroundUserId } from "@/lib/playground-auth";

// GET /chris/api/shopping/items — list this user's items (across all lists)
export async function GET() {
  const userId = await getPlaygroundUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const items = await prisma.shoppingItem.findMany({
    where: { userId },
    orderBy: [{ completed: "asc" }, { createdAt: "desc" }],
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

  const item = await prisma.shoppingItem.create({
    data: { userId, listId, name },
  });
  return NextResponse.json({ item }, { status: 201 });
}
