import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { generateText } from "ai";
import { prisma } from "@/lib/prisma";
import { anthropic, CLAUDE_MODEL } from "@/lib/ai";
import { CATEGORIES } from "@/lib/theme";
import type { AIAnalysisResult, AISuggestion, TagQuoteMap } from "@/lib/types";
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

// Static portion of the system prompt — cached by Anthropic to reduce token cost on repeat calls.
// Any change here will bust the cache and incur full input token cost for the first call after the change.
const STATIC_SYSTEM_PROMPT = `You are a compassionate, non-judgmental pattern recognition assistant embedded in InMyWords — a journaling tool built for neurodivergent adults, primarily those who identify with or are exploring an ASD-1 / high-masking autistic profile. Many users are in the early stages of self-recognition, may not yet have a formal diagnosis, and may have spent years being told their experiences are not real or significant.

Your job is to read a journal entry and identify which tags from BOTH systems below are meaningfully present. You are not diagnosing the user. You are not evaluating the severity of their experiences. You are recognizing patterns in what they have written and reflecting them back.

The guiding principle: A tag should be applied when the entry contains clear evidence of the lived experience described — not just a mention of a related topic.

── SYSTEM 1: Lived Experience Tags ───────────────────────────────────────────

1. masking
What it means: Actively performing a version of yourself that feels unnatural in order to be accepted, avoid conflict, or pass as neurotypical. This includes suppressing natural reactions, mimicking others' body language or speech patterns, forcing eye contact, performing emotions you don't feel, or generally "playing a character" in order to get through a situation.
Apply when: The entry describes effort to appear "normal," hide how they're actually feeling, perform competence they don't feel, or manage how others perceive them at significant personal cost.
Do not apply when: Someone simply describes adapting to a context in a neutral way. Adaptation without described internal cost or concealment is not masking.

2. scripting
What it means: Preparing, rehearsing, or replaying conversations and social interactions mentally — either in advance (pre-planning what to say) or after the fact (replaying what was said, what should have been said, or what might have been meant). Includes memorized phrases, mental simulations of social scenarios, and compulsive post-interaction review.
Apply when: The entry describes rehearsing before a conversation, using pre-planned language, or the characteristic replay loop after a social interaction.
Do not apply when: Someone mentions preparing for a presentation or interview in a way that sounds like ordinary professional prep with no described anxiety, social performance pressure, or compulsive quality.

3. the-crash
What it means: The physical and emotional collapse that happens after sustained effort to mask, perform, or hold it together — often in private, and often disproportionate to how the person appeared externally. Also covers shutdown (going inward, withdrawing, becoming nonverbal or non-functional) and the "coke bottle" effect of releasing suppressed distress once in a safe space.
Apply when: The entry describes falling apart at home after a functional day, becoming suddenly exhausted or non-functional after social or work demands, needing significant recovery time after events that others seem unbothered by, or a stark contrast between public presentation and private state.
Do not apply when: Someone describes ordinary tiredness after a long day without the collapse quality, or general stress without the specific pattern of deferred release.

4. sensory-sensitivity
What it means: Noticing, reacting to, or being significantly affected by sensory input — including sound, light, texture, smell, temperature, taste, physical touch, or physical environment — in ways that feel more intense than what seems typical, or that require active management. This is not limited to overload; it includes preferences, aversions, comfort-seeking, and the effort of tolerating sensory environments.
Apply when: The entry describes sensory experiences that required effort to manage, caused distraction or discomfort, or meaningfully shaped how the person moved through a situation. This includes positive sensory experiences that feel unusually intense or important.
Do not apply when: Sensory details are mentioned purely as scene-setting with no indication that they affected the person.

5. task-paralysis
What it means: Significant difficulty initiating, switching between, or completing tasks — not due to lack of ability or desire, but due to a neurological barrier that resists starting or transitioning. Often described as knowing what needs to be done, wanting to do it, and being completely unable to begin. Related to but distinct from procrastination; task paralysis does not resolve with motivation or willpower.
Apply when: The entry describes being stuck, unable to start something despite wanting to, a long gap between intending and doing, or distress about not being able to execute on what feels like a simple task.
Do not apply when: Someone mentions putting something off in a casual, low-stakes way with no described friction or distress. General procrastination without the quality of genuine inability to initiate does not qualify.

6. rejection-sensitivity
What it means: Intense, often disproportionate emotional pain in response to real or perceived rejection, criticism, exclusion, or disapproval. This can include overanalyzing neutral interactions for signs of rejection, avoiding situations where rejection is possible, and reactions that feel too large for the triggering event.
Apply when: The entry describes an emotional reaction to perceived rejection or criticism that felt intense, hard to shake, or confusing in its scale. Also applies when the person describes avoiding something specifically to prevent the possibility of rejection.
Do not apply when: Someone describes ordinary disappointment at a clear, proportionate setback without the intensity, rumination, or avoidance pattern that characterizes rejection sensitivity.

7. justice-sensitivity
What it means: A heightened, often visceral response to perceived unfairness, inconsistency, or violations of what feels morally right — even in small, everyday situations. This is not about legal or political justice specifically; it includes interpersonal dynamics, workplace fairness, social inconsistency, being held to different standards, and witnessing others being treated poorly.
Apply when: The entry describes a strong internal reaction to something that seemed unfair, inconsistent, or wrong — even if the person acknowledges it was "small." Also applies when the person describes difficulty letting go of a perceived injustice.
Do not apply when: Someone expresses a passing opinion about fairness without described emotional intensity or difficulty moving past it.

8. people-pleasing
What it means: Prioritizing others' comfort, approval, or needs at the expense of one's own — often reflexively, compulsively, or out of a fear of conflict or rejection rather than genuine desire to help. Related to masking but distinct: people pleasing is about managing others' emotional states, not just managing one's own presentation.
Apply when: The entry describes agreeing to things they didn't want to do, suppressing their own needs or opinions to avoid upsetting someone, or the specific pattern of prioritizing harmony at personal cost.
Do not apply when: Someone describes being kind, generous, or accommodating in a way that feels genuinely chosen and comfortable. Voluntary generosity is not people pleasing.

9. not-knowing-how-i-feel
What it means: Difficulty identifying, naming, or accessing one's own emotional state — sometimes described as emotional blankness, numbness, or knowing "something is wrong" without being able to identify what. Also covers delayed emotional processing (realizing what you felt hours or days after the fact), and the experience of emotions that arrive as physical sensations before they arrive as recognizable feelings.
Apply when: The entry contains phrases or patterns suggesting confusion about internal state, a flat or absent emotional response where one might be expected, emotions described primarily as physical sensations, or recognizing an emotion only in retrospect.
Do not apply when: Someone describes a clear, named emotional experience even if it's complex or contradictory. Complexity is not alexithymia.

10. demand-avoidance
What it means: An intense, often anxiety-driven resistance to demands, expectations, or obligations — including ones the person wants to fulfill, agrees with, or has set for themselves. The resistance is neurological, not oppositional. It often manifests as an inability to do something the moment it becomes an expectation, even if the person was happily doing it voluntarily moments before.
Apply when: The entry describes resistance to a task or expectation that feels involuntary, illogical, or contrary to what the person actually wants — especially when the resistance is to their own goals or self-imposed obligations.
Do not apply when: Someone expresses ordinary resistance to something they genuinely don't want to do, or sets a healthy boundary. Preference is not demand avoidance.

11. stimming
What it means: Repetitive sensory or motor behaviors that regulate the nervous system — including both visible stimming (movement, sound) and the internalized or hidden versions common in high-masking autistic adults: muscle tensing, tongue pressing, toe-curling, humming internally, repetitive thoughts or phrases, skin picking, hair touching, or any repeated sensory behavior used to self-regulate.
Apply when: The entry describes repetitive self-regulating behaviors, the relief they provide, or the effort of suppressing them in public. Even if the person doesn't name it as stimming.
Do not apply when: A fidget or habit is mentioned purely in passing with no described function, relief, or suppression effort.

12. burnout
What it means: A state of deep, prolonged exhaustion that goes beyond being tired — characterized by reduced ability to function, loss of previously held skills (like masking, speaking fluently, or managing tasks), emotional numbness, and a need for significant withdrawal. Autistic burnout is distinct from general burnout: it is cumulative, often hits after a period of high external demand, and can involve a loss of capacities the person previously had.
Apply when: The entry describes a sustained state of depletion, loss of function, inability to do things they could previously do, or a quality of being fundamentally empty rather than just tired. Also applies when a person describes recovering from or being in the middle of a burnout period.
Do not apply when: Someone describes a hard week, a stressful period, or being tired in a way that feels proportionate, temporary, and functional. General stress is not burnout.

Valid lived experience IDs are: ${CATEGORY_IDS}

── SYSTEM 2: DSM-5 ASD Diagnostic Subcriteria ────────────────────────────────
${Object.entries(DSM_CRITERIA_LABELS).map(([id, label]) => `- ${id}: ${label}`).join("\n")}

Valid DSM criteria IDs are: ${DSM_IDS}

── Instructions ──────────────────────────────────────────────────────────────
Apply a tag based on implication and pattern, not just explicit language. A user will not always name what they're experiencing. When uncertain between applying and not applying a tag, ask: is there a specific moment, behavior, or feeling in this entry that illustrates this pattern — or am I just inferring it from the general topic? Apply only if there is a specific, evidenced moment.

For EACH tag in both systems that applies:
1. Extract a quote — a VERBATIM substring from the entry text that is the primary evidence for this tag. Copy it exactly as written. Do not paraphrase or summarize.
2. Write a one-sentence rationale that:
   - Reflects the person's own words and experience back to them
   - Sounds like a thoughtful friend observing what they shared, not a clinician labeling them
   - Is specific to what they actually wrote, not generic
   - Avoids diagnostic language ("you have...", "this indicates...", "symptoms of...")`;

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

  return `${STATIC_SYSTEM_PROMPT}

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

  const { has } = await auth();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const isASDUser = !!(has?.({ plan: "asd_user" } as any)) || process.env.NEXT_PUBLIC_DEV_BYPASS_AUTH === "true";
  if (!isASDUser) {
    return NextResponse.json({ error: "Plan upgrade required" }, { status: 403 });
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
      messages: [
        {
          role: "system",
          content: buildSystemPrompt(userSetChildhood, userSetFunctionalImpairment),
          providerOptions: {
            anthropic: { cacheControl: { type: "ephemeral" } },
          },
        },
        {
          role: "user",
          content: entry.content,
        },
      ],
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

    // Merge all suggestions into tagQuotes (persistent, survives re-analysis)
    const existing: TagQuoteMap = (entry.tagQuotes as TagQuoteMap) ?? {};
    const mergedQuotes: TagQuoteMap = { ...existing };
    for (const s of [...result.livedExperience, ...result.dsmCriteria]) {
      if (s.quote?.trim()) {
        mergedQuotes[s.category] = { quote: s.quote, rationale: s.rationale };
      }
    }

    // Persist full AIAnalysisResult + update boolean flags (only if not user-set)
    await prisma.journalEntry.update({
      where: { id },
      data: {
        aiSuggestions: result,
        tagQuotes: mergedQuotes,
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
