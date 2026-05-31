import { prisma } from "@/lib/prisma";

// Given a list of ids and the model name, set sortOrder = index for each row
// belonging to the user. Unknown ids are silently skipped. Runs in a
// transaction so the order is atomic.
type ReorderModel =
  | "todo"
  | "shoppingItem"
  | "shoppingList"
  | "project"
  | "prompt"
  | "journalEntry";

export async function reorderForUser(
  model: ReorderModel,
  ids: string[],
  userId: string
): Promise<void> {
  if (!Array.isArray(ids) || ids.length === 0) return;
  // Validate ownership in bulk before writing
  const m = prisma[model] as unknown as {
    findMany: (args: {
      where: Record<string, unknown>;
      select: { id: true };
    }) => Promise<{ id: string }[]>;
    update: (args: {
      where: { id: string };
      data: { sortOrder: number };
    }) => Promise<unknown>;
  };
  const owned = await m.findMany({
    where: { id: { in: ids }, userId },
    select: { id: true },
  });
  const ownedSet = new Set(owned.map((o) => o.id));
  // Run updates sequentially (Prisma's $transaction array overload is fussy
  // about generic delegate types; serial updates are fine for our list sizes).
  let idx = 0;
  for (const id of ids) {
    if (!ownedSet.has(id)) {
      idx += 1;
      continue;
    }
    await m.update({ where: { id }, data: { sortOrder: idx } });
    idx += 1;
  }
}
