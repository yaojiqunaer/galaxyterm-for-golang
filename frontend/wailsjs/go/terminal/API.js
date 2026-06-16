// @ts-check
// This file follows the Wails generated binding shape.
import { callWails } from '../../../src/desktopBridge.js';

export function TestSSHConnection(arg1) {
  return callWails(['terminal', 'API', 'TestSSHConnection'], arg1);
}
