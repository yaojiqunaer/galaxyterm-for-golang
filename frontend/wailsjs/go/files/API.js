// @ts-check
// This file follows the Wails generated binding shape.
import { callWails } from '../../../src/desktopBridge.js';

export function List(arg1) {
  return callWails(['files', 'API', 'List'], arg1);
}

export function Mkdir(arg1) {
  return callWails(['files', 'API', 'Mkdir'], arg1);
}

export function Delete(arg1) {
  return callWails(['files', 'API', 'Delete'], arg1);
}

export function ReadFile(arg1) {
  return callWails(['files', 'API', 'ReadFile'], arg1);
}

export function WriteFile(arg1) {
  return callWails(['files', 'API', 'WriteFile'], arg1);
}
