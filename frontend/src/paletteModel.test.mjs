import assert from 'node:assert/strict';
import {
  buildPaletteSummary,
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

assert.deepEqual(buildPaletteSummary(items), {
  total: 3,
  groups: [
    { group: 'Connections', count: 1 },
    { group: 'Navigation', count: 1 },
    { group: 'Commands', count: 1 },
  ],
});

assert.deepEqual(buildPaletteSummary([]), {
  total: 0,
  groups: [],
});

assert.deepEqual(filterPaletteItems([
  {
    title: 'Audit Logs',
    description: 'SSH session recordings',
    group: 'Navigation',
    keywords: 'security ssh',
  },
  {
    title: 'Production SSH',
    description: 'ssh root@10.0.0.2',
    group: 'Connections',
    keywords: 'server',
  },
  {
    title: 'SSH Terminal',
    description: 'Open a saved server',
    group: 'Providers',
    keywords: 'terminal shell',
  },
], 'ssh').map((item) => item.title), ['SSH Terminal', 'Production SSH', 'Audit Logs']);
assert.deepEqual(filterPaletteItems([
  {
    title: 'Production SSH',
    description: 'root@10.0.0.2:22',
    group: 'Connections',
    keywords: 'server terminal',
  },
  {
    title: 'Audit Logs',
    description: 'SSH recordings',
    group: 'Navigation',
    keywords: 'production',
  },
], 'prod ssh').map((item) => item.title), ['Production SSH', 'Audit Logs']);

assert.equal(resolvePaletteIndex(0, 0, 'next'), -1);
assert.equal(resolvePaletteIndex(3, -1, 'next'), 0);
assert.equal(resolvePaletteIndex(3, 0, 'previous'), 2);
assert.equal(resolvePaletteIndex(3, 2, 'next'), 0);
assert.equal(resolvePaletteIndex(3, 1, 'first'), 0);
assert.equal(resolvePaletteIndex(3, 1, 'last'), 2);
