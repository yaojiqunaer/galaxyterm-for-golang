import assert from 'node:assert/strict';
import {
  buildRemoteFileBreadcrumbs,
  buildRemoteFileSummary,
  buildTunnelDisplay,
  buildTunnelSummary,
} from './remoteWorkspace.js';

const files = [
  { name: 'config', path: '/etc/config', isDir: true },
  { name: 'app.conf', path: '/etc/app.conf', isDir: false, size: 1200 },
  { name: 'large.log', path: '/var/log/large.log', isDir: false, size: 1024 * 1024 * 3 },
];

assert.deepEqual(buildRemoteFileSummary(files, { path: '/etc/nginx', loading: false }), {
  path: '/etc/nginx',
  total: 3,
  directories: 1,
  files: 2,
  totalBytes: 3146928,
  readableSize: '3 MB',
  state: 'ready',
});

assert.equal(buildRemoteFileSummary([], { path: '.', loading: true }).state, 'loading');
assert.equal(buildRemoteFileSummary([], { path: '.', loading: false }).state, 'empty');

assert.deepEqual(buildRemoteFileBreadcrumbs('/etc/nginx/sites-enabled'), [
  { key: '/', label: '/', path: '/' },
  { key: '/etc', label: 'etc', path: '/etc' },
  { key: '/etc/nginx', label: 'nginx', path: '/etc/nginx' },
  { key: '/etc/nginx/sites-enabled', label: 'sites-enabled', path: '/etc/nginx/sites-enabled' },
]);

assert.deepEqual(buildRemoteFileBreadcrumbs('var/log'), [
  { key: '.', label: '.', path: '.' },
  { key: 'var', label: 'var', path: 'var' },
  { key: 'var/log', label: 'log', path: 'var/log' },
]);

const tunnels = [
  {
    id: 'a',
    name: 'Redis Dev',
    localAddr: '127.0.0.1:6379',
    remoteAddr: '10.0.0.5:6379',
    sshAddr: 'bastion.dev:22',
  },
  {
    id: 'b',
    name: '',
    localAddr: '127.0.0.1:3307',
    remoteAddr: 'db.prod:3306',
    sshAddr: 'prod-gw:2222',
  },
];

assert.deepEqual(buildTunnelSummary(tunnels), {
  total: 2,
  localPorts: ['6379', '3307'],
  remoteHosts: ['10.0.0.5', 'db.prod'],
  sshHosts: ['bastion.dev', 'prod-gw'],
});

assert.deepEqual(buildTunnelDisplay(tunnels[1]), {
  id: 'b',
  name: '127.0.0.1:3307',
  route: '127.0.0.1:3307 -> db.prod:3306',
  via: 'prod-gw:2222',
  localHost: '127.0.0.1',
  localPort: '3307',
  remoteHost: 'db.prod',
  remotePort: '3306',
  sshHost: 'prod-gw',
});
