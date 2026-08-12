import { createProfileID, normalizeConnectionAccent, normalizeConnectionTags } from './connectionProfiles.js';

const importStrategies = new Set(['copy', 'replace', 'skip']);

export function countConnectionImportCredentialCleanupFailures(results = []) {
  return results.filter((item) => item?.status !== 'fulfilled' || item.value !== true).length;
}

export function buildConnectionImportPlan(currentProfiles = [], importedProfiles = []) {
  const current = currentProfiles.filter(Boolean);
  const candidates = [...current];
  const additions = [];
  const conflicts = [];
  const unchanged = [];

  importedProfiles.filter(Boolean).forEach((incoming) => {
    const existing = findImportedProfileMatch(candidates, incoming);
    if (!existing) {
      additions.push(incoming);
      candidates.push(incoming);
      return;
    }
    const entry = {
      destinationChanged: connectionCredentialDestination(existing) !== connectionCredentialDestination(incoming),
      existing,
      incoming,
    };
    if (profilesHaveSameImportDefinition(existing, incoming)) unchanged.push(entry);
    else conflicts.push(entry);
  });

  return {
    additions,
    conflicts,
    summary: {
      conflictCount: conflicts.length,
      newCount: additions.length,
      unchangedCount: unchanged.length,
    },
    unchanged,
  };
}

export function applyConnectionImportPlan(currentProfiles = [], plan = {}, strategy = 'skip', options = {}) {
  const resolvedStrategy = importStrategies.has(strategy) ? strategy : 'skip';
  const idFactory = options.idFactory || (() => createProfileID());
  const conflicts = Array.isArray(plan.conflicts) ? plan.conflicts : [];
  const unchanged = Array.isArray(plan.unchanged) ? plan.unchanged : [];
  const additions = Array.isArray(plan.additions) ? plan.additions : [];
  const existingIds = new Set(currentProfiles.map((profile) => profile.id));
  const clearedCredentialProfiles = [];
  const updatedProfileIds = [];
  let profiles = [...currentProfiles];

  const append = (profile, forceNewId = false) => {
    let id = forceNewId || existingIds.has(profile.id) ? idFactory(profile) : profile.id;
    while (!id || existingIds.has(id)) id = idFactory(profile);
    existingIds.add(id);
    profiles.push({
      ...profile,
      ...(forceNewId ? { importSource: undefined } : {}),
      id,
      auth: { ...(profile.auth || {}), credentialRef: null },
    });
  };

  additions.forEach((profile) => append(profile));

  let updatedCount = 0;
  if (resolvedStrategy === 'copy') {
    conflicts.forEach(({ incoming }) => append(incoming, true));
  }
  if (resolvedStrategy === 'replace') {
    const replacements = new Map();
    conflicts.forEach(({ destinationChanged, existing, incoming }) => {
      if (destinationChanged && existing.auth?.credentialRef) clearedCredentialProfiles.push(existing);
      replacements.set(existing.id, mergeImportedProfile(existing, incoming, { destinationChanged }));
      updatedProfileIds.push(existing.id);
      updatedCount += 1;
    });
    profiles = profiles.map((profile) => replacements.get(profile.id) || profile);
  }

  const addedCount = additions.length + (resolvedStrategy === 'copy' ? conflicts.length : 0);
  const skippedCount = unchanged.length + (resolvedStrategy === 'skip' ? conflicts.length : 0);
  return {
    clearedCredentialProfiles,
    profiles,
    summary: {
      addedCount,
      clearedCredentialCount: clearedCredentialProfiles.length,
      skippedCount,
      updatedCount,
    },
    updatedProfileIds,
  };
}

function findImportedProfileMatch(currentProfiles, incoming) {
  const sourceKey = connectionImportSourceKey(incoming);
  if (sourceKey) {
    const sourceMatch = currentProfiles.find((profile) => connectionImportSourceKey(profile) === sourceKey);
    if (sourceMatch) return sourceMatch;
  }
  const idMatch = currentProfiles.find((profile) => profile.id && profile.id === incoming.id);
  if (idMatch) return idMatch;
  if (incoming.importSource?.type === 'ssh-config') {
    const alias = normalizeIdentityValue(incoming.importSource.key || incoming.displayName);
    const legacyMatch = currentProfiles.find((profile) => (
      profile.providerType === 'ssh'
      && normalizeIdentityValue(profile.displayName) === alias
      && normalizeIdentityValue(profile.group) === 'ssh config'
    ));
    if (legacyMatch) return legacyMatch;
  }
  const definition = stableStringify(connectionDefinition(incoming, { includeMetadata: true }));
  return currentProfiles.find((profile) => (
    stableStringify(connectionDefinition(profile, { includeMetadata: true })) === definition
  ));
}

function profilesHaveSameImportDefinition(existing, incoming) {
  const sshConfigImport = incoming.importSource?.type === 'ssh-config';
  return stableStringify(connectionDefinition(existing, { includeMetadata: !sshConfigImport }))
    === stableStringify(connectionDefinition(incoming, { includeMetadata: !sshConfigImport }));
}

function mergeImportedProfile(existing, incoming, { destinationChanged = false } = {}) {
  return {
    ...incoming,
    id: existing.id,
    accent: normalizeConnectionAccent(existing.accent),
    favorite: !!existing.favorite,
    group: existing.group || '',
    tags: normalizeConnectionTags(existing.tags),
    lastUsedAt: existing.lastUsedAt || '',
    auth: {
      ...(incoming.auth || {}),
      credentialRef: destinationChanged ? null : existing.auth?.credentialRef || null,
    },
  };
}

function connectionDefinition(profile = {}, { includeMetadata = false } = {}) {
  const definition = {
    auth: Object.fromEntries(Object.entries(profile.auth || {}).filter(([key]) => key !== 'credentialRef')),
    config: profile.config || {},
    filePath: profile.kind === 'file' ? profile.filePath || '.' : undefined,
    kind: profile.kind === 'file' ? 'file' : 'terminal',
    providerType: profile.providerType || '',
  };
  if (!includeMetadata) return definition;
  return {
    ...definition,
    accent: normalizeConnectionAccent(profile.accent),
    displayName: String(profile.displayName || '').trim(),
    favorite: !!profile.favorite,
    group: String(profile.group || '').trim(),
    importSource: profile.importSource || null,
    tags: normalizeConnectionTags(profile.tags),
  };
}

function connectionCredentialDestination(profile = {}) {
  if (profile.providerType === 'ssh') {
    return stableStringify({
      authType: profile.auth?.authType || 'password',
      host: profile.config?.host || '',
      jumpHost: profile.config?.jumpHost || '',
      jumpPort: Number(profile.config?.jumpPort) || 22,
      jumpUsername: profile.auth?.jumpUsername || '',
      port: Number(profile.config?.port) || 22,
      username: profile.auth?.username || '',
    });
  }
  return stableStringify({
    config: profile.config || {},
    providerType: profile.providerType || '',
  });
}

function connectionImportSourceKey(profile = {}) {
  const type = normalizeIdentityValue(profile.importSource?.type);
  const key = normalizeIdentityValue(profile.importSource?.key);
  return type && key ? `${type}:${key}` : '';
}

function normalizeIdentityValue(value) {
  return String(value || '').trim().toLocaleLowerCase();
}

function stableStringify(value) {
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`;
  if (value && typeof value === 'object') {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`).join(',')}}`;
  }
  return JSON.stringify(value);
}
