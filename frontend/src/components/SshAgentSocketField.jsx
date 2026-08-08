import React from 'react';
import { Alert, Form, Input } from 'antd';
import { KeyOutlined } from '@ant-design/icons';
import { t } from '../i18n.js';

export default function SshAgentSocketField({ name = 'agentSocketPath' }) {
  return (
    <div className="ssh-agent-field">
      <Form.Item label={t('field.agentSocketPath')} name={name}>
        <Input
          allowClear
          prefix={<KeyOutlined />}
          placeholder={t('placeholder.agentSocketPath')}
        />
      </Form.Item>
      <Alert type="info" showIcon message={t('ssh.agentHint')} />
    </div>
  );
}
