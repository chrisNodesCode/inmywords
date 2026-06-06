import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getPlaygroundUserId } from "@/lib/playground-auth";

function parseAmount(value: unknown): number | null {
  const n = typeof value === "number" ? value : typeof value === "string" ? parseFloat(value) : NaN;
  return Number.isFinite(n) ? n : null;
}

async function resolveCategoryId(
  value: unknown,
  userId: string
): Promise<string | null | false> {
  if (value === null || value === "") return null;
  if (typeof value !== "string") return false;
  const cat = await prisma.budgetCategory.findFirst({
    where: { id: value, userId },
    select: { id: true },
  });
  return cat ? cat.id : false;
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = await getPlaygroundUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const existing = await prisma.budgetItem.findFirst({ where: { id, userId } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json().catch(() => ({}));
  const data: { name?: string; amount?: number; note?: string | null; categoryId?: string | null } = {};

  if (typeof body.name === "string") {
    const name = body.name.trim();
    if (!name) return NextResponse.json({ error: "Name is required" }, { status: 400 });
    data.name = name;
  }
  if (body.amount !== undefined) {
    const amount = parseAmount(body.amount);
    if (amount === null) return NextResponse.json({ error: "Valid amount is required" }, { status: 400 });
    data.amount = amount;
  }
  if (body.note !== undefined) {
    data.note = typeof body.note === "string" && body.note.trim() ? body.note.trim() : null;
  }
  if (body.categoryId !== undefined) {
    const categoryId = await resolveCategoryId(body.categoryId, userId);
    if (categoryId === false) {
      return NextResponse.json({ error: "Invalid categoryId" }, { status: 400 });
    }
    data.categoryId = categoryId;
  }

  const item = await prisma.budgetItem.update({
    where: { id },
    data,
    include: { category: { select: { id: true, name: true, kind: true, color: true } } },
  });
  return NextResponse.json({ item });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = await getPlaygroundUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const existing = await prisma.budgetItem.findFirst({ where: { id, userId } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Entries use onDelete: Cascade — deleting an item removes its occurrences.
  await prisma.budgetItem.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
