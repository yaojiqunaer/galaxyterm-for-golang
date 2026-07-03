import assert from 'node:assert/strict';
import { buildAppearanceSummary } from './settingsPresentation.js';

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
