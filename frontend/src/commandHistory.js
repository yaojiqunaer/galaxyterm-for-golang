const sensitivePatterns = [
  /\b(pass(word)?|pwd)\s*=\s*\S+/i,
  /\b(token|secret|api[_-]?key)\s*=\s*\S+/i,
  /(^|\s)-p\S+/i,
  /private\s+key/i,
  /id_rsa|id_ed25519/i,
];

export function isSensitiveCommand(command = '') {
  const text = String(command || '').trim();
  if (!text) return false;
  return sensitivePatterns.some((pattern) => pattern.test(text));
}

export function buildCommandHistoryEntry(command = '', context = {}) {
  const normalizedCommand = String(command || '').trim();
  if (!normalizedCommand || isSensitiveCommand(normalizedCommand)) return null;
  return {
    command: normalizedCommand,
    providerType: context.providerType || 'terminal',
    sessionId: context.sessionId || '',
    sessionLabel: context.sessionLabel || '',
  };
}

export function upsertCommandHistory(history = [], entry = null, {
  limit = 80,
  now = () => new Date().toISOString(),
} = {}) {
  if (!entry?.command) return history;
  const updated = {
    ...entry,
    updatedAt: now(),
  };
  const deduped = history.filter((item) => !sameCommandScope(item, updated));
  return [updated, ...deduped].slice(0, limit);
}

export function filterCommandHistory(history = [], {
  providerType = 'all',
  query = '',
  sessionId = '',
} = {}) {
  const tokens = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
  return history.filter((item) => {
    if (providerType !== 'all' && item.providerType !== providerType) return false;
    if (sessionId && item.sessionId !== sessionId) return false;
    if (tokens.length === 0) return true;
    const searchable = [
      item.command,
      item.providerType,
      item.sessionLabel,
    ].filter(Boolean).join(' ').toLowerCase();
    return tokens.every((token) => searchable.includes(token));
  });
}

function sameCommandScope(left = {}, right = {}) {
  return left.command === right.command && left.providerType === right.providerType;
}
