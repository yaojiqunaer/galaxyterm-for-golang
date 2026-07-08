export function buildAppearanceSummary(settings = {}) {
  return [
    { key: 'appTheme', value: settings.appTheme || 'system' },
    { key: 'interfaceDensity', value: settings.interfaceDensity || 'comfortable' },
    { key: 'terminalTheme', value: settings.terminalTheme || 'auto' },
  ];
}

const shortcutModifiers = ['auto', 'meta', 'ctrl'];

export function buildShortcutGroups(settings = {}) {
  const modifier = shortcutModifierLabel(settings.shortcutModifier);
  return [
    {
      key: 'terminal',
      items: [
        [`${modifier} + N`, 'action.newTerminal'],
        [`${modifier} + K`, 'action.commands'],
        [`${modifier} + Shift + C`, 'action.copySelection'],
        [`${modifier} + Shift + V`, 'action.pasteClipboard'],
        [`${modifier} + L`, 'action.clearTerminal'],
        [`${modifier} + +/-/0`, 'action.zoomReset'],
        [`${modifier} + R`, 'action.reconnect'],
        ['?', 'action.help'],
      ],
    },
    {
      key: 'sessions',
      items: [
        [`${modifier} + 1..9`, 'shortcut.switchNumberedSession'],
        [`${modifier} + Shift + [ / ]`, 'shortcut.switchAdjacentSession'],
        [`${modifier} + Shift + F`, 'action.focusMode'],
        ['Session menu', 'action.exportTranscript'],
        ['Session menu', 'action.commandHistory'],
      ],
    },
    {
      key: 'search',
      items: [
        ['Top search', 'shortcut.searchTerminal'],
        ['Enter', 'action.findNext'],
        ['Previous button', 'action.findPrevious'],
      ],
    },
    {
      key: 'audit',
      items: [
        ['Session menu', 'action.saveAuditRecord'],
        ['Audit page', 'action.replay'],
        ['Audit page', 'action.exportCast'],
      ],
    },
    {
      key: 'workspace',
      items: [
        [`${modifier} + P`, 'action.commandPalette'],
        [`${modifier} + K`, 'action.commands'],
        ['Workspace menu', 'action.saveWorkspace'],
        ['Workspace menu', 'action.restoreWorkspace'],
      ],
    },
  ];
}

export function isCommandShortcut(event = {}, settings = {}) {
  const modifier = normalizeShortcutModifier(settings.shortcutModifier);
  if (modifier === 'meta') return !!event.metaKey;
  if (modifier === 'ctrl') return !!event.ctrlKey;
  return !!(event.metaKey || event.ctrlKey);
}

export function normalizeShortcutModifier(value) {
  const normalized = String(value || '').trim().toLowerCase();
  return shortcutModifiers.includes(normalized) ? normalized : 'auto';
}

export function shortcutModifierLabel(value) {
  const modifier = normalizeShortcutModifier(value);
  if (modifier === 'meta') return 'Cmd';
  if (modifier === 'ctrl') return 'Ctrl';
  return 'Cmd/Ctrl';
}

export function buildSecuritySummary(settings = {}) {
  return [
    { key: 'confirmDangerousActions', value: settings.confirmDangerousActions !== false },
  ];
}

export function buildOperationalSummary(settings = {}) {
  return [
    { key: 'logLevel', value: normalizeLogLevel(settings.logLevel) },
  ];
}

export function buildTerminalPreview(settings = {}) {
  return {
    fontFamily: settings.fontFamily || 'Menlo, Monaco, Consolas, monospace',
    fontSize: clampNumber(settings.fontSize, 10, 24, 14),
    scrollback: settings.scrollback || 10000,
    terminalTheme: settings.terminalTheme || 'auto',
  };
}

export function buildTerminalDefaults(settings = {}, providers = []) {
  const providerTypes = providers.map((provider) => provider.type).filter(Boolean);
  const fallbackProviderType = providerTypes[0] || 'local';
  const configuredProviderType = String(settings.defaultProviderType || '').trim();
  return {
    defaultProviderType: providerTypes.includes(configuredProviderType)
      ? configuredProviderType
      : fallbackProviderType,
    defaultWorkingDirectory: String(settings.defaultWorkingDirectory || '').trim(),
  };
}

export function buildWorkspaceSnapshotSummary(summary = null) {
  return {
    count: summary?.count || 0,
    hasSnapshot: !!summary,
    updatedAt: summary?.updatedAt || '',
  };
}

export function normalizeLogLevel(value) {
  const normalized = String(value || '').trim().toLowerCase();
  return ['error', 'warn', 'info', 'debug'].includes(normalized) ? normalized : 'info';
}

function clampNumber(value, min, max, fallback) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(min, Math.min(max, parsed));
}
