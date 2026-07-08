import assert from 'node:assert/strict';
import {
  buildCommandHistoryEntry,
  filterCommandHistory,
  isSensitiveCommand,
  upsertCommandHistory,
} from './commandHistory.js';

const baseContext = {
  providerType: 'ssh',
  sessionId: 'session-1',
  sessionLabel: 'Prod Shell',
};

assert.equal(isSensitiveCommand('mysql -uroot -psecret'), true);
assert.equal(isSensitiveCommand('export TOKEN=abc123'), true);
assert.equal(isSensitiveCommand('cat ~/.ssh/id_rsa'), true);
assert.equal(isSensitiveCommand('kubectl get pods -n prod'), false);

assert.deepEqual(buildCommandHistoryEntry('  kubectl get pods  ', baseContext), {
  command: 'kubectl get pods',
  providerType: 'ssh',
  sessionId: 'session-1',
  sessionLabel: 'Prod Shell',
});
assert.equal(buildCommandHistoryEntry('   ', baseContext), null);
assert.equal(buildCommandHistoryEntry('export TOKEN=abc123', baseContext), null);

const history = upsertCommandHistory([
  { command: 'pwd', providerType: 'local', sessionId: 'local-1', sessionLabel: 'Local', updatedAt: '2026-07-01T00:00:00.000Z' },
  { command: 'kubectl get pods', providerType: 'ssh', sessionId: 'old', sessionLabel: 'Old', updatedAt: '2026-07-01T00:00:01.000Z' },
], buildCommandHistoryEntry('kubectl get pods', baseContext), {
  limit: 3,
  now: () => '2026-07-08T10:00:00.000Z',
});

assert.deepEqual(history, [
  {
    command: 'kubectl get pods',
    providerType: 'ssh',
    sessionId: 'session-1',
    sessionLabel: 'Prod Shell',
    updatedAt: '2026-07-08T10:00:00.000Z',
  },
  {
    command: 'pwd',
    providerType: 'local',
    sessionId: 'local-1',
    sessionLabel: 'Local',
    updatedAt: '2026-07-01T00:00:00.000Z',
  },
]);

assert.deepEqual(upsertCommandHistory([
  { command: 'one', providerType: 'local', updatedAt: '1' },
  { command: 'two', providerType: 'local', updatedAt: '2' },
], { command: 'three', providerType: 'local' }, {
  limit: 2,
  now: () => '3',
}).map((item) => item.command), ['three', 'one']);

const mixedHistory = [
  { command: 'kubectl get pods', providerType: 'ssh', sessionId: 'session-1', sessionLabel: 'Prod Shell', updatedAt: '3' },
  { command: 'docker ps', providerType: 'docker', sessionId: 'session-2', sessionLabel: 'Docker', updatedAt: '2' },
  { command: 'pwd', providerType: 'local', sessionId: 'session-3', sessionLabel: 'Local', updatedAt: '1' },
];

assert.deepEqual(
  filterCommandHistory(mixedHistory, { providerType: 'ssh', query: 'pods' }).map((item) => item.command),
  ['kubectl get pods'],
);
assert.deepEqual(
  filterCommandHistory(mixedHistory, { sessionId: 'session-2' }).map((item) => item.command),
  ['docker ps'],
);
