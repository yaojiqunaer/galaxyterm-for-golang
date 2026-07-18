export function summarizeWorkspace({
  auditRecords = [],
  installedExtensions = [],
  profiles = [],
  providers = [],
  recentConnections = [],
  sessions = [],
  tunnels = [],
} = {}) {
  const sessionCounts = sessions.reduce((counts, session) => {
    const status = session.status || 'connecting';
    return {
      ...counts,
      active: status === 'closed' ? counts.active : counts.active + 1,
      closed: status === 'closed' ? counts.closed + 1 : counts.closed,
      connected: status === 'connected' ? counts.connected + 1 : counts.connected,
      connecting: status === 'connecting' ? counts.connecting + 1 : counts.connecting,
      total: counts.total + 1,
    };
  }, {
    active: 0,
    closed: 0,
    connected: 0,
    connecting: 0,
    total: 0,
  });

  return {
    auditRecords: auditRecords.length,
    installedExtensions: installedExtensions.length,
    profiles: {
      favorites: profiles.filter((profile) => profile.favorite).length,
      total: profiles.length,
    },
    providers: {
      builtin: providers.filter((provider) => provider.category !== 'extension').length,
      extensions: providers.filter((provider) => provider.category === 'extension').length,
      total: providers.length,
    },
    recentConnections: recentConnections.length,
    sessions: sessionCounts,
    tunnels: tunnels.length,
  };
}

export function filterAuditRecords(records = [], {
  providerType = 'all',
  query = '',
  sessionId = 'all',
} = {}) {
  const normalizedQuery = query.trim().toLowerCase();
  return records.filter((record) => {
    const matchesSession = sessionId === 'all' || record.sessionId === sessionId;
    if (!matchesSession) return false;
    const matchesProvider = providerType === 'all' || record.providerType === providerType;
    if (!matchesProvider) return false;
    if (!normalizedQuery) return true;
    const eventText = (record.auditEvents || [])
      .map((event) => `${event.type || ''} ${event.detail || ''}`)
      .join(' ');
    return [
      record.title,
      record.providerType,
      record.startedAt,
      record.endedAt,
      eventText,
    ].some((value) => String(value || '').toLowerCase().includes(normalizedQuery));
  });
}

export function buildExtensionCatalog({
  installedExtensions = [],
  officialExtensions = [],
  providers = [],
} = {}) {
  const installedProviderTypes = new Set(installedExtensions.flatMap((extension) => (
    [...(extension.providers || []), ...(extension.fileProviders || [])]
  ).map((provider) => provider.type)));
  const builtinItems = providers.map((provider) => ({
    ...provider,
    status: provider.category === 'extension' ? 'installed' : 'builtin',
  }));
  const officialItems = officialExtensions
    .filter((extension) => !providers.some((provider) => provider.type === extension.type))
    .map((extension) => ({
      ...extension,
      status: installedProviderTypes.has(extension.type) ? 'installed' : 'planned',
    }));
  return [...builtinItems, ...officialItems];
}
