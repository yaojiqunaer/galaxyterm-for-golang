import assert from 'node:assert/strict';
import {
  buildRemoteFileBreadcrumbs,
  buildRemoteFileSummary,
  buildSavedSshConnections,
  buildSshConnectionAuth,
  buildSshProfileFields,
  buildTunnelDisplay,
  buildTunnelSummary,
} from './remoteWorkspace.js';

const savedConnections = buildSavedSshConnections([
  {
    id: 'local',
    providerType: 'local',
    displayName: 'Local',
  },
  {
    id: 'recent',
    providerType: 'ssh',
    displayName: 'Recent SSH',
    group: 'Development',
    lastUsedAt: '2026-07-12T12:00:00Z',
    config: { host: 'dev.example.com', port: 22 },
    auth: { username: 'dev', authType: 'password', password: 'must-not-leak' },
  },
  {
    id: 'favorite',
    providerType: 'ssh',
    displayName: 'Production',
    group: 'Operations',
    favorite: true,
    config: { host: 'prod.example.com', port: 2222 },
    auth: {
      username: 'root',
      authType: 'privateKey',
      privateKey: 'must-not-leak',
      credentialRef: { id: 'favorite', hasPrivateKey: true, hasPassphrase: true },
    },
  },
]);

assert.deepEqual(savedConnections, [
  {
    authType: 'privateKey',
    credentialSaved: true,
    description: 'root@prod.example.com:2222',
    displayName: 'Production',
    favorite: true,
    group: 'Operations',
    hasSavedSecret: true,
    id: 'favorite',
  },
  {
    authType: 'password',
    credentialSaved: false,
    description: 'dev@dev.example.com:22',
    displayName: 'Recent SSH',
    favorite: false,
    group: 'Development',
    hasSavedSecret: false,
    id: 'recent',
  },
]);
assert.equal(JSON.stringify(savedConnections).includes('must-not-leak'), false);

assert.deepEqual(buildSshProfileFields({
  id: 'favorite',
  displayName: 'Production',
  providerType: 'ssh',
  config: { host: 'prod.example.com', port: 2222 },
  auth: { username: 'root', authType: 'privateKey', privateKey: 'must-not-leak' },
}), {
  authType: 'privateKey',
  displayName: 'Production',
  host: 'prod.example.com',
  port: 2222,
  profileId: 'favorite',
  username: 'root',
});
assert.equal(buildSshProfileFields({ providerType: 'local' }), null);

assert.deepEqual(buildSshConnectionAuth({
  authType: 'password',
  password: '',
}, {
  auth: {
    authType: 'password',
    password: 'saved-password',
    privateKey: 'saved-key-that-must-not-win',
  },
}), {
  authType: 'password',
  passphrase: '',
  password: 'saved-password',
  privateKey: '',
});

assert.deepEqual(buildSshConnectionAuth({
  authType: 'privateKey',
  passphrase: 'one-time-passphrase',
  privateKey: '',
}, {
  auth: {
    authType: 'privateKey',
    passphrase: 'saved-passphrase',
    privateKey: 'saved-private-key',
  },
}), {
  authType: 'privateKey',
  passphrase: 'one-time-passphrase',
  password: '',
  privateKey: 'saved-private-key',
});

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
