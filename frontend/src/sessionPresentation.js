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
