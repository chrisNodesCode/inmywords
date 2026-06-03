import { generateText } from "ai";
import { anthropic, CLAUDE_MODEL } from "@/lib/ai";

// Messaging "translation": take the writer's rough draft and rewrite it so the
// intended reader receives it the way the writer means it — fixing the HOW (how
// it lands), not just the WHAT. The system prompt is chosen by "mode" (a persona
// preset the owner can edit) and the prompt text is supplied by the caller from
// the stored preset. Server-side only.

// ── Channel (delivery medium) ────────────────────────────────────────────────

export type MessageChannel = "slack" | "email" | "text";

export const MESSAGE_CHANNELS: { value: MessageChannel; label: string }[] = [
  { value: "slack", label: "Slack" },
  { value: "email", label: "Email" },
  { value: "text", label: "Text" },
];

export function isMessageChannel(v: unknown): v is MessageChannel {
  return v === "slack" || v === "email" || v === "text";
}

// A short, transparent note appended to whichever preset prompt is active so the
// rewrite respects the delivery medium. (Shown to the owner in the edit modal.)
const CHANNEL_MEDIUM_NOTE: Record<MessageChannel, string> = {
  email:
    "This will be sent as an email — a brief greeting and sign-off are appropriate, and the main point should survive a skim.",
  slack:
    "This will be sent over Slack — no greeting or sign-off; keep it concise and direct.",
  text:
    "This will be sent as a text / DM — brief and human; no greeting or sign-off; no emoji.",
};

// ── Modes (editable persona presets) ─────────────────────────────────────────

export type MessageMode = "professional" | "dating" | "friends";

export const MESSAGE_MODES: { value: MessageMode; label: string; blurb: string }[] = [
  {
    value: "professional",
    label: "Professional",
    blurb: "Neurodivergent → neurotypical, educated professional workplace",
  },
  {
    value: "dating",
    label: "Dating",
    blurb: "Messages to women on dating apps",
  },
  {
    value: "friends",
    label: "Friends",
    blurb: "Casual messages to friends",
  },
];

export function isMessageMode(v: unknown): v is MessageMode {
  return v === "professional" || v === "dating" || v === "friends";
}

// Default prompt text per mode. Used to seed the owner's editable presets and as
// the "reset to default" target. Owners can edit these freely in the UI.
export const DEFAULT_MODE_PROMPTS: Record<MessageMode, string> = {
  professional: `You are helping a neurodivergent writer adapt a message so it lands well with a neurotypical reader in an educated, professional workplace.

Rewrite the draft so a neurotypical, top-down-processing reader receives it the way the writer intends — fixing not just WHAT is said but HOW it is received.

Neurotypical readers process top-down: they form an impression from the overall framing first, then fill in the details. So:
- Lead with the headline — the ask, decision, or main point — then give the context underneath.
- Make implicit social signals explicit: a brief acknowledgment, a reason for a request, or a clear next step where a neurotypical reader would expect one and feel its absence.
- Soften phrasing that could read as blunt, abrupt, cold, or demanding — without changing the substance, hedging the point, or adding flattery.
- Remove ambiguity about what you need and by when.
- Keep it tight.

Do NOT add small talk, colloquialisms, filler, or emoji. Preserve the writer's meaning, facts, and intent exactly; never invent details. Keep their authentic voice — smooth the social-pragmatic edges, don't replace the person.

Return ONLY the rewritten message, ready to send. No preamble, no explanation, no surrounding quotes.`,

  dating: `You are helping the writer adapt a message they're sending to a woman on a dating app, so it comes across the way they actually intend.

Rewrite the draft so it reads as warm, genuine, and confident — emotionally attuned to how she'll receive it, not just what it literally says.

- Keep it relaxed and human; lead with genuine interest or a specific hook from the conversation.
- Make warmth and intent clear without coming across as intense, needy, or over-eager.
- Soften anything that could read as blunt, transactional, or socially off, and add the light social warmth a typical reader expects.
- Stay respectful and never presumptuous — no pressure, no negging, no clichés or pickup-artist lines.
- Match her energy and keep it reasonably short.

Preserve the writer's real meaning and personality; never invent facts about them or her. Keep their authentic voice — smooth the delivery, don't fake a persona.

Return ONLY the rewritten message. No preamble, no explanation, no surrounding quotes.`,

  friends: `You are helping the writer adapt a casual message to a friend so it lands warmly and clearly.

Rewrite the draft so it reads as relaxed, friendly, and easy to receive — matching how a friend will read the tone, not just the literal words.

- Keep it casual and warm; contractions and a light tone are good.
- Soften anything that could accidentally read as blunt, cold, or overly literal/formal.
- Make implicit warmth explicit where a friend would expect it — a bit of acknowledgment, enthusiasm, or care.
- Keep their actual point and plans exactly intact; don't add fake hype or filler.
- Brief is fine.

Preserve the writer's meaning and voice; never invent details. Smooth the delivery, keep it them.

Return ONLY the rewritten message. No preamble, no explanation, no surrounding quotes.`,
};

// ── Translation ──────────────────────────────────────────────────────────────

export async function translateMessage(
  draftPlainText: string,
  channel: MessageChannel,
  systemPromptBase: string
): Promise<string> {
  const base = (systemPromptBase || "").trim() || DEFAULT_MODE_PROMPTS.professional;
  const system = `${base}\n\nDelivery medium: ${CHANNEL_MEDIUM_NOTE[channel]}`;

  const { text } = await generateText({
    model: anthropic(CLAUDE_MODEL),
    system,
    prompt: draftPlainText.trim(),
    maxOutputTokens: 700,
  });

  // Strip stray wrapping quotes/fences Claude occasionally adds. Leave internal
  // formatting intact.
  return text
    .trim()
    .replace(/^```(?:\w+)?\s*/i, "")
    .replace(/\s*```$/, "")
    .replace(/^["“']+|["”']+$/g, "")
    .trim();
}
