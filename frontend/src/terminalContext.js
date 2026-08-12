const maxTerminalTitleLength = 160;

export function normalizeTerminalTitle(value, maxLength = maxTerminalTitleLength) {
  const clean = String(value || '')
    .replace(/\u001b\[[0-?]*[ -/]*[@-~]/g, '')
    .replace(/[\u0000-\u001f\u007f-\u009f]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return clean.slice(0, Math.max(1, Number(maxLength) || maxTerminalTitleLength));
}

export function parseOscWorkingDirectory(value) {
  try {
    const url = new URL(String(value || ''));
    if (url.protocol !== 'file:') return null;
    const path = decodeURIComponent(url.pathname || '');
    if (!path.startsWith('/')) return null;
    return {
      host: normalizeTerminalTitle(url.hostname, 255),
      path: normalizeTerminalPath(path),
    };
  } catch {
    return null;
  }
}

export function mergeTerminalContext(current = {}, patch = {}) {
  const next = {
    title: patch.title === undefined ? current.title || '' : normalizeTerminalTitle(patch.title),
    workingDirectory: patch.workingDirectory === undefined
      ? current.workingDirectory || null
      : normalizeWorkingDirectory(patch.workingDirectory),
  };
  if (
    next.title === (current.title || '')
    && next.workingDirectory?.host === current.workingDirectory?.host
    && next.workingDirectory?.path === current.workingDirectory?.path
  ) return current;
  return next;
}

export function terminalRuntimeLabel(context = {}) {
  const workingDirectory = normalizeWorkingDirectory(context.workingDirectory);
  if (workingDirectory?.path) {
    return workingDirectory.host
      ? `${workingDirectory.host}:${workingDirectory.path}`
      : workingDirectory.path;
  }
  return normalizeTerminalTitle(context.title);
}

function normalizeTerminalPath(value) {
  return String(value || '')
    .replace(/[\u0000-\u001f\u007f-\u009f]+/g, '')
    .slice(0, 1024);
}

function normalizeWorkingDirectory(value) {
  if (!value || typeof value !== 'object') return null;
  const path = normalizeTerminalPath(value.path);
  if (!path.startsWith('/')) return null;
  return {
    host: normalizeTerminalTitle(value.host, 255),
    path,
  };
}
