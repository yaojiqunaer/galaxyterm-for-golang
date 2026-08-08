import React from 'react';
import { Form, Input, Select, Tooltip } from 'antd';
import { InfoCircleOutlined } from '@ant-design/icons';
import { t } from '../i18n.js';

export default function SshSecurityFields({
  pathName = 'knownHostsPath',
  policyName = 'hostKeyPolicy',
}) {
  return (
    <div className="ssh-security-fields">
      <Form.Item
        initialValue="accept-new"
        label={(
          <span className="form-label-with-help">
            {t('field.hostKeyPolicy')}
            <Tooltip title={t('ssh.hostKeyPolicyHint')}>
              <InfoCircleOutlined tabIndex={0} />
            </Tooltip>
          </span>
        )}
        name={policyName}
      >
        <Select options={[
          { label: t('ssh.hostKeyPolicy.acceptNew'), value: 'accept-new' },
          { label: t('ssh.hostKeyPolicy.strict'), value: 'strict' },
        ]} />
      </Form.Item>
      <Form.Item label={t('field.knownHostsPath')} name={pathName}>
        <Input placeholder={t('placeholder.knownHostsPath')} />
      </Form.Item>
    </div>
  );
}
