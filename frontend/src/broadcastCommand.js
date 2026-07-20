import { isSensitiveCommand } from './commandHistory.js';

const readyStatuses = new Set(['connected', 'idle']);
const maxCommandLength = 2000;

export function buildBroadcastSessionTargets(sessions = [], options = {}) {
  const terminalStatuses = options.terminalStatuses || {};
  const displayLabels = options.displayLabels || {};
  return sessions
    .map((session, index) => {
      const status = terminalStatuses[session.id]?.status || session.status;
      return {
        displayName: displayLabels[session.id] || session.label || session.providerType || 'Terminal',
        id: session.id,
        index,
        status,
      };
    })
    .filter((target) => target.id && readyStatuses.has(target.status))
    .sort((left, right) => {
      if (left.id === options.activeKey) return -1;
      if (right.id === options.activeKey) return 1;
      return left.index - right.index;
    })
    .map(({ index, ...target }) => target);
}

export function buildBroadcastCommandPlan({
  appendEnter = true,
  command = '',
  readySessionIds = [],
  targetIds = [],
} = {}) {
  const normalizedCommand = String(command || '').trim();
  const readyIds = new Set(readySessionIds);
  const selectedIds = [...new Set(targetIds)].filter((id) => readyIds.has(id));
  let reason = '';
  if (!normalizedCommand) reason = 'empty';
  else if (normalizedCommand.length > maxCommandLength) reason = 'tooLong';
  else if (/\r|\n/.test(normalizedCommand)) reason = 'multiline';
  else if (isSensitiveCommand(normalizedCommand)) reason = 'sensitive';
  else if (selectedIds.length < 2) reason = 'notEnoughTargets';

  return {
    command: normalizedCommand,
    ok: reason === '',
    payload: reason === '' ? `${normalizedCommand}${appendEnter ? '\r' : ''}` : '',
    reason,
    targetIds: selectedIds,
  };
}
