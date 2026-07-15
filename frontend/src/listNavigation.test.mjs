import assert from 'node:assert/strict';
import {
  resolveListIndex,
  resolveBracketSessionAction,
  resolveNumberedSessionIndex,
  resolveSessionShortcutNumber,
  resolveRelativeSessionIndex,
} from './listNavigation.js';

assert.equal(resolveListIndex(0, 0, 'next'), -1);
assert.equal(resolveListIndex(4, -1, 'next'), 0);
assert.equal(resolveListIndex(4, -1, 'previous'), 3);
assert.equal(resolveListIndex(4, 0, 'previous'), 3);
assert.equal(resolveListIndex(4, 3, 'next'), 0);
assert.equal(resolveListIndex(4, 2, 'first'), 0);
assert.equal(resolveListIndex(4, 2, 'last'), 3);

assert.equal(resolveNumberedSessionIndex('1', 4), 0);
assert.equal(resolveNumberedSessionIndex('4', 4), 3);
assert.equal(resolveNumberedSessionIndex('5', 4), -1);
assert.equal(resolveNumberedSessionIndex('0', 4), -1);

assert.equal(resolveSessionShortcutNumber(['s1', 's2'], 's1'), '1');
assert.equal(resolveSessionShortcutNumber(['s1', 's2'], 's2'), '2');
assert.equal(resolveSessionShortcutNumber(['s1'], 'missing'), '');
assert.equal(resolveSessionShortcutNumber(['s1', 's2', 's3', 's4', 's5', 's6', 's7', 's8', 's9', 's10'], 's10'), '');

assert.equal(resolveRelativeSessionIndex(['s1', 's2', 's3'], 's2', 'next'), 2);
assert.equal(resolveRelativeSessionIndex(['s1', 's2', 's3'], 's2', 'previous'), 0);
assert.equal(resolveRelativeSessionIndex(['s1', 's2', 's3'], 's3', 'next'), 0);
assert.equal(resolveRelativeSessionIndex(['s1', 's2', 's3'], 'missing', 'next'), 0);
assert.equal(resolveRelativeSessionIndex([], 'missing', 'next'), -1);

assert.equal(resolveBracketSessionAction({ shiftKey: true, key: '{', code: 'BracketLeft' }), 'previous');
assert.equal(resolveBracketSessionAction({ shiftKey: true, key: '}', code: 'BracketRight' }), 'next');
assert.equal(resolveBracketSessionAction({ shiftKey: false, key: '[', code: 'BracketLeft' }), '');
