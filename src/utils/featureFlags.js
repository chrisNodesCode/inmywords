import FEATURE_FLAG_DEFAULTS, {
  FEATURE_FLAG_ENVIRONMENT_MAP,
  FEATURE_FLAG_METADATA,
} from '@/config/featureFlags';

const RUNTIME_OVERRIDES = new Map();

function parseBooleanFlag(rawValue, fallback) {
  if (rawValue === undefined || rawValue === null) {
    return { value: fallback, source: 'default' };
  }

  const normalized = String(rawValue).trim().toLowerCase();
  if (['1', 'true', 'on', 'yes', 'enabled'].includes(normalized)) {
    return { value: true, source: 'environment' };
  }
  if (['0', 'false', 'off', 'no', 'disabled'].includes(normalized)) {
    return { value: false, source: 'environment' };
  }

  console.warn(
    `[featureFlags] Unable to parse boolean flag value "${rawValue}". Falling back to default.`,
  );
  return { value: fallback, source: 'default' };
}

function computeInitialFlags() {
  const snapshot = new Map();
  Object.entries(FEATURE_FLAG_DEFAULTS).forEach(([flagName, defaultValue]) => {
    const envVar = FEATURE_FLAG_ENVIRONMENT_MAP[flagName];
    const rawValue = envVar ? process.env[envVar] : undefined;
    const { value, source } = parseBooleanFlag(rawValue, defaultValue);
    snapshot.set(flagName, {
      name: flagName,
      enabled: value,
      defaultValue,
      source: rawValue !== undefined ? `${source}:${envVar}` : 'default',
      metadata: FEATURE_FLAG_METADATA[flagName] ?? null,
    });
  });
  return snapshot;
}

const FLAG_SNAPSHOT = computeInitialFlags();

export function isFeatureEnabled(flagName) {
  if (RUNTIME_OVERRIDES.has(flagName)) {
    return Boolean(RUNTIME_OVERRIDES.get(flagName));
  }
  if (!FLAG_SNAPSHOT.has(flagName)) {
    throw new Error(`Unknown feature flag: ${flagName}`);
  }
  return Boolean(FLAG_SNAPSHOT.get(flagName).enabled);
}

export function getFeatureFlag(flagName) {
  const base = FLAG_SNAPSHOT.get(flagName);
  if (!base) {
    throw new Error(`Unknown feature flag: ${flagName}`);
  }
  const override = RUNTIME_OVERRIDES.has(flagName)
    ? {
        name: flagName,
        enabled: Boolean(RUNTIME_OVERRIDES.get(flagName)),
        defaultValue: base.defaultValue,
        source: 'override',
        metadata: base.metadata,
      }
    : base;
  return { ...override };
}

export function listFeatureFlags() {
  const entries = [];
  FLAG_SNAPSHOT.forEach((value, key) => {
    entries.push(getFeatureFlag(key));
  });
  return entries;
}

export function setFeatureFlagOverride(flagName, enabled) {
  if (!FLAG_SNAPSHOT.has(flagName)) {
    throw new Error(`Unknown feature flag: ${flagName}`);
  }
  if (enabled === undefined || enabled === null) {
    RUNTIME_OVERRIDES.delete(flagName);
    return;
  }
  RUNTIME_OVERRIDES.set(flagName, Boolean(enabled));
}

export function clearFeatureFlagOverride(flagName) {
  if (flagName) {
    RUNTIME_OVERRIDES.delete(flagName);
    return;
  }
  RUNTIME_OVERRIDES.clear();
}

export default {
  isFeatureEnabled,
  getFeatureFlag,
  listFeatureFlags,
  setFeatureFlagOverride,
  clearFeatureFlagOverride,
};
