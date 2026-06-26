import assert from 'node:assert/strict';
import {
  buildConnectionGroupNav,
  buildConnectionGroups,
  resolveSelectedProfileId,
  selectBatchProfiles,
  sortConnectionProfiles,
} from './connectionManager.js';

const profiles = [
  {
    id: 'prod-db',
    displayName: 'Prod DB',
    favorite: true,
    group: 'Production',
    providerType: 'ssh',
    auth: { credentialRef: { id: 'prod-db' } },
  },
  {
    id: 'prod-web',
    displayName: 'Prod Web',
    favorite: false,
    group: 'Production',
    providerType: 'ssh',
    auth: {},
  },
  {
    id: 'dev-shell',
    displayName: 'Dev Shell',
    favorite: true,
    group: '',
    providerType: 'local',
    auth: {},
  },
];

const groups = buildConnectionGroups(profiles);
assert.deepEqual(groups.map((group) => ({
  credentialCount: group.credentialCount,
  favoriteCount: group.favoriteCount,
  key: group.key,
  total: group.total,
})), [
  { credentialCount: 1, favoriteCount: 1, key: 'Production', total: 2 },
  { credentialCount: 0, favoriteCount: 1, key: '__ungrouped__', total: 1 },
]);
assert.deepEqual(groups[0].profiles.map((profile) => profile.id), ['prod-db', 'prod-web']);

assert.deepEqual(buildConnectionGroupNav(profiles), [
  { key: 'all', total: 3, type: 'all' },
  { key: 'favorites', total: 2, type: 'favorites' },
  { credentialCount: 1, favoriteCount: 1, key: 'Production', total: 2, type: 'group' },
  { credentialCount: 0, favoriteCount: 1, key: '__ungrouped__', total: 1, type: 'group' },
]);

assert.deepEqual(
  selectBatchProfiles(profiles, { favoritesOnly: true }).map((profile) => profile.id),
  ['dev-shell', 'prod-db'],
);
assert.deepEqual(
  selectBatchProfiles(profiles, { group: 'Production', providerType: 'ssh' }).map((profile) => profile.id),
  ['prod-db', 'prod-web'],
);
assert.deepEqual(
  selectBatchProfiles(profiles, { group: '__ungrouped__' }).map((profile) => profile.id),
  ['dev-shell'],
);
assert.deepEqual(
  selectBatchProfiles(profiles, { favoritesOnly: true, providerType: 'ssh' }).map((profile) => profile.id),
  ['prod-db'],
);

assert.deepEqual(sortConnectionProfiles(profiles, 'name').map((profile) => profile.id), ['dev-shell', 'prod-db', 'prod-web']);
assert.deepEqual(sortConnectionProfiles(profiles, 'provider').map((profile) => profile.id), ['dev-shell', 'prod-db', 'prod-web']);
assert.deepEqual(sortConnectionProfiles(profiles, 'group').map((profile) => profile.id), ['prod-db', 'prod-web', 'dev-shell']);

assert.equal(resolveSelectedProfileId(profiles, 'prod-web'), 'prod-web');
assert.equal(resolveSelectedProfileId(profiles.filter((profile) => profile.id !== 'prod-web'), 'prod-web'), 'prod-db');
assert.equal(resolveSelectedProfileId([], 'prod-web'), '');
