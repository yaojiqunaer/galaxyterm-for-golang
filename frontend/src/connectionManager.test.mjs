import assert from 'node:assert/strict';
import {
  buildConnectionGroupNav,
  buildConnectionGroups,
  buildConnectionEmptyState,
  buildConnectionProfileBadges,
  buildConnectionProfileFacts,
  buildConnectionProfileHints,
  buildConnectionProfileSubtitle,
  filterConnectionProfiles,
  filterRecentConnectionsByProviders,
  isProfileProviderAvailable,
  resolveSelectedProfileId,
  selectBatchProfiles,
  summarizeProfileSessions,
  sortConnectionProfiles,
  sortSidebarProfiles,
} from './connectionManager.js';

const profiles = [
  {
    id: 'prod-db',
    displayName: 'Prod DB',
    favorite: true,
    group: 'Production',
    lastUsedAt: '2026-06-25T10:00:00.000Z',
    providerType: 'ssh',
    config: { host: '10.0.0.10', port: 22 },
    auth: { credentialRef: { id: 'prod-db' } },
  },
  {
    id: 'prod-web',
    displayName: 'Prod Web',
    favorite: false,
    group: 'Production',
    lastUsedAt: '2026-06-26T10:00:00.000Z',
    providerType: 'ssh',
    config: { host: '10.0.0.20', port: 22 },
    auth: { username: 'deploy' },
  },
  {
    id: 'dev-shell',
    displayName: 'Dev Shell',
    favorite: true,
    group: '',
    providerType: 'local',
    config: { shell: '/bin/zsh', workingDirectory: '/Users/me/dev' },
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
  { credentialCount: 1, favoriteCount: 2, key: 'all', total: 3, type: 'all' },
  { credentialCount: 1, favoriteCount: 2, key: 'favorites', total: 2, type: 'favorites' },
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
assert.deepEqual(
  selectBatchProfiles(profiles, {
    availableProviders: [{ type: 'ssh' }],
    favoritesOnly: true,
  }).map((profile) => profile.id),
  ['prod-db'],
);

assert.deepEqual(
  filterConnectionProfiles(profiles, { query: 'prod deploy' }).map((profile) => profile.id),
  ['prod-web'],
);
assert.deepEqual(
  filterConnectionProfiles(profiles, { group: 'favorites', query: 'ssh' }).map((profile) => profile.id),
  ['prod-db'],
);
assert.deepEqual(
  filterConnectionProfiles(profiles, { providerType: 'local', query: 'zsh' }).map((profile) => profile.id),
  ['dev-shell'],
);
assert.deepEqual(
  filterConnectionProfiles(profiles, { providerType: 'local', query: 'Users/me/dev' }).map((profile) => profile.id),
  ['dev-shell'],
);
assert.deepEqual(
  filterConnectionProfiles(profiles, { query: 'prod missing' }).map((profile) => profile.id),
  [],
);

assert.deepEqual(buildConnectionEmptyState({
  profileCount: 0,
  visibleCount: 0,
  hasFilters: false,
}), {
  kind: 'empty',
  titleKey: 'connection.empty.noProfiles.title',
  descriptionKey: 'connection.empty.noProfiles.description',
  primaryAction: 'quickSsh',
  secondaryActions: ['importSshConfig', 'newConnection'],
});

assert.deepEqual(buildConnectionEmptyState({
  profileCount: 3,
  visibleCount: 0,
  hasFilters: true,
}), {
  kind: 'filtered',
  titleKey: 'connection.empty.filtered.title',
  descriptionKey: 'connection.empty.filtered.description',
  primaryAction: 'clearFilters',
  secondaryActions: ['quickSsh', 'importSshConfig'],
});

assert.equal(buildConnectionEmptyState({
  profileCount: 3,
  visibleCount: 2,
  hasFilters: true,
}), null);

assert.deepEqual(sortConnectionProfiles(profiles, 'name').map((profile) => profile.id), ['dev-shell', 'prod-db', 'prod-web']);
assert.deepEqual(sortConnectionProfiles(profiles, 'provider').map((profile) => profile.id), ['dev-shell', 'prod-db', 'prod-web']);
assert.deepEqual(sortConnectionProfiles(profiles, 'group').map((profile) => profile.id), ['prod-db', 'prod-web', 'dev-shell']);
assert.deepEqual(sortConnectionProfiles(profiles, 'recent').map((profile) => profile.id), ['prod-web', 'prod-db', 'dev-shell']);
assert.deepEqual(sortSidebarProfiles(profiles).map((profile) => profile.id), ['prod-db', 'dev-shell', 'prod-web']);
assert.deepEqual(sortSidebarProfiles(profiles, 2).map((profile) => profile.id), ['prod-db', 'dev-shell']);
assert.deepEqual(
  sortSidebarProfiles(profiles, 5, { availableProviders: [{ type: 'ssh' }] }).map((profile) => profile.id),
  ['prod-db', 'prod-web'],
);

assert.deepEqual(buildConnectionProfileBadges(profiles[0], { activeCount: 2 }), [
  { key: 'group', tone: 'default', value: 'Production' },
  { key: 'sessions', tone: 'success', value: 2 },
  { key: 'favorite', tone: 'warning', value: true },
  { key: 'credential', tone: 'info', value: true },
]);
assert.deepEqual(buildConnectionProfileBadges(profiles[1], { activeCount: 0 }), [
  { key: 'group', tone: 'default', value: 'Production' },
]);
assert.deepEqual(buildConnectionProfileBadges(profiles[2], { activeCount: 1 }), [
  { key: 'group', tone: 'default', value: '__ungrouped__' },
  { key: 'sessions', tone: 'success', value: 1 },
  { key: 'favorite', tone: 'warning', value: true },
]);
assert.deepEqual(buildConnectionProfileBadges(profiles[2], { activeCount: 0 }, { providerAvailable: false }), [
  { key: 'group', tone: 'default', value: '__ungrouped__' },
  { key: 'favorite', tone: 'warning', value: true },
  { key: 'providerUnavailable', tone: 'warning', value: true },
]);

assert.equal(isProfileProviderAvailable(profiles[0], [{ type: 'ssh' }, { type: 'local' }]), true);
assert.equal(isProfileProviderAvailable(profiles[0], [{ type: 'local' }]), false);

assert.deepEqual(filterRecentConnectionsByProviders([
  { id: 'recent-ssh', providerType: 'ssh' },
  { id: 'recent-mysql', providerType: 'mysql' },
  { id: 'recent-request-redis', request: { providerType: 'redis' } },
], [{ type: 'ssh' }, { type: 'redis' }]).map((item) => item.id), ['recent-ssh', 'recent-request-redis']);

assert.deepEqual(buildConnectionProfileFacts(profiles[0]), [
  { key: 'host', value: '10.0.0.10' },
  { key: 'port', value: 22 },
  { key: 'username', value: '-' },
  { key: 'lastUsed', value: '2026-06-25T10:00:00.000Z' },
]);
assert.deepEqual(buildConnectionProfileFacts({
  ...profiles[1],
  config: { ...profiles[1].config, jumpHost: 'jump.example.com' },
}), [
  { key: 'host', value: '10.0.0.20' },
  { key: 'port', value: 22 },
  { key: 'username', value: 'deploy' },
  { key: 'lastUsed', value: '2026-06-26T10:00:00.000Z' },
  { key: 'jumpHost', value: 'jump.example.com' },
]);
assert.deepEqual(buildConnectionProfileFacts(profiles[2]), [
  { key: 'shell', value: '/bin/zsh' },
  { key: 'workingDirectory', value: '/Users/me/dev' },
  { key: 'lastUsed', value: '' },
]);
assert.equal(buildConnectionProfileSubtitle(profiles[0]), '10.0.0.10:22');
assert.equal(buildConnectionProfileSubtitle(profiles[1]), 'deploy@10.0.0.20:22');
assert.equal(buildConnectionProfileSubtitle(profiles[2]), '/bin/zsh');
assert.deepEqual(buildConnectionProfileHints({ activeCount: 0 }), ['enterOpen', 'doubleClickOpen']);
assert.deepEqual(buildConnectionProfileHints({ activeCount: 2 }), ['focusOpenSession', 'enterOpen', 'doubleClickOpen']);

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
