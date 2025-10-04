import { enqueueJob } from './enqueue.js';
import { getJobConfig } from './config.js';
import {
  recordJobDeadLettered,
  recordJobFailed,
  recordJobSkipped,
} from './instrumentation.js';

export const DEAD_LETTER_JOB = 'dead-letter';

export async function enqueueDeadLetterJob(payload) {
  const config = getJobConfig();
  const queueSettings = config.queues[DEAD_LETTER_JOB];
  if (!queueSettings || !queueSettings.queue) {
    recordJobSkipped({ jobName: DEAD_LETTER_JOB, reason: 'dead-letter queue missing', payload });
    return null;
  }

  try {
    const task = await enqueueJob(DEAD_LETTER_JOB, payload, {
      queueName: queueSettings.queue,
      path: '/tasks/dead-letter',
    });
    recordJobDeadLettered({ jobName: payload.originalJobName, payload });
    return task;
  } catch (error) {
    recordJobFailed({ jobName: DEAD_LETTER_JOB, error, payload });
    return null;
  }
}

export const deadLetterConsumer = {
  jobName: DEAD_LETTER_JOB,
  handler: async payload => {
    console.error('[jobs] Dead-letter payload received', payload);
  },
};

