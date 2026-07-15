import assert from 'node:assert/strict';
import {
  defaultExtensionSources,
  normalizeExtensionSource,
  removeExtensionCatalogSource,
  upsertExtensionSource,
  replaceExtensionCatalogSource,
  removeExtensionSource,
} from './extensionSources.js';

assert.deepEqual(defaultExtensionSources, []);

assert.deepEqual(normalizeExtensionSource({
  name: ' Official ',
  url: ' https://github.com/example/galaxyterm-extensions/releases ',
  type: 'github',
}), {
  id: 'https://github.com/example/galaxyterm-extensions/releases',
  name: 'Official',
  url: 'https://github.com/example/galaxyterm-extensions/releases',
  type: 'github',
});

assert.equal(normalizeExtensionSource({ name: '', url: 'https://github.com/example/releases' }), null);
assert.equal(normalizeExtensionSource({ name: 'Broken', url: '' }), null);
assert.equal(normalizeExtensionSource({ name: 'Insecure', url: 'http://example.com/index.json' }), null);
assert.equal(normalizeExtensionSource({ name: 'Credential', url: 'https://user:secret@example.com/index.json' }), null);

const first = upsertExtensionSource([], {
  name: 'Official',
  url: 'https://github.com/example/releases',
  type: 'github',
});
assert.equal(first.length, 1);

const updated = upsertExtensionSource(first, {
  name: 'Official Mirror',
  url: 'https://github.com/example/releases',
  type: 'github',
});
assert.deepEqual(updated, [{
  id: 'https://github.com/example/releases',
  name: 'Official Mirror',
  url: 'https://github.com/example/releases',
  type: 'github',
}]);

assert.deepEqual(removeExtensionSource(updated, 'https://github.com/example/releases'), []);

const catalog = replaceExtensionCatalogSource([], first[0], [{
  manifest: { id: 'galaxyterm-extension-sftp', version: '0.1.0' },
  asset: { url: 'https://example.com/sftp.gtx' },
}]);
assert.deepEqual(catalog, [{
  manifest: { id: 'galaxyterm-extension-sftp', version: '0.1.0' },
  asset: { url: 'https://example.com/sftp.gtx' },
  sourceId: first[0].id,
  sourceName: first[0].name,
}]);

const secondSource = normalizeExtensionSource({
  name: 'Community',
  url: 'https://github.com/example/community/releases',
});
const withSecond = replaceExtensionCatalogSource(catalog, secondSource, [{
  manifest: { id: 'galaxyterm-extension-ftp', version: '0.1.0' },
  asset: { url: 'https://example.com/ftp.gtx' },
}]);
const refreshedFirst = replaceExtensionCatalogSource(withSecond, first[0], [{
  manifest: { id: 'galaxyterm-extension-sftp', version: '0.2.0' },
  asset: { url: 'https://example.com/sftp-0.2.0.gtx' },
}]);
assert.deepEqual(refreshedFirst.map((item) => `${item.sourceName}:${item.manifest.version}`), [
  'Community:0.1.0',
  'Official:0.2.0',
]);
assert.deepEqual(removeExtensionCatalogSource(refreshedFirst, secondSource.id), [refreshedFirst[1]]);
