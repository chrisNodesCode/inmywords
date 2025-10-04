const DEFAULT_MAX_RETRIES = 5;

function parseBoolean(value) {
  if (value === undefined || value === null) return false;
  return ['1', 'true', 'yes', 'on'].includes(String(value).toLowerCase());
}

function parseInteger(value, fallback) {
  if (value === undefined || value === null || value === '') {
    return fallback;
  }
  const parsed = Number.parseInt(String(value), 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function parseJson(value) {
  if (!value) return undefined;
  try {
    return JSON.parse(value);
  } catch (error) {
    console.warn('[jobs] Failed to parse JSON environment variable', error);
    return undefined;
  }
}

let cachedConfig;

export function getJobConfig() {
  if (cachedConfig) {
    return cachedConfig;
  }

  const sharedDeadLetterQueue =
    process.env.CLOUD_TASKS_QUEUE_DEAD_LETTER || process.env.CLOUD_TASKS_DEAD_LETTER_QUEUE;

  const disabled = parseBoolean(process.env.CLOUD_TASKS_DISABLED);
  const handlerBaseUrl = process.env.CLOUD_TASKS_HANDLER_BASE_URL || null;

  const queues = {
    'search-indexing': {
      queue: process.env.CLOUD_TASKS_QUEUE_SEARCH_INDEXING || 'search-indexing',
      deadLetterQueue:
        process.env.CLOUD_TASKS_QUEUE_SEARCH_INDEXING_DLQ || sharedDeadLetterQueue || null,
      maxRetriesBeforeDeadLetter: parseInteger(
        process.env.CLOUD_TASKS_MAX_RETRIES_SEARCH_INDEXING,
        DEFAULT_MAX_RETRIES,
      ),
    },
    'ai-enrichment': {
      queue: process.env.CLOUD_TASKS_QUEUE_AI_ENRICHMENT || 'ai-enrichment',
      deadLetterQueue:
        process.env.CLOUD_TASKS_QUEUE_AI_ENRICHMENT_DLQ || sharedDeadLetterQueue || null,
      maxRetriesBeforeDeadLetter: parseInteger(
        process.env.CLOUD_TASKS_MAX_RETRIES_AI_ENRICHMENT,
        DEFAULT_MAX_RETRIES,
      ),
    },
    'batch-email': {
      queue: process.env.CLOUD_TASKS_QUEUE_BATCH_EMAIL || 'batch-email',
      deadLetterQueue:
        process.env.CLOUD_TASKS_QUEUE_BATCH_EMAIL_DLQ || sharedDeadLetterQueue || null,
      maxRetriesBeforeDeadLetter: parseInteger(
        process.env.CLOUD_TASKS_MAX_RETRIES_BATCH_EMAIL,
        DEFAULT_MAX_RETRIES,
      ),
    },
    'dead-letter': {
      queue: sharedDeadLetterQueue || process.env.CLOUD_TASKS_QUEUE_DEAD_LETTER || 'dead-letter',
      deadLetterQueue: null,
      maxRetriesBeforeDeadLetter: 0,
    },
  };

  cachedConfig = {
    projectId: process.env.CLOUD_TASKS_PROJECT_ID || null,
    location: process.env.CLOUD_TASKS_LOCATION || null,
    serviceAccountEmail: process.env.CLOUD_TASKS_SERVICE_ACCOUNT_EMAIL || null,
    handlerBaseUrl,
    handlerAudience: process.env.CLOUD_TASKS_HANDLER_AUDIENCE || handlerBaseUrl,
    apiEndpoint: process.env.CLOUD_TASKS_API_ENDPOINT || null,
    credentials: parseJson(process.env.CLOUD_TASKS_SERVICE_ACCOUNT_JSON),
    disabled,
    queues,
  };

  return cachedConfig;
}

export function invalidateJobConfigCache() {
  cachedConfig = undefined;
}

export function validateJobConfig() {
  const config = getJobConfig();
  if (config.disabled) {
    return { isValid: false, missing: ['Cloud Tasks disabled via CLOUD_TASKS_DISABLED'], config };
  }

  const missing = [];
  if (!config.projectId) missing.push('CLOUD_TASKS_PROJECT_ID');
  if (!config.location) missing.push('CLOUD_TASKS_LOCATION');
  if (!config.handlerBaseUrl) missing.push('CLOUD_TASKS_HANDLER_BASE_URL');

  return {
    isValid: missing.length === 0,
    missing,
    config,
  };
}

