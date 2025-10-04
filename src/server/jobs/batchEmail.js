import { enqueueJob } from './enqueue.js';

export const BATCH_EMAIL_JOB = 'batch-email';

export async function enqueueBatchEmailJob(payload, options = {}) {
  return enqueueJob(BATCH_EMAIL_JOB, {
    ...payload,
    enqueuedAt: new Date().toISOString(),
  }, options);
}

async function performBatchEmail(payload) {
  console.info('[jobs] Performing batch email send', payload);
  // TODO: Integrate with transactional email provider (SendGrid, Postmark, etc.).
}

export const batchEmailConsumer = {
  jobName: BATCH_EMAIL_JOB,
  handler: async payload => {
    await performBatchEmail(payload);
  },
};

