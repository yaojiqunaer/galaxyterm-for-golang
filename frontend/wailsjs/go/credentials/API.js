// @ts-check
// This file follows the Wails generated binding shape.
import { callWails } from '../../../src/desktopBridge.js';

export function SaveSSHCredential(arg1) {
  return callWails(['credentials', 'API', 'SaveSSHCredential'], arg1);
}

export function DeleteSSHCredential(arg1) {
  return callWails(['credentials', 'API', 'DeleteSSHCredential'], arg1);
}

export function ResolveSSHRequest(arg1) {
  return callWails(['credentials', 'API', 'ResolveSSHRequest'], arg1);
}
