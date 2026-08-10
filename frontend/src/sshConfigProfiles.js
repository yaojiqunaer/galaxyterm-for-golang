const sshConfigGroup = 'SSH Config';

export function parseSshConfigProfiles(content, options = {}) {
  const idFactory = options.idFactory || defaultIdFactory;
  const profiles = [];
  let activeProfiles = [];

  content.split(/\r?\n/).forEach((line) => {
    const stripped = stripInlineComment(line).trim();
    if (!stripped) return;

    const [rawKey, ...rawValueParts] = stripped.split(/\s+/);
    const key = rawKey.toLowerCase();
    const value = rawValueParts.join(' ').trim();
    if (!value) return;

    if (key === 'host') {
      activeProfiles = value
        .split(/\s+/)
        .filter((alias) => alias && !alias.includes('*') && !alias.includes('?') && alias !== '!')
        .map((alias) => ({
          id: idFactory(alias),
          providerType: 'ssh',
          displayName: alias,
          group: sshConfigGroup,
          config: {
            agentSocketPath: '',
            connectTimeoutSeconds: 10,
            host: alias,
            keepAliveIntervalSeconds: 0,
            keepAliveMaxFailures: 3,
            port: 22,
            identityFile: '',
          },
          auth: {
            username: '',
            authType: 'password',
          },
        }));
      profiles.push(...activeProfiles);
      return;
    }

    if (activeProfiles.length === 0) return;

    activeProfiles.forEach((profile) => {
      if (key === 'hostname') profile.config.host = value;
      if (key === 'user') profile.auth.username = value;
      if (key === 'port') profile.config.port = normalizePort(value);
      if (key === 'identityfile') {
        profile.config.identityFile = value;
        profile.auth.authType = 'privateKey';
      }
      if (key === 'identityagent' && !profile.config.identityFile) {
        profile.config.agentSocketPath = value;
        profile.auth.authType = 'agent';
      }
      if (key === 'connecttimeout') {
        profile.config.connectTimeoutSeconds = normalizeInteger(value, 1, 120, 10);
      }
      if (key === 'serveraliveinterval') {
        profile.config.keepAliveIntervalSeconds = normalizeKeepAliveInterval(value);
      }
      if (key === 'serveralivecountmax') {
        profile.config.keepAliveMaxFailures = normalizeInteger(value, 1, 10, 3);
      }
    });
  });

  return profiles.filter((profile) => profile.config.host);
}

function normalizePort(value) {
  const port = Number(value);
  if (!Number.isInteger(port) || port < 1 || port > 65535) return 22;
  return port;
}

function normalizeInteger(value, min, max, fallback) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < min || parsed > max) return fallback;
  return parsed;
}

function normalizeKeepAliveInterval(value) {
  const parsed = Number(value);
  if (parsed === 0) return 0;
  if (!Number.isInteger(parsed) || parsed < 5 || parsed > 300) return 0;
  return parsed;
}

function stripInlineComment(line) {
  const trimmed = line.trimStart();
  if (trimmed.startsWith('#')) return '';
  return line;
}

function defaultIdFactory(alias) {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
  return `ssh-config-${alias}-${Date.now()}-${Math.random()}`;
}
