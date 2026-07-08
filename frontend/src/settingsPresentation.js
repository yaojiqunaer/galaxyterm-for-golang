export function buildAppearanceSummary(settings = {}) {
  return [
    { key: 'appTheme', value: settings.appTheme || 'system' },
    { key: 'interfaceDensity', value: settings.interfaceDensity || 'comfortable' },
    { key: 'terminalTheme', value: settings.terminalTheme || 'auto' },
  ];
}

export function buildShortcutGroups() {
  return [
    {
      key: 'terminal',
      items: [
        ['Cmd/Ctrl + N', 'action.newTerminal'],
        ['Cmd/Ctrl + K', 'action.commands'],
        ['Cmd/Ctrl + Shift + C', 'action.copySelection'],
        ['Cmd/Ctrl + Shift + V', 'action.pasteClipboard'],
        ['Cmd/Ctrl + L', 'action.clearTerminal'],
        ['Cmd/Ctrl + +/-/0', 'action.zoomReset'],
        ['Cmd/Ctrl + R', 'action.reconnect'],
        ['?', 'action.help'],
      ],
    },
    {
      key: 'sessions',
      items: [
        ['Cmd/Ctrl + 1..9', 'shortcut.switchNumberedSession'],
        ['Cmd/Ctrl + Shift + [ / ]', 'shortcut.switchAdjacentSession'],
        ['Cmd/Ctrl + Shift + F', 'action.focusMode'],
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
        ['Cmd/Ctrl + P', 'action.commandPalette'],
        ['Cmd/Ctrl + K', 'action.commands'],
        ['Workspace menu', 'action.saveWorkspace'],
        ['Workspace menu', 'action.restoreWorkspace'],
      ],
    },
  ];
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
