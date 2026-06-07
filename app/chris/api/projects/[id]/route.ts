import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getPlaygroundUserId } from "@/lib/playground-auth";
import {
  cleanFieldKeys,
  cleanCustomFields,
  cleanCompareConfig,
  compareFieldsForProject,
} from "@/app/chris/_lib/noteFields";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = await getPlaygroundUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const existing = await prisma.project.findFirst({ where: { id, userId } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json().catch(() => ({}));
  const data: Record<string, unknown> = {};

  if ("name" in body) {
    const name = typeof body.name === "string" ? body.name.trim() : "";
    if (!name) return NextResponse.json({ error: "Name is required" }, { status: 400 });
    data.name = name;
  }
  if ("noteFields" in body) {
    data.noteFields = cleanFieldKeys(body.noteFields);
  }

  // Custom fields can change here; compute the resulting set so we can validate
  // the compare config against the fields that will exist after this update.
  const nextCustoms =
    "customFields" in body ? cleanCustomFields(body.customFields) : cleanCustomFields(existing.customFields);
  if ("customFields" in body) {
    data.customFields = nextCustoms;
  }
  if ("compareConfig" in body) {
    const valid = new Set(compareFieldsForProject(nextCustoms).map((f) => f.key));
    valid.add("title");
    data.compareConfig = cleanCompareConfig(body.compareConfig, valid);
  }

  const project = await prisma.project.update({ where: { id }, data });
  return NextResponse.json({ project });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = await getPlaygroundUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const existing = await prisma.project.findFirst({ where: { id, userId } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Prompts and Todos use onDelete: SetNull, so they survive — just unlinked.
  await prisma.project.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
