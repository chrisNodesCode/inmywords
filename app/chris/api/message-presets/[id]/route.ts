import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getPlaygroundUserId } from "@/lib/playground-auth";
import { DEFAULT_MODE_PROMPTS, isMessageMode } from "@/lib/translate-message";

// PATCH /chris/api/message-presets/[id]
// Edit a preset's prompt (and optionally its label). Body: { prompt?, label?,
// reset? }. When `reset` is true, restore the mode's built-in default prompt.
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = await getPlaygroundUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const existing = await prisma.messagePreset.findFirst({ where: { id, userId } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json().catch(() => ({}));
  const data: Record<string, unknown> = {};

  if (body.reset === true && isMessageMode(existing.key)) {
    data.prompt = DEFAULT_MODE_PROMPTS[existing.key];
  } else if (typeof body.prompt === "string") {
    if (body.prompt.trim() === "") {
      return NextResponse.json({ error: "Prompt cannot be empty" }, { status: 400 });
    }
    data.prompt = body.prompt;
  }

  if (typeof body.label === "string" && body.label.trim()) {
    data.label = body.label.trim();
  }

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
  }

  const preset = await prisma.messagePreset.update({ where: { id }, data });
  return NextResponse.json({ preset });
}
