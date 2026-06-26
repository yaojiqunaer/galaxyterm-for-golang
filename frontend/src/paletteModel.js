export function filterPaletteItems(items = [], query = '') {
  const keyword = query.trim().toLowerCase();
  if (!keyword) return items;
  return items.filter((item) => (
    item.title?.toLowerCase().includes(keyword)
    || item.description?.toLowerCase().includes(keyword)
    || item.group?.toLowerCase().includes(keyword)
    || item.keywords?.toLowerCase().includes(keyword)
  ));
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
