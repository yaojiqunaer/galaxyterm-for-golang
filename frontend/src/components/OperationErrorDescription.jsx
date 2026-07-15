import React from 'react';
import { Typography } from 'antd';
import { t } from '../i18n.js';

const { Text } = Typography;

export default function OperationErrorDescription({ model }) {
  return (
    <div className="operation-error-description">
      <Text strong>{t(model.reasonKey)}</Text>
      {model.detail && <code className="operation-error-detail">{model.detail}</code>}
      <Text type="secondary">{t(model.suggestionKey)}</Text>
    </div>
  );
}
