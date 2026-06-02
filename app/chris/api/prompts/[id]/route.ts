import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getPlaygroundUserId } from "@/lib/playground-auth";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = await getPlaygroundUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const existing = await prisma.prompt.findFirst({ where: { id, userId } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json().catch(() => ({}));
  const data: Record<string, unknown> = {};

  if (typeof body.content === "string") data.content = body.content;
  if ("title" in body) {
    data.title = typeof body.title === "string" && body.title.trim() ? body.title.trim() : null;
  }
  const VALID_STATUSES = ["draft", "in-progress", "done", "wont-do"];
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

  const prompt = await prisma.prompt.update({
    where: { id },
    data,
    include: { project: { select: { id: true, name: true } } },
  });
  return NextResponse.json({ prompt });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = await getPlaygroundUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const existing = await prisma.prompt.findFirst({ where: { id, userId } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.prompt.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
