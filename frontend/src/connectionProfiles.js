export function shouldClearStoredSshCredential({
  editingProfileId = '',
  rememberCredential = false,
} = {}) {
  if (!editingProfileId) return false;
  return rememberCredential !== true;
}

export function hasStoredSshCredential(credentialRef = null) {
  return !!(
    credentialRef?.hasPassword
    || credentialRef?.hasPrivateKey
    || credentialRef?.hasPassphrase
    || credentialRef?.hasJumpPassword
  );
}

export function normalizeStoredConnectionProfile(profile = {}, options = {}) {
  const kind = profile.kind === 'file' ? 'file' : 'terminal';
  const preserveCredentialRef = options.preserveCredentialRef !== false;
  const credentialRef = preserveCredentialRef ? profile.auth?.credentialRef || null : null;
  const auth = kind === 'file' || profile.providerType !== 'ssh'
    ? { credentialRef }
    : {
      username: profile.auth?.username || '',
      authType: profile.auth?.authType || 'password',
      jumpUsername: profile.auth?.jumpUsername || '',
      credentialRef,
    };
  return {
    id: profile.id || createProfileID(),
    kind,
    providerType: profile.providerType,
    displayName: profile.displayName,
    group: profile.group || '',
    tags: normalizeConnectionTags(profile.tags),
    ...(kind === 'file' ? { filePath: profile.filePath || '.' } : {}),
    config: { ...(profile.config || {}) },
    favorite: !!profile.favorite,
    lastUsedAt: profile.lastUsedAt || '',
    auth,
  };
}

export function normalizeConnectionTags(value = [], { limit = 12, maxLength = 32 } = {}) {
  const source = Array.isArray(value) ? value : String(value || '').split(/[,，;]/);
  const seen = new Set();
  const tags = [];
  source.forEach((item) => {
    if (tags.length >= limit) return;
    const tag = String(item || '').trim().slice(0, maxLength);
    const key = tag.toLocaleLowerCase();
    if (!tag || seen.has(key)) return;
    seen.add(key);
    tags.push(tag);
  });
  return tags;
}

export function normalizeImportedConnectionProfile(profile = {}) {
  if (!profile || !profile.providerType || !profile.displayName) return null;
  return normalizeStoredConnectionProfile(profile, { preserveCredentialRef: false });
}

export function buildConnectionProfilesExport(profiles = [], exportedAt = new Date().toISOString()) {
  return {
    version: 3,
    exportedAt,
    secrets: 'omitted',
    profiles: profiles.map((profile) => normalizeStoredConnectionProfile(profile, {
      preserveCredentialRef: false,
    })),
  };
}

export function createProfileID() {
  return globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random()}`;
}
