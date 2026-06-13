import assert from 'node:assert/strict';
import {
  buildAsciinemaCast,
  createAuditEvent,
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
