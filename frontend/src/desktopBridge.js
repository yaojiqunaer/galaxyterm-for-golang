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

export function syncDesktopWindowTheme(appTheme = 'system') {
  const desktopTheme = resolveWailsMethod(['desktop', 'API', 'SetWindowTheme']);
  if (typeof desktopTheme === 'function') {
    desktopTheme(appTheme);
    return true;
  }
  const runtime = globalThis.window?.runtime;
  const methodName = appTheme === 'dark'
    ? 'WindowSetDarkTheme'
    : appTheme === 'light'
      ? 'WindowSetLightTheme'
      : 'WindowSetSystemDefaultTheme';
  const method = runtime?.[methodName];
  if (typeof method !== 'function') return false;
  method.call(runtime);
  return true;
}

export function syncDesktopWindowTitle(title, target = globalThis.document) {
  const value = String(title || '').trim();
  if (!value) return false;
  if (target && 'title' in target) target.title = value;

  const runtime = globalThis.window?.runtime;
  const method = runtime?.WindowSetTitle;
  if (typeof method !== 'function') return false;
  try {
    method.call(runtime, value);
    return true;
  } catch {
    return false;
  }
}

export async function syncDesktopPlatform(target = globalThis.document?.documentElement) {
  const environment = globalThis.window?.runtime?.Environment;
  if (typeof environment !== 'function') {
    clearDesktopPlatform(target);
    return '';
  }
  try {
    const info = await environment.call(globalThis.window.runtime);
    const platform = normalizeDesktopPlatform(info?.platform);
    if (!platform) {
      clearDesktopPlatform(target);
      return '';
    }
    if (target?.dataset) target.dataset.platform = platform;
    return platform;
  } catch {
    clearDesktopPlatform(target);
    return '';
  }
}

function normalizeDesktopPlatform(platform) {
  const value = String(platform || '').trim().toLowerCase();
  return ['darwin', 'linux', 'windows'].includes(value) ? value : '';
}

function clearDesktopPlatform(target) {
  if (target?.dataset) delete target.dataset.platform;
}

function resolveWailsMethod(path) {
  return path.reduce((current, key) => current?.[key], globalThis.window?.go);
}
