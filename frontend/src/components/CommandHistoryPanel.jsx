import React from 'react';
import {
  Button,
  Dropdown,
  Empty,
  Input,
  List,
  Segmented,
  Tooltip,
  Typography,
} from 'antd';
import {
  ClearOutlined,
  CodeOutlined,
  CopyOutlined,
  EnterOutlined,
  MoreOutlined,
  SaveOutlined,
  StarFilled,
  StarOutlined,
  ThunderboltOutlined,
} from '@ant-design/icons';
import { t } from '../i18n.js';
import { buildQuickCommandDispatch } from '../quickCommands.js';

const { Text } = Typography;

export default function CommandHistoryPanel({
  canRun = false,
  entries = [],
  formatTimestamp,
  hasActiveSession = false,
  historyCount = 0,
  onChangeQuery,
  onChangeScope,
  onClear,
  onCopy,
  onFavorite,
  onInsert,
  onRun,
  onSave,
  query = '',
  scope = 'provider',
  target = '',
}) {
  return (
    <div className="command-history-panel">
      <div className={`quick-command-context command-history-context${canRun ? ' ready' : ''}`}>
        <span aria-hidden="true" className="quick-command-context-dot" />
        <span className="quick-command-context-copy">
          <strong>{target || t('command.noTarget')}</strong>
          <small>{canRun ? t('command.targetReady') : t('command.targetUnavailable')}</small>
        </span>
        <span className="quick-command-library-summary">
          {t('history.librarySummary', { total: historyCount, visible: entries.length })}
        </span>
      </div>
      <div className="command-history-toolbar">
        <Segmented
          value={scope}
          onChange={onChangeScope}
          options={[
            { value: 'provider', label: t('history.scope.provider') },
            { value: 'session', label: t('history.scope.session'), disabled: !hasActiveSession },
            { value: 'all', label: t('history.scope.all') },
          ]}
        />
        <Input.Search
          allowClear
          value={query}
          onChange={(event) => onChangeQuery?.(event.target.value)}
          placeholder={t('placeholder.searchHistory')}
        />
        <Tooltip title={t('action.clear')}>
          <span className="tooltip-button-wrapper">
            <Button
              aria-label={t('action.clear')}
              danger
              disabled={entries.length === 0}
              icon={<ClearOutlined />}
              onClick={onClear}
            />
          </span>
        </Tooltip>
      </div>
      <div className="command-history-guidance">
        <CodeOutlined />
        <Text type="secondary">{t('history.drawerHint')}</Text>
      </div>
      <List
        className="command-history-list"
        dataSource={entries}
        locale={{
          emptyText: (
            <Empty
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              description={historyCount === 0 ? t('empty.noCommandHistory') : t('empty.noCommands')}
            />
          ),
        }}
        renderItem={(item) => (
          <CommandHistoryRow
            canRun={canRun}
            formatTimestamp={formatTimestamp}
            item={item}
            key={`${item.providerType || 'terminal'}-${item.sessionId || ''}-${item.command}`}
            onCopy={onCopy}
            onFavorite={onFavorite}
            onInsert={onInsert}
            onRun={onRun}
            onSave={onSave}
          />
        )}
      />
    </div>
  );
}

function CommandHistoryRow({
  canRun,
  formatTimestamp,
  item,
  onCopy,
  onFavorite,
  onInsert,
  onRun,
  onSave,
}) {
  const insert = buildQuickCommandDispatch(item.command, { appendEnter: false });
  const insertDisabled = !canRun || !insert.ok;
  const runWarning = canRun ? '' : t('command.targetUnavailable');
  const insertWarning = insert.reason === 'multiline'
    ? t('command.insertMultilineUnavailable')
    : runWarning || t('command.insertHint');
  const menu = {
    items: [
      {
        key: 'favorite',
        icon: item.favorite ? <StarFilled /> : <StarOutlined />,
        label: t(item.favorite ? 'action.unfavorite' : 'action.favorite'),
      },
      { key: 'save', icon: <SaveOutlined />, label: t('action.saveQuickCommand') },
      { key: 'copy', icon: <CopyOutlined />, label: t('action.copy') },
    ],
    onClick: ({ key }) => {
      if (key === 'favorite') onFavorite?.(item);
      if (key === 'save') onSave?.(item);
      if (key === 'copy') onCopy?.(item);
    },
  };
  return (
    <Dropdown menu={menu} trigger={['contextMenu']}>
      <List.Item
        className="command-history-row"
        actions={[
          <Tooltip key="insert" title={insertWarning}>
            <span className="tooltip-button-wrapper">
              <Button
                aria-label={t('action.insertCommand')}
                disabled={insertDisabled}
                icon={<EnterOutlined />}
                size="small"
                onClick={() => onInsert?.(item.command)}
              />
            </span>
          </Tooltip>,
          <Tooltip key="run" title={runWarning}>
            <span className="tooltip-button-wrapper">
              <Button
                disabled={!canRun}
                icon={<ThunderboltOutlined />}
                size="small"
                type="primary"
                onClick={() => onRun?.(item)}
              >
                <span className="command-history-action-label">{t('action.run')}</span>
              </Button>
            </span>
          </Tooltip>,
          <Dropdown key="more" menu={menu} trigger={['click']}>
            <Button aria-label={t('action.manage')} icon={<MoreOutlined />} size="small" />
          </Dropdown>,
        ]}
      >
        <List.Item.Meta
          title={<pre className="command-history-code">{item.command}</pre>}
          description={(
            <span className="command-history-meta">
              <span>{item.sessionLabel || item.providerType}</span>
              <span>{item.providerType}</span>
              {item.updatedAt && <span>{formatTimestamp?.(item.updatedAt)}</span>}
            </span>
          )}
        />
      </List.Item>
    </Dropdown>
  );
}
