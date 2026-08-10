import assert from 'node:assert/strict';
import { buildOperationError } from './operationFeedback.js';

assert.deepEqual(buildOperationError(new Error('dial tcp 10.0.0.2:22: connection refused')), {
  detail: 'dial tcp 10.0.0.2:22: connection refused',
  reason: 'network',
  reasonKey: 'operation.error.reason.network',
  retryable: true,
  suggestionKey: 'operation.error.suggestion.network',
});

assert.deepEqual(buildOperationError('ssh keepalive failed after 3 consecutive failures'), {
  detail: 'ssh keepalive failed after 3 consecutive failures',
  reason: 'network',
  reasonKey: 'operation.error.reason.network',
  retryable: true,
  suggestionKey: 'operation.error.suggestion.network',
});

assert.deepEqual(buildOperationError('context deadline exceeded while opening session'), {
  detail: 'context deadline exceeded while opening session',
  reason: 'timeout',
  reasonKey: 'operation.error.reason.timeout',
  retryable: true,
  suggestionKey: 'operation.error.suggestion.timeout',
});

assert.deepEqual(buildOperationError({ defaultMessage: 'ssh: handshake failed: unable to authenticate' }), {
  detail: 'ssh: handshake failed: unable to authenticate',
  reason: 'authentication',
  reasonKey: 'operation.error.reason.authentication',
  retryable: false,
  suggestionKey: 'operation.error.suggestion.authentication',
});

assert.deepEqual(buildOperationError('ssh agent has no identities'), {
  detail: 'ssh agent has no identities',
  reason: 'authentication',
  reasonKey: 'operation.error.reason.authentication',
  retryable: false,
  suggestionKey: 'operation.error.suggestion.authentication',
});

assert.deepEqual(buildOperationError({ message: 'permission denied while writing /srv/app' }), {
  detail: 'permission denied while writing /srv/app',
  reason: 'permission',
  reasonKey: 'operation.error.reason.permission',
  retryable: false,
  suggestionKey: 'operation.error.suggestion.permission',
});

assert.deepEqual(buildOperationError('ssh host key changed for prod.example.com'), {
  detail: 'ssh host key changed for prod.example.com',
  reason: 'hostIdentity',
  reasonKey: 'operation.error.reason.hostIdentity',
  retryable: false,
  suggestionKey: 'operation.error.suggestion.hostIdentity',
});

assert.deepEqual(buildOperationError('checksum mismatch: manifest.json', { scope: 'extension' }), {
  detail: 'checksum mismatch: manifest.json',
  reason: 'package',
  reasonKey: 'operation.error.reason.package',
  retryable: false,
  suggestionKey: 'operation.error.suggestion.package',
});

assert.deepEqual(buildOperationError({
  error: { defaultMessage: 'unknown provider: kafka' },
}), {
  detail: 'unknown provider: kafka',
  reason: 'unavailable',
  reasonKey: 'operation.error.reason.unavailable',
  retryable: false,
  suggestionKey: 'operation.error.suggestion.unavailable',
});

const redacted = buildOperationError('request failed password=hunter2 token=abc123');
assert.equal(redacted.detail, 'request failed password=[REDACTED] token=[REDACTED]');
assert.equal(redacted.reason, 'generic');

const bounded = buildOperationError(`unexpected failure ${'x'.repeat(800)}`);
assert.ok(bounded.detail.length <= 480);
assert.ok(bounded.detail.endsWith('...'));

assert.deepEqual(buildOperationError(null), {
  detail: '',
  reason: 'generic',
  reasonKey: 'operation.error.reason.generic',
  retryable: false,
  suggestionKey: 'operation.error.suggestion.generic',
});
