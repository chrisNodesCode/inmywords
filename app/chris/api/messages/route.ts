import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getPlaygroundUserId } from "@/lib/playground-auth";
import { isMessageChannel } from "@/lib/translate-message";

// GET /chris/api/messages — owner's message drafts, ordered for the feed.
export async function GET() {
  const userId = await getPlaygroundUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const messages = await prisma.message.findMany({
    where: { userId },
    orderBy: [{ sortOrder: "asc" }, { updatedAt: "desc" }],
    include: { project: { select: { id: true, name: true } } },
  });
  return NextResponse.json({ messages });
}

async function resolveProjectId(value: unknown, userId: string): Promise<string | null | false> {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value !== "string") return false;
  const project = await prisma.project.findFirst({ where: { id: value, userId }, select: { id: true } });
  return project ? project.id : false;
}

// POST /chris/api/messages — create a draft. Body: { draft, channel? }
export async function POST(req: NextRequest) {
  const userId = await getPlaygroundUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const draft = typeof body.draft === "string" ? body.draft : "";
  if (!draft || draft.trim() === "") {
    return NextResponse.json({ error: "Draft is required" }, { status: 400 });
  }
  const channel = isMessageChannel(body.channel) ? body.channel : "email";

  const projectId = await resolveProjectId(body.projectId, userId);
  if (projectId === false) {
    return NextResponse.json({ error: "Invalid projectId" }, { status: 400 });
  }

  const message = await prisma.message.create({
    data: { userId, draft, channel, status: "draft", projectId },
    include: { project: { select: { id: true, name: true } } },
  });
  return NextResponse.json({ message }, { status: 201 });
}
