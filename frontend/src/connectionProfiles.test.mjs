import assert from 'node:assert/strict';
import {
  buildConnectionProfilesExport,
  hasStoredSshCredential,
  normalizeImportedConnectionProfile,
  normalizeStoredConnectionProfile,
  shouldClearStoredSshCredential,
} from './connectionProfiles.js';

assert.equal(hasStoredSshCredential({ id: 'profile-1' }), false);
assert.equal(hasStoredSshCredential({ id: 'profile-1', hasJumpPassword: true }), true);

assert.equal(shouldClearStoredSshCredential({
  authType: 'agent',
  editingProfileId: 'profile-1',
  rememberCredential: true,
}), false);
assert.equal(shouldClearStoredSshCredential({
  authType: 'password',
  editingProfileId: 'profile-1',
  rememberCredential: false,
}), true);
assert.equal(shouldClearStoredSshCredential({
  authType: 'privateKey',
  editingProfileId: 'profile-1',
  rememberCredential: true,
}), false);
assert.equal(shouldClearStoredSshCredential({
  authType: 'agent',
  editingProfileId: '',
  rememberCredential: true,
}), false);

const storedFileProfile = {
  id: 's3-production',
  kind: 'file',
  providerType: 's3',
  displayName: 'Production assets',
  group: 'Production',
  filePath: '/releases',
  config: { endpoint: 'https://s3.example.com', bucket: 'assets' },
  auth: {
    accessKey: 'must-not-persist',
    secretKey: 'must-not-persist',
    credentialRef: {
      id: 's3-production',
      providerType: 's3',
      fields: ['accessKey', 'secretKey'],
    },
  },
};

assert.deepEqual(normalizeStoredConnectionProfile(storedFileProfile), {
  id: 's3-production',
  kind: 'file',
  providerType: 's3',
  displayName: 'Production assets',
  group: 'Production',
  filePath: '/releases',
  config: { endpoint: 'https://s3.example.com', bucket: 'assets' },
  favorite: false,
  lastUsedAt: '',
  auth: {
    credentialRef: {
      id: 's3-production',
      providerType: 's3',
      fields: ['accessKey', 'secretKey'],
    },
  },
});

assert.deepEqual(normalizeImportedConnectionProfile(storedFileProfile).auth, {
  credentialRef: null,
});

const extensionTerminalProfile = normalizeStoredConnectionProfile({
  id: 'redis-production',
  providerType: 'redis',
  displayName: 'Production Redis',
  config: { host: 'cache.internal', port: 6379 },
  auth: {
    password: 'must-not-persist',
    credentialRef: { id: 'redis-production', providerType: 'redis', fields: ['password'] },
  },
});
assert.deepEqual(extensionTerminalProfile.auth, {
  credentialRef: { id: 'redis-production', providerType: 'redis', fields: ['password'] },
});

const sshProfile = {
  id: 'ssh-production',
  providerType: 'ssh',
  displayName: 'Production SSH',
  config: { host: 'prod.example.com', port: 22 },
  auth: {
    username: 'deploy',
    password: 'must-not-persist',
    credentialRef: { id: 'ssh-production', hasPassword: true },
  },
};
const normalizedLegacySSH = normalizeStoredConnectionProfile(sshProfile);
assert.equal(normalizedLegacySSH.kind, 'terminal');
assert.equal(normalizedLegacySSH.auth.username, 'deploy');
assert.equal(normalizedLegacySSH.auth.password, undefined);
assert.deepEqual(normalizedLegacySSH.auth.credentialRef, { id: 'ssh-production', hasPassword: true });
const exported = buildConnectionProfilesExport([sshProfile, storedFileProfile], '2026-07-18T10:00:00.000Z');
assert.equal(exported.secrets, 'omitted');
assert.equal(exported.exportedAt, '2026-07-18T10:00:00.000Z');
assert.equal(exported.profiles[0].auth.credentialRef, null);
assert.equal(exported.profiles[1].auth.credentialRef, null);
assert.equal(JSON.stringify(exported).includes('must-not-persist'), false);

console.log('connection profile tests passed');
