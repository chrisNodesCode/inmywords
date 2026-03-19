import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { generateText } from "ai";
import { prisma } from "@/lib/prisma";
import { anthropic, CLAUDE_MODEL } from "@/lib/ai";

async function getUserId(): Promise<string | null> {
  if (process.env.NEXT_PUBLIC_DEV_BYPASS_AUTH === "true") return "dev-user-local";
  const { userId } = await auth();
  return userId;
}

const TITLE_SYSTEM_PROMPT = `You are helping someone give a name to something they experienced and wrote about.

They've written a journal entry about their life — often about hard moments, sensory experiences, emotional days, or things that were difficult to navigate. Your job is to read what they wrote and suggest a short, evocative title that feels true to their experience.

The title should:
- Be 8 words or fewer
- Reflect what actually happened or what they felt — not a diagnostic label
- Sound like something a thoughtful, caring friend might say, not a clinician
- Capture the emotional truth or the specific moment
- Use plain, human language — no jargon, no clinical framing
- Feel personal and specific, not generic

Return ONLY the title itself — no quotes, no punctuation at the end, nothing else.`;

type RouteParams = { params: Promise<{ id: string }> };

// POST /api/entries/[id]/generate-title
// id can be a real entry ID (verifies ownership) or "new" (uses content from body)
// body: { content: string } — plain text to generate a title for
export async function POST(request: NextRequest, { params }: RouteParams) {
  const userId = await getUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const body = await request.json();
  const { content } = body;

  if (!content || typeof content !== "string" || content.trim().length < 10) {
    return NextResponse.json({ error: "content must be at least 10 characters" }, { status: 400 });
  }

  // If id is a real entry (not "new"), verify ownership
  if (id !== "new") {
    const entry = await prisma.journalEntry.findFirst({ where: { id, userId } });
    if (!entry) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
  }

  try {
    const { text } = await generateText({
      model: anthropic(CLAUDE_MODEL),
      system: TITLE_SYSTEM_PROMPT,
      prompt: content.trim(),
      maxOutputTokens: 60,
    });

    return NextResponse.json({ title: text.trim() });
  } catch (err) {
    console.error("Title generation failed:", err);
    return NextResponse.json({ error: "Title generation unavailable" }, { status: 503 });
  }
}
