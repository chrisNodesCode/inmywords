const listeners = {
  scheduled: new Set(),
  started: new Set(),
  completed: new Set(),
  failed: new Set(),
  deadLettered: new Set(),
  skipped: new Set(),
};

function emit(event, payload) {
  for (const listener of listeners[event]) {
    try {
      listener(payload);
    } catch (error) {
      console.warn(`[jobs] Instrumentation listener error for ${event}`, error);
    }
  }
}

export function onJobEvent(event, listener) {
  if (!listeners[event]) {
    throw new Error(`Unsupported job event: ${event}`);
  }
  listeners[event].add(listener);
  return () => listeners[event].delete(listener);
}

export function recordJobScheduled(details) {
  console.info('[jobs] scheduled', details);
  emit('scheduled', details);
}

export function recordJobStarted(details) {
  console.info('[jobs] started', details);
  emit('started', details);
}

export function recordJobCompleted(details) {
  console.info('[jobs] completed', details);
  emit('completed', details);
}

export function recordJobFailed(details) {
  console.error('[jobs] failed', details);
  emit('failed', details);
}

export function recordJobDeadLettered(details) {
  console.error('[jobs] dead-lettered', details);
  emit('deadLettered', details);
}

export function recordJobSkipped(details) {
  console.warn('[jobs] skipped', details);
  emit('skipped', details);
}

