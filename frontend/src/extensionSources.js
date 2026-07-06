export const defaultExtensionSources = [];

export function normalizeExtensionSource(source = {}) {
  const name = String(source.name || '').trim();
  const url = String(source.url || '').trim();
  const type = source.type || 'github';
  if (!name || !url) return null;
  return {
    id: source.id || url,
    name,
    url,
    type,
  };
}

export function upsertExtensionSource(sources = [], source = {}) {
  const normalized = normalizeExtensionSource(source);
  if (!normalized) return sources;
  const nextSources = sources.filter((item) => item.id !== normalized.id && item.url !== normalized.url);
  return [...nextSources, normalized];
}

export function removeExtensionSource(sources = [], sourceId = '') {
  return sources.filter((source) => source.id !== sourceId);
}
