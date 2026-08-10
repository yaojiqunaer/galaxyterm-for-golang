export const connectionWorkspaceStorageKey = 'galaxyterm.connectionWorkspace.v1';

export const defaultConnectionWorkspacePreferences = Object.freeze({
  showDetails: true,
  showRecent: true,
  sortBy: 'favorites',
});

const connectionSortOptions = new Set(['favorites', 'recent', 'name', 'provider', 'group']);

export function normalizeConnectionWorkspacePreferences(value = {}) {
  return {
    showDetails: typeof value.showDetails === 'boolean'
      ? value.showDetails
      : defaultConnectionWorkspacePreferences.showDetails,
    showRecent: typeof value.showRecent === 'boolean'
      ? value.showRecent
      : defaultConnectionWorkspacePreferences.showRecent,
    sortBy: connectionSortOptions.has(value.sortBy)
      ? value.sortBy
      : defaultConnectionWorkspacePreferences.sortBy,
  };
}

export function loadConnectionWorkspacePreferences(storage = globalThis.localStorage) {
  try {
    return normalizeConnectionWorkspacePreferences(JSON.parse(
      storage?.getItem(connectionWorkspaceStorageKey) || '{}',
    ));
  } catch {
    return { ...defaultConnectionWorkspacePreferences };
  }
}

export function persistConnectionWorkspacePreferences(value = {}, storage = globalThis.localStorage) {
  const normalized = normalizeConnectionWorkspacePreferences(value);
  try {
    storage?.setItem(connectionWorkspaceStorageKey, JSON.stringify(normalized));
  } catch {
    // Workspace preferences are optional when local storage is unavailable.
  }
  return normalized;
}

export function updateConnectionWorkspacePreferences(current = {}, patch = {}) {
  return normalizeConnectionWorkspacePreferences({
    ...normalizeConnectionWorkspacePreferences(current),
    ...patch,
  });
}

export function removeRecentConnection(connections = [], connectionId = '') {
  if (!connectionId || !connections.some((connection) => connection.id === connectionId)) return connections;
  return connections.filter((connection) => connection.id !== connectionId);
}
