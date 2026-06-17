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
      const sortedProfiles = sortProfiles(items);
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
  } = {},
) {
  return sortProfiles(profiles.filter((profile) => {
    const matchesFavorite = !favoritesOnly || profile.favorite;
    const matchesProvider = providerType === 'all' || profile.providerType === providerType;
    const profileGroup = profile.group || ungroupedKey;
    const matchesGroup = group === 'all' || profileGroup === group;
    return matchesFavorite && matchesProvider && matchesGroup;
  }));
}

function sortProfiles(profiles) {
  return [...profiles].sort((left, right) => {
    const favoriteDelta = Number(!!right.favorite) - Number(!!left.favorite);
    if (favoriteDelta !== 0) return favoriteDelta;
    return (left.displayName || '').localeCompare(right.displayName || '');
  });
}
