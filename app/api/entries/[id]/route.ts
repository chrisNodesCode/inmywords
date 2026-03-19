import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

async function getUserId(): Promise<string | null> {
  if (process.env.NEXT_PUBLIC_DEV_BYPASS_AUTH === "true") {
    return "dev-user-local";
  }
  const { userId } = await auth();
  return userId;
}

type RouteParams = { params: Promise<{ id: string }> };

// GET /api/entries/[id] — get a single entry
export async function GET(_request: NextRequest, { params }: RouteParams) {
  const userId = await getUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const entry = await prisma.journalEntry.findFirst({
    where: { id, userId },
  });

  if (!entry) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json(entry);
}

// PATCH /api/entries/[id] — update an entry
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const userId = await getUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const body = await request.json();
  const { content, tags, mood, title } = body;

  if (content !== undefined && (typeof content !== "string" || content.trim() === "")) {
    return NextResponse.json({ error: "Content must be a non-empty string" }, { status: 400 });
  }
  if (mood !== undefined && mood !== null && typeof mood !== "string") {
    return NextResponse.json({ error: "mood must be a string or null" }, { status: 400 });
  }
  if (title !== undefined && title !== null && typeof title !== "string") {
    return NextResponse.json({ error: "title must be a string or null" }, { status: 400 });
  }

  // Verify ownership before updating
  const existing = await prisma.journalEntry.findFirst({
    where: { id, userId },
  });

  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const entry = await prisma.journalEntry.update({
    where: { id },
    data: {
      ...(content !== undefined && { content: content.trim() }),
      ...(Array.isArray(tags) && { tags }),
      ...(mood !== undefined && { mood: mood ?? null }),
      ...(title !== undefined && { title: title ? title.trim() : null }),
    },
  });

  return NextResponse.json(entry);
}

// DELETE /api/entries/[id] — delete an entry
export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  const userId = await getUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  // Verify ownership before deleting
  const existing = await prisma.journalEntry.findFirst({
    where: { id, userId },
  });

  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await prisma.journalEntry.delete({
    where: { id },
  });

  return NextResponse.json({ success: true });
}
