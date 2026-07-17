const settingsSectionKeys = ['interface', 'terminal', 'workspace', 'security', 'shortcuts'];

export function buildSettingsSectionNav(activeSection = 'interface') {
  const active = normalizeSettingsSection(activeSection);
  return settingsSectionKeys.map((key) => ({
    active: key === active,
    key,
    labelKey: `settings.${key}`,
  }));
}

export function resolveSettingsSectionNavigation(activeSection = 'interface', key = '') {
  const active = normalizeSettingsSection(activeSection);
  const currentIndex = settingsSectionKeys.indexOf(active);
  if (key === 'Home') return settingsSectionKeys[0];
  if (key === 'End') return settingsSectionKeys[settingsSectionKeys.length - 1];
  if (key === 'ArrowRight' || key === 'ArrowDown') {
    return settingsSectionKeys[(currentIndex + 1) % settingsSectionKeys.length];
  }
  if (key === 'ArrowLeft' || key === 'ArrowUp') {
    return settingsSectionKeys[(currentIndex - 1 + settingsSectionKeys.length) % settingsSectionKeys.length];
  }
  return '';
}

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
        ['Ctrl + C', 'action.interruptCommand'],
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
        [`${modifier} + W`, 'action.closeSession'],
        [`${modifier} + Shift + T`, 'action.restoreClosedSession'],
        [`${modifier} + Shift + F`, 'action.focusMode'],
        ['Session menu', 'action.exportTranscript'],
        ['Session menu', 'action.commandHistory'],
      ],
    },
    {
      key: 'search',
      items: [
        [`${modifier} + F`, 'shortcut.searchTerminal'],
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

export function isTerminalInputTarget(target) {
  return !!(
    target?.classList?.contains?.('xterm-helper-textarea')
    || target?.closest?.('.xterm')
  );
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
  const count = Number(summary?.count) || 0;
  return {
    count,
    hasSnapshot: count > 0,
    updatedAt: summary?.updatedAt || '',
  };
}

export function buildWorkspaceActionState({ hasSnapshot = false, sessionCount = 0 } = {}) {
  const hasSessions = Number(sessionCount) > 0;
  return {
    clear: {
      disabled: !hasSnapshot,
      reasonKey: hasSnapshot ? '' : 'palette.reason.noWorkspaceSnapshot',
    },
    restore: {
      disabled: !hasSnapshot,
      reasonKey: hasSnapshot ? '' : 'palette.reason.noWorkspaceSnapshot',
    },
    save: {
      disabled: !hasSessions,
      reasonKey: hasSessions ? '' : 'palette.reason.noWorkspaceSession',
    },
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

function normalizeSettingsSection(value) {
  return settingsSectionKeys.includes(value) ? value : settingsSectionKeys[0];
}
