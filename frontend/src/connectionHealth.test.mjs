import assert from 'node:assert/strict';
import {
  beginConnectionProbes,
  buildConnectionHealthPresentation,
  buildConnectionProbePlan,
  clearConnectionHealth,
  completeConnectionProbe,
  connectionHealthFingerprint,
  reconcileConnectionHealth,
  runConnectionProbeQueue,
} from './connectionHealth.js';

const profiles = [
  {
    id: 'prod-ssh',
    providerType: 'ssh',
    displayName: 'Production SSH',
    config: { port: 22, host: '10.0.0.8' },
    auth: { username: 'deploy', authType: 'privateKey' },
  },
  {
    id: 'local-shell',
    providerType: 'local',
    displayName: 'Local Shell',
    config: { workingDirectory: '/tmp' },
    auth: {},
  },
  {
    id: 'release-files',
    kind: 'file',
    providerType: 'sftp',
    displayName: 'Release Files',
    filePath: '/releases',
    config: { host: 'files.example.com', port: 22 },
    auth: { credentialRef: { id: 'release-files' } },
  },
  {
    id: 'missing-redis',
    providerType: 'redis',
    displayName: 'Missing Redis',
    config: { host: 'redis.example.com' },
    auth: {},
  },
];

assert.equal(
  connectionHealthFingerprint(profiles[0]),
  connectionHealthFingerprint({
    ...profiles[0],
    config: { host: '10.0.0.8', port: 22 },
  }),
);
assert.notEqual(
  connectionHealthFingerprint(profiles[0]),
  connectionHealthFingerprint({ ...profiles[0], config: { host: '10.0.0.9', port: 22 } }),
);

const checkingState = beginConnectionProbes({}, [profiles[0]], 1000);
assert.deepEqual(checkingState['prod-ssh'], {
  checkedAt: 0,
  error: null,
  fingerprint: connectionHealthFingerprint(profiles[0]),
  latencyMs: 0,
  startedAt: 1000,
  status: 'checking',
});
assert.equal(beginConnectionProbes(checkingState, [profiles[0]], 1200), checkingState);

const probePlan = buildConnectionProbePlan(
  profiles,
  profiles.map((profile) => profile.id),
  [{ type: 'ssh' }, { type: 'sftp' }],
  checkingState,
);
assert.deepEqual(probePlan.probeableProfiles.map((profile) => profile.id), ['release-files']);
assert.deepEqual(probePlan.skipped, {
  checking: 1,
  local: 1,
  unavailable: 1,
});

const successfulState = completeConnectionProbe(checkingState, 'prod-ssh', {
  finishedAt: 1068,
});
assert.deepEqual(successfulState['prod-ssh'], {
  checkedAt: 1068,
  error: null,
  fingerprint: connectionHealthFingerprint(profiles[0]),
  latencyMs: 68,
  startedAt: 1000,
  status: 'success',
});
assert.deepEqual(buildConnectionHealthPresentation(successfulState['prod-ssh'], profiles[0]), {
  badge: { key: 'healthSuccess', tone: 'success', value: 68 },
  canRetry: true,
  checkedAt: 1068,
  descriptionKey: 'connection.health.success.description',
  error: null,
  latencyMs: 68,
  status: 'success',
  titleKey: 'connection.health.success.title',
});
assert.equal(buildConnectionHealthPresentation(successfulState['prod-ssh'], {
  ...profiles[0],
  config: { host: '10.0.0.9', port: 22 },
}), null);

const failedState = completeConnectionProbe(checkingState, 'prod-ssh', {
  error: { reasonKey: 'operation.error.reason.network' },
  finishedAt: 1105,
});
assert.deepEqual(buildConnectionHealthPresentation(failedState['prod-ssh'], profiles[0]), {
  badge: { key: 'healthError', tone: 'danger', value: true },
  canRetry: true,
  checkedAt: 1105,
  descriptionKey: 'connection.health.error.description',
  error: { reasonKey: 'operation.error.reason.network' },
  latencyMs: 105,
  status: 'error',
  titleKey: 'connection.health.error.title',
});
assert.deepEqual(reconcileConnectionHealth({
  ...failedState,
  missing: { status: 'success' },
}, ['prod-ssh']), failedState);
assert.deepEqual(clearConnectionHealth(successfulState, ['prod-ssh']), {});
assert.equal(clearConnectionHealth(successfulState, ['missing']), successfulState);

let activeWorkers = 0;
let maxActiveWorkers = 0;
const queueResults = await runConnectionProbeQueue([1, 2, 3, 4], async (item) => {
  activeWorkers += 1;
  maxActiveWorkers = Math.max(maxActiveWorkers, activeWorkers);
  await new Promise((resolve) => setTimeout(resolve, 2));
  activeWorkers -= 1;
  if (item === 3) throw new Error('offline');
  return item * 2;
}, 2);
assert.equal(maxActiveWorkers, 2);
assert.deepEqual(queueResults.map((result) => result.status), ['fulfilled', 'fulfilled', 'rejected', 'fulfilled']);
assert.deepEqual(queueResults.filter((result) => result.status === 'fulfilled').map((result) => result.value), [2, 4, 8]);

console.log('connection health tests passed');
