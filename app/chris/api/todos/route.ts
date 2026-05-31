import { NextRequest, NextResponse } from "next/server";
import { playgroundDb } from "@/lib/playground-db";
import { getPlaygroundUserId } from "@/lib/playground-auth";
import type { Priority } from "@/lib/generated/playground";

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

// GET /chris/api/todos — list this user's todos
export async function GET() {
  const userId = await getPlaygroundUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const todos = await playgroundDb.todo.findMany({
    where: { userId },
    orderBy: [{ completed: "asc" }, { createdAt: "desc" }],
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

  const todo = await playgroundDb.todo.create({
    data: {
      userId,
      title,
      note: typeof body.note === "string" && body.note.trim() ? body.note.trim() : null,
      priority: parsePriority(body.priority),
      dueDate: parseDueDate(body.dueDate),
    },
  });
  return NextResponse.json({ todo }, { status: 201 });
}
