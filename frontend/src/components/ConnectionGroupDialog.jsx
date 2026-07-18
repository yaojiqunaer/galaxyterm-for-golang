import React, { useEffect, useMemo, useState } from 'react';
import { Alert, Input, Modal, Typography } from 'antd';
import { normalizeConnectionGroupName } from '../connectionManager.js';
import { t } from '../i18n.js';

const { Text } = Typography;

export default function ConnectionGroupDialog({
  editor = null,
  existingGroups = [],
  onCancel,
  onSubmit,
}) {
  const [name, setName] = useState('');
  const open = Boolean(editor);

  useEffect(() => {
    if (!editor) {
      setName('');
      return;
    }
    setName(editor.mode === 'rename' ? editor.sourceGroup || '' : '');
  }, [editor]);

  const normalizedName = normalizeConnectionGroupName(name);
  const normalizedSource = normalizeConnectionGroupName(editor?.sourceGroup);
  const existingGroupSet = useMemo(
    () => new Set(existingGroups.map((group) => normalizeConnectionGroupName(group)).filter(Boolean)),
    [existingGroups],
  );
  const mergesExistingGroup = Boolean(
    normalizedName
      && normalizedName !== normalizedSource
      && existingGroupSet.has(normalizedName),
  );
  const unchanged = editor?.mode === 'rename' && normalizedName === normalizedSource;
  const canSubmit = Boolean(normalizedName) && !unchanged;

  const submit = () => {
    if (canSubmit) onSubmit?.(normalizedName);
  };

  return (
    <Modal
      cancelText={t('action.cancel')}
      destroyOnHidden
      okButtonProps={{ disabled: !canSubmit }}
      okText={t(editor?.mode === 'rename' ? 'action.rename' : 'action.move')}
      onCancel={onCancel}
      onOk={submit}
      open={open}
      title={t(editor?.mode === 'rename'
        ? 'connection.group.renameTitle'
        : 'connection.group.newTitle')}
    >
      <div className="connection-group-dialog-body">
        <Text type="secondary">
          {t(editor?.mode === 'rename'
            ? 'connection.group.renameDescription'
            : 'connection.group.moveDescription', {
            count: editor?.affectedCount || 0,
            name: editor?.profileName || '',
          })}
        </Text>
        <Input
          autoFocus
          maxLength={80}
          placeholder={t('placeholder.connectionGroupName')}
          showCount
          value={name}
          onChange={(event) => setName(event.target.value)}
          onPressEnter={submit}
        />
        {mergesExistingGroup && (
          <Alert
            showIcon
            type="info"
            message={t('connection.group.mergeHint', { name: normalizedName })}
          />
        )}
      </div>
    </Modal>
  );
}
