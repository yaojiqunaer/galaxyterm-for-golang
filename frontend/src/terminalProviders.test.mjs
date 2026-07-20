import assert from 'node:assert/strict';
import {
  buildExtensionTerminalFormValues,
  buildExtensionTerminalRequest,
  buildTerminalProviderSummary,
  extensionTerminalDescription,
} from './terminalProviders.js';

const provider = {
  type: 'redis',
  configFields: [
    { key: 'host', type: 'string', default: '127.0.0.1' },
    { key: 'port', type: 'number', default: 6379 },
  ],
  authFields: [{ key: 'password', type: 'password' }],
};

assert.deepEqual(buildExtensionTerminalFormValues(provider), {
  config: { host: '127.0.0.1', port: 6379 },
  auth: {},
});

assert.deepEqual(buildExtensionTerminalFormValues(provider, {
  config: { host: 'cache.internal', port: 6380 },
}), {
  config: { host: 'cache.internal', port: 6380 },
  auth: {},
});

assert.deepEqual(buildExtensionTerminalRequest(provider, 'Production cache', {
  group: 'Production',
  config: { host: 'cache.internal', port: 6380, ignored: true },
  auth: { password: 'secret', ignored: 'nope' },
}), {
  providerType: 'redis',
  displayName: 'Production cache',
  group: 'Production',
  config: { host: 'cache.internal', port: 6380 },
  auth: { password: 'secret' },
});

assert.equal(extensionTerminalDescription(provider, { config: { host: 'cache.internal', port: 6380 } }), 'cache.internal:6380');
assert.equal(extensionTerminalDescription({ type: 'kubernetes' }, { config: { namespace: 'apps', pod: 'api-0' } }), 'apps / api-0');

assert.deepEqual(buildTerminalProviderSummary({
  type: 'redis',
  category: 'extension',
  description: 'Interactive Redis terminal',
  extensionId: 'galaxyterm-extension-redis',
  extensionVersion: '0.2.0',
  capabilities: ['stream', 'resize'],
}), {
  capabilities: ['stream', 'resize'],
  description: 'Interactive Redis terminal',
  extensionId: 'galaxyterm-extension-redis',
  extensionVersion: '0.2.0',
  isExtension: true,
});

console.log('terminal provider tests passed');
