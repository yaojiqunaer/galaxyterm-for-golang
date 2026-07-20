// @ts-check
// This file follows the Wails generated binding shape.
import { callWails } from '../../../src/desktopBridge.js';

export function Close(arg1) {
  return callWails(['session', 'API', 'Close'], arg1);
}

export function CreateSession(arg1) {
  return callWails(['session', 'API', 'CreateSession'], arg1);
}

export function ListProviders() {
  return callWails(['session', 'API', 'ListProviders']);
}

export function ListSessions() {
  return callWails(['session', 'API', 'ListSessions']);
}

export function RefreshProviders() {
  return callWails(['session', 'API', 'RefreshProviders']);
}

export function Resize(arg1, arg2, arg3) {
  return callWails(['session', 'API', 'Resize'], arg1, arg2, arg3);
}

export function Send(arg1, arg2) {
  return callWails(['session', 'API', 'Send'], arg1, arg2);
}
