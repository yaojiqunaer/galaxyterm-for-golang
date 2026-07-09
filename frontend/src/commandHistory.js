const sensitivePatterns = [
  /\b(pass(word)?|pwd)\s*=\s*\S+/i,
  /\b(token|secret|api[_-]?key)\s*=\s*\S+/i,
  /\bauthorization\s*:\s*bearer\s+\S+/i,
  /--?(pass(word)?|token|secret|api[_-]?key)(=|\s+)\S+/i,
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
  return buildCommandHistoryEntryResult(command, context).entry;
}

export function buildCommandHistoryEntryResult(command = '', context = {}) {
  const normalizedCommand = String(command || '').trim();
  if (!normalizedCommand) {
    return {
      entry: null,
      skippedReason: 'empty',
    };
  }
  if (isSensitiveCommand(normalizedCommand)) {
    return {
      entry: null,
      skippedReason: 'sensitive',
    };
  }
  return {
    entry: {
      command: normalizedCommand,
      providerType: context.providerType || 'terminal',
      sessionId: context.sessionId || '',
      sessionLabel: context.sessionLabel || '',
    },
    skippedReason: '',
  };
}

export function upsertCommandHistory(history = [], entry = null, {
  limit = 80,
  now = () => new Date().toISOString(),
} = {}) {
  if (!entry?.command) return history;
  const previous = history.find((item) => sameCommandScope(item, entry));
  const updated = {
    ...entry,
    favorite: previous?.favorite === true,
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
  return history
    .filter((item) => {
      if (providerType !== 'all' && item.providerType !== providerType) return false;
      if (sessionId && item.sessionId !== sessionId) return false;
      if (tokens.length === 0) return true;
      const searchable = [
        item.command,
        item.providerType,
        item.sessionLabel,
      ].filter(Boolean).join(' ').toLowerCase();
      return tokens.every((token) => searchable.includes(token));
    })
    .sort((left, right) => Number(!!right.favorite) - Number(!!left.favorite));
}

export function clearCommandHistory(history = [], {
  providerType = 'all',
  query = '',
  sessionId = '',
} = {}) {
  const targets = filterCommandHistory(history, { providerType, query, sessionId });
  if (targets.length === 0) return history;
  const targetKeys = new Set(targets.map(commandHistoryKey));
  return history.filter((item) => !targetKeys.has(commandHistoryKey(item)));
}

export function normalizeCommandHistoryItem(item = {}) {
  return {
    command: String(item.command || '').trim(),
    favorite: item.favorite === true,
    providerType: item.providerType || 'terminal',
    sessionId: item.sessionId || '',
    sessionLabel: item.sessionLabel || '',
    updatedAt: item.updatedAt || '',
  };
}

function sameCommandScope(left = {}, right = {}) {
  return left.command === right.command && left.providerType === right.providerType;
}

function commandHistoryKey(item = {}) {
  return `${item.providerType || 'terminal'}\u0000${item.sessionId || ''}\u0000${item.command || ''}`;
}
