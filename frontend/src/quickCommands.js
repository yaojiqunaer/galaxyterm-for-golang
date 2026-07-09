export function buildQuickCommandSummary(commands = [], { activeSession = null } = {}) {
  const providerType = activeSession?.providerType || 'all';
  return {
    total: commands.length,
    available: filterQuickCommands(commands, '', { providerType }).length,
    favorites: commands.filter((item) => item.favorite).length,
    multiLine: commands.filter((item) => String(item.command || '').includes('\n')).length,
    target: activeSession?.label || '',
    canRun: !!activeSession?.id,
  };
}

export function filterQuickCommands(commands = [], query = '', options = {}) {
  const keywords = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
  const providerType = normalizeCommandProviderType(options.providerType || 'all');
  const favoriteOnly = options.favoriteOnly === true;
  return commands
    .filter((item) => {
      if (favoriteOnly && item.favorite !== true) return false;
      if (!matchesProviderType(item, providerType)) return false;
      if (keywords.length === 0) return true;
      const haystack = `${item.name || ''} ${item.command || ''} ${item.providerType || 'all'}`.toLowerCase();
      return keywords.every((keyword) => haystack.includes(keyword));
    })
    .sort((left, right) => Number(!!right.favorite) - Number(!!left.favorite));
}

export function normalizeQuickCommand(command = {}) {
  return {
    id: command.id || '',
    name: command.name || '',
    command: command.command || '',
    favorite: command.favorite === true,
    providerType: normalizeCommandProviderType(command.providerType || 'all'),
  };
}

export function buildQuickCommandFromHistory(item = {}, options = {}) {
  const command = String(item.command || '').trim();
  if (!command) return null;
  return {
    id: options.id || '',
    name: options.name || deriveQuickCommandName(command),
    command,
    favorite: options.favorite === true,
    providerType: normalizeCommandProviderType(item.providerType || options.providerType || 'all'),
  };
}

export function upsertQuickCommand(commands = [], command = {}) {
  const nextCommand = normalizeQuickCommand(command);
  const index = commands.findIndex((item) => item.id === nextCommand.id);
  if (index < 0) return [...commands, nextCommand];
  return commands.map((item, itemIndex) => (itemIndex === index ? nextCommand : item));
}

function matchesProviderType(command = {}, providerType) {
  const commandProvider = normalizeCommandProviderType(command.providerType || 'all');
  return providerType === 'all' || commandProvider === 'all' || commandProvider === providerType;
}

function normalizeCommandProviderType(value) {
  const normalized = String(value || '').trim();
  return normalized || 'all';
}

function deriveQuickCommandName(command) {
  const firstLine = command.split('\n').find((line) => line.trim()) || command;
  const compact = firstLine.trim().replace(/\s+/g, ' ');
  return compact.length > 48 ? `${compact.slice(0, 45)}...` : compact;
}
