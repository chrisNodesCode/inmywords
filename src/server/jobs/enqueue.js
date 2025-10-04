import { getJobConfig, validateJobConfig } from './config.js';
import { getTasksClient } from './client.js';
import { recordJobScheduled, recordJobSkipped } from './instrumentation.js';

function secondsToTimestamp(seconds) {
  const wholeSeconds = Math.trunc(seconds);
  return {
    seconds: wholeSeconds,
    nanos: Math.trunc((seconds - wholeSeconds) * 1e9),
  };
}

export async function enqueueJob(jobName, payload, options = {}) {
  const config = getJobConfig();

  if (config.disabled) {
    recordJobSkipped({ jobName, reason: 'disabled', payload });
    return null;
  }

  const queueSettings = options.queueName
    ? { queue: options.queueName }
    : config.queues[jobName];

  if (!queueSettings || !queueSettings.queue) {
    throw new Error(`Queue configuration missing for job "${jobName}"`);
  }

  if (!config.projectId || !config.location || !config.handlerBaseUrl) {
    const validation = validateJobConfig();
    const error = new Error(
      'Cloud Tasks configuration incomplete. Ensure CLOUD_TASKS_PROJECT_ID, CLOUD_TASKS_LOCATION, and CLOUD_TASKS_HANDLER_BASE_URL are set.',
    );
    if (options.requireConfig) {
      throw error;
    }
    recordJobSkipped({
      jobName,
      reason: 'config-missing',
      payload,
      missing: validation.missing,
    });
    return null;
  }

  const client = await getTasksClient();
  const parent = client.queuePath(config.projectId, config.location, queueSettings.queue);

  const url = new URL(options.path || `/tasks/${jobName}`, config.handlerBaseUrl).toString();

  const headers = {
    'Content-Type': 'application/json',
    'X-Inmywords-Job': jobName,
    ...options.headers,
  };

  if (options.traceId) {
    headers['X-Inmywords-Trace'] = options.traceId;
  }

  const httpRequest = {
    httpMethod: options.httpMethod || 'POST',
    url,
    headers,
    body: Buffer.from(JSON.stringify(payload)).toString('base64'),
  };

  if (config.serviceAccountEmail) {
    httpRequest.oidcToken = {
      serviceAccountEmail: config.serviceAccountEmail,
      audience: options.audience || config.handlerAudience || url,
    };
  }

  const task = { httpRequest };

  if (options.delaySeconds) {
    task.scheduleTime = secondsToTimestamp(Math.max(0, options.delaySeconds));
  }

  const deadlineSeconds = options.dispatchDeadlineSeconds || queueSettings.dispatchDeadlineSeconds;
  if (deadlineSeconds) {
    task.dispatchDeadline = secondsToTimestamp(deadlineSeconds);
  }

  recordJobScheduled({
    jobName,
    queue: queueSettings.queue,
    payload,
    delaySeconds: options.delaySeconds || 0,
  });

  const [taskResponse] = await client.createTask({ parent, task });
  return taskResponse;
}

