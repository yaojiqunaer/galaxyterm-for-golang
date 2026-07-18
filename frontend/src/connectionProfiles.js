export function normalizeStoredConnectionProfile(profile = {}, options = {}) {
  const kind = profile.kind === 'file' ? 'file' : 'terminal';
  const preserveCredentialRef = options.preserveCredentialRef !== false;
  const credentialRef = preserveCredentialRef ? profile.auth?.credentialRef || null : null;
  const auth = kind === 'file'
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
    ...(kind === 'file' ? { filePath: profile.filePath || '.' } : {}),
    config: { ...(profile.config || {}) },
    favorite: !!profile.favorite,
    lastUsedAt: profile.lastUsedAt || '',
    auth,
  };
}

export function normalizeImportedConnectionProfile(profile = {}) {
  if (!profile || !profile.providerType || !profile.displayName) return null;
  return normalizeStoredConnectionProfile(profile, { preserveCredentialRef: false });
}

export function buildConnectionProfilesExport(profiles = [], exportedAt = new Date().toISOString()) {
  return {
    version: 2,
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
