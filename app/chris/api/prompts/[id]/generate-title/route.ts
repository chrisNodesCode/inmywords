import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getPlaygroundUserId } from "@/lib/playground-auth";
import { extractPlainText, parseEntryContent } from "@/lib/tiptap-content";
import { countWords, generateTitle, MIN_TITLE_WORDS } from "@/lib/generate-title";

// POST /chris/api/prompts/[id]/generate-title
// Owner-gated. Reads the prompt's stored content and returns an AI-suggested
// title. Returns { title: null } (200) when the prompt is too short to name or
// Claude is unavailable — naming is best-effort and never blocks the UI.
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = await getPlaygroundUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const prompt = await prisma.prompt.findFirst({ where: { id, userId } });
  if (!prompt) return NextResponse.json({ error: "Not found" }, { status: 404 });

  let plainText = "";
  try {
    plainText = extractPlainText(parseEntryContent(prompt.content));
  } catch {
    plainText = prompt.content;
  }

  if (countWords(plainText) < MIN_TITLE_WORDS) {
    return NextResponse.json({ title: null });
  }

  try {
    const title = await generateTitle(plainText, "prompt");
    return NextResponse.json({ title });
  } catch (err) {
    console.error("Prompt title generation failed:", err);
    return NextResponse.json({ title: null });
  }
}
