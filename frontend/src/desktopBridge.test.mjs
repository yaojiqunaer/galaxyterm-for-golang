import assert from 'node:assert/strict';
import {
  bridgeUnavailableMessage,
  callWails,
  hasWailsMethod,
} from './desktopBridge.js';

const originalWindow = globalThis.window;

globalThis.window = {};
assert.equal(hasWailsMethod(['session', 'API', 'CreateSession']), false);
await assert.rejects(
  () => callWails(['session', 'API', 'CreateSession'], { providerType: 'local' }),
  (error) => error.message === bridgeUnavailableMessage,
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

globalThis.window = originalWindow;
