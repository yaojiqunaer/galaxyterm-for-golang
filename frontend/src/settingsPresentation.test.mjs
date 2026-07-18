import assert from 'node:assert/strict';
import {
  buildAppearanceSummary,
  buildOperationalSummary,
  buildShortcutEditorRows,
  buildShortcutKeyOptions,
  buildSettingsSectionNav,
  buildSecuritySummary,
  buildShortcutGroups,
  buildTerminalDefaults,
  buildTerminalPreview,
  buildWorkspaceActionState,
  buildWorkspaceSnapshotSummary,
  defaultShortcutBindings,
  isCommandShortcut,
  isTerminalInputTarget,
  normalizeSidebarMode,
  normalizeShortcutModifier,
  normalizeShortcutBindings,
  resolveSidebarCompact,
  resolveConfigurableShortcutAction,
  resolveSettingsSectionNavigation,
  shortcutModifierLabel,
  updateShortcutBinding,
} from './settingsPresentation.js';

assert.deepEqual(buildSettingsSectionNav('terminal'), [
  { active: false, key: 'interface', labelKey: 'settings.interface' },
  { active: true, key: 'terminal', labelKey: 'settings.terminal' },
  { active: false, key: 'workspace', labelKey: 'settings.workspace' },
  { active: false, key: 'security', labelKey: 'settings.security' },
  { active: false, key: 'shortcuts', labelKey: 'settings.shortcuts' },
]);
assert.equal(buildSettingsSectionNav('missing')[0].active, true);
assert.equal(resolveSettingsSectionNavigation('interface', 'ArrowRight'), 'terminal');
assert.equal(resolveSettingsSectionNavigation('interface', 'ArrowLeft'), 'shortcuts');
assert.equal(resolveSettingsSectionNavigation('workspace', 'Home'), 'interface');
assert.equal(resolveSettingsSectionNavigation('workspace', 'End'), 'shortcuts');
assert.equal(resolveSettingsSectionNavigation('workspace', 'Enter'), '');

assert.deepEqual(buildAppearanceSummary({
  appTheme: 'system',
  interfaceDensity: 'comfortable',
  terminalTheme: 'auto',
}), [
  { key: 'appTheme', value: 'system' },
  { key: 'interfaceDensity', value: 'comfortable' },
  { key: 'terminalTheme', value: 'auto' },
]);

assert.deepEqual(buildAppearanceSummary({
  appTheme: 'dark',
  terminalTheme: 'Catppuccin',
}), [
  { key: 'appTheme', value: 'dark' },
  { key: 'interfaceDensity', value: 'comfortable' },
  { key: 'terminalTheme', value: 'Catppuccin' },
]);

assert.deepEqual(buildSecuritySummary({}), [
  { key: 'confirmDangerousActions', value: true },
]);

assert.deepEqual(buildSecuritySummary({ confirmDangerousActions: false }), [
  { key: 'confirmDangerousActions', value: false },
]);

assert.deepEqual(buildOperationalSummary({ logLevel: 'debug' }), [
  { key: 'logLevel', value: 'debug' },
]);

assert.deepEqual(buildOperationalSummary({ logLevel: 'verbose' }), [
  { key: 'logLevel', value: 'info' },
]);

assert.deepEqual(buildShortcutGroups().map((group) => ({
  key: group.key,
  count: group.items.length,
})), [
  { key: 'terminal', count: 9 },
  { key: 'sessions', count: 7 },
  { key: 'search', count: 3 },
  { key: 'audit', count: 3 },
  { key: 'workspace', count: 5 },
]);

assert.equal(buildShortcutGroups().some((group) => group.items.some(([shortcut]) => shortcut === '?')), true);
assert.equal(buildShortcutGroups()[0].items.some(([shortcut, label]) => shortcut === 'Ctrl + C' && label === 'action.interruptCommand'), true);
assert.equal(buildShortcutGroups({ shortcutModifier: 'meta' })[0].items[0][0], 'Cmd + N');
assert.equal(buildShortcutGroups({ shortcutModifier: 'ctrl' })[0].items[0][0], 'Ctrl + N');
assert.equal(buildShortcutGroups({ shortcutModifier: 'bogus' })[0].items[0][0], 'Cmd/Ctrl + N');
assert.deepEqual(buildShortcutGroups({ shortcutModifier: 'meta' })[2].items[0], ['Cmd + F', 'shortcut.searchTerminal']);
assert.equal(buildShortcutGroups({ shortcutModifier: 'meta' })[1].items.some(([shortcut]) => shortcut === 'Cmd + Shift + T'), true);
assert.equal(buildShortcutGroups({ shortcutModifier: 'meta' })[1].items.some(([shortcut]) => shortcut === 'Cmd + W'), true);
assert.equal(shortcutModifierLabel('meta'), 'Cmd');
assert.equal(shortcutModifierLabel('ctrl'), 'Ctrl');
assert.equal(normalizeShortcutModifier('bogus'), 'auto');
assert.equal(isCommandShortcut({ metaKey: true, ctrlKey: false }, { shortcutModifier: 'meta' }), true);
assert.equal(isCommandShortcut({ metaKey: false, ctrlKey: true }, { shortcutModifier: 'meta' }), false);
assert.equal(isCommandShortcut({ metaKey: false, ctrlKey: true }, { shortcutModifier: 'ctrl' }), true);
assert.equal(isCommandShortcut({ metaKey: false, ctrlKey: true }, { shortcutModifier: 'auto' }), true);
assert.equal(isTerminalInputTarget({ classList: { contains: (value) => value === 'xterm-helper-textarea' } }), true);
assert.equal(isTerminalInputTarget({ classList: { contains: () => false }, closest: (value) => value === '.xterm' }), true);
assert.equal(isTerminalInputTarget({ classList: { contains: () => false }, closest: () => null }), false);
assert.equal(isTerminalInputTarget(null), false);

assert.deepEqual(defaultShortcutBindings(), {
  closeSession: 'w',
  commandPalette: 'p',
  newTerminal: 'n',
  quickCommands: 'k',
  reconnect: 'r',
  search: 'f',
  toggleSidebar: 'b',
});
assert.deepEqual(normalizeShortcutBindings({
  commandPalette: 'P',
  newTerminal: 'P',
  quickCommands: '%',
}), defaultShortcutBindings());
assert.deepEqual(updateShortcutBinding(defaultShortcutBindings(), 'newTerminal', 'p'), {
  closeSession: 'w',
  commandPalette: 'n',
  newTerminal: 'p',
  quickCommands: 'k',
  reconnect: 'r',
  search: 'f',
  toggleSidebar: 'b',
});
assert.equal(resolveConfigurableShortcutAction(
  { key: 'p', metaKey: true },
  { shortcutModifier: 'meta', shortcutBindings: { newTerminal: 'p', commandPalette: 'n' } },
), 'newTerminal');
assert.equal(resolveConfigurableShortcutAction(
  { key: 'p', metaKey: true, shiftKey: true },
  { shortcutModifier: 'meta', shortcutBindings: { newTerminal: 'p' } },
), '');
assert.equal(resolveConfigurableShortcutAction(
  { key: 'p', metaKey: true, altKey: true },
  { shortcutModifier: 'meta', shortcutBindings: { newTerminal: 'p' } },
), '');
assert.equal(resolveConfigurableShortcutAction(
  { key: 'p', metaKey: true, repeat: true },
  { shortcutModifier: 'meta', shortcutBindings: { newTerminal: 'p' } },
), '');
assert.equal(resolveConfigurableShortcutAction(
  { key: 'p', ctrlKey: true },
  { shortcutModifier: 'meta', shortcutBindings: { newTerminal: 'p' } },
), '');
assert.equal(resolveConfigurableShortcutAction(
  {
    key: 'p',
    metaKey: true,
    target: { tagName: 'INPUT', classList: { contains: () => false }, closest: () => null },
  },
  { shortcutModifier: 'meta', shortcutBindings: { newTerminal: 'p' } },
), '');
assert.equal(resolveConfigurableShortcutAction(
  {
    key: 'p',
    metaKey: true,
    target: {
      tagName: 'TEXTAREA',
      classList: { contains: (name) => name === 'xterm-helper-textarea' },
      closest: () => null,
    },
  },
  { shortcutModifier: 'meta', shortcutBindings: { newTerminal: 'p' } },
), 'newTerminal');
assert.deepEqual(buildShortcutEditorRows({
  shortcutModifier: 'meta',
  shortcutBindings: { newTerminal: 'p', commandPalette: 'n' },
}).slice(0, 3), [
  { action: 'toggleSidebar', key: 'b', labelKey: 'action.toggleSidebar', shortcut: 'Cmd + B' },
  { action: 'newTerminal', key: 'p', labelKey: 'action.newTerminal', shortcut: 'Cmd + P' },
  { action: 'quickCommands', key: 'k', labelKey: 'action.commands', shortcut: 'Cmd + K' },
]);
assert.deepEqual(buildShortcutKeyOptions({ shortcutModifier: 'ctrl' })[0], {
  label: 'Ctrl + B',
  value: 'b',
});
assert.equal(
  buildShortcutGroups({ shortcutModifier: 'meta', shortcutBindings: { newTerminal: 'p' } })[0].items[0][0],
  'Cmd + P',
);
assert.equal(
  buildShortcutGroups({ shortcutModifier: 'meta' })[1].items[1][0],
  'Ctrl + Tab / Ctrl + Shift + Tab',
);
assert.deepEqual(
  buildShortcutGroups({ shortcutModifier: 'meta' })
    .find((group) => group.key === 'workspace').items[0],
  ['Cmd + B', 'action.toggleSidebar'],
);

assert.equal(normalizeSidebarMode('auto'), 'auto');
assert.equal(normalizeSidebarMode('expanded'), 'expanded');
assert.equal(normalizeSidebarMode('compact'), 'compact');
assert.equal(normalizeSidebarMode('unknown'), 'auto');
assert.equal(resolveSidebarCompact('auto', false), false);
assert.equal(resolveSidebarCompact('auto', true), true);
assert.equal(resolveSidebarCompact('expanded', true), false);
assert.equal(resolveSidebarCompact('compact', false), true);

assert.deepEqual(buildTerminalPreview({
  fontFamily: 'JetBrains Mono',
  fontSize: 15,
  scrollback: 5000,
  terminalTheme: 'Tokyo Night',
}), {
  fontFamily: 'JetBrains Mono',
  fontSize: 15,
  scrollback: 5000,
  terminalTheme: 'Tokyo Night',
});

assert.deepEqual(buildTerminalPreview({}), {
  fontFamily: 'Menlo, Monaco, Consolas, monospace',
  fontSize: 14,
  scrollback: 10000,
  terminalTheme: 'auto',
});

assert.equal(buildTerminalPreview({ fontSize: 99 }).fontSize, 24);
assert.equal(buildTerminalPreview({ fontSize: 2 }).fontSize, 10);

assert.deepEqual(buildTerminalDefaults({
  defaultProviderType: 'ssh',
  defaultWorkingDirectory: '  /Users/me/project  ',
}, [
  { type: 'local' },
  { type: 'ssh' },
]), {
  defaultProviderType: 'ssh',
  defaultWorkingDirectory: '/Users/me/project',
});

assert.deepEqual(buildTerminalDefaults({
  defaultProviderType: 'missing',
}, [
  { type: 'local' },
  { type: 'ssh' },
]), {
  defaultProviderType: 'local',
  defaultWorkingDirectory: '',
});

assert.deepEqual(buildWorkspaceSnapshotSummary(null), {
  count: 0,
  hasSnapshot: false,
  updatedAt: '',
});
assert.deepEqual(buildWorkspaceSnapshotSummary({ count: 0, updatedAt: '2026-07-04 12:00' }), {
  count: 0,
  hasSnapshot: false,
  updatedAt: '2026-07-04 12:00',
});
assert.deepEqual(buildWorkspaceSnapshotSummary({ count: 3, updatedAt: '2026-07-04 12:00' }), {
  count: 3,
  hasSnapshot: true,
  updatedAt: '2026-07-04 12:00',
});

assert.deepEqual(buildWorkspaceActionState({
  hasSnapshot: false,
  sessionCount: 0,
}), {
  clear: { disabled: true, reasonKey: 'palette.reason.noWorkspaceSnapshot' },
  restore: { disabled: true, reasonKey: 'palette.reason.noWorkspaceSnapshot' },
  save: { disabled: true, reasonKey: 'palette.reason.noWorkspaceSession' },
});
assert.deepEqual(buildWorkspaceActionState({
  hasSnapshot: true,
  sessionCount: 2,
}), {
  clear: { disabled: false, reasonKey: '' },
  restore: { disabled: false, reasonKey: '' },
  save: { disabled: false, reasonKey: '' },
});
