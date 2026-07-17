export const ungroupedKey = '__ungrouped__';

export function resolveProfileSaveDefault({ intent = 'session', profile = null } = {}) {
  return Boolean(profile || intent === 'connection');
}

export function shouldPersistConnection({ intent = 'session', saveProfile = false } = {}) {
  return intent !== 'session' || Boolean(saveProfile);
}

export function buildTerminalSubmitPlan({ action = 'create', intent = 'session', saveProfile = false } = {}) {
  return {
    openSession: intent === 'session' || action === 'saveAndOpen',
    persistProfile: shouldPersistConnection({ intent, saveProfile }),
  };
}

export function buildDefaultTerminalLaunch({
  providerName = 'Local Terminal',
  providerType = 'local',
  workingDirectory = '',
} = {}) {
  if (providerType !== 'local') {
    return { kind: 'configure', providerType, request: null };
  }
  return {
    kind: 'open',
    providerType,
    request: {
      auth: {},
      config: {
        shell: '',
        workingDirectory: String(workingDirectory || '').trim(),
      },
      displayName: providerName,
      group: '',
      providerType,
    },
  };
}

export function buildConnectionTransferActions({ profileCount = 0 } = {}) {
  return [
    { key: 'importSshConfig', labelKey: 'action.importSshConfig', disabled: false },
    { key: 'importProfiles', labelKey: 'action.importConnections', disabled: false },
    { key: 'exportProfiles', labelKey: 'action.exportConnections', disabled: profileCount === 0 },
  ];
}

export function buildConnectionGroups(profiles = []) {
  const groups = new Map();
  profiles.forEach((profile) => {
    const key = profile.group || ungroupedKey;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(profile);
  });
  return [...groups.entries()]
    .map(([key, items]) => {
      const sortedProfiles = sortConnectionProfiles(items);
      return {
        credentialCount: sortedProfiles.filter((profile) => profile.auth?.credentialRef).length,
        favoriteCount: sortedProfiles.filter((profile) => profile.favorite).length,
        key,
        profiles: sortedProfiles,
        total: sortedProfiles.length,
      };
    })
    .sort((left, right) => {
      if (left.key === ungroupedKey) return 1;
      if (right.key === ungroupedKey) return -1;
      return left.key.localeCompare(right.key);
    });
}

export function buildConnectionGroupNav(profiles = []) {
  const credentialCount = profiles.filter((profile) => profile.auth?.credentialRef).length;
  const favoriteCount = profiles.filter((profile) => profile.favorite).length;
  return [
    {
      credentialCount,
      favoriteCount,
      key: 'all',
      total: profiles.length,
      type: 'all',
    },
    {
      credentialCount: profiles.filter((profile) => profile.favorite && profile.auth?.credentialRef).length,
      favoriteCount,
      key: 'favorites',
      total: favoriteCount,
      type: 'favorites',
    },
    ...buildConnectionGroups(profiles).map(({
      credentialCount,
      favoriteCount,
      key,
      total,
    }) => ({
      credentialCount,
      favoriteCount,
      key,
      total,
      type: 'group',
    })),
  ];
}

export function selectBatchProfiles(
  profiles = [],
  {
    availableProviders,
    favoritesOnly = false,
    group = 'all',
    providerType = 'all',
    sortBy = 'favorites',
  } = {},
) {
  const availableProviderTypes = Array.isArray(availableProviders)
    ? new Set(availableProviders.map((provider) => provider.type).filter(Boolean))
    : null;
  return sortConnectionProfiles(profiles.filter((profile) => {
    const matchesFavorite = !favoritesOnly || profile.favorite;
    const matchesProvider = providerType === 'all' || profile.providerType === providerType;
    const matchesAvailableProvider = !availableProviderTypes || availableProviderTypes.has(profile.providerType);
    const profileGroup = profile.group || ungroupedKey;
    const matchesGroup = group === 'all' || profileGroup === group;
    return matchesFavorite && matchesProvider && matchesAvailableProvider && matchesGroup;
  }), sortBy);
}

export function filterConnectionProfiles(
  profiles = [],
  {
    group = 'all',
    providerType = 'all',
    query = '',
  } = {},
) {
  const tokens = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
  return profiles.filter((profile) => {
    const profileGroup = profile.group || ungroupedKey;
    const groupMatched = group === 'all'
      || (group === 'favorites' && profile.favorite)
      || profileGroup === group;
    if (!groupMatched) return false;
    if (providerType !== 'all' && profile.providerType !== providerType) return false;
    if (tokens.length === 0) return true;
    const searchable = [
      profile.displayName,
      profile.group,
      profile.providerType,
      profile.config?.host,
      profile.config?.shell,
      profile.config?.workingDirectory,
      profile.auth?.username,
    ].filter(Boolean).join(' ').toLowerCase();
    return tokens.every((token) => searchable.includes(token));
  });
}

export function buildConnectionEmptyState({
  profileCount = 0,
  visibleCount = 0,
  hasFilters = false,
} = {}) {
  if (visibleCount > 0) return null;
  if (profileCount === 0) {
    return {
      kind: 'empty',
      titleKey: 'connection.empty.noProfiles.title',
      descriptionKey: 'connection.empty.noProfiles.description',
      primaryAction: 'quickSsh',
      secondaryActions: ['importSshConfig', 'newConnection'],
    };
  }
  if (hasFilters) {
    return {
      kind: 'filtered',
      titleKey: 'connection.empty.filtered.title',
      descriptionKey: 'connection.empty.filtered.description',
      primaryAction: 'clearFilters',
      secondaryActions: ['quickSsh', 'importSshConfig'],
    };
  }
  return {
    kind: 'emptyGroup',
    titleKey: 'connection.empty.group.title',
    descriptionKey: 'connection.empty.group.description',
    primaryAction: 'quickSsh',
    secondaryActions: ['clearFilters', 'importSshConfig'],
  };
}

export function resolveSelectedProfileId(profiles = [], selectedProfileId = '', options = {}) {
  if (profiles.some((profile) => profile.id === selectedProfileId)) return selectedProfileId;
  if (options.fallbackToFirst === false) return '';
  return profiles[0]?.id || '';
}

export function summarizeProfileSessions(profiles = [], sessions = []) {
  const profileIds = new Set(profiles.map((profile) => profile.id).filter(Boolean));
  const summary = new Map(profiles.map((profile) => [profile.id, {
    activeCount: 0,
    focusSessionId: '',
  }]));
  sessions.forEach((session) => {
    const profileId = session.request?.profileId;
    if (!profileIds.has(profileId) || session.status === 'closed') return;
    const item = summary.get(profileId);
    item.activeCount += 1;
    if (!item.focusSessionId) item.focusSessionId = session.id;
  });
  return summary;
}

export function sortConnectionProfiles(profiles = [], sortBy = 'favorites') {
  return [...profiles].sort((left, right) => {
    if (sortBy === 'name') return compareText(left.displayName, right.displayName);
    if (sortBy === 'provider') {
      return compareText(left.providerType, right.providerType)
        || compareText(left.displayName, right.displayName);
    }
    if (sortBy === 'group') {
      return compareGroup(left.group || ungroupedKey, right.group || ungroupedKey)
        || compareText(left.displayName, right.displayName);
    }
    if (sortBy === 'recent') {
      return compareDateDesc(left.lastUsedAt, right.lastUsedAt)
        || compareText(left.displayName, right.displayName);
    }
    const favoriteDelta = Number(!!right.favorite) - Number(!!left.favorite);
    return favoriteDelta || compareText(left.displayName, right.displayName);
  });
}

export function sortSidebarProfiles(profiles = [], limit = 5, { availableProviders } = {}) {
  const availableProviderTypes = Array.isArray(availableProviders)
    ? new Set(availableProviders.map((provider) => provider.type).filter(Boolean))
    : null;
  return profiles
    .filter((profile) => !availableProviderTypes || availableProviderTypes.has(profile.providerType))
    .sort((left, right) => {
      const favoriteDelta = Number(!!right.favorite) - Number(!!left.favorite);
      return favoriteDelta
        || compareDateDesc(left.lastUsedAt, right.lastUsedAt)
        || compareText(left.displayName, right.displayName);
    })
    .slice(0, limit);
}

export function buildConnectionProfileBadges(profile = {}, sessionInfo = {}, options = {}) {
  return [
    {
      key: 'group',
      tone: 'default',
      value: profile.group || ungroupedKey,
    },
    sessionInfo.activeCount > 0 && {
      key: 'sessions',
      tone: 'success',
      value: sessionInfo.activeCount,
    },
    profile.favorite && {
      key: 'favorite',
      tone: 'warning',
      value: true,
    },
    profile.auth?.credentialRef && {
      key: 'credential',
      tone: 'info',
      value: true,
    },
    options.providerAvailable === false && {
      key: 'providerUnavailable',
      tone: 'warning',
      value: true,
    },
  ].filter(Boolean);
}

export function isProfileProviderAvailable(profile = {}, providers = []) {
  return providers.some((provider) => provider.type === profile.providerType);
}

export function filterRecentConnectionsByProviders(connections = [], providers = [], profiles = []) {
  const providerTypes = new Set(providers.map((provider) => provider.type).filter(Boolean));
  const profileIds = new Set(profiles.map((profile) => profile.id).filter(Boolean));
  const profileFingerprints = new Set(profiles.map(connectionFingerprint).filter(Boolean));
  return connections.filter((connection) => {
    const providerType = connection.providerType || connection.request?.providerType;
    if (!providerTypes.has(providerType)) return false;
    const profileId = connection.request?.profileId || connection.profileId;
    if (profileId && profileIds.has(profileId)) return false;
    const fingerprint = connectionFingerprint(connection);
    return !fingerprint || !profileFingerprints.has(fingerprint);
  });
}

export function buildConnectionProfileFacts(profile = {}, { defaultShellLabel = 'default shell' } = {}) {
  if (profile.providerType === 'ssh') {
    return [
      { key: 'host', value: profile.config?.host || '-' },
      { key: 'port', value: profile.config?.port || 22 },
      { key: 'username', value: profile.auth?.username || '-' },
      { key: 'lastUsed', value: profile.lastUsedAt || '' },
      profile.config?.jumpHost && { key: 'jumpHost', value: profile.config.jumpHost },
    ].filter(Boolean);
  }
  return [
    { key: 'shell', value: profile.config?.shell || defaultShellLabel },
    profile.config?.workingDirectory && { key: 'workingDirectory', value: profile.config.workingDirectory },
    { key: 'lastUsed', value: profile.lastUsedAt || '' },
  ].filter(Boolean);
}

export function buildConnectionProfileSubtitle(profile = {}, { defaultShellLabel = 'default shell' } = {}) {
  if (profile.providerType === 'ssh') {
    const host = profile.config?.host || '-';
    const port = profile.config?.port || 22;
    const username = profile.auth?.username;
    return `${username ? `${username}@` : ''}${host}:${port}`;
  }
  return profile.config?.shell || defaultShellLabel;
}

export function buildConnectionProfileHints(sessionInfo = {}) {
  return [
    sessionInfo.activeCount > 0 && 'focusOpenSession',
    'enterOpen',
    'doubleClickOpen',
  ].filter(Boolean);
}

export function buildConnectionProfilePrimaryAction({
  providerAvailable = true,
  sessionInfo = {},
} = {}) {
  if (sessionInfo.activeCount > 0 && sessionInfo.focusSessionId) {
    return {
      action: 'focus',
      disabled: false,
      labelKey: 'action.focusSession',
      reasonKey: '',
    };
  }
  return {
    action: 'connect',
    disabled: !providerAvailable,
    labelKey: 'action.connect',
    reasonKey: providerAvailable ? '' : 'palette.reason.providerUnavailable',
  };
}

export function buildConnectionProfileStatusSummary({
  providerAvailable = true,
  sessionInfo = {},
} = {}) {
  if (!providerAvailable) {
    return {
      descriptionKey: 'connection.status.unavailable.description',
      titleKey: 'connection.status.unavailable.title',
      tone: 'warning',
      values: {},
    };
  }
  if (sessionInfo.activeCount > 0 && sessionInfo.focusSessionId) {
    return {
      descriptionKey: 'connection.status.active.description',
      titleKey: 'connection.status.active.title',
      tone: 'success',
      values: { count: sessionInfo.activeCount },
    };
  }
  return {
    descriptionKey: 'connection.status.ready.description',
    titleKey: 'connection.status.ready.title',
    tone: 'info',
    values: {},
  };
}

function compareText(left = '', right = '') {
  return String(left || '').localeCompare(String(right || ''));
}

function connectionFingerprint(connection = {}) {
  const request = connection.request || connection;
  const providerType = request.providerType || connection.providerType || '';
  if (providerType === 'ssh') {
    const host = String(request.config?.host || '').trim().toLowerCase();
    if (!host) return '';
    const username = String(request.auth?.username || '').trim();
    return `ssh:${username}@${host}:${request.config?.port || 22}`;
  }
  if (providerType === 'local') {
    return `local:${String(request.config?.shell || 'default').trim() || 'default'}`;
  }
  return '';
}

function compareGroup(left, right) {
  if (left === ungroupedKey && right !== ungroupedKey) return 1;
  if (right === ungroupedKey && left !== ungroupedKey) return -1;
  return compareText(left, right);
}

function compareDateDesc(left, right) {
  const leftTime = Date.parse(left || '') || 0;
  const rightTime = Date.parse(right || '') || 0;
  return rightTime - leftTime;
}
