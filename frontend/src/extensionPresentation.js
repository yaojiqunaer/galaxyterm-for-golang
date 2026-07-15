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

export function buildExtensionAction(extension = {}, catalogItem = null) {
  if (extension.status === 'planned') {
    return catalogItem
      ? { key: 'installOnline', enabled: true, tone: 'primary' }
      : { key: 'addSource', enabled: true, tone: 'default' };
  }
  if (extension.status === 'installed') {
    return { key: 'manage', enabled: false, tone: 'default' };
  }
  return { key: 'builtin', enabled: false, tone: 'default' };
}

export function compareExtensionVersions(left = '', right = '') {
  const parsedLeft = parseVersion(left);
  const parsedRight = parseVersion(right);
  for (let index = 0; index < Math.max(parsedLeft.core.length, parsedRight.core.length); index += 1) {
    const comparison = (parsedLeft.core[index] || 0) - (parsedRight.core[index] || 0);
    if (comparison !== 0) return Math.sign(comparison);
  }
  if (!parsedLeft.pre.length && parsedRight.pre.length) return 1;
  if (parsedLeft.pre.length && !parsedRight.pre.length) return -1;
  for (let index = 0; index < Math.max(parsedLeft.pre.length, parsedRight.pre.length); index += 1) {
    const leftPart = parsedLeft.pre[index];
    const rightPart = parsedRight.pre[index];
    if (leftPart === undefined) return -1;
    if (rightPart === undefined) return 1;
    if (leftPart === rightPart) continue;
    const leftNumber = Number(leftPart);
    const rightNumber = Number(rightPart);
    const leftNumeric = Number.isInteger(leftNumber) && String(leftNumber) === leftPart;
    const rightNumeric = Number.isInteger(rightNumber) && String(rightNumber) === rightPart;
    if (leftNumeric && rightNumeric) return Math.sign(leftNumber - rightNumber);
    if (leftNumeric !== rightNumeric) return leftNumeric ? -1 : 1;
    return leftPart.localeCompare(rightPart);
  }
  return 0;
}

export function findCatalogItemForType(catalogItems = [], providerType = '') {
  return catalogItems
    .filter((item) => catalogProviderTypes(item).includes(providerType))
    .reduce((best, item) => (
      !best || compareExtensionVersions(item.manifest?.version, best.manifest?.version) > 0 ? item : best
    ), null);
}

export function findExtensionUpdate(installedExtension = {}, catalogItems = []) {
  const candidate = catalogItems
    .filter((item) => item.manifest?.id === installedExtension.id)
    .reduce((best, item) => (
      !best || compareExtensionVersions(item.manifest?.version, best.manifest?.version) > 0 ? item : best
    ), null);
  return candidate && compareExtensionVersions(candidate.manifest?.version, installedExtension.version) > 0
    ? candidate
    : null;
}

function catalogProviderTypes(item = {}) {
  return [
    ...(item.manifest?.providers || []),
    ...(item.manifest?.fileProviders || []),
  ].map((provider) => provider.type).filter(Boolean);
}

function parseVersion(version) {
  const [core = '', pre = ''] = String(version).trim().replace(/^v/i, '').split('-', 2);
  return {
    core: core.split('.').map((part) => Number.parseInt(part, 10) || 0),
    pre: pre ? pre.split('.') : [],
  };
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
