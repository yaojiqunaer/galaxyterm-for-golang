import assert from 'node:assert/strict';
import * as paletteModel from './paletteModel.js';
import {
  buildConnectionActionPaletteItems,
  buildProfilePaletteItems,
  buildPaletteSummary,
  buildSessionActionPaletteItems,
  filterPaletteItems,
  resolvePaletteIndex,
} from './paletteModel.js';

const items = [
  {
    title: 'Prod Web',
    description: 'root@10.0.0.2:22',
    group: 'Connections',
    keywords: 'production ssh web',
  },
  {
    title: 'Audit Logs',
    description: 'Review terminal recordings',
    group: 'Navigation',
    keywords: 'record replay',
  },
  {
    title: 'Deploy',
    description: 'kubectl apply -f',
    group: 'Commands',
    keywords: 'k8s kubernetes',
  },
];

assert.deepEqual(filterPaletteItems(items, '').map((item) => item.title), ['Prod Web', 'Audit Logs', 'Deploy']);
assert.deepEqual(filterPaletteItems(items, 'PROD').map((item) => item.title), ['Prod Web']);
assert.deepEqual(filterPaletteItems(items, 'record').map((item) => item.title), ['Audit Logs']);
assert.deepEqual(filterPaletteItems(items, 'kubernetes').map((item) => item.title), ['Deploy']);

const rankedItems = [
  { id: 'first', title: 'Open Settings', group: 'Navigation' },
  { id: 'disabled', title: 'Open Session', group: 'Sessions', disabled: true },
  { id: 'recent', title: 'Open Connections', group: 'Navigation' },
];
assert.deepEqual(
  filterPaletteItems(rankedItems, '', { recentIds: ['recent', 'first'] }).map((item) => item.id),
  ['recent', 'first', 'disabled'],
);
assert.deepEqual(
  filterPaletteItems(rankedItems, 'open').map((item) => item.id),
  ['first', 'recent', 'disabled'],
);
assert.deepEqual(
  paletteModel.recordPaletteRecent?.(['profile:a', 'navigation:settings'], 'profile:b', 3),
  ['profile:b', 'profile:a', 'navigation:settings'],
);
assert.deepEqual(
  paletteModel.recordPaletteRecent?.(['profile:a', 'profile:b'], 'profile:b', 2),
  ['profile:b', 'profile:a'],
);
assert.deepEqual(paletteModel.recordPaletteRecent?.(['profile:a'], '', 6), ['profile:a']);

const paletteStorage = new Map();
const storageAdapter = {
  getItem: (key) => paletteStorage.get(key) ?? null,
  setItem: (key, value) => paletteStorage.set(key, value),
};
paletteModel.persistPaletteRecentIds?.(['profile:a', 'profile:b'], storageAdapter);
assert.deepEqual(paletteModel.loadPaletteRecentIds?.(storageAdapter), ['profile:a', 'profile:b']);
paletteStorage.set(paletteModel.paletteRecentStorageKey, '{broken');
assert.deepEqual(paletteModel.loadPaletteRecentIds?.(storageAdapter), []);

assert.deepEqual(buildPaletteSummary(items), {
  total: 3,
  groups: [
    { group: 'Connections', count: 1 },
    { group: 'Navigation', count: 1 },
    { group: 'Commands', count: 1 },
  ],
});

assert.deepEqual(buildPaletteSummary([]), {
  total: 0,
  groups: [],
});

const profilePaletteItems = buildProfilePaletteItems({
  groupLabel: 'Connections',
  profiles: [
    { id: 'ssh-prod', providerType: 'ssh', displayName: 'Prod SSH', group: 'Production', config: { host: '10.0.0.2', port: 22 } },
    { id: 'mysql-prod', providerType: 'mysql', displayName: 'Prod MySQL', group: 'Production', config: { host: '10.0.0.3', port: 3306 } },
  ],
  providers: [{ type: 'ssh' }],
  subtitleForProfile: (profile) => profile.config.host,
});
assert.deepEqual(profilePaletteItems.map((item) => ({
  disabled: item.disabled,
  id: item.id,
  reasonKey: item.reasonKey,
})), [
  { disabled: false, id: 'profile:ssh-prod', reasonKey: '' },
  { disabled: true, id: 'profile:mysql-prod', reasonKey: 'palette.reason.providerUnavailable' },
]);

let recoveredProviderType = '';
const recoverableProfileItem = buildProfilePaletteItems({
  profiles: [{ id: 'mysql-prod', providerType: 'mysql', displayName: 'Prod MySQL' }],
  providers: [{ type: 'ssh' }],
  runUnavailableProfile: (profile) => { recoveredProviderType = profile.providerType; },
})[0];
assert.equal(recoverableProfileItem.disabled, false);
assert.equal(recoverableProfileItem.reasonKey, '');
recoverableProfileItem.run();
assert.equal(recoveredProviderType, 'mysql');

assert.deepEqual(filterPaletteItems([
  {
    title: 'Audit Logs',
    description: 'SSH session recordings',
    group: 'Navigation',
    keywords: 'security ssh',
  },
  {
    title: 'Production SSH',
    description: 'ssh root@10.0.0.2',
    group: 'Connections',
    keywords: 'server',
  },
  {
    title: 'SSH Terminal',
    description: 'Open a saved server',
    group: 'Providers',
    keywords: 'terminal shell',
  },
], 'ssh').map((item) => item.title), ['SSH Terminal', 'Production SSH', 'Audit Logs']);
assert.deepEqual(filterPaletteItems([
  {
    title: 'Production SSH',
    description: 'root@10.0.0.2:22',
    group: 'Connections',
    keywords: 'server terminal',
  },
  {
    title: 'Audit Logs',
    description: 'SSH recordings',
    group: 'Navigation',
    keywords: 'production',
  },
], 'prod ssh').map((item) => item.title), ['Production SSH', 'Audit Logs']);

const sessionActionItems = buildSessionActionPaletteItems({
  activeSessionHasTarget: true,
  activeSessionId: 's1',
  canNavigate: true,
  groupLabel: 'Session Actions',
  labels: {
    clearTerminal: 'Clear Terminal',
    closeAll: 'Close All Sessions',
    closeClosed: 'Close Closed Sessions',
    closeSession: 'Close Session',
    closeOthers: 'Close Other Sessions',
    commandHistory: 'Command History',
    copyTranscript: 'Copy Terminal Output',
    copySessionTarget: 'Copy Session Target',
    exportTranscript: 'Export Terminal Output',
    nextSession: 'Next Session',
    previousSession: 'Previous Session',
    protectSession: 'Protect Session',
    quickCommands: 'Quick Commands',
    reconnect: 'Reconnect',
    restoreClosed: 'Reopen Closed Session',
    renameSession: 'Rename Session',
    saveAudit: 'Save Audit Record',
    unprotectSession: 'Remove Protection',
  },
  runAction: () => {},
  sessionCount: 3,
  closedSessionCount: 1,
  restorableSessionCount: 1,
});
assert.deepEqual(sessionActionItems.map((item) => ({
  disabled: item.disabled,
  id: item.id,
  title: item.title,
})), [
  { disabled: false, id: 'session-action:previousSession', title: 'Previous Session' },
  { disabled: false, id: 'session-action:nextSession', title: 'Next Session' },
  { disabled: false, id: 'session-action:reconnect', title: 'Reconnect' },
  { disabled: false, id: 'session-action:renameSession', title: 'Rename Session' },
  { disabled: false, id: 'session-action:protectSession', title: 'Protect Session' },
  { disabled: false, id: 'session-action:copySessionTarget', title: 'Copy Session Target' },
  { disabled: false, id: 'session-action:clearTerminal', title: 'Clear Terminal' },
  { disabled: false, id: 'session-action:copyTranscript', title: 'Copy Terminal Output' },
  { disabled: false, id: 'session-action:exportTranscript', title: 'Export Terminal Output' },
  { disabled: false, id: 'session-action:saveAudit', title: 'Save Audit Record' },
  { disabled: false, id: 'session-action:closeSession', title: 'Close Session' },
  { disabled: false, id: 'session-action:restoreClosed', title: 'Reopen Closed Session' },
  { disabled: false, id: 'session-action:closeClosed', title: 'Close Closed Sessions' },
  { disabled: false, id: 'session-action:closeOthers', title: 'Close Other Sessions' },
  { disabled: false, id: 'session-action:closeAll', title: 'Close All Sessions' },
  { disabled: false, id: 'session-action:commandHistory', title: 'Command History' },
  { disabled: false, id: 'session-action:quickCommands', title: 'Quick Commands' },
]);

assert.deepEqual(buildSessionActionPaletteItems({
  activeSessionId: '',
  canNavigate: false,
  groupLabel: 'Session Actions',
  labels: {
    clearTerminal: 'Clear Terminal',
    closeAll: 'Close All Sessions',
    closeClosed: 'Close Closed Sessions',
    closeSession: 'Close Session',
    closeOthers: 'Close Other Sessions',
    commandHistory: 'Command History',
    copyTranscript: 'Copy Terminal Output',
    copySessionTarget: 'Copy Session Target',
    exportTranscript: 'Export Terminal Output',
    nextSession: 'Next Session',
    previousSession: 'Previous Session',
    protectSession: 'Protect Session',
    quickCommands: 'Quick Commands',
    reconnect: 'Reconnect',
    renameSession: 'Rename Session',
    saveAudit: 'Save Audit Record',
    unprotectSession: 'Remove Protection',
  },
  runAction: () => {},
  sessionCount: 0,
  closedSessionCount: 0,
}).map((item) => ({
  disabled: item.disabled,
  id: item.id,
  reasonKey: item.reasonKey,
})), [
  { disabled: true, id: 'session-action:previousSession', reasonKey: 'palette.reason.noAdjacentSession' },
  { disabled: true, id: 'session-action:nextSession', reasonKey: 'palette.reason.noAdjacentSession' },
  { disabled: true, id: 'session-action:reconnect', reasonKey: 'palette.reason.noActiveSession' },
  { disabled: true, id: 'session-action:renameSession', reasonKey: 'palette.reason.noActiveSession' },
  { disabled: true, id: 'session-action:protectSession', reasonKey: 'palette.reason.noActiveSession' },
  { disabled: true, id: 'session-action:copySessionTarget', reasonKey: 'palette.reason.noActiveSession' },
  { disabled: true, id: 'session-action:clearTerminal', reasonKey: 'palette.reason.noActiveSession' },
  { disabled: true, id: 'session-action:copyTranscript', reasonKey: 'palette.reason.noActiveSession' },
  { disabled: true, id: 'session-action:exportTranscript', reasonKey: 'palette.reason.noActiveSession' },
  { disabled: true, id: 'session-action:saveAudit', reasonKey: 'palette.reason.noActiveSession' },
  { disabled: true, id: 'session-action:closeSession', reasonKey: 'palette.reason.noActiveSession' },
  { disabled: true, id: 'session-action:closeClosed', reasonKey: 'palette.reason.noClosedSession' },
  { disabled: true, id: 'session-action:closeOthers', reasonKey: 'palette.reason.noActiveSession' },
  { disabled: true, id: 'session-action:closeAll', reasonKey: 'palette.reason.noSession' },
  { disabled: false, id: 'session-action:commandHistory', reasonKey: '' },
  { disabled: false, id: 'session-action:quickCommands', reasonKey: '' },
]);

const protectedSessionActions = buildSessionActionPaletteItems({
  activeSessionId: 'protected',
  activeSessionProtected: true,
  canNavigate: true,
  closableClosedCount: 0,
  closableOtherCount: 0,
  closableSessionCount: 0,
  closedSessionCount: 1,
  labels: {
    closeAll: 'Close All Sessions',
    closeClosed: 'Close Closed Sessions',
    closeSession: 'Close Session',
    closeOthers: 'Close Other Sessions',
    protectSession: 'Protect Session',
    unprotectSession: 'Remove Protection',
  },
  sessionCount: 2,
});
assert.deepEqual(
  protectedSessionActions
    .filter((item) => ['unprotectSession', 'closeSession', 'closeClosed', 'closeOthers', 'closeAll']
      .some((action) => item.id === `session-action:${action}`))
    .map((item) => ({ disabled: item.disabled, id: item.id, reasonKey: item.reasonKey })),
  [
    { disabled: false, id: 'session-action:unprotectSession', reasonKey: '' },
    { disabled: true, id: 'session-action:closeSession', reasonKey: 'palette.reason.protectedSession' },
    { disabled: true, id: 'session-action:closeClosed', reasonKey: 'palette.reason.noClosableSession' },
    { disabled: true, id: 'session-action:closeOthers', reasonKey: 'palette.reason.noClosableSession' },
    { disabled: true, id: 'session-action:closeAll', reasonKey: 'palette.reason.noClosableSession' },
  ],
);

assert.deepEqual(filterPaletteItems(sessionActionItems, 'history').map((item) => item.id), ['session-action:commandHistory']);
assert.deepEqual(filterPaletteItems(sessionActionItems, 'audit').map((item) => item.id), ['session-action:saveAudit']);
assert.deepEqual(filterPaletteItems(sessionActionItems, 'copy target').map((item) => item.id), ['session-action:copySessionTarget']);
const unavailableCopyTargetAction = buildSessionActionPaletteItems({ activeSessionId: 's1' })
  .find((item) => item.id === 'session-action:copySessionTarget');
assert.equal(unavailableCopyTargetAction.disabled, true);
assert.equal(unavailableCopyTargetAction.reasonKey, 'palette.reason.noSessionTarget');
assert.deepEqual(filterPaletteItems(sessionActionItems, 'close closed').map((item) => item.id), [
  'session-action:closeClosed',
  'session-action:restoreClosed',
]);
assert.deepEqual(filterPaletteItems(sessionActionItems, 'reopen closed').map((item) => item.id), ['session-action:restoreClosed']);

const connectionActionItems = buildConnectionActionPaletteItems({
  favoriteCount: 2,
  groupLabel: 'Connection Actions',
  labels: {
    exportProfiles: 'Export Connections',
    importSshConfig: 'Import SSH Config',
    importProfiles: 'Import Connections',
    newConnection: 'New Connection',
    newLocalTerminal: 'New Local Terminal',
    openAllConnections: 'Open All Connections',
    openFavorites: 'Open Favorites',
    quickSsh: 'Quick SSH',
  },
  runAction: () => {},
  savedConnectionCount: 5,
});
assert.deepEqual(connectionActionItems.map((item) => ({
  disabled: item.disabled,
  id: item.id,
  title: item.title,
})), [
  { disabled: false, id: 'connection-action:newLocalTerminal', title: 'New Local Terminal' },
  { disabled: false, id: 'connection-action:quickSsh', title: 'Quick SSH' },
  { disabled: false, id: 'connection-action:newConnection', title: 'New Connection' },
  { disabled: false, id: 'connection-action:importSshConfig', title: 'Import SSH Config' },
  { disabled: false, id: 'connection-action:importProfiles', title: 'Import Connections' },
  { disabled: false, id: 'connection-action:exportProfiles', title: 'Export Connections' },
  { disabled: false, id: 'connection-action:openFavorites', title: 'Open Favorites' },
  { disabled: false, id: 'connection-action:openAllConnections', title: 'Open All Connections' },
]);
assert.deepEqual(filterPaletteItems(connectionActionItems, 'ssh import').map((item) => item.id), ['connection-action:importSshConfig']);
assert.deepEqual(filterPaletteItems(connectionActionItems, 'json import').map((item) => item.id), ['connection-action:importProfiles']);

const emptyConnectionActionItems = buildConnectionActionPaletteItems({
  favoriteCount: 0,
  groupLabel: 'Connection Actions',
  labels: {
    exportProfiles: 'Export Connections',
    openAllConnections: 'Open All Connections',
    openFavorites: 'Open Favorites',
  },
  runAction: () => {},
  savedConnectionCount: 0,
});
assert.deepEqual(['exportProfiles', 'openFavorites', 'openAllConnections'].map((key) => {
  const item = emptyConnectionActionItems.find((entry) => entry.id === `connection-action:${key}`);
  return {
    disabled: item.disabled,
    id: item.id,
    reasonKey: item.reasonKey,
  };
}), [
  { disabled: true, id: 'connection-action:exportProfiles', reasonKey: 'palette.reason.noSavedConnection' },
  { disabled: true, id: 'connection-action:openFavorites', reasonKey: 'palette.reason.noFavoriteConnection' },
  { disabled: true, id: 'connection-action:openAllConnections', reasonKey: 'palette.reason.noSavedConnection' },
]);

assert.equal(resolvePaletteIndex(0, 0, 'next'), -1);
assert.equal(resolvePaletteIndex(3, -1, 'next'), 0);
assert.equal(resolvePaletteIndex(3, 0, 'previous'), 2);
assert.equal(resolvePaletteIndex(3, 2, 'next'), 0);
assert.equal(resolvePaletteIndex(3, 1, 'first'), 0);
assert.equal(resolvePaletteIndex(3, 1, 'last'), 2);
