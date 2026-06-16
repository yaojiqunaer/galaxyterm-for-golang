export const bridgeUnavailableMessage = 'Desktop bridge is unavailable. Please run GalaxyTerm as a desktop app.';

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

function resolveWailsMethod(path) {
  return path.reduce((current, key) => current?.[key], globalThis.window?.go);
}
