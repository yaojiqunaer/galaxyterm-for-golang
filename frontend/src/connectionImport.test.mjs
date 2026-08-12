import assert from 'node:assert/strict';
import {
  applyConnectionImportPlan,
  buildConnectionImportPlan,
  countConnectionImportCredentialCleanupFailures,
} from './connectionImport.js';

const current = [
  {
    id: 'prod-api',
    kind: 'terminal',
    providerType: 'ssh',
    displayName: 'prod-api',
    accent: 'red',
    favorite: true,
    group: 'Production',
    tags: ['critical'],
    lastUsedAt: '2026-08-10T10:00:00.000Z',
    importSource: { type: 'ssh-config', key: 'prod-api' },
    config: { host: 'old.example.com', port: 22, connectTimeoutSeconds: 10 },
    auth: {
      username: 'deploy',
      authType: 'password',
      credentialRef: { id: 'prod-api', hasPassword: true },
    },
  },
  {
    id: 'dev-api',
    kind: 'terminal',
    providerType: 'ssh',
    displayName: 'dev-api',
    group: 'SSH Config',
    importSource: { type: 'ssh-config', key: 'dev-api' },
    config: { host: 'dev.example.com', port: 22 },
    auth: { username: 'developer', authType: 'agent', credentialRef: null },
  },
];

const incoming = [
  {
    id: 'incoming-prod',
    kind: 'terminal',
    providerType: 'ssh',
    displayName: 'prod-api',
    group: 'SSH Config',
    importSource: { type: 'ssh-config', key: 'prod-api' },
    config: { host: 'new.example.com', port: 22, connectTimeoutSeconds: 10 },
    auth: { username: 'deploy', authType: 'password', credentialRef: null },
  },
  {
    id: 'incoming-dev',
    kind: 'terminal',
    providerType: 'ssh',
    displayName: 'dev-api',
    group: 'SSH Config',
    importSource: { type: 'ssh-config', key: 'dev-api' },
    config: { host: 'dev.example.com', port: 22 },
    auth: { username: 'developer', authType: 'agent', credentialRef: null },
  },
  {
    id: 'incoming-stage',
    kind: 'terminal',
    providerType: 'ssh',
    displayName: 'stage-api',
    group: 'SSH Config',
    importSource: { type: 'ssh-config', key: 'stage-api' },
    config: { host: 'stage.example.com', port: 22 },
    auth: { username: 'deploy', authType: 'agent', credentialRef: null },
  },
];

const plan = buildConnectionImportPlan(current, incoming);
assert.deepEqual(plan.summary, {
  conflictCount: 1,
  newCount: 1,
  unchangedCount: 1,
});
assert.deepEqual(plan.conflicts.map((item) => item.incoming.displayName), ['prod-api']);
assert.deepEqual(plan.unchanged.map((item) => item.incoming.displayName), ['dev-api']);
assert.deepEqual(plan.additions.map((item) => item.displayName), ['stage-api']);

const skipped = applyConnectionImportPlan(current, plan, 'skip');
assert.deepEqual(skipped.summary, { addedCount: 1, clearedCredentialCount: 0, skippedCount: 2, updatedCount: 0 });
assert.deepEqual(skipped.updatedProfileIds, []);
assert.equal(skipped.profiles.length, 3);
assert.deepEqual(skipped.clearedCredentialProfiles, []);

const replaced = applyConnectionImportPlan(current, plan, 'replace');
assert.deepEqual(replaced.summary, { addedCount: 1, clearedCredentialCount: 1, skippedCount: 1, updatedCount: 1 });
assert.equal(replaced.profiles.length, 3);
const replacedProd = replaced.profiles.find((profile) => profile.id === 'prod-api');
assert.equal(replacedProd.config.host, 'new.example.com');
assert.equal(replacedProd.group, 'Production');
assert.equal(replacedProd.favorite, true);
assert.equal(replacedProd.accent, 'red');
assert.deepEqual(replacedProd.tags, ['critical']);
assert.equal(replacedProd.lastUsedAt, '2026-08-10T10:00:00.000Z');
assert.equal(replacedProd.auth.credentialRef, null);
assert.deepEqual(replaced.clearedCredentialProfiles.map((profile) => profile.id), ['prod-api']);
assert.deepEqual(replaced.updatedProfileIds, ['prod-api']);

const copied = applyConnectionImportPlan(current, plan, 'copy', {
  idFactory: (profile) => `copy-${profile.displayName}`,
});
assert.deepEqual(copied.summary, { addedCount: 2, clearedCredentialCount: 0, skippedCount: 1, updatedCount: 0 });
assert.equal(copied.profiles.length, 4);
assert.equal(copied.profiles.some((profile) => profile.id === 'copy-prod-api'), true);
assert.equal(copied.profiles.find((profile) => profile.id === 'prod-api').config.host, 'old.example.com');
assert.deepEqual(copied.updatedProfileIds, []);
assert.equal(copied.profiles.find((profile) => profile.id === 'copy-prod-api').importSource, undefined);

const duplicateBatchPlan = buildConnectionImportPlan([], [
  incoming[2],
  { ...incoming[2], id: 'incoming-stage-duplicate' },
]);
assert.deepEqual(duplicateBatchPlan.summary, {
  conflictCount: 0,
  newCount: 1,
  unchangedCount: 1,
});

const sameDestinationPlan = buildConnectionImportPlan(current, [{
  ...incoming[0],
  config: { host: 'old.example.com', port: 22, connectTimeoutSeconds: 30 },
}]);
const sameDestinationResult = applyConnectionImportPlan(current, sameDestinationPlan, 'replace');
assert.deepEqual(
  sameDestinationResult.profiles.find((profile) => profile.id === 'prod-api').auth.credentialRef,
  { id: 'prod-api', hasPassword: true },
);
assert.deepEqual(sameDestinationResult.clearedCredentialProfiles, []);

const jsonCurrent = [{
  id: 'redis-prod',
  providerType: 'redis',
  displayName: 'Redis Production',
  accent: 'purple',
  favorite: true,
  group: 'Production',
  tags: ['critical'],
  config: { host: 'cache-old.internal', port: 6379 },
  auth: { credentialRef: { id: 'redis-prod', providerType: 'redis', fields: ['password'] } },
}];
const jsonPlan = buildConnectionImportPlan(jsonCurrent, [{
  id: 'redis-prod',
  providerType: 'redis',
  displayName: 'Primary Redis',
  accent: 'none',
  group: 'Imported',
  tags: [],
  config: { host: 'cache-new.internal', port: 6379 },
  auth: { credentialRef: null },
}]);
const jsonReplaced = applyConnectionImportPlan(jsonCurrent, jsonPlan, 'replace');
const replacedRedis = jsonReplaced.profiles[0];
assert.equal(replacedRedis.displayName, 'Primary Redis');
assert.equal(replacedRedis.group, 'Production');
assert.equal(replacedRedis.favorite, true);
assert.equal(replacedRedis.accent, 'purple');
assert.deepEqual(replacedRedis.tags, ['critical']);
assert.equal(replacedRedis.auth.credentialRef, null);

const legacySshConfigPlan = buildConnectionImportPlan([{
  ...current[1],
  importSource: undefined,
}], [incoming[1]]);
assert.equal(legacySshConfigPlan.summary.unchangedCount, 1);
assert.equal(countConnectionImportCredentialCleanupFailures([
  { status: 'fulfilled', value: true },
  { status: 'fulfilled', value: false },
  { status: 'rejected', reason: new Error('credential store unavailable') },
]), 2);

console.log('connection import tests passed');
