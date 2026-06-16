import assert from 'node:assert/strict';
import {
  buildExtensionCatalog,
  filterAuditRecords,
  summarizeWorkspace,
} from './workspaceInsights.js';

const summary = summarizeWorkspace({
  auditRecords: [{ id: 'a1' }, { id: 'a2' }],
  installedExtensions: [{ id: 'ext-k8s' }],
  profiles: [
    { id: 'p1', favorite: true },
    { id: 'p2', favorite: false },
  ],
  providers: [
    { type: 'local', category: 'builtin' },
    { type: 'ssh', category: 'builtin' },
    { type: 'mysql', category: 'extension' },
  ],
  recentConnections: [{ id: 'r1' }],
  sessions: [
    { id: 's1', status: 'connected' },
    { id: 's2', status: 'connecting' },
    { id: 's3', status: 'closed' },
  ],
  tunnels: [{ id: 't1' }],
});

assert.deepEqual(summary.sessions, {
  active: 2,
  closed: 1,
  connected: 1,
  connecting: 1,
  total: 3,
});
assert.equal(summary.profiles.total, 2);
assert.equal(summary.profiles.favorites, 1);
assert.equal(summary.providers.builtin, 2);
assert.equal(summary.providers.extensions, 1);
assert.equal(summary.auditRecords, 2);
assert.equal(summary.installedExtensions, 1);
assert.equal(summary.recentConnections, 1);
assert.equal(summary.tunnels, 1);

const auditRecords = [
  {
    id: 'ssh-prod',
    providerType: 'ssh',
    title: 'Prod SSH',
    auditEvents: [{ type: 'quick-command.run', detail: 'systemctl status nginx' }],
  },
  {
    id: 'mysql-dev',
    providerType: 'mysql',
    title: 'Dev Database',
    auditEvents: [{ type: 'session.open', detail: 'opened' }],
  },
];

assert.deepEqual(filterAuditRecords(auditRecords, { providerType: 'all', query: 'nginx' }).map((item) => item.id), ['ssh-prod']);
assert.deepEqual(filterAuditRecords(auditRecords, { providerType: 'mysql', query: '' }).map((item) => item.id), ['mysql-dev']);
assert.deepEqual(filterAuditRecords(auditRecords, { providerType: 'ssh', query: 'database' }), []);

const catalog = buildExtensionCatalog({
  installedExtensions: [
    { id: 'galaxyterm-kubernetes', name: 'Kubernetes', providers: [{ type: 'kubernetes' }] },
  ],
  officialExtensions: [
    { type: 'kubernetes', nameKey: 'extension.kubernetes' },
    { type: 'redis', nameKey: 'extension.redis' },
  ],
  providers: [
    { type: 'local', name: 'Local', category: 'builtin' },
    { type: 'ssh', name: 'SSH', category: 'builtin' },
  ],
});

assert.deepEqual(catalog.map((item) => `${item.type}:${item.status}`), [
  'local:builtin',
  'ssh:builtin',
  'kubernetes:installed',
  'redis:planned',
]);
