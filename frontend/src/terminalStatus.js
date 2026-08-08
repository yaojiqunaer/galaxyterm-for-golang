const terminalStatuses = ['connecting', 'connected', 'busy', 'interrupting', 'idle', 'error', 'closed'];

export function normalizeTerminalStatus(value) {
  const normalized = String(value || '').trim().toLowerCase();
  return terminalStatuses.includes(normalized) ? normalized : 'connecting';
}

export function terminalStatusTone(value) {
  const status = normalizeTerminalStatus(value);
  if (status === 'connected' || status === 'idle') return 'success';
  if (status === 'busy' || status === 'interrupting' || status === 'connecting') return 'warning';
  if (status === 'error') return 'danger';
  return 'closed';
}

export function buildTerminalStatusFacts(state = {}) {
  const status = normalizeTerminalStatus(state.status);
  const facts = [
    { key: 'status', value: status, tone: terminalStatusTone(status) },
  ];
  const lastCommand = String(state.lastCommand || '').trim();
  if (lastCommand) {
    facts.push({ key: 'lastCommand', value: lastCommand, tone: 'neutral' });
  }
  if (Number.isFinite(Number(state.durationMs)) && Number(state.durationMs) >= 0) {
    facts.push({ key: 'duration', value: formatDuration(Number(state.durationMs)), tone: 'neutral' });
  }
  if (Number.isSafeInteger(state.exitCode)) {
    facts.push({
      key: 'exitCode',
      value: state.exitCode,
      tone: state.exitCode === 0 ? 'success' : 'danger',
    });
  }
  if (state.cols && state.rows) {
    facts.push({ key: 'size', value: `${state.cols}x${state.rows}`, tone: 'neutral' });
  }
  return facts;
}

export function buildTerminalErrorDetail(state = {}) {
  const message = String(state.error || '').trim();
  if (normalizeTerminalStatus(state.status) !== 'error' || !message) return null;
  return {
    message,
    suggestionKey: 'terminal.error.recoveryHint',
    titleKey: 'terminal.error.details',
  };
}

export function buildTerminalRecoveryActions(state = {}, options = {}) {
  const status = normalizeTerminalStatus(state.status);
  const reconnectAction = {
    key: 'reconnect',
    tone: 'primary',
    ...(options.reconnecting ? { disabled: true, loading: true } : {}),
  };
  if (status === 'error') {
    return [
      reconnectAction,
      { key: 'copyError', tone: 'default', disabled: !String(state.error || '').trim() },
      { key: 'audit', tone: 'default' },
    ];
  }
  if (status === 'closed') {
    return [
      reconnectAction,
      { key: 'audit', tone: 'default' },
    ];
  }
  return [];
}

export function buildTerminalControlActions(state = {}) {
  const status = normalizeTerminalStatus(state.status);
  if (status === 'busy' || status === 'interrupting') {
    return [{ key: 'interrupt', tone: 'danger' }];
  }
  return [];
}

function formatDuration(ms) {
  const seconds = Math.max(0, ms / 1000);
  if (seconds < 60) return `${seconds.toFixed(seconds < 10 ? 1 : 0)}s`;
  const minutes = Math.floor(seconds / 60);
  return `${minutes}m ${Math.round(seconds % 60)}s`;
}
