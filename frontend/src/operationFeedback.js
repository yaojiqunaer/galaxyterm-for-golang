import { redactSensitive } from './auditLog.js';

const maxOperationErrorDetailLength = 480;

const reasonMatchers = [
  {
    reason: 'hostIdentity',
    pattern: /\b(?:host key|known[_ ]hosts?|server fingerprint)\b/i,
    retryable: false,
  },
  {
    reason: 'timeout',
    pattern: /\b(?:context deadline exceeded|timed? out|timeout)\b/i,
    retryable: true,
  },
  {
    reason: 'authentication',
    pattern: /\b(?:authenticate|authentication|credential|unauthorized|invalid password|login failed|ssh agent|ssh_auth_sock)\b/i,
    retryable: false,
  },
  {
    reason: 'permission',
    pattern: /\b(?:permission denied|access denied|forbidden|operation not permitted)\b/i,
    retryable: false,
  },
  {
    reason: 'unavailable',
    pattern: /\b(?:unknown provider|provider unavailable|not installed|registry unavailable|executable not found)\b/i,
    retryable: false,
  },
  {
    reason: 'validation',
    pattern: /\b(?:invalid request|missing required|outside the valid range|required field)\b/i,
    retryable: false,
  },
  {
    reason: 'network',
    pattern: /\b(?:connection refused|connection reset|network|no route|host unreachable|dial tcp|dns|socket|keepalive)\b/i,
    retryable: true,
  },
];

export function buildOperationError(error, options = {}) {
  const detail = boundDetail(redactSensitive(operationErrorMessage(error)));
  const packageFailure = options.scope === 'extension'
    && /\b(?:checksum|signature|manifest|package|archive|gtx)\b/i.test(detail);
  const match = packageFailure
    ? { reason: 'package', retryable: false }
    : reasonMatchers.find((candidate) => candidate.pattern.test(detail));
  const reason = match?.reason || 'generic';
  return {
    detail,
    reason,
    reasonKey: `operation.error.reason.${reason}`,
    retryable: match?.retryable === true,
    suggestionKey: `operation.error.suggestion.${reason}`,
  };
}

function operationErrorMessage(error) {
  if (typeof error === 'string') return stripErrorPrefix(error);
  if (!error || typeof error !== 'object') return '';
  if (typeof error.defaultMessage === 'string') return stripErrorPrefix(error.defaultMessage);
  if (typeof error.message === 'string') return stripErrorPrefix(error.message);
  if (error.error) return operationErrorMessage(error.error);
  try {
    return stripErrorPrefix(JSON.stringify(error));
  } catch {
    return '';
  }
}

function stripErrorPrefix(value) {
  return String(value || '').trim().replace(/^error:\s*/i, '');
}

function boundDetail(value) {
  if (value.length <= maxOperationErrorDetailLength) return value;
  return `${value.slice(0, maxOperationErrorDetailLength - 3).trimEnd()}...`;
}
