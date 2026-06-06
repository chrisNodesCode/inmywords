import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getPlaygroundUserId } from "@/lib/playground-auth";
import type { BudgetKind } from "@prisma/client";

const KINDS: BudgetKind[] = ["DEBIT", "CREDIT"];

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = await getPlaygroundUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const existing = await prisma.budgetCategory.findFirst({ where: { id, userId } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json().catch(() => ({}));
  const data: { name?: string; kind?: BudgetKind; color?: string | null } = {};
  if (typeof body.name === "string") {
    const name = body.name.trim();
    if (!name) return NextResponse.json({ error: "Name is required" }, { status: 400 });
    data.name = name;
  }
  if (typeof body.kind === "string" && KINDS.includes(body.kind as BudgetKind)) {
    data.kind = body.kind as BudgetKind;
  }
  if (body.color !== undefined) {
    data.color = typeof body.color === "string" && body.color.trim() ? body.color.trim() : null;
  }

  const category = await prisma.budgetCategory.update({ where: { id }, data });
  return NextResponse.json({ category });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = await getPlaygroundUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const existing = await prisma.budgetCategory.findFirst({ where: { id, userId } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Items use onDelete: SetNull, so they survive — just become uncategorized.
  await prisma.budgetCategory.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
