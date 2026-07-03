import assert from 'node:assert/strict';
import {
  buildAppearanceSummary,
  buildShortcutGroups,
  buildTerminalPreview,
  buildWorkspaceSnapshotSummary,
} from './settingsPresentation.js';

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

assert.deepEqual(buildShortcutGroups().map((group) => ({
  key: group.key,
  count: group.items.length,
})), [
  { key: 'terminal', count: 7 },
  { key: 'sessions', count: 4 },
  { key: 'workspace', count: 2 },
]);

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

assert.deepEqual(buildWorkspaceSnapshotSummary(null), {
  count: 0,
  hasSnapshot: false,
  updatedAt: '',
});
assert.deepEqual(buildWorkspaceSnapshotSummary({ count: 3, updatedAt: '2026-07-04 12:00' }), {
  count: 3,
  hasSnapshot: true,
  updatedAt: '2026-07-04 12:00',
});
