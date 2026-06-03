import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getPlaygroundUserId } from "@/lib/playground-auth";
import { extractPlainText, parseEntryContent } from "@/lib/tiptap-content";
import {
  DEFAULT_MODE_PROMPTS,
  isMessageChannel,
  isMessageMode,
  translateMessage,
  type MessageMode,
} from "@/lib/translate-message";

// POST /chris/api/messages/[id]/translate
// Reads the stored draft and asks Claude to rewrite it for the message's channel
// using the chosen persona preset (mode). Stores the result as `response` and
// advances status. Body: { channel?, mode? } — mode picks which editable preset
// prompt to send.
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = await getPlaygroundUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const existing = await prisma.message.findFirst({ where: { id, userId } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json().catch(() => ({}));
  const channel = isMessageChannel(body.channel) ? body.channel : (existing.channel as "slack" | "email" | "text");
  const mode: MessageMode = isMessageMode(body.mode) ? body.mode : "professional";

  // Resolve the system prompt from the owner's editable preset for this mode,
  // falling back to the built-in default if it hasn't been seeded yet.
  const preset = await prisma.messagePreset.findFirst({ where: { userId, key: mode } });
  const systemPrompt = preset?.prompt?.trim() || DEFAULT_MODE_PROMPTS[mode];

  let plainText = "";
  try {
    plainText = extractPlainText(parseEntryContent(existing.draft));
  } catch {
    plainText = existing.draft;
  }
  if (plainText.trim().length < 2) {
    return NextResponse.json({ error: "Draft is empty" }, { status: 400 });
  }

  try {
    const response = await translateMessage(plainText, channel, systemPrompt);
    const message = await prisma.message.update({
      where: { id },
      data: {
        response,
        channel,
        // Don't downgrade a message that already has a final draft.
        status: existing.status === "final" ? "final" : "response",
      },
    });
    return NextResponse.json({ message });
  } catch (err) {
    console.error("Message translation failed:", err);
    return NextResponse.json({ error: "Translation unavailable" }, { status: 503 });
  }
}
