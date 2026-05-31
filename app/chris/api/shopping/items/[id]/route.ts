import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getPlaygroundUserId } from "@/lib/playground-auth";

// PATCH /chris/api/shopping/items/[id] — edit name, toggle completion, move list
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = await getPlaygroundUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const existing = await prisma.shoppingItem.findFirst({ where: { id, userId } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json().catch(() => ({}));
  const data: Record<string, unknown> = {};

  if (typeof body.name === "string" && body.name.trim()) data.name = body.name.trim();
  if (typeof body.completed === "boolean") {
    data.completed = body.completed;
    data.completedAt = body.completed ? new Date() : null;
  }
  if (typeof body.listId === "string" && body.listId) {
    const list = await prisma.shoppingList.findFirst({
      where: { id: body.listId, userId },
      select: { id: true },
    });
    if (!list) return NextResponse.json({ error: "Invalid listId" }, { status: 400 });
    data.listId = list.id;
  }

  const item = await prisma.shoppingItem.update({ where: { id }, data });
  return NextResponse.json({ item });
}

// DELETE /chris/api/shopping/items/[id]
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = await getPlaygroundUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const existing = await prisma.shoppingItem.findFirst({ where: { id, userId } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.shoppingItem.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
