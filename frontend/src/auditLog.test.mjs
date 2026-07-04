import assert from 'node:assert/strict';
import {
  buildAsciinemaCast,
  buildAuditRecordSummary,
  resolveReplayEventTime,
  createAuditEvent,
  parseAsciinemaCast,
  renderCastFrame,
  renderReplayFrame,
  redactSensitive,
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

assert.equal(resolveReplayEventTime(parsed.events, 0.2, 'next'), 1.5);
assert.equal(resolveReplayEventTime(parsed.events, 1.5, 'previous'), 0);
assert.equal(resolveReplayEventTime(parsed.events, 2, 'next'), 1.5);
assert.equal(resolveReplayEventTime([], 2, 'previous'), 0);
