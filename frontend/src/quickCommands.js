export function buildQuickCommandSummary(commands = [], { activeSession = null } = {}) {
  return {
    total: commands.length,
    multiLine: commands.filter((item) => String(item.command || '').includes('\n')).length,
    target: activeSession?.label || '',
    canRun: !!activeSession?.id,
  };
}

export function filterQuickCommands(commands = [], query = '') {
  const keywords = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
  if (keywords.length === 0) return commands;
  return commands.filter((item) => {
    const haystack = `${item.name || ''} ${item.command || ''}`.toLowerCase();
    return keywords.every((keyword) => haystack.includes(keyword));
  });
}
