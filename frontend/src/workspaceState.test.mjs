import assert from 'node:assert/strict';

const workspaceState = await import('./workspaceState.js').catch(() => null);
assert.ok(workspaceState, 'workspace state model must exist');

const {
  buildWorkspaceRestorePlan,
  buildWorkspaceSnapshot,
  clearWorkspaceSnapshot,
  loadWorkspaceSnapshot,
  loadWorkspaceSummary,
  persistWorkspaceSnapshot,
  sanitizeWorkspaceRequest,
  workspaceSessionFingerprint,
} = workspaceState;

const sensitiveRequest = {
  profileId: 'ssh-prod',
  providerType: 'ssh',
  displayName: 'Production',
  config: { host: 'prod.example.com', port: 22 },
  auth: {
    username: 'deploy',
    authType: 'password',
    password: 'secret',
    privateKey: 'PRIVATE',
    credentialRef: { id: 'ssh-prod' },
  },
};
assert.deepEqual(sanitizeWorkspaceRequest(sensitiveRequest), {
  profileId: 'ssh-prod',
  providerType: 'ssh',
  displayName: 'Production',
  config: { host: 'prod.example.com', port: 22 },
  auth: {
    username: 'deploy',
    authType: 'password',
    jumpUsername: '',
    credentialRef: { id: 'ssh-prod' },
  },
});

const snapshot = buildWorkspaceSnapshot([
  {
    id: 'snapshot-local',
    label: 'Local',
    protected: true,
    providerType: 'local',
    request: {
      providerType: 'local',
      displayName: 'Local',
      config: { shell: '/bin/zsh', workingDirectory: '/workspace' },
      auth: {},
    },
  },
  {
    id: 'snapshot-ssh',
    label: 'Production',
    providerType: 'ssh',
    request: sensitiveRequest,
  },
  {
    id: 'snapshot-temporary',
    label: 'Temporary',
    providerType: 'ssh',
    request: {
      providerType: 'ssh',
      config: { host: 'temporary.example.com', port: 22 },
      auth: { username: 'root' },
    },
  },
], 'snapshot-local', 'grid', new Date('2026-07-18T10:00:00.000Z'));
assert.equal(snapshot.updatedAt, '2026-07-18T10:00:00.000Z');
assert.equal(snapshot.sessions[0].protected, true);
assert.equal(snapshot.sessions[1].request.auth.password, undefined);
assert.deepEqual(buildWorkspaceSnapshot([], '', 'tabs').sessions, []);

assert.equal(
  workspaceSessionFingerprint(snapshot.sessions[0].request),
  'local:/bin/zsh:/workspace',
);
assert.equal(workspaceSessionFingerprint(snapshot.sessions[1].request), 'profile:ssh-prod');

const currentSessions = [{
  id: 'current-local',
  request: {
    providerType: 'local',
    config: { shell: '/bin/zsh', workingDirectory: '/workspace' },
  },
}];
const restorePlan = buildWorkspaceRestorePlan(snapshot, currentSessions, {
  resolveRequest: (session) => {
    if (session.request.providerType === 'local') return session.request;
    if (session.request.profileId === 'ssh-prod') {
      return { ...sensitiveRequest, auth: { credentialRef: { id: 'ssh-prod' } } };
    }
    return null;
  },
});
assert.deepEqual({
  activeExistingSessionId: restorePlan.activeExistingSessionId,
  existingCount: restorePlan.existingCount,
  restoreIds: restorePlan.restoreEntries.map((entry) => entry.session.id),
  skippedCount: restorePlan.skippedCount,
}, {
  activeExistingSessionId: 'current-local',
  existingCount: 1,
  restoreIds: ['snapshot-ssh'],
  skippedCount: 1,
});

const duplicateSnapshot = {
  ...snapshot,
  sessions: [snapshot.sessions[0], { ...snapshot.sessions[0], id: 'duplicate-local' }],
};
assert.deepEqual(
  buildWorkspaceRestorePlan(duplicateSnapshot, [], {
    resolveRequest: (session) => session.request,
  }),
  {
    activeExistingSessionId: '',
    existingCount: 0,
    restoreEntries: [
      { session: snapshot.sessions[0], request: snapshot.sessions[0].request },
      { session: duplicateSnapshot.sessions[1], request: duplicateSnapshot.sessions[1].request },
    ],
    skippedCount: 0,
  },
);

assert.deepEqual(
  buildWorkspaceRestorePlan(duplicateSnapshot, [currentSessions[0]], {
    resolveRequest: (session) => session.request,
  }),
  {
    activeExistingSessionId: 'current-local',
    existingCount: 1,
    restoreEntries: [{ session: duplicateSnapshot.sessions[1], request: duplicateSnapshot.sessions[1].request }],
    skippedCount: 0,
  },
);

const storageValues = new Map();
const storage = {
  getItem: (key) => storageValues.get(key) ?? null,
  removeItem: (key) => storageValues.delete(key),
  setItem: (key, value) => storageValues.set(key, value),
};
assert.equal(persistWorkspaceSnapshot(snapshot, storage), true);
assert.equal(loadWorkspaceSnapshot(storage).sessions.length, 3);
assert.equal(loadWorkspaceSummary(storage).count, 3);
assert.equal(clearWorkspaceSnapshot(storage), true);
assert.equal(loadWorkspaceSnapshot(storage), null);
storageValues.set(workspaceState.workspaceStorageKey, JSON.stringify({
  ...snapshot,
  sessions: [{
    ...snapshot.sessions[0],
    request: {
      ...snapshot.sessions[0].request,
      auth: { username: 'local', password: 'legacy-secret' },
    },
  }],
}));
assert.equal(loadWorkspaceSnapshot(storage).sessions[0].request.auth.password, undefined);
storageValues.set(workspaceState.workspaceStorageKey, '{broken');
assert.equal(loadWorkspaceSnapshot(storage), null);

console.log('workspace state tests passed');
