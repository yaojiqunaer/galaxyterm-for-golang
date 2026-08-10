import assert from 'node:assert/strict';
import {
  buildConnectionLaunchKey,
  buildConnectionGroupNav,
  buildConnectionGroups,
  buildConnectionEmptyState,
  buildConnectionProfileBadges,
  buildConnectionProfileFacts,
  buildConnectionProfileHints,
  buildConnectionProfileLaunchModel,
  buildConnectionProfilePrimaryAction,
  buildConnectionProfileStatusSummary,
  buildConnectionProfileSubtitle,
  buildConnectionSelectionActionState,
  buildConnectionTransferActions,
  collectConnectionTags,
  buildDefaultTerminalLaunch,
  buildTerminalSubmitPlan,
  filterConnectionProfiles,
  filterRecentConnectionsByProviders,
  isProfileProviderAvailable,
  isProfileConnectionLaunching,
  removeConnectionProfiles,
  reconcileConnectionProfileSelection,
  releaseConnectionLaunchRequests,
  reserveConnectionLaunchRequests,
  resolveConnectionProfileSelection,
  setVisibleConnectionProfileSelection,
  updateConnectionProfilesFavorite,
  updateConnectionProfilesTag,
  resolveSelectedProfileId,
  selectBatchProfiles,
  shouldPersistConnection,
  summarizeProfileSessions,
  sortConnectionProfiles,
  sortSidebarProfiles,
} from './connectionManager.js';

const connectionManager = await import('./connectionManager.js');
assert.equal(typeof connectionManager.resolveProfileSaveDefault, 'function');
assert.equal(connectionManager.resolveProfileSaveDefault(), false);
assert.equal(connectionManager.resolveProfileSaveDefault({ intent: 'session' }), false);
assert.equal(connectionManager.resolveProfileSaveDefault({ intent: 'connection' }), true);
assert.equal(connectionManager.resolveProfileSaveDefault({ intent: 'session', profile: { id: 'prod' } }), true);
assert.equal(shouldPersistConnection(), false);
assert.equal(shouldPersistConnection({ intent: 'session', saveProfile: true }), true);
assert.equal(shouldPersistConnection({ intent: 'connection' }), true);
assert.equal(shouldPersistConnection({ intent: 'edit' }), true);
assert.deepEqual(buildTerminalSubmitPlan({ intent: 'session', saveProfile: false }), {
  openSession: true,
  persistProfile: false,
});
assert.deepEqual(buildTerminalSubmitPlan({ intent: 'session', saveProfile: true }), {
  openSession: true,
  persistProfile: true,
});
assert.deepEqual(buildTerminalSubmitPlan({ action: 'save', intent: 'connection' }), {
  openSession: false,
  persistProfile: true,
});
assert.deepEqual(buildTerminalSubmitPlan({ action: 'saveAndOpen', intent: 'edit' }), {
  openSession: true,
  persistProfile: true,
});
assert.deepEqual(buildDefaultTerminalLaunch({
  providerName: 'Local Terminal',
  providerType: 'local',
  workingDirectory: '/Users/me/project',
}), {
  kind: 'open',
  providerType: 'local',
  request: {
    auth: {},
    config: { shell: '', workingDirectory: '/Users/me/project' },
    displayName: 'Local Terminal',
    group: '',
    providerType: 'local',
  },
});
assert.equal(
  buildDefaultTerminalLaunch({ providerName: 'Local Terminal' }).request.config.workingDirectory,
  '~',
);
assert.deepEqual(buildDefaultTerminalLaunch({ providerType: 'ssh' }), {
  kind: 'configure',
  providerType: 'ssh',
  request: null,
});
assert.deepEqual(buildDefaultTerminalLaunch({ providerType: 'kubernetes' }), {
  kind: 'configure',
  providerType: 'kubernetes',
  request: null,
});

assert.deepEqual(buildConnectionTransferActions({ profileCount: 0 }), [
  { key: 'importSshConfig', labelKey: 'action.importSshConfig', disabled: false },
  { key: 'importProfiles', labelKey: 'action.importConnections', disabled: false },
  { key: 'exportProfiles', labelKey: 'action.exportConnections', disabled: true },
]);
assert.equal(buildConnectionTransferActions({ profileCount: 3 })[2].disabled, false);

const profiles = [
  {
    id: 'prod-db',
    displayName: 'Prod DB',
    favorite: true,
    group: 'Production',
    tags: ['production', 'database'],
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
    tags: ['production', 'web'],
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
    tags: ['development'],
    providerType: 'local',
    config: { shell: '/bin/zsh', workingDirectory: '/Users/me/dev' },
    auth: {},
  },
];

const fileProfile = {
  id: 's3-assets',
  kind: 'file',
  providerType: 's3',
  displayName: 'Production assets',
  group: 'Production',
  filePath: '/releases',
  config: { endpoint: 'https://objects.example.com', bucket: 'assets' },
  auth: { credentialRef: { id: 's3-assets', providerType: 's3', fields: ['accessKey', 'secretKey'] } },
};

const pendingProdRequest = {
  profileId: 'prod-db',
  providerType: 'ssh',
  displayName: 'Prod DB',
  config: { host: '10.0.0.10', port: 22 },
};
const pendingWebRequest = {
  profileId: 'prod-web',
  providerType: 'ssh',
  displayName: 'Prod Web',
  config: { host: '10.0.0.20', port: 22 },
};
assert.equal(buildConnectionLaunchKey(pendingProdRequest), 'profile:prod-db');
assert.equal(
  buildConnectionLaunchKey({
    providerType: 'local',
    displayName: 'Local Terminal',
    config: { workingDirectory: '/Users/me/dev' },
  }),
  'request:local:Local%20Terminal:%2FUsers%2Fme%2Fdev',
);
const launchReservation = reserveConnectionLaunchRequests(
  ['profile:prod-db'],
  [pendingProdRequest, pendingWebRequest, pendingWebRequest],
);
assert.deepEqual(launchReservation.acceptedRequests, [pendingWebRequest]);
assert.deepEqual(launchReservation.blockedKeys, ['profile:prod-db', 'profile:prod-web']);
assert.deepEqual(launchReservation.pendingKeys, ['profile:prod-db', 'profile:prod-web']);
assert.deepEqual(
  releaseConnectionLaunchRequests(launchReservation.pendingKeys, launchReservation.acceptedRequests),
  ['profile:prod-db'],
);
assert.equal(
  isProfileConnectionLaunching({ id: 'prod-web' }, launchReservation.pendingKeys),
  true,
);
assert.equal(isProfileConnectionLaunching({ id: 'dev-shell' }, launchReservation.pendingKeys), false);

assert.deepEqual(
  resolveConnectionProfileSelection([], 'prod-db', ['prod-db', 'prod-web', 'dev-shell']),
  { anchorId: 'prod-db', selectedIds: ['prod-db'] },
);
assert.deepEqual(
  resolveConnectionProfileSelection(['prod-db'], 'dev-shell', ['prod-db', 'prod-web', 'dev-shell'], {
    anchorId: 'prod-db',
    range: true,
  }),
  { anchorId: 'prod-db', selectedIds: ['prod-db', 'prod-web', 'dev-shell'] },
);
assert.deepEqual(
  resolveConnectionProfileSelection(['prod-db', 'prod-web'], 'prod-db', ['prod-db', 'prod-web']),
  { anchorId: 'prod-db', selectedIds: ['prod-web'] },
);
assert.deepEqual(
  reconcileConnectionProfileSelection(['prod-db', 'missing', 'dev-shell'], ['dev-shell', 'prod-db']),
  ['prod-db', 'dev-shell'],
);
assert.deepEqual(
  setVisibleConnectionProfileSelection(['prod-db'], ['prod-web', 'dev-shell'], true),
  ['prod-db', 'prod-web', 'dev-shell'],
);
assert.deepEqual(
  setVisibleConnectionProfileSelection(['prod-db', 'prod-web'], ['prod-web'], false),
  ['prod-db'],
);

assert.deepEqual(buildConnectionSelectionActionState(profiles, ['prod-db', 'prod-web'], {
  availableProviders: [{ type: 'ssh' }, { type: 'local' }],
}), {
  allFavorite: false,
  openableCount: 2,
  selectedCount: 2,
});
assert.equal(buildConnectionSelectionActionState(profiles, ['prod-db', 'dev-shell']).allFavorite, true);
assert.deepEqual(buildConnectionSelectionActionState([...profiles, fileProfile], ['s3-assets'], {
  availableProviders: [{ type: 'ssh' }, { type: 'local' }],
}), {
  allFavorite: false,
  openableCount: 0,
  selectedCount: 1,
});
assert.deepEqual(buildConnectionSelectionActionState(profiles, ['missing']), {
  allFavorite: false,
  openableCount: 0,
  selectedCount: 0,
});
const favoritedProfiles = updateConnectionProfilesFavorite(profiles, ['prod-web', 'missing'], true);
assert.equal(favoritedProfiles.changedCount, 1);
assert.equal(favoritedProfiles.profiles.find((profile) => profile.id === 'prod-web')?.favorite, true);
assert.equal(favoritedProfiles.profiles.find((profile) => profile.id === 'prod-db'), profiles[0]);
const taggedProfiles = updateConnectionProfilesTag(profiles, ['prod-web', 'dev-shell'], ' Critical ', 'add');
assert.equal(taggedProfiles.changedCount, 2);
assert.deepEqual(taggedProfiles.profiles.find((profile) => profile.id === 'prod-web')?.tags, ['production', 'web', 'Critical']);
assert.deepEqual(taggedProfiles.profiles.find((profile) => profile.id === 'dev-shell')?.tags, ['development', 'Critical']);
const untaggedProfiles = updateConnectionProfilesTag(taggedProfiles.profiles, ['prod-web'], 'critical', 'remove');
assert.equal(untaggedProfiles.changedCount, 1);
assert.deepEqual(untaggedProfiles.profiles.find((profile) => profile.id === 'prod-web')?.tags, ['production', 'web']);
assert.equal(updateConnectionProfilesTag(profiles, ['prod-db'], 'database', 'add').changedCount, 0);
assert.equal(updateConnectionProfilesTag([
  { id: 'full', tags: Array.from({ length: 12 }, (_, index) => `tag-${index}`) },
], ['full'], 'overflow', 'add').changedCount, 0);
const removedProfiles = removeConnectionProfiles(profiles, ['prod-web', 'missing']);
assert.deepEqual(removedProfiles.removedProfiles.map((profile) => profile.id), ['prod-web']);
assert.deepEqual(removedProfiles.profiles.map((profile) => profile.id), ['prod-db', 'dev-shell']);

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
  { credentialCount: 1, favoriteCount: 1, groupKey: 'Production', key: 'group:Production', total: 2, type: 'group' },
  { credentialCount: 0, favoriteCount: 1, groupKey: '__ungrouped__', key: 'group:__ungrouped__', total: 1, type: 'group' },
]);

assert.equal(connectionManager.buildConnectionGroupFilter?.('Production'), 'group:Production');
assert.equal(connectionManager.buildConnectionGroupFilter?.('all'), 'group:all');
assert.deepEqual(connectionManager.resolveConnectionGroupFilter?.('group:all'), {
  group: 'all',
  type: 'group',
});
assert.deepEqual(connectionManager.resolveConnectionGroupFilter?.('favorites'), {
  group: '',
  type: 'favorites',
});
assert.deepEqual(
  filterConnectionProfiles([
    ...profiles,
    { id: 'reserved-all', displayName: 'Reserved all', group: 'all', providerType: 'ssh' },
  ], { group: 'group:all' }).map((profile) => profile.id),
  ['reserved-all'],
);

const renamedGroup = connectionManager.renameConnectionGroup?.(profiles, 'Production', 'Critical');
assert.equal(renamedGroup?.changedCount, 2);
assert.deepEqual(renamedGroup?.profiles.map((profile) => [profile.id, profile.group]), [
  ['prod-db', 'Critical'],
  ['prod-web', 'Critical'],
  ['dev-shell', ''],
]);
assert.equal(renamedGroup?.profiles[2], profiles[2]);

const movedProfile = connectionManager.moveConnectionProfilesToGroup?.(profiles, ['dev-shell'], 'Production');
assert.equal(movedProfile?.changedCount, 1);
assert.equal(movedProfile?.profiles.find((profile) => profile.id === 'dev-shell')?.group, 'Production');
assert.equal(movedProfile?.profiles.find((profile) => profile.id === 'prod-db'), profiles[0]);

const removedGroup = connectionManager.removeConnectionGroup?.(profiles, 'Production');
assert.equal(removedGroup?.changedCount, 2);
assert.deepEqual(removedGroup?.profiles.map((profile) => profile.group), ['', '', '']);
assert.equal(removedGroup?.profiles.length, profiles.length);

assert.deepEqual(connectionManager.resolveConnectionProfileDrop?.(profiles[2], {
  groupKey: 'Production',
  key: 'group:Production',
  type: 'group',
}), {
  action: 'move',
  profileId: 'dev-shell',
  targetGroup: 'Production',
  targetKey: 'group:Production',
});
assert.deepEqual(connectionManager.resolveConnectionProfileDrop?.(profiles[1], {
  key: 'favorites',
  type: 'favorites',
}), {
  action: 'favorite',
  profileId: 'prod-web',
  targetGroup: '',
  targetKey: 'favorites',
});
assert.deepEqual(connectionManager.resolveConnectionProfileDrop?.(profiles[0], {
  groupKey: '__ungrouped__',
  key: 'group:__ungrouped__',
  type: 'group',
}), {
  action: 'move',
  profileId: 'prod-db',
  targetGroup: '',
  targetKey: 'group:__ungrouped__',
});
assert.equal(connectionManager.resolveConnectionProfileDrop?.(profiles[0], {
  groupKey: 'Production', key: 'group:Production', type: 'group',
}), null);
assert.equal(connectionManager.resolveConnectionProfileDrop?.(profiles[0], {
  key: 'favorites', type: 'favorites',
}), null);
assert.equal(connectionManager.resolveConnectionProfileDrop?.(profiles[0], {
  key: 'all', type: 'all',
}), null);

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
  selectBatchProfiles([...profiles, fileProfile], {
    availableProviders: [{ type: 'ssh' }, { type: 'local' }, { type: 's3' }],
  }).map((profile) => profile.id),
  ['dev-shell', 'prod-db', 'prod-web'],
);

assert.deepEqual(
  filterConnectionProfiles(profiles, { query: 'prod deploy' }).map((profile) => profile.id),
  ['prod-web'],
);
assert.deepEqual(collectConnectionTags(profiles), ['database', 'development', 'production', 'web']);
assert.deepEqual(
  filterConnectionProfiles(profiles, { tag: 'database' }).map((profile) => profile.id),
  ['prod-db'],
);
assert.deepEqual(
  filterConnectionProfiles([{ id: 'reserved-tag', tags: ['all'] }], { tag: 'all' })
    .map((profile) => profile.id),
  ['reserved-tag'],
);
assert.deepEqual(
  filterConnectionProfiles(profiles, { query: 'development' }).map((profile) => profile.id),
  ['dev-shell'],
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
assert.deepEqual(
  filterConnectionProfiles([...profiles, fileProfile], { query: 'objects releases' }).map((profile) => profile.id),
  ['s3-assets'],
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
assert.deepEqual(buildConnectionProfileBadges(fileProfile, { activeCount: 0 }), [
  { key: 'group', tone: 'default', value: 'Production' },
  { key: 'fileWorkspace', tone: 'info', value: true },
  { key: 'credential', tone: 'info', value: true },
]);
assert.deepEqual(buildConnectionProfileBadges(profiles[1], { activeCount: 0 }, {
  launching: true,
}), [
  { key: 'group', tone: 'default', value: 'Production' },
  { key: 'launching', tone: 'info', value: true },
]);
assert.deepEqual(buildConnectionProfileBadges(profiles[1], { activeCount: 0 }, {
  healthBadge: { key: 'healthSuccess', tone: 'success', value: 42 },
}), [
  { key: 'group', tone: 'default', value: 'Production' },
  { key: 'healthSuccess', tone: 'success', value: 42 },
]);

assert.equal(isProfileProviderAvailable(profiles[0], [{ type: 'ssh' }, { type: 'local' }]), true);
assert.equal(isProfileProviderAvailable(profiles[0], [{ type: 'local' }]), false);
assert.equal(isProfileProviderAvailable(fileProfile, [{ type: 's3' }]), true);

assert.deepEqual(filterRecentConnectionsByProviders([
  { id: 'recent-ssh', providerType: 'ssh' },
  { id: 'recent-mysql', providerType: 'mysql' },
  { id: 'recent-request-redis', request: { providerType: 'redis' } },
], [{ type: 'ssh' }, { type: 'redis' }]).map((item) => item.id), ['recent-ssh', 'recent-request-redis']);

const recentSuggestions = [
  {
    id: 'saved-by-id',
    providerType: 'ssh',
    request: { providerType: 'ssh', profileId: 'prod-db' },
  },
  {
    id: 'legacy-saved-ssh',
    providerType: 'ssh',
    request: {
      providerType: 'ssh',
      config: { host: '10.0.0.20', port: 22 },
      auth: { username: 'deploy' },
    },
  },
  {
    id: 'legacy-saved-local',
    providerType: 'local',
    request: { providerType: 'local', config: { shell: '/bin/zsh' } },
  },
  {
    id: 'temporary-ssh',
    providerType: 'ssh',
    request: {
      providerType: 'ssh',
      config: { host: '10.0.0.30', port: 22 },
      auth: { username: 'ops' },
    },
  },
  { id: 'unavailable-mysql', providerType: 'mysql' },
];
assert.deepEqual(
  filterRecentConnectionsByProviders(
    recentSuggestions,
    [{ type: 'local' }, { type: 'ssh' }],
    profiles,
  ).map((item) => item.id),
  ['temporary-ssh'],
);

assert.deepEqual(buildConnectionProfileFacts(profiles[0]), [
  { key: 'host', value: '10.0.0.10' },
  { key: 'port', value: 22 },
  { key: 'username', value: '-' },
  { key: 'authType', value: 'password' },
  { key: 'hostKeyPolicy', value: 'accept-new' },
  { key: 'connectTimeout', value: 10 },
  { key: 'lastUsed', value: '2026-06-25T10:00:00.000Z' },
]);
assert.deepEqual(buildConnectionProfileFacts({
  ...profiles[1],
  config: { ...profiles[1].config, jumpHost: 'jump.example.com', keepAliveIntervalSeconds: 20 },
}), [
  { key: 'host', value: '10.0.0.20' },
  { key: 'port', value: 22 },
  { key: 'username', value: 'deploy' },
  { key: 'authType', value: 'password' },
  { key: 'hostKeyPolicy', value: 'accept-new' },
  { key: 'connectTimeout', value: 10 },
  { key: 'keepAlive', value: 20 },
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
assert.equal(buildConnectionProfileSubtitle({ providerType: 'local', config: {} }, {
  defaultShellLabel: 'Default shell',
}), 'Default shell');
assert.deepEqual(buildConnectionProfileFacts({ providerType: 'local', config: {} }, {
  defaultShellLabel: 'Default shell',
}), [
  { key: 'shell', value: 'Default shell' },
  { key: 'lastUsed', value: '' },
]);
assert.deepEqual(buildConnectionProfileFacts(fileProfile), [
  { key: 'endpoint', value: 'https://objects.example.com' },
  { key: 'path', value: '/releases' },
  { key: 'lastUsed', value: '' },
]);
assert.equal(buildConnectionProfileSubtitle(fileProfile), 'https://objects.example.com · /releases');

const redisProfile = {
  id: 'redis-prod',
  providerType: 'redis',
  config: { host: 'cache.internal', port: 6380, database: 2 },
  auth: { credentialRef: { id: 'redis-prod', providerType: 'redis', fields: ['password'] } },
};
assert.deepEqual(buildConnectionProfileFacts(redisProfile), [
  { key: 'host', value: 'cache.internal' },
  { key: 'port', value: 6380 },
  { key: 'database', value: 2 },
  { key: 'lastUsed', value: '' },
]);
assert.equal(buildConnectionProfileSubtitle(redisProfile), 'cache.internal:6380');
assert.equal(buildConnectionProfileSubtitle({
  providerType: 'kubernetes',
  config: { namespace: 'apps', pod: 'api-0' },
}), 'apps / api-0');
assert.deepEqual(buildConnectionProfileHints({ activeCount: 0 }), ['enterOpen']);
assert.deepEqual(buildConnectionProfileHints({ activeCount: 2 }), [
  'focusOpenSession',
  'secondaryOpenNew',
  'enterOpen',
]);
assert.deepEqual(buildConnectionProfilePrimaryAction({
  providerAvailable: true,
  sessionInfo: { activeCount: 2, focusSessionId: 's1' },
}), {
  action: 'focus',
  disabled: false,
  labelKey: 'action.focusSession',
  reasonKey: '',
});
assert.deepEqual(buildConnectionProfilePrimaryAction({
  profileKind: 'file',
  providerAvailable: true,
}), {
  action: 'openFiles',
  disabled: false,
  labelKey: 'action.openFiles',
  reasonKey: '',
});
assert.deepEqual(buildConnectionProfilePrimaryAction({
  providerAvailable: true,
  sessionInfo: { activeCount: 0, focusSessionId: '' },
}), {
  action: 'connect',
  disabled: false,
  labelKey: 'action.connect',
  reasonKey: '',
});
assert.deepEqual(buildConnectionProfilePrimaryAction({
  providerAvailable: false,
  sessionInfo: { activeCount: 0, focusSessionId: '' },
}), {
  action: 'findExtension',
  disabled: false,
  labelKey: 'action.findExtension',
  reasonKey: '',
});
assert.deepEqual(buildConnectionProfilePrimaryAction({
  providerAvailable: false,
  sessionInfo: { activeCount: 1, focusSessionId: 'existing-session' },
}), {
  action: 'focus',
  disabled: false,
  labelKey: 'action.focusSession',
  reasonKey: '',
});
assert.deepEqual(buildConnectionProfileLaunchModel({
  providerAvailable: true,
  sessionInfo: { activeCount: 2, focusSessionId: 's1' },
}), {
  primary: {
    action: 'focus',
    disabled: false,
    labelKey: 'action.focusSession',
    reasonKey: '',
  },
  secondary: {
    action: 'connect',
    disabled: false,
    labelKey: 'action.newTerminal',
    reasonKey: '',
  },
});
assert.deepEqual(buildConnectionProfileLaunchModel({
  providerAvailable: false,
  sessionInfo: { activeCount: 1, focusSessionId: 'existing-session' },
}), {
  primary: {
    action: 'focus',
    disabled: false,
    labelKey: 'action.focusSession',
    reasonKey: '',
  },
  secondary: {
    action: 'findExtension',
    disabled: false,
    labelKey: 'action.findExtension',
    reasonKey: '',
  },
});
assert.equal(buildConnectionProfileLaunchModel({
  providerAvailable: true,
  sessionInfo: { activeCount: 0, focusSessionId: '' },
}).secondary, null);
assert.deepEqual(buildConnectionProfileLaunchModel({
  launching: true,
  providerAvailable: true,
  sessionInfo: { activeCount: 0, focusSessionId: '' },
}), {
  primary: {
    action: 'connect',
    disabled: true,
    labelKey: 'action.openingConnection',
    reasonKey: 'message.connectionLaunchInProgress',
  },
  secondary: null,
});
assert.deepEqual(buildConnectionProfileLaunchModel({
  launching: true,
  providerAvailable: true,
  sessionInfo: { activeCount: 1, focusSessionId: 's1' },
}), {
  primary: {
    action: 'focus',
    disabled: false,
    labelKey: 'action.focusSession',
    reasonKey: '',
  },
  secondary: {
    action: 'connect',
    disabled: true,
    labelKey: 'action.openingConnection',
    reasonKey: 'message.connectionLaunchInProgress',
  },
});
assert.deepEqual(buildConnectionProfileStatusSummary({
  launching: true,
  providerAvailable: true,
  sessionInfo: { activeCount: 0, focusSessionId: '' },
}), {
  descriptionKey: 'connection.status.opening.description',
  titleKey: 'connection.status.opening.title',
  tone: 'info',
  values: {},
});
assert.deepEqual(buildConnectionProfileStatusSummary({
  providerAvailable: true,
  sessionInfo: { activeCount: 2, focusSessionId: 's1' },
}), {
  descriptionKey: 'connection.status.active.description',
  titleKey: 'connection.status.active.title',
  tone: 'success',
  values: { count: 2 },
});
assert.deepEqual(buildConnectionProfileStatusSummary({
  providerAvailable: true,
  sessionInfo: { activeCount: 0, focusSessionId: '' },
}), {
  descriptionKey: 'connection.status.ready.description',
  titleKey: 'connection.status.ready.title',
  tone: 'info',
  values: {},
});
assert.deepEqual(buildConnectionProfileStatusSummary({
  profileKind: 'file',
  providerAvailable: true,
}), {
  descriptionKey: 'connection.status.fileReady.description',
  titleKey: 'connection.status.fileReady.title',
  tone: 'info',
  values: {},
});
assert.deepEqual(buildConnectionProfileStatusSummary({
  providerAvailable: false,
  sessionInfo: { activeCount: 0, focusSessionId: '' },
}), {
  descriptionKey: 'connection.status.unavailable.description',
  titleKey: 'connection.status.unavailable.title',
  tone: 'warning',
  values: {},
});

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
assert.equal(resolveSelectedProfileId(profiles, '', { fallbackToFirst: false }), '');
assert.equal(resolveSelectedProfileId(profiles, 'missing', { fallbackToFirst: false }), '');
