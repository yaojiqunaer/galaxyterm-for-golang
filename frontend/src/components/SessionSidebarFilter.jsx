import React from 'react';
import { Input, Segmented, Typography } from 'antd';
import { t } from '../i18n.js';

const { Text } = Typography;

export default function SessionSidebarFilter({
  onActivateFirst,
  onQueryChange,
  onScopeChange,
  query = '',
  scope = 'all',
  state = {},
}) {
  if (!state.showScope && !state.showSearch) return null;
  return (
    <div className="sidebar-session-filter">
      {state.showScope && (
        <Segmented
          aria-label={t('session.scope.label')}
          block
          className="sidebar-session-scope"
          options={[
            { label: t('session.scope.all'), value: 'all' },
            { label: t('session.scope.healthy'), value: 'healthy' },
            { label: t('session.scope.attention'), value: 'attention' },
          ]}
          size="small"
          value={scope}
          onChange={onScopeChange}
        />
      )}
      {state.showSearch && (
        <Input.Search
          allowClear
          aria-label={t('placeholder.searchSessions')}
          placeholder={t('placeholder.searchSessions')}
          size="small"
          value={query}
          onChange={(event) => onQueryChange?.(event.target.value)}
          onKeyDown={(event) => {
            if (event.key !== 'Escape' || (!query && scope === 'all')) return;
            event.preventDefault();
            if (query) onQueryChange?.('');
            else onScopeChange?.('all');
          }}
          onSearch={(value) => {
            if (!String(value).trim() || !state.visible) return;
            onActivateFirst?.();
          }}
        />
      )}
      {state.filtered && (
        <Text type="secondary">
          {t('session.filterSummary', { count: state.visible, total: state.total })}
        </Text>
      )}
    </div>
  );
}
