const units = ['B', 'KB', 'MB', 'GB', 'TB'];

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
