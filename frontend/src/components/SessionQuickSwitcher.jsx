import React, { useEffect, useRef } from 'react';
import { t } from '../i18n.js';

export default function SessionQuickSwitcher({
  items = [],
  open = false,
  selectedId = '',
}) {
  const rowRefs = useRef({});

  useEffect(() => {
    if (!open || !selectedId) return;
    rowRefs.current[selectedId]?.scrollIntoView?.({ block: 'nearest' });
  }, [open, selectedId]);

  if (!open || items.length === 0) return null;
  const selectedItem = items.find((item) => item.id === selectedId);
  const selectedAnnouncement = selectedItem
    ? [
      selectedItem.displayName,
      selectedItem.detail || selectedItem.providerName,
      selectedItem.statusLabel,
      selectedItem.unread ? selectedItem.activityLabel : '',
    ].filter(Boolean).join(' · ')
    : '';

  return (
    <div
      aria-label={t('session.switcher.title')}
      className="session-quick-switcher"
      role="dialog"
    >
      <span
        aria-live="polite"
        className="session-switcher-live"
        role="status"
      >
        {selectedAnnouncement}
      </span>
      <div className="session-quick-switcher-head">
        <strong>{t('session.switcher.title')}</strong>
      </div>
      <div
        aria-activedescendant={`session-switcher-option-${selectedId}`}
        aria-label={t('session.switcher.resultsLabel')}
        className="session-quick-switcher-list"
        role="listbox"
      >
        {items.map((item) => {
          const selected = item.id === selectedId;
          return (
            <div
              ref={(node) => {
                if (node) rowRefs.current[item.id] = node;
                else delete rowRefs.current[item.id];
              }}
              aria-selected={selected}
              className={`session-quick-switcher-row${selected ? ' selected' : ''}`}
              id={`session-switcher-option-${item.id}`}
              key={item.id}
              role="option"
            >
              <span className="provider-icon">{item.icon}</span>
              <span className="session-quick-switcher-main">
                <strong>{item.displayName}</strong>
                <small>{item.detail || item.providerName}</small>
              </span>
              <span className="session-quick-switcher-state">
                {item.unread && (
                  <span
                    aria-label={item.activityLabel}
                    className={`session-activity-dot${item.activityKind === 'error' ? ' tone-error' : ''}`}
                    role="status"
                    title={item.activityLabel}
                  />
                )}
                <span className={`session-switcher-status tone-${item.statusTone}`}>
                  {item.statusLabel}
                </span>
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
