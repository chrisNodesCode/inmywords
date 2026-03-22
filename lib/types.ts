/**
 * Shared AI analysis types for InMyWords.
 * Used by the analyze API route and any UI that reads aiSuggestions.
 */

export type AISuggestion = {
  category: string;
  confidence: number;
  quote: string;      // verbatim excerpt from entry text
  rationale: string;
};

export type AIAnalysisResult = {
  livedExperience: AISuggestion[];
  dsmCriteria: AISuggestion[];       // categories: A1, A2, A3, B1, B2, B3, B4
  isChildhoodMemory: boolean;        // LLM inference result
  isFunctionalImpairment: boolean;   // LLM inference result
};

export const DSM_CRITERIA_IDS = ["A1", "A2", "A3", "B1", "B2", "B3", "B4"] as const;
export type DSMCriterionId = (typeof DSM_CRITERIA_IDS)[number];
