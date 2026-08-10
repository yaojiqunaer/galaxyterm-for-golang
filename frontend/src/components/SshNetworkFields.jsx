import React from 'react';
import { Form, InputNumber, Tooltip } from 'antd';
import { InfoCircleOutlined } from '@ant-design/icons';
import { t } from '../i18n.js';

function fieldLabel(labelKey, hintKey) {
  return (
    <span className="form-label-with-help">
      {t(labelKey)}
      <Tooltip title={t(hintKey)}>
        <InfoCircleOutlined tabIndex={0} />
      </Tooltip>
    </span>
  );
}

export default function SshNetworkFields({
  connectTimeoutName = 'connectTimeoutSeconds',
  keepAliveIntervalName = 'keepAliveIntervalSeconds',
  keepAliveMaxFailuresName = 'keepAliveMaxFailures',
  showKeepAlive = true,
}) {
  const keepAliveInterval = Form.useWatch(keepAliveIntervalName);
  return (
    <div className="ssh-network-fields">
      <Form.Item
        initialValue={10}
        label={fieldLabel('field.connectTimeout', 'ssh.connectTimeoutHint')}
        name={connectTimeoutName}
        rules={[{ required: true, type: 'number', min: 1, max: 120 }]}
      >
        <InputNumber min={1} max={120} addonAfter={t('unit.seconds')} />
      </Form.Item>
      {showKeepAlive && (
        <Form.Item
          initialValue={0}
          label={fieldLabel('field.keepAliveInterval', 'ssh.keepAliveHint')}
          name={keepAliveIntervalName}
          rules={[{
            validator: (_, value) => (
              value === 0 || (value >= 5 && value <= 300)
                ? Promise.resolve()
                : Promise.reject(new Error(t('validation.keepAliveInterval')))
            ),
          }]}
        >
          <InputNumber min={0} max={300} addonAfter={t('unit.seconds')} />
        </Form.Item>
      )}
      {showKeepAlive && Number(keepAliveInterval) > 0 && (
        <Form.Item
          initialValue={3}
          label={fieldLabel('field.keepAliveFailures', 'ssh.keepAliveFailuresHint')}
          name={keepAliveMaxFailuresName}
          rules={[{ required: true, type: 'number', min: 1, max: 10 }]}
        >
          <InputNumber min={1} max={10} />
        </Form.Item>
      )}
    </div>
  );
}
