const units = ['B', 'KB', 'MB', 'GB', 'TB'];
const remoteFileNameCollator = new Intl.Collator(undefined, { numeric: true, sensitivity: 'base' });

export function buildSavedSshConnections(profiles = []) {
  return profiles
    .filter((profile) => profile?.providerType === 'ssh')
    .sort((left, right) => {
      const favoriteDelta = Number(!!right.favorite) - Number(!!left.favorite);
      if (favoriteDelta) return favoriteDelta;
      const recentDelta = Date.parse(right.lastUsedAt || 0) - Date.parse(left.lastUsedAt || 0);
      if (Number.isFinite(recentDelta) && recentDelta) return recentDelta;
      return String(left.displayName || '').localeCompare(String(right.displayName || ''));
    })
    .map((profile) => {
      const authType = profile.auth?.authType || 'password';
      const credentialRef = profile.auth?.credentialRef;
      return {
        authType,
        credentialSaved: !!credentialRef,
        description: `${profile.auth?.username ? `${profile.auth.username}@` : ''}${profile.config?.host || '-'}:${profile.config?.port || 22}`,
        displayName: profile.displayName,
        favorite: !!profile.favorite,
        group: profile.group || '',
        hasSavedSecret: authType === 'privateKey'
          ? !!credentialRef?.hasPrivateKey
          : !!credentialRef?.hasPassword,
        id: profile.id,
      };
    });
}

export function buildSshProfileFields(profile = {}) {
  if (profile.providerType !== 'ssh') return null;
  return {
    authType: profile.auth?.authType || 'password',
    displayName: profile.displayName || '',
    host: profile.config?.host || '',
    port: profile.config?.port || 22,
    profileId: profile.id || '',
    username: profile.auth?.username || '',
  };
}

export function buildSshConnectionAuth(fields = {}, resolvedProfileRequest = null) {
  const resolvedAuth = resolvedProfileRequest?.auth || {};
  const authType = fields.authType || resolvedAuth.authType || 'password';
  return {
    authType,
    passphrase: authType === 'privateKey'
      ? fields.passphrase || resolvedAuth.passphrase || ''
      : '',
    password: authType === 'password'
      ? fields.password || resolvedAuth.password || ''
      : '',
    privateKey: authType === 'privateKey'
      ? fields.privateKey || resolvedAuth.privateKey || ''
      : '',
  };
}

function readableBytes(bytes) {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 B';
  let value = bytes;
  let unitIndex = 0;
  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }
  const rounded = value >= 10 || unitIndex === 0 ? Math.round(value) : Math.round(value * 10) / 10;
  return `${rounded} ${units[unitIndex]}`;
}

export function buildRemoteFileSummary(entries = [], { path = '.', loading = false } = {}) {
  const directories = entries.filter((entry) => entry.isDir).length;
  const files = entries.length - directories;
  const totalBytes = entries.reduce((total, entry) => total + (entry.isDir ? 0 : Number(entry.size || 0)), 0);
  return {
    path: path || '.',
    total: entries.length,
    directories,
    files,
    totalBytes,
    readableSize: readableBytes(totalBytes),
    state: loading ? 'loading' : entries.length > 0 ? 'ready' : 'empty',
  };
}

export function buildRemoteFileBreadcrumbs(path = '.') {
  const currentPath = String(path || '.').trim() || '.';
  if (currentPath === '/' || currentPath === '.') {
    return [{ key: currentPath, label: currentPath, path: currentPath }];
  }

  const absolute = currentPath.startsWith('/');
  const parts = currentPath.split('/').filter(Boolean);
  const crumbs = absolute
    ? [{ key: '/', label: '/', path: '/' }]
    : [{ key: '.', label: '.', path: '.' }];

  parts.forEach((part, index) => {
    const prefix = parts.slice(0, index + 1).join('/');
    const crumbPath = absolute ? `/${prefix}` : prefix;
    crumbs.push({
      key: crumbPath,
      label: part,
      path: crumbPath,
    });
  });

  return crumbs;
}

export function buildRemoteFileActions(entry = {}, capabilities = []) {
  const supported = new Set(capabilities);
  const actions = [];
  if (entry.isDir && supported.has('list')) {
    actions.push({ key: 'open', labelKey: 'action.open' });
  }
  if (!entry.isDir && supported.has('read')) {
    actions.push({
      key: supported.has('write') ? 'edit' : 'view',
      labelKey: supported.has('write') ? 'action.edit' : 'action.view',
    });
  }
  if (!entry.isDir && supported.has('download')) {
    actions.push({ key: 'download', labelKey: 'action.download' });
  }
  if (supported.has('rename')) {
    actions.push({ key: 'rename', labelKey: 'action.rename' });
  }
  if (supported.has('delete')) {
    actions.push({ danger: true, key: 'delete', labelKey: 'action.delete' });
  }
  return actions;
}

export function buildRemoteRenameDestination(entryPath = '', nextName = '') {
  const name = String(nextName || '').trim();
  if (!name || name === '.' || name === '..' || /[/\\]/.test(name)) return '';
  const source = String(entryPath || '').trim();
  if (!source) return '';
  const normalized = source.replace(/\/+$/, '');
  const separator = normalized.lastIndexOf('/');
  if (separator < 0) return name;
  if (separator === 0) return `/${name}`;
  return `${normalized.slice(0, separator)}/${name}`;
}

export function buildRemoteFileView(entries = [], { query = '', sortBy = 'name' } = {}) {
  const normalizedQuery = String(query || '').trim().toLocaleLowerCase();
  const visibleEntries = entries.filter((entry) => {
    if (!normalizedQuery) return true;
    return `${entry?.name || ''}\n${entry?.path || ''}`.toLocaleLowerCase().includes(normalizedQuery);
  });
  visibleEntries.sort((left, right) => {
    const directoryOrder = Number(!!right?.isDir) - Number(!!left?.isDir);
    if (directoryOrder) return directoryOrder;
    if (sortBy === 'modified') {
      const modifiedOrder = safeTimestamp(right?.modTime) - safeTimestamp(left?.modTime);
      if (modifiedOrder) return modifiedOrder;
    }
    if (sortBy === 'size') {
      const sizeOrder = safeNumber(right?.size) - safeNumber(left?.size);
      if (sizeOrder) return sizeOrder;
    }
    return remoteFileNameCollator.compare(String(left?.name || ''), String(right?.name || ''));
  });
  return {
    entries: visibleEntries,
    filtered: normalizedQuery.length > 0,
    total: entries.length,
    visible: visibleEntries.length,
  };
}

function safeTimestamp(value) {
  const parsed = Date.parse(value || '');
  return Number.isFinite(parsed) ? parsed : 0;
}

function safeNumber(value) {
  const parsed = Number(value || 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function splitAddress(address = '') {
  const text = String(address || '');
  const index = text.lastIndexOf(':');
  if (index <= 0) return { host: text, port: '' };
  return {
    host: text.slice(0, index),
    port: text.slice(index + 1),
  };
}

export function buildTunnelSummary(tunnels = []) {
  return {
    total: tunnels.length,
    localPorts: tunnels.map((item) => splitAddress(item.localAddr).port).filter(Boolean),
    remoteHosts: [...new Set(tunnels.map((item) => splitAddress(item.remoteAddr).host).filter(Boolean))],
    sshHosts: [...new Set(tunnels.map((item) => splitAddress(item.sshAddr).host).filter(Boolean))],
  };
}

export function buildTunnelDisplay(tunnel = {}) {
  const local = splitAddress(tunnel.localAddr);
  const remote = splitAddress(tunnel.remoteAddr);
  const ssh = splitAddress(tunnel.sshAddr);
  const name = tunnel.name || tunnel.localAddr || tunnel.id || 'Tunnel';
  return {
    id: tunnel.id,
    name,
    route: `${tunnel.localAddr || ''} -> ${tunnel.remoteAddr || ''}`,
    via: tunnel.sshAddr || '',
    localHost: local.host,
    localPort: local.port,
    remoteHost: remote.host,
    remotePort: remote.port,
    sshHost: ssh.host,
  };
}
