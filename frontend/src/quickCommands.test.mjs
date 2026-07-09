import assert from 'node:assert/strict';
import {
  buildQuickCommandFromHistory,
  buildQuickCommandSafetyState,
  buildQuickCommandSaveResult,
  buildQuickCommandSummary,
  filterQuickCommands,
  normalizeQuickCommand,
  upsertQuickCommand,
} from './quickCommands.js';

const commands = [
  { id: 'ls', name: 'List files', command: 'ls -lah', providerType: 'all' },
  { id: 'docker', name: 'Docker ps', command: 'docker ps --format table', favorite: true, providerType: 'docker' },
  { id: 'logs', name: 'Tail service logs', command: 'journalctl -u nginx -f', providerType: 'ssh' },
];

assert.deepEqual(buildQuickCommandSummary(commands, { activeSession: { id: 's1', label: 'Prod SSH', providerType: 'ssh' } }), {
  total: 3,
  available: 2,
  favorites: 1,
  multiLine: 0,
  target: 'Prod SSH',
  canRun: true,
});

assert.deepEqual(buildQuickCommandSummary([{ id: 'deploy', name: 'Deploy', command: 'cd app\nmake deploy' }], {}), {
  total: 1,
  available: 1,
  favorites: 0,
  multiLine: 1,
  target: '',
  canRun: false,
});

assert.deepEqual(filterQuickCommands(commands, '', { providerType: 'ssh' }).map((item) => item.id), ['ls', 'logs']);
assert.deepEqual(filterQuickCommands(commands, '', { providerType: 'docker' }).map((item) => item.id), ['docker', 'ls']);
assert.deepEqual(filterQuickCommands(commands, '', { providerType: 'all' }).map((item) => item.id), ['docker', 'ls', 'logs']);
assert.deepEqual(filterQuickCommands(commands, 'dock', { providerType: 'all' }).map((item) => item.id), ['docker']);
assert.deepEqual(filterQuickCommands(commands, 'nginx logs', { providerType: 'ssh' }).map((item) => item.id), ['logs']);
assert.deepEqual(filterQuickCommands(commands, 'ssh', { providerType: 'ssh' }).map((item) => item.id), ['logs']);
assert.deepEqual(filterQuickCommands(commands, 'missing'), []);
assert.deepEqual(filterQuickCommands(commands, '', { providerType: 'all', favoriteOnly: true }).map((item) => item.id), ['docker']);
assert.deepEqual(filterQuickCommands(commands, 'docker', { providerType: 'ssh', favoriteOnly: true }).map((item) => item.id), []);

assert.deepEqual(normalizeQuickCommand({
  id: 'top',
  name: 'Top',
  command: 'top',
  favorite: true,
}), {
  id: 'top',
  name: 'Top',
  command: 'top',
  favorite: true,
  providerType: 'all',
});

assert.deepEqual(buildQuickCommandFromHistory({
  command: '  kubectl get pods -n default  ',
  providerType: 'k8s',
}, { id: 'history-1' }), {
  id: 'history-1',
  name: 'kubectl get pods -n default',
  command: 'kubectl get pods -n default',
  favorite: false,
  providerType: 'k8s',
});

assert.deepEqual(buildQuickCommandFromHistory({
  command: 'docker ps\n docker logs api',
  providerType: 'docker',
}, { id: 'history-2', favorite: true }), {
  id: 'history-2',
  name: 'docker ps',
  command: 'docker ps\n docker logs api',
  favorite: true,
  providerType: 'docker',
});

assert.equal(buildQuickCommandFromHistory({ command: '   ' }), null);

assert.deepEqual(buildQuickCommandSaveResult({
  id: 'safe',
  name: 'List pods',
  command: 'kubectl get pods',
  providerType: 'k8s',
}), {
  command: {
    id: 'safe',
    name: 'List pods',
    command: 'kubectl get pods',
    favorite: false,
    providerType: 'k8s',
  },
  skippedReason: '',
});
assert.deepEqual(buildQuickCommandSaveResult({
  id: 'secret',
  name: 'Login',
  command: 'mysql --password secret',
  providerType: 'ssh',
}), {
  command: null,
  skippedReason: 'sensitive',
});
assert.deepEqual(buildQuickCommandSaveResult({
  id: 'blank',
  name: 'Blank',
  command: '   ',
}), {
  command: null,
  skippedReason: 'empty',
});
assert.deepEqual(buildQuickCommandSafetyState({
  command: 'kubectl get pods',
}), {
  canCopy: true,
  canEdit: true,
  canRun: true,
  displayCommand: 'kubectl get pods',
  sensitive: false,
  warningKey: '',
});
assert.deepEqual(buildQuickCommandSafetyState({
  command: 'mysql --password secret',
}), {
  canCopy: false,
  canEdit: false,
  canRun: false,
  displayCommand: 'command.sensitiveHidden',
  sensitive: true,
  warningKey: 'command.sensitiveStoredWarning',
});

assert.deepEqual(upsertQuickCommand(commands, {
  id: 'logs',
  name: 'Tail app logs',
  command: 'journalctl -u app -f',
  favorite: true,
  providerType: 'ssh',
}).find((item) => item.id === 'logs'), {
  id: 'logs',
  name: 'Tail app logs',
  command: 'journalctl -u app -f',
  favorite: true,
  providerType: 'ssh',
});

assert.deepEqual(upsertQuickCommand(commands, {
  id: 'new',
  name: 'Disk usage',
  command: 'df -h',
}).map((item) => item.id), ['ls', 'docker', 'logs', 'new']);
