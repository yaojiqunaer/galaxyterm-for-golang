import assert from 'node:assert/strict';

const interactionModule = await import('./terminalInteraction.js').catch(() => ({}));

assert.equal(
  typeof interactionModule.normalizeTerminalExternalLink,
  'function',
  'terminal interaction must expose a safe external-link normalizer',
);

const {
  buildTerminalEventError,
  isTerminalViewportAtBottom,
  normalizeTerminalExternalLink,
  shouldActivateTerminalLink,
} = interactionModule;

assert.deepEqual(buildTerminalEventError({
  Error: {
    messageKey: 'error.ssh.keepalive',
    defaultMessage: 'raw keepalive failure',
  },
}), {
  fallback: 'raw keepalive failure',
  messageKey: 'error.ssh.keepalive',
});
assert.deepEqual(buildTerminalEventError({}), { fallback: '', messageKey: '' });

assert.equal(normalizeTerminalExternalLink('https://example.com/docs?q=terminal'), 'https://example.com/docs?q=terminal');
assert.equal(normalizeTerminalExternalLink('http://localhost:8080/health'), 'http://localhost:8080/health');
assert.equal(normalizeTerminalExternalLink('javascript:alert(1)'), '');
assert.equal(normalizeTerminalExternalLink('file:///etc/passwd'), '');
assert.equal(normalizeTerminalExternalLink('ftp://example.com/archive'), '');
assert.equal(normalizeTerminalExternalLink('https://user:secret@example.com'), '');
assert.equal(normalizeTerminalExternalLink('not a url'), '');

assert.equal(shouldActivateTerminalLink({ button: 0, metaKey: true }), true);
assert.equal(shouldActivateTerminalLink({ button: 0, ctrlKey: true }), true);
assert.equal(shouldActivateTerminalLink({ button: 0 }), false);
assert.equal(shouldActivateTerminalLink({ button: 1, metaKey: true }), false);

assert.equal(isTerminalViewportAtBottom(120, 120), true);
assert.equal(isTerminalViewportAtBottom(119, 120), false);
assert.equal(isTerminalViewportAtBottom(undefined, 120), true);

console.log('terminal interaction tests passed');
