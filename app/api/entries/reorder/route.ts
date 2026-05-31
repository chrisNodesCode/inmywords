import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { reorderForUser } from "@/lib/reorder";

async function getUserId(): Promise<string | null> {
  if (process.env.NEXT_PUBLIC_DEV_BYPASS_AUTH === "true") {
    return "dev-user-local";
  }
  const { userId } = await auth();
  return userId;
}

export async function POST(req: NextRequest) {
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  const ids = Array.isArray(body.ids) ? (body.ids as string[]) : [];
  await reorderForUser("journalEntry", ids, userId);
  return NextResponse.json({ ok: true });
}
