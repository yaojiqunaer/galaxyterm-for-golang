import React, { forwardRef, useImperativeHandle, useRef } from 'react';
import { Button, Checkbox, Input, Popover, Tooltip } from 'antd';
import {
  CloseOutlined,
  DownOutlined,
  FilterOutlined,
  SearchOutlined,
  UpOutlined,
} from '@ant-design/icons';
import { t } from '../i18n.js';
import {
  defaultTerminalSearchPreferences,
  emptyTerminalSearchResult,
  resolveTerminalSearchKeyAction,
} from '../terminalSearch.js';

const TerminalSearchControl = forwardRef(function TerminalSearchControl({
  onChange,
  onClose,
  onFindNext,
  onFindPrevious,
  onPreferencesChange,
  preferences = defaultTerminalSearchPreferences,
  query,
  result = emptyTerminalSearchResult,
}, ref) {
  const inputRef = useRef(null);
  const keywordActive = Boolean(query.trim());
  const queryValid = result.status !== 'invalid';
  const canNavigate = keywordActive && queryValid && result.total > 0;
  const customPreferencesActive = Object.values(preferences).some(Boolean);
  const resultText = terminalSearchResultText(result);
  const resultLabel = terminalSearchResultLabel(result);

  useImperativeHandle(ref, () => ({
    focus: () => inputRef.current?.focus?.(),
    select: () => {
      inputRef.current?.input?.select?.();
    },
  }), []);

  const handleKeyDown = (event) => {
    const action = resolveTerminalSearchKeyAction(event);
    if (action === 'ignore') return;
    event.preventDefault();
    if (action === 'close') onClose();
    if (action === 'previous' && keywordActive && queryValid) onFindPrevious();
    if (action === 'next' && keywordActive && queryValid) onFindNext();
  };

  const searchOptions = (
    <div className="terminal-search-options">
      {[
        ['caseSensitive', 'terminal.search.matchCase'],
        ['wholeWord', 'terminal.search.matchWholeWord'],
        ['regex', 'terminal.search.useRegex'],
      ].map(([key, labelKey]) => (
        <Checkbox
          key={key}
          checked={preferences[key] === true}
          onChange={(event) => onPreferencesChange({ ...preferences, [key]: event.target.checked })}
        >
          {t(labelKey)}
        </Checkbox>
      ))}
    </div>
  );

  return (
    <div className={`terminal-search-control is-${result.status}`}>
      <Input
        ref={inputRef}
        aria-label={t('placeholder.searchTerminal')}
        prefix={<SearchOutlined />}
        placeholder={t('placeholder.searchTerminal')}
        value={query}
        onChange={(event) => onChange(event.target.value)}
        onKeyDown={handleKeyDown}
      />
      <span
        className="terminal-search-result"
        aria-live="polite"
        aria-label={resultLabel}
        title={resultLabel}
      >
        {keywordActive ? resultText : ''}
      </span>
      <div className="terminal-search-navigation">
        <Popover content={searchOptions} placement="bottomRight" trigger="click">
          <Button
            type="text"
            size="small"
            aria-label={t('terminal.search.options')}
            aria-pressed={customPreferencesActive}
            className={customPreferencesActive ? 'is-active' : ''}
            icon={<FilterOutlined />}
          />
        </Popover>
        <Tooltip title={`${t('action.findPrevious')} · Shift+Enter`}>
          <Button
            type="text"
            size="small"
            aria-label={t('action.findPrevious')}
            disabled={!canNavigate}
            icon={<UpOutlined />}
            onClick={onFindPrevious}
          />
        </Tooltip>
        <Tooltip title={`${t('action.findNext')} · Enter`}>
          <Button
            type="text"
            size="small"
            aria-label={t('action.findNext')}
            disabled={!canNavigate}
            icon={<DownOutlined />}
            onClick={onFindNext}
          />
        </Tooltip>
        <Tooltip title={`${t('action.clearSearch')} · Esc`}>
          <Button
            type="text"
            size="small"
            aria-label={t('action.clearSearch')}
            disabled={!keywordActive}
            icon={<CloseOutlined />}
            onClick={onClose}
          />
        </Tooltip>
      </div>
    </div>
  );
});

function terminalSearchResultText(result) {
  if (result.status === 'invalid') return t('terminal.search.invalidRegexShort');
  if (result.status === 'empty') return t('terminal.search.noMatches');
  if (result.limited) return t('terminal.search.resultsLimited', { count: result.total });
  if (result.status === 'ready') {
    return t('terminal.search.resultPosition', { current: result.current, total: result.total });
  }
  return '';
}

function terminalSearchResultLabel(result) {
  if (result.status === 'invalid') return t('terminal.search.invalidRegex');
  if (result.status === 'empty') return t('terminal.search.noMatches');
  if (result.limited) return t('terminal.search.resultsLimitedLabel', { count: result.total });
  if (result.status === 'ready') {
    return t('terminal.search.resultPositionLabel', { current: result.current, total: result.total });
  }
  return '';
}

export default TerminalSearchControl;
