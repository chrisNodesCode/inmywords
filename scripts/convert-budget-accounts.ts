/**
 * One-off: migrate the legacy "CHECKING CURRENT" / "SAVINGS CURRENT" line items
 * into BudgetAccount balances, then remove them from the calendar (their entries
 * cascade). After this, the calendar's running total starts from the Checking
 * account balance and the two currents live as editable account cards.
 *
 * Idempotent. Usage:
 *   npx tsx scripts/convert-budget-accounts.ts                 # dev-user-local
 *   BUDGET_USER_ID=<clerkId> npx tsx scripts/convert-budget-accounts.ts
 */
import "dotenv/config";
import { prisma } from "../lib/prisma";

const USER_ID = process.env.BUDGET_USER_ID || "dev-user-local";

const MAP: { itemName: string; key: string; label: string; sortOrder: number }[] = [
  { itemName: "CHECKING CURRENT", key: "checking", label: "Checking", sortOrder: 0 },
  { itemName: "SAVINGS CURRENT", key: "savings", label: "Savings", sortOrder: 1 },
];

async function main() {
  for (const m of MAP) {
    const item = await prisma.budgetItem.findFirst({
      where: { userId: USER_ID, name: m.itemName },
    });
    const balance = item?.amount ?? undefined;

    await prisma.budgetAccount.upsert({
      where: { userId_key: { userId: USER_ID, key: m.key } },
      update: balance !== undefined ? { balance } : {},
      create: {
        userId: USER_ID,
        key: m.key,
        label: m.label,
        balance: balance ?? 0,
        sortOrder: m.sortOrder,
      },
    });

    if (item) {
      // Entries cascade on item delete.
      await prisma.budgetItem.delete({ where: { id: item.id } });
      console.log(`${m.key}: balance=${balance} (removed item "${m.itemName}")`);
    } else {
      console.log(`${m.key}: ensured account (no legacy item found)`);
    }
  }
  console.log(`Done for userId="${USER_ID}"`);
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
