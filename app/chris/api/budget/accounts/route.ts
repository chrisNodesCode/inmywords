import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getPlaygroundUserId } from "@/lib/playground-auth";

// The fixed set of accounts (room to add more later).
const DEFAULTS: { key: string; label: string; sortOrder: number }[] = [
  { key: "checking", label: "Checking", sortOrder: 0 },
  { key: "savings", label: "Savings", sortOrder: 1 },
];

// GET /chris/api/budget/accounts — get-or-seed the user's accounts.
export async function GET() {
  const userId = await getPlaygroundUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const existing = await prisma.budgetAccount.findMany({ where: { userId } });
  const have = new Set(existing.map((a) => a.key));
  const missing = DEFAULTS.filter((d) => !have.has(d.key));
  if (missing.length) {
    await prisma.budgetAccount.createMany({
      data: missing.map((d) => ({ userId, ...d })),
      skipDuplicates: true,
    });
  }

  const accounts = await prisma.budgetAccount.findMany({
    where: { userId },
    orderBy: { sortOrder: "asc" },
  });
  return NextResponse.json({ accounts });
}

// PATCH /chris/api/budget/accounts — update one account's balance (by key).
export async function PATCH(req: NextRequest) {
  const userId = await getPlaygroundUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const key = typeof body.key === "string" ? body.key : "";
  if (!key) return NextResponse.json({ error: "key is required" }, { status: 400 });

  const balance =
    typeof body.balance === "number"
      ? body.balance
      : typeof body.balance === "string"
        ? parseFloat(body.balance)
        : NaN;
  if (!Number.isFinite(balance)) {
    return NextResponse.json({ error: "Valid balance is required" }, { status: 400 });
  }

  const existing = await prisma.budgetAccount.findUnique({
    where: { userId_key: { userId, key } },
  });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const account = await prisma.budgetAccount.update({
    where: { userId_key: { userId, key } },
    data: { balance },
  });
  return NextResponse.json({ account });
}
