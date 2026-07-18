import assert from 'node:assert/strict';

const searchModule = await import('./terminalSearch.js').catch(() => ({}));

assert.equal(
  typeof searchModule.normalizeTerminalSearchResult,
  'function',
  'terminal search must expose a result normalizer',
);

const {
  emptyTerminalSearchResult,
  hasTerminalSearchKeywordChanged,
  normalizeTerminalSearchResult,
  resolveTerminalSearchKeyAction,
} = searchModule;

assert.equal(typeof hasTerminalSearchKeywordChanged, 'function');
assert.equal(hasTerminalSearchKeywordChanged('error', ' error '), false);
assert.equal(hasTerminalSearchKeywordChanged('error', 'warning'), true);

assert.deepEqual(
  normalizeTerminalSearchResult({ resultCount: 8, resultIndex: 2 }, 'error'),
  { current: 3, limited: false, status: 'ready', total: 8 },
);
assert.deepEqual(
  normalizeTerminalSearchResult({ resultCount: 0, resultIndex: -1 }, 'missing'),
  { current: 0, limited: false, status: 'empty', total: 0 },
);
assert.deepEqual(
  normalizeTerminalSearchResult({ resultCount: 1000, resultIndex: -1 }, 'common'),
  { current: 0, limited: true, status: 'ready', total: 1000 },
);
assert.deepEqual(
  normalizeTerminalSearchResult({ resultCount: 5, resultIndex: 99 }, 'error'),
  { current: 0, limited: true, status: 'ready', total: 5 },
);
assert.deepEqual(
  normalizeTerminalSearchResult({ resultCount: 5, resultIndex: 1 }, '   '),
  emptyTerminalSearchResult,
);

assert.equal(resolveTerminalSearchKeyAction({ key: 'Enter', shiftKey: false }), 'next');
assert.equal(resolveTerminalSearchKeyAction({ key: 'Enter', shiftKey: true }), 'previous');
assert.equal(resolveTerminalSearchKeyAction({ key: 'Escape' }), 'close');
assert.equal(resolveTerminalSearchKeyAction({ key: 'ArrowDown' }), 'ignore');

console.log('terminal search tests passed');
