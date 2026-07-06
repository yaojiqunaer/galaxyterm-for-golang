import assert from 'node:assert/strict';
import {
  defaultExtensionSources,
  normalizeExtensionSource,
  upsertExtensionSource,
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
