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
      ],
    },
    {
      key: 'sessions',
      items: [
        ['Cmd/Ctrl + 1..9', 'shortcut.switchNumberedSession'],
        ['Cmd/Ctrl + Shift + [ / ]', 'shortcut.switchAdjacentSession'],
        ['Cmd/Ctrl + Shift + F', 'action.focusMode'],
        ['Session menu', 'action.exportTranscript'],
      ],
    },
    {
      key: 'workspace',
      items: [
        ['Cmd/Ctrl + P', 'action.commandPalette'],
        ['Cmd/Ctrl + K', 'action.commands'],
      ],
    },
  ];
}
