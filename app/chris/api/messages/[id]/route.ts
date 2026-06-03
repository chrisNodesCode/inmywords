import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getPlaygroundUserId } from "@/lib/playground-auth";
import { isMessageChannel } from "@/lib/translate-message";

const VALID_STATUSES = ["draft", "response", "final"];

// PATCH /chris/api/messages/[id]
// Updatable: draft, finalDraft, channel, status. (response is set by /translate.)
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = await getPlaygroundUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const existing = await prisma.message.findFirst({ where: { id, userId } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json().catch(() => ({}));
  const data: Record<string, unknown> = {};

  if (typeof body.draft === "string") data.draft = body.draft;
  if (isMessageChannel(body.channel)) data.channel = body.channel;

  if ("finalDraft" in body) {
    const v = body.finalDraft;
    const cleaned = typeof v === "string" && v.trim() ? v : null;
    data.finalDraft = cleaned;
    // Auto-advance the stage when a final draft lands; fall back to whichever
    // earlier stage is still true when it's cleared.
    if (cleaned) data.status = "final";
    else data.status = existing.response ? "response" : "draft";
  }

  if (typeof body.status === "string" && VALID_STATUSES.includes(body.status)) {
    data.status = body.status;
  }

  if ("projectId" in body) {
    const v = body.projectId;
    if (v === null || v === "") {
      data.projectId = null;
    } else if (typeof v === "string") {
      const p = await prisma.project.findFirst({ where: { id: v, userId }, select: { id: true } });
      if (!p) return NextResponse.json({ error: "Invalid projectId" }, { status: 400 });
      data.projectId = p.id;
    }
  }

  const message = await prisma.message.update({
    where: { id },
    data,
    include: { project: { select: { id: true, name: true } } },
  });
  return NextResponse.json({ message });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = await getPlaygroundUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const existing = await prisma.message.findFirst({ where: { id, userId } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.message.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
