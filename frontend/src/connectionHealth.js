export function connectionHealthFingerprint(profile = {}) {
  const auth = profile.auth || {};
  return JSON.stringify({
    auth: {
      authType: auth.authType || '',
      credentialId: auth.credentialRef?.id || '',
      jumpUsername: auth.jumpUsername || '',
      username: auth.username || '',
    },
    config: stableObject(profile.config || {}),
    filePath: profile.filePath || '',
    kind: profile.kind || 'terminal',
    providerType: profile.providerType || '',
  });
}

export function beginConnectionProbes(states = {}, profiles = [], startedAt = Date.now()) {
  let changed = false;
  const next = { ...states };
  profiles.forEach((profile) => {
    if (!profile?.id || states[profile.id]?.status === 'checking') return;
    changed = true;
    next[profile.id] = {
      checkedAt: 0,
      error: null,
      fingerprint: connectionHealthFingerprint(profile),
      latencyMs: 0,
      startedAt,
      status: 'checking',
    };
  });
  return changed ? next : states;
}

export function completeConnectionProbe(states = {}, profileId = '', {
  error = null,
  finishedAt = Date.now(),
} = {}) {
  const current = states[profileId];
  if (!current || current.status !== 'checking') return states;
  return {
    ...states,
    [profileId]: {
      ...current,
      checkedAt: finishedAt,
      error,
      latencyMs: Math.max(0, finishedAt - current.startedAt),
      status: error ? 'error' : 'success',
    },
  };
}

export function reconcileConnectionHealth(states = {}, profileIds = []) {
  const availableIds = new Set(profileIds.filter(Boolean));
  const entries = Object.entries(states).filter(([profileId]) => availableIds.has(profileId));
  if (entries.length === Object.keys(states).length) return states;
  return Object.fromEntries(entries);
}

export function clearConnectionHealth(states = {}, profileIds = []) {
  const clearedIds = new Set(profileIds.filter(Boolean));
  if (![...clearedIds].some((profileId) => Object.prototype.hasOwnProperty.call(states, profileId))) {
    return states;
  }
  return Object.fromEntries(Object.entries(states)
    .filter(([profileId]) => !clearedIds.has(profileId)));
}

export function buildConnectionProbePlan(
  profiles = [],
  profileIds = [],
  providers = [],
  states = {},
) {
  const selectedIds = new Set(profileIds.filter(Boolean));
  const providerTypes = new Set(providers.map((provider) => provider.type).filter(Boolean));
  const skipped = { checking: 0, local: 0, unavailable: 0 };
  const probeableProfiles = [];
  profiles.forEach((profile) => {
    if (!selectedIds.has(profile.id)) return;
    if (profile.providerType === 'local') {
      skipped.local += 1;
      return;
    }
    if (!providerTypes.has(profile.providerType)) {
      skipped.unavailable += 1;
      return;
    }
    if (states[profile.id]?.status === 'checking') {
      skipped.checking += 1;
      return;
    }
    probeableProfiles.push(profile);
  });
  return { probeableProfiles, skipped };
}

export function buildConnectionHealthPresentation(state, profile) {
  if (!state || state.fingerprint !== connectionHealthFingerprint(profile)) return null;
  if (state.status === 'checking') {
    return {
      badge: { key: 'healthChecking', tone: 'info', value: true },
      canRetry: false,
      checkedAt: 0,
      descriptionKey: 'connection.health.checking.description',
      error: null,
      latencyMs: 0,
      status: 'checking',
      titleKey: 'connection.health.checking.title',
    };
  }
  if (state.status === 'success') {
    return {
      badge: { key: 'healthSuccess', tone: 'success', value: state.latencyMs },
      canRetry: true,
      checkedAt: state.checkedAt,
      descriptionKey: 'connection.health.success.description',
      error: null,
      latencyMs: state.latencyMs,
      status: 'success',
      titleKey: 'connection.health.success.title',
    };
  }
  if (state.status === 'error') {
    return {
      badge: { key: 'healthError', tone: 'danger', value: true },
      canRetry: true,
      checkedAt: state.checkedAt,
      descriptionKey: 'connection.health.error.description',
      error: state.error,
      latencyMs: state.latencyMs,
      status: 'error',
      titleKey: 'connection.health.error.title',
    };
  }
  return null;
}

export async function runConnectionProbeQueue(items = [], worker, concurrency = 3) {
  if (items.length === 0) return [];
  const limit = Math.max(1, Math.min(items.length, Math.floor(Number(concurrency) || 1)));
  const results = new Array(items.length);
  let cursor = 0;
  const runNext = async () => {
    while (cursor < items.length) {
      const index = cursor;
      cursor += 1;
      try {
        results[index] = { status: 'fulfilled', value: await worker(items[index], index) };
      } catch (reason) {
        results[index] = { status: 'rejected', reason };
      }
    }
  };
  await Promise.all(Array.from({ length: limit }, runNext));
  return results;
}

function stableObject(value) {
  if (Array.isArray(value)) return value.map(stableObject);
  if (!value || typeof value !== 'object') return value;
  return Object.fromEntries(Object.entries(value)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, item]) => [key, stableObject(item)]));
}
