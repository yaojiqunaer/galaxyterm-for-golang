import assert from 'node:assert/strict';
import {
  sessionStatusLabel,
  sessionStatusTone,
  sessionSummary,
} from './sessionPresentation.js';

assert.equal(sessionStatusTone({ status: 'connected' }), 'success');
assert.equal(sessionStatusTone({ status: 'closed' }), 'closed');
assert.equal(sessionStatusTone({ status: 'connecting' }), 'connecting');
assert.equal(sessionStatusTone({}), 'connecting');

assert.equal(sessionStatusLabel({ status: 'connected' }), 'connected');
assert.equal(sessionStatusLabel({ status: 'closed' }), 'closed');
assert.equal(sessionStatusLabel({ status: 'connecting' }), 'connecting');

assert.deepEqual(sessionSummary([
  { status: 'connected' },
  { status: 'connecting' },
  { status: 'closed' },
  {},
]), {
  active: 3,
  closed: 1,
  connected: 1,
  connecting: 2,
  total: 4,
});
