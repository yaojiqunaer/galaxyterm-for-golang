import assert from 'node:assert/strict';
import {
  buildCommandHistoryEntry,
  buildCommandHistoryEntryResult,
  clearCommandHistory,
  filterCommandHistory,
  isSensitiveCommand,
  normalizeCommandHistoryItem,
  pruneCommandHistory,
  removeCommandHistoryItem,
  toggleCommandHistoryFavorite,
  upsertCommandHistory,
} from './commandHistory.js';

const baseContext = {
  providerType: 'ssh',
  sessionId: 'session-1',
  sessionLabel: 'Prod Shell',
};

assert.equal(isSensitiveCommand('mysql -uroot -psecret'), true);
assert.equal(isSensitiveCommand('mysql --password secret'), true);
assert.equal(isSensitiveCommand('curl -H "Authorization: Bearer abc123" https://example.com'), true);
assert.equal(isSensitiveCommand('deploy --token=abc123'), true);
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
assert.deepEqual(buildCommandHistoryEntryResult('kubectl get pods', baseContext), {
  entry: {
    command: 'kubectl get pods',
    providerType: 'ssh',
    sessionId: 'session-1',
    sessionLabel: 'Prod Shell',
  },
  skippedReason: '',
});
assert.deepEqual(buildCommandHistoryEntryResult('export TOKEN=abc123', baseContext), {
  entry: null,
  skippedReason: 'sensitive',
});
assert.deepEqual(buildCommandHistoryEntryResult('   ', baseContext), {
  entry: null,
  skippedReason: 'empty',
});

const history = upsertCommandHistory([
  { command: 'pwd', providerType: 'local', sessionId: 'local-1', sessionLabel: 'Local', updatedAt: '2026-07-01T00:00:00.000Z' },
  { command: 'kubectl get pods', favorite: true, providerType: 'ssh', sessionId: 'old', sessionLabel: 'Old', updatedAt: '2026-07-01T00:00:01.000Z' },
], buildCommandHistoryEntry('kubectl get pods', baseContext), {
  limit: 3,
  now: () => '2026-07-08T10:00:00.000Z',
});

assert.deepEqual(history, [
  {
    command: 'kubectl get pods',
    favorite: false,
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
  {
    command: 'kubectl get pods',
    favorite: true,
    providerType: 'ssh',
    sessionId: 'old',
    sessionLabel: 'Old',
    updatedAt: '2026-07-01T00:00:01.000Z',
  },
]);

assert.deepEqual(
  toggleCommandHistoryFavorite(history, history[0]).map((item) => item.favorite === true),
  [true, false, true],
);
assert.deepEqual(
  removeCommandHistoryItem(history, history[0]).map((item) => item.sessionId),
  ['local-1', 'old'],
);
assert.deepEqual(pruneCommandHistory(history, 2).map((item) => item.sessionId), ['session-1', 'local-1']);

assert.deepEqual(upsertCommandHistory([
  { command: 'one', providerType: 'local', updatedAt: '1' },
  { command: 'two', providerType: 'local', updatedAt: '2' },
], { command: 'three', providerType: 'local' }, {
  limit: 2,
  now: () => '3',
}).map((item) => item.command), ['three', 'one']);

const mixedHistory = [
  { command: 'kubectl get pods', providerType: 'ssh', sessionId: 'session-1', sessionLabel: 'Prod Shell', updatedAt: '3' },
  { command: 'docker ps', favorite: true, providerType: 'docker', sessionId: 'session-2', sessionLabel: 'Docker', updatedAt: '2' },
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
assert.deepEqual(
  filterCommandHistory(mixedHistory, { providerType: 'all' }).map((item) => item.command),
  ['docker ps', 'kubectl get pods', 'pwd'],
);
assert.deepEqual(
  clearCommandHistory(mixedHistory, { providerType: 'ssh' }).map((item) => item.command),
  ['docker ps', 'pwd'],
);
assert.deepEqual(
  clearCommandHistory(mixedHistory, { sessionId: 'session-2' }).map((item) => item.command),
  ['kubectl get pods', 'pwd'],
);
assert.deepEqual(
  clearCommandHistory(mixedHistory, { providerType: 'all', query: 'docker' }).map((item) => item.command),
  ['kubectl get pods', 'pwd'],
);
assert.deepEqual(clearCommandHistory(mixedHistory, { providerType: 'all' }), []);
assert.deepEqual(normalizeCommandHistoryItem({
  command: 'pwd',
  providerType: 'local',
}), {
  command: 'pwd',
  favorite: false,
  providerType: 'local',
  sessionId: '',
  sessionLabel: '',
  updatedAt: '',
});
