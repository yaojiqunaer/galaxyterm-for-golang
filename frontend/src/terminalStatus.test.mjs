import assert from 'node:assert/strict';
import {
  buildTerminalErrorDetail,
  buildTerminalRecoveryActions,
  buildTerminalStatusFacts,
  normalizeTerminalStatus,
  terminalStatusTone,
} from './terminalStatus.js';

assert.equal(normalizeTerminalStatus('connected'), 'connected');
assert.equal(normalizeTerminalStatus('busy'), 'busy');
assert.equal(normalizeTerminalStatus('unknown'), 'connecting');
assert.equal(terminalStatusTone('connected'), 'success');
assert.equal(terminalStatusTone('busy'), 'warning');
assert.equal(terminalStatusTone('error'), 'danger');
assert.equal(terminalStatusTone('closed'), 'closed');

assert.deepEqual(buildTerminalStatusFacts({
  cols: 120,
  durationMs: 1530,
  lastCommand: 'kubectl get pods',
  rows: 36,
  status: 'busy',
}), [
  { key: 'status', value: 'busy', tone: 'warning' },
  { key: 'lastCommand', value: 'kubectl get pods', tone: 'neutral' },
  { key: 'duration', value: '1.5s', tone: 'neutral' },
  { key: 'size', value: '120x36', tone: 'neutral' },
]);

assert.deepEqual(buildTerminalStatusFacts({
  cols: 80,
  durationMs: 65000,
  error: 'connection reset',
  rows: 24,
  status: 'error',
}), [
  { key: 'status', value: 'error', tone: 'danger' },
  { key: 'duration', value: '1m 5s', tone: 'neutral' },
  { key: 'size', value: '80x24', tone: 'neutral' },
]);

assert.deepEqual(buildTerminalErrorDetail({
  error: 'connection reset',
  status: 'error',
}), {
  message: 'connection reset',
  suggestionKey: 'terminal.error.recoveryHint',
  titleKey: 'terminal.error.details',
});

assert.equal(buildTerminalErrorDetail({ status: 'connected' }), null);

assert.deepEqual(buildTerminalRecoveryActions({
  error: 'connection reset',
  status: 'error',
}).map((action) => action.key), ['reconnect', 'copyError', 'audit']);

assert.deepEqual(buildTerminalRecoveryActions({
  status: 'closed',
}).map((action) => action.key), ['reconnect', 'audit']);

assert.deepEqual(buildTerminalRecoveryActions({
  status: 'idle',
}), []);
