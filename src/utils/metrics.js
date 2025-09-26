const DEFAULT_NAMESPACE = 'api';

export function logApiMetric(metricName, payload = {}) {
  try {
    const record = {
      namespace: DEFAULT_NAMESPACE,
      metric: metricName,
      timestamp: new Date().toISOString(),
      ...payload,
    };
    console.info('[metric]', JSON.stringify(record));
  } catch (error) {
    console.warn('[metric] Failed to log API metric', error);
  }
}

export default {
  logApiMetric,
};
