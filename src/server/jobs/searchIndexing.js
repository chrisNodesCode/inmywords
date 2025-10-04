import { enqueueJob } from './enqueue.js';

export const SEARCH_INDEXING_JOB = 'search-indexing';

export async function enqueueSearchIndexingJob(payload, options = {}) {
  return enqueueJob(SEARCH_INDEXING_JOB, {
    ...payload,
    enqueuedAt: new Date().toISOString(),
  }, options);
}

async function performSearchIndexing(payload) {
  console.info('[jobs] Performing search indexing', payload);
  // TODO: Integrate with search indexing service (e.g., Algolia, OpenSearch).
}

export const searchIndexingConsumer = {
  jobName: SEARCH_INDEXING_JOB,
  handler: async payload => {
    await performSearchIndexing(payload);
  },
};

