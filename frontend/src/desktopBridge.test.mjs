import assert from 'node:assert/strict';
import {
  bridgeUnavailableMessage,
  callWails,
  clipboardUnavailableMessage,
  hasWailsMethod,
  readClipboardText,
  writeClipboardText,
} from './desktopBridge.js';

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

delete globalThis.window.runtime;
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
