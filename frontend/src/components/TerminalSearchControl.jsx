import React, { forwardRef, useImperativeHandle, useRef } from 'react';
import { Button, Input, Tooltip } from 'antd';
import {
  CloseOutlined,
  DownOutlined,
  SearchOutlined,
  UpOutlined,
} from '@ant-design/icons';
import { t } from '../i18n.js';
import { emptyTerminalSearchResult, resolveTerminalSearchKeyAction } from '../terminalSearch.js';

const TerminalSearchControl = forwardRef(function TerminalSearchControl({
  onChange,
  onClose,
  onFindNext,
  onFindPrevious,
  query,
  result = emptyTerminalSearchResult,
}, ref) {
  const inputRef = useRef(null);
  const keywordActive = Boolean(query.trim());
  const canNavigate = keywordActive && result.total > 0;
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
    if (action === 'previous' && keywordActive) onFindPrevious();
    if (action === 'next' && keywordActive) onFindNext();
  };

  return (
    <div className={`terminal-search-control${result.status === 'empty' ? ' is-empty' : ''}`}>
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
  if (result.status === 'empty') return t('terminal.search.noMatches');
  if (result.limited) return t('terminal.search.resultsLimited', { count: result.total });
  if (result.status === 'ready') {
    return t('terminal.search.resultPosition', { current: result.current, total: result.total });
  }
  return '';
}

function terminalSearchResultLabel(result) {
  if (result.status === 'empty') return t('terminal.search.noMatches');
  if (result.limited) return t('terminal.search.resultsLimitedLabel', { count: result.total });
  if (result.status === 'ready') {
    return t('terminal.search.resultPositionLabel', { current: result.current, total: result.total });
  }
  return '';
}

export default TerminalSearchControl;
