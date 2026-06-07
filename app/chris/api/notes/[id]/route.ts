import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getPlaygroundUserId } from "@/lib/playground-auth";
import { buildNoteFieldData, buildCustomValues } from "../fields";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = await getPlaygroundUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const existing = await prisma.note.findFirst({ where: { id, userId } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json().catch(() => ({}));
  const data: Record<string, unknown> = {};

  if (typeof body.content === "string") data.content = body.content;
  if ("title" in body) {
    data.title = typeof body.title === "string" && body.title.trim() ? body.title.trim() : null;
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

  const fieldData = buildNoteFieldData(body);
  if (fieldData === null) {
    return NextResponse.json({ error: "Invalid field value" }, { status: 400 });
  }
  Object.assign(data, fieldData);

  if ("customValues" in body) {
    const cv = buildCustomValues(body.customValues);
    if (cv === false) return NextResponse.json({ error: "Invalid customValues" }, { status: 400 });
    data.customValues = cv;
  }

  const note = await prisma.note.update({
    where: { id },
    data,
    include: { project: { select: { id: true, name: true } } },
  });
  return NextResponse.json({ note });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = await getPlaygroundUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const existing = await prisma.note.findFirst({ where: { id, userId } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.note.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
