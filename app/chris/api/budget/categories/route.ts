import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getPlaygroundUserId } from "@/lib/playground-auth";
import type { BudgetKind } from "@prisma/client";

const KINDS: BudgetKind[] = ["DEBIT", "CREDIT"];

function parseKind(value: unknown): BudgetKind | null {
  return typeof value === "string" && KINDS.includes(value as BudgetKind)
    ? (value as BudgetKind)
    : null;
}

// GET /chris/api/budget/categories — list with item counts
export async function GET() {
  const userId = await getPlaygroundUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const categories = await prisma.budgetCategory.findMany({
    where: { userId },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    include: { _count: { select: { items: true } } },
  });
  return NextResponse.json({ categories });
}

// POST /chris/api/budget/categories — create
export async function POST(req: NextRequest) {
  const userId = await getPlaygroundUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const name = typeof body.name === "string" ? body.name.trim() : "";
  if (!name) return NextResponse.json({ error: "Name is required" }, { status: 400 });

  const last = await prisma.budgetCategory.findFirst({
    where: { userId },
    orderBy: { sortOrder: "desc" },
    select: { sortOrder: true },
  });
  const sortOrder = (last?.sortOrder ?? -1) + 1;

  const category = await prisma.budgetCategory.create({
    data: {
      userId,
      name,
      kind: parseKind(body.kind) ?? "DEBIT",
      color: typeof body.color === "string" && body.color.trim() ? body.color.trim() : null,
      sortOrder,
    },
  });
  return NextResponse.json({ category }, { status: 201 });
}
