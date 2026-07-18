export function normalizeTerminalExternalLink(uri = '') {
  try {
    const parsed = new URL(String(uri).trim());
    if (!['http:', 'https:'].includes(parsed.protocol)) return '';
    if (parsed.username || parsed.password) return '';
    return parsed.href;
  } catch {
    return '';
  }
}

export function shouldActivateTerminalLink(event = {}) {
  return event.button === 0 && (event.metaKey === true || event.ctrlKey === true);
}

export function isTerminalViewportAtBottom(viewportY, baseY) {
  if (!Number.isFinite(viewportY) || !Number.isFinite(baseY)) return true;
  return viewportY >= baseY;
}
