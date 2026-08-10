import React from 'react';
import {
  Button,
  Checkbox,
  Dropdown,
  Tooltip,
} from 'antd';
import {
  ApiOutlined,
  BgColorsOutlined,
  CloseOutlined,
  DeleteOutlined,
  ExportOutlined,
  FolderOpenOutlined,
  StarFilled,
  StarOutlined,
  TagsOutlined,
  ThunderboltOutlined,
} from '@ant-design/icons';
import { connectionAccentOptions } from '../connectionProfiles.js';
import { t } from '../i18n.js';

export default function ConnectionSelectionToolbar({
  allFavorite = false,
  allVisibleSelected = false,
  moveMenu = { items: [] },
  onAccent,
  onClear,
  onDelete,
  onExport,
  onFavorite,
  onOpen,
  onTags,
  onTest,
  onToggleVisible,
  openableCount = 0,
  partiallyVisibleSelected = false,
  selectedCount = 0,
  testableCount = 0,
  testingCount = 0,
}) {
  if (selectedCount <= 0) return null;
  const accentMenu = {
    items: connectionAccentOptions.map((accent) => ({
      icon: <span className={`connection-accent-menu-swatch accent-${accent}`} />,
      key: accent,
      label: t(`connection.accent.${accent}`),
      onClick: () => onAccent?.(accent),
    })),
  };

  return (
    <div
      aria-label={t('connection.selection.toolbar')}
      className="connection-selection-toolbar"
      role="toolbar"
    >
      <Checkbox
        aria-label={t('action.selectVisibleConnections')}
        checked={allVisibleSelected}
        indeterminate={partiallyVisibleSelected}
        onChange={(event) => onToggleVisible?.(event.target.checked)}
      />
      <strong className="connection-selection-count">
        {t('connection.selection.count', { count: selectedCount })}
      </strong>
      <span className="connection-selection-spacer" />
      <Tooltip title={t('action.openSelectedConnections')}>
        <span className="tooltip-button-wrapper">
          <Button
            className="connection-selection-open"
            disabled={openableCount <= 0}
            icon={<ThunderboltOutlined />}
            size="small"
            type="primary"
            onClick={onOpen}
          >
            <span className="connection-selection-action-label">
              {t('action.openSelectedConnections')}
            </span>
            {openableCount > 0 && <span className="connection-selection-action-count">{openableCount}</span>}
          </Button>
        </span>
      </Tooltip>
      <Tooltip title={t('action.testSelectedConnections')}>
        <span className="tooltip-button-wrapper">
          <Button
            className="connection-selection-test"
            disabled={testableCount <= 0 || testingCount > 0}
            icon={<ApiOutlined />}
            loading={testingCount > 0}
            size="small"
            onClick={onTest}
          >
            <span className="connection-selection-action-label">
              {t('action.testSelectedConnections')}
            </span>
            {testableCount > 0 && <span className="connection-selection-action-count">{testableCount}</span>}
          </Button>
        </span>
      </Tooltip>
      <Dropdown menu={moveMenu} trigger={['click']}>
        <Button icon={<FolderOpenOutlined />} size="small">
          <span className="connection-selection-action-label">{t('action.moveToGroup')}</span>
        </Button>
      </Dropdown>
      <Tooltip title={t('action.manageTags')}>
        <Button
          aria-label={t('action.manageTags')}
          icon={<TagsOutlined />}
          size="small"
          onClick={onTags}
        />
      </Tooltip>
      <Tooltip title={t('action.setIdentificationColor')}>
        <Dropdown menu={accentMenu} trigger={['click']}>
          <Button
            aria-label={t('action.setIdentificationColor')}
            icon={<BgColorsOutlined />}
            size="small"
          />
        </Dropdown>
      </Tooltip>
      <Tooltip title={t(allFavorite ? 'action.unfavoriteSelected' : 'action.favoriteSelected')}>
        <Button
          aria-label={t(allFavorite ? 'action.unfavoriteSelected' : 'action.favoriteSelected')}
          icon={allFavorite ? <StarFilled /> : <StarOutlined />}
          size="small"
          onClick={onFavorite}
        />
      </Tooltip>
      <Tooltip title={t('action.exportSelectedConnections')}>
        <Button
          aria-label={t('action.exportSelectedConnections')}
          icon={<ExportOutlined />}
          size="small"
          onClick={onExport}
        />
      </Tooltip>
      <Tooltip title={t('action.deleteSelectedConnections')}>
        <Button
          aria-label={t('action.deleteSelectedConnections')}
          danger
          icon={<DeleteOutlined />}
          size="small"
          onClick={onDelete}
        />
      </Tooltip>
      <Tooltip title={t('action.clearSelection')}>
        <Button
          aria-label={t('action.clearSelection')}
          icon={<CloseOutlined />}
          size="small"
          type="text"
          onClick={onClear}
        />
      </Tooltip>
    </div>
  );
}
