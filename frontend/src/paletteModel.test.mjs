import assert from 'node:assert/strict';
import {
  filterPaletteItems,
  resolvePaletteIndex,
} from './paletteModel.js';

const items = [
  {
    title: 'Prod Web',
    description: 'root@10.0.0.2:22',
    group: 'Connections',
    keywords: 'production ssh web',
  },
  {
    title: 'Audit Logs',
    description: 'Review terminal recordings',
    group: 'Navigation',
    keywords: 'record replay',
  },
  {
    title: 'Deploy',
    description: 'kubectl apply -f',
    group: 'Commands',
    keywords: 'k8s kubernetes',
  },
];

assert.deepEqual(filterPaletteItems(items, '').map((item) => item.title), ['Prod Web', 'Audit Logs', 'Deploy']);
assert.deepEqual(filterPaletteItems(items, 'PROD').map((item) => item.title), ['Prod Web']);
assert.deepEqual(filterPaletteItems(items, 'record').map((item) => item.title), ['Audit Logs']);
assert.deepEqual(filterPaletteItems(items, 'kubernetes').map((item) => item.title), ['Deploy']);

assert.equal(resolvePaletteIndex(0, 0, 'next'), -1);
assert.equal(resolvePaletteIndex(3, -1, 'next'), 0);
assert.equal(resolvePaletteIndex(3, 0, 'previous'), 2);
assert.equal(resolvePaletteIndex(3, 2, 'next'), 0);
assert.equal(resolvePaletteIndex(3, 1, 'first'), 0);
assert.equal(resolvePaletteIndex(3, 1, 'last'), 2);
