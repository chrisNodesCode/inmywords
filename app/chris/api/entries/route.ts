import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getPlaygroundUserId } from "@/lib/playground-auth";
import { parseEntryContent, extractPlainText } from "@/lib/tiptap-content";

// GET /chris/api/entries — minimal owner-gated entry list for the to-do linker.
// Returns just enough to render a picker: id, title, a short text snippet, date.
export async function GET() {
  const userId = await getPlaygroundUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const entries = await prisma.journalEntry.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    select: { id: true, title: true, content: true, createdAt: true },
  });

  const items = entries.map((e) => {
    let snippet = "";
    try {
      snippet = extractPlainText(parseEntryContent(e.content)).slice(0, 90);
    } catch {
      snippet = "";
    }
    return { id: e.id, title: e.title, snippet, createdAt: e.createdAt };
  });

  return NextResponse.json({ entries: items });
}
