export function sessionStatusTone(session = {}) {
  const status = session?.status;
  if (status === 'connected') return 'success';
  if (status === 'closed') return 'closed';
  return 'connecting';
}

export function sessionStatusLabel(session = {}) {
  const status = session?.status;
  if (status === 'connected') return 'connected';
  if (status === 'closed') return 'closed';
  return 'connecting';
}

export function sessionSummary(sessions = []) {
  return sessions.reduce((summary, session) => {
    const tone = sessionStatusTone(session);
    return {
      active: tone === 'closed' ? summary.active : summary.active + 1,
      closed: tone === 'closed' ? summary.closed + 1 : summary.closed,
      connected: tone === 'success' ? summary.connected + 1 : summary.connected,
      connecting: tone === 'connecting' ? summary.connecting + 1 : summary.connecting,
      total: summary.total + 1,
    };
  }, {
    active: 0,
    closed: 0,
    connected: 0,
    connecting: 0,
    total: 0,
  });
}

export function buildSessionStatusFacts(summary = {}) {
  return [
    { key: 'connected', value: summary.connected || 0, tone: 'success' },
    { key: 'connecting', value: summary.connecting || 0, tone: 'warning' },
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
  const canNavigate = Boolean(options.canNavigate);
  const sessionCount = Number(options.sessionCount) || 0;
  const closedCount = Number(options.closedCount) || 0;
  const viewAction = options.view === 'grid'
    ? { key: 'tabs', labelKey: 'action.tabs', disabled: false }
    : { key: 'grid', labelKey: 'action.grid', disabled: false };

  const primary = [];
  if (options.view === 'grid' || sessionCount > 1) primary.push(viewAction);
  if (canNavigate) {
    primary.push(
      { key: 'previous', labelKey: 'action.previousSession', disabled: false },
      { key: 'next', labelKey: 'action.nextSession', disabled: false },
    );
  }
  primary.push({ key: 'reconnect', labelKey: 'action.reconnect', disabled: !hasActiveSession });

  return {
    primary,
    overflow: [
      { key: 'rename', labelKey: 'action.renameSession', disabled: !hasActiveSession },
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

export function buildSessionTabMenuModel(options = {}) {
  const canCloseOthers = (Number(options.sessionCount) || 0) > 1;
  return [
    { key: 'rename', labelKey: 'action.renameSession' },
    { key: 'reconnect', labelKey: 'action.reconnect' },
    { key: 'duplicate', labelKey: 'action.duplicate' },
    {
      key: 'closeOthers',
      labelKey: 'action.closeOthers',
      disabled: !canCloseOthers,
      danger: true,
    },
    { key: 'closeCurrent', labelKey: 'action.closeSession', danger: true },
  ];
}

export function buildSessionContextFacts(session, options = {}) {
  if (!session) return [];
  const facts = [
    { key: 'provider', value: session.providerType || 'terminal', tone: 'neutral' },
  ];
  const target = resolveSessionTarget(session);
  if (target) facts.push({ key: 'target', value: target, tone: 'neutral' });
  if (session.config?.username) {
    facts.push({ key: 'user', value: session.config.username, tone: 'neutral' });
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

export function sessionTabDisplay(session = {}, active = false) {
  return {
    active,
    iconType: session.providerType || 'terminal',
    statusLabel: sessionStatusLabel(session),
    statusTone: sessionStatusTone(session),
    title: session.label || session.displayName || session.providerType || 'Terminal',
  };
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

function resolveSessionTarget(session = {}) {
  const { config = {} } = session;
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
