import React from 'react';
import { AutoComplete, Form, Select } from 'antd';
import { t } from '../i18n.js';
import { normalizeConnectionTags } from '../connectionProfiles.js';

export default function ConnectionMetadataFields({ groups = [], tags = [] }) {
  return (
    <div className="connection-metadata-fields">
      <Form.Item name="group" label={t('field.group')}>
        <AutoComplete
          allowClear
          options={groups.map((group) => ({ label: group, value: group }))}
          placeholder={t('placeholder.group')}
        />
      </Form.Item>
      <Form.Item
        name="tags"
        label={t('field.tags')}
        normalize={(value) => normalizeConnectionTags(value)}
        extra={t('connection.tagsHint')}
      >
        <Select
          mode="tags"
          maxCount={12}
          maxTagCount="responsive"
          options={tags.map((tag) => ({ label: tag, value: tag }))}
          placeholder={t('placeholder.connectionTags')}
          tokenSeparators={[',', '，', ';']}
        />
      </Form.Item>
    </div>
  );
}
