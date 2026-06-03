import { generateText } from "ai";
import { anthropic, CLAUDE_MODEL } from "@/lib/ai";

// Shared title-generation logic. Mirrors how the main journal auto-names entries
// (claude.ai-style "name the session after enough context"). Server-side only —
// never import into a client component (it reaches ANTHROPIC_API_KEY via lib/ai).

export type TitleKind = "journal" | "prompt";

// Minimum plain-text words before we bother asking Claude for a title. Saving is
// an explicit action, so this just avoids naming near-empty drafts.
export const MIN_TITLE_WORDS = 10;

const JOURNAL_SYSTEM_PROMPT = `You are helping someone give a name to something they experienced and wrote about.

They've written a journal entry about their life — often about hard moments, sensory experiences, emotional days, or things that were difficult to navigate. Your job is to read what they wrote and suggest a short, evocative title that feels true to their experience.

The title should:
- Be 8 words or fewer
- Reflect what actually happened or what they felt — not a diagnostic label
- Sound like something a thoughtful, caring friend might say, not a clinician
- Capture the emotional truth or the specific moment
- Use plain, human language — no jargon, no clinical framing
- Feel personal and specific, not generic

Return ONLY the title itself — no quotes, no punctuation at the end, nothing else.`;

const PROMPT_SYSTEM_PROMPT = `You are naming a saved LLM prompt draft so it is easy to find in a list later.

You'll be given the text of a prompt someone is writing — instructions, system context, examples, or a task they want a model to perform. Your job is to read it and produce a short, descriptive label for what the prompt does.

The title should:
- Be 8 words or fewer
- Describe the prompt's purpose or task, not restate it verbatim
- Be specific enough to tell similar prompts apart (mention the domain/output if clear)
- Use plain, practical language — like a good file name, not marketing copy
- Avoid quotes, trailing punctuation, and the word "prompt"

Return ONLY the title itself — no quotes, no punctuation at the end, nothing else.`;

export function countWords(text: string): number {
  const trimmed = text.trim();
  if (!trimmed) return 0;
  return trimmed.split(/\s+/).length;
}

// Returns a generated title, or null if Claude came back empty. Callers are
// responsible for deciding whether the content is substantial enough to name
// (see MIN_TITLE_WORDS / countWords). Throws if the Anthropic call itself fails.
export async function generateTitle(
  content: string,
  kind: TitleKind = "journal"
): Promise<string | null> {
  const system = kind === "prompt" ? PROMPT_SYSTEM_PROMPT : JOURNAL_SYSTEM_PROMPT;
  const { text } = await generateText({
    model: anthropic(CLAUDE_MODEL),
    system,
    prompt: content.trim(),
    maxOutputTokens: 60,
  });

  // Claude occasionally wraps short replies in quotes/fences despite instructions.
  const cleaned = text
    .trim()
    .replace(/^```(?:\w+)?\s*/i, "")
    .replace(/\s*```$/, "")
    .replace(/^["'`]+|["'`]+$/g, "")
    .trim();

  return cleaned || null;
}
