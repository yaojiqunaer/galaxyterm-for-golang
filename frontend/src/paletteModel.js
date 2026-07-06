export function filterPaletteItems(items = [], query = '') {
  const keywords = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
  if (keywords.length === 0) return items;
  return items
    .map((item, index) => ({ item, index, score: scorePaletteItem(item, keywords) }))
    .filter((entry) => entry.score < Number.POSITIVE_INFINITY)
    .sort((left, right) => left.score - right.score || left.index - right.index)
    .map((entry) => entry.item);
}

export function buildPaletteSummary(items = []) {
  const groups = [];
  const seen = new Map();
  items.forEach((item) => {
    const group = item.group || '';
    if (!group) return;
    if (!seen.has(group)) {
      seen.set(group, { group, count: 0 });
      groups.push(seen.get(group));
    }
    seen.get(group).count += 1;
  });
  return {
    total: items.length,
    groups,
  };
}

function scorePaletteItem(item, keywords) {
  const title = item.title?.toLowerCase() || '';
  const description = item.description?.toLowerCase() || '';
  const group = item.group?.toLowerCase() || '';
  const itemKeywords = item.keywords?.toLowerCase() || '';
  let totalScore = 0;
  for (const keyword of keywords) {
    const score = scorePaletteKeyword({ title, description, group, keywords: itemKeywords }, keyword);
    if (score === Number.POSITIVE_INFINITY) return score;
    totalScore += score;
  }
  return totalScore;
}

function scorePaletteKeyword(fields, keyword) {
  if (fields.title.startsWith(keyword)) return 0;
  if (fields.title.includes(keyword)) return 1;
  if (fields.description.includes(keyword)) return 2;
  if (fields.group.includes(keyword)) return 3;
  if (fields.keywords.includes(keyword)) return 4;
  return Number.POSITIVE_INFINITY;
}

export function resolvePaletteIndex(itemCount = 0, currentIndex = 0, action = 'next') {
  if (itemCount <= 0) return -1;
  if (action === 'first') return 0;
  if (action === 'last') return itemCount - 1;
  if (currentIndex < 0) return action === 'previous' ? itemCount - 1 : 0;
  const normalizedIndex = currentIndex < 0 ? 0 : currentIndex;
  if (action === 'previous') return (normalizedIndex - 1 + itemCount) % itemCount;
  return (normalizedIndex + 1) % itemCount;
}
