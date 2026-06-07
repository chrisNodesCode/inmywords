import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getPlaygroundUserId } from "@/lib/playground-auth";
import { extractPlainText, parseEntryContent } from "@/lib/tiptap-content";
import { countWords, generateTitle, MIN_TITLE_WORDS } from "@/lib/generate-title";

// POST /chris/api/notes/[id]/generate-title
// Owner-gated. Reads the note's stored content and returns an AI-suggested
// title. Returns { title: null } (200) when the note is too short to name or
// Claude is unavailable — naming is best-effort and never blocks the UI. Uses
// the "prompt" voice (descriptive, file-name-style) since notes are reference
// material rather than personal journaling.
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = await getPlaygroundUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const note = await prisma.note.findFirst({ where: { id, userId } });
  if (!note) return NextResponse.json({ error: "Not found" }, { status: 404 });

  let plainText = "";
  try {
    plainText = extractPlainText(parseEntryContent(note.content));
  } catch {
    plainText = note.content;
  }

  if (countWords(plainText) < MIN_TITLE_WORDS) {
    return NextResponse.json({ title: null });
  }

  try {
    const title = await generateTitle(plainText, "prompt");
    return NextResponse.json({ title });
  } catch (err) {
    console.error("Note title generation failed:", err);
    return NextResponse.json({ title: null });
  }
}
