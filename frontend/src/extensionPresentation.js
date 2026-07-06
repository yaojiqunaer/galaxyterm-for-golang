export function buildExtensionSummary({ providers = [], installedExtensions = [] } = {}) {
  return {
    builtinProviders: providers.filter((provider) => provider.category !== 'extension').length,
    extensionProviders: providers.filter((provider) => provider.category === 'extension').length,
    installedExtensions: installedExtensions.length,
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

export function buildInstalledExtensionRows(installedExtensions = []) {
  return installedExtensions.map((extension) => ({
    id: extension.id,
    name: extension.name,
    version: extension.version,
    providers: (extension.providers || []).map((provider) => provider.type).filter(Boolean),
    capabilities: (extension.providers || [])
      .flatMap((provider) => provider.capabilities || [])
      .filter(Boolean),
  }));
}
