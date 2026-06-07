import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getPlaygroundUserId } from "@/lib/playground-auth";
import { buildNoteFieldData } from "./fields";
import { cleanFieldKeys } from "@/app/chris/_lib/noteFields";

async function resolveProjectId(
  value: unknown,
  userId: string
): Promise<string | null | false> {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value !== "string") return false;
  const project = await prisma.project.findFirst({
    where: { id: value, userId },
    select: { id: true },
  });
  return project ? project.id : false;
}

export async function GET() {
  const userId = await getPlaygroundUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const notes = await prisma.note.findMany({
    where: { userId },
    orderBy: [{ sortOrder: "asc" }, { updatedAt: "desc" }],
    include: { project: { select: { id: true, name: true } } },
  });
  return NextResponse.json({ notes });
}

export async function POST(req: NextRequest) {
  const userId = await getPlaygroundUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const content = typeof body.content === "string" ? body.content : "";
  if (!content || content.trim() === "") {
    return NextResponse.json({ error: "Content is required" }, { status: 400 });
  }

  const projectId = await resolveProjectId(body.projectId, userId);
  if (projectId === false) {
    return NextResponse.json({ error: "Invalid projectId" }, { status: 400 });
  }

  const title = typeof body.title === "string" && body.title.trim() ? body.title.trim() : null;

  const fieldData = buildNoteFieldData(body);
  if (fieldData === null) {
    return NextResponse.json({ error: "Invalid field value" }, { status: 400 });
  }

  // New notes inherit the parent project's field template, unless the caller
  // explicitly supplied enabledFields.
  if (!("enabledFields" in body) && projectId) {
    const project = await prisma.project.findFirst({
      where: { id: projectId, userId },
      select: { noteFields: true },
    });
    if (project) fieldData.enabledFields = cleanFieldKeys(project.noteFields);
  }

  const note = await prisma.note.create({
    data: { userId, content, projectId, title, ...fieldData },
    include: { project: { select: { id: true, name: true } } },
  });
  return NextResponse.json({ note }, { status: 201 });
}
