const sshConfigGroup = 'SSH Config';

export function parseSshConfigProfiles(content, options = {}) {
  const idFactory = options.idFactory || defaultIdFactory;
  const profiles = [];
  const profilesByAlias = new Map();
  const assignedFields = new WeakMap();
  let activeProfiles = [];

  content.split(/\r?\n/).forEach((line) => {
    const stripped = stripInlineComment(line).trim();
    if (!stripped) return;

    const [rawKey, ...rawValueParts] = stripped.split(/\s+/);
    const key = rawKey.toLowerCase();
    const value = rawValueParts.join(' ').trim();
    if (!value) return;

    if (key === 'host') {
      const activeKeys = new Set();
      activeProfiles = value
        .split(/\s+/)
        .filter((alias) => alias && !alias.includes('*') && !alias.includes('?') && alias !== '!')
        .map((alias) => {
          const aliasKey = alias.toLocaleLowerCase();
          if (activeKeys.has(aliasKey)) return null;
          activeKeys.add(aliasKey);
          if (profilesByAlias.has(aliasKey)) return profilesByAlias.get(aliasKey);
          const profile = createSshConfigProfile(alias, idFactory);
          profilesByAlias.set(aliasKey, profile);
          assignedFields.set(profile, new Set());
          profiles.push(profile);
          return profile;
        })
        .filter(Boolean);
      return;
    }

    if (activeProfiles.length === 0) return;

    activeProfiles.forEach((profile) => {
      const assigned = assignedFields.get(profile);
      if (!assigned || assigned.has(key)) return;
      if (key === 'hostname') profile.config.host = value;
      else if (key === 'user') profile.auth.username = value;
      else if (key === 'port') profile.config.port = normalizePort(value);
      else if (key === 'identityfile') {
        profile.config.identityFile = value;
        profile.auth.authType = 'privateKey';
      } else if (key === 'identityagent' && !profile.config.identityFile) {
        profile.config.agentSocketPath = value;
        profile.auth.authType = 'agent';
      } else if (key === 'connecttimeout') {
        profile.config.connectTimeoutSeconds = normalizeInteger(value, 1, 120, 10);
      } else if (key === 'serveraliveinterval') {
        profile.config.keepAliveIntervalSeconds = normalizeKeepAliveInterval(value);
      } else if (key === 'serveralivecountmax') {
        profile.config.keepAliveMaxFailures = normalizeInteger(value, 1, 10, 3);
      } else return;
      assigned.add(key);
    });
  });

  return profiles.filter((profile) => profile.config.host);
}

function createSshConfigProfile(alias, idFactory) {
  return {
    id: idFactory(alias),
    providerType: 'ssh',
    displayName: alias,
    group: sshConfigGroup,
    importSource: { type: 'ssh-config', key: alias },
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
  };
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
