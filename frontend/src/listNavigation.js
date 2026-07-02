export function resolveListIndex(itemCount = 0, currentIndex = 0, action = 'next') {
  if (itemCount <= 0) return -1;
  if (action === 'first') return 0;
  if (action === 'last') return itemCount - 1;
  if (currentIndex < 0) return action === 'previous' ? itemCount - 1 : 0;
  if (action === 'previous') return (currentIndex - 1 + itemCount) % itemCount;
  return (currentIndex + 1) % itemCount;
}
