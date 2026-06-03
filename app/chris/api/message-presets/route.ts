import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getPlaygroundUserId } from "@/lib/playground-auth";
import { MESSAGE_MODES, DEFAULT_MODE_PROMPTS } from "@/lib/translate-message";

// GET /chris/api/message-presets
// Returns the owner's three editable persona presets, seeding any that don't
// exist yet from the defaults in lib/translate-message.ts. Idempotent.
export async function GET() {
  const userId = await getPlaygroundUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const existing = await prisma.messagePreset.findMany({ where: { userId } });
  const byKey = new Map(existing.map((p) => [p.key, p]));

  // Seed missing presets (first load, or after a new mode is added).
  const toCreate = MESSAGE_MODES.filter((m) => !byKey.has(m.value)).map((m, i) => ({
    userId,
    key: m.value,
    label: m.label,
    prompt: DEFAULT_MODE_PROMPTS[m.value],
    sortOrder: MESSAGE_MODES.findIndex((x) => x.value === m.value) + i * 0,
  }));
  if (toCreate.length) {
    await prisma.messagePreset.createMany({ data: toCreate, skipDuplicates: true });
  }

  const presets = await prisma.messagePreset.findMany({
    where: { userId },
    orderBy: { sortOrder: "asc" },
  });
  // Stable order matching MESSAGE_MODES regardless of stored sortOrder.
  presets.sort(
    (a, b) =>
      MESSAGE_MODES.findIndex((m) => m.value === a.key) -
      MESSAGE_MODES.findIndex((m) => m.value === b.key)
  );
  return NextResponse.json({ presets });
}
