import assert from 'node:assert/strict';
import {
  buildQuickCommandSummary,
  filterQuickCommands,
} from './quickCommands.js';

const commands = [
  { id: 'ls', name: 'List files', command: 'ls -lah' },
  { id: 'docker', name: 'Docker ps', command: 'docker ps --format table' },
  { id: 'logs', name: 'Tail service logs', command: 'journalctl -u nginx -f' },
];

assert.deepEqual(buildQuickCommandSummary(commands, { activeSession: { id: 's1', label: 'Prod SSH' } }), {
  total: 3,
  multiLine: 0,
  target: 'Prod SSH',
  canRun: true,
});

assert.deepEqual(buildQuickCommandSummary([{ id: 'deploy', name: 'Deploy', command: 'cd app\nmake deploy' }], {}), {
  total: 1,
  multiLine: 1,
  target: '',
  canRun: false,
});

assert.deepEqual(filterQuickCommands(commands, '').map((item) => item.id), ['ls', 'docker', 'logs']);
assert.deepEqual(filterQuickCommands(commands, 'dock').map((item) => item.id), ['docker']);
assert.deepEqual(filterQuickCommands(commands, 'nginx logs').map((item) => item.id), ['logs']);
assert.deepEqual(filterQuickCommands(commands, 'missing'), []);
