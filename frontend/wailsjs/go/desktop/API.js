// @ts-check
// This file follows the Wails generated binding shape.
import { callWails } from '../../../src/desktopBridge.js';

export function SelectSSHConfig() {
  return callWails(['desktop', 'API', 'SelectSSHConfig']);
}

export function SetWindowTheme(arg1) {
  return callWails(['desktop', 'API', 'SetWindowTheme'], arg1);
}
