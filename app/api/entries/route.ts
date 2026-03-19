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

// GET /api/entries — list all entries for the current user
export async function GET() {
  const userId = await getUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const entries = await prisma.journalEntry.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(entries);
}

// POST /api/entries — create a new entry
export async function POST(request: NextRequest) {
  const userId = await getUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { content, mood, title } = body;

  if (!content || typeof content !== "string" || content.trim() === "") {
    return NextResponse.json({ error: "Content is required" }, { status: 400 });
  }

  const entry = await prisma.journalEntry.create({
    data: {
      userId,
      content: content.trim(),
      ...(mood && typeof mood === "string" && { mood }),
      ...(title && typeof title === "string" && { title: title.trim() }),
    },
  });

  return NextResponse.json(entry, { status: 201 });
}
