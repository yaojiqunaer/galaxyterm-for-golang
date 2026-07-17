import assert from 'node:assert/strict';
import {
  advanceReplayTime,
  findActiveAuditEventIndex,
  findReplayEventCursor,
  replayPlaybackState,
  resolveAuditReplayTime,
  seekReplayTime,
  shouldResetReplayTerminal,
} from './replayTimeline.js';

assert.equal(advanceReplayTime(1, 250, 8, 2), 1.5);
assert.equal(advanceReplayTime(7.9, 500, 8, 1), 8);
assert.equal(advanceReplayTime(2, 500, 0, 1), 0);
assert.equal(advanceReplayTime(2, -10, 8, 1), 2);

const events = [
  { time: 0, data: 'ready' },
  { time: 0.5, data: '\rworking' },
  { time: 1.25, data: '\r\u001b[2Kdone' },
];

assert.equal(findReplayEventCursor(events, 0), 1);
assert.equal(findReplayEventCursor(events, 0.75), 2);
assert.equal(findReplayEventCursor(events, 10), 3);
assert.equal(findReplayEventCursor(events, 1.25, 2), 3);
assert.equal(findReplayEventCursor([], 10), 0);

assert.equal(shouldResetReplayTerminal(2, 1.5, 'record-1', 'record-1'), true);
assert.equal(shouldResetReplayTerminal(2, 2.5, 'record-1', 'record-1'), false);
assert.equal(shouldResetReplayTerminal(0, 0, 'record-1', 'record-2'), true);

assert.equal(seekReplayTime(2, 10, 5), 7);
assert.equal(seekReplayTime(2, 10, -5), 0);
assert.equal(seekReplayTime(9, 10, 5), 10);
assert.equal(seekReplayTime(2, 0, 5), 0);

assert.equal(replayPlaybackState({ hasRecording: false }), 'unavailable');
assert.equal(replayPlaybackState({ duration: 8, hasRecording: true, playhead: 2, playing: true }), 'playing');
assert.equal(replayPlaybackState({ duration: 8, hasRecording: true, playhead: 2, playing: false }), 'paused');
assert.equal(replayPlaybackState({ duration: 8, hasRecording: true, playhead: 8, playing: false }), 'finished');

const recordingStartedAt = '2026-07-17T10:00:00.000Z';
assert.equal(resolveAuditReplayTime('2026-07-17T10:00:05.250Z', recordingStartedAt, 12), 5.25);
assert.equal(resolveAuditReplayTime('2026-07-17T09:59:58.000Z', recordingStartedAt, 12), 0);
assert.equal(resolveAuditReplayTime('2026-07-17T10:00:20.000Z', recordingStartedAt, 12), 12);
assert.equal(resolveAuditReplayTime('invalid', recordingStartedAt, 12), null);
assert.equal(resolveAuditReplayTime('2026-07-17T10:00:01.000Z', '', 12), null);

const auditEvents = [
  { at: '2026-07-17T10:00:09.000Z' },
  { at: '2026-07-17T10:00:02.000Z' },
  { at: 'invalid' },
  { at: '2026-07-17T10:00:05.000Z' },
];
assert.equal(findActiveAuditEventIndex(auditEvents, recordingStartedAt, 1, 12), -1);
assert.equal(findActiveAuditEventIndex(auditEvents, recordingStartedAt, 6, 12), 3);
assert.equal(findActiveAuditEventIndex(auditEvents, recordingStartedAt, 12, 12), 0);

console.log('replay timeline tests passed');
