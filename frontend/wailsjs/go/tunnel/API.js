// @ts-check
// This file follows the Wails generated binding shape.
import { callWails } from '../../../src/desktopBridge.js';

export function Start(arg1) {
  return callWails(['tunnel', 'API', 'Start'], arg1);
}

export function Stop(arg1) {
  return callWails(['tunnel', 'API', 'Stop'], arg1);
}

export function List() {
  return callWails(['tunnel', 'API', 'List']);
}
