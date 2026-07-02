import assert from 'node:assert/strict';
import { resolveListIndex } from './listNavigation.js';

assert.equal(resolveListIndex(0, 0, 'next'), -1);
assert.equal(resolveListIndex(4, -1, 'next'), 0);
assert.equal(resolveListIndex(4, -1, 'previous'), 3);
assert.equal(resolveListIndex(4, 0, 'previous'), 3);
assert.equal(resolveListIndex(4, 3, 'next'), 0);
assert.equal(resolveListIndex(4, 2, 'first'), 0);
assert.equal(resolveListIndex(4, 2, 'last'), 3);
