import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { generateText } from "ai";
import { prisma } from "@/lib/prisma";
import { anthropic, CLAUDE_MODEL } from "@/lib/ai";
import { CATEGORIES } from "@/lib/theme";

async function getUserId(): Promise<string | null> {
  if (process.env.NEXT_PUBLIC_DEV_BYPASS_AUTH === "true") return "dev-user-local";
  const { userId } = await auth();
  return userId;
}

const CATEGORY_IDS = CATEGORIES.map((c) => c.id).join(", ");

const ANALYZE_SYSTEM_PROMPT = `You help people understand patterns in their lived experience of neurodivergence by gently reflecting their journal entries back to them.

Read the journal entry carefully. Identify which of these categories feel genuinely present in what they wrote:

${CATEGORIES.map((c) => `- ${c.id}: ${c.label}`).join("\n")}

Valid category IDs are: ${CATEGORY_IDS}

For each category that applies, write a one-sentence rationale that:
- Reflects the person's own words and experience back to them
- Sounds like a thoughtful friend observing what they shared, not a clinician labeling them
- Is specific to what they actually wrote, not generic
- Avoids diagnostic language ("you have...", "this indicates...", "symptoms of...")

Return ONLY valid JSON — an array of objects in this exact format:
[
  {
    "category": "category-id",
    "confidence": 0.85,
    "rationale": "One sentence reflecting this back to them."
  }
]

Rules:
- Only include categories with genuine evidence in the text (confidence > 0.4)
- If nothing clearly applies, return []
- Do not include explanation outside the JSON array
- confidence is a number between 0.0 and 1.0`;

type AISuggestion = {
  category: string;
  confidence: number;
  rationale: string;
};

type RouteParams = { params: Promise<{ id: string }> };

// POST /api/entries/[id]/analyze — classify entry into IMW categories
export async function POST(request: NextRequest, { params }: RouteParams) {
  const userId = await getUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const entry = await prisma.journalEntry.findFirst({ where: { id, userId } });
  if (!entry) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  try {
    const { text } = await generateText({
      model: anthropic(CLAUDE_MODEL),
      system: ANALYZE_SYSTEM_PROMPT,
      prompt: entry.content,
      maxOutputTokens: 800,
    });

    // Parse and validate the JSON response
    let suggestions: AISuggestion[] = [];
    try {
      // Strip markdown code fences Claude sometimes adds despite "Return ONLY valid JSON" instruction
      const cleaned = text.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
      const parsed = JSON.parse(cleaned);
      if (Array.isArray(parsed)) {
        suggestions = parsed.filter(
          (s) =>
            typeof s.category === "string" &&
            CATEGORIES.some((c) => c.id === s.category) &&
            typeof s.confidence === "number" &&
            typeof s.rationale === "string"
        );
      }
    } catch {
      // Malformed JSON from LLM — return empty suggestions rather than erroring
      suggestions = [];
    }

    // Store raw suggestions on the entry for re-display without re-calling API
    await prisma.journalEntry.update({
      where: { id },
      data: { aiSuggestions: suggestions },
    });

    return NextResponse.json({ suggestions });
  } catch (err) {
    console.error("Analysis failed:", err);
    // Return 200 with empty suggestions rather than 500 — per ticket spec
    return NextResponse.json({ suggestions: [] });
  }
}
