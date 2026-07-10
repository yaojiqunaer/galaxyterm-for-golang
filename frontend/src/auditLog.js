const secretPatterns = [
  /-----BEGIN [A-Z ]*PRIVATE KEY-----[\s\S]*?-----END [A-Z ]*PRIVATE KEY-----/g,
  /(authorization:\s*(?:bearer|basic)\s+)[^\s]+/gi,
  /((?:password|passwd|pwd|token|secret|access[_-]?key|api[_-]?key)\s*[:=]\s*)[^\s'";&]+/gi,
  /(--?(?:password|passwd|pwd|token|secret|access[_-]?key|api[_-]?key)(?:=|\s+))[^\s'";&]+/gi,
  /(-p)(?!\s)([^\s]+)/gi,
];

export function redactSensitive(value = '') {
  return String(value)
    .replace(secretPatterns[0], '[REDACTED]')
    .replace(secretPatterns[1], '$1[REDACTED]')
    .replace(secretPatterns[2], '$1[REDACTED]')
    .replace(secretPatterns[3], '$1[REDACTED]')
    .replace(secretPatterns[4], '$1[REDACTED]');
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
    env: redactObject(env),
    title: redactSensitive(title),
    command: redactSensitive(command),
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

export function parseAsciinemaCast(cast = '') {
  const lines = String(cast).split(/\r?\n/).filter(Boolean);
  if (lines.length === 0) return { duration: 0, events: [], header: {} };
  const header = safeJsonParse(lines[0]) || {};
  const events = lines.slice(1).map((line) => {
    const item = safeJsonParse(line);
    if (!Array.isArray(item) || item.length < 3 || item[1] !== 'o') return null;
    return {
      data: String(item[2] || ''),
      time: Number(item[0]) || 0,
    };
  }).filter(Boolean);
  const duration = events.reduce((max, event) => Math.max(max, event.time), 0);
  return { duration, events, header };
}

export function renderCastFrame(events = [], time = 0) {
  return events
    .filter((event) => event.time <= time)
    .map((event) => event.data)
    .join('');
}

export function renderReplayFrame(events = [], time = 0) {
  return normalizeTerminalReplay(renderCastFrame(events, time));
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
  return sanitizeAuditRecord({
    id,
    auditEvents,
    cast,
    endedAt,
    providerType,
    screen,
    sessionId,
    startedAt,
    title,
  });
}

export function sanitizeAuditRecord(record = {}) {
  return {
    ...record,
    auditEvents: redactAuditEvents(Array.isArray(record.auditEvents) ? record.auditEvents : []),
    cast: redactAsciinemaCast(record.cast || ''),
    screen: redactSensitive(record.screen || ''),
    title: redactSensitive(record.title || ''),
  };
}

export function buildAuditRecordSummary(record = {}) {
  const parsedCast = parseAsciinemaCast(record.cast || '');
  return {
    duration: parsedCast.duration,
    eventCount: (record.auditEvents || []).length,
    hasRecording: parsedCast.events.length > 0,
    providerType: record.providerType || 'terminal',
    title: record.title || 'Untitled',
  };
}

export function resolveReplayEventTime(events = [], currentTime = 0, direction = 'next') {
  if (events.length === 0) return 0;
  const times = events.map((event) => Number(event.time) || 0).sort((left, right) => left - right);
  if (direction === 'previous') {
    const previous = [...times].reverse().find((time) => time < currentTime);
    return previous ?? times[0];
  }
  const next = times.find((time) => time > currentTime);
  return next ?? times[times.length - 1];
}

function safeJsonParse(value) {
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

function redactObject(value = {}) {
  return Object.fromEntries(Object.entries(value || {}).map(([key, item]) => [
    key,
    typeof item === 'string' ? redactSensitive(item) : item,
  ]));
}

function redactAuditEvents(events = []) {
  return events.map((event) => ({
    ...event,
    detail: redactSensitive(event?.detail || ''),
  }));
}

function redactAsciinemaCast(cast = '') {
  const lines = String(cast || '').split(/\r?\n/);
  if (lines.length === 0 || !lines[0]) return cast;
  return lines.map((line, index) => {
    const item = safeJsonParse(line);
    if (index === 0 && item && !Array.isArray(item)) {
      return JSON.stringify({
        ...item,
        command: redactSensitive(item.command || ''),
        env: redactObject(item.env || {}),
        title: redactSensitive(item.title || ''),
      });
    }
    if (Array.isArray(item) && item.length >= 3) {
      return JSON.stringify([
        item[0],
        item[1],
        typeof item[2] === 'string' ? redactSensitive(item[2]) : item[2],
        ...item.slice(3),
      ]);
    }
    return line;
  }).join('\n');
}

function randomId(prefix) {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
  return `${prefix}-${Date.now()}-${Math.random()}`;
}

function normalizeTerminalReplay(value = '') {
  return String(value)
    .replace(/\u001b\][^\u0007]*(?:\u0007|\u001b\\)/g, '')
    .replace(/\u001b\[[0-?]*[ -/]*[@-~]/g, '')
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/\u0008/g, '');
}
