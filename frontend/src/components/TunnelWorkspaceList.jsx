import React from 'react';
import {
  Button,
  Dropdown,
  Empty,
  Input,
  List,
  Tabs,
  Tag,
  Tooltip,
  Typography,
} from 'antd';
import {
  ApiOutlined,
  CopyOutlined,
  DeleteOutlined,
  EditOutlined,
  MoreOutlined,
  PlayCircleOutlined,
  SearchOutlined,
  StopOutlined,
} from '@ant-design/icons';
import { t } from '../i18n.js';
import { buildTunnelDisplay } from '../remoteWorkspace.js';
import {
  filterTunnelPresets,
  resolveTunnelPreset,
} from '../tunnelPresets.js';

const { Text } = Typography;

export default function TunnelWorkspaceList({
  busy = false,
  onDuplicatePreset,
  onEditPreset,
  onNewPreset,
  onQueryChange,
  onRemovePreset,
  onRemoveRuntime,
  onStartPreset,
  onStopRuntime,
  presets = [],
  profiles = [],
  query = '',
  tunnels = [],
}) {
  const visiblePresets = filterTunnelPresets(presets, query, profiles);
  const savedRules = (
    <div className="tunnel-list-view">
      <div className="tunnel-list-search">
        <Input
          allowClear
          onChange={(event) => onQueryChange?.(event.target.value)}
          placeholder={t('placeholder.searchTunnelPresets')}
          prefix={<SearchOutlined />}
          value={query}
        />
        <Button icon={<PlayCircleOutlined />} onClick={onNewPreset}>{t('action.newForwardingRule')}</Button>
      </div>
      <List
        className="profile-list tunnel-list"
        dataSource={visiblePresets}
        locale={{
          emptyText: (
            <Empty
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              description={query ? t('empty.noSearchResults') : t('empty.noTunnelPresets')}
            >
              {!query && <Button type="primary" onClick={onNewPreset}>{t('action.newForwardingRule')}</Button>}
            </Empty>
          ),
        }}
        renderItem={(preset) => {
          const status = resolveTunnelPreset(preset, profiles, tunnels);
          const canStart = status.available && status.credentialReady;
          const route = `${preset.localHost}:${preset.localPort} → ${preset.remoteHost}:${preset.remotePort}`;
          const startButton = (
            <Button
              disabled={!canStart}
              icon={<PlayCircleOutlined />}
              loading={busy}
              onClick={() => onStartPreset?.(preset)}
              size="small"
              type="primary"
            >
              {t('action.start')}
            </Button>
          );
          return (
            <List.Item
              className="tunnel-row tunnel-preset-row"
              actions={[
                status.running
                  ? (
                    <Button
                      danger
                      icon={<StopOutlined />}
                      key="stop"
                      loading={busy}
                      onClick={() => onStopRuntime?.(tunnels.find((item) => item.id === status.runtimeId))}
                      size="small"
                    >
                      {t('action.stop')}
                    </Button>
                  )
                  : canStart
                    ? <React.Fragment key="start">{startButton}</React.Fragment>
                    : (
                      <Tooltip key="start" title={t(status.available ? 'tunnel.credentialRequired' : 'tunnel.profileUnavailable')}>
                        <span className="tooltip-disabled-action">{startButton}</span>
                      </Tooltip>
                    ),
                <Tooltip key="more" title={t('action.manage')}>
                  <Dropdown
                    menu={{
                      items: [
                        { key: 'edit', icon: <EditOutlined />, label: t('action.edit') },
                        { key: 'duplicate', icon: <CopyOutlined />, label: t('action.duplicate') },
                        { type: 'divider' },
                        { key: 'delete', danger: true, icon: <DeleteOutlined />, label: t('action.delete') },
                      ],
                      onClick: ({ key }) => {
                        if (key === 'edit') onEditPreset?.(preset);
                        if (key === 'duplicate') onDuplicatePreset?.(preset);
                        if (key === 'delete') onRemovePreset?.(preset);
                      },
                    }}
                    trigger={['click']}
                  >
                    <Button aria-label={t('action.manage')} icon={<MoreOutlined />} size="small" />
                  </Dropdown>
                </Tooltip>,
              ]}
            >
              <List.Item.Meta
                avatar={<span className="provider-icon"><ApiOutlined /></span>}
                title={(
                  <span className="remote-file-title">
                    <strong>{preset.name}</strong>
                    {status.running && <Tag color="success">{t('tunnel.running')}</Tag>}
                    {!status.available && <Tag color="warning">{t('tunnel.profileMissing')}</Tag>}
                    {!status.running && status.available && !status.credentialReady && <Tag>{t('tunnel.credentialNeeded')}</Tag>}
                  </span>
                )}
                description={(
                  <span className="tunnel-route">
                    <span>{route}</span>
                    <small>{t('tunnel.via')} {status.profileName || t('tunnel.profileUnavailable')}</small>
                  </span>
                )}
              />
            </List.Item>
          );
        }}
      />
    </div>
  );

  const activeTunnels = (
    <List
      className="profile-list tunnel-list"
      dataSource={tunnels}
      locale={{
        emptyText: <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={t('empty.noTunnels')} />,
      }}
      renderItem={(item) => {
        const display = buildTunnelDisplay(item);
        const failed = display.status === 'error';
        return (
          <List.Item
            className={failed ? 'tunnel-row is-error' : 'tunnel-row'}
            actions={[
              failed
                ? <Button key="remove" danger size="small" icon={<DeleteOutlined />} loading={busy} onClick={() => onRemoveRuntime?.(item)}>{t('action.remove')}</Button>
                : <Button key="stop" danger size="small" icon={<StopOutlined />} loading={busy} onClick={() => onStopRuntime?.(item)}>{t('action.stop')}</Button>,
            ]}
          >
            <List.Item.Meta
              avatar={<span className="provider-icon"><ApiOutlined /></span>}
              title={(
                <span className="remote-file-title">
                  <strong>{display.name}</strong>
                  <span className="connection-profile-badge tone-success">{display.localPort}</span>
                  {failed && <Tag color="error">{t('session.status.error')}</Tag>}
                </span>
              )}
              description={(
                <span className="tunnel-route">
                  <span>{display.route}</span>
                  <small>{t('tunnel.via')} {display.via}</small>
                  {failed && <small className="tunnel-error" title={display.error}>{display.error || t('message.tunnelFailed')}</small>}
                </span>
              )}
            />
          </List.Item>
        );
      }}
    />
  );

  return (
    <div className="remote-file-panel tunnel-list-panel">
      <div className="remote-file-toolbar">
        <div>
          <Text strong>{t('section.portForwardingRules')}</Text>
          <Text type="secondary">{t('tunnel.listHint')}</Text>
        </div>
      </div>
      <Tabs
        className="tunnel-list-tabs"
        defaultActiveKey="saved"
        items={[
          {
            key: 'saved',
            label: `${t('section.savedTunnelRules')} ${presets.length}`,
            children: savedRules,
          },
          {
            key: 'active',
            label: `${t('section.activeTunnels')} ${tunnels.length}`,
            children: activeTunnels,
          },
        ]}
      />
    </div>
  );
}
