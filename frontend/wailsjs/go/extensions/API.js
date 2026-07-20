// @ts-check
// This file follows the Wails generated binding shape.
import { callWails } from '../../../src/desktopBridge.js';

export function ListInstalled() {
  return callWails(['extensions', 'API', 'ListInstalled']);
}

export function LoadLocaleMessages(arg1) {
  return callWails(['extensions', 'API', 'LoadLocaleMessages'], arg1);
}

export function Validate(arg1) {
  return callWails(['extensions', 'API', 'Validate'], arg1);
}

export function RegisterInstalled(arg1) {
  return callWails(['extensions', 'API', 'RegisterInstalled'], arg1);
}

export function InstallOffline(arg1) {
  return callWails(['extensions', 'API', 'InstallOffline'], arg1);
}

export function InstallOfflineFromDialog() {
  return callWails(['extensions', 'API', 'InstallOfflineFromDialog']);
}

export function FetchCatalog(arg1) {
  return callWails(['extensions', 'API', 'FetchCatalog'], arg1);
}

export function InstallOnline(arg1) {
  return callWails(['extensions', 'API', 'InstallOnline'], arg1);
}

export function Uninstall(arg1) {
  return callWails(['extensions', 'API', 'Uninstall'], arg1);
}
