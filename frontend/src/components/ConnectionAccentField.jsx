import React from 'react';
import { Form, Radio, Tooltip } from 'antd';
import { connectionAccentOptions } from '../connectionProfiles.js';
import { t } from '../i18n.js';

export default function ConnectionAccentField() {
  return (
    <Form.Item name="accent" label={t('field.connectionAccent')} initialValue="none">
      <Radio.Group className="connection-accent-picker">
        {connectionAccentOptions.map((accent) => {
          const label = t(`connection.accent.${accent}`);
          return (
            <Tooltip key={accent} title={label}>
              <Radio.Button aria-label={label} value={accent}>
                <span className={`connection-accent-swatch accent-${accent}`} />
              </Radio.Button>
            </Tooltip>
          );
        })}
      </Radio.Group>
    </Form.Item>
  );
}
