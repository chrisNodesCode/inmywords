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

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = await getPlaygroundUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const existing = await prisma.budgetEntry.findFirst({ where: { id, userId } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json().catch(() => ({}));
  const data: { date?: Date; itemId?: string; amountOverride?: number | null; paid?: boolean } = {};

  if (body.date !== undefined) {
    const date = parseDate(body.date);
    if (!date) return NextResponse.json({ error: "Valid date is required" }, { status: 400 });
    data.date = date;
  }
  if (body.itemId !== undefined) {
    const item = await prisma.budgetItem.findFirst({
      where: { id: body.itemId, userId },
      select: { id: true },
    });
    if (!item) return NextResponse.json({ error: "Invalid itemId" }, { status: 400 });
    data.itemId = item.id;
  }
  // amountOverride: a finite number delinks this occurrence's amount; null
  // re-links it to the item's canonical amount.
  if (body.amountOverride !== undefined) {
    if (body.amountOverride === null) {
      data.amountOverride = null;
    } else {
      const n =
        typeof body.amountOverride === "number"
          ? body.amountOverride
          : typeof body.amountOverride === "string"
            ? parseFloat(body.amountOverride)
            : NaN;
      if (!Number.isFinite(n)) {
        return NextResponse.json({ error: "Invalid amountOverride" }, { status: 400 });
      }
      data.amountOverride = n;
    }
  }

  // Paid toggle: adjust account balances atomically when paid status changes.
  // - SAVINGS category items:  checking −amount, savings +amount
  // - CREDIT items (income):   checking +amount
  // - DEBIT items (expenses):  checking −amount
  // Unmarking paid reverses the above.
  if (body.paid !== undefined && typeof body.paid === "boolean" && body.paid !== existing.paid) {
    data.paid = body.paid;
    const fullEntry = await prisma.budgetEntry.findFirst({
      where: { id, userId },
      include: { item: { include: { category: true } } },
    });
    if (fullEntry) {
      const magnitude = fullEntry.amountOverride ?? fullEntry.item.amount;
      const dir = body.paid ? 1 : -1; // 1=marking paid, -1=unmarking
      const isSavings = fullEntry.item.category?.name === "SAVINGS";
      const isCredit = fullEntry.item.category?.kind === "CREDIT";

      if (isSavings) {
        await prisma.$transaction([
          prisma.budgetAccount.update({
            where: { userId_key: { userId, key: "checking" } },
            data: { balance: { increment: -magnitude * dir } },
          }),
          prisma.budgetAccount.update({
            where: { userId_key: { userId, key: "savings" } },
            data: { balance: { increment: magnitude * dir } },
          }),
        ]);
      } else {
        const delta = isCredit ? magnitude * dir : -magnitude * dir;
        await prisma.budgetAccount.update({
          where: { userId_key: { userId, key: "checking" } },
          data: { balance: { increment: delta } },
        });
      }
    }
  }

  const entry = await prisma.budgetEntry.update({ where: { id }, data, include: entryInclude });
  return NextResponse.json({ entry });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = await getPlaygroundUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const existing = await prisma.budgetEntry.findFirst({ where: { id, userId } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.budgetEntry.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
