export const ungroupedKey = '__ungrouped__';

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
  return [
    { key: 'all', total: profiles.length, type: 'all' },
    {
      key: 'favorites',
      total: profiles.filter((profile) => profile.favorite).length,
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
    favoritesOnly = false,
    group = 'all',
    providerType = 'all',
    sortBy = 'favorites',
  } = {},
) {
  return sortConnectionProfiles(profiles.filter((profile) => {
    const matchesFavorite = !favoritesOnly || profile.favorite;
    const matchesProvider = providerType === 'all' || profile.providerType === providerType;
    const profileGroup = profile.group || ungroupedKey;
    const matchesGroup = group === 'all' || profileGroup === group;
    return matchesFavorite && matchesProvider && matchesGroup;
  }), sortBy);
}

export function resolveSelectedProfileId(profiles = [], selectedProfileId = '') {
  if (profiles.some((profile) => profile.id === selectedProfileId)) return selectedProfileId;
  return profiles[0]?.id || '';
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

function compareText(left = '', right = '') {
  return String(left || '').localeCompare(String(right || ''));
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
