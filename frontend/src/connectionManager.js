export const ungroupedKey = '__ungrouped__';
const groupFilterPrefix = 'group:';

export function buildConnectionGroupFilter(group = ungroupedKey) {
  const groupKey = String(group || ungroupedKey).trim() || ungroupedKey;
  return `${groupFilterPrefix}${encodeURIComponent(groupKey)}`;
}

export function resolveConnectionGroupFilter(filter = 'all') {
  if (filter === 'all') return { group: '', type: 'all' };
  if (filter === 'favorites') return { group: '', type: 'favorites' };
  if (String(filter).startsWith(groupFilterPrefix)) {
    const value = String(filter).slice(groupFilterPrefix.length);
    try {
      return { group: decodeURIComponent(value) || ungroupedKey, type: 'group' };
    } catch {
      return { group: value || ungroupedKey, type: 'group' };
    }
  }
  return { group: String(filter || ungroupedKey), type: 'group' };
}

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
        workingDirectory: String(workingDirectory || '~').trim() || '~',
      },
      displayName: providerName,
      group: '',
      providerType,
    },
  };
}

export function buildConnectionLaunchKey(request = {}) {
  const profileId = String(request.profileId || '').trim();
  if (profileId) return `profile:${profileId}`;
  const providerType = String(request.providerType || '').trim();
  if (!providerType) return '';
  const config = request.config || {};
  const target = [
    config.host,
    config.endpoint,
    config.pod,
    config.container,
    config.workingDirectory,
    config.database,
  ].find((value) => value !== undefined && value !== null && String(value).trim());
  return [
    'request',
    providerType,
    String(request.displayName || '').trim(),
    String(target || '').trim(),
  ].map((value) => encodeURIComponent(value)).join(':');
}

export function reserveConnectionLaunchRequests(pendingKeys = [], requests = []) {
  const pending = new Set(pendingKeys.filter(Boolean));
  const acceptedRequests = [];
  const blockedKeys = [];
  requests.forEach((request) => {
    const key = buildConnectionLaunchKey(request);
    if (key && pending.has(key)) {
      blockedKeys.push(key);
      return;
    }
    acceptedRequests.push(request);
    if (key) pending.add(key);
  });
  return {
    acceptedRequests,
    blockedKeys,
    pendingKeys: [...pending],
  };
}

export function releaseConnectionLaunchRequests(pendingKeys = [], requests = []) {
  const released = new Set(requests.map(buildConnectionLaunchKey).filter(Boolean));
  return pendingKeys.filter((key) => !released.has(key));
}

export function isProfileConnectionLaunching(profile = {}, pendingKeys = []) {
  const profileId = String(profile.id || '').trim();
  return profileId ? pendingKeys.includes(`profile:${profileId}`) : false;
}

export function reconcileConnectionProfileSelection(selectedIds = [], profileIds = []) {
  const availableIds = new Set(profileIds.filter(Boolean));
  return selectedIds.filter((id, index, items) => (
    availableIds.has(id) && items.indexOf(id) === index
  ));
}

export function resolveConnectionProfileSelection(
  selectedIds = [],
  profileId = '',
  orderedIds = [],
  { anchorId = '', range = false } = {},
) {
  const availableIds = orderedIds.filter(Boolean);
  if (!profileId || !availableIds.includes(profileId)) {
    return {
      anchorId,
      selectedIds: reconcileConnectionProfileSelection(selectedIds, availableIds),
    };
  }
  const selected = new Set(reconcileConnectionProfileSelection(selectedIds, availableIds));
  if (range && availableIds.includes(anchorId)) {
    const start = availableIds.indexOf(anchorId);
    const end = availableIds.indexOf(profileId);
    availableIds.slice(Math.min(start, end), Math.max(start, end) + 1)
      .forEach((id) => selected.add(id));
    return { anchorId, selectedIds: availableIds.filter((id) => selected.has(id)) };
  }
  if (selected.has(profileId)) selected.delete(profileId);
  else selected.add(profileId);
  return { anchorId: profileId, selectedIds: availableIds.filter((id) => selected.has(id)) };
}

export function setVisibleConnectionProfileSelection(selectedIds = [], visibleIds = [], selected = true) {
  const next = new Set(selectedIds.filter(Boolean));
  visibleIds.filter(Boolean).forEach((id) => {
    if (selected) next.add(id);
    else next.delete(id);
  });
  return [...next];
}

export function buildConnectionSelectionActionState(
  profiles = [],
  selectedIds = [],
  { availableProviders } = {},
) {
  const ids = new Set(selectedIds.filter(Boolean));
  const selectedProfiles = profiles.filter((profile) => ids.has(profile.id));
  const providerTypes = Array.isArray(availableProviders)
    ? new Set(availableProviders.map((provider) => provider.type).filter(Boolean))
    : null;
  const selectedCount = selectedProfiles.length;
  return {
    allFavorite: selectedCount > 0 && selectedProfiles.every((profile) => profile.favorite),
    openableCount: selectedProfiles.filter((profile) => (
      profile.kind !== 'file'
      && (!providerTypes || providerTypes.has(profile.providerType))
    )).length,
    selectedCount,
  };
}

export function updateConnectionProfilesFavorite(profiles = [], profileIds = [], favorite = true) {
  const ids = new Set(profileIds.filter(Boolean));
  let changedCount = 0;
  const nextProfiles = profiles.map((profile) => {
    if (!ids.has(profile.id) || Boolean(profile.favorite) === Boolean(favorite)) return profile;
    changedCount += 1;
    return { ...profile, favorite: Boolean(favorite) };
  });
  return {
    changedCount,
    profiles: changedCount > 0 ? nextProfiles : profiles,
  };
}

export function removeConnectionProfiles(profiles = [], profileIds = []) {
  const ids = new Set(profileIds.filter(Boolean));
  const removedProfiles = profiles.filter((profile) => ids.has(profile.id));
  if (removedProfiles.length === 0) return { profiles, removedProfiles };
  return {
    profiles: profiles.filter((profile) => !ids.has(profile.id)),
    removedProfiles,
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
      groupKey: key,
      key: buildConnectionGroupFilter(key),
      total,
      type: 'group',
    })),
  ];
}

export function renameConnectionGroup(profiles = [], sourceGroup = '', targetGroup = '') {
  const sourceKey = normalizeConnectionGroupKey(sourceGroup);
  const target = normalizeConnectionGroupName(targetGroup);
  return updateConnectionProfileGroups(profiles, {
    matches: (profile) => normalizeConnectionGroupKey(profile.group) === sourceKey,
    targetGroup: target,
  });
}

export function moveConnectionProfilesToGroup(profiles = [], profileIds = [], targetGroup = '') {
  const ids = new Set((Array.isArray(profileIds) ? profileIds : [profileIds]).filter(Boolean));
  const target = normalizeConnectionGroupName(targetGroup);
  return updateConnectionProfileGroups(profiles, {
    matches: (profile) => ids.has(profile.id),
    targetGroup: target,
  });
}

export function removeConnectionGroup(profiles = [], sourceGroup = '') {
  return renameConnectionGroup(profiles, sourceGroup, '');
}

export function resolveConnectionProfileDrop(profile = {}, target = {}) {
  if (!profile.id) return null;
  if (target.type === 'favorites') {
    if (profile.favorite) return null;
    return {
      action: 'favorite',
      profileId: profile.id,
      targetGroup: '',
      targetKey: target.key || 'favorites',
    };
  }
  if (target.type !== 'group') return null;
  const targetGroup = target.groupKey === ungroupedKey
    ? ''
    : normalizeConnectionGroupName(target.groupKey);
  if (normalizeConnectionGroupName(profile.group) === targetGroup) return null;
  return {
    action: 'move',
    profileId: profile.id,
    targetGroup,
    targetKey: target.key || buildConnectionGroupFilter(target.groupKey),
  };
}

export function normalizeConnectionGroupName(group = '') {
  const normalized = String(group || '').trim().slice(0, 80);
  return normalized === ungroupedKey ? '' : normalized;
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
  const groupFilter = resolveConnectionGroupFilter(group);
  const availableProviderTypes = Array.isArray(availableProviders)
    ? new Set(availableProviders.map((provider) => provider.type).filter(Boolean))
    : null;
  return sortConnectionProfiles(profiles.filter((profile) => {
    if (profile.kind === 'file') return false;
    const matchesFavorite = !favoritesOnly || profile.favorite;
    const matchesProvider = providerType === 'all' || profile.providerType === providerType;
    const matchesAvailableProvider = !availableProviderTypes || availableProviderTypes.has(profile.providerType);
    const profileGroup = profile.group || ungroupedKey;
    const matchesGroup = groupFilter.type === 'all'
      || (groupFilter.type === 'favorites' && profile.favorite)
      || (groupFilter.type === 'group' && profileGroup === groupFilter.group);
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
  const groupFilter = resolveConnectionGroupFilter(group);
  const tokens = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
  return profiles.filter((profile) => {
    const profileGroup = profile.group || ungroupedKey;
    const groupMatched = groupFilter.type === 'all'
      || (groupFilter.type === 'favorites' && profile.favorite)
      || profileGroup === groupFilter.group;
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
      profile.filePath,
      ...Object.values(profile.config || {}),
      profile.auth?.username,
    ].filter(Boolean).join(' ').toLowerCase();
    return tokens.every((token) => searchable.includes(token));
  });
}

function normalizeConnectionGroupKey(group = '') {
  return normalizeConnectionGroupName(group) || ungroupedKey;
}

function updateConnectionProfileGroups(profiles, { matches, targetGroup }) {
  let changedCount = 0;
  const nextProfiles = profiles.map((profile) => {
    if (!matches(profile) || normalizeConnectionGroupName(profile.group) === targetGroup) return profile;
    changedCount += 1;
    return { ...profile, group: targetGroup };
  });
  return {
    changedCount,
    profiles: changedCount > 0 ? nextProfiles : profiles,
    targetGroup,
  };
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
    profile.kind === 'file' && {
      key: 'fileWorkspace',
      tone: 'info',
      value: true,
    },
    sessionInfo.activeCount > 0 && {
      key: 'sessions',
      tone: 'success',
      value: sessionInfo.activeCount,
    },
    options.launching && {
      key: 'launching',
      tone: 'info',
      value: true,
    },
    options.healthBadge,
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
  if (profile.kind === 'file') {
    return [
      { key: 'endpoint', value: fileConnectionEndpoint(profile) },
      { key: 'path', value: profile.filePath || '.' },
      { key: 'lastUsed', value: profile.lastUsedAt || '' },
    ];
  }
  if (profile.providerType !== 'local') {
    return [
      ...Object.entries(profile.config || {}).slice(0, 3).map(([key, value]) => ({ key, value })),
      { key: 'lastUsed', value: profile.lastUsedAt || '' },
    ];
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
  if (profile.kind === 'file') {
    return `${fileConnectionEndpoint(profile)} · ${profile.filePath || '.'}`;
  }
  if (profile.providerType !== 'local') return terminalConnectionEndpoint(profile);
  return profile.config?.shell || defaultShellLabel;
}

export function buildConnectionProfileHints(sessionInfo = {}) {
  return [
    sessionInfo.activeCount > 0 && 'focusOpenSession',
    sessionInfo.activeCount > 0 && 'secondaryOpenNew',
    'enterOpen',
  ].filter(Boolean);
}

export function buildConnectionProfilePrimaryAction({
  profileKind = 'terminal',
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
  if (!providerAvailable) {
    return {
      action: 'findExtension',
      disabled: false,
      labelKey: 'action.findExtension',
      reasonKey: '',
    };
  }
  if (profileKind === 'file') {
    return {
      action: 'openFiles',
      disabled: false,
      labelKey: 'action.openFiles',
      reasonKey: '',
    };
  }
  return {
    action: 'connect',
    disabled: false,
    labelKey: 'action.connect',
    reasonKey: '',
  };
}

export function buildConnectionProfileLaunchModel(options = {}) {
  let primary = buildConnectionProfilePrimaryAction(options);
  if (options.launching && primary.action !== 'focus') {
    primary = {
      ...primary,
      disabled: true,
      labelKey: 'action.openingConnection',
      reasonKey: 'message.connectionLaunchInProgress',
    };
  }
  if (primary.action !== 'focus') return { primary, secondary: null };
  if (options.providerAvailable === false) {
    return {
      primary,
      secondary: {
        action: 'findExtension',
        disabled: false,
        labelKey: 'action.findExtension',
        reasonKey: '',
      },
    };
  }
  return {
    primary,
    secondary: {
      action: options.profileKind === 'file' ? 'openFiles' : 'connect',
      disabled: Boolean(options.launching),
      labelKey: options.launching
        ? 'action.openingConnection'
        : options.profileKind === 'file' ? 'action.openFiles' : 'action.newTerminal',
      reasonKey: options.launching ? 'message.connectionLaunchInProgress' : '',
    },
  };
}

export function buildConnectionProfileStatusSummary({
  launching = false,
  profileKind = 'terminal',
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
  if (launching) {
    return {
      descriptionKey: 'connection.status.opening.description',
      titleKey: 'connection.status.opening.title',
      tone: 'info',
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
  if (profileKind === 'file') {
    return {
      descriptionKey: 'connection.status.fileReady.description',
      titleKey: 'connection.status.fileReady.title',
      tone: 'info',
      values: {},
    };
  }
  return {
    descriptionKey: 'connection.status.ready.description',
    titleKey: 'connection.status.ready.title',
    tone: 'info',
    values: {},
  };
}

function fileConnectionEndpoint(profile = {}) {
  const config = profile.config || {};
  return config.endpoint
    || config.host
    || config.bucket
    || Object.values(config).find((value) => typeof value === 'string' && value.trim())
    || profile.providerType
    || '-';
}

function terminalConnectionEndpoint(profile = {}) {
  const config = profile.config || {};
  const host = config.host || config.endpoint;
  if (host) return `${host}${config.port ? `:${config.port}` : ''}`;
  if (config.pod) return `${config.namespace ? `${config.namespace} / ` : ''}${config.pod}`;
  if (config.container) return String(config.container);
  if (config.database !== undefined && config.database !== '') return String(config.database);
  return Object.values(config).find((value) => ['string', 'number'].includes(typeof value))?.toString()
    || profile.providerType
    || '-';
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
  const config = Object.fromEntries(Object.entries(request.config || {}).sort(([left], [right]) => left.localeCompare(right)));
  return providerType ? `${providerType}:${JSON.stringify(config)}` : '';
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
