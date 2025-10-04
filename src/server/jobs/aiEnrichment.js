import { enqueueJob } from './enqueue.js';

export const AI_ENRICHMENT_JOB = 'ai-enrichment';

export async function enqueueAIEnrichmentJob(payload, options = {}) {
  return enqueueJob(AI_ENRICHMENT_JOB, {
    ...payload,
    enqueuedAt: new Date().toISOString(),
  }, options);
}

async function performAIEnrichment(payload) {
  console.info('[jobs] Performing AI enrichment', payload);
  // TODO: Connect to enrichment pipeline (LLM summarisation, tagging, etc.).
}

export const aiEnrichmentConsumer = {
  jobName: AI_ENRICHMENT_JOB,
  handler: async payload => {
    await performAIEnrichment(payload);
  },
};

