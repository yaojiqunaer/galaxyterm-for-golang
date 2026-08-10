import assert from 'node:assert/strict';
import {
  buildTunnelPreset,
  duplicateTunnelPreset,
  filterTunnelPresets,
  loadTunnelPresets,
  persistTunnelPresets,
  removeTunnelPreset,
  resolveTunnelPreset,
  upsertTunnelPreset,
} from './tunnelPresets.js';

const fixedNow = () => '2026-08-10T10:00:00.000Z';
const preset = buildTunnelPreset({
  name: ' Production database ',
  profileId: ' ssh-production ',
  localHost: ' 127.0.0.1 ',
  localPort: 3307,
  remoteHost: ' db.internal ',
  remotePort: 3306,
  sshPassword: 'must-not-persist',
  sshPrivateKey: 'must-not-persist',
}, { idFactory: () => 'preset-1', now: fixedNow });

assert.deepEqual(preset, {
  id: 'preset-1',
  name: 'Production database',
  profileId: 'ssh-production',
  localHost: '127.0.0.1',
  localPort: 3307,
  remoteHost: 'db.internal',
  remotePort: 3306,
  createdAt: '2026-08-10T10:00:00.000Z',
  updatedAt: '2026-08-10T10:00:00.000Z',
});
assert.equal(JSON.stringify(preset).includes('must-not-persist'), false);
assert.equal(buildTunnelPreset({ profileId: 'ssh-production', localPort: 3307 }), null);

const updated = buildTunnelPreset({
  ...preset,
  name: 'Production MySQL',
  remotePort: 33060,
}, {
  existing: preset,
  now: () => '2026-08-10T11:00:00.000Z',
});
assert.equal(updated.id, 'preset-1');
assert.equal(updated.createdAt, preset.createdAt);
assert.equal(updated.updatedAt, '2026-08-10T11:00:00.000Z');
assert.equal(updated.remotePort, 33060);

const copied = duplicateTunnelPreset(updated, {
  idFactory: () => 'preset-2',
  name: 'Production MySQL copy',
  now: () => '2026-08-10T12:00:00.000Z',
});
assert.equal(copied.id, 'preset-2');
assert.equal(copied.name, 'Production MySQL copy');
assert.equal(copied.createdAt, '2026-08-10T12:00:00.000Z');

assert.deepEqual(upsertTunnelPreset([preset], updated), [updated]);
assert.equal(JSON.stringify(upsertTunnelPreset([preset, {
  ...copied,
  sshPassword: 'must-not-survive-update',
}], updated)).includes('must-not-survive-update'), false);
assert.deepEqual(upsertTunnelPreset([updated], copied), [updated, copied]);
assert.deepEqual(removeTunnelPreset([updated, copied], updated.id), [copied]);

const profiles = [{
  id: 'ssh-production',
  providerType: 'ssh',
  displayName: 'Production gateway',
  config: { host: 'gateway.internal', port: 22 },
  auth: { authType: 'password', credentialRef: { hasPassword: true } },
}];
assert.deepEqual(resolveTunnelPreset(updated, profiles, [{
  id: 'runtime-1',
  presetId: updated.id,
  status: 'active',
}]), {
  available: true,
  credentialReady: true,
  profileName: 'Production gateway',
  running: true,
  runtimeId: 'runtime-1',
});
assert.deepEqual(resolveTunnelPreset(copied, [], []), {
  available: false,
  credentialReady: false,
  profileName: '',
  running: false,
  runtimeId: '',
});
assert.equal(resolveTunnelPreset(updated, [{
  ...profiles[0],
  auth: { authType: 'privateKey', credentialRef: null },
}], []).credentialReady, false);
assert.equal(resolveTunnelPreset(updated, [{
  ...profiles[0],
  auth: { authType: 'agent', credentialRef: null },
}], []).credentialReady, true);
assert.deepEqual(filterTunnelPresets([updated, copied], 'gateway 33060', profiles), [updated, copied]);
assert.deepEqual(filterTunnelPresets([updated, copied], 'missing', profiles), []);

const values = new Map();
const storage = {
  getItem: (key) => values.get(key) || null,
  setItem: (key, value) => values.set(key, value),
};
const persisted = persistTunnelPresets([updated, copied], storage);
assert.equal(persisted.persisted, true);
assert.deepEqual(loadTunnelPresets(storage), [updated, copied]);
assert.equal(values.get('galaxyterm.tunnelPresets.v1').includes('must-not-persist'), false);

values.set('galaxyterm.tunnelPresets.v1', '{invalid');
assert.deepEqual(loadTunnelPresets(storage), []);
assert.equal(persistTunnelPresets([updated], { setItem: () => { throw new Error('full'); } }).persisted, false);
assert.equal(persistTunnelPresets([updated], {}).persisted, false);

console.log('tunnel preset tests passed');
