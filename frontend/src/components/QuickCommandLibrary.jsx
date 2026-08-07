import React from 'react';
import {
  Button,
  Dropdown,
  Empty,
  Form,
  Input,
  List,
  Segmented,
  Select,
  Space,
  Tag,
  Tooltip,
  Typography,
} from 'antd';
import {
  CodeOutlined,
  CopyOutlined,
  DeleteOutlined,
  EditOutlined,
  EnterOutlined,
  HistoryOutlined,
  MoreOutlined,
  PlusOutlined,
  SafetyCertificateOutlined,
  StarFilled,
  StarOutlined,
  ThunderboltOutlined,
} from '@ant-design/icons';
import { t } from '../i18n.js';
import {
  buildQuickCommandDispatch,
  buildQuickCommandSafetyState,
} from '../quickCommands.js';

const { Text } = Typography;

export default function QuickCommandLibrary({
  canRun = false,
  commandForm,
  commands = [],
  editorOpen = false,
  editing = false,
  onCancelEditor,
  onChangeQuery,
  onChangeScope,
  onCopy,
  onDelete,
  onEdit,
  onFavorite,
  onInsert,
  onNew,
  onOpenHistory,
  onRun,
  onSave,
  providerLabel,
  providerOptions = [],
  query = '',
  scope = 'current',
  summary = {},
}) {
  return (
    <div className="quick-command-library">
      <div className={`quick-command-context${canRun ? ' ready' : ''}`}>
        <span aria-hidden="true" className="quick-command-context-dot" />
        <span className="quick-command-context-copy">
          <strong>{summary.target || t('command.noTarget')}</strong>
          <small>{canRun ? t('command.targetReady') : t('command.targetUnavailable')}</small>
        </span>
        <span className="quick-command-library-summary">
          {t('command.librarySummary', {
            available: summary.available || 0,
            total: summary.total || 0,
          })}
        </span>
        <Space size={6} className="quick-command-context-actions">
          <Button icon={<HistoryOutlined />} size="small" onClick={onOpenHistory}>
            <span className="quick-command-action-label">{t('action.commandHistory')}</span>
          </Button>
          <Button icon={<PlusOutlined />} size="small" type="primary" onClick={onNew}>
            {t('action.addCommand')}
          </Button>
        </Space>
      </div>

      <div className="quick-command-security-note">
        <SafetyCertificateOutlined />
        <Text type="secondary">{t('command.sensitiveHint')}</Text>
      </div>

      {editorOpen && (
        <section className="quick-command-editor" aria-label={t(editing ? 'command.editor.editTitle' : 'command.editor.newTitle')}>
          <div className="quick-command-editor-head">
            <span>
              <CodeOutlined />
              <strong>{t(editing ? 'command.editor.editTitle' : 'command.editor.newTitle')}</strong>
            </span>
            <Button size="small" type="text" onClick={onCancelEditor}>{t('action.cancel')}</Button>
          </div>
          <Form form={commandForm} layout="vertical" className="quick-command-form">
            <div className="quick-command-form-grid">
              <Form.Item name="name" label={t('field.name')} rules={[{ required: true, message: t('validation.required') }]}>
                <Input autoFocus />
              </Form.Item>
              <Form.Item name="providerType" label={t('field.providerScope')} initialValue="all">
                <Select options={providerOptions} />
              </Form.Item>
            </div>
            <Form.Item name="command" label={t('field.command')} rules={[{ required: true, message: t('validation.required') }]}>
              <Input.TextArea autoSize={{ minRows: 3, maxRows: 8 }} />
            </Form.Item>
            <div className="quick-command-editor-actions">
              <Button type="primary" onClick={onSave}>
                {editing ? t('action.save') : t('action.addCommand')}
              </Button>
            </div>
          </Form>
        </section>
      )}

      <div className="quick-command-filterbar">
        <Input.Search
          allowClear
          className="quick-command-search"
          value={query}
          onChange={(event) => onChangeQuery?.(event.target.value)}
          placeholder={t('placeholder.searchCommands')}
        />
        <Segmented
          className="quick-command-scope"
          value={scope}
          onChange={onChangeScope}
          options={[
            { value: 'current', label: t('command.scope.current') },
            { value: 'all', label: t('command.scope.all') },
            { value: 'favorites', label: t('command.scope.favorites') },
          ]}
        />
      </div>

      <List
        className="quick-command-list"
        dataSource={commands}
        locale={{
          emptyText: (
            <Empty
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              description={summary.total === 0 ? t('empty.noQuickCommands') : t('empty.noCommands')}
            >
              {summary.total === 0 && (
                <Button icon={<PlusOutlined />} size="small" type="primary" onClick={onNew}>
                  {t('action.addCommand')}
                </Button>
              )}
            </Empty>
          ),
        }}
        renderItem={(item) => (
          <QuickCommandRow
            canRun={canRun}
            item={item}
            key={item.id}
            onCopy={onCopy}
            onDelete={onDelete}
            onEdit={onEdit}
            onFavorite={onFavorite}
            onInsert={onInsert}
            onRun={onRun}
            providerLabel={providerLabel}
          />
        )}
      />
    </div>
  );
}

function QuickCommandRow({
  canRun,
  item,
  onCopy,
  onDelete,
  onEdit,
  onFavorite,
  onInsert,
  onRun,
  providerLabel,
}) {
  const safety = buildQuickCommandSafetyState(item);
  const menu = {
    items: [
      {
        key: 'favorite',
        icon: item.favorite ? <StarFilled /> : <StarOutlined />,
        label: t(item.favorite ? 'action.unfavorite' : 'action.favorite'),
      },
      { key: 'edit', icon: <EditOutlined />, label: t('action.edit'), disabled: !safety.canEdit },
      { key: 'copy', icon: <CopyOutlined />, label: t('action.copy'), disabled: !safety.canCopy },
      { type: 'divider' },
      { key: 'delete', icon: <DeleteOutlined />, label: t('action.delete'), danger: true },
    ],
    onClick: ({ key }) => {
      if (key === 'favorite') onFavorite?.(item.id);
      if (key === 'edit') onEdit?.(item);
      if (key === 'copy') onCopy?.(item);
      if (key === 'delete') onDelete?.(item);
    },
  };
  const insert = buildQuickCommandDispatch(item.command, { appendEnter: false });
  const runDisabled = !canRun || !safety.canRun;
  const insertDisabled = !canRun || !insert.ok;
  const runWarning = safety.warningKey ? t(safety.warningKey) : !canRun ? t('command.targetUnavailable') : '';
  const insertWarning = insert.reason === 'multiline'
    ? t('command.insertMultilineUnavailable')
    : runWarning || t('command.insertHint');
  return (
    <Dropdown menu={menu} trigger={['contextMenu']}>
      <List.Item
        className="quick-command-row"
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
                disabled={runDisabled}
                icon={<ThunderboltOutlined />}
                size="small"
                type="primary"
                onClick={() => onRun?.(item.command)}
              >
                <span className="quick-command-action-label">{t('action.run')}</span>
              </Button>
            </span>
          </Tooltip>,
          <Dropdown key="more" menu={menu} trigger={['click']}>
            <Button aria-label={t('action.manage')} icon={<MoreOutlined />} size="small" />
          </Dropdown>,
        ]}
      >
        <List.Item.Meta
          title={(
            <span className="quick-command-title">
              <strong>{item.name}</strong>
              <Tag>{providerLabel?.(item.providerType)}</Tag>
              {safety.sensitive && <Tag color="warning">{t('command.sensitiveTag')}</Tag>}
            </span>
          )}
          description={(
            <pre className="quick-command-code">
              {safety.sensitive ? t(safety.displayCommand) : safety.displayCommand}
            </pre>
          )}
        />
      </List.Item>
    </Dropdown>
  );
}
