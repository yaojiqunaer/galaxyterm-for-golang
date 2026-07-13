export function advanceReplayTime(currentTime, elapsedMilliseconds, duration, speed = 1) {
  const safeDuration = Math.max(0, Number(duration) || 0);
  const safeCurrentTime = clamp(Number(currentTime) || 0, 0, safeDuration);
  const safeElapsed = Math.max(0, Number(elapsedMilliseconds) || 0);
  const safeSpeed = Math.max(0, Number(speed) || 0);
  return clamp(safeCurrentTime + ((safeElapsed / 1000) * safeSpeed), 0, safeDuration);
}

export function findReplayEventCursor(events = [], playhead = 0, startCursor = 0) {
  const safePlayhead = Math.max(0, Number(playhead) || 0);
  let cursor = Math.min(events.length, Math.max(0, Math.floor(Number(startCursor) || 0)));
  while (cursor < events.length && (Number(events[cursor]?.time) || 0) <= safePlayhead) {
    cursor += 1;
  }
  return cursor;
}

export function shouldResetReplayTerminal(previousTime, nextTime, previousRecordId, nextRecordId) {
  return previousRecordId !== nextRecordId || Number(nextTime) < Number(previousTime);
}

function clamp(value, minimum, maximum) {
  return Math.min(maximum, Math.max(minimum, value));
}
