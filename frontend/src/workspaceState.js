export const workspaceStorageKey = 'galaxyterm.workspaceSnapshot';

export function buildWorkspaceSnapshot(
  sessions = [],
  activeKey = '',
  sessionView = 'tabs',
  now = new Date(),
) {
  return {
    version: 1,
    updatedAt: now.toISOString(),
    activeKey,
    sessionView: sessionView === 'grid' ? 'grid' : 'tabs',
    sessions: sessions.map((session) => ({
      id: session.id,
      label: session.label,
      protected: Boolean(session.protected),
      providerType: session.providerType,
      request: sanitizeWorkspaceRequest(session.request),
    })),
  };
}

export function sanitizeWorkspaceRequest(request = {}) {
  return {
    ...request,
    config: { ...(request.config || {}) },
    auth: {
      username: request.auth?.username || '',
      authType: request.auth?.authType || 'password',
      jumpUsername: request.auth?.jumpUsername || '',
      credentialRef: request.auth?.credentialRef || null,
    },
  };
}

export function workspaceSessionFingerprint(request = {}) {
  const profileId = String(request.profileId || '').trim();
  if (profileId) return `profile:${profileId}`;
  const providerType = String(request.providerType || '').trim();
  if (providerType === 'local') {
    const shell = String(request.config?.shell || 'default').trim() || 'default';
    const workingDirectory = String(request.config?.workingDirectory || '~').trim() || '~';
    return `local:${shell}:${workingDirectory}`;
  }
  return '';
}

export function buildWorkspaceRestorePlan(snapshot, currentSessions = [], options = {}) {
  const currentByFingerprint = new Map();
  currentSessions.forEach((session) => {
    const fingerprint = workspaceSessionFingerprint(session.request);
    if (!fingerprint) return;
    if (!currentByFingerprint.has(fingerprint)) currentByFingerprint.set(fingerprint, []);
    currentByFingerprint.get(fingerprint).push(session);
  });
  const restoreEntries = [];
  let activeExistingSessionId = '';
  let existingCount = 0;
  let skippedCount = 0;

  for (const session of snapshot?.sessions || []) {
    const request = options.resolveRequest?.(session) || null;
    const fingerprint = workspaceSessionFingerprint(request || {});
    if (!request || !fingerprint) {
      skippedCount += 1;
      continue;
    }
    const existingSession = currentByFingerprint.get(fingerprint)?.shift();
    if (existingSession) {
      existingCount += 1;
      if (session.id === snapshot.activeKey) activeExistingSessionId = existingSession.id;
      continue;
    }
    restoreEntries.push({ session, request });
  }

  return {
    activeExistingSessionId,
    existingCount,
    restoreEntries,
    skippedCount,
  };
}

export function persistWorkspaceSnapshot(snapshot, storage = globalThis.localStorage) {
  try {
    storage?.setItem(workspaceStorageKey, JSON.stringify(snapshot));
    return true;
  } catch {
    return false;
  }
}

export function clearWorkspaceSnapshot(storage = globalThis.localStorage) {
  try {
    storage?.removeItem(workspaceStorageKey);
    return true;
  } catch {
    return false;
  }
}

export function loadWorkspaceSnapshot(storage = globalThis.localStorage) {
  try {
    const raw = storage?.getItem(workspaceStorageKey) || '';
    const parsed = JSON.parse(raw || 'null');
    if (!parsed || !Array.isArray(parsed.sessions)) return null;
    const normalized = {
      ...parsed,
      activeKey: String(parsed.activeKey || ''),
      sessionView: parsed.sessionView === 'grid' ? 'grid' : 'tabs',
      sessions: parsed.sessions
        .filter((session) => session?.id && session?.request?.providerType)
        .map((session) => ({
          id: session.id,
          label: session.label || session.request.displayName || session.request.providerType,
          protected: Boolean(session.protected),
          providerType: session.providerType || session.request.providerType,
          request: sanitizeWorkspaceRequest(session.request),
        })),
    };
    const serialized = JSON.stringify(normalized);
    if (raw !== serialized) {
      try {
        storage?.setItem(workspaceStorageKey, serialized);
      } catch {
        // A sanitized in-memory snapshot remains usable when storage is read-only.
      }
    }
    return normalized;
  } catch {
    return null;
  }
}

export function loadWorkspaceSummary(storage = globalThis.localStorage) {
  const snapshot = loadWorkspaceSnapshot(storage);
  if (!snapshot) return null;
  const timestamp = new Date(snapshot.updatedAt);
  return {
    count: snapshot.sessions.length,
    updatedAt: Number.isNaN(timestamp.getTime()) ? '' : timestamp.toLocaleString(),
  };
}
