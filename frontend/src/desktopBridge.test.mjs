import assert from 'node:assert/strict';
import {
  bridgeUnavailableMessage,
  callWails,
  clipboardUnavailableMessage,
  hasWailsMethod,
  readClipboardText,
  writeClipboardText,
} from './desktopBridge.js';

const desktopBridge = await import('./desktopBridge.js');
assert.equal(
  typeof desktopBridge.syncDesktopWindowTheme,
  'function',
  'desktop bridge must expose native window theme synchronization',
);

const originalWindow = globalThis.window;
const originalNavigator = Object.getOwnPropertyDescriptor(globalThis, 'navigator');

globalThis.window = {};
Object.defineProperty(globalThis, 'navigator', { configurable: true, value: {} });
assert.equal(hasWailsMethod(['session', 'API', 'CreateSession']), false);
await assert.rejects(
  () => callWails(['session', 'API', 'CreateSession'], { providerType: 'local' }),
  (error) => error.message === bridgeUnavailableMessage,
);
await assert.rejects(
  () => readClipboardText(),
  (error) => error.message === clipboardUnavailableMessage,
);

globalThis.window = {
  go: {
    session: {
      API: {
        CreateSession: (request) => `session:${request.providerType}`,
      },
    },
  },
};

assert.equal(hasWailsMethod(['session', 'API', 'CreateSession']), true);
assert.equal(await callWails(['session', 'API', 'CreateSession'], { providerType: 'local' }), 'session:local');

let desktopClipboard = '';
globalThis.window.runtime = {
  ClipboardGetText: () => desktopClipboard,
  ClipboardSetText: (text) => {
    desktopClipboard = text;
    return true;
  },
};
assert.equal(await writeClipboardText('native text'), true);
assert.equal(await readClipboardText(), 'native text');

const nativeThemeCalls = [];
globalThis.window.go.desktop = {
  API: {
    SetWindowTheme: (theme) => nativeThemeCalls.push(`desktop:${theme}`),
  },
};
globalThis.window.runtime.WindowSetDarkTheme = () => nativeThemeCalls.push('dark');
globalThis.window.runtime.WindowSetLightTheme = () => nativeThemeCalls.push('light');
globalThis.window.runtime.WindowSetSystemDefaultTheme = () => nativeThemeCalls.push('system');
assert.equal(desktopBridge.syncDesktopWindowTheme('dark'), true);
assert.equal(desktopBridge.syncDesktopWindowTheme('light'), true);
assert.equal(desktopBridge.syncDesktopWindowTheme('system'), true);
assert.deepEqual(nativeThemeCalls, ['desktop:dark', 'desktop:light', 'desktop:system']);

delete globalThis.window.go.desktop;
assert.equal(desktopBridge.syncDesktopWindowTheme('dark'), true);
assert.deepEqual(nativeThemeCalls, ['desktop:dark', 'desktop:light', 'desktop:system', 'dark']);
delete globalThis.window.runtime;
assert.equal(desktopBridge.syncDesktopWindowTheme('dark'), false);
let browserClipboard = '';
Object.defineProperty(globalThis, 'navigator', {
  configurable: true,
  value: {
    clipboard: {
      readText: () => browserClipboard,
      writeText: (text) => {
        browserClipboard = text;
      },
    },
  },
});
await writeClipboardText('browser text');
assert.equal(await readClipboardText(), 'browser text');

globalThis.window = originalWindow;
if (originalNavigator) Object.defineProperty(globalThis, 'navigator', originalNavigator);
if (!originalNavigator) delete globalThis.navigator;
