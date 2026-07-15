export const defaultExtensionSources = [];

export function normalizeExtensionSource(source = {}) {
  const name = String(source.name || '').trim();
  const url = String(source.url || '').trim();
  const type = source.type || 'github';
  if (!name || !url) return null;
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== 'https:' || parsed.username || parsed.password) return null;
  } catch {
    return null;
  }
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

export function replaceExtensionCatalogSource(items = [], source = {}, nextItems = []) {
  const retained = removeExtensionCatalogSource(items, source.id);
  const annotated = nextItems.map((item) => ({
    ...item,
    sourceId: source.id,
    sourceName: source.name,
  }));
  return [...retained, ...annotated];
}

export function removeExtensionCatalogSource(items = [], sourceId = '') {
  return items.filter((item) => item.sourceId !== sourceId);
}
