import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { generateText } from "ai";
import { prisma } from "@/lib/prisma";
import { anthropic, CLAUDE_MODEL } from "@/lib/ai";
import { CATEGORIES } from "@/lib/theme";
import type { AIAnalysisResult, AISuggestion } from "@/lib/types";
import { DSM_CRITERIA_IDS } from "@/lib/types";

async function getUserId(): Promise<string | null> {
  if (process.env.NEXT_PUBLIC_DEV_BYPASS_AUTH === "true") return "dev-user-local";
  const { userId } = await auth();
  return userId;
}

const CATEGORY_IDS = CATEGORIES.map((c) => c.id).join(", ");
const DSM_IDS = DSM_CRITERIA_IDS.join(", ");

const DSM_CRITERIA_LABELS: Record<string, string> = {
  A1: "Social-emotional reciprocity (difficulty with back-and-forth conversation, reduced sharing of interests/emotions, failure to initiate or respond)",
  A2: "Nonverbal communicative behaviors (reduced eye contact, limited gesture/facial expression, difficulty reading others' body language)",
  A3: "Developing/maintaining/understanding relationships (difficulty adjusting to social context, trouble making or keeping friends)",
  B1: "Stereotyped/repetitive motor movements, object use, or speech (stimming, echolalia, scripting)",
  B2: "Insistence on sameness, inflexible routines, ritualized patterns (distress at small changes, rigid thinking)",
  B3: "Highly restricted, fixated interests (intense focus abnormal in intensity or focus)",
  B4: "Hyper or hyporeactivity to sensory input (sensory seeking/avoidance, indifference to pain/temperature)",
};

function buildSystemPrompt(
  userSetChildhood: boolean,
  userSetFunctionalImpairment: boolean
): string {
  const childhoodInstruction = userSetChildhood
    ? `- isChildhoodMemory: the user has already confirmed this is a childhood memory — return true without further inference`
    : `- isChildhoodMemory: infer from temporal language ("when I was a kid", "I was 8", "my parents told me I used to", "growing up", etc.) — true only if clear childhood context is present`;

  const impairmentInstruction = userSetFunctionalImpairment
    ? `- isFunctionalImpairment: the user has already confirmed this describes functional impairment — return true without further inference`
    : `- isFunctionalImpairment: infer from whether the experience caused meaningful disruption to daily functioning (missed work, couldn't complete tasks, relationships affected, etc.)`;

  return `You help people understand patterns in their lived experience of neurodivergence by gently reflecting their journal entries back to them.

Read the journal entry carefully. Identify which categories from BOTH systems below feel genuinely present in what they wrote.

── SYSTEM 1: Lived Experience Categories ─────────────────────────────────────
${CATEGORIES.map((c) => `- ${c.id}: ${c.label}`).join("\n")}

Valid lived experience IDs are: ${CATEGORY_IDS}

── SYSTEM 2: DSM-5 ASD Diagnostic Subcriteria ────────────────────────────────
${Object.entries(DSM_CRITERIA_LABELS).map(([id, label]) => `- ${id}: ${label}`).join("\n")}

Valid DSM criteria IDs are: ${DSM_IDS}

── Instructions ──────────────────────────────────────────────────────────────
For EACH tag in both systems that applies:
1. Extract a quote — a VERBATIM substring from the entry text that is the primary evidence for this tag. Copy it exactly as written. Do not paraphrase or summarize.
2. Write a one-sentence rationale that:
   - Reflects the person's own words and experience back to them
   - Sounds like a thoughtful friend observing what they shared, not a clinician labeling them
   - Is specific to what they actually wrote, not generic
   - Avoids diagnostic language ("you have...", "this indicates...", "symptoms of...")

Also determine:
${childhoodInstruction}
${impairmentInstruction}

── Output Rules ──────────────────────────────────────────────────────────────
- Only include tags with genuine evidence in the text (confidence > 0.4)
- If nothing clearly applies in a system, return [] for that array
- Return ONLY valid JSON — no markdown fences, no explanation outside the JSON

Return this exact shape:
{
  "livedExperience": [
    { "category": "category-id", "confidence": 0.85, "quote": "exact text from entry", "rationale": "One sentence reflecting this back to them." }
  ],
  "dsmCriteria": [
    { "category": "B4", "confidence": 0.89, "quote": "exact text from entry", "rationale": "One sentence reflecting this back to them." }
  ],
  "isChildhoodMemory": false,
  "isFunctionalImpairment": true
}`;
}

const EMPTY_RESULT: AIAnalysisResult = {
  livedExperience: [],
  dsmCriteria: [],
  isChildhoodMemory: false,
  isFunctionalImpairment: false,
};

type RouteParams = { params: Promise<{ id: string }> };

// POST /api/entries/[id]/analyze — classify entry into IMW + DSM-5 categories
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

  // Read current DB values — user-set booleans take precedence over LLM inference
  const userSetChildhood = entry.isChildhoodMemory;
  const userSetFunctionalImpairment = entry.isFunctionalImpairment;

  try {
    const { text } = await generateText({
      model: anthropic(CLAUDE_MODEL),
      system: buildSystemPrompt(userSetChildhood, userSetFunctionalImpairment),
      prompt: entry.content,
      maxOutputTokens: 1200,
    });

    let result: AIAnalysisResult = { ...EMPTY_RESULT };

    try {
      // Strip markdown code fences Claude sometimes adds despite "Return ONLY valid JSON" instruction
      const cleaned = text.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
      const parsed = JSON.parse(cleaned);

      const isValidSuggestion = (s: unknown, validIds: readonly string[]): s is AISuggestion =>
        typeof (s as AISuggestion).category === "string" &&
        validIds.includes((s as AISuggestion).category) &&
        typeof (s as AISuggestion).confidence === "number" &&
        typeof (s as AISuggestion).quote === "string" &&
        typeof (s as AISuggestion).rationale === "string";

      const livedExperience: AISuggestion[] = Array.isArray(parsed.livedExperience)
        ? parsed.livedExperience.filter((s: unknown) =>
            isValidSuggestion(s, CATEGORIES.map((c) => c.id))
          )
        : [];

      const dsmCriteria: AISuggestion[] = Array.isArray(parsed.dsmCriteria)
        ? parsed.dsmCriteria.filter((s: unknown) =>
            isValidSuggestion(s, DSM_CRITERIA_IDS as unknown as string[])
          )
        : [];

      // Only update DB boolean flags if user has NOT already set them
      const inferredChildhood =
        typeof parsed.isChildhoodMemory === "boolean" ? parsed.isChildhoodMemory : false;
      const inferredImpairment =
        typeof parsed.isFunctionalImpairment === "boolean" ? parsed.isFunctionalImpairment : false;

      const newIsChildhoodMemory = userSetChildhood ? true : inferredChildhood;
      const newIsFunctionalImpairment = userSetFunctionalImpairment ? true : inferredImpairment;

      result = {
        livedExperience,
        dsmCriteria,
        isChildhoodMemory: newIsChildhoodMemory,
        isFunctionalImpairment: newIsFunctionalImpairment,
      };
    } catch {
      // Malformed JSON from LLM — fall through to empty result, preserve user-set flags
      result = {
        ...EMPTY_RESULT,
        isChildhoodMemory: userSetChildhood,
        isFunctionalImpairment: userSetFunctionalImpairment,
      };
    }

    // Persist full AIAnalysisResult + update boolean flags (only if not user-set)
    await prisma.journalEntry.update({
      where: { id },
      data: {
        aiSuggestions: result,
        ...(!userSetChildhood && { isChildhoodMemory: result.isChildhoodMemory }),
        ...(!userSetFunctionalImpairment && { isFunctionalImpairment: result.isFunctionalImpairment }),
      },
    });

    return NextResponse.json({ suggestions: result });
  } catch (err) {
    console.error("Analysis failed:", err);
    // Return 200 with empty result rather than 500 — per ticket spec
    return NextResponse.json({ suggestions: EMPTY_RESULT });
  }
}
