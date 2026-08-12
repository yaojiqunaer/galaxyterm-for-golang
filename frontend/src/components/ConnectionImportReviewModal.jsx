import React from 'react';
import { Alert, Modal, Segmented, Tag } from 'antd';
import { t } from '../i18n.js';

export default function ConnectionImportReviewModal({
  applying = false,
  formatProfileTarget = (profile) => profile?.displayName || '-',
  onCancel,
  onConfirm,
  onStrategyChange,
  open = false,
  plan = null,
  sourceLabel = '',
  strategy = 'skip',
}) {
  const summary = plan?.summary || { conflictCount: 0, newCount: 0, unchangedCount: 0 };
  const conflicts = plan?.conflicts || [];
  const credentialClearCount = conflicts.filter(({ destinationChanged, existing }) => (
    destinationChanged && existing.auth?.credentialRef
  )).length;
  const importCount = summary.newCount + (strategy === 'skip' ? 0 : summary.conflictCount);

  return (
    <Modal
      centered
      className="connection-import-modal"
      cancelText={importCount > 0 ? t('action.cancel') : t('action.close')}
      closable={!applying}
      confirmLoading={applying}
      destroyOnHidden
      keyboard={!applying}
      maskClosable={!applying}
      okButtonProps={{ disabled: importCount <= 0 }}
      okText={t('connection.import.confirm', { count: importCount })}
      open={open}
      title={t('connection.import.title')}
      width={640}
      onCancel={onCancel}
      onOk={onConfirm}
    >
      <p className="connection-import-source">
        {t('connection.import.source', { source: sourceLabel || '-' })}
      </p>
      <div className="connection-import-summary">
        <ImportMetric count={summary.newCount} label={t('connection.import.new')} tone="success" />
        <ImportMetric count={summary.unchangedCount} label={t('connection.import.unchanged')} tone="default" />
        <ImportMetric count={summary.conflictCount} label={t('connection.import.conflicts')} tone="warning" />
      </div>

      {summary.conflictCount > 0 ? (
        <>
          <div className="connection-import-strategy">
            <strong>{t('connection.import.strategy')}</strong>
            <Segmented
              block
              disabled={applying}
              options={[
                { label: t('connection.import.strategy.skip'), value: 'skip' },
                { label: t('connection.import.strategy.replace'), value: 'replace' },
                { label: t('connection.import.strategy.copy'), value: 'copy' },
              ]}
              value={strategy}
              onChange={onStrategyChange}
            />
            <small>{t(`connection.import.strategy.${strategy}Hint`)}</small>
          </div>
          {strategy === 'replace' && credentialClearCount > 0 && (
            <Alert
              showIcon
              type="warning"
              message={t('connection.import.credentialsCleared', { count: credentialClearCount })}
            />
          )}
          <div className="connection-import-conflicts">
            <strong>{t('connection.import.conflictDetails')}</strong>
            {conflicts.slice(0, 8).map(({ destinationChanged, existing, incoming }) => (
              <div className="connection-import-conflict-row" key={`${existing.id}:${incoming.id}`}>
                <div>
                  <strong>{incoming.displayName}</strong>
                  <small>{incoming.providerType}</small>
                </div>
                <div className="connection-import-target-change">
                  <span>{formatProfileTarget(existing)}</span>
                  <span aria-hidden="true">→</span>
                  <span>{formatProfileTarget(incoming)}</span>
                </div>
                {destinationChanged && <Tag color="warning">{t('connection.import.targetChanged')}</Tag>}
              </div>
            ))}
            {conflicts.length > 8 && (
              <small>{t('connection.import.moreConflicts', { count: conflicts.length - 8 })}</small>
            )}
          </div>
        </>
      ) : (
        <Alert
          showIcon
          type={summary.newCount > 0 ? 'info' : 'success'}
          message={summary.newCount > 0
            ? t('connection.import.ready', { count: summary.newCount })
            : t('connection.import.noChanges')}
        />
      )}
    </Modal>
  );
}

function ImportMetric({ count = 0, label, tone = 'default' }) {
  return (
    <div className={`connection-import-metric tone-${tone}`}>
      <span>{label}</span>
      <strong>{count}</strong>
    </div>
  );
}
