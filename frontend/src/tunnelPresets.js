export const tunnelPresetStorageKey = 'galaxyterm.tunnelPresets.v1';

const tunnelPresetLimit = 100;

export function buildTunnelPreset(values = {}, options = {}) {
  const existing = options.existing || null;
  const timestamp = options.now?.() || new Date().toISOString();
  const preset = {
    id: String(existing?.id || values.id || options.idFactory?.() || createTunnelPresetID()).trim(),
    name: String(values.name || '').trim(),
    profileId: String(values.profileId || '').trim(),
    localHost: String(values.localHost || '127.0.0.1').trim() || '127.0.0.1',
    localPort: normalizePort(values.localPort),
    remoteHost: String(values.remoteHost || '').trim(),
    remotePort: normalizePort(values.remotePort),
    createdAt: existing?.createdAt || values.createdAt || timestamp,
    updatedAt: timestamp,
  };
  if (!preset.name) preset.name = `${preset.remoteHost}:${preset.remotePort || ''}`;
  if (!isValidTunnelPreset(preset)) return null;
  return preset;
}

export function duplicateTunnelPreset(preset = {}, options = {}) {
  return buildTunnelPreset({
    ...preset,
    id: '',
    name: options.name || preset.name,
    createdAt: '',
  }, {
    idFactory: options.idFactory,
    now: options.now,
  });
}

export function upsertTunnelPreset(presets = [], preset = null) {
  const current = normalizeTunnelPresetList(presets);
  if (!preset) return current;
  const normalized = buildTunnelPreset(preset, {
    existing: preset,
    now: () => preset.updatedAt || new Date().toISOString(),
  });
  if (!normalized) return current;
  const index = current.findIndex((item) => item.id === normalized.id);
  if (index < 0) return [...current, normalized].slice(0, tunnelPresetLimit);
  return current.map((item, itemIndex) => (itemIndex === index ? normalized : item));
}

export function removeTunnelPreset(presets = [], presetId = '') {
  return normalizeTunnelPresetList(presets).filter((item) => item.id !== presetId);
}

export function filterTunnelPresets(presets = [], query = '', profiles = []) {
  const keywords = String(query || '').trim().toLowerCase().split(/\s+/).filter(Boolean);
  const profileNames = new Map(profiles.map((profile) => [profile.id, profile.displayName || '']));
  return normalizeTunnelPresetList(presets).filter((preset) => {
    if (keywords.length === 0) return true;
    const searchable = [
      preset.name,
      preset.localHost,
      preset.localPort,
      preset.remoteHost,
      preset.remotePort,
      profileNames.get(preset.profileId),
    ].join(' ').toLowerCase();
    return keywords.every((keyword) => searchable.includes(keyword));
  });
}

export function resolveTunnelPreset(preset = {}, profiles = [], tunnels = []) {
  const profile = profiles.find((item) => (
    item.id === preset.profileId && item.providerType === 'ssh'
  ));
  const runtime = tunnels.find((item) => (
    item.presetId === preset.id && item.status !== 'error'
  ));
  const authType = profile?.auth?.authType || 'password';
  const credentialRef = profile?.auth?.credentialRef;
  const credentialReady = Boolean(profile) && (
    authType === 'agent'
    || (authType === 'privateKey' && credentialRef?.hasPrivateKey)
    || (authType === 'password' && credentialRef?.hasPassword)
  );
  return {
    available: Boolean(profile),
    credentialReady,
    profileName: profile?.displayName || '',
    running: Boolean(runtime),
    runtimeId: runtime?.id || '',
  };
}

export function loadTunnelPresets(storage = globalThis.localStorage) {
  try {
    const parsed = JSON.parse(storage?.getItem(tunnelPresetStorageKey) || '[]');
    return normalizeTunnelPresetList(Array.isArray(parsed) ? parsed : parsed?.presets);
  } catch {
    return [];
  }
}

export function persistTunnelPresets(presets = [], storage = globalThis.localStorage) {
  const normalized = normalizeTunnelPresetList(presets);
  if (typeof storage?.setItem !== 'function') {
    return { persisted: false, presets: normalized };
  }
  try {
    storage.setItem(tunnelPresetStorageKey, JSON.stringify({
      version: 1,
      presets: normalized,
    }));
    return { persisted: true, presets: normalized };
  } catch {
    return { persisted: false, presets: normalized };
  }
}

function normalizeTunnelPresetList(presets) {
  if (!Array.isArray(presets)) return [];
  const seen = new Set();
  return presets
    .map((preset) => buildTunnelPreset(preset, {
      existing: preset,
      now: () => preset.updatedAt || preset.createdAt || new Date().toISOString(),
    }))
    .filter((preset) => {
      if (!preset || seen.has(preset.id)) return false;
      seen.add(preset.id);
      return true;
    })
    .slice(0, tunnelPresetLimit);
}

function isValidTunnelPreset(preset) {
  return Boolean(
    preset.id
    && preset.profileId
    && preset.localPort
    && preset.remoteHost
    && preset.remotePort
  );
}

function normalizePort(value) {
  const port = Number(value);
  return Number.isInteger(port) && port >= 1 && port <= 65535 ? port : 0;
}

function createTunnelPresetID() {
  return globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random()}`;
}
