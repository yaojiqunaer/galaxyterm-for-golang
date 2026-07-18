import assert from 'node:assert/strict';
import {
  appendClosedSessions,
  buildSessionAuditSummary,
  buildSessionContextFacts,
  buildSessionCloseConfirm,
  buildSessionNavigationState,
  buildSessionAttentionSummary,
  buildSessionStatusFacts,
  buildSessionTabMenuModel,
  buildSessionToolbarModel,
  buildSessionToolbarContext,
  buildDesktopWindowTitle,
  countUnreadSessions,
  filterSessions,
  markSessionActivityRead,
  moveSessionInOrder,
  profileActionModel,
  pruneSessionActivity,
  recordSessionAttention,
  recordSessionOutputActivity,
  reorderSessions,
  sessionTabDisplay,
  sessionStatusLabel,
  sessionStatusTone,
  sessionSummary,
  takeClosedSession,
} from './sessionPresentation.js';

assert.equal(sessionStatusTone({ status: 'connected' }), 'success');
assert.equal(sessionStatusTone({ status: 'closed' }), 'closed');
assert.equal(sessionStatusTone({ status: 'error' }), 'danger');
assert.equal(sessionStatusTone({ status: 'connecting' }), 'connecting');
assert.equal(sessionStatusTone({}), 'connecting');

assert.equal(sessionStatusLabel({ status: 'connected' }), 'connected');
assert.equal(sessionStatusLabel({ status: 'closed' }), 'closed');
assert.equal(sessionStatusLabel({ status: 'error' }), 'error');
assert.equal(sessionStatusLabel({ status: 'connecting' }), 'connecting');

const sessionPresentation = await import('./sessionPresentation.js');
assert.equal(typeof sessionPresentation.resolveSessionLifecycleStatus, 'function');
assert.equal(sessionPresentation.resolveSessionLifecycleStatus('connecting'), 'connecting');
assert.equal(sessionPresentation.resolveSessionLifecycleStatus('connected'), 'connected');
assert.equal(sessionPresentation.resolveSessionLifecycleStatus('busy'), 'connected');
assert.equal(sessionPresentation.resolveSessionLifecycleStatus('interrupting'), 'connected');
assert.equal(sessionPresentation.resolveSessionLifecycleStatus('idle'), 'connected');
assert.equal(sessionPresentation.resolveSessionLifecycleStatus('error'), 'error');
assert.equal(sessionPresentation.resolveSessionLifecycleStatus('closed'), 'closed');

const closedSource = {
  id: 'session-1',
  backendSessionId: 'backend-1',
  label: 'Production',
  providerType: 'ssh',
  request: {
    displayName: 'Old name',
    providerType: 'ssh',
    config: { host: 'prod.example.com' },
    auth: { username: 'root' },
  },
  auditEvents: [{ type: 'session.open' }],
  status: 'connected',
};
const closedStack = appendClosedSessions([], [
  closedSource,
  { ...closedSource, id: 'session-2', label: 'Database' },
], 10);
assert.equal(closedStack.length, 2);
assert.equal(closedStack[0].label, 'Database');
assert.equal(closedStack[1].label, 'Production');
assert.equal(closedStack[1].request.displayName, 'Production');
assert.notEqual(closedStack[1].request, closedSource.request);
assert.equal('id' in closedStack[1], false);
assert.equal('auditEvents' in closedStack[1], false);
assert.deepEqual(takeClosedSession(closedStack), {
  entry: closedStack[0],
  remaining: [closedStack[1]],
});
assert.deepEqual(takeClosedSession([]), { entry: null, remaining: [] });
assert.equal(appendClosedSessions(closedStack, Array.from({ length: 12 }, (_, index) => ({
  label: `Session ${index}`,
  providerType: 'local',
  request: { providerType: 'local' },
})), 10).length, 10);

assert.deepEqual(sessionSummary([
  { status: 'connected' },
  { status: 'connecting' },
  { status: 'error' },
  { status: 'closed' },
  {},
]), {
  active: 4,
  closed: 1,
  connected: 1,
  connecting: 2,
  error: 1,
  total: 5,
});

assert.deepEqual(buildSessionStatusFacts({
  active: 3,
  closed: 1,
  connected: 2,
  connecting: 1,
  error: 1,
  total: 5,
}), [
  { key: 'connected', value: 2, tone: 'success' },
  { key: 'connecting', value: 1, tone: 'warning' },
  { key: 'error', value: 1, tone: 'danger' },
  { key: 'closed', value: 1, tone: 'closed' },
]);

assert.deepEqual(buildSessionStatusFacts({
  active: 0,
  closed: 0,
  connected: 0,
  connecting: 0,
  error: 0,
  total: 0,
}), []);

const synchronizingSessions = [
  { id: 'current', revision: 2, status: 'connecting' },
  { id: 'other', revision: 0, status: 'connected' },
];
assert.deepEqual(
  sessionPresentation.synchronizeSessionTerminalStatus(
    synchronizingSessions,
    'current',
    { status: 'error' },
    2,
  ),
  [
    { id: 'current', revision: 2, status: 'error' },
    synchronizingSessions[1],
  ],
);
assert.equal(
  sessionPresentation.synchronizeSessionTerminalStatus(
    synchronizingSessions,
    'current',
    { status: 'closed' },
    1,
  ),
  synchronizingSessions,
);

assert.deepEqual(buildSessionNavigationState([
  { id: 's1' },
  { id: 's2' },
  { id: 's3' },
], 's2'), {
  canNavigate: true,
  nextId: 's3',
  previousId: 's1',
});

assert.deepEqual(buildSessionNavigationState([{ id: 'solo' }], 'solo'), {
  canNavigate: false,
  nextId: '',
  previousId: '',
});

assert.deepEqual(buildSessionNavigationState([], ''), {
  canNavigate: false,
  nextId: '',
  previousId: '',
});

assert.deepEqual(buildSessionToolbarModel({
  activeKey: 's1',
  canNavigate: true,
  closedCount: 2,
  sessionCount: 3,
  terminalStatus: 'connected',
  view: 'tabs',
}), {
  primary: [
    { key: 'grid', labelKey: 'action.grid', disabled: false },
  ],
  overflow: [
    { key: 'rename', labelKey: 'action.renameSession', disabled: false },
    { key: 'reconnect', labelKey: 'action.reconnect', disabled: false },
    { key: 'closeClosed', labelKey: 'action.closeClosed', disabled: false },
    { key: 'closeOthers', labelKey: 'action.closeOthers', disabled: false, danger: true },
    { key: 'closeCurrent', labelKey: 'action.closeSession', disabled: false, danger: true },
  ],
});

assert.deepEqual(buildSessionToolbarContext({
  providerType: 'ssh',
  request: {
    config: { host: 'prod.example.com', port: 2222 },
    auth: { username: 'root' },
  },
}, { providerName: 'SSH' }), {
  iconType: 'ssh',
  identity: 'root@prod.example.com:2222',
  provider: 'SSH',
  target: 'prod.example.com:2222',
  user: 'root',
});
assert.deepEqual(buildSessionToolbarContext({
  providerType: 'local',
  config: { workingDirectory: '/Users/me/project' },
}, { providerName: 'Local' }), {
  iconType: 'local',
  identity: '/Users/me/project',
  provider: 'Local',
  target: '/Users/me/project',
  user: '',
});
assert.equal(buildSessionToolbarContext(null), null);

assert.equal(buildDesktopWindowTitle(null, { appName: 'GalaxyTerm' }), 'GalaxyTerm');
assert.equal(buildDesktopWindowTitle(null, {
  appName: 'GalaxyTerm',
  unreadCount: 3,
}), '(3) GalaxyTerm');
assert.equal(buildDesktopWindowTitle({
  label: 'Production',
  providerType: 'ssh',
  request: {
    config: { host: 'prod.example.com', port: 2222 },
    auth: { username: 'root' },
  },
}, {
  appName: 'GalaxyTerm',
  providerName: 'SSH',
  unreadCount: 2,
}), '(2) Production · root@prod.example.com:2222 — GalaxyTerm');
assert.equal(buildDesktopWindowTitle({
  label: 'root@prod.example.com:2222',
  providerType: 'ssh',
  request: {
    config: { host: 'prod.example.com', port: 2222 },
    auth: { username: 'root' },
  },
}, { appName: 'GalaxyTerm' }), 'root@prod.example.com:2222 — GalaxyTerm');
assert.equal(buildDesktopWindowTitle({
  label: '  Local Terminal  ',
  providerType: 'local',
  config: { workingDirectory: '/Users/me/project' },
}, {
  appName: 'GalaxyTerm',
  providerName: 'Local',
}), 'Local Terminal · /Users/me/project — GalaxyTerm');
const longWindowTitle = buildDesktopWindowTitle({
  label: 'Production cluster with an intentionally very long descriptive session name',
  providerType: 'ssh',
  request: {
    config: { host: 'an-extremely-long-production-hostname.example.internal', port: 2222 },
    auth: { username: 'deployment-operator' },
  },
}, { appName: 'GalaxyTerm', maxLength: 72 });
assert.equal(longWindowTitle.length <= 72, true);
assert.equal(longWindowTitle.endsWith(' — GalaxyTerm'), true);
assert.equal(longWindowTitle.includes('…'), true);

assert.deepEqual(buildSessionToolbarModel({
  activeKey: 'running',
  canNavigate: false,
  closedCount: 0,
  sessionCount: 1,
  terminalStatus: 'busy',
  view: 'tabs',
}).primary, [
  { key: 'interrupt', labelKey: 'action.interruptCommand', disabled: false, danger: true },
]);
assert.deepEqual(buildSessionToolbarModel({
  activeKey: 'running',
  sessionCount: 1,
  terminalStatus: 'busy',
  view: 'tabs',
}).overflow.slice(0, 2), [
  { key: 'rename', labelKey: 'action.renameSession', disabled: false },
  { key: 'reconnect', labelKey: 'action.reconnect', disabled: true },
]);

assert.deepEqual(buildSessionToolbarModel({
  activeKey: 'failed',
  sessionCount: 1,
  terminalStatus: { status: 'error' },
  view: 'tabs',
}), {
  primary: [
    { key: 'reconnect', labelKey: 'action.reconnect', disabled: false },
  ],
  overflow: [
    { key: 'rename', labelKey: 'action.renameSession', disabled: false },
    { key: 'closeClosed', labelKey: 'action.closeClosed', disabled: true },
    { key: 'closeOthers', labelKey: 'action.closeOthers', disabled: true, danger: true },
    { key: 'closeCurrent', labelKey: 'action.closeSession', disabled: false, danger: true },
  ],
});
assert.deepEqual(buildSessionToolbarModel({
  activeKey: 'closed',
  sessionCount: 1,
  terminalStatus: { status: 'closed' },
  view: 'tabs',
}).primary, [
  { key: 'reconnect', labelKey: 'action.reconnect', disabled: false },
]);

assert.deepEqual(buildSessionTabMenuModel({ sessionCount: 3 }), [
  { key: 'rename', labelKey: 'action.renameSession' },
  { key: 'reconnect', labelKey: 'action.reconnect' },
  { key: 'duplicate', labelKey: 'action.duplicate' },
  { key: 'closeOthers', labelKey: 'action.closeOthers', disabled: false, danger: true },
  { key: 'closeCurrent', labelKey: 'action.closeSession', danger: true },
]);

assert.deepEqual(buildSessionTabMenuModel({ sessionCount: 1 }), [
  { key: 'rename', labelKey: 'action.renameSession' },
  { key: 'reconnect', labelKey: 'action.reconnect' },
  { key: 'duplicate', labelKey: 'action.duplicate' },
  { key: 'closeOthers', labelKey: 'action.closeOthers', disabled: true, danger: true },
  { key: 'closeCurrent', labelKey: 'action.closeSession', danger: true },
]);

assert.deepEqual(
  buildSessionTabMenuModel({ sessionCount: 3, sessionIndex: 0 })
    .filter((action) => action.key === 'moveLeft' || action.key === 'moveRight'),
  [
    { key: 'moveLeft', labelKey: 'action.moveSessionLeft', disabled: true, dividerBefore: true },
    { key: 'moveRight', labelKey: 'action.moveSessionRight', disabled: false },
  ],
);
assert.deepEqual(
  buildSessionTabMenuModel({ sessionCount: 3, sessionIndex: 2 })
    .filter((action) => action.key === 'moveLeft' || action.key === 'moveRight'),
  [
    { key: 'moveLeft', labelKey: 'action.moveSessionLeft', disabled: false, dividerBefore: true },
    { key: 'moveRight', labelKey: 'action.moveSessionRight', disabled: true },
  ],
);

assert.deepEqual(buildSessionToolbarModel({
  activeKey: '',
  canNavigate: false,
  closedCount: 0,
  sessionCount: 0,
  view: 'grid',
}), {
  primary: [
    { key: 'tabs', labelKey: 'action.tabs', disabled: false },
  ],
  overflow: [
    { key: 'rename', labelKey: 'action.renameSession', disabled: true },
    { key: 'reconnect', labelKey: 'action.reconnect', disabled: true },
    { key: 'closeClosed', labelKey: 'action.closeClosed', disabled: true },
    { key: 'closeOthers', labelKey: 'action.closeOthers', disabled: true, danger: true },
    { key: 'closeCurrent', labelKey: 'action.closeSession', disabled: true, danger: true },
  ],
});

assert.deepEqual(buildSessionToolbarModel({
  activeKey: 'solo',
  canNavigate: false,
  closedCount: 0,
  sessionCount: 1,
  view: 'tabs',
}), {
  primary: [],
  overflow: [
    { key: 'rename', labelKey: 'action.renameSession', disabled: false },
    { key: 'reconnect', labelKey: 'action.reconnect', disabled: false },
    { key: 'closeClosed', labelKey: 'action.closeClosed', disabled: true },
    { key: 'closeOthers', labelKey: 'action.closeOthers', disabled: true, danger: true },
    { key: 'closeCurrent', labelKey: 'action.closeSession', disabled: false, danger: true },
  ],
});

assert.deepEqual(buildSessionContextFacts({
  label: 'Prod SSH',
  providerType: 'ssh',
  status: 'connected',
  config: { host: 'prod.example.com', port: 2222, username: 'root' },
  auditEvents: [{ type: 'terminal.open' }, { type: 'terminal.copy' }],
}, { recordingActive: true }), [
  { key: 'provider', value: 'ssh', tone: 'neutral' },
  { key: 'target', value: 'prod.example.com:2222', tone: 'neutral' },
  { key: 'user', value: 'root', tone: 'neutral' },
  { key: 'audit', value: 2, tone: 'success' },
  { key: 'recording', value: 'active', tone: 'success' },
]);

assert.deepEqual(buildSessionContextFacts({
  providerType: 'local',
  config: { workingDirectory: '/repo/galaxyterm' },
  auditRecordSaved: true,
}, { recordingActive: false }), [
  { key: 'provider', value: 'local', tone: 'neutral' },
  { key: 'target', value: '/repo/galaxyterm', tone: 'neutral' },
  { key: 'audit', value: 0, tone: 'neutral' },
  { key: 'recording', value: 'saved', tone: 'closed' },
]);

assert.deepEqual(buildSessionContextFacts({
  providerType: 'ssh',
  request: {
    auth: { username: 'deploy' },
    config: { host: 'edge.example.com', port: 2202 },
  },
}, { providerName: 'SSH Terminal', recordingActive: true }), [
  { key: 'provider', value: 'SSH Terminal', tone: 'neutral' },
  { key: 'target', value: 'edge.example.com:2202', tone: 'neutral' },
  { key: 'user', value: 'deploy', tone: 'neutral' },
  { key: 'audit', value: 0, tone: 'neutral' },
  { key: 'recording', value: 'active', tone: 'success' },
]);

assert.deepEqual(buildSessionContextFacts(null), []);

assert.deepEqual(buildSessionAuditSummary(null), {
  descriptionKey: 'session.audit.noSession.description',
  titleKey: 'session.audit.noSession.title',
  tone: 'info',
  values: {},
});

assert.deepEqual(buildSessionAuditSummary({
  auditEvents: [{ type: 'terminal.open' }, { type: 'terminal.copy' }],
  status: 'connected',
}, { recordingActive: true }), {
  descriptionKey: 'session.audit.recording.description',
  titleKey: 'session.audit.recording.title',
  tone: 'success',
  values: { count: 2 },
});

assert.deepEqual(buildSessionAuditSummary({
  auditEvents: [{ type: 'terminal.open' }],
  status: 'connected',
}, { recordingActive: false }), {
  descriptionKey: 'session.audit.pending.description',
  titleKey: 'session.audit.pending.title',
  tone: 'warning',
  values: { count: 1 },
});

assert.deepEqual(buildSessionAuditSummary({
  auditEvents: [{ type: 'terminal.open' }],
  auditRecordSaved: true,
  status: 'closed',
}, { recordingActive: false }), {
  descriptionKey: 'session.audit.saved.description',
  titleKey: 'session.audit.saved.title',
  tone: 'success',
  values: { count: 1 },
});

assert.deepEqual(buildSessionAuditSummary({
  auditEvents: [],
  status: 'closed',
}, { recordingActive: false }), {
  descriptionKey: 'session.audit.closedPending.description',
  titleKey: 'session.audit.closedPending.title',
  tone: 'warning',
  values: { count: 0 },
});

const sessionFilterFixture = [
  { id: '1', label: 'Prod SSH', providerType: 'ssh', status: 'connected', config: { host: 'prod.example.com', username: 'root' } },
  { id: '2', label: 'Local Shell', providerType: 'local', status: 'connecting', config: { workingDirectory: '/repo/galaxyterm' } },
  { id: '3', label: 'Redis Cache', providerType: 'redis', status: 'closed', config: { host: 'cache.internal' } },
];

assert.deepEqual(filterSessions(sessionFilterFixture, {
  activeKey: '2',
  query: '',
  status: 'all',
}).map((session) => session.id), ['2', '1', '3']);

assert.deepEqual(filterSessions(sessionFilterFixture, {
  activeKey: '2',
  query: 'prod root',
  status: 'all',
}).map((session) => session.id), ['1']);

assert.deepEqual(filterSessions(sessionFilterFixture, {
  activeKey: '2',
  query: '',
  status: 'active',
}).map((session) => session.id), ['2', '1']);

assert.deepEqual(filterSessions(sessionFilterFixture, {
  activeKey: '2',
  query: '',
  status: 'closed',
}).map((session) => session.id), ['3']);

assert.deepEqual(buildSessionCloseConfirm({
  label: 'Prod Shell',
  providerType: 'ssh',
  status: 'connected',
}), {
  contentKey: 'confirm.closeSessionContent',
  contentValues: {
    name: 'Prod Shell',
    provider: 'ssh',
    status: 'connected',
  },
  okActionKey: 'action.closeSession',
  titleKey: 'confirm.closeSessionTitle',
});

assert.deepEqual(buildSessionCloseConfirm(null), null);

assert.deepEqual(buildSessionCloseConfirm([{ id: 's1' }, { id: 's2' }]), {
  contentKey: 'confirm.closeAllSessionsContent',
  contentValues: {
    count: 2,
  },
  okActionKey: 'action.closeAll',
  titleKey: 'confirm.closeAllSessionsTitle',
});

assert.deepEqual(buildSessionCloseConfirm({
  mode: 'others',
  sessions: [{ id: 's1' }, { id: 's2' }],
}), {
  contentKey: 'confirm.closeOtherSessionsContent',
  contentValues: {
    count: 2,
  },
  okActionKey: 'action.closeOthers',
  titleKey: 'confirm.closeOtherSessionsTitle',
});

assert.deepEqual(buildSessionCloseConfirm({ mode: 'others', sessions: [] }), null);

assert.deepEqual(buildSessionCloseConfirm({
  mode: 'closed',
  sessions: [{ id: 's1', status: 'closed' }, { id: 's2', status: 'closed' }],
}), {
  contentKey: 'confirm.closeClosedSessionsContent',
  contentValues: {
    count: 2,
  },
  okActionKey: 'action.closeClosed',
  titleKey: 'confirm.closeClosedSessionsTitle',
});

assert.deepEqual(buildSessionCloseConfirm({ mode: 'closed', sessions: [] }), null);

assert.deepEqual(sessionTabDisplay({
  label: 'Local Terminal',
  providerType: 'local',
  status: 'connected',
}, true), {
  active: true,
  iconType: 'local',
  statusLabel: 'connected',
  statusTone: 'success',
  title: 'Local Terminal',
  unread: false,
});

assert.deepEqual(sessionTabDisplay({
  label: 'Build logs',
  providerType: 'ssh',
  status: 'connected',
}, false, { unread: true }), {
  active: false,
  iconType: 'ssh',
  statusLabel: 'connected',
  statusTone: 'success',
  title: 'Build logs',
  unread: true,
});

const unreadActivity = recordSessionOutputActivity({}, {
  activeKey: 'session-1',
  outputAt: '2026-07-16T01:00:00.000Z',
  sessionId: 'session-2',
});
assert.deepEqual(unreadActivity, {
  'session-2': {
    kind: 'output',
    occurredAt: '2026-07-16T01:00:00.000Z',
    unread: true,
  },
});
assert.equal(recordSessionOutputActivity(unreadActivity, {
  activeKey: 'session-1',
  outputAt: '2026-07-16T01:00:01.000Z',
  sessionId: 'session-2',
}), unreadActivity);
assert.equal(recordSessionOutputActivity(unreadActivity, {
  activeKey: 'session-1',
  outputAt: '2026-07-16T01:00:01.000Z',
  sessionId: 'session-1',
}), unreadActivity);
assert.deepEqual(recordSessionOutputActivity(unreadActivity, {
  activeKey: 'session-1',
  outputAt: '2026-07-16T01:00:01.000Z',
  sessionId: 'session-2',
  visibleSessionIds: ['session-2'],
}), markSessionActivityRead(unreadActivity, 'session-2'));
assert.deepEqual(recordSessionOutputActivity({}, {
  activeKey: 'session-1',
  outputAt: '2026-07-16T01:00:01.000Z',
  sessionId: 'session-1',
  visibleSessionIds: [],
}), {
  'session-1': {
    kind: 'output',
    occurredAt: '2026-07-16T01:00:01.000Z',
    unread: true,
  },
});
const readActivity = markSessionActivityRead(unreadActivity, 'session-2');
assert.deepEqual(readActivity, {
  'session-2': {
    kind: 'output',
    occurredAt: '2026-07-16T01:00:00.000Z',
    unread: false,
  },
});
assert.equal(markSessionActivityRead(readActivity, 'session-2'), readActivity);
assert.deepEqual(pruneSessionActivity({
  ...readActivity,
  removed: { outputAt: '2026-07-16T01:00:02.000Z', unread: true },
}, ['session-2']), readActivity);
assert.equal(countUnreadSessions({
  'session-1': { unread: false },
  'session-2': { unread: true },
  'session-3': { unread: true },
}), 2);

const errorActivity = recordSessionAttention(unreadActivity, {
  activeKey: 'session-1',
  kind: 'error',
  occurredAt: '2026-07-16T01:00:03.000Z',
  sessionId: 'session-2',
});
assert.deepEqual(errorActivity, {
  'session-2': {
    kind: 'error',
    occurredAt: '2026-07-16T01:00:03.000Z',
    unread: true,
  },
});
assert.equal(recordSessionAttention(errorActivity, {
  activeKey: 'session-1',
  kind: 'output',
  occurredAt: '2026-07-16T01:00:04.000Z',
  sessionId: 'session-2',
}), errorActivity);
const readErrorActivity = markSessionActivityRead(errorActivity, 'session-2');
assert.equal(recordSessionAttention(readErrorActivity, {
  activeKey: 'session-1',
  kind: 'error',
  occurredAt: '2026-07-16T01:00:03.000Z',
  sessionId: 'session-2',
}), readErrorActivity);
assert.deepEqual(recordSessionAttention(readErrorActivity, {
  activeKey: 'session-1',
  kind: 'error',
  occurredAt: '2026-07-16T01:00:05.000Z',
  sessionId: 'session-2',
}), {
  'session-2': {
    kind: 'error',
    occurredAt: '2026-07-16T01:00:05.000Z',
    unread: true,
  },
});
const visibleErrorActivity = recordSessionAttention({}, {
  kind: 'error',
  occurredAt: '2026-07-16T01:00:05.000Z',
  sessionId: 'session-2',
  visibleSessionIds: ['session-2'],
});
assert.deepEqual(visibleErrorActivity, {
  'session-2': {
    kind: 'error',
    occurredAt: '2026-07-16T01:00:05.000Z',
    unread: false,
  },
});
assert.equal(recordSessionAttention(visibleErrorActivity, {
  kind: 'error',
  occurredAt: '2026-07-16T01:00:05.000Z',
  sessionId: 'session-2',
  visibleSessionIds: [],
}), visibleErrorActivity);
assert.deepEqual(buildSessionAttentionSummary({
  output: { kind: 'output', unread: true },
  error: { kind: 'error', unread: true },
  read: { kind: 'error', unread: false },
}), { errors: 1, total: 2 });

const orderedSessions = [{ id: 's1' }, { id: 's2' }, { id: 's3' }];
assert.deepEqual(moveSessionInOrder(orderedSessions, 's2', 'previous').map((session) => session.id), [
  's2', 's1', 's3',
]);
assert.deepEqual(moveSessionInOrder(orderedSessions, 's2', 'next').map((session) => session.id), [
  's1', 's3', 's2',
]);
assert.equal(moveSessionInOrder(orderedSessions, 's1', 'previous'), orderedSessions);
assert.deepEqual(reorderSessions(orderedSessions, 's1', 's3').map((session) => session.id), [
  's2', 's1', 's3',
]);
assert.deepEqual(reorderSessions(orderedSessions, 's1', 's3', 'after').map((session) => session.id), [
  's2', 's3', 's1',
]);
assert.deepEqual(reorderSessions(orderedSessions, 's3', 's1').map((session) => session.id), [
  's3', 's1', 's2',
]);
assert.equal(reorderSessions(orderedSessions, 'missing', 's1'), orderedSessions);

assert.deepEqual(profileActionModel({ favorite: false }), ['connect', 'edit', 'rename', 'duplicate', 'favorite', 'delete']);
assert.deepEqual(profileActionModel({ favorite: true }), ['connect', 'edit', 'rename', 'duplicate', 'unfavorite', 'delete']);
