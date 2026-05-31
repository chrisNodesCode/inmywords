import { NextRequest, NextResponse } from "next/server";
import { getPlaygroundUserId } from "@/lib/playground-auth";
import { reorderForUser } from "@/lib/reorder";

export async function POST(req: NextRequest) {
  const userId = await getPlaygroundUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  const ids = Array.isArray(body.ids) ? (body.ids as string[]) : [];
  await reorderForUser("prompt", ids, userId);
  return NextResponse.json({ ok: true });
}
