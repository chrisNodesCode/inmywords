export const WRITING_PROMPTS: string[] = [
  "What took up the most space in your mind today?",
  "Was there a moment today where you had to be someone you weren't?",
  "What felt harder than it probably should have?",
  "Is there something you've been carrying that you haven't said out loud yet?",
  "Where did your energy actually go today?",
  "Was there anything your body was trying to tell you that you pushed past?",
  "What's something you did today that nobody saw the full cost of?",
  "Did anything catch you off guard — emotionally or sensorially?",
  "What do you wish someone had understood about you today?",
  "Was there a moment today where you actually felt like yourself? What was happening?",
  "Is there something small that got to you more than you expected?",
  "What are you not saying — and who are you not saying it to?",
];

export function getRandomPrompt(): string {
  return WRITING_PROMPTS[Math.floor(Math.random() * WRITING_PROMPTS.length)];
}
