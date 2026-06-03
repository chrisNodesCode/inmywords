import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { generateTitle } from "@/lib/generate-title";

async function getUserId(): Promise<string | null> {
  if (process.env.NEXT_PUBLIC_DEV_BYPASS_AUTH === "true") return "dev-user-local";
  const { userId } = await auth();
  return userId;
}

type RouteParams = { params: Promise<{ id: string }> };

// POST /api/entries/[id]/generate-title
// id can be a real entry ID (verifies ownership) or "new" (uses content from body)
// body: { content: string } — plain text to generate a title for
export async function POST(request: NextRequest, { params }: RouteParams) {
  const userId = await getUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const isASDUser = process.env.NEXT_PUBLIC_DEV_BYPASS_AUTH === "true"
    ? true
    : !!((await auth()).has?.({ plan: "asd_user" } as any));
  if (!isASDUser) {
    return NextResponse.json({ error: "Plan upgrade required" }, { status: 403 });
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
    const title = await generateTitle(content, "journal");
    return NextResponse.json({ title });
  } catch (err) {
    console.error("Title generation failed:", err);
    return NextResponse.json({ error: "Title generation unavailable" }, { status: 503 });
  }
}
