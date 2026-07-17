import assert from 'node:assert/strict';
import {
  buildAsciinemaCast,
  buildAuditRecord,
  buildAuditRecordSummary,
  resolveReplayEventTime,
  createAuditEvent,
  parseAsciinemaCast,
  persistAuditRecordSet,
  renderCastFrame,
  renderReplayFrame,
  redactSensitive,
  sanitizeAuditRecord,
} from './auditLog.js';

const sensitive = [
  'mysql -uroot -ppassword123',
  'Authorization: Bearer abc.def.ghi',
  'token=secret-value',
  '-----BEGIN OPENSSH PRIVATE KEY-----\nabc\n-----END OPENSSH PRIVATE KEY-----',
].join('\n');

const redacted = redactSensitive(sensitive);
assert.ok(!redacted.includes('password123'));
assert.ok(!redacted.includes('abc.def.ghi'));
assert.ok(!redacted.includes('secret-value'));
assert.ok(!redacted.includes('OPENSSH PRIVATE KEY'));
assert.ok(redacted.includes('[REDACTED]'));

const event = createAuditEvent({
  sessionId: 's1',
  sessionLabel: 'prod',
  type: 'paste',
  detail: 'password=hunter2',
  at: '2026-06-13T10:00:00.000Z',
});
assert.equal(event.sessionId, 's1');
assert.equal(event.type, 'paste');
assert.equal(event.detail, 'password=[REDACTED]');

const cast = buildAsciinemaCast({
  command: 'ssh prod',
  env: { TERM: 'xterm-256color' },
  height: 24,
  outputEvents: [
    { time: 0, data: 'hello' },
    { time: 1.5, data: '\nworld' },
  ],
  timestamp: 1781325600,
  title: 'prod',
  width: 80,
});

const lines = cast.trim().split('\n').map((line) => JSON.parse(line));
assert.equal(lines[0].version, 2);
assert.equal(lines[0].title, 'prod');
assert.deepEqual(lines[1], [0, 'o', 'hello']);
assert.deepEqual(lines[2], [1.5, 'o', '\nworld']);

const sensitiveHeaderCast = buildAsciinemaCast({
  command: 'mysql --password secret',
  env: { TERM: 'xterm-256color', API_TOKEN: 'token=secret-value' },
  title: 'token=secret-value',
});
const sensitiveHeader = JSON.parse(sensitiveHeaderCast.split('\n')[0]);
assert.ok(!sensitiveHeader.command.includes('secret'));
assert.ok(!sensitiveHeader.title.includes('secret-value'));
assert.ok(!sensitiveHeader.env.API_TOKEN.includes('secret-value'));

const parsed = parseAsciinemaCast(cast);
assert.equal(parsed.header.width, 80);
assert.equal(parsed.duration, 1.5);
assert.equal(parsed.events.length, 2);
assert.equal(renderCastFrame(parsed.events, 0), 'hello');
assert.equal(renderCastFrame(parsed.events, 1.5), 'hello\nworld');

const ansiCast = buildAsciinemaCast({
  outputEvents: [
    { time: 0, data: '\u001b[32mhello\u001b[0m' },
    { time: 1, data: '\r\n\u001b]0;title\u0007world' },
  ],
});
const parsedAnsiCast = parseAsciinemaCast(ansiCast);
assert.equal(renderReplayFrame(parsedAnsiCast.events, 1), 'hello\nworld');

const summary = buildAuditRecordSummary({
  auditEvents: [{ type: 'copy' }, { type: 'paste' }],
  cast,
  providerType: 'ssh',
  title: 'prod',
});
assert.deepEqual(summary, {
  duration: 1.5,
  eventCount: 2,
  hasRecording: true,
  providerType: 'ssh',
  title: 'prod',
});

assert.deepEqual(buildAuditRecordSummary({ title: '' }), {
  duration: 0,
  eventCount: 0,
  hasRecording: false,
  providerType: 'terminal',
  title: 'Untitled',
});

const auditRecord = buildAuditRecord({
  auditEvents: [
    { id: 'e1', type: 'paste', detail: 'Authorization: Bearer abc.def' },
    { id: 'e2', type: 'command', detail: 'kubectl get pods' },
  ],
  cast: sensitiveHeaderCast,
  screen: 'password=hunter2',
  title: 'token=secret-value',
});
assert.equal(auditRecord.auditEvents[0].detail, 'Authorization: Bearer [REDACTED]');
assert.equal(auditRecord.auditEvents[1].detail, 'kubectl get pods');
assert.ok(!auditRecord.screen.includes('hunter2'));
assert.ok(!auditRecord.title.includes('secret-value'));
assert.ok(!JSON.parse(auditRecord.cast.split('\n')[0]).command.includes('secret'));

const legacyCast = [
  JSON.stringify({
    version: 2,
    width: 80,
    height: 24,
    command: 'mysql --password legacy-password',
    title: 'token=legacy-token',
    env: { API_TOKEN: 'token=legacy-token' },
  }),
  JSON.stringify([0, 'o', 'password=legacy-password\r\n']),
  JSON.stringify([0.5, 'i', 'Authorization: Bearer legacy-bearer']),
].join('\n');
const sanitizedLegacyRecord = sanitizeAuditRecord({
  id: 'legacy-record',
  auditEvents: [{ id: 'e1', detail: 'Authorization: Bearer legacy-bearer' }],
  cast: legacyCast,
  screen: 'token=legacy-token',
  title: 'password=legacy-password',
});
const serializedLegacyRecord = JSON.stringify(sanitizedLegacyRecord);
assert.ok(!serializedLegacyRecord.includes('legacy-password'));
assert.ok(!serializedLegacyRecord.includes('legacy-token'));
assert.ok(!serializedLegacyRecord.includes('legacy-bearer'));
assert.equal(parseAsciinemaCast(sanitizedLegacyRecord.cast).events[0].data, 'password=[REDACTED]\r\n');

assert.equal(resolveReplayEventTime(parsed.events, 0.2, 'next'), 1.5);
assert.equal(resolveReplayEventTime(parsed.events, 1.5, 'previous'), 0);
assert.equal(resolveReplayEventTime(parsed.events, 2, 'next'), 1.5);
assert.equal(resolveReplayEventTime([], 2, 'previous'), 0);

const quotaRecords = [
  { id: 'new', title: 'New', cast: 'n'.repeat(80) },
  { id: 'middle', title: 'Middle', cast: 'm'.repeat(40) },
  { id: 'old', title: 'Old', cast: 'o'.repeat(40) },
];
const twoRecordLimit = JSON.stringify(quotaRecords.slice(0, 2).map(sanitizeAuditRecord)).length;
const quotaStorage = createLengthLimitedStorage(twoRecordLimit);
const quotaResult = persistAuditRecordSet(quotaStorage, 'audit', quotaRecords);
assert.equal(quotaResult.persisted, true);
assert.equal(quotaResult.evictedCount, 1);
assert.deepEqual(quotaResult.records.map((record) => record.id), ['new', 'middle']);

const manyRecords = Array.from({ length: 100 }, (_, index) => ({
  id: `record-${index}`,
  title: `Record ${index}`,
  cast: 'x'.repeat(20),
}));
const boundedStorage = createLengthLimitedStorage(
  JSON.stringify(manyRecords.slice(0, 37).map(sanitizeAuditRecord)).length,
);
const boundedResult = persistAuditRecordSet(boundedStorage, 'audit', manyRecords);
assert.equal(boundedResult.records.length, 37);
assert.ok(boundedStorage.writeCount() <= 7, 'quota fallback should use bounded write attempts');

const existingRecord = { id: 'existing', title: 'Existing', cast: 'small' };
const oversizedRecord = { id: 'oversized', title: 'Oversized', cast: 'x'.repeat(500) };
const fallbackStorage = createLengthLimitedStorage(JSON.stringify([sanitizeAuditRecord(existingRecord)]).length);
fallbackStorage.setItem('audit', JSON.stringify([sanitizeAuditRecord(existingRecord)]));
const fallbackResult = persistAuditRecordSet(
  fallbackStorage,
  'audit',
  [oversizedRecord, existingRecord],
  { preferredId: 'oversized' },
);
assert.equal(fallbackResult.persisted, true);
assert.equal(fallbackResult.preferredStored, false);
assert.deepEqual(fallbackResult.records.map((record) => record.id), ['existing']);

const unavailableStorage = {
  getItem: () => JSON.stringify([sanitizeAuditRecord(existingRecord)]),
  setItem: () => { throw new Error('storage unavailable'); },
};
const unavailableResult = persistAuditRecordSet(
  unavailableStorage,
  'audit',
  [{ id: 'replacement', title: 'Replacement' }],
  { preferredId: 'replacement' },
);
assert.equal(unavailableResult.persisted, false);
assert.equal(unavailableResult.preferredStored, false);
assert.deepEqual(unavailableResult.records.map((record) => record.id), ['existing']);

function createLengthLimitedStorage(maxLength) {
  const values = new Map();
  let writes = 0;
  return {
    getItem: (key) => values.get(key) || null,
    setItem: (key, value) => {
      writes += 1;
      if (String(value).length > maxLength) throw new Error('quota exceeded');
      values.set(key, String(value));
    },
    writeCount: () => writes,
  };
}
