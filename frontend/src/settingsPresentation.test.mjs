import assert from 'node:assert/strict';
import {
  buildAppearanceSummary,
  buildShortcutGroups,
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
