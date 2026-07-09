import assert from 'node:assert/strict';
import {
  buildQuickCommandSummary,
  filterQuickCommands,
} from './quickCommands.js';

const commands = [
  { id: 'ls', name: 'List files', command: 'ls -lah', providerType: 'all' },
  { id: 'docker', name: 'Docker ps', command: 'docker ps --format table', providerType: 'docker' },
  { id: 'logs', name: 'Tail service logs', command: 'journalctl -u nginx -f', providerType: 'ssh' },
];

assert.deepEqual(buildQuickCommandSummary(commands, { activeSession: { id: 's1', label: 'Prod SSH', providerType: 'ssh' } }), {
  total: 3,
  available: 2,
  multiLine: 0,
  target: 'Prod SSH',
  canRun: true,
});

assert.deepEqual(buildQuickCommandSummary([{ id: 'deploy', name: 'Deploy', command: 'cd app\nmake deploy' }], {}), {
  total: 1,
  available: 1,
  multiLine: 1,
  target: '',
  canRun: false,
});

assert.deepEqual(filterQuickCommands(commands, '', { providerType: 'ssh' }).map((item) => item.id), ['ls', 'logs']);
assert.deepEqual(filterQuickCommands(commands, '', { providerType: 'docker' }).map((item) => item.id), ['ls', 'docker']);
assert.deepEqual(filterQuickCommands(commands, '', { providerType: 'all' }).map((item) => item.id), ['ls', 'docker', 'logs']);
assert.deepEqual(filterQuickCommands(commands, 'dock', { providerType: 'all' }).map((item) => item.id), ['docker']);
assert.deepEqual(filterQuickCommands(commands, 'nginx logs', { providerType: 'ssh' }).map((item) => item.id), ['logs']);
assert.deepEqual(filterQuickCommands(commands, 'ssh', { providerType: 'ssh' }).map((item) => item.id), ['logs']);
assert.deepEqual(filterQuickCommands(commands, 'missing'), []);
