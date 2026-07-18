export const emptyTerminalSearchResult = Object.freeze({
  current: 0,
  limited: false,
  status: 'idle',
  total: 0,
});

export const invalidTerminalSearchResult = Object.freeze({
  current: 0,
  limited: false,
  status: 'invalid',
  total: 0,
});

export const defaultTerminalSearchPreferences = Object.freeze({
  caseSensitive: false,
  regex: false,
  wholeWord: false,
});

export const terminalSearchOptions = Object.freeze({
  decorations: Object.freeze({
    activeMatchBackground: '#d6a43b',
    activeMatchBorder: '#f7cf6a',
    activeMatchColorOverviewRuler: '#d6a43b',
    matchBorder: '#4f93ad',
    matchOverviewRuler: '#4f93ad',
  }),
});

export function hasTerminalSearchKeywordChanged(currentQuery = '', nextQuery = '') {
  return String(currentQuery).trim() !== String(nextQuery).trim();
}

export function normalizeTerminalSearchPreferences(preferences = {}) {
  return {
    caseSensitive: preferences.caseSensitive === true,
    regex: preferences.regex === true,
    wholeWord: preferences.wholeWord === true,
  };
}

export function terminalSearchRequestKey(query = '', preferences = {}) {
  const normalized = normalizeTerminalSearchPreferences(preferences);
  return JSON.stringify([
    String(query).trim(),
    normalized.caseSensitive,
    normalized.wholeWord,
    normalized.regex,
  ]);
}

export function validateTerminalSearchQuery(query = '', preferences = {}) {
  const keyword = String(query).trim();
  if (!keyword) return 'empty';
  if (!normalizeTerminalSearchPreferences(preferences).regex) return 'valid';
  try {
    new RegExp(keyword);
    return 'valid';
  } catch {
    return 'invalid';
  }
}

export function normalizeTerminalSearchResult(event = {}, query = '') {
  if (!String(query).trim()) return emptyTerminalSearchResult;

  const total = Math.max(0, Number.isFinite(event.resultCount) ? event.resultCount : 0);
  if (!total) {
    return { current: 0, limited: false, status: 'empty', total: 0 };
  }

  const index = Number.isFinite(event.resultIndex) ? event.resultIndex : -1;
  const tracked = index >= 0 && index < total;
  return {
    current: tracked ? index + 1 : 0,
    limited: !tracked,
    status: 'ready',
    total,
  };
}

export function resolveTerminalSearchKeyAction(event = {}) {
  if (event.key === 'Escape') return 'close';
  if (event.key === 'Enter') return event.shiftKey ? 'previous' : 'next';
  return 'ignore';
}
