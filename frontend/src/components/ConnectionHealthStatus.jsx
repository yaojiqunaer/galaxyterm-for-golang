import React from 'react';
import { Button } from 'antd';
import {
  CheckCircleOutlined,
  CloseCircleOutlined,
  LoadingOutlined,
  ReloadOutlined,
} from '@ant-design/icons';
import { t } from '../i18n.js';
import OperationErrorDescription from './OperationErrorDescription.jsx';

const statusIcons = {
  checking: <LoadingOutlined spin />,
  error: <CloseCircleOutlined />,
  success: <CheckCircleOutlined />,
};

export default function ConnectionHealthStatus({
  checkedLabel = '',
  onRetry,
  presentation = null,
}) {
  if (!presentation) return null;
  const checking = presentation.status === 'checking';
  return (
    <div
      aria-live={checking ? 'polite' : 'off'}
      className={`connection-health-status tone-${presentation.status}`}
      role="status"
    >
      <span className="connection-health-icon">{statusIcons[presentation.status]}</span>
      <span className="connection-health-copy">
        <strong>{t(presentation.titleKey, { latency: presentation.latencyMs })}</strong>
        {presentation.error
          ? <OperationErrorDescription model={presentation.error} />
          : <small>{t(presentation.descriptionKey, { checkedAt: checkedLabel })}</small>}
      </span>
      {presentation.canRetry && (
        <Button
          icon={<ReloadOutlined />}
          size="small"
          type="text"
          onClick={onRetry}
        >
          {t('action.testAgain')}
        </Button>
      )}
    </div>
  );
}
