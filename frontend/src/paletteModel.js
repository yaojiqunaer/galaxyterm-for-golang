export function filterPaletteItems(items = [], query = '') {
  const keywords = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
  if (keywords.length === 0) return items;
  return items
    .map((item, index) => ({ item, index, score: scorePaletteItem(item, keywords) }))
    .filter((entry) => entry.score < Number.POSITIVE_INFINITY)
    .sort((left, right) => left.score - right.score || left.index - right.index)
    .map((entry) => entry.item);
}

export function buildPaletteSummary(items = []) {
  const groups = [];
  const seen = new Map();
  items.forEach((item) => {
    const group = item.group || '';
    if (!group) return;
    if (!seen.has(group)) {
      seen.set(group, { group, count: 0 });
      groups.push(seen.get(group));
    }
    seen.get(group).count += 1;
  });
  return {
    total: items.length,
    groups,
  };
}

export function buildProfilePaletteItems({
  groupLabel = 'Connections',
  iconForProfile = () => null,
  profiles = [],
  providers = [],
  runProfile = () => {},
  subtitleForProfile = () => '',
} = {}) {
  const providerTypes = new Set(providers.map((provider) => provider.type).filter(Boolean));
  return profiles.map((profile) => {
    const providerAvailable = providerTypes.has(profile.providerType);
    const description = subtitleForProfile(profile);
    return {
      disabled: !providerAvailable,
      group: groupLabel,
      id: `profile:${profile.id}`,
      icon: iconForProfile(profile),
      keywords: `${profile.displayName || ''} ${profile.group || ''} ${description}`,
      profile,
      reasonKey: providerAvailable ? '' : 'palette.reason.providerUnavailable',
      title: profile.displayName || profile.providerType || '',
      description,
      run: () => runProfile(profile),
    };
  });
}

export function buildSessionActionPaletteItems({
  activeSessionId = '',
  canNavigate = false,
  closedSessionCount = 0,
  groupLabel = 'Session Actions',
  labels = {},
  runAction = () => {},
  sessionCount = 0,
} = {}) {
  return [
    sessionActionItem('previousSession', {
      disabled: !canNavigate,
      groupLabel,
      keywords: 'previous session tab switch',
      labels,
      reasonKey: canNavigate ? '' : 'palette.reason.noAdjacentSession',
      runAction,
    }),
    sessionActionItem('nextSession', {
      disabled: !canNavigate,
      groupLabel,
      keywords: 'next session tab switch',
      labels,
      reasonKey: canNavigate ? '' : 'palette.reason.noAdjacentSession',
      runAction,
    }),
    sessionActionItem('reconnect', activeSessionActionOptions({
      activeSessionId,
      groupLabel,
      keywords: 'reconnect retry recover session terminal',
      labels,
      runAction,
    })),
    sessionActionItem('renameSession', activeSessionActionOptions({
      activeSessionId,
      groupLabel,
      keywords: 'rename session tab title',
      labels,
      runAction,
    })),
    sessionActionItem('clearTerminal', {
      disabled: !activeSessionId,
      groupLabel,
      keywords: 'clear terminal screen output',
      labels,
      reasonKey: activeSessionId ? '' : 'palette.reason.noActiveSession',
      runAction,
    }),
    sessionActionItem('copyTranscript', activeSessionActionOptions({
      activeSessionId,
      groupLabel,
      keywords: 'copy transcript terminal output',
      labels,
      runAction,
    })),
    sessionActionItem('exportTranscript', activeSessionActionOptions({
      activeSessionId,
      groupLabel,
      keywords: 'export transcript terminal output download',
      labels,
      runAction,
    })),
    sessionActionItem('saveAudit', activeSessionActionOptions({
      activeSessionId,
      groupLabel,
      keywords: 'save audit record recording log',
      labels,
      runAction,
    })),
    sessionActionItem('closeSession', activeSessionActionOptions({
      activeSessionId,
      groupLabel,
      keywords: 'close current session tab',
      labels,
      runAction,
    })),
    sessionActionItem('closeClosed', {
      disabled: closedSessionCount <= 0,
      groupLabel,
      keywords: 'close closed sessions cleanup clear tabs',
      labels,
      reasonKey: closedSessionCount > 0 ? '' : 'palette.reason.noClosedSession',
      runAction,
    }),
    sessionActionItem('closeOthers', {
      disabled: !activeSessionId || sessionCount <= 1,
      groupLabel,
      keywords: 'close other sessions tabs cleanup',
      labels,
      reasonKey: !activeSessionId ? 'palette.reason.noActiveSession' : 'palette.reason.noOtherSession',
      runAction,
    }),
    sessionActionItem('closeAll', {
      disabled: sessionCount <= 0,
      groupLabel,
      keywords: 'close all sessions tabs cleanup',
      labels,
      reasonKey: sessionCount > 0 ? '' : 'palette.reason.noSession',
      runAction,
    }),
    sessionActionItem('commandHistory', {
      groupLabel,
      keywords: 'history command commands recent',
      labels,
      runAction,
    }),
    sessionActionItem('quickCommands', {
      groupLabel,
      keywords: 'quick commands snippets saved',
      labels,
      runAction,
    }),
  ];
}

export function buildConnectionActionPaletteItems({
  favoriteCount = 0,
  groupLabel = 'Connection Actions',
  labels = {},
  runAction = () => {},
  savedConnectionCount = 0,
} = {}) {
  return [
    connectionActionItem('newLocalTerminal', {
      groupLabel,
      keywords: 'new local terminal shell',
      labels,
      runAction,
    }),
    connectionActionItem('quickSsh', {
      groupLabel,
      keywords: 'quick ssh terminal server host',
      labels,
      runAction,
    }),
    connectionActionItem('newConnection', {
      groupLabel,
      keywords: 'new connection profile save',
      labels,
      runAction,
    }),
    connectionActionItem('importSshConfig', {
      groupLabel,
      keywords: 'import ssh config openssh profile',
      labels,
      runAction,
    }),
    connectionActionItem('importProfiles', {
      groupLabel,
      keywords: 'import connections profiles json file backup',
      labels,
      runAction,
    }),
    connectionActionItem('exportProfiles', {
      disabled: savedConnectionCount <= 0,
      groupLabel,
      keywords: 'export connections profiles json backup',
      labels,
      reasonKey: savedConnectionCount > 0 ? '' : 'palette.reason.noSavedConnection',
      runAction,
    }),
    connectionActionItem('openFavorites', {
      disabled: favoriteCount <= 0,
      groupLabel,
      keywords: 'open favorite connections profiles',
      labels,
      reasonKey: favoriteCount > 0 ? '' : 'palette.reason.noFavoriteConnection',
      runAction,
    }),
    connectionActionItem('openAllConnections', {
      disabled: savedConnectionCount <= 0,
      groupLabel,
      keywords: 'open all connections profiles batch',
      labels,
      reasonKey: savedConnectionCount > 0 ? '' : 'palette.reason.noSavedConnection',
      runAction,
    }),
  ];
}

function scorePaletteItem(item, keywords) {
  const title = item.title?.toLowerCase() || '';
  const description = item.description?.toLowerCase() || '';
  const group = item.group?.toLowerCase() || '';
  const itemKeywords = item.keywords?.toLowerCase() || '';
  let totalScore = 0;
  for (const keyword of keywords) {
    const score = scorePaletteKeyword({ title, description, group, keywords: itemKeywords }, keyword);
    if (score === Number.POSITIVE_INFINITY) return score;
    totalScore += score;
  }
  return totalScore;
}

function scorePaletteKeyword(fields, keyword) {
  if (fields.title.startsWith(keyword)) return 0;
  if (fields.title.includes(keyword)) return 1;
  if (fields.description.includes(keyword)) return 2;
  if (fields.group.includes(keyword)) return 3;
  if (fields.keywords.includes(keyword)) return 4;
  return Number.POSITIVE_INFINITY;
}

function activeSessionActionOptions({
  activeSessionId = '',
  groupLabel,
  keywords,
  labels,
  runAction,
}) {
  return {
    disabled: !activeSessionId,
    groupLabel,
    keywords,
    labels,
    reasonKey: activeSessionId ? '' : 'palette.reason.noActiveSession',
    runAction,
  };
}

function connectionActionItem(key, {
  disabled = false,
  groupLabel,
  keywords,
  labels,
  reasonKey = '',
  runAction,
}) {
  return {
    disabled,
    group: groupLabel,
    id: `connection-action:${key}`,
    keywords,
    reasonKey,
    title: labels[key] || key,
    description: labels[`${key}Description`] || '',
    run: () => runAction(key),
  };
}

function sessionActionItem(key, {
  disabled = false,
  groupLabel,
  keywords,
  labels,
  reasonKey = '',
  runAction,
}) {
  return {
    disabled,
    group: groupLabel,
    id: `session-action:${key}`,
    keywords,
    reasonKey,
    title: labels[key] || key,
    description: labels[`${key}Description`] || '',
    run: () => runAction(key),
  };
}

export function resolvePaletteIndex(itemCount = 0, currentIndex = 0, action = 'next') {
  if (itemCount <= 0) return -1;
  if (action === 'first') return 0;
  if (action === 'last') return itemCount - 1;
  if (currentIndex < 0) return action === 'previous' ? itemCount - 1 : 0;
  const normalizedIndex = currentIndex < 0 ? 0 : currentIndex;
  if (action === 'previous') return (normalizedIndex - 1 + itemCount) % itemCount;
  return (normalizedIndex + 1) % itemCount;
}
