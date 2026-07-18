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
const sidebarModes = ['auto', 'expanded', 'compact'];
const configurableShortcutDefinitions = [
  { action: 'toggleSidebar', defaultKey: 'b', labelKey: 'action.toggleSidebar' },
  { action: 'newTerminal', defaultKey: 'n', labelKey: 'action.newTerminal' },
  { action: 'quickCommands', defaultKey: 'k', labelKey: 'action.commands' },
  { action: 'commandPalette', defaultKey: 'p', labelKey: 'action.commandPalette' },
  { action: 'closeSession', defaultKey: 'w', labelKey: 'action.closeSession' },
  { action: 'search', defaultKey: 'f', labelKey: 'shortcut.searchTerminal' },
  { action: 'reconnect', defaultKey: 'r', labelKey: 'action.reconnect' },
];
const configurableShortcutKeys = ['b', 'd', 'e', 'f', 'g', 'i', 'j', 'k', 'n', 'o', 'p', 'r', 's', 't', 'u', 'w', 'y'];

export function buildShortcutGroups(settings = {}) {
  const modifier = shortcutModifierLabel(settings.shortcutModifier);
  const bindings = normalizeShortcutBindings(settings.shortcutBindings);
  const binding = (action) => `${modifier} + ${bindings[action].toUpperCase()}`;
  return [
    {
      key: 'terminal',
      items: [
        [binding('newTerminal'), 'action.newTerminal'],
        [binding('quickCommands'), 'action.commands'],
        [`${modifier} + Shift + C`, 'action.copySelection'],
        [`${modifier} + Shift + V`, 'action.pasteClipboard'],
        [`${modifier} + L`, 'action.clearTerminal'],
        ['Ctrl + C', 'action.interruptCommand'],
        [`${modifier} + +/-/0`, 'action.zoomReset'],
        [binding('reconnect'), 'action.reconnect'],
        ['?', 'action.help'],
      ],
    },
    {
      key: 'sessions',
      items: [
        [`${modifier} + 1..9`, 'shortcut.switchNumberedSession'],
        ['Ctrl + Tab / Ctrl + Shift + Tab', 'shortcut.switchAdjacentSession'],
        [binding('closeSession'), 'action.closeSession'],
        [`${modifier} + Shift + T`, 'action.restoreClosedSession'],
        [`${modifier} + Shift + F`, 'action.focusMode'],
        ['Session menu', 'action.exportTranscript'],
        ['Session menu', 'action.commandHistory'],
      ],
    },
    {
      key: 'search',
      items: [
        [binding('search'), 'shortcut.searchTerminal'],
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
        [binding('toggleSidebar'), 'action.toggleSidebar'],
        [binding('commandPalette'), 'action.commandPalette'],
        [binding('quickCommands'), 'action.commands'],
        ['Workspace menu', 'action.saveWorkspace'],
        ['Workspace menu', 'action.restoreWorkspace'],
      ],
    },
  ];
}

export function defaultShortcutBindings() {
  return Object.fromEntries(configurableShortcutDefinitions.map((definition) => [
    definition.action,
    definition.defaultKey,
  ]));
}

export function normalizeShortcutBindings(value = {}) {
  let bindings = defaultShortcutBindings();
  configurableShortcutDefinitions.forEach(({ action }) => {
    if (!Object.prototype.hasOwnProperty.call(value || {}, action)) return;
    const key = normalizeShortcutKey(value[action]);
    if (!key) return;
    bindings = swapShortcutBinding(bindings, action, key);
  });
  return bindings;
}

export function updateShortcutBinding(bindings, action, key) {
  if (!configurableShortcutDefinitions.some((definition) => definition.action === action)) {
    return normalizeShortcutBindings(bindings);
  }
  const normalizedKey = normalizeShortcutKey(key);
  const current = normalizeShortcutBindings(bindings);
  return normalizedKey ? swapShortcutBinding(current, action, normalizedKey) : current;
}

export function resolveConfigurableShortcutAction(event = {}, settings = {}) {
  if (
    !isCommandShortcut(event, settings)
    || event.altKey
    || event.shiftKey
    || event.repeat
    || isEditableShortcutTarget(event.target)
  ) return '';
  const key = normalizeShortcutKey(event.key);
  if (!key) return '';
  const bindings = normalizeShortcutBindings(settings.shortcutBindings);
  return configurableShortcutDefinitions.find(({ action }) => bindings[action] === key)?.action || '';
}

export function buildShortcutEditorRows(settings = {}) {
  const modifier = shortcutModifierLabel(settings.shortcutModifier);
  const bindings = normalizeShortcutBindings(settings.shortcutBindings);
  return configurableShortcutDefinitions.map(({ action, labelKey }) => ({
    action,
    key: bindings[action],
    labelKey,
    shortcut: `${modifier} + ${bindings[action].toUpperCase()}`,
  }));
}

export function buildShortcutKeyOptions(settings = {}) {
  const modifier = shortcutModifierLabel(settings.shortcutModifier);
  return configurableShortcutKeys.map((key) => ({
    label: `${modifier} + ${key.toUpperCase()}`,
    value: key,
  }));
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

function isEditableShortcutTarget(target) {
  const tagName = target?.tagName?.toLowerCase();
  const editable = tagName === 'input'
    || tagName === 'textarea'
    || tagName === 'select'
    || target?.isContentEditable;
  return !!editable && !isTerminalInputTarget(target);
}

export function normalizeShortcutModifier(value) {
  const normalized = String(value || '').trim().toLowerCase();
  return shortcutModifiers.includes(normalized) ? normalized : 'auto';
}

export function normalizeSidebarMode(value) {
  const normalized = String(value || '').trim().toLowerCase();
  return sidebarModes.includes(normalized) ? normalized : 'auto';
}

export function resolveSidebarCompact(value, isNarrow = false) {
  const mode = normalizeSidebarMode(value);
  if (mode === 'compact') return true;
  if (mode === 'expanded') return false;
  return !!isNarrow;
}

export function shortcutModifierLabel(value) {
  const modifier = normalizeShortcutModifier(value);
  if (modifier === 'meta') return 'Cmd';
  if (modifier === 'ctrl') return 'Ctrl';
  return 'Cmd/Ctrl';
}

function normalizeShortcutKey(value) {
  const key = String(value || '').trim().toLowerCase();
  return configurableShortcutKeys.includes(key) ? key : '';
}

function swapShortcutBinding(bindings, action, key) {
  const previousKey = bindings[action];
  const owner = configurableShortcutDefinitions.find((definition) => (
    definition.action !== action && bindings[definition.action] === key
  ));
  return {
    ...bindings,
    [action]: key,
    ...(owner ? { [owner.action]: previousKey } : {}),
  };
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
