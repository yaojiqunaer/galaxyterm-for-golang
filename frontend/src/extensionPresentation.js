export function buildExtensionSummary({
  providers = [],
  installedExtensions = [],
  disabledExtensionIds = [],
} = {}) {
  const disabledIds = new Set(disabledExtensionIds);
  return {
    builtinProviders: providers.filter((provider) => provider.category !== 'extension').length,
    disabledExtensions: installedExtensions.filter((extension) => disabledIds.has(extension.id)).length,
    enabledExtensions: installedExtensions.filter((extension) => !disabledIds.has(extension.id)).length,
    extensionProviders: providers.filter((provider) => provider.category === 'extension').length,
    installedExtensions: installedExtensions.length,
    installedFileProviderTypes: installedExtensions.flatMap((extension) => (
      extension.fileProviders || []
    ).map((provider) => provider.type)).filter(Boolean),
    installedProviderTypes: installedExtensions.flatMap((extension) => (
      extension.providers || []
    ).map((provider) => provider.type)).filter(Boolean),
  };
}

export function buildEnabledFileProviders(installedExtensions = [], disabledExtensionIds = []) {
  const disabledIds = new Set(disabledExtensionIds);
  const providersByType = new Map();
  installedExtensions.forEach((extension) => {
    if (disabledIds.has(extension.id)) return;
    (extension.fileProviders || []).forEach((provider) => {
      if (!provider?.type) return;
      providersByType.set(provider.type, {
        extensionId: extension.id,
        extensionName: extension.name || extension.id,
        type: provider.type,
        protocol: provider.protocol || provider.type,
        nameKey: provider.nameKey || '',
        description: provider.description || '',
        capabilities: Array.isArray(provider.capabilities) ? provider.capabilities : [],
        authMethods: Array.isArray(provider.authMethods) ? provider.authMethods : [],
        configFields: Array.isArray(provider.configFields) ? provider.configFields : [],
        authFields: Array.isArray(provider.authFields) ? provider.authFields : [],
      });
    });
  });
  return [...providersByType.values()];
}

export function buildFileProviderFormValues(provider = {}) {
  const values = { config: {}, auth: {} };
  for (const [section, fields] of [
    ['config', provider.configFields || []],
    ['auth', provider.authFields || []],
  ]) {
    fields.forEach((field) => {
      if (!field?.key || !Object.prototype.hasOwnProperty.call(field, 'default')) return;
      values[section][field.key] = field.default;
    });
  }
  return values;
}

export function fileProviderSupports(provider, capability) {
  return !!provider && (provider.capabilities || []).includes(capability);
}

export function buildExtensionAction(extension = {}) {
  if (extension.status === 'planned') {
    return { key: 'install', enabled: true, tone: 'primary' };
  }
  if (extension.status === 'installed') {
    return { key: 'manage', enabled: false, tone: 'default' };
  }
  return { key: 'builtin', enabled: false, tone: 'default' };
}

export function buildExtensionCardFacts(extension = {}) {
  const capabilities = (extension.providers || [])
    .flatMap((provider) => provider.capabilities || [])
    .filter(Boolean);
  return [
    { key: 'type', value: extension.type || '' },
    { key: 'status', value: extension.status || '' },
    { key: 'capabilities', value: capabilities.join(', ') || '-' },
  ];
}

export function buildInstalledExtensionRows(installedExtensions = [], disabledExtensionIds = []) {
  const disabledIds = new Set(disabledExtensionIds);
  return installedExtensions.map((extension) => {
    const terminalProviders = extension.providers || [];
    const fileProviders = extension.fileProviders || [];
    return {
      enabled: !disabledIds.has(extension.id),
      id: extension.id,
      name: extension.name,
      version: extension.version,
      providers: terminalProviders.map((provider) => provider.type).filter(Boolean),
      fileProviders: fileProviders.map((provider) => provider.type).filter(Boolean),
      capabilities: [...new Set([...terminalProviders, ...fileProviders]
        .flatMap((provider) => provider.capabilities || [])
        .filter(Boolean))],
    };
  });
}

export function filterProvidersByDisabledExtensions(
  providers = [],
  installedExtensions = [],
  disabledExtensionIds = [],
) {
  const disabledIds = new Set(disabledExtensionIds);
  const disabledProviderTypes = new Set(installedExtensions
    .filter((extension) => disabledIds.has(extension.id))
    .flatMap((extension) => extension.providers || [])
    .map((provider) => provider.type)
    .filter(Boolean));

  return providers.filter((provider) => (
    provider.category !== 'extension' || !disabledProviderTypes.has(provider.type)
  ));
}
