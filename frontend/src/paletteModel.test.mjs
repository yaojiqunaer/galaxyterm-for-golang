import assert from 'node:assert/strict';
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
    exportTranscript: 'Export Terminal Output',
    nextSession: 'Next Session',
    previousSession: 'Previous Session',
    quickCommands: 'Quick Commands',
    reconnect: 'Reconnect',
    renameSession: 'Rename Session',
    saveAudit: 'Save Audit Record',
  },
  runAction: () => {},
  sessionCount: 3,
  closedSessionCount: 1,
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
  { disabled: false, id: 'session-action:clearTerminal', title: 'Clear Terminal' },
  { disabled: false, id: 'session-action:copyTranscript', title: 'Copy Terminal Output' },
  { disabled: false, id: 'session-action:exportTranscript', title: 'Export Terminal Output' },
  { disabled: false, id: 'session-action:saveAudit', title: 'Save Audit Record' },
  { disabled: false, id: 'session-action:closeSession', title: 'Close Session' },
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
    exportTranscript: 'Export Terminal Output',
    nextSession: 'Next Session',
    previousSession: 'Previous Session',
    quickCommands: 'Quick Commands',
    reconnect: 'Reconnect',
    renameSession: 'Rename Session',
    saveAudit: 'Save Audit Record',
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

assert.deepEqual(filterPaletteItems(sessionActionItems, 'history').map((item) => item.id), ['session-action:commandHistory']);
assert.deepEqual(filterPaletteItems(sessionActionItems, 'audit').map((item) => item.id), ['session-action:saveAudit']);
assert.deepEqual(filterPaletteItems(sessionActionItems, 'close closed').map((item) => item.id), ['session-action:closeClosed']);

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
