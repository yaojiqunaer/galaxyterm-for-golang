import assert from 'node:assert/strict';
import {
  buildExtensionAction,
  buildExtensionCardFacts,
  buildExtensionSummary,
  buildInstalledExtensionRows,
} from './extensionPresentation.js';

const providers = [
  { type: 'local', category: 'builtin' },
  { type: 'ssh', category: 'builtin' },
  { type: 'mysql', category: 'extension' },
];

const installedExtensions = [
  {
    id: 'galaxyterm-extension-mysql',
    name: 'MySQL',
    version: '0.1.0',
    providers: [{ type: 'mysql', capabilities: ['stream', 'query'] }],
  },
  {
    id: 'galaxyterm-extension-kubernetes',
    name: 'Kubernetes',
    version: '0.2.0',
    providers: [{ type: 'kubernetes', capabilities: ['stream'] }],
  },
];

assert.deepEqual(buildExtensionSummary({ providers, installedExtensions }), {
  builtinProviders: 2,
  extensionProviders: 1,
  installedExtensions: 2,
  installedProviderTypes: ['mysql', 'kubernetes'],
});

assert.deepEqual(buildExtensionAction({ status: 'planned' }), {
  key: 'install',
  enabled: true,
  tone: 'primary',
});
assert.deepEqual(buildExtensionAction({ status: 'installed' }), {
  key: 'manage',
  enabled: false,
  tone: 'default',
});
assert.deepEqual(buildExtensionAction({ status: 'builtin' }), {
  key: 'builtin',
  enabled: false,
  tone: 'default',
});

assert.deepEqual(buildExtensionCardFacts({
  type: 'redis',
  status: 'planned',
  providers: [{ type: 'redis', capabilities: ['stream'] }],
}), [
  { key: 'type', value: 'redis' },
  { key: 'status', value: 'planned' },
  { key: 'capabilities', value: 'stream' },
]);

assert.deepEqual(buildInstalledExtensionRows(installedExtensions), [
  {
    id: 'galaxyterm-extension-mysql',
    name: 'MySQL',
    version: '0.1.0',
    providers: ['mysql'],
    capabilities: ['stream', 'query'],
  },
  {
    id: 'galaxyterm-extension-kubernetes',
    name: 'Kubernetes',
    version: '0.2.0',
    providers: ['kubernetes'],
    capabilities: ['stream'],
  },
]);
