import assert from 'node:assert/strict';
import {
  buildSessionContextFacts,
  buildSessionCloseConfirm,
  buildSessionStatusFacts,
  filterSessions,
  profileActionModel,
  sessionTabDisplay,
  sessionStatusLabel,
  sessionStatusTone,
  sessionSummary,
} from './sessionPresentation.js';

assert.equal(sessionStatusTone({ status: 'connected' }), 'success');
assert.equal(sessionStatusTone({ status: 'closed' }), 'closed');
assert.equal(sessionStatusTone({ status: 'connecting' }), 'connecting');
assert.equal(sessionStatusTone({}), 'connecting');

assert.equal(sessionStatusLabel({ status: 'connected' }), 'connected');
assert.equal(sessionStatusLabel({ status: 'closed' }), 'closed');
assert.equal(sessionStatusLabel({ status: 'connecting' }), 'connecting');

assert.deepEqual(sessionSummary([
  { status: 'connected' },
  { status: 'connecting' },
  { status: 'closed' },
  {},
]), {
  active: 3,
  closed: 1,
  connected: 1,
  connecting: 2,
  total: 4,
});

assert.deepEqual(buildSessionStatusFacts({
  active: 3,
  closed: 1,
  connected: 2,
  connecting: 1,
  total: 4,
}), [
  { key: 'connected', value: 2, tone: 'success' },
  { key: 'connecting', value: 1, tone: 'warning' },
  { key: 'closed', value: 1, tone: 'closed' },
]);

assert.deepEqual(buildSessionStatusFacts({
  active: 0,
  closed: 0,
  connected: 0,
  connecting: 0,
  total: 0,
}), []);

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

assert.deepEqual(buildSessionContextFacts(null), []);

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
});

assert.deepEqual(profileActionModel({ favorite: false }), ['connect', 'edit', 'rename', 'duplicate', 'favorite', 'delete']);
assert.deepEqual(profileActionModel({ favorite: true }), ['connect', 'edit', 'rename', 'duplicate', 'unfavorite', 'delete']);
