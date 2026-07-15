import assert from 'node:assert/strict';
import {
  buildEnabledFileProviders,
  buildFileProviderFormValues,
  buildExtensionAction,
  buildExtensionCardFacts,
  buildExtensionSummary,
  buildInstalledExtensionRows,
  compareExtensionVersions,
  findCatalogItemForType,
  findExtensionUpdate,
  filterProvidersByDisabledExtensions,
  fileProviderSupports,
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
  {
    id: 'galaxyterm-extension-s3',
    name: 'S3',
    version: '0.1.0',
    fileProviders: [{ type: 's3', protocol: 's3', capabilities: ['list', 'read', 'write'] }],
  },
];

assert.deepEqual(buildExtensionSummary({ providers, installedExtensions }), {
  builtinProviders: 2,
  disabledExtensions: 0,
  enabledExtensions: 3,
  extensionProviders: 1,
  installedExtensions: 3,
  installedFileProviderTypes: ['s3'],
  installedProviderTypes: ['mysql', 'kubernetes'],
});

assert.deepEqual(buildExtensionSummary({
  providers,
  installedExtensions,
  disabledExtensionIds: ['galaxyterm-extension-kubernetes'],
}), {
  builtinProviders: 2,
  disabledExtensions: 1,
  enabledExtensions: 2,
  extensionProviders: 1,
  installedExtensions: 3,
  installedFileProviderTypes: ['s3'],
  installedProviderTypes: ['mysql', 'kubernetes'],
});

assert.deepEqual(buildEnabledFileProviders([
  {
    id: 'galaxyterm-extension-sftp',
    name: 'SFTP',
    fileProviders: [{
      type: 'sftp',
      protocol: 'sftp',
      nameKey: 'extension.sftp.name',
      capabilities: ['list', 'read', 'write'],
      authMethods: ['password', 'privateKey'],
      configFields: [
        { key: 'endpoint', type: 'string', required: true },
        { key: 'port', type: 'number', default: 22 },
      ],
      authFields: [{ key: 'password', type: 'password', required: true }],
    }],
  },
  {
    id: 'galaxyterm-extension-s3',
    name: 'S3',
    fileProviders: [{ type: 's3', protocol: 's3', capabilities: ['list'] }],
  },
], ['galaxyterm-extension-s3']), [{
  extensionId: 'galaxyterm-extension-sftp',
  extensionName: 'SFTP',
  type: 'sftp',
  protocol: 'sftp',
  nameKey: 'extension.sftp.name',
  description: '',
  capabilities: ['list', 'read', 'write'],
  authMethods: ['password', 'privateKey'],
  configFields: [
    { key: 'endpoint', type: 'string', required: true },
    { key: 'port', type: 'number', default: 22 },
  ],
  authFields: [{ key: 'password', type: 'password', required: true }],
}]);

assert.deepEqual(buildFileProviderFormValues({
  configFields: [
    { key: 'endpoint', type: 'string' },
    { key: 'port', type: 'number', default: 443 },
    { key: 'pathStyle', type: 'boolean', default: false },
  ],
  authFields: [
    { key: 'accessKey', type: 'string' },
    { key: 'password', type: 'password' },
  ],
}), {
  config: { port: 443, pathStyle: false },
  auth: {},
});

assert.equal(fileProviderSupports({ capabilities: ['list', 'read'] }, 'read'), true);
assert.equal(fileProviderSupports({ capabilities: ['list'] }, 'delete'), false);
assert.equal(fileProviderSupports(null, 'list'), false);

assert.deepEqual(buildExtensionAction({ status: 'planned' }), {
	key: 'addSource',
	enabled: true,
	tone: 'default',
});
assert.deepEqual(buildExtensionAction({ status: 'planned' }, { manifest: { id: 'redis' } }), {
	key: 'installOnline',
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

assert.deepEqual(buildInstalledExtensionRows(installedExtensions, ['galaxyterm-extension-mysql']), [
  {
    enabled: false,
    id: 'galaxyterm-extension-mysql',
    name: 'MySQL',
    version: '0.1.0',
    providers: ['mysql'],
    fileProviders: [],
    capabilities: ['stream', 'query'],
  },
  {
    enabled: true,
    id: 'galaxyterm-extension-kubernetes',
    name: 'Kubernetes',
    version: '0.2.0',
    providers: ['kubernetes'],
    fileProviders: [],
    capabilities: ['stream'],
  },
  {
    enabled: true,
    id: 'galaxyterm-extension-s3',
    name: 'S3',
    version: '0.1.0',
    providers: [],
    fileProviders: ['s3'],
    capabilities: ['list', 'read', 'write'],
  },
]);

assert.deepEqual(filterProvidersByDisabledExtensions(providers, installedExtensions, [
  'galaxyterm-extension-mysql',
]).map((provider) => provider.type), ['local', 'ssh']);

const remoteCatalog = [
  {
    manifest: {
      id: 'galaxyterm-extension-sftp',
      version: '0.1.0',
      fileProviders: [{ type: 'sftp' }],
    },
  },
  {
    manifest: {
      id: 'galaxyterm-extension-sftp',
      version: '0.3.0',
      fileProviders: [{ type: 'sftp' }],
    },
  },
  {
    manifest: {
      id: 'galaxyterm-extension-redis',
      version: '1.0.0-beta.1',
      providers: [{ type: 'redis' }],
    },
  },
];
assert.equal(findCatalogItemForType(remoteCatalog, 'sftp')?.manifest.version, '0.3.0');
assert.equal(findCatalogItemForType(remoteCatalog, 'redis')?.manifest.id, 'galaxyterm-extension-redis');
assert.equal(findCatalogItemForType(remoteCatalog, 'mysql'), null);
assert.equal(compareExtensionVersions('0.3.0', '0.2.9'), 1);
assert.equal(compareExtensionVersions('1.0.0-beta.1', '1.0.0'), -1);
assert.equal(compareExtensionVersions('1.0.0', '1.0.0'), 0);
assert.equal(findExtensionUpdate({ id: 'galaxyterm-extension-sftp', version: '0.2.0' }, remoteCatalog)?.manifest.version, '0.3.0');
assert.equal(findExtensionUpdate({ id: 'galaxyterm-extension-sftp', version: '0.3.0' }, remoteCatalog), null);
