function providerFieldValues(fields = [], values = {}) {
  return Object.fromEntries(fields
    .map((field) => [field.key, values?.[field.key]])
    .filter(([, value]) => value !== undefined && value !== null && value !== ''));
}

export function buildExtensionTerminalFormValues(provider = {}, profile = null) {
  const config = Object.fromEntries((provider.configFields || []).map((field) => {
    const profileValue = profile?.config?.[field.key];
    const value = profileValue ?? field.default ?? (field.type === 'boolean' ? false : undefined);
    return [field.key, value];
  }).filter(([, value]) => value !== undefined));
  return { config, auth: {} };
}

export function buildExtensionTerminalRequest(provider = {}, displayName = '', values = {}) {
  return {
    providerType: provider.type,
    displayName,
    group: values.group || '',
    config: providerFieldValues(provider.configFields, values.config),
    auth: providerFieldValues(provider.authFields, values.auth),
  };
}

export function buildExtensionTerminalCredentialValues(provider = {}, auth = {}) {
  return providerFieldValues(provider.authFields, auth);
}

export function buildTerminalProviderSummary(provider = {}) {
  return {
    capabilities: Array.isArray(provider.capabilities) ? provider.capabilities : [],
    description: provider.description || '',
    extensionId: provider.extensionId || '',
    extensionVersion: provider.extensionVersion || '',
    isExtension: provider.category === 'extension',
  };
}

export function extensionTerminalDescription(provider = {}, profile = {}) {
  const config = profile.config || {};
  const host = config.host || config.endpoint;
  if (host) return `${host}${config.port ? `:${config.port}` : ''}`;
  if (config.pod) return `${config.namespace ? `${config.namespace} / ` : ''}${config.pod}`;
  if (config.container) return String(config.container);
  if (config.database) return String(config.database);
  return provider.type || profile.providerType || '';
}
