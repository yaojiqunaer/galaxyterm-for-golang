export function sessionStatusTone(session = {}) {
  const status = sessionStatusLabel(session);
  if (status === 'connected') return 'success';
  if (status === 'error') return 'danger';
  if (status === 'closed') return 'closed';
  return 'connecting';
}

export function sessionStatusLabel(session = {}) {
  const status = session?.status;
  if (status === 'connected') return 'connected';
  if (status === 'error') return 'error';
  if (status === 'closed') return 'closed';
  return 'connecting';
}

export function resolveSessionLifecycleStatus(terminalStatus) {
  const status = typeof terminalStatus === 'string' ? terminalStatus : terminalStatus?.status;
  if (status === 'connected' || status === 'busy' || status === 'interrupting' || status === 'idle') return 'connected';
  if (status === 'error') return 'error';
  if (status === 'closed') return 'closed';
  return 'connecting';
}

export function synchronizeSessionTerminalStatus(
  sessions = [],
  sessionId = '',
  terminalStatus = {},
  revision,
) {
  const session = sessions.find((item) => item.id === sessionId);
  if (!session) return sessions;
  if (revision !== undefined && (session.revision || 0) !== revision) return sessions;
  const status = resolveSessionLifecycleStatus(terminalStatus);
  if (session.status === status) return sessions;
  return sessions.map((item) => (item.id === sessionId ? { ...item, status } : item));
}

export function appendClosedSessions(stack = [], sessions = [], limit = 10) {
  const capacity = Math.max(1, Number(limit) || 10);
  const entries = sessions
    .filter((session) => session?.request)
    .map((session) => ({
      label: session.label || session.request.displayName || session.providerType || 'terminal',
      providerType: session.providerType || session.request.providerType || 'terminal',
      request: cloneSessionValue({
        ...session.request,
        displayName: session.label || session.request.displayName,
      }),
    }))
    .reverse();
  return [...entries, ...stack].slice(0, capacity);
}

export function takeClosedSession(stack = []) {
  if (stack.length === 0) return { entry: null, remaining: [] };
  return { entry: stack[0], remaining: stack.slice(1) };
}

export function sessionSummary(sessions = []) {
  return sessions.reduce((summary, session) => {
    const tone = sessionStatusTone(session);
    return {
      active: tone === 'closed' ? summary.active : summary.active + 1,
      closed: tone === 'closed' ? summary.closed + 1 : summary.closed,
      connected: tone === 'success' ? summary.connected + 1 : summary.connected,
      connecting: tone === 'connecting' ? summary.connecting + 1 : summary.connecting,
      error: tone === 'danger' ? summary.error + 1 : summary.error,
      total: summary.total + 1,
    };
  }, {
    active: 0,
    closed: 0,
    connected: 0,
    connecting: 0,
    error: 0,
    total: 0,
  });
}

export function buildSessionStatusFacts(summary = {}) {
  return [
    { key: 'connected', value: summary.connected || 0, tone: 'success' },
    { key: 'connecting', value: summary.connecting || 0, tone: 'warning' },
    { key: 'error', value: summary.error || 0, tone: 'danger' },
    { key: 'closed', value: summary.closed || 0, tone: 'closed' },
  ].filter((item) => item.value > 0);
}

export function buildSessionNavigationState(sessions = [], activeKey = '') {
  const sessionIds = sessions.map((session) => session.id).filter(Boolean);
  if (sessionIds.length <= 1) {
    return { canNavigate: false, nextId: '', previousId: '' };
  }
  const currentIndex = sessionIds.indexOf(activeKey);
  const resolvedIndex = currentIndex >= 0 ? currentIndex : 0;
  return {
    canNavigate: true,
    nextId: sessionIds[(resolvedIndex + 1) % sessionIds.length],
    previousId: sessionIds[(resolvedIndex - 1 + sessionIds.length) % sessionIds.length],
  };
}

export function buildSessionToolbarModel(options = {}) {
  const hasActiveSession = Boolean(options.activeKey);
  const sessionCount = Number(options.sessionCount) || 0;
  const closedCount = Number(options.closedCount) || 0;
  const terminalStatus = typeof options.terminalStatus === 'string'
    ? options.terminalStatus
    : options.terminalStatus?.status;
  const canInterrupt = terminalStatus === 'busy' || terminalStatus === 'interrupting';
  const reconnectPrimary = hasActiveSession
    && (terminalStatus === 'error' || terminalStatus === 'closed');
  const reconnectAction = {
    key: 'reconnect',
    labelKey: 'action.reconnect',
    disabled: !hasActiveSession || canInterrupt || terminalStatus === 'connecting',
  };
  const viewAction = options.view === 'grid'
    ? { key: 'tabs', labelKey: 'action.tabs', disabled: false }
    : { key: 'grid', labelKey: 'action.grid', disabled: false };

  const primary = [];
  if (options.view === 'grid' || sessionCount > 1) primary.push(viewAction);
  if (canInterrupt) {
    primary.push({
      key: 'interrupt',
      labelKey: 'action.interruptCommand',
      disabled: false,
      danger: true,
    });
  }
  if (reconnectPrimary) primary.push(reconnectAction);

  return {
    primary,
    overflow: [
      { key: 'rename', labelKey: 'action.renameSession', disabled: !hasActiveSession },
      ...(!reconnectPrimary ? [reconnectAction] : []),
      { key: 'closeClosed', labelKey: 'action.closeClosed', disabled: closedCount === 0 },
      {
        key: 'closeOthers',
        labelKey: 'action.closeOthers',
        disabled: !hasActiveSession || sessionCount <= 1,
        danger: true,
      },
      {
        key: 'closeCurrent',
        labelKey: 'action.closeSession',
        disabled: !hasActiveSession,
        danger: true,
      },
    ],
  };
}

export function buildSessionToolbarContext(session, options = {}) {
  if (!session) return null;
  const config = session.config || session.request?.config || {};
  const auth = session.auth || session.request?.auth || {};
  const provider = options.providerName || session.providerType || session.request?.providerType || 'Terminal';
  const target = resolveSessionTarget(config);
  const user = config.username || auth.username || '';
  return {
    iconType: session.providerType || session.request?.providerType || 'terminal',
    identity: user && target ? `${user}@${target}` : target || user,
    provider,
    target,
    user,
  };
}

export function buildDesktopWindowTitle(session, options = {}) {
  const appName = String(options.appName || 'GalaxyTerm').trim() || 'GalaxyTerm';
  const unreadCount = Math.max(0, Math.floor(Number(options.unreadCount) || 0));
  const unreadPrefix = unreadCount > 0 ? `(${unreadCount}) ` : '';
  if (!session) return `${unreadPrefix}${appName}`;

  const context = buildSessionToolbarContext(session, options);
  const label = String(
    session.label
      || session.request?.displayName
      || context?.provider
      || appName,
  ).trim();
  const identity = String(context?.identity || '').trim();
  const parts = [label];
  if (identity && identity.toLocaleLowerCase() !== label.toLocaleLowerCase()) parts.push(identity);

  const suffix = ` — ${appName}`;
  const contextTitle = `${unreadPrefix}${parts.filter(Boolean).join(' · ') || appName}`;
  const maxLength = Math.max(suffix.length + 2, Number(options.maxLength) || 96);
  if (contextTitle.length + suffix.length <= maxLength) return `${contextTitle}${suffix}`;

  const availableLength = maxLength - suffix.length;
  const truncatedContext = `${contextTitle.slice(0, Math.max(1, availableLength - 1)).trimEnd()}…`;
  return `${truncatedContext}${suffix}`;
}

export function buildSessionTabMenuModel(options = {}) {
  const canCloseOthers = (Number(options.sessionCount) || 0) > 1;
  const actions = [
    { key: 'rename', labelKey: 'action.renameSession' },
    { key: 'reconnect', labelKey: 'action.reconnect' },
    { key: 'duplicate', labelKey: 'action.duplicate' },
  ];
  if (Number.isInteger(options.sessionIndex)) {
    actions.push(
      {
        key: 'moveLeft',
        labelKey: 'action.moveSessionLeft',
        disabled: options.sessionIndex <= 0,
        dividerBefore: true,
      },
      {
        key: 'moveRight',
        labelKey: 'action.moveSessionRight',
        disabled: options.sessionIndex >= (Number(options.sessionCount) || 0) - 1,
      },
    );
  }
  actions.push(
    {
      key: 'closeOthers',
      labelKey: 'action.closeOthers',
      disabled: !canCloseOthers,
      danger: true,
    },
    { key: 'closeCurrent', labelKey: 'action.closeSession', danger: true },
  );
  return actions;
}

export function buildSessionContextFacts(session, options = {}) {
  if (!session) return [];
  const config = session.config || session.request?.config || {};
  const auth = session.auth || session.request?.auth || {};
  const facts = [
    { key: 'provider', value: options.providerName || session.providerType || 'terminal', tone: 'neutral' },
  ];
  const target = resolveSessionTarget(config);
  if (target) facts.push({ key: 'target', value: target, tone: 'neutral' });
  const username = config.username || auth.username;
  if (username) {
    facts.push({ key: 'user', value: username, tone: 'neutral' });
  }
  const auditCount = (session.auditEvents || []).length;
  facts.push({ key: 'audit', value: auditCount, tone: auditCount > 0 ? 'success' : 'neutral' });
  facts.push({
    key: 'recording',
    value: resolveRecordingState(session, options),
    tone: options.recordingActive ? 'success' : session.auditRecordSaved ? 'closed' : 'warning',
  });
  return facts;
}

export function buildSessionAuditSummary(session, options = {}) {
  if (!session) {
    return {
      descriptionKey: 'session.audit.noSession.description',
      titleKey: 'session.audit.noSession.title',
      tone: 'info',
      values: {},
    };
  }
  const count = (session.auditEvents || []).length;
  if (session.auditRecordSaved) {
    return {
      descriptionKey: 'session.audit.saved.description',
      titleKey: 'session.audit.saved.title',
      tone: 'success',
      values: { count },
    };
  }
  if (options.recordingActive && session.status !== 'closed') {
    return {
      descriptionKey: 'session.audit.recording.description',
      titleKey: 'session.audit.recording.title',
      tone: 'success',
      values: { count },
    };
  }
  if (session.status === 'closed') {
    return {
      descriptionKey: 'session.audit.closedPending.description',
      titleKey: 'session.audit.closedPending.title',
      tone: 'warning',
      values: { count },
    };
  }
  return {
    descriptionKey: 'session.audit.pending.description',
    titleKey: 'session.audit.pending.title',
    tone: 'warning',
    values: { count },
  };
}

export function filterSessions(sessions = [], options = {}) {
  const queryTokens = String(options.query || '')
    .trim()
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean);
  const status = ['all', 'active', 'connected', 'connecting', 'closed'].includes(options.status)
    ? options.status
    : 'all';

  return [...sessions]
    .filter((session) => matchesSessionStatus(session, status))
    .filter((session) => matchesSessionQuery(session, queryTokens))
    .sort((left, right) => {
      if (left.id === options.activeKey) return -1;
      if (right.id === options.activeKey) return 1;
      return 0;
    });
}

export function buildSessionCloseConfirm(target) {
  if (Array.isArray(target)) {
    if (target.length === 0) return null;
    return {
      contentKey: 'confirm.closeAllSessionsContent',
      contentValues: {
        count: target.length,
      },
      okActionKey: 'action.closeAll',
      titleKey: 'confirm.closeAllSessionsTitle',
    };
  }
  if (target?.mode === 'others') {
    const sessions = target.sessions || [];
    if (sessions.length === 0) return null;
    return {
      contentKey: 'confirm.closeOtherSessionsContent',
      contentValues: {
        count: sessions.length,
      },
      okActionKey: 'action.closeOthers',
      titleKey: 'confirm.closeOtherSessionsTitle',
    };
  }
  if (target?.mode === 'closed') {
    const sessions = target.sessions || [];
    if (sessions.length === 0) return null;
    return {
      contentKey: 'confirm.closeClosedSessionsContent',
      contentValues: {
        count: sessions.length,
      },
      okActionKey: 'action.closeClosed',
      titleKey: 'confirm.closeClosedSessionsTitle',
    };
  }
  if (!target) return null;
  return {
    contentKey: 'confirm.closeSessionContent',
    contentValues: {
      name: target.label || target.displayName || target.providerType || 'Terminal',
      provider: target.providerType || 'terminal',
      status: sessionStatusLabel(target),
    },
    okActionKey: 'action.closeSession',
    titleKey: 'confirm.closeSessionTitle',
  };
}

export function sessionTabDisplay(session = {}, active = false, options = {}) {
  return {
    active,
    iconType: session.providerType || 'terminal',
    statusLabel: sessionStatusLabel(session),
    statusTone: sessionStatusTone(session),
    title: session.label || session.displayName || session.providerType || 'Terminal',
    unread: Boolean(options.unread) && !active,
  };
}

export function recordSessionOutputActivity(activity = {}, options = {}) {
  return recordSessionAttention(activity, {
    ...options,
    kind: 'output',
    occurredAt: options.outputAt,
  });
}

export function recordSessionAttention(activity = {}, options = {}) {
  const sessionId = String(options.sessionId || '').trim();
  const occurredAt = String(options.occurredAt || '').trim();
  const kind = options.kind === 'error' ? 'error' : 'output';
  if (!sessionId || !occurredAt) return activity;
  const isVisible = Array.isArray(options.visibleSessionIds)
    ? options.visibleSessionIds.includes(sessionId)
    : sessionId === options.activeKey;
  const current = activity[sessionId];
  if (isVisible && kind === 'error') {
    if (current?.kind === kind && current?.occurredAt === occurredAt && !current.unread) return activity;
    return {
      ...activity,
      [sessionId]: { kind, occurredAt, unread: false },
    };
  }
  if (isVisible) return markSessionActivityRead(activity, sessionId);
  if (current?.kind === kind && current?.occurredAt === occurredAt) return activity;
  if (current?.unread && current?.kind === 'error' && kind === 'output') return activity;
  if (current?.unread && current?.kind === kind && kind === 'output') return activity;
  return {
    ...activity,
    [sessionId]: { kind, occurredAt, unread: true },
  };
}

export function markSessionActivityRead(activity = {}, sessionId = '') {
  if (!sessionId || !activity[sessionId]?.unread) return activity;
  return {
    ...activity,
    [sessionId]: { ...activity[sessionId], unread: false },
  };
}

export function pruneSessionActivity(activity = {}, sessionIds = []) {
  const retainedIds = new Set(sessionIds);
  const entries = Object.entries(activity).filter(([sessionId]) => retainedIds.has(sessionId));
  if (entries.length === Object.keys(activity).length) return activity;
  return Object.fromEntries(entries);
}

export function countUnreadSessions(activity = {}) {
  return Object.values(activity).filter((item) => item?.unread).length;
}

export function buildSessionAttentionSummary(activity = {}) {
  return Object.values(activity).reduce((summary, item) => {
    if (!item?.unread) return summary;
    return {
      errors: summary.errors + (item.kind === 'error' ? 1 : 0),
      total: summary.total + 1,
    };
  }, { errors: 0, total: 0 });
}

export function moveSessionInOrder(sessions = [], sessionId = '', direction = '') {
  const sourceIndex = sessions.findIndex((session) => session.id === sessionId);
  const offset = direction === 'previous' ? -1 : direction === 'next' ? 1 : 0;
  const targetIndex = sourceIndex + offset;
  if (sourceIndex < 0 || offset === 0 || targetIndex < 0 || targetIndex >= sessions.length) return sessions;
  const next = [...sessions];
  [next[sourceIndex], next[targetIndex]] = [next[targetIndex], next[sourceIndex]];
  return next;
}

export function reorderSessions(sessions = [], sourceId = '', targetId = '', position = 'before') {
  if (!sourceId || sourceId === targetId) return sessions;
  const sourceIndex = sessions.findIndex((session) => session.id === sourceId);
  const targetIndex = sessions.findIndex((session) => session.id === targetId);
  if (sourceIndex < 0 || targetIndex < 0) return sessions;
  const next = [...sessions];
  const [source] = next.splice(sourceIndex, 1);
  const insertionIndex = next.findIndex((session) => session.id === targetId);
  next.splice(insertionIndex + (position === 'after' ? 1 : 0), 0, source);
  return next;
}

export function profileActionModel(profile = {}) {
  return [
    'connect',
    'edit',
    'rename',
    'duplicate',
    profile.favorite ? 'unfavorite' : 'favorite',
    'delete',
  ];
}

function matchesSessionStatus(session, status) {
  if (status === 'all') return true;
  if (status === 'active') return sessionStatusTone(session) !== 'closed';
  return sessionStatusLabel(session) === status;
}

function matchesSessionQuery(session = {}, queryTokens = []) {
  if (queryTokens.length === 0) return true;
  const searchText = [
    session.id,
    session.label,
    session.displayName,
    session.providerType,
    session.status,
    session.config?.host,
    session.config?.username,
    session.config?.workingDirectory,
  ].filter(Boolean).join(' ').toLowerCase();
  return queryTokens.every((token) => searchText.includes(token));
}

function resolveSessionTarget(config = {}) {
  if (config.host) {
    return config.port ? `${config.host}:${config.port}` : config.host;
  }
  return config.workingDirectory || config.cwd || '';
}

function resolveRecordingState(session = {}, options = {}) {
  if (options.recordingActive) return 'active';
  if (session.auditRecordSaved) return 'saved';
  return 'pending';
}

function cloneSessionValue(value) {
  if (Array.isArray(value)) return value.map(cloneSessionValue);
  if (!value || typeof value !== 'object') return value;
  return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, cloneSessionValue(item)]));
}
