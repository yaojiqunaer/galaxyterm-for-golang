export function sessionStatusTone(session = {}) {
  if (session.status === 'connected') return 'success';
  if (session.status === 'closed') return 'closed';
  return 'connecting';
}

export function sessionStatusLabel(session = {}) {
  if (session.status === 'connected') return 'connected';
  if (session.status === 'closed') return 'closed';
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
