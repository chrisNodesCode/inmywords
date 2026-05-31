import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getPlaygroundUserId } from "@/lib/playground-auth";
import type { Priority } from "@prisma/client";

const PRIORITIES: Priority[] = ["LOW", "MEDIUM", "HIGH"];

// PATCH /chris/api/todos/[id] — update fields or toggle completion
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = await getPlaygroundUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const existing = await prisma.todo.findFirst({ where: { id, userId } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json().catch(() => ({}));
  const data: Record<string, unknown> = {};

  if (typeof body.title === "string" && body.title.trim()) data.title = body.title.trim();
  if ("note" in body) {
    data.note = typeof body.note === "string" && body.note.trim() ? body.note.trim() : null;
  }
  if ("priority" in body) {
    data.priority =
      typeof body.priority === "string" && PRIORITIES.includes(body.priority as Priority)
        ? (body.priority as Priority)
        : null;
  }
  if ("dueDate" in body) {
    const d = body.dueDate ? new Date(body.dueDate) : null;
    data.dueDate = d && !isNaN(d.getTime()) ? d : null;
  }
  if (typeof body.completed === "boolean") {
    data.completed = body.completed;
    data.completedAt = body.completed ? new Date() : null;
  }
  if ("entryId" in body) {
    const v = body.entryId;
    if (v === null || v === "") {
      data.entryId = null;
    } else if (typeof v === "string") {
      const entry = await prisma.journalEntry.findFirst({
        where: { id: v, userId },
        select: { id: true },
      });
      if (!entry) return NextResponse.json({ error: "Invalid entryId" }, { status: 400 });
      data.entryId = entry.id;
    }
  }

  const todo = await prisma.todo.update({
    where: { id },
    data,
    include: { entry: { select: { id: true, title: true } } },
  });
  return NextResponse.json({ todo });
}

// DELETE /chris/api/todos/[id]
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = await getPlaygroundUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const existing = await prisma.todo.findFirst({ where: { id, userId } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.todo.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
