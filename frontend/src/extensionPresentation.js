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
