import assert from 'node:assert/strict';
import {
  buildBroadcastCommandPlan,
  buildBroadcastSessionTargets,
} from './broadcastCommand.js';

const sessions = [
  { id: 'idle', label: 'Idle SSH', providerType: 'ssh', status: 'connected' },
  { id: 'active', label: 'Active local', providerType: 'local', status: 'connected' },
  { id: 'busy', label: 'Busy SSH', providerType: 'ssh', status: 'connected' },
  { id: 'closed', label: 'Closed', providerType: 'ssh', status: 'closed' },
];
const targets = buildBroadcastSessionTargets(sessions, {
  activeKey: 'active',
  displayLabels: { active: 'Local API', idle: 'Production SSH' },
  terminalStatuses: {
    active: { status: 'idle' },
    busy: { status: 'busy' },
    idle: { status: 'connected' },
  },
});
assert.deepEqual(targets.map((target) => ({
  displayName: target.displayName,
  id: target.id,
  status: target.status,
})), [
  { displayName: 'Local API', id: 'active', status: 'idle' },
  { displayName: 'Production SSH', id: 'idle', status: 'connected' },
]);

assert.deepEqual(buildBroadcastCommandPlan({
  appendEnter: true,
  command: 'uptime',
  readySessionIds: targets.map((target) => target.id),
  targetIds: ['idle', 'active', 'idle', 'closed'],
}), {
  command: 'uptime',
  ok: true,
  payload: 'uptime\r',
  reason: '',
  targetIds: ['idle', 'active'],
});
assert.equal(buildBroadcastCommandPlan({
  appendEnter: false,
  command: 'tail -f /var/log/app.log',
  readySessionIds: ['active', 'idle'],
  targetIds: ['active', 'idle'],
}).payload, 'tail -f /var/log/app.log');

assert.equal(buildBroadcastCommandPlan({ command: '', targetIds: ['active', 'idle'] }).reason, 'empty');
assert.equal(buildBroadcastCommandPlan({
  command: 'echo one\necho two',
  readySessionIds: ['active', 'idle'],
  targetIds: ['active', 'idle'],
}).reason, 'multiline');
assert.equal(buildBroadcastCommandPlan({
  command: 'curl -H "Authorization: Bearer secret-token" https://example.com',
  readySessionIds: ['active', 'idle'],
  targetIds: ['active', 'idle'],
}).reason, 'sensitive');
assert.equal(buildBroadcastCommandPlan({
  command: 'uptime',
  readySessionIds: ['active', 'idle'],
  targetIds: ['active', 'closed'],
}).reason, 'notEnoughTargets');
assert.equal(buildBroadcastCommandPlan({
  command: 'x'.repeat(2001),
  readySessionIds: ['active', 'idle'],
  targetIds: ['active', 'idle'],
}).reason, 'tooLong');

console.log('broadcast command tests passed');
