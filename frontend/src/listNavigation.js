export function resolveListIndex(itemCount = 0, currentIndex = 0, action = 'next') {
  if (itemCount <= 0) return -1;
  if (action === 'first') return 0;
  if (action === 'last') return itemCount - 1;
  if (currentIndex < 0) return action === 'previous' ? itemCount - 1 : 0;
  if (action === 'previous') return (currentIndex - 1 + itemCount) % itemCount;
  return (currentIndex + 1) % itemCount;
}

export function resolveNumberedSessionIndex(key = '', sessionCount = 0) {
  if (!/^[1-9]$/.test(key)) return -1;
  const index = Number(key) - 1;
  return index >= 0 && index < sessionCount ? index : -1;
}

export function resolveSessionShortcutNumber(sessionIds = [], sessionId = '') {
  const index = sessionIds.indexOf(sessionId);
  return index >= 0 && index < 9 ? String(index + 1) : '';
}

export function resolveRelativeSessionIndex(sessionIds = [], activeSessionId = '', action = 'next') {
  if (sessionIds.length === 0) return -1;
  const currentIndex = sessionIds.indexOf(activeSessionId);
  return resolveListIndex(sessionIds.length, currentIndex, action);
}

export function resolveBracketSessionAction(event = {}) {
  if (!event.shiftKey) return '';
  if (event.code === 'BracketLeft' || event.key === '[' || event.key === '{') return 'previous';
  if (event.code === 'BracketRight' || event.key === ']' || event.key === '}') return 'next';
  return '';
}
