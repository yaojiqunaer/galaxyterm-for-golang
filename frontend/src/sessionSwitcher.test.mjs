import assert from 'node:assert/strict';
import {
  advanceSessionSwitch,
  buildSessionSwitchOrder,
  consumeSessionSwitchEvent,
  emptySessionSwitchState,
  recordSessionVisit,
  resolveSessionSwitchSelection,
  shouldCancelSessionSwitch,
  startSessionSwitch,
} from './sessionSwitcher.js';

assert.deepEqual(
  recordSessionVisit(['s2', 'removed', 's1'], 's3', ['s1', 's2', 's3'], 3),
  ['s3', 's2', 's1'],
);
assert.deepEqual(
  recordSessionVisit(['s3', 's2', 's1'], '', ['s1', 's3']),
  ['s3', 's1'],
);
assert.deepEqual(
  buildSessionSwitchOrder(['s1', 's2', 's3', 's4'], ['s2', 's3'], 's1'),
  ['s1', 's2', 's3', 's4'],
);

const forward = startSessionSwitch({
  activeSessionId: 's1',
  direction: 'next',
  recentSessionIds: ['s1', 's3', 's2'],
  sessionIds: ['s1', 's2', 's3', 's4'],
});
assert.deepEqual(forward, {
  open: true,
  originActiveId: 's1',
  orderedIds: ['s1', 's3', 's2', 's4'],
  selectedId: 's3',
  selectedIndex: 1,
});
assert.equal(advanceSessionSwitch(forward, 'next').selectedId, 's2');
assert.equal(advanceSessionSwitch(forward, 'previous').selectedId, 's1');

const backward = startSessionSwitch({
  activeSessionId: 's1',
  direction: 'previous',
  recentSessionIds: ['s1', 's3', 's2'],
  sessionIds: ['s1', 's2', 's3', 's4'],
});
assert.equal(backward.selectedId, 's4');
assert.equal(resolveSessionSwitchSelection(backward), 's4');
assert.equal(resolveSessionSwitchSelection(backward, { cancelled: true }), '');
assert.equal(shouldCancelSessionSwitch(forward, {
  activeSessionId: 's1',
  currentView: 'sessions',
  originView: 'sessions',
  sessionIds: ['s1', 's2', 's3', 's4'],
}), false);
assert.equal(shouldCancelSessionSwitch(forward, {
  activeSessionId: 's2',
  currentView: 'sessions',
  originView: 'sessions',
  sessionIds: ['s1', 's2', 's3', 's4'],
}), true);
assert.equal(shouldCancelSessionSwitch(forward, {
  activeSessionId: 's1',
  currentView: 'files',
  originView: 'sessions',
  sessionIds: ['s1', 's2', 's3', 's4'],
}), true);
assert.equal(shouldCancelSessionSwitch(forward, {
  activeSessionId: 's1',
  currentView: 'sessions',
  originView: 'sessions',
  sessionIds: ['s1', 's2', 's3'],
}), true);

const consumed = [];
consumeSessionSwitchEvent({
  preventDefault: () => consumed.push('default'),
  stopPropagation: () => consumed.push('propagation'),
});
assert.deepEqual(consumed, ['default', 'propagation']);

assert.equal(startSessionSwitch({
  activeSessionId: 'removed',
  direction: 'next',
  recentSessionIds: ['s2', 's1'],
  sessionIds: ['s1', 's2'],
}).selectedId, 's2');

assert.deepEqual(startSessionSwitch({
  activeSessionId: 's1',
  direction: 'next',
  recentSessionIds: ['s1'],
  sessionIds: ['s1'],
}), emptySessionSwitchState());
assert.deepEqual(advanceSessionSwitch(emptySessionSwitchState(), 'next'), emptySessionSwitchState());

console.log('session switcher tests passed');
