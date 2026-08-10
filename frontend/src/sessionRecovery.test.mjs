import assert from 'node:assert/strict';
import {
  buildSessionRecoveryPlan,
  markSessionRecoveryStarted,
  normalizeSessionRecoveryPolicy,
  pruneSessionRecoveries,
} from './sessionRecovery.js';

assert.deepEqual(normalizeSessionRecoveryPolicy({}), {
  baseDelaySeconds: 3,
  enabled: false,
  maxAttempts: 3,
});
assert.deepEqual(normalizeSessionRecoveryPolicy({
  autoReconnect: true,
  autoReconnectDelaySeconds: 0,
  autoReconnectMaxAttempts: 99,
}), {
  baseDelaySeconds: 1,
  enabled: true,
  maxAttempts: 10,
});

const savedSSHSession = {
  id: 'session-1',
  providerType: 'ssh',
  revision: 0,
  request: { profileId: 'profile-1', providerType: 'ssh' },
};
const enabledSettings = {
  autoReconnect: true,
  autoReconnectDelaySeconds: 3,
  autoReconnectMaxAttempts: 3,
};

assert.equal(buildSessionRecoveryPlan({
  session: savedSSHSession,
  status: { status: 'error' },
  revision: 0,
  settings: {},
}).reason, 'disabled');
assert.equal(buildSessionRecoveryPlan({
  session: { ...savedSSHSession, providerType: 'local' },
  status: { status: 'error' },
  revision: 0,
  settings: enabledSettings,
}).reason, 'local');
assert.equal(buildSessionRecoveryPlan({
  session: { ...savedSSHSession, request: { providerType: 'ssh' } },
  status: { status: 'error' },
  revision: 0,
  settings: enabledSettings,
}).reason, 'temporary');
assert.equal(buildSessionRecoveryPlan({
  session: savedSSHSession,
  status: { status: 'closed' },
  revision: 0,
  settings: enabledSettings,
}).reason, 'status');
assert.equal(buildSessionRecoveryPlan({
  session: { ...savedSSHSession, revision: 2 },
  status: { status: 'error' },
  revision: 1,
  settings: enabledSettings,
}).reason, 'stale');

const firstPlan = buildSessionRecoveryPlan({
  now: 1_000,
  session: savedSSHSession,
  status: { status: 'error' },
  revision: 0,
  settings: enabledSettings,
});
assert.deepEqual(firstPlan, {
  kind: 'schedule',
  recovery: {
    attempt: 1,
    delaySeconds: 3,
    errorRevision: 0,
    maxAttempts: 3,
    retryAt: 4_000,
    status: 'scheduled',
  },
});
assert.equal(buildSessionRecoveryPlan({
  recovery: firstPlan.recovery,
  session: savedSSHSession,
  status: { status: 'error' },
  revision: 0,
  settings: enabledSettings,
}).reason, 'duplicate');

const reconnecting = markSessionRecoveryStarted(firstPlan.recovery, 1);
assert.deepEqual(reconnecting, {
  ...firstPlan.recovery,
  revision: 1,
  status: 'reconnecting',
});
const secondPlan = buildSessionRecoveryPlan({
  now: 5_000,
  recovery: reconnecting,
  session: { ...savedSSHSession, revision: 1 },
  status: { status: 'error' },
  revision: 1,
  settings: enabledSettings,
});
assert.equal(secondPlan.kind, 'schedule');
assert.equal(secondPlan.recovery.attempt, 2);
assert.equal(secondPlan.recovery.delaySeconds, 6);
assert.equal(secondPlan.recovery.retryAt, 11_000);

const boundedDelay = buildSessionRecoveryPlan({
  now: 8_000,
  recovery: { attempt: 4, revision: 4, status: 'reconnecting' },
  session: { ...savedSSHSession, revision: 4 },
  status: { status: 'error' },
  revision: 4,
  settings: {
    ...enabledSettings,
    autoReconnectDelaySeconds: 10,
    autoReconnectMaxAttempts: 6,
  },
});
assert.equal(boundedDelay.kind, 'schedule');
assert.equal(boundedDelay.recovery.attempt, 5);
assert.equal(boundedDelay.recovery.delaySeconds, 30);
assert.equal(boundedDelay.recovery.retryAt, 38_000);

const exhausted = buildSessionRecoveryPlan({
  recovery: { attempt: 3, revision: 3, status: 'reconnecting' },
  session: { ...savedSSHSession, revision: 3 },
  status: { status: 'error' },
  revision: 3,
  settings: enabledSettings,
});
assert.deepEqual(exhausted, {
  kind: 'exhausted',
  recovery: {
    attempt: 3,
    errorRevision: 3,
    maxAttempts: 3,
    status: 'exhausted',
  },
});
assert.equal(buildSessionRecoveryPlan({
  recovery: exhausted.recovery,
  session: { ...savedSSHSession, revision: 3 },
  status: { status: 'error' },
  revision: 3,
  settings: enabledSettings,
}).reason, 'duplicate');

assert.deepEqual(pruneSessionRecoveries({
  'session-1': firstPlan.recovery,
  missing: exhausted.recovery,
}, ['session-1']), {
  'session-1': firstPlan.recovery,
});

console.log('session recovery tests passed');
