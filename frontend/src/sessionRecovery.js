const defaultPolicy = {
  baseDelaySeconds: 3,
  enabled: false,
  maxAttempts: 3,
};

export function normalizeSessionRecoveryPolicy(settings = {}) {
  return {
    baseDelaySeconds: clampNumber(
      settings.autoReconnectDelaySeconds,
      1,
      30,
      defaultPolicy.baseDelaySeconds,
    ),
    enabled: settings.autoReconnect === true,
    maxAttempts: clampNumber(
      settings.autoReconnectMaxAttempts,
      1,
      10,
      defaultPolicy.maxAttempts,
    ),
  };
}

export function buildSessionRecoveryPlan({
  now = Date.now(),
  recovery = null,
  revision = 0,
  session = null,
  settings = {},
  status = {},
} = {}) {
  const policy = normalizeSessionRecoveryPolicy(settings);
  if (!policy.enabled) return { kind: 'none', reason: 'disabled' };
  if (!session?.id) return { kind: 'none', reason: 'missing' };
  if ((session.providerType || session.request?.providerType) === 'local') {
    return { kind: 'none', reason: 'local' };
  }
  if (!session.request?.profileId) return { kind: 'none', reason: 'temporary' };
  if (status?.status !== 'error') return { kind: 'none', reason: 'status' };
  if (Number(session.revision || 0) !== Number(revision || 0)) {
    return { kind: 'none', reason: 'stale' };
  }
  if (recovery?.status === 'scheduled' && Number(recovery.errorRevision) === Number(revision)) {
    return { kind: 'none', reason: 'duplicate' };
  }
  if (recovery?.status === 'exhausted' && Number(recovery.errorRevision) === Number(revision)) {
    return { kind: 'none', reason: 'duplicate' };
  }

  const attempt = Math.max(0, Number(recovery?.attempt) || 0) + 1;
  if (attempt > policy.maxAttempts) {
    return {
      kind: 'exhausted',
      recovery: {
        attempt: policy.maxAttempts,
        errorRevision: Number(revision || 0),
        maxAttempts: policy.maxAttempts,
        status: 'exhausted',
      },
    };
  }

  const delaySeconds = Math.min(30, policy.baseDelaySeconds * (2 ** (attempt - 1)));
  return {
    kind: 'schedule',
    recovery: {
      attempt,
      delaySeconds,
      errorRevision: Number(revision || 0),
      maxAttempts: policy.maxAttempts,
      retryAt: Number(now) + delaySeconds * 1000,
      status: 'scheduled',
    },
  };
}

export function markSessionRecoveryStarted(recovery = null, revision = 0) {
  if (!recovery) return null;
  return {
    ...recovery,
    revision: Number(revision || 0),
    status: 'reconnecting',
  };
}

export function pruneSessionRecoveries(recoveries = {}, sessionIds = []) {
  const ids = new Set(sessionIds.filter(Boolean));
  return Object.fromEntries(Object.entries(recoveries).filter(([sessionId]) => ids.has(sessionId)));
}

function clampNumber(value, min, max, fallback) {
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.max(min, Math.min(max, Math.round(number)));
}
