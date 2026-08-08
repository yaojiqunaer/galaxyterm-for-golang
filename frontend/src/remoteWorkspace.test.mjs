import assert from 'node:assert/strict';
import {
  buildFileConnectionFormValues,
  buildFileConnectionProfile,
  buildFileConnectionRequest,
  buildFileProviderAuthValues,
  buildFileProviderConfigValues,
  buildRemoteFileActions,
  buildRemoteFileBreadcrumbs,
  buildRemoteFileView,
  buildRemoteRenameDestination,
  buildRemoteFileSummary,
  createFileTransferID,
  updateFileTransferProgress,
  buildSavedSshConnections,
  buildSshConnectionAuth,
  buildSshProfileFields,
  buildSshSecurityConfig,
  buildTunnelDisplay,
  buildTunnelSummary,
} from './remoteWorkspace.js';

const s3Provider = {
  type: 's3',
  configFields: [
    { key: 'endpoint', type: 'string', default: 'https://s3.amazonaws.com' },
    { key: 'bucket', type: 'string' },
  ],
  authFields: [
    { key: 'accessKey', type: 'string' },
    { key: 'secretKey', type: 'password' },
  ],
};
const s3CredentialRef = {
  id: 's3-production',
  providerType: 's3',
  fields: ['accessKey', 'secretKey'],
};
const s3Profile = buildFileConnectionProfile(s3Provider, {
  displayName: 'Production assets',
  group: 'Production',
  path: '/releases',
  config: { endpoint: 'https://objects.example.com', bucket: 'assets' },
  auth: { accessKey: 'AKIAEXAMPLE', secretKey: 'secret', ignored: 'value' },
}, { id: 's3-production', credentialRef: s3CredentialRef });
assert.deepEqual(s3Profile, {
  id: 's3-production',
  kind: 'file',
  providerType: 's3',
  displayName: 'Production assets',
  group: 'Production',
  filePath: '/releases',
  config: { endpoint: 'https://objects.example.com', bucket: 'assets' },
  favorite: false,
  lastUsedAt: '',
  auth: { credentialRef: s3CredentialRef },
});
assert.deepEqual(buildFileProviderAuthValues(s3Provider, {
  accessKey: 'AKIAEXAMPLE',
  secretKey: 'secret',
  ignored: 'value',
}), {
  accessKey: 'AKIAEXAMPLE',
  secretKey: 'secret',
});
assert.deepEqual(buildFileProviderConfigValues(s3Provider, {
  endpoint: 'https://objects.example.com',
  bucket: 'assets',
  staleFtpHost: 'must-not-cross-provider-boundaries',
}), {
  endpoint: 'https://objects.example.com',
  bucket: 'assets',
});
assert.deepEqual(buildFileConnectionFormValues(s3Provider, s3Profile), {
  displayName: 'Production assets',
  group: 'Production',
  path: '/releases',
  config: { endpoint: 'https://objects.example.com', bucket: 'assets' },
  auth: {},
  rememberCredential: true,
});
assert.deepEqual(buildFileConnectionRequest(s3Profile, {
  accessKey: 'AKIAEXAMPLE',
  secretKey: 'secret',
}), {
  providerType: 's3',
  path: '/releases',
  config: { endpoint: 'https://objects.example.com', bucket: 'assets' },
  auth: { accessKey: 'AKIAEXAMPLE', secretKey: 'secret' },
});

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
  config: {
    host: 'prod.example.com',
    hostKeyPolicy: 'strict',
    knownHostsPath: '/Users/me/.ssh/known_hosts',
    port: 2222,
  },
  auth: { username: 'root', authType: 'privateKey', privateKey: 'must-not-leak' },
}), {
  authType: 'privateKey',
  displayName: 'Production',
  host: 'prod.example.com',
  hostKeyPolicy: 'strict',
  knownHostsPath: '/Users/me/.ssh/known_hosts',
  port: 2222,
  profileId: 'favorite',
  username: 'root',
});
assert.equal(buildSshProfileFields({ providerType: 'local' }), null);

assert.deepEqual(buildSshSecurityConfig({}, null), {
  hostKeyPolicy: 'accept-new',
  knownHostsPath: '',
});
assert.deepEqual(buildSshSecurityConfig({}, {
  config: { hostKeyPolicy: 'strict', knownHostsPath: '/shared/known_hosts' },
}), {
  hostKeyPolicy: 'strict',
  knownHostsPath: '/shared/known_hosts',
});
assert.deepEqual(buildSshSecurityConfig({
  hostKeyPolicy: 'accept-new',
  knownHostsPath: '/one-time/known_hosts',
}, {
  config: { hostKeyPolicy: 'strict', knownHostsPath: '/shared/known_hosts' },
}), {
  hostKeyPolicy: 'accept-new',
  knownHostsPath: '/one-time/known_hosts',
});

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

const transferID = createFileTransferID(() => 'native-id');
assert.equal(transferID, 'native-id');
assert.deepEqual(updateFileTransferProgress({
  id: transferID,
  bytes: 0,
  total: 0,
}, {
  transferId: transferID,
  bytes: 256,
  total: 1024,
}), {
  id: transferID,
  bytes: 256,
  total: 1024,
  percent: 25,
});
assert.deepEqual(updateFileTransferProgress({ id: transferID, bytes: 256, total: 1024 }, {
  transferId: 'another-transfer',
  bytes: 1024,
  total: 1024,
}), { id: transferID, bytes: 256, total: 1024 });
assert.equal(updateFileTransferProgress(null, { transferId: transferID }), null);

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

assert.deepEqual(buildRemoteFileActions({ isDir: true }, ['list', 'rename', 'delete']), [
  { key: 'open', labelKey: 'action.open' },
  { key: 'rename', labelKey: 'action.rename' },
  { danger: true, key: 'delete', labelKey: 'action.delete' },
]);
assert.deepEqual(buildRemoteFileActions({ isDir: false }, ['read', 'write', 'download', 'rename', 'delete']), [
  { key: 'edit', labelKey: 'action.edit' },
  { key: 'download', labelKey: 'action.download' },
  { key: 'rename', labelKey: 'action.rename' },
  { danger: true, key: 'delete', labelKey: 'action.delete' },
]);
assert.deepEqual(buildRemoteFileActions({ isDir: false }, ['read']), [
  { key: 'view', labelKey: 'action.view' },
]);
assert.deepEqual(buildRemoteFileActions({ isDir: false }, ['download']), [
  { key: 'download', labelKey: 'action.download' },
]);
assert.deepEqual(buildRemoteFileActions({ isDir: false }, []), []);

assert.equal(buildRemoteRenameDestination('/etc/nginx.conf', ' nginx.prod.conf '), '/etc/nginx.prod.conf');
assert.equal(buildRemoteRenameDestination('nginx.conf', 'nginx.prod.conf'), 'nginx.prod.conf');
assert.equal(buildRemoteRenameDestination('/etc/nginx.conf', '../secret'), '');
assert.equal(buildRemoteRenameDestination('/etc/nginx.conf', 'nested/name'), '');
assert.equal(buildRemoteRenameDestination('/etc/nginx.conf', ''), '');

const remoteFileViewEntries = [
  { name: 'logs-10', path: '/srv/logs-10', isDir: true, modTime: '2026-07-15T08:00:00Z' },
  { name: 'logs-2', path: '/srv/logs-2', isDir: true, modTime: '2026-07-16T08:00:00Z' },
  { name: 'app.log', path: '/srv/app.log', isDir: false, size: 200, modTime: '2026-07-17T08:00:00Z' },
  { name: 'README', path: '/srv/README', isDir: false, size: 100, modTime: '2026-07-14T08:00:00Z' },
];
assert.deepEqual(buildRemoteFileView(remoteFileViewEntries, { sortBy: 'name' }), {
  entries: [remoteFileViewEntries[1], remoteFileViewEntries[0], remoteFileViewEntries[2], remoteFileViewEntries[3]],
  filtered: false,
  total: 4,
  visible: 4,
});
assert.deepEqual(buildRemoteFileView(remoteFileViewEntries, { query: 'APP', sortBy: 'size' }), {
  entries: [remoteFileViewEntries[2]],
  filtered: true,
  total: 4,
  visible: 1,
});
assert.deepEqual(
  buildRemoteFileView(remoteFileViewEntries, { sortBy: 'modified' }).entries,
  [remoteFileViewEntries[1], remoteFileViewEntries[0], remoteFileViewEntries[2], remoteFileViewEntries[3]],
);
assert.deepEqual(buildRemoteFileView(remoteFileViewEntries, { query: 'missing' }), {
  entries: [],
  filtered: true,
  total: 4,
  visible: 0,
});

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
