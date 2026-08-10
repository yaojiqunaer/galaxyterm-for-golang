import React from 'react';
import { Form, InputNumber, Space, Switch, Typography } from 'antd';
import { t } from '../i18n.js';

const { Text } = Typography;

export default function SessionRecoverySettings({ onChange, settings = {} }) {
  const enabled = settings.autoReconnect === true;
  return (
    <div className="session-recovery-settings">
      <Space align="center" className="settings-row">
        <div>
          <Text strong>{t('field.autoReconnect')}</Text>
          <Text type="secondary">{t('settings.autoReconnectHint')}</Text>
        </div>
        <Switch
          checked={enabled}
          onChange={(autoReconnect) => onChange?.({ autoReconnect })}
        />
      </Space>
      <Form className="session-recovery-settings-grid" layout="vertical">
        <Form.Item label={t('field.autoReconnectDelay')}>
          <InputNumber
            disabled={!enabled}
            min={1}
            max={30}
            suffix={t('unit.seconds')}
            value={settings.autoReconnectDelaySeconds}
            onChange={(autoReconnectDelaySeconds) => onChange?.({ autoReconnectDelaySeconds })}
          />
        </Form.Item>
        <Form.Item label={t('field.autoReconnectAttempts')}>
          <InputNumber
            disabled={!enabled}
            min={1}
            max={10}
            value={settings.autoReconnectMaxAttempts}
            onChange={(autoReconnectMaxAttempts) => onChange?.({ autoReconnectMaxAttempts })}
          />
        </Form.Item>
      </Form>
    </div>
  );
}
