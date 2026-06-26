import assert from 'node:assert/strict';
import {
  buildConnectionGroupNav,
  buildConnectionGroups,
  resolveSelectedProfileId,
  selectBatchProfiles,
  summarizeProfileSessions,
  sortConnectionProfiles,
} from './connectionManager.js';

const profiles = [
  {
    id: 'prod-db',
    displayName: 'Prod DB',
    favorite: true,
    group: 'Production',
    lastUsedAt: '2026-06-25T10:00:00.000Z',
    providerType: 'ssh',
    auth: { credentialRef: { id: 'prod-db' } },
  },
  {
    id: 'prod-web',
    displayName: 'Prod Web',
    favorite: false,
    group: 'Production',
    lastUsedAt: '2026-06-26T10:00:00.000Z',
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
  selectBatchProfiles(profiles, { group: 'Production', providerType: 'ssh', sortBy: 'recent' }).map((profile) => profile.id),
  ['prod-web', 'prod-db'],
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
assert.deepEqual(sortConnectionProfiles(profiles, 'recent').map((profile) => profile.id), ['prod-web', 'prod-db', 'dev-shell']);

const profileSessions = summarizeProfileSessions(profiles, [
  { id: 's1', status: 'connected', request: { profileId: 'prod-db' } },
  { id: 's2', status: 'connecting', request: { profileId: 'prod-db' } },
  { id: 's3', status: 'closed', request: { profileId: 'prod-db' } },
  { id: 's4', status: 'connected', request: { profileId: 'prod-web' } },
  { id: 's5', status: 'connected', request: { profileId: 'missing' } },
]);
assert.deepEqual(profileSessions.get('prod-db'), { activeCount: 2, focusSessionId: 's1' });
assert.deepEqual(profileSessions.get('prod-web'), { activeCount: 1, focusSessionId: 's4' });
assert.deepEqual(profileSessions.get('dev-shell'), { activeCount: 0, focusSessionId: '' });

assert.equal(resolveSelectedProfileId(profiles, 'prod-web'), 'prod-web');
assert.equal(resolveSelectedProfileId(profiles.filter((profile) => profile.id !== 'prod-web'), 'prod-web'), 'prod-db');
assert.equal(resolveSelectedProfileId([], 'prod-web'), '');
