export const bridgeUnavailableMessage = 'Desktop bridge is unavailable. Please run GalaxyTerm as a desktop app.';
export const clipboardUnavailableMessage = 'Clipboard access is unavailable in this environment.';

export function hasWailsMethod(path = []) {
  return typeof resolveWailsMethod(path) === 'function';
}

export function callWails(path = [], ...args) {
  const method = resolveWailsMethod(path);
  if (typeof method !== 'function') {
    return Promise.reject(new Error(bridgeUnavailableMessage));
  }
  try {
    return Promise.resolve(method(...args));
  } catch (error) {
    return Promise.reject(error);
  }
}

export function readClipboardText() {
  const desktopClipboard = globalThis.window?.runtime?.ClipboardGetText;
  if (typeof desktopClipboard === 'function') {
    return Promise.resolve(desktopClipboard.call(globalThis.window.runtime));
  }
  const browserClipboard = globalThis.navigator?.clipboard?.readText;
  if (typeof browserClipboard === 'function') {
    return Promise.resolve(browserClipboard.call(globalThis.navigator.clipboard));
  }
  return Promise.reject(new Error(clipboardUnavailableMessage));
}

export function writeClipboardText(text) {
  const desktopClipboard = globalThis.window?.runtime?.ClipboardSetText;
  if (typeof desktopClipboard === 'function') {
    return Promise.resolve(desktopClipboard.call(globalThis.window.runtime, String(text ?? '')));
  }
  const browserClipboard = globalThis.navigator?.clipboard?.writeText;
  if (typeof browserClipboard === 'function') {
    return Promise.resolve(browserClipboard.call(globalThis.navigator.clipboard, String(text ?? '')));
  }
  return Promise.reject(new Error(clipboardUnavailableMessage));
}

function resolveWailsMethod(path) {
  return path.reduce((current, key) => current?.[key], globalThis.window?.go);
}
