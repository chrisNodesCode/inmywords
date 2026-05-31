import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getPlaygroundUserId } from "@/lib/playground-auth";

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

  const prompts = await prisma.prompt.findMany({
    where: { userId },
    orderBy: { updatedAt: "desc" },
    include: { project: { select: { id: true, name: true } } },
  });
  return NextResponse.json({ prompts });
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

  const prompt = await prisma.prompt.create({
    data: { userId, content, projectId, title },
    include: { project: { select: { id: true, name: true } } },
  });
  return NextResponse.json({ prompt }, { status: 201 });
}
