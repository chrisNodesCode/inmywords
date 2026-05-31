import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getPlaygroundUserId } from "@/lib/playground-auth";
import type { Priority } from "@prisma/client";

const PRIORITIES: Priority[] = ["LOW", "MEDIUM", "HIGH"];

function parsePriority(value: unknown): Priority | null {
  return typeof value === "string" && PRIORITIES.includes(value as Priority)
    ? (value as Priority)
    : null;
}

function parseDueDate(value: unknown): Date | null {
  if (!value || typeof value !== "string") return null;
  const d = new Date(value);
  return isNaN(d.getTime()) ? null : d;
}

// Validate that an entryId (if provided) belongs to this user; returns the
// entryId to set, or null to clear, or `false` if invalid.
async function resolveEntryId(
  value: unknown,
  userId: string
): Promise<string | null | false> {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value !== "string") return false;
  const entry = await prisma.journalEntry.findFirst({
    where: { id: value, userId },
    select: { id: true },
  });
  return entry ? entry.id : false;
}

// GET /chris/api/todos — list this user's todos (with any linked entry)
export async function GET() {
  const userId = await getPlaygroundUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const todos = await prisma.todo.findMany({
    where: { userId },
    orderBy: [{ completed: "asc" }, { createdAt: "desc" }],
    include: { entry: { select: { id: true, title: true } } },
  });
  return NextResponse.json({ todos });
}

// POST /chris/api/todos — create a todo (only `title` is required)
export async function POST(req: NextRequest) {
  const userId = await getPlaygroundUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const title = typeof body.title === "string" ? body.title.trim() : "";
  if (!title) return NextResponse.json({ error: "Title is required" }, { status: 400 });

  const entryId = await resolveEntryId(body.entryId, userId);
  if (entryId === false) {
    return NextResponse.json({ error: "Invalid entryId" }, { status: 400 });
  }

  const todo = await prisma.todo.create({
    data: {
      userId,
      title,
      note: typeof body.note === "string" && body.note.trim() ? body.note.trim() : null,
      priority: parsePriority(body.priority),
      dueDate: parseDueDate(body.dueDate),
      entryId,
    },
    include: { entry: { select: { id: true, title: true } } },
  });
  return NextResponse.json({ todo }, { status: 201 });
}
