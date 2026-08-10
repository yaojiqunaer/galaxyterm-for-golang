import assert from 'node:assert/strict';
import {
  connectionWorkspaceStorageKey,
  defaultConnectionWorkspacePreferences,
  loadConnectionWorkspacePreferences,
  persistConnectionWorkspacePreferences,
  removeRecentConnection,
  updateConnectionWorkspacePreferences,
} from './connectionWorkspace.js';

const storageValues = new Map();
const storage = {
  getItem: (key) => storageValues.get(key) || null,
  setItem: (key, value) => storageValues.set(key, value),
};

assert.deepEqual(loadConnectionWorkspacePreferences(storage), defaultConnectionWorkspacePreferences);

storageValues.set(connectionWorkspaceStorageKey, JSON.stringify({
  showDetails: false,
  showRecent: false,
  sortBy: 'recent',
}));
assert.deepEqual(loadConnectionWorkspacePreferences(storage), {
  showDetails: false,
  showRecent: false,
  sortBy: 'recent',
});

storageValues.set(connectionWorkspaceStorageKey, JSON.stringify({
  showDetails: 'no',
  showRecent: 0,
  sortBy: 'unknown',
}));
assert.deepEqual(loadConnectionWorkspacePreferences(storage), defaultConnectionWorkspacePreferences);

storageValues.set(connectionWorkspaceStorageKey, '{broken');
assert.deepEqual(loadConnectionWorkspacePreferences(storage), defaultConnectionWorkspacePreferences);

assert.deepEqual(updateConnectionWorkspacePreferences({
  showDetails: true,
  showRecent: true,
  sortBy: 'name',
}, { showDetails: false }), {
  showDetails: false,
  showRecent: true,
  sortBy: 'name',
});

assert.deepEqual(persistConnectionWorkspacePreferences({
  showDetails: false,
  showRecent: true,
  sortBy: 'provider',
}, storage), {
  showDetails: false,
  showRecent: true,
  sortBy: 'provider',
});
assert.deepEqual(JSON.parse(storageValues.get(connectionWorkspaceStorageKey)), {
  showDetails: false,
  showRecent: true,
  sortBy: 'provider',
});

const recentConnections = [
  { id: 'one', displayName: 'One' },
  { id: 'two', displayName: 'Two' },
];
assert.deepEqual(removeRecentConnection(recentConnections, 'one'), [recentConnections[1]]);
assert.equal(removeRecentConnection(recentConnections, 'missing'), recentConnections);
assert.equal(removeRecentConnection(recentConnections, ''), recentConnections);
