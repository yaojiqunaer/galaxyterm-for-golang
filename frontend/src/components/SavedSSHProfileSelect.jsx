import React from 'react';
import { Button, Empty, Select, Tag, Typography } from 'antd';
import {
  CloudServerOutlined,
  LockOutlined,
  SettingOutlined,
  StarFilled,
} from '@ant-design/icons';
import { buildSavedSshConnections } from '../remoteWorkspace.js';
import { t } from '../i18n.js';

const { Text } = Typography;

export default function SavedSSHProfileSelect({
  disabled = false,
  onChange,
  onManageConnections,
  profiles = [],
  value = '',
}) {
  const connections = buildSavedSshConnections(profiles);
  const selected = connections.find((item) => item.id === value);
  const options = connections.map((connection) => ({
    connection,
    label: connection.displayName,
    searchText: [
      connection.displayName,
      connection.description,
      connection.group,
    ].filter(Boolean).join(' '),
    value: connection.id,
  }));

  return (
    <div className="saved-ssh-profile-select">
      <div className="saved-ssh-profile-heading">
        <Text strong>{t('field.savedSshConnection')}</Text>
        <Button
          icon={<SettingOutlined />}
          onClick={onManageConnections}
          size="small"
          type="text"
        >
          {t('action.manageConnections')}
        </Button>
      </div>
      <Select
        allowClear
        disabled={disabled}
        notFoundContent={(
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description={t('empty.noSavedSshConnections')}
          >
            <Button onClick={onManageConnections} size="small">{t('action.manageConnections')}</Button>
          </Empty>
        )}
        onChange={(nextValue) => onChange?.(nextValue || '')}
        optionFilterProp="searchText"
        optionRender={(option) => {
          const connection = option.data.connection;
          return (
            <div className="saved-ssh-option">
              <CloudServerOutlined />
              <span className="saved-ssh-option-copy">
                <strong>{connection.displayName}</strong>
                <small>{connection.description}</small>
              </span>
              <span className="saved-ssh-option-state">
                {connection.favorite && <StarFilled />}
                {connection.credentialSaved && <LockOutlined />}
              </span>
            </div>
          );
        }}
        options={options}
        placeholder={t('placeholder.savedSshConnection')}
        showSearch
        value={value || null}
      />
      {selected && (
        <div className="saved-ssh-selection">
          <span className="saved-ssh-selection-icon"><CloudServerOutlined /></span>
          <span className="saved-ssh-selection-copy">
            <strong>{selected.displayName}</strong>
            <small>{selected.description}</small>
          </span>
          <Tag icon={selected.hasSavedSecret ? <LockOutlined /> : null}>
            {selected.hasSavedSecret
              ? t('label.credentialSaved')
              : t('label.oneTimeCredentialRequired')}
          </Tag>
        </div>
      )}
    </div>
  );
}
