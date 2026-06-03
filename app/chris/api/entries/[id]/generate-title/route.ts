import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getPlaygroundUserId } from "@/lib/playground-auth";
import { extractPlainText, parseEntryContent } from "@/lib/tiptap-content";
import { countWords, generateTitle, MIN_TITLE_WORDS } from "@/lib/generate-title";

// POST /chris/api/entries/[id]/generate-title
// Owner-gated auto-naming for the playground journal. Mirrors the main app's
// /api/entries/[id]/generate-title but without the asd_user plan gate, since the
// playground is already owner-only. Reads the entry's stored content and returns
// an AI-suggested title. Returns { title: null } (200) when too short or Claude
// is unavailable — naming is best-effort and never blocks a save.
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = await getPlaygroundUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const entry = await prisma.journalEntry.findFirst({ where: { id, userId } });
  if (!entry) return NextResponse.json({ error: "Not found" }, { status: 404 });

  let plainText = "";
  try {
    plainText = extractPlainText(parseEntryContent(entry.content));
  } catch {
    plainText = entry.content;
  }

  if (countWords(plainText) < MIN_TITLE_WORDS) {
    return NextResponse.json({ title: null });
  }

  try {
    const title = await generateTitle(plainText, "journal");
    return NextResponse.json({ title });
  } catch (err) {
    console.error("Playground journal title generation failed:", err);
    return NextResponse.json({ title: null });
  }
}
