import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ACCENT_COLORS, FONT_OPTIONS, USER_PREFERENCE_DEFAULTS } from "@/lib/theme";

const VALID_ACCENTS = ACCENT_COLORS.map((a) => a.id);
const VALID_FONTS = FONT_OPTIONS.map((f) => f.id);
const VALID_LINE_WIDTHS = ["narrow", "mid", "wide"];

async function getUserId(): Promise<string | null> {
  if (process.env.NEXT_PUBLIC_DEV_BYPASS_AUTH === "true") {
    return "dev-user-local";
  }
  const { userId } = await auth();
  return userId;
}

// GET /api/preferences — fetch or create preferences for the current user
export async function GET() {
  const userId = await getUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Try to find existing prefs first to avoid upsert race in React StrictMode dev
  let prefs = await prisma.userPreferences.findUnique({ where: { userId } });

  if (!prefs) {
    // asd_user plan gets autoAnalyze: true by default; free_user gets false
    let autoAnalyzeDefault = false;
    if (process.env.NEXT_PUBLIC_DEV_BYPASS_AUTH === "true") {
      autoAnalyzeDefault = true;
    } else {
      const { has } = await auth();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      autoAnalyzeDefault = !!(has?.({ plan: "asd_user" } as any));
    }

    try {
      prefs = await prisma.userPreferences.create({
        data: {
          userId,
          accent: USER_PREFERENCE_DEFAULTS.accent,
          font: USER_PREFERENCE_DEFAULTS.font,
          darkMode: USER_PREFERENCE_DEFAULTS.darkMode,
          editorFontSize: USER_PREFERENCE_DEFAULTS.editorFontSize,
          editorLineWidth: USER_PREFERENCE_DEFAULTS.editorLineWidth,
          autoAnalyze: autoAnalyzeDefault,
        },
      });
    } catch {
      // Concurrent create (e.g. React StrictMode double-mount) — re-fetch
      prefs = await prisma.userPreferences.findUnique({ where: { userId } });
    }
  }

  return NextResponse.json(prefs);
}

// PUT /api/preferences — update one or more preference fields
export async function PUT(request: NextRequest) {
  const userId = await getUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { accent, font, darkMode, deepWriteDefault, editorFontSize, editorLineWidth, autoAnalyze } = body;

  // Validate fields that are present
  if (accent !== undefined && !VALID_ACCENTS.includes(accent)) {
    return NextResponse.json({ error: "Invalid accent value" }, { status: 400 });
  }
  if (font !== undefined && !VALID_FONTS.includes(font)) {
    return NextResponse.json({ error: "Invalid font value" }, { status: 400 });
  }
  if (darkMode !== undefined && typeof darkMode !== "boolean") {
    return NextResponse.json({ error: "darkMode must be boolean" }, { status: 400 });
  }
  if (deepWriteDefault !== undefined && typeof deepWriteDefault !== "boolean") {
    return NextResponse.json({ error: "deepWriteDefault must be boolean" }, { status: 400 });
  }
  if (editorFontSize !== undefined && (typeof editorFontSize !== "number" || editorFontSize < 12 || editorFontSize > 32)) {
    return NextResponse.json({ error: "editorFontSize must be 12–32" }, { status: 400 });
  }
  if (editorLineWidth !== undefined && !VALID_LINE_WIDTHS.includes(editorLineWidth)) {
    return NextResponse.json({ error: "Invalid editorLineWidth value" }, { status: 400 });
  }
  if (autoAnalyze !== undefined && typeof autoAnalyze !== "boolean") {
    return NextResponse.json({ error: "autoAnalyze must be boolean" }, { status: 400 });
  }

  const updateData: Record<string, unknown> = {};
  if (accent !== undefined) updateData.accent = accent;
  if (font !== undefined) updateData.font = font;
  if (darkMode !== undefined) updateData.darkMode = darkMode;
  if (deepWriteDefault !== undefined) updateData.deepWriteDefault = deepWriteDefault;
  if (editorFontSize !== undefined) updateData.editorFontSize = editorFontSize;
  if (editorLineWidth !== undefined) updateData.editorLineWidth = editorLineWidth;
  if (autoAnalyze !== undefined) updateData.autoAnalyze = autoAnalyze;

  const prefs = await prisma.userPreferences.upsert({
    where: { userId },
    update: updateData,
    create: {
      userId,
      accent: accent ?? USER_PREFERENCE_DEFAULTS.accent,
      font: font ?? USER_PREFERENCE_DEFAULTS.font,
      darkMode: darkMode ?? USER_PREFERENCE_DEFAULTS.darkMode,
      editorFontSize: editorFontSize ?? USER_PREFERENCE_DEFAULTS.editorFontSize,
      editorLineWidth: editorLineWidth ?? USER_PREFERENCE_DEFAULTS.editorLineWidth,
    },
  });

  return NextResponse.json(prefs);
}
