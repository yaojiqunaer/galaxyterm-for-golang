const secretPatterns = [
  /-----BEGIN [A-Z ]*PRIVATE KEY-----[\s\S]*?-----END [A-Z ]*PRIVATE KEY-----/g,
  /(authorization:\s*(?:bearer|basic)\s+)[^\s]+/gi,
  /((?:password|passwd|pwd|token|secret|access[_-]?key|api[_-]?key)\s*[:=]\s*)[^\s'";&]+/gi,
  /(-p)(?!\s)([^\s]+)/gi,
];

export function redactSensitive(value = '') {
  return String(value).replace(secretPatterns[0], '[REDACTED]').replace(secretPatterns[1], '$1[REDACTED]').replace(secretPatterns[2], '$1[REDACTED]').replace(secretPatterns[3], '$1[REDACTED]');
}

export function createAuditEvent({
  at = new Date().toISOString(),
  detail = '',
  sessionId = '',
  sessionLabel = '',
  type,
}) {
  return {
    id: randomId('audit'),
    at,
    detail: redactSensitive(detail),
    sessionId,
    sessionLabel,
    type,
  };
}

export function buildAsciinemaCast({
  command = '',
  env = { TERM: 'xterm-256color' },
  height = 24,
  outputEvents = [],
  timestamp = Math.floor(Date.now() / 1000),
  title = 'GalaxyTerm session',
  width = 80,
}) {
  const header = {
    version: 2,
    width,
    height,
    timestamp,
    env,
    title,
    command,
  };
  return [
    JSON.stringify(header),
    ...outputEvents.map((event) => JSON.stringify([
      Number(event.time || 0),
      'o',
      redactSensitive(event.data || ''),
    ])),
  ].join('\n');
}

export function buildAuditRecord({
  auditEvents = [],
  cast = '',
  endedAt = new Date().toISOString(),
  id = randomId('record'),
  providerType = '',
  screen = '',
  sessionId = '',
  startedAt = '',
  title = '',
}) {
  return {
    id,
    auditEvents,
    cast,
    endedAt,
    providerType,
    screen: redactSensitive(screen),
    sessionId,
    startedAt,
    title,
  };
}

function randomId(prefix) {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
  return `${prefix}-${Date.now()}-${Math.random()}`;
}
