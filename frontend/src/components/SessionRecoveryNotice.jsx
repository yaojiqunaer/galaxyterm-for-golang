import React, { useEffect, useState } from 'react';
import { Button, Tooltip } from 'antd';
import { CloseOutlined, ReloadOutlined, WarningOutlined } from '@ant-design/icons';
import { t } from '../i18n.js';

export default function SessionRecoveryNotice({ onCancel, recovery = null }) {
  const [remainingSeconds, setRemainingSeconds] = useState(() => remainingTime(recovery));

  useEffect(() => {
    setRemainingSeconds(remainingTime(recovery));
    if (recovery?.status !== 'scheduled') return undefined;
    const timer = window.setInterval(() => {
      setRemainingSeconds(remainingTime(recovery));
    }, 250);
    return () => window.clearInterval(timer);
  }, [recovery]);

  if (!recovery || !['scheduled', 'exhausted'].includes(recovery.status)) return null;
  const exhausted = recovery.status === 'exhausted';
  const title = exhausted
    ? t('session.recovery.exhausted')
    : t('session.recovery.scheduled', { seconds: remainingSeconds });
  const detail = t('session.recovery.attempt', {
    attempt: recovery.attempt || 0,
    max: recovery.maxAttempts || 0,
  });
  return (
    <span className={`session-recovery-notice${exhausted ? ' exhausted' : ''}`} role="status">
      {exhausted ? <WarningOutlined /> : <ReloadOutlined spin={remainingSeconds <= 0} />}
      <span>
        <strong>{title}</strong>
        <small>{detail}</small>
      </span>
      <Tooltip title={t(exhausted ? 'action.dismiss' : 'action.cancelAutoReconnect')}>
        <Button
          aria-label={t(exhausted ? 'action.dismiss' : 'action.cancelAutoReconnect')}
          icon={<CloseOutlined />}
          size="small"
          type="text"
          onClick={onCancel}
        />
      </Tooltip>
    </span>
  );
}

function remainingTime(recovery) {
  if (recovery?.status !== 'scheduled') return 0;
  return Math.max(0, Math.ceil((Number(recovery.retryAt) - Date.now()) / 1000));
}
