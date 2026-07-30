export function emptySessionSwitchState() {
  return {
    open: false,
    originActiveId: '',
    orderedIds: [],
    selectedId: '',
    selectedIndex: -1,
  };
}

export function recordSessionVisit(
  recentSessionIds = [],
  sessionId = '',
  sessionIds = [],
  limit = 20,
) {
  const availableIds = new Set(sessionIds.filter(Boolean));
  const visitedId = availableIds.has(sessionId) ? sessionId : '';
  const next = [
    ...(visitedId ? [visitedId] : []),
    ...recentSessionIds,
  ]
    .filter((id, index, items) => availableIds.has(id) && items.indexOf(id) === index)
    .slice(0, Math.max(1, Number(limit) || 20));
  return (
    next.length === recentSessionIds.length
    && next.every((id, index) => id === recentSessionIds[index])
  ) ? recentSessionIds : next;
}

export function buildSessionSwitchOrder(
  sessionIds = [],
  recentSessionIds = [],
  activeSessionId = '',
) {
  const availableIds = new Set(sessionIds.filter(Boolean));
  return [
    activeSessionId,
    ...recentSessionIds,
    ...sessionIds,
  ].filter((id, index, items) => (
    availableIds.has(id) && items.indexOf(id) === index
  ));
}

export function startSessionSwitch({
  activeSessionId = '',
  direction = 'next',
  recentSessionIds = [],
  sessionIds = [],
} = {}) {
  const orderedIds = buildSessionSwitchOrder(sessionIds, recentSessionIds, activeSessionId);
  if (orderedIds.length < 2) return emptySessionSwitchState();
  const activeIndex = orderedIds.indexOf(activeSessionId);
  const selectedIndex = activeIndex < 0
    ? (direction === 'previous' ? orderedIds.length - 1 : 0)
    : (activeIndex + (direction === 'previous' ? -1 : 1) + orderedIds.length) % orderedIds.length;
  return {
    open: true,
    originActiveId: activeSessionId,
    orderedIds,
    selectedId: orderedIds[selectedIndex],
    selectedIndex,
  };
}

export function advanceSessionSwitch(state = emptySessionSwitchState(), direction = 'next') {
  if (!state.open || state.orderedIds.length < 2) return emptySessionSwitchState();
  const offset = direction === 'previous' ? -1 : 1;
  const selectedIndex = (
    state.selectedIndex + offset + state.orderedIds.length
  ) % state.orderedIds.length;
  return {
    ...state,
    selectedId: state.orderedIds[selectedIndex],
    selectedIndex,
  };
}

export function resolveSessionSwitchSelection(state = {}, { cancelled = false } = {}) {
  if (cancelled || !state.open) return '';
  return state.selectedId || '';
}

export function shouldCancelSessionSwitch(state = {}, {
  activeSessionId = '',
  currentView = '',
  originView = '',
  sessionIds = [],
} = {}) {
  if (!state.open) return false;
  const availableIds = new Set(sessionIds);
  return (
    state.originActiveId !== activeSessionId
    || originView !== currentView
    || state.orderedIds.some((sessionId) => !availableIds.has(sessionId))
  );
}

export function consumeSessionSwitchEvent(event = {}) {
  event.preventDefault?.();
  event.stopPropagation?.();
}
