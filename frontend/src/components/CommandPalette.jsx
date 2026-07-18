import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Button, Input, Modal, Space } from 'antd';
import {
  buildPaletteSummary,
  filterPaletteItems,
  resolvePaletteIndex,
} from '../paletteModel.js';
import { t } from '../i18n.js';

const resultLimit = 12;

export default function CommandPalette({
  items = [],
  onClose,
  onEmptyAction,
  onRun,
  open = false,
  recentIds = [],
}) {
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(-1);
  const inputRef = useRef(null);
  const rowRefs = useRef([]);
  const visibleItems = useMemo(
    () => filterPaletteItems(items, query, { recentIds }),
    [items, query, recentIds],
  );
  const displayedItems = visibleItems.slice(0, resultLimit);
  const summary = useMemo(() => buildPaletteSummary(visibleItems), [visibleItems]);
  const recentIdSet = useMemo(() => new Set(recentIds), [recentIds]);
  const activeItemId = activeIndex >= 0 ? `command-palette-option-${activeIndex}` : undefined;

  useEffect(() => {
    if (!open) {
      setQuery('');
      setActiveIndex(-1);
      return;
    }
    setActiveIndex(displayedItems.length > 0 ? 0 : -1);
  }, [open, query, displayedItems.length]);

  useEffect(() => {
    if (!open || activeIndex < 0) return;
    rowRefs.current[activeIndex]?.scrollIntoView?.({ block: 'nearest' });
  }, [activeIndex, open]);

  const runItem = (item) => {
    if (item) onRun?.(item);
  };

  const handleKeyDown = (event) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setActiveIndex((current) => resolvePaletteIndex(displayedItems.length, current, 'next'));
      return;
    }
    if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActiveIndex((current) => resolvePaletteIndex(displayedItems.length, current, 'previous'));
      return;
    }
    if (event.key === 'Home') {
      event.preventDefault();
      setActiveIndex(resolvePaletteIndex(displayedItems.length, activeIndex, 'first'));
      return;
    }
    if (event.key === 'End') {
      event.preventDefault();
      setActiveIndex(resolvePaletteIndex(displayedItems.length, activeIndex, 'last'));
      return;
    }
    if (event.key === 'Enter') {
      event.preventDefault();
      runItem(displayedItems[activeIndex] || displayedItems[0]);
      return;
    }
    if (event.key === 'Escape') {
      event.preventDefault();
      onClose?.();
    }
  };

  const runEmptyAction = (action) => onEmptyAction?.(action);

  return (
    <Modal
      className="command-palette-modal"
      footer={null}
      onCancel={onClose}
      open={open}
      title={t('drawer.commandPalette')}
      width={620}
      afterOpenChange={(nextOpen) => {
        if (!nextOpen) return;
        window.requestAnimationFrame(() => inputRef.current?.focus({ cursor: 'all' }));
      }}
    >
      <Input
        ref={inputRef}
        aria-activedescendant={activeItemId}
        aria-autocomplete="list"
        aria-controls="command-palette-results"
        aria-expanded={open}
        autoComplete="off"
        autoFocus
        role="combobox"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={t('placeholder.commandPalette')}
      />

      <div className="command-palette-summary" aria-live="polite">
        <span>
          <small>{t('metric.visibleResults')}</small>
          <strong>{summary.total}</strong>
        </span>
        {summary.groups.slice(0, 5).map((group) => (
          <span key={group.group}>
            <small>{group.group}</small>
            <strong>{group.count}</strong>
          </span>
        ))}
      </div>

      <div
        aria-label={t('palette.resultsLabel')}
        className="command-palette-list"
        id="command-palette-results"
        role="listbox"
      >
        {displayedItems.length === 0 ? (
          <div className="palette-empty-state">
            <strong>{t('palette.empty.title')}</strong>
            <span>{t('palette.empty.description')}</span>
            <Space wrap>
              <Button size="small" type="primary" onClick={() => runEmptyAction('local')}>{t('action.newTerminal')}</Button>
              <Button size="small" onClick={() => runEmptyAction('ssh')}>{t('action.quickSsh')}</Button>
              <Button size="small" onClick={() => runEmptyAction('connections')}>{t('nav.connections')}</Button>
            </Space>
          </div>
        ) : displayedItems.map((item, index) => {
          const active = index === activeIndex;
          const recent = !query.trim() && recentIdSet.has(item.id);
          return (
            <button
              ref={(node) => { rowRefs.current[index] = node; }}
              aria-disabled={item.disabled || undefined}
              aria-selected={active}
              className={[
                'command-palette-row',
                active ? 'active' : '',
                item.disabled ? 'disabled' : '',
              ].filter(Boolean).join(' ')}
              id={`command-palette-option-${index}`}
              key={item.id}
              role="option"
              tabIndex={-1}
              type="button"
              onClick={() => runItem(item)}
              onMouseDown={(event) => event.preventDefault()}
              onMouseEnter={() => setActiveIndex(index)}
            >
              <span className="provider-icon">{item.icon}</span>
              <span className="command-palette-row-content">
                <span className="command-palette-title">
                  <strong>{item.title}</strong>
                  <span className="command-palette-title-meta">
                    {recent && <small className="command-palette-recent">{t('palette.recent')}</small>}
                    <small>{item.group}</small>
                  </span>
                </span>
                <span className="command-palette-description">
                  <span>{item.description}</span>
                  {item.disabled && item.reasonKey && <small>{t(item.reasonKey)}</small>}
                </span>
              </span>
            </button>
          );
        })}
      </div>

      <div className="command-palette-footer">
        <span>{query.trim() ? t('palette.filteredHint') : t('palette.recentHint')}</span>
        <span>{t('palette.keyboardHint')}</span>
      </div>
    </Modal>
  );
}
