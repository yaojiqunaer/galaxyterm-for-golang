export function buildQuickCommandSummary(commands = [], { activeSession = null } = {}) {
  const providerType = activeSession?.providerType || 'all';
  return {
    total: commands.length,
    available: filterQuickCommands(commands, '', { providerType }).length,
    multiLine: commands.filter((item) => String(item.command || '').includes('\n')).length,
    target: activeSession?.label || '',
    canRun: !!activeSession?.id,
  };
}

export function filterQuickCommands(commands = [], query = '', options = {}) {
  const keywords = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
  const providerType = normalizeCommandProviderType(options.providerType || 'all');
  return commands.filter((item) => {
    if (!matchesProviderType(item, providerType)) return false;
    if (keywords.length === 0) return true;
    const haystack = `${item.name || ''} ${item.command || ''} ${item.providerType || 'all'}`.toLowerCase();
    return keywords.every((keyword) => haystack.includes(keyword));
  });
}

export function normalizeQuickCommand(command = {}) {
  return {
    id: command.id || '',
    name: command.name || '',
    command: command.command || '',
    providerType: normalizeCommandProviderType(command.providerType || 'all'),
  };
}

function matchesProviderType(command = {}, providerType) {
  const commandProvider = normalizeCommandProviderType(command.providerType || 'all');
  return providerType === 'all' || commandProvider === 'all' || commandProvider === providerType;
}

function normalizeCommandProviderType(value) {
  const normalized = String(value || '').trim();
  return normalized || 'all';
}
