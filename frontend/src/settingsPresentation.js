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

export function buildTerminalPreview(settings = {}) {
  return {
    fontFamily: settings.fontFamily || 'Menlo, Monaco, Consolas, monospace',
    fontSize: clampNumber(settings.fontSize, 10, 24, 14),
    scrollback: settings.scrollback || 10000,
    terminalTheme: settings.terminalTheme || 'auto',
  };
}

export function buildWorkspaceSnapshotSummary(summary = null) {
  return {
    count: summary?.count || 0,
    hasSnapshot: !!summary,
    updatedAt: summary?.updatedAt || '',
  };
}

function clampNumber(value, min, max, fallback) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(min, Math.min(max, parsed));
}
