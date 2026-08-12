import React, { lazy, Suspense, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Badge,
  Button,
  Card,
  Checkbox,
  Collapse,
  ConfigProvider,
  Divider,
  Drawer,
  Dropdown,
  Empty,
  Form,
  Grid,
  Input,
  InputNumber,
  Layout,
  List,
  Menu,
  Modal,
  Popover,
  Progress,
  Segmented,
  Select,
  Space,
  Switch,
  Tabs,
  Tag,
  Tooltip,
  Typography,
  message,
  notification,
  theme as antdTheme,
} from 'antd';
import {
  ApiOutlined,
  AppstoreOutlined,
  AuditOutlined,
  AppstoreAddOutlined,
  BellOutlined,
  CloudServerOutlined,
  CodeOutlined,
  ClearOutlined,
  CloseOutlined,
  CopyOutlined,
  DatabaseOutlined,
  DeleteOutlined,
  DownloadOutlined,
  DownOutlined,
  EditOutlined,
  ExportOutlined,
  FileTextOutlined,
  FolderOpenOutlined,
  FullscreenExitOutlined,
  FullscreenOutlined,
  GlobalOutlined,
  HistoryOutlined,
  InfoCircleOutlined,
  ImportOutlined,
  LoadingOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  QuestionCircleOutlined,
  LaptopOutlined,
  LeftOutlined,
  LockOutlined,
  MinusOutlined,
  MoreOutlined,
  PlusOutlined,
  ReloadOutlined,
  RightOutlined,
  SaveOutlined,
  SendOutlined,
  SettingOutlined,
  StarFilled,
  StarOutlined,
  StopOutlined,
  ThunderboltOutlined,
  UploadOutlined,
  UnlockOutlined,
  VideoCameraOutlined,
} from '@ant-design/icons';
import {
  buildAsciinemaCast,
  buildAuditCaptureID,
  buildAuditRecord,
  buildAuditRecordSummary,
  createAuditEvent,
  persistAuditRecordSet,
  sanitizeAuditRecord,
  upsertAuditSessionRecord,
} from './auditLog.js';
import {
  buildExtensionCatalog,
  filterAuditRecords,
  summarizeWorkspace,
} from './workspaceInsights.js';
import {
  buildConnectionGroupFilter,
  buildConnectionGroupNav,
  buildConnectionGroups,
  buildConnectionLaunchKey,
  buildConnectionEmptyState,
  buildConnectionProfileBadges,
  buildConnectionProfileFacts,
  buildConnectionProfileHints,
  buildConnectionProfileLaunchModel,
  buildConnectionProfileStatusSummary,
  buildConnectionProfileSubtitle,
  buildConnectionSelectionActionState,
  buildConnectionTransferActions,
  collectConnectionTags,
  buildDefaultTerminalLaunch,
  buildTerminalSubmitPlan,
  filterConnectionProfiles,
  filterRecentConnectionsByProviders,
  isProfileConnectionLaunching,
  isProfileProviderAvailable,
  moveConnectionProfilesToGroup,
  reconcileConnectionProfileSelection,
  removeConnectionProfiles,
  removeConnectionGroup,
  releaseConnectionLaunchRequests,
  renameConnectionGroup,
  reserveConnectionLaunchRequests,
  resolveConnectionGroupFilter,
  resolveConnectionProfileDrop,
  resolveConnectionProfileSelection,
  resolveProfileSaveDefault,
  resolveSelectedProfileId,
  selectBatchProfiles,
  setVisibleConnectionProfileSelection,
  summarizeProfileSessions,
  sortConnectionProfiles,
  sortSidebarProfiles,
  ungroupedKey,
  updateConnectionProfilesFavorite,
  updateConnectionProfilesAccent,
  updateConnectionProfilesTag,
} from './connectionManager.js';
import {
  appendClosedSessions,
  buildSessionAttentionSummary,
  buildSessionAuditSummary,
  buildSessionAuditWorkspaceSummary,
  buildSessionClosePlan,
  buildSessionCloseConfirm,
  buildSessionContextFacts,
  buildDesktopWindowTitle,
  buildSessionDisplayLabels,
  buildSessionIdentityDisplay,
  buildSessionNavigationState,
  buildSessionReconnectBatch,
  buildSessionSidebarState,
  buildSessionTabMenuModel,
  buildSessionToolbarContext,
  buildSessionToolbarModel,
  markAllSessionActivityRead,
  markSessionActivityRead,
  moveSessionInOrder,
  profileActionModel,
  pruneSessionActivity,
  reconcileSessionReconnects,
  recordSessionAttention,
  recordSessionCommandResult,
  recordSessionOutputActivity,
  releaseSessionReconnect,
  resolveNextAttentionSessionId,
  resolveSessionAccent,
  reserveSessionReconnect,
  reorderSessions,
  sessionTabDisplay,
  sessionStatusLabel,
  sessionStatusTone,
  sessionSummary,
  shouldOfferSessionReconnectBatch,
  synchronizeSessionCreated,
  synchronizeSessionTerminalSnapshot,
  synchronizeSessionTerminalStatus,
  takeClosedSession,
  toggleSessionProtection,
} from './sessionPresentation.js';
import {
  buildAppearanceSummary,
  buildOperationalSummary,
  buildSettingsSectionNav,
  buildSecuritySummary,
  buildShortcutEditorRows,
  buildShortcutGroups,
  buildShortcutKeyOptions,
  buildTerminalDefaults,
  buildTerminalPreview,
  buildWorkspaceActionState,
  defaultShortcutBindings,
  isCommandShortcut,
  isTerminalInputTarget,
  normalizeSidebarMode,
  normalizeShortcutModifier,
  normalizeShortcutBindings,
  buildWorkspaceSnapshotSummary,
  normalizeLogLevel,
  resolveSettingsSectionNavigation,
  resolveConfigurableShortcutAction,
  resolveSidebarCompact,
  shortcutModifierLabel,
  updateShortcutBinding,
} from './settingsPresentation.js';
import {
  buildFileConnectionFormValues,
  buildFileConnectionProfile,
  buildFileConnectionRequest,
  buildFileProviderAuthValues,
  buildFileProviderConfigValues,
  buildRemoteFileActions,
  buildRemoteFileBreadcrumbs,
  buildRemoteFileView,
  buildRemoteRenameDestination,
  buildRemoteFileSummary,
  buildSavedSshConnections,
  buildSshAgentConfig,
  buildSshConnectionAuth,
  buildSshNetworkConfig,
  buildSshProfileFields,
  buildSshSecurityConfig,
  buildTunnelDisplay,
  buildTunnelSummary,
  createFileTransferID,
  readableBytes,
  updateFileTransferProgress,
} from './remoteWorkspace.js';
import {
  buildConnectionProfilesExport,
  createProfileID,
  hasStoredSshCredential,
  normalizeConnectionAccent,
  normalizeImportedConnectionProfile,
  normalizeConnectionTags,
  normalizeStoredConnectionProfile,
  shouldClearStoredSshCredential,
} from './connectionProfiles.js';
import {
  applyConnectionImportPlan,
  buildConnectionImportPlan,
  countConnectionImportCredentialCleanupFailures,
} from './connectionImport.js';
import {
  beginConnectionProbes,
  buildConnectionHealthPresentation,
  buildConnectionProbePlan,
  clearConnectionHealth,
  completeConnectionProbe,
  reconcileConnectionHealth,
  runConnectionProbeQueue,
} from './connectionHealth.js';
import {
  buildTerminalControlActions,
  buildTerminalErrorDetail,
  buildTerminalRecoveryActions,
  buildTerminalStatusFacts,
  normalizeTerminalStatus,
  terminalStatusTone,
} from './terminalStatus.js';
import { parseSshConfigProfiles } from './sshConfigProfiles.js';
import {
  hasWailsMethod,
  syncDesktopWindowTheme,
  syncDesktopWindowTitle,
  writeClipboardText,
} from './desktopBridge.js';
import {
  buildConnectionActionPaletteItems,
  buildProfilePaletteItems,
  buildSessionActionPaletteItems,
  loadPaletteRecentIds,
  persistPaletteRecentIds,
  recordPaletteRecent,
} from './paletteModel.js';
import {
  buildCommandHistoryEntryResult,
  clearCommandHistory,
  filterCommandHistory,
  normalizeCommandHistoryItem,
  pruneCommandHistory,
  removeCommandHistoryItem,
  toggleCommandHistoryFavorite as toggleCommandHistoryFavoriteItem,
  upsertCommandHistory,
} from './commandHistory.js';
import {
  buildBroadcastCommandPlan,
  buildBroadcastSessionTargets,
} from './broadcastCommand.js';
import {
  buildWorkspaceRestorePlan,
  buildWorkspaceSnapshot,
  clearWorkspaceSnapshot as clearPersistedWorkspaceSnapshot,
  loadWorkspaceSnapshot,
  loadWorkspaceSummary,
  persistWorkspaceSnapshot,
  sanitizeWorkspaceRequest,
} from './workspaceState.js';

import {
  buildQuickCommandDispatch,
  buildQuickCommandFromHistory,
  buildQuickCommandSafetyState,
  buildQuickCommandSaveResult,
  buildQuickCommandSummary,
  filterQuickCommands,
  normalizeQuickCommand,
  upsertQuickCommand,
} from './quickCommands.js';
import {
  buildEnabledFileProviders,
  buildFileProviderFormValues,
  buildExtensionAction,
  buildExtensionCardFacts,
  buildExtensionSummary,
  buildExtensionUsageImpact,
  buildInstalledExtensionRows,
  buildProviderRuntimeState,
  findCatalogItemForType,
  findExtensionUpdate,
  filterExtensionWorkspace,
  filterProvidersByDisabledExtensions,
  fileProviderSupports,
} from './extensionPresentation.js';
import {
  defaultExtensionSources,
  normalizeExtensionSource,
  removeExtensionCatalogSource,
  removeExtensionSource,
  replaceExtensionCatalogSource,
  upsertExtensionSource,
} from './extensionSources.js';
import {
  resolveListIndex,
  resolveBracketSessionAction,
  resolveNumberedSessionIndex,
  resolveRelativeSessionIndex,
  resolveSessionShortcutNumber,
  resolveTabSessionAction,
} from './listNavigation.js';
import {
  advanceSessionSwitch,
  consumeSessionSwitchEvent,
  emptySessionSwitchState,
  recordSessionVisit,
  resolveSessionSwitchSelection,
  shouldCancelSessionSwitch,
  startSessionSwitch,
} from './sessionSwitcher.js';
import {
  buildSessionRecoveryPlan,
  markSessionRecoveryStarted,
  normalizeSessionRecoveryPolicy,
  pruneSessionRecoveries,
} from './sessionRecovery.js';
import * as ExtensionsAPI from '../wailsjs/go/extensions/API.js';
import * as FilesAPI from '../wailsjs/go/files/API.js';
import * as DesktopAPI from '../wailsjs/go/desktop/API.js';
import * as ThemeAPI from '../wailsjs/go/internal/Theme.js';
import * as CredentialsAPI from '../wailsjs/go/credentials/API.js';
import * as SessionAPI from '../wailsjs/go/session/API.js';
import * as TerminalAPI from '../wailsjs/go/terminal/API.js';
import * as TunnelAPI from '../wailsjs/go/tunnel/API.js';
import * as runtime from '../wailsjs/runtime/runtime.js';
import {
  availableLocales,
  currentLocale,
  replaceExtensionMessages,
  setLocale,
  t,
} from './i18n.js';
import CommandPalette from './components/CommandPalette.jsx';
import ConnectionGroupDialog from './components/ConnectionGroupDialog.jsx';
import ConnectionImportReviewModal from './components/ConnectionImportReviewModal.jsx';
import ConnectionSelectionToolbar from './components/ConnectionSelectionToolbar.jsx';
import ConnectionHealthStatus from './components/ConnectionHealthStatus.jsx';
import ConnectionMetadataFields from './components/ConnectionMetadataFields.jsx';
import QuickCommandLibrary from './components/QuickCommandLibrary.jsx';
import CommandHistoryPanel from './components/CommandHistoryPanel.jsx';
import SessionQuickSwitcher from './components/SessionQuickSwitcher.jsx';
import SessionRecoveryNotice from './components/SessionRecoveryNotice.jsx';
import SessionRecoverySettings from './components/SessionRecoverySettings.jsx';
import SessionSidebarFilter from './components/SessionSidebarFilter.jsx';
import SavedSSHProfileSelect from './components/SavedSSHProfileSelect.jsx';
import SshAgentSocketField from './components/SshAgentSocketField.jsx';
import SshNetworkFields from './components/SshNetworkFields.jsx';
import SshSecurityFields from './components/SshSecurityFields.jsx';
import FileProviderFormFields from './components/FileProviderFormFields.jsx';
import OperationErrorDescription from './components/OperationErrorDescription.jsx';
import TerminalSearchControl from './components/TerminalSearchControl.jsx';
import TunnelWorkspaceList from './components/TunnelWorkspaceList.jsx';
import { buildOperationError } from './operationFeedback.js';
import {
  buildTunnelPreset,
  duplicateTunnelPreset,
  loadTunnelPresets,
  persistTunnelPresets,
  removeTunnelPreset,
  upsertTunnelPreset,
} from './tunnelPresets.js';
import {
  defaultTerminalSearchPreferences,
  emptyTerminalSearchResult,
  invalidTerminalSearchResult,
  normalizeTerminalSearchPreferences,
  normalizeTerminalSearchResult,
  terminalSearchRequestKey,
  validateTerminalSearchQuery,
} from './terminalSearch.js';
import {
  buildExtensionTerminalCredentialValues,
  buildExtensionTerminalFormValues,
  buildExtensionTerminalRequest,
  buildTerminalProviderSummary,
  extensionTerminalDescription,
} from './terminalProviders.js';
import {
  loadConnectionWorkspacePreferences,
  persistConnectionWorkspacePreferences,
  removeRecentConnection,
  updateConnectionWorkspacePreferences,
} from './connectionWorkspace.js';

const TerminalPane = lazy(() => import('./components/TerminalPane.jsx'));
const AuditReplayPlayer = lazy(() => import('./components/AuditReplayPlayer.jsx'));
const { Sider, Content } = Layout;
const { Text, Title } = Typography;

const profileStorageKey = 'galaxyterm.connectionProfiles';
const settingsStorageKey = 'galaxyterm.settings';
const commandStorageKey = 'galaxyterm.quickCommands';
const commandHistoryStorageKey = 'galaxyterm.commandHistory';
const recentConnectionStorageKey = 'galaxyterm.recentConnections';
const auditRecordStorageKey = 'galaxyterm.auditRecords';
const extensionSourceStorageKey = 'galaxyterm.extensionSources';
const profileSchemaVersion = 5;

const defaultSettings = {
  appTheme: 'dark',
  terminalTheme: 'auto',
  fontFamily: 'SFMono-Regular,JetBrains Mono,Menlo,Consolas,Liberation Mono,monospace',
  fontSize: 14,
  scrollback: 5000,
  interfaceDensity: 'comfortable',
  sidebarMode: 'auto',
  autoSaveWorkspace: true,
  autoRestoreWorkspace: false,
  confirmDangerousActions: true,
  recordCommandHistory: true,
  commandHistoryLimit: 80,
  autoReconnect: false,
  autoReconnectDelaySeconds: 3,
  autoReconnectMaxAttempts: 3,
  defaultProviderType: 'local',
  defaultWorkingDirectory: '',
  disabledExtensionIds: [],
  logLevel: 'info',
  shortcutModifier: 'auto',
  shortcutBindings: defaultShortcutBindings(),
};

const fallbackProviders = [
  { type: 'local', nameKey: 'provider.local.name', name: 'Local Terminal', category: 'builtin' },
  { type: 'ssh', nameKey: 'provider.ssh.name', name: 'SSH', category: 'builtin' },
];

const officialExtensions = [
  { type: 'kubernetes', nameKey: 'extension.kubernetes' },
  { type: 'docker', nameKey: 'extension.docker' },
  { type: 'mysql', nameKey: 'extension.mysql' },
  { type: 'redis', nameKey: 'extension.redis' },
  { type: 'sftp', nameKey: 'extension.sftp' },
  { type: 'ftp', nameKey: 'extension.ftp' },
  { type: 's3', nameKey: 'extension.s3' },
];

const providerIcons = {
  local: <LaptopOutlined />,
  ssh: <CloudServerOutlined />,
  sftp: <FolderOpenOutlined />,
  ftp: <FolderOpenOutlined />,
  s3: <CloudServerOutlined />,
  mysql: <DatabaseOutlined />,
  redis: <DatabaseOutlined />,
  kubernetes: <ApiOutlined />,
  docker: <AppstoreAddOutlined />,
};

function providerLabel(provider) {
  return t(provider.nameKey, provider.name || provider.type);
}

function providerCapabilityLabel(capability) {
  return t(`provider.capability.${capability}`, capability);
}

function providerTypeLabel(type, providers = []) {
  const provider = providers.find((item) => item.type === type);
  return provider ? providerLabel(provider) : type;
}

function quickCommandProviderLabel(type, providers = []) {
  return !type || type === 'all' ? t('filter.allProviders') : providerTypeLabel(type, providers);
}

function localizedConnectionProfileSubtitle(profile) {
  return buildConnectionProfileSubtitle(profile, { defaultShellLabel: t('label.defaultShell') });
}

function App() {
  const screens = Grid.useBreakpoint();
  const compactConnectionDetail = screens.xxl !== true;
  const [messageApi, messageContextHolder] = message.useMessage();
  const [notificationApi, notificationContextHolder] = notification.useNotification();
  const [modalApi, modalContextHolder] = Modal.useModal();
  const [allProviders, setAllProviders] = useState(fallbackProviders);
  const [sessions, setSessions] = useState([]);
  const [sessionReconnects, setSessionReconnects] = useState({});
  const [sessionRecoveries, setSessionRecoveries] = useState({});
  const [closedSessions, setClosedSessions] = useState([]);
  const [profiles, setProfiles] = useState(() => loadProfiles());
  const [settings, setSettings] = useState(() => loadSettings());
  const [locale, setLocaleState] = useState(() => currentLocale());
  const [translationRevision, setTranslationRevision] = useState(0);
  const [terminalThemes, setTerminalThemes] = useState(['auto']);
  const [installedExtensions, setInstalledExtensions] = useState([]);
  const [extensionSources, setExtensionSources] = useState(() => loadExtensionSources());
  const [remoteExtensionCatalog, setRemoteExtensionCatalog] = useState([]);
  const [extensionSourceStates, setExtensionSourceStates] = useState({});
  const [tunnels, setTunnels] = useState([]);
  const [tunnelPresets, setTunnelPresets] = useState(() => loadTunnelPresets());
  const [editingTunnelPresetId, setEditingTunnelPresetId] = useState('');
  const [tunnelPresetQuery, setTunnelPresetQuery] = useState('');
  const [activeKey, setActiveKey] = useState('');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [terminalDrawerIntent, setTerminalDrawerIntent] = useState('session');
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [commandCenterOpen, setCommandCenterOpen] = useState(false);
  const [commandCenterTab, setCommandCenterTab] = useState('library');
  const [helpOpen, setHelpOpen] = useState(false);
  const [extensionSourceOpen, setExtensionSourceOpen] = useState(false);
  const [extensionSourceName, setExtensionSourceName] = useState('');
  const [extensionSourceUrl, setExtensionSourceUrl] = useState('');
  const [extensionQuery, setExtensionQuery] = useState('');
  const [extensionScope, setExtensionScope] = useState('all');
  const [sshConfigOpen, setSshConfigOpen] = useState(false);
  const [sshConfigContent, setSshConfigContent] = useState('');
  const [sshConfigLoading, setSshConfigLoading] = useState(false);
  const [connectionImportReview, setConnectionImportReview] = useState(null);
  const [connectionImportStrategy, setConnectionImportStrategy] = useState('skip');
  const [connectionImportApplying, setConnectionImportApplying] = useState(false);
  const [renameOpen, setRenameOpen] = useState(false);
  const [renamingSessionId, setRenamingSessionId] = useState('');
  const [renamingSessionName, setRenamingSessionName] = useState('');
  const [terminalSearch, setTerminalSearch] = useState('');
  const [terminalSearchPreferences, setTerminalSearchPreferences] = useState(defaultTerminalSearchPreferences);
  const [terminalSearchResults, setTerminalSearchResults] = useState({});
  const [sidebarSessionQuery, setSidebarSessionQuery] = useState('');
  const [sidebarSessionScope, setSidebarSessionScope] = useState('all');
  const [terminalStatuses, setTerminalStatuses] = useState({});
  const [sessionActivity, setSessionActivity] = useState({});
  const [focusMode, setFocusMode] = useState(false);
  const sidebarCompact = resolveSidebarCompact(settings.sidebarMode, screens.lg === false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [paletteRecentIds, setPaletteRecentIds] = useState(() => loadPaletteRecentIds());
  const [selectedNav, setSelectedNav] = useState('connections');
  const [settingsSection, setSettingsSection] = useState('interface');
  const [sessionView, setSessionView] = useState('tabs');
  const [sessionRecentIds, setSessionRecentIds] = useState([]);
  const [sessionSwitchState, setSessionSwitchState] = useState(emptySessionSwitchState);
  const [profileQuery, setProfileQuery] = useState('');
  const [groupQuery, setGroupQuery] = useState('all');
  const [providerFilter, setProviderFilter] = useState('all');
  const [tagFilter, setTagFilter] = useState('');
  const [connectionWorkspacePreferences, setConnectionWorkspacePreferences] = useState(
    () => loadConnectionWorkspacePreferences(),
  );
  const profileSort = connectionWorkspacePreferences.sortBy;
  const [selectedProfileId, setSelectedProfileId] = useState('');
  const [selectedProfileIds, setSelectedProfileIds] = useState([]);
  const [connectionDetailProfileId, setConnectionDetailProfileId] = useState('');
  const [connectionGroupEditor, setConnectionGroupEditor] = useState(null);
  const [connectionTagEditor, setConnectionTagEditor] = useState(null);
  const [connectionDragState, setConnectionDragState] = useState({ profileId: '', targetKey: '' });
  const [connectionLaunchKeys, setConnectionLaunchKeys] = useState([]);
  const [connectionHealth, setConnectionHealth] = useState({});
  const connectionSelectionAnchorRef = useRef('');
  const [auditQuery, setAuditQuery] = useState('');
  const [auditProviderFilter, setAuditProviderFilter] = useState('all');
  const [auditSessionFilter, setAuditSessionFilter] = useState('all');
  const [workspaceSummary, setWorkspaceSummary] = useState(() => loadWorkspaceSummary());
  const [workspaceHydrated, setWorkspaceHydrated] = useState(false);
  const [quickCommands, setQuickCommands] = useState(() => loadQuickCommands());
  const [commandHistory, setCommandHistory] = useState(() => loadCommandHistory(settings.commandHistoryLimit));
  const [commandQuery, setCommandQuery] = useState('');
  const [commandScope, setCommandScope] = useState('current');
  const [commandEditorOpen, setCommandEditorOpen] = useState(false);
  const [editingQuickCommandId, setEditingQuickCommandId] = useState('');
  const [historyQuery, setHistoryQuery] = useState('');
  const [historyScope, setHistoryScope] = useState('provider');
  const [broadcastOpen, setBroadcastOpen] = useState(false);
  const [broadcastCommand, setBroadcastCommand] = useState('');
  const [broadcastTargetIds, setBroadcastTargetIds] = useState([]);
  const [broadcastAppendEnter, setBroadcastAppendEnter] = useState(true);
  const [broadcastSending, setBroadcastSending] = useState(false);
  const [recentConnections, setRecentConnections] = useState(() => loadRecentConnections());
  const [auditRecords, setAuditRecords] = useState(() => loadAuditRecords());
  const [replayRecord, setReplayRecord] = useState(null);
  const [replayExpanded, setReplayExpanded] = useState(false);
  const [editingProfileId, setEditingProfileId] = useState('');
  const [newType, setNewType] = useState('local');
  const [fileEntries, setFileEntries] = useState([]);
  const [fileLoading, setFileLoading] = useState(false);
  const [fileQuery, setFileQuery] = useState('');
  const [fileSort, setFileSort] = useState('name');
  const [fileProviderType, setFileProviderType] = useState('');
  const [fileProfileId, setFileProfileId] = useState('');
  const [fileConnectionProfileId, setFileConnectionProfileId] = useState('');
  const [fileCredentialEditing, setFileCredentialEditing] = useState(false);
  const [testingConnection, setTestingConnection] = useState(false);
  const [connectionTestResult, setConnectionTestResult] = useState(null);
  const [creatingSession, setCreatingSession] = useState(false);
  const [extensionOfflineInstalling, setExtensionOfflineInstalling] = useState(false);
  const [extensionRefreshingAll, setExtensionRefreshingAll] = useState(false);
  const [extensionInstallingId, setExtensionInstallingId] = useState('');
  const [extensionUninstallingId, setExtensionUninstallingId] = useState('');
  const [tunnelBusy, setTunnelBusy] = useState(false);
  const [fileAuthType, setFileAuthType] = useState('password');
  const [tunnelAuthType, setTunnelAuthType] = useState('password');
  const [tunnelProfileId, setTunnelProfileId] = useState('');
  const [fileEditorOpen, setFileEditorOpen] = useState(false);
  const [fileEditorLoading, setFileEditorLoading] = useState(false);
  const [fileTransfer, setFileTransfer] = useState(null);
  const [editingRemoteFile, setEditingRemoteFile] = useState(null);
  const [editingRemoteContent, setEditingRemoteContent] = useState('');
  const [uploadOpen, setUploadOpen] = useState(false);
  const [uploadRemoteName, setUploadRemoteName] = useState('');
  const [uploadLocalContent, setUploadLocalContent] = useState('');
  const [mkdirOpen, setMkdirOpen] = useState(false);
  const [mkdirName, setMkdirName] = useState('');
  const [renamingRemoteEntry, setRenamingRemoteEntry] = useState(null);
  const [remoteRenameName, setRemoteRenameName] = useState('');
  const [sshAuthType, setSshAuthType] = useState('password');
  const [form] = Form.useForm();
  const [fileForm] = Form.useForm();
  const [tunnelForm] = Form.useForm();
  const [commandForm] = Form.useForm();
  const watchedFilePath = Form.useWatch('path', fileForm);
  const watchedJumpHost = Form.useWatch('jumpHost', form);
  const pasteConfirmationPending = useRef(false);
  const tunnelBusyRef = useRef(false);
  const fileTransferCleanupRef = useRef(null);
  const canceledTransferIdsRef = useRef(new Set());
  const extensionOperationBusy = extensionOfflineInstalling
    || Boolean(extensionInstallingId)
    || Boolean(extensionUninstallingId);

  const showOperationError = (titleKey, error, options = {}) => {
    const model = buildOperationError(error, { scope: options.scope });
    const key = `operation-error-${titleKey}`;
    notificationApi.error({
      key,
      message: t(titleKey),
      description: <OperationErrorDescription model={model} />,
      duration: model.retryable && options.retry ? 0 : 10,
      placement: 'bottomRight',
      btn: (
        <Space size={8}>
          <Button
            size="small"
            disabled={!model.detail}
            onClick={async () => {
              try {
                await writeClipboardText(model.detail);
                messageApi.success(t('message.copied'));
              } catch (clipboardError) {
                messageApi.error(`${t('message.clipboardFailed')}: ${clipboardError}`);
              }
            }}
          >
            {t('action.copyError')}
          </Button>
          {model.retryable && options.retry && (
            <Button
              type="primary"
              size="small"
              onClick={() => {
                notificationApi.destroy(key);
                options.retry();
              }}
            >
              {t('action.retry')}
            </Button>
          )}
        </Space>
      ),
    });
  };

  const requestDangerousAction = ({
    actionKey = 'action.delete',
    contentKey,
    contentValues = {},
    onConfirm,
    titleKey,
    titleValues = {},
  }) => {
    if (settings.confirmDangerousActions === false) return onConfirm();
    return modalApi.confirm({
      title: t(titleKey, titleValues),
      content: t(contentKey, contentValues),
      okButtonProps: { danger: true },
      okText: t(actionKey),
      cancelText: t('action.cancel'),
      onOk: onConfirm,
    });
  };

  useEffect(() => () => {
    fileTransferCleanupRef.current?.();
    fileTransferCleanupRef.current = null;
  }, []);
  const terminalRefs = useRef({});
  const broadcastSendingRef = useRef(false);
  const connectionLaunchKeysRef = useRef(connectionLaunchKeys);
  const connectionHealthRef = useRef(connectionHealth);
  const sessionReconnectsRef = useRef(sessionReconnects);
  const sessionRecoveriesRef = useRef(sessionRecoveries);
  const sessionRecoveryTimersRef = useRef({});
  const sessionSwitchStateRef = useRef(sessionSwitchState);
  const sessionSwitchOriginViewRef = useRef(selectedNav);
  const sessionsRef = useRef(sessions);
  const saveAuditRecordRef = useRef(null);
  const terminalSearchQueriesRef = useRef({});
  const terminalSearchRef = useRef(null);
  const fileSearchRef = useRef(null);
  const profileImportRef = useRef(null);
  const contentPageRef = useRef(null);
  const contentPageScrollPositionsRef = useRef(new Map());
  const previousContentPageRef = useRef(selectedNav);
  const draggedSessionIdRef = useRef('');
  const draggedProfileIdRef = useRef('');
  const workspaceHadSessionsRef = useRef(false);
  const workspaceRestoringRef = useRef(false);
  const workspaceStartupHandledRef = useRef(false);
  sessionsRef.current = sessions;
  const updateConnectionLaunchKeys = (keys) => {
    connectionLaunchKeysRef.current = keys;
    setConnectionLaunchKeys(keys);
  };
  const updateConnectionHealth = (updater) => {
    const next = typeof updater === 'function' ? updater(connectionHealthRef.current) : updater;
    connectionHealthRef.current = next;
    setConnectionHealth(next);
    return next;
  };
  const updateSessionReconnects = (updater) => {
    const next = typeof updater === 'function' ? updater(sessionReconnectsRef.current) : updater;
    sessionReconnectsRef.current = next;
    setSessionReconnects(next);
    return next;
  };
  const updateSessionRecoveries = (updater) => {
    const next = typeof updater === 'function' ? updater(sessionRecoveriesRef.current) : updater;
    sessionRecoveriesRef.current = next;
    setSessionRecoveries(next);
    return next;
  };
  const isSessionReconnecting = (sessionId) => Boolean(
    sessionId && Object.prototype.hasOwnProperty.call(sessionReconnects, sessionId)
  );
  const focusTerminalSession = (sessionId = activeKey) => {
    if (!sessionId) return;
    window.requestAnimationFrame(() => {
      terminalRefs.current[sessionId]?.focus?.();
    });
  };
  const activateSession = (sessionId) => {
    if (!sessionId) return;
    setActiveKey(sessionId);
    setSelectedNav('sessions');
    focusTerminalSession(sessionId);
  };
  const updateSessionSwitchState = (nextState) => {
    sessionSwitchStateRef.current = nextState;
    setSessionSwitchState(nextState);
  };
  const cancelSessionSwitch = () => {
    if (!sessionSwitchStateRef.current.open) return;
    updateSessionSwitchState(emptySessionSwitchState());
  };
  const stepSessionSwitch = (direction) => {
    const current = sessionSwitchStateRef.current;
    if (!current.open) sessionSwitchOriginViewRef.current = selectedNav;
    const next = current.open
      ? advanceSessionSwitch(current, direction)
      : startSessionSwitch({
        activeSessionId: activeKey,
        direction,
        recentSessionIds: sessionRecentIds,
        sessionIds: sessions.map((session) => session.id),
      });
    if (next.open) updateSessionSwitchState(next);
  };
  const completeSessionSwitch = (cancelled = false) => {
    const current = sessionSwitchStateRef.current;
    if (!current.open) return;
    const contextChanged = shouldCancelSessionSwitch(current, {
      activeSessionId: activeKey,
      currentView: selectedNav,
      originView: sessionSwitchOriginViewRef.current,
      sessionIds: sessions.map((session) => session.id),
    });
    const selectedId = resolveSessionSwitchSelection(current, {
      cancelled: cancelled || contextChanged,
    });
    updateSessionSwitchState(emptySessionSwitchState());
    if (selectedId) activateSession(selectedId);
  };
  const closeTerminalSearch = () => {
    setTerminalSearch('');
    delete terminalSearchQueriesRef.current[activeKey];
    setTerminalSearchResults((current) => ({
      ...current,
      [activeKey]: emptyTerminalSearchResult,
    }));
    terminalRefs.current[activeKey]?.clearSearch?.();
    focusTerminalSession(activeKey);
  };
  const updateTerminalSearchResult = (sessionId, result) => {
    const requestKey = terminalSearchRequestKey(terminalSearch, terminalSearchPreferences);
    if (!sessionId || terminalSearchQueriesRef.current[sessionId] !== requestKey) return;
    setTerminalSearchResults((current) => ({
      ...current,
      [sessionId]: normalizeTerminalSearchResult(result, terminalSearch),
    }));
  };
  const updateTerminalSearchQuery = (query) => {
    const requestChanged = terminalSearchRequestKey(terminalSearch, terminalSearchPreferences)
      !== terminalSearchRequestKey(query, terminalSearchPreferences);
    setTerminalSearch(query);
    if (!requestChanged) return;
    delete terminalSearchQueriesRef.current[activeKey];
    setTerminalSearchResults((current) => ({
      ...current,
      [activeKey]: emptyTerminalSearchResult,
    }));
  };
  const updateTerminalSearchPreferences = (preferences) => {
    const nextPreferences = normalizeTerminalSearchPreferences(preferences);
    const requestChanged = terminalSearchRequestKey(terminalSearch, terminalSearchPreferences)
      !== terminalSearchRequestKey(terminalSearch, nextPreferences);
    setTerminalSearchPreferences(nextPreferences);
    if (!requestChanged) return;
    delete terminalSearchQueriesRef.current[activeKey];
    setTerminalSearchResults((current) => ({
      ...current,
      [activeKey]: emptyTerminalSearchResult,
    }));
  };
  const activeSession = sessions.find((session) => session.id === activeKey);
  const activeTerminalStatus = terminalStatuses[activeKey] || {};
  const activeTerminalSearchRequestKey = terminalSearchRequestKey(terminalSearch, terminalSearchPreferences);
  const activeTerminalSearchResult = terminalSearchQueriesRef.current[activeKey] === activeTerminalSearchRequestKey
    ? terminalSearchResults[activeKey] || emptyTerminalSearchResult
    : emptyTerminalSearchResult;
  const visibleSessionIds = useMemo(() => {
    if (selectedNav !== 'sessions') return [];
    if (sessionView === 'grid') return sessions.map((session) => session.id);
    return activeKey ? [activeKey] : [];
  }, [activeKey, selectedNav, sessionView, sessions]);
  const sessionAttentionSummary = useMemo(
    () => buildSessionAttentionSummary(sessionActivity),
    [sessionActivity],
  );
  const unreadSessionCount = sessionAttentionSummary.total;
  const sessionDisplayLabels = useMemo(() => buildSessionDisplayLabels(sessions), [sessions]);
  const sessionAccents = useMemo(() => Object.fromEntries(
    sessions.map((session) => [session.id, resolveSessionAccent(session, profiles)]),
  ), [profiles, sessions]);
  const broadcastTargets = useMemo(() => buildBroadcastSessionTargets(sessions, {
    activeKey,
    displayLabels: sessionDisplayLabels,
    terminalStatuses,
  }), [activeKey, sessionDisplayLabels, sessions, terminalStatuses]);
  const broadcastReadyIds = useMemo(
    () => broadcastTargets.map((target) => target.id),
    [broadcastTargets],
  );
  const broadcastReadySignature = broadcastReadyIds.join('\u0000');
  const broadcastPlan = useMemo(() => buildBroadcastCommandPlan({
    appendEnter: broadcastAppendEnter,
    command: broadcastCommand,
    readySessionIds: broadcastReadyIds,
    targetIds: broadcastTargetIds,
  }), [broadcastAppendEnter, broadcastCommand, broadcastReadySignature, broadcastTargetIds]);
  const sessionClosePlans = useMemo(() => ({
    all: buildSessionClosePlan(sessions),
    closed: buildSessionClosePlan(sessions, { mode: 'closed' }),
    others: buildSessionClosePlan(sessions, { keepSessionId: activeKey, mode: 'others' }),
  }), [activeKey, sessions]);

  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  useEffect(() => {
    const sessionIds = sessions.map((session) => session.id);
    setSessionRecentIds((current) => recordSessionVisit(current, activeKey, sessionIds));
    if (shouldCancelSessionSwitch(sessionSwitchStateRef.current, {
      activeSessionId: activeKey,
      currentView: selectedNav,
      originView: sessionSwitchOriginViewRef.current,
      sessionIds,
    })) {
      cancelSessionSwitch();
    }
  }, [activeKey, selectedNav, sessions]);

  useEffect(() => {
    if (!broadcastOpen) return;
    const readyIds = new Set(broadcastReadyIds);
    setBroadcastTargetIds((current) => current.filter((sessionId) => readyIds.has(sessionId)));
  }, [broadcastOpen, broadcastReadySignature]);

  useEffect(() => {
    Promise.resolve()
      .then(() => SessionAPI.ListProviders())
      .then((loadedProviders) => {
        if (Array.isArray(loadedProviders) && loadedProviders.length > 0) {
          setAllProviders(loadedProviders);
          setNewType(loadedProviders[0].type);
        }
      })
      .catch(() => {
        setAllProviders(fallbackProviders);
      });
  }, []);

  useEffect(() => {
    Promise.resolve()
      .then(() => ExtensionsAPI.ListInstalled())
      .then((items) => setInstalledExtensions(Array.isArray(items) ? items : []))
      .catch(() => setInstalledExtensions([]));
  }, []);

  useEffect(() => {
    if (selectedNav !== 'tunnels') return undefined;
    let active = true;
    const syncTunnels = () => Promise.resolve()
      .then(() => TunnelAPI.List())
      .then((items) => {
        if (!active) return;
        setTunnels((current) => (Array.isArray(items) ? items : []).map((item) => ({
          ...item,
          presetId: current.find((existing) => existing.id === item.id)?.presetId || '',
        })));
      })
      .catch(() => {});
    syncTunnels();
    const interval = window.setInterval(syncTunnels, 5000);
    return () => {
      active = false;
      window.clearInterval(interval);
    };
  }, [selectedNav]);

  useEffect(() => {
    let active = true;
    const fallbackLocale = 'en-US';
    const fallbackRequest = locale === fallbackLocale
      ? Promise.resolve(null)
      : ExtensionsAPI.LoadLocaleMessages(fallbackLocale);
    Promise.all([
      ExtensionsAPI.LoadLocaleMessages(locale),
      fallbackRequest,
    ])
      .then(([messages, fallbackMessages]) => {
        if (!active) return;
        replaceExtensionMessages(locale, messages);
        if (fallbackMessages !== null) {
          replaceExtensionMessages(fallbackLocale, fallbackMessages);
        }
        setTranslationRevision((revision) => revision + 1);
      })
      .catch(() => {
        if (!active) return;
        replaceExtensionMessages(locale, {});
        replaceExtensionMessages(fallbackLocale, {});
        setTranslationRevision((revision) => revision + 1);
      });
    return () => {
      active = false;
    };
  }, [installedExtensions, locale]);

  useEffect(() => {
    Promise.resolve()
      .then(() => ThemeAPI.GetAllThemes())
      .then((themes) => {
        const names = Array.isArray(themes) ? themes : [];
        setTerminalThemes(['auto', ...names]);
      })
      .catch(() => setTerminalThemes(['auto']));
  }, []);

  useEffect(() => {
    const resolvedTheme = resolveAppTheme(settings.appTheme);
    persistSettings(settings);
    document.documentElement.dataset.appTheme = resolvedTheme;
    document.documentElement.style.colorScheme = resolvedTheme;
    document.documentElement.dataset.density = settings.interfaceDensity || defaultSettings.interfaceDensity;
    syncDesktopWindowTheme(settings.appTheme);
  }, [settings]);

  useEffect(() => {
    if (workspaceStartupHandledRef.current) return;
    workspaceStartupHandledRef.current = true;
    const hydrateWorkspace = async () => {
      try {
        if (settings.autoRestoreWorkspace) await restoreWorkspace({ silent: true });
      } finally {
        setWorkspaceHydrated(true);
      }
    };
    hydrateWorkspace();
  }, []);

  useEffect(() => {
    if (sessions.length > 0) workspaceHadSessionsRef.current = true;
  }, [sessions.length]);

  useEffect(() => {
    if (!workspaceHydrated || !settings.autoSaveWorkspace) return;
    if (sessions.length === 0) {
      if (!workspaceHadSessionsRef.current) return;
      if (!clearPersistedWorkspaceSnapshot()) return;
      workspaceHadSessionsRef.current = false;
      setWorkspaceSummary(loadWorkspaceSummary());
      return;
    }
    persistWorkspaceSnapshot(buildWorkspaceSnapshot(sessions, activeKey, sessionView));
    setWorkspaceSummary(loadWorkspaceSummary());
  }, [activeKey, sessionView, sessions, settings.autoSaveWorkspace, workspaceHydrated]);

  useLayoutEffect(() => {
    const layer = contentPageRef.current;
    const previousPage = previousContentPageRef.current;
    if (!layer || previousPage === selectedNav) return;
    if (previousPage !== 'sessions') {
      contentPageScrollPositionsRef.current.set(previousPage, layer.scrollTop);
    }
    layer.scrollTop = selectedNav === 'sessions'
      ? 0
      : contentPageScrollPositionsRef.current.get(selectedNav) || 0;
    previousContentPageRef.current = selectedNav;
  }, [selectedNav]);

  useEffect(() => {
    const handleKeydown = (event) => {
      if (event.key === 'Escape' && sessionSwitchStateRef.current.open) {
        consumeSessionSwitchEvent(event);
        cancelSessionSwitch();
        return;
      }
      if (event.key === '?' && !isEditableTarget(event.target)) {
        event.preventDefault();
        setHelpOpen(true);
        return;
      }
      if (isEditableTarget(event.target) && !isTerminalInputTarget(event.target)) return;
      const configurableShortcutAction = resolveConfigurableShortcutAction(event, settings);
      if (configurableShortcutAction === 'newTerminal') {
        event.preventDefault();
        launchDefaultTerminal();
        return;
      }
      if (configurableShortcutAction === 'quickCommands') {
        event.preventDefault();
        openCommandCenter('library');
        return;
      }
      if (configurableShortcutAction === 'commandPalette') {
        event.preventDefault();
        setPaletteOpen(true);
        return;
      }
      if (configurableShortcutAction === 'toggleSidebar') {
        event.preventDefault();
        setSettings((current) => ({
          ...current,
          sidebarMode: sidebarCompact ? 'expanded' : 'compact',
        }));
        return;
      }
      if (configurableShortcutAction === 'closeSession') {
        event.preventDefault();
        if (activeKey && selectedNav === 'sessions') confirmRemoveSession(activeKey);
        return;
      }
      if (configurableShortcutAction === 'search') {
        event.preventDefault();
        if (activeKey && selectedNav === 'sessions') {
          terminalSearchRef.current?.focus();
          terminalSearchRef.current?.select?.();
        }
        if (selectedNav === 'files') fileSearchRef.current?.focus();
        return;
      }
      if (configurableShortcutAction === 'reconnect') {
        event.preventDefault();
        if (activeKey) reconnectSession();
        return;
      }
      const tabSessionAction = resolveTabSessionAction(event);
      if (tabSessionAction && sessions.length > 1) {
        consumeSessionSwitchEvent(event);
        stepSessionSwitch(tabSessionAction);
        return;
      }
      const commandKey = isCommandShortcut(event, settings);
      if (!commandKey) return;
      const key = event.key.toLowerCase();
      if (key === 't' && event.shiftKey) {
        event.preventDefault();
        restoreLastClosedSession();
      }
      const numberedSessionIndex = resolveNumberedSessionIndex(key, sessions.length);
      if (numberedSessionIndex >= 0) {
        const nextSession = sessions[numberedSessionIndex];
        if (nextSession) {
          event.preventDefault();
          activateSession(nextSession.id);
        }
      }
      const relativeSessionAction = resolveBracketSessionAction(event);
      if (relativeSessionAction && sessions.length > 0) {
        const sessionIds = sessions.map((session) => session.id);
        const nextIndex = resolveRelativeSessionIndex(sessionIds, activeKey, relativeSessionAction);
        const nextSession = sessions[nextIndex];
        if (nextSession) {
          event.preventDefault();
          activateSession(nextSession.id);
        }
      }
      if (key === 'f' && event.shiftKey && sessions.length > 0) {
        event.preventDefault();
        setFocusMode((current) => !current);
      }
      if (key === 'c' && event.shiftKey && activeKey) {
        event.preventDefault();
        copyTerminalSelection();
      }
      if (key === 'v' && event.shiftKey && activeKey) {
        event.preventDefault();
        pasteClipboardToTerminal();
      }
      if (key === 'l' && activeKey) {
        event.preventDefault();
        clearActiveTerminal();
      }
      if (key === '=' || key === '+') {
        event.preventDefault();
        zoomTerminalFont(1);
      }
      if (key === '-') {
        event.preventDefault();
        zoomTerminalFont(-1);
      }
      if (key === '0') {
        event.preventDefault();
        resetTerminalFont();
      }
    };
    const handleKeyup = (event) => {
      if (
        sessionSwitchStateRef.current.open
        && (event.key === 'Control' || event.code === 'ControlLeft' || event.code === 'ControlRight')
      ) {
        consumeSessionSwitchEvent(event);
        completeSessionSwitch(false);
      }
    };
    const handleBlur = () => cancelSessionSwitch();
    window.addEventListener('keydown', handleKeydown, true);
    window.addEventListener('keyup', handleKeyup, true);
    window.addEventListener('blur', handleBlur);
    return () => {
      window.removeEventListener('keydown', handleKeydown, true);
      window.removeEventListener('keyup', handleKeyup, true);
      window.removeEventListener('blur', handleBlur);
    };
  }, [
    activeKey,
    allProviders,
    closedSessions,
    installedExtensions,
    selectedNav,
    sessionRecentIds,
    sessions,
    settings.confirmDangerousActions,
    settings.defaultProviderType,
    settings.defaultWorkingDirectory,
    settings.disabledExtensionIds,
    settings.shortcutBindings,
    settings.shortcutModifier,
    sidebarCompact,
  ]);

  useEffect(() => {
    if (!activeKey || selectedNav !== 'sessions') return undefined;
    const frame = window.requestAnimationFrame(() => {
      terminalRefs.current[activeKey]?.fit?.();
      terminalRefs.current[activeKey]?.focus?.();
    });
    return () => window.cancelAnimationFrame(frame);
  }, [activeKey, focusMode, selectedNav, sessionView]);

  useEffect(() => {
    if (!activeKey || selectedNav !== 'sessions') return undefined;
    const keyword = terminalSearch.trim();
    const validation = validateTerminalSearchQuery(keyword, terminalSearchPreferences);
    if (validation === 'empty') {
      const hadSearch = Boolean(terminalSearchQueriesRef.current[activeKey]);
      delete terminalSearchQueriesRef.current[activeKey];
      if (hadSearch) terminalRefs.current[activeKey]?.clearSearch?.();
      return undefined;
    }
    const requestKey = terminalSearchRequestKey(terminalSearch, terminalSearchPreferences);
    if (terminalSearchQueriesRef.current[activeKey] === requestKey) return undefined;
    if (validation === 'invalid') {
      delete terminalSearchQueriesRef.current[activeKey];
      terminalRefs.current[activeKey]?.clearSearch?.();
      terminalSearchQueriesRef.current[activeKey] = requestKey;
      setTerminalSearchResults((current) => ({
        ...current,
        [activeKey]: invalidTerminalSearchResult,
      }));
      return undefined;
    }
    const frame = window.requestAnimationFrame(() => {
      terminalSearchQueriesRef.current[activeKey] = requestKey;
      const searchResult = terminalRefs.current[activeKey]?.findNext?.(keyword, {
        ...terminalSearchPreferences,
        incremental: true,
      });
      if (searchResult === undefined) delete terminalSearchQueriesRef.current[activeKey];
    });
    return () => window.cancelAnimationFrame(frame);
  }, [activeKey, activeTerminalStatus.status, selectedNav, terminalSearch, terminalSearchPreferences]);

  useEffect(() => {
    setSessionActivity((current) => visibleSessionIds.reduce(
      (next, sessionId) => markSessionActivityRead(next, sessionId),
      current,
    ));
  }, [visibleSessionIds]);

  useEffect(() => {
    setSessionActivity((current) => sessions.reduce((next, session) => {
      const terminalStatus = terminalStatuses[session.id];
      if (terminalStatus?.status === 'error') {
        return recordSessionAttention(next, {
          kind: 'error',
          occurredAt: terminalStatus.updatedAt,
          sessionId: session.id,
          visibleSessionIds,
        });
      }
      if (terminalStatus?.status === 'idle') {
        return recordSessionCommandResult(next, {
          exitCode: terminalStatus.exitCode,
          occurredAt: terminalStatus.updatedAt,
          sessionId: session.id,
          visibleSessionIds,
        });
      }
      return next;
    }, current));
  }, [sessions, terminalStatuses, visibleSessionIds]);

  useEffect(() => {
    setSessionActivity((current) => pruneSessionActivity(current, sessions.map((session) => session.id)));
  }, [sessions]);

  useEffect(() => {
    const sessionIds = sessions.map((session) => session.id);
    const idSet = new Set(sessionIds);
    Object.keys(sessionRecoveryTimersRef.current).forEach((sessionId) => {
      if (idSet.has(sessionId)) return;
      window.clearTimeout(sessionRecoveryTimersRef.current[sessionId]);
      delete sessionRecoveryTimersRef.current[sessionId];
    });
    const next = pruneSessionRecoveries(sessionRecoveriesRef.current, sessionIds);
    if (Object.keys(next).length !== Object.keys(sessionRecoveriesRef.current).length) {
      updateSessionRecoveries(next);
    }
  }, [sessions]);

  const providers = useMemo(() => filterProvidersByDisabledExtensions(
    allProviders,
    installedExtensions,
    settings.disabledExtensionIds,
  ), [allProviders, installedExtensions, settings.disabledExtensionIds]);
  const sessionIdentityDisplays = useMemo(() => Object.fromEntries(
    sessions.map((session) => [session.id, buildSessionIdentityDisplay(session, {
      displayName: sessionDisplayLabels[session.id],
      providerName: providerTypeLabel(session.providerType, allProviders),
      statusName: t(`session.status.${sessionStatusLabel(session)}`),
    })]),
  ), [allProviders, locale, sessionDisplayLabels, sessions, translationRevision]);
  const sessionSwitcherItems = sessionSwitchState.orderedIds.map((sessionId) => {
    const session = sessions.find((item) => item.id === sessionId);
    if (!session) return null;
    const status = normalizeTerminalStatus(terminalStatuses[sessionId]?.status || session.status);
    const identityDisplay = sessionIdentityDisplays[sessionId] || {};
    return {
      accent: sessionAccents[sessionId],
      activityKind: sessionActivity[sessionId]?.kind,
      activityLabel: sessionActivity[sessionId]?.kind === 'error'
        ? t('session.activity.error')
        : t('session.activity.unread'),
      detail: identityDisplay.identity || identityDisplay.provider,
      displayName: identityDisplay.displayName || sessionDisplayLabels[sessionId] || session.label,
      icon: providerIcons[session.providerType] || <CodeOutlined />,
      id: sessionId,
      providerName: providerTypeLabel(session.providerType, allProviders),
      statusLabel: t(`terminal.runStatus.${status}`),
      statusTone: terminalStatusTone(status),
      unread: sessionActivity[sessionId]?.unread,
    };
  }).filter(Boolean);
  const desktopWindowTitle = useMemo(() => {
    const appName = t('app.title');
    if (selectedNav !== 'sessions') {
      return buildDesktopWindowTitle(null, { appName, unreadCount: unreadSessionCount });
    }
    return buildDesktopWindowTitle(activeSession, {
      appName,
      displayName: sessionDisplayLabels[activeSession.id],
      providerName: activeSession
        ? providerTypeLabel(activeSession.providerType, allProviders)
        : '',
      unreadCount: unreadSessionCount,
    });
  }, [activeSession, allProviders, locale, selectedNav, sessionDisplayLabels, translationRevision, unreadSessionCount]);

  useEffect(() => {
    syncDesktopWindowTitle(desktopWindowTitle);
  }, [desktopWindowTitle]);

  const providerOptions = useMemo(() => providers.map((provider) => ({
    value: provider.type,
    label: (
      <span className="provider-option">
        {providerIcons[provider.type] || <CodeOutlined />}
        {providerLabel(provider)}
      </span>
    ),
  })), [providers, locale, translationRevision]);
  const quickCommandProviderOptions = useMemo(() => [
    { value: 'all', label: t('filter.allProviders') },
    ...providers.map((provider) => ({
      value: provider.type,
      label: providerTypeLabel(provider.type, providers),
    })),
  ], [providers, locale, translationRevision]);
  const shortcutModifier = normalizeShortcutModifier(settings.shortcutModifier);
  const shortcutLabel = shortcutModifierLabel(shortcutModifier);
  const shortcutEditorRows = useMemo(
    () => buildShortcutEditorRows({
      shortcutBindings: settings.shortcutBindings,
      shortcutModifier,
    }),
    [settings.shortcutBindings, shortcutModifier],
  );
  const shortcutKeyOptions = useMemo(
    () => buildShortcutKeyOptions({ shortcutModifier }),
    [shortcutModifier],
  );
  const shortcutGroups = useMemo(
    () => buildShortcutGroups({
      shortcutBindings: settings.shortcutBindings,
      shortcutModifier,
    }),
    [settings.shortcutBindings, shortcutModifier],
  );
  const commandPaletteShortcut = shortcutEditorRows
    .find((row) => row.action === 'commandPalette')?.shortcut || `${shortcutLabel} + P`;
  const numberedSessionShortcut = `${shortcutLabel} + 1..9`;

  const fileProviders = useMemo(() => (
    buildEnabledFileProviders(installedExtensions, settings.disabledExtensionIds)
  ), [installedExtensions, settings.disabledExtensionIds]);
  const connectionProviders = useMemo(() => [
    ...providers,
    ...fileProviders
      .filter((provider) => !providers.some((item) => item.type === provider.type))
      .map((provider) => ({
        ...provider,
        category: 'file-extension',
        name: provider.extensionName || provider.type,
      })),
  ], [fileProviders, providers]);
  const selectedProvider = providers.find((item) => item.type === newType) || providers[0] || fallbackProviders[0];
  const selectedProviderSummary = buildTerminalProviderSummary(selectedProvider);
  const profileSessionSummary = useMemo(() => summarizeProfileSessions(profiles, sessions), [profiles, sessions]);
  const visibleProfiles = useMemo(
    () => sortConnectionProfiles(filterConnectionProfiles(profiles, {
      group: groupQuery,
      providerType: providerFilter,
      query: profileQuery,
      tag: tagFilter,
    }), profileSort),
    [profiles, profileQuery, groupQuery, providerFilter, profileSort, tagFilter],
  );
  const visibleProfileIds = useMemo(
    () => visibleProfiles.map((profile) => profile.id),
    [visibleProfiles],
  );
  const selectedConnectionProfiles = useMemo(() => {
    const ids = new Set(selectedProfileIds);
    return profiles.filter((profile) => ids.has(profile.id));
  }, [profiles, selectedProfileIds]);
  const selectedConnectionTags = useMemo(
    () => collectConnectionTags(selectedConnectionProfiles),
    [selectedConnectionProfiles],
  );
  const connectionSelectionState = useMemo(() => buildConnectionSelectionActionState(
    profiles,
    selectedProfileIds,
    { availableProviders: connectionProviders },
  ), [connectionProviders, profiles, selectedProfileIds]);
  const selectedConnectionProbePlan = useMemo(() => buildConnectionProbePlan(
    profiles,
    selectedProfileIds,
    connectionProviders,
    connectionHealth,
  ), [connectionHealth, connectionProviders, profiles, selectedProfileIds]);
  const selectedConnectionProbeCheckingCount = selectedProfileIds.filter((profileId) => (
    connectionHealth[profileId]?.status === 'checking'
  )).length;
  const visibleSelectedProfileCount = useMemo(() => {
    const ids = new Set(selectedProfileIds);
    return visibleProfileIds.filter((id) => ids.has(id)).length;
  }, [selectedProfileIds, visibleProfileIds]);
  const explicitlySelectedProfile = visibleProfiles.find((profile) => profile.id === selectedProfileId) || null;
  const selectedProfile = explicitlySelectedProfile || (compactConnectionDetail ? null : visibleProfiles[0] || null);
  const showInlineConnectionDetail = Boolean(
    selectedProfile && !compactConnectionDetail && connectionWorkspacePreferences.showDetails,
  );
  const connectionDetailProfile = visibleProfiles.find((profile) => profile.id === connectionDetailProfileId) || null;
  const hasProfileFilters = profileQuery.trim()
    || groupQuery !== 'all'
    || providerFilter !== 'all'
    || tagFilter;
  const connectionEmptyState = useMemo(() => buildConnectionEmptyState({
    profileCount: profiles.length,
    visibleCount: visibleProfiles.length,
    hasFilters: !!hasProfileFilters,
  }), [hasProfileFilters, profiles.length, visibleProfiles.length]);
  const sidebarQuickProfiles = useMemo(
    () => sortSidebarProfiles(profiles, 5, { availableProviders: connectionProviders }),
    [connectionProviders, profiles],
  );
  const visibleRecentConnections = useMemo(
    () => filterRecentConnectionsByProviders(recentConnections, providers, profiles),
    [recentConnections, profiles, providers],
  );

  useEffect(() => {
    const nextSelectedProfileId = resolveSelectedProfileId(visibleProfiles, selectedProfileId, {
      fallbackToFirst: !compactConnectionDetail,
    });
    if (nextSelectedProfileId !== selectedProfileId) {
      setSelectedProfileId(nextSelectedProfileId);
    }
  }, [compactConnectionDetail, selectedProfileId, visibleProfiles]);

  useEffect(() => {
    setSelectedProfileIds((current) => {
      const next = reconcileConnectionProfileSelection(current, visibleProfileIds);
      return next.length === current.length && next.every((id, index) => id === current[index])
        ? current
        : next;
    });
    if (!visibleProfileIds.includes(connectionSelectionAnchorRef.current)) {
      connectionSelectionAnchorRef.current = '';
    }
  }, [visibleProfileIds]);

  useEffect(() => {
    updateConnectionHealth((current) => reconcileConnectionHealth(
      current,
      profiles.map((profile) => profile.id),
    ));
  }, [profiles]);

  useEffect(() => {
    if (!compactConnectionDetail || selectedNav !== 'connections' || !connectionDetailProfile) {
      setConnectionDetailProfileId('');
    }
  }, [compactConnectionDetail, connectionDetailProfile, selectedNav]);

  const moveSelectedProfile = (action) => {
    const currentIndex = visibleProfiles.findIndex((profile) => profile.id === selectedProfile?.id);
    const nextIndex = resolveListIndex(visibleProfiles.length, currentIndex, action);
    const nextProfile = visibleProfiles[nextIndex];
    if (nextProfile) setSelectedProfileId(nextProfile.id);
  };

  const clearConnectionProfileSelection = () => {
    connectionSelectionAnchorRef.current = '';
    setSelectedProfileIds([]);
  };

  const toggleConnectionProfileSelection = (profileId, { range = false } = {}) => {
    setSelectedProfileIds((current) => {
      const result = resolveConnectionProfileSelection(current, profileId, visibleProfileIds, {
        anchorId: connectionSelectionAnchorRef.current,
        range,
      });
      connectionSelectionAnchorRef.current = result.anchorId;
      return result.selectedIds;
    });
  };

  const toggleVisibleConnectionProfiles = (selected) => {
    setSelectedProfileIds((current) => (
      setVisibleConnectionProfileSelection(current, visibleProfileIds, selected)
    ));
    connectionSelectionAnchorRef.current = selected ? visibleProfileIds[0] || '' : '';
  };

  const handleConnectionListKeyDown = (event) => {
    if (isInteractiveControl(event.target)) return;
    if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'a') {
      event.preventDefault();
      toggleVisibleConnectionProfiles(true);
      return;
    }
    if (event.key === 'Escape' && selectedProfileIds.length > 0) {
      event.preventDefault();
      clearConnectionProfileSelection();
      return;
    }
    if (event.key === ' ' && selectedProfile) {
      event.preventDefault();
      toggleConnectionProfileSelection(selectedProfile.id, { range: event.shiftKey });
      return;
    }
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      moveSelectedProfile('next');
    }
    if (event.key === 'ArrowUp') {
      event.preventDefault();
      moveSelectedProfile('previous');
    }
    if (event.key === 'Home') {
      event.preventDefault();
      moveSelectedProfile('first');
    }
    if (event.key === 'End') {
      event.preventDefault();
      moveSelectedProfile('last');
    }
    if (event.key === 'Enter' && selectedProfile) {
      event.preventDefault();
      if (event.shiftKey) runConnectionProfileNewAction(selectedProfile);
      else runConnectionProfilePrimaryAction(selectedProfile);
    }
  };

  const connectionGroupNav = useMemo(() => buildConnectionGroupNav(profiles), [profiles]);
  const connectionGroupNames = useMemo(() => buildConnectionGroups(profiles)
    .map((group) => group.key)
    .filter((group) => group !== ungroupedKey), [profiles]);
  const connectionTags = useMemo(() => collectConnectionTags(profiles), [profiles]);
  useEffect(() => {
    if (tagFilter && !connectionTags.includes(tagFilter)) setTagFilter('');
  }, [connectionTags, tagFilter]);
  const resolvedGroupQuery = resolveConnectionGroupFilter(groupQuery);
  const activeConnectionGroup = connectionGroupNav.find((item) => item.key === groupQuery) || {
    ...resolvedGroupQuery,
    groupKey: resolvedGroupQuery.group,
    key: groupQuery,
  };
  const connectionGroupCreateTarget = activeConnectionGroup.type === 'group'
    && activeConnectionGroup.groupKey !== ungroupedKey
    ? activeConnectionGroup.groupKey
    : '';

  useEffect(() => {
    if (connectionGroupNav.some((item) => item.key === groupQuery)) return;
    setGroupQuery('all');
  }, [connectionGroupNav, groupQuery]);

  const workspaceInsights = useMemo(() => summarizeWorkspace({
    auditRecords,
    installedExtensions,
    profiles,
    providers: connectionProviders,
    recentConnections,
    sessions,
    tunnels,
  }), [auditRecords, connectionProviders, installedExtensions, profiles, recentConnections, sessions, tunnels]);
  const extensionCatalog = useMemo(() => {
    const discoveredExtensions = remoteExtensionCatalog.flatMap((item) => [
      ...(item.manifest?.providers || []),
      ...(item.manifest?.fileProviders || []),
    ].map((provider) => ({
      type: provider.type,
      name: item.manifest?.name || provider.type,
    })));
    const knownTypes = new Set(officialExtensions.map((extension) => extension.type));
    return buildExtensionCatalog({
      installedExtensions,
      officialExtensions: [
        ...officialExtensions,
        ...discoveredExtensions.filter((extension) => extension.type && !knownTypes.has(extension.type)),
      ],
      providers,
    });
  }, [installedExtensions, providers, remoteExtensionCatalog]);
  const extensionSummary = useMemo(() => (
    buildExtensionSummary({
      disabledExtensionIds: settings.disabledExtensionIds,
      installedExtensions,
      providers,
    })
  ), [installedExtensions, providers, settings.disabledExtensionIds]);
  const installedExtensionRows = useMemo(() => (
    buildInstalledExtensionRows(installedExtensions, settings.disabledExtensionIds).map((extension) => ({
      ...extension,
      updateItem: findExtensionUpdate(extension, remoteExtensionCatalog),
    }))
  ), [installedExtensions, remoteExtensionCatalog, settings.disabledExtensionIds]);
  const extensionUsageById = useMemo(() => Object.fromEntries(
    installedExtensionRows.map((extension) => [
      extension.id,
      buildExtensionUsageImpact(extension, { profiles, sessions }),
    ]),
  ), [installedExtensionRows, profiles, sessions]);
  const visibleExtensionWorkspace = useMemo(() => filterExtensionWorkspace({
    catalog: extensionCatalog,
    installed: installedExtensionRows,
    sources: extensionSources.map((source) => ({
      ...source,
      status: extensionSourceStates[source.id]?.status || 'idle',
    })),
  }, {
    query: extensionQuery,
    scope: extensionScope,
  }), [
    extensionCatalog,
    extensionQuery,
    extensionScope,
    extensionSourceStates,
    extensionSources,
    installedExtensionRows,
  ]);
  const selectedFileProvider = fileProviders.find((provider) => provider.type === fileProviderType)
    || fileProviders[0]
    || null;
  const fileConnectionProfiles = useMemo(() => profiles.filter((profile) => (
    profile.kind === 'file' && profile.providerType === selectedFileProvider?.type
  )), [profiles, selectedFileProvider?.type]);
  const selectedFileConnectionProfile = fileConnectionProfiles.find((profile) => (
    profile.id === fileConnectionProfileId
  )) || null;

  useEffect(() => {
    const nextType = selectedFileProvider?.type || '';
    if (nextType !== fileProviderType) {
      setFileProviderType(nextType);
      setFileEntries([]);
      setFileQuery('');
    }
  }, [fileProviderType, selectedFileProvider?.type]);

  useEffect(() => {
    const nextProvider = selectedFileProvider;
    if (!nextProvider) return;
    const savedProfile = selectedFileConnectionProfile?.providerType === nextProvider.type
      ? selectedFileConnectionProfile
      : null;
    const values = nextProvider.protocol === 'sftp'
      ? { config: {}, auth: {} }
      : savedProfile
        ? buildFileConnectionFormValues(nextProvider, savedProfile)
        : {
          accent: 'none',
          ...buildFileProviderFormValues(nextProvider),
          displayName: '',
          group: '',
          tags: [],
          path: '.',
          rememberCredential: false,
        };
    fileForm.setFieldValue('auth', {});
    fileForm.setFieldsValue(values);
    setFileCredentialEditing(false);
    if (fileConnectionProfileId && !savedProfile) setFileConnectionProfileId('');
  }, [fileConnectionProfileId, fileForm, selectedFileConnectionProfile, selectedFileProvider?.type]);
  const auditProviderOptions = useMemo(() => [
    { value: 'all', label: t('filter.allProviders') },
    ...Array.from(new Set(auditRecords.map((record) => record.providerType || 'terminal')))
      .map((type) => ({ value: type, label: type })),
  ], [auditRecords, locale, translationRevision]);
  const auditSessionOptions = useMemo(() => {
    const labelsById = new Map();
    sessions.forEach((session) => {
      labelsById.set(session.id, sessionDisplayLabels[session.id] || session.label || session.id);
    });
    auditRecords.forEach((record) => {
      if (record.sessionId && !labelsById.has(record.sessionId)) {
        labelsById.set(
          record.sessionId,
          [record.title || record.sessionId, record.providerType].filter(Boolean).join(' · '),
        );
      }
    });
    return [
      { value: 'all', label: t('filter.allSessions') },
      ...[...labelsById].map(([value, label]) => ({ value, label })),
    ];
  }, [auditRecords, locale, sessionDisplayLabels, sessions, translationRevision]);
  const visibleAuditRecords = useMemo(() => filterAuditRecords(auditRecords, {
    providerType: auditProviderFilter,
    query: auditQuery,
    sessionId: auditSessionFilter,
  }), [auditProviderFilter, auditQuery, auditRecords, auditSessionFilter]);
  const auditWorkspaceSession = sessions.find((session) => (
    session.id === (auditSessionFilter === 'all' ? activeKey : auditSessionFilter)
  )) || null;
  const auditWorkspaceRecording = auditWorkspaceSession
    ? terminalRefs.current[auditWorkspaceSession.id]?.recording?.()
    : null;
  const auditWorkspaceSummary = buildSessionAuditWorkspaceSummary(
    auditWorkspaceSession,
    auditRecords,
    {
      recordingActive: Boolean(auditWorkspaceRecording?.startedAt)
        && auditWorkspaceSession?.status !== 'closed',
    },
  );
  const auditWorkspaceRecordingState = auditWorkspaceSummary?.recordingActive
    ? 'active'
    : auditWorkspaceSummary?.finalized ? 'saved' : 'pending';

  useEffect(() => {
    if (auditSessionFilter === 'all') return;
    if (auditSessionOptions.some((option) => option.value === auditSessionFilter)) return;
    setAuditSessionFilter('all');
  }, [auditSessionFilter, auditSessionOptions]);
  const currentSessionSummary = useMemo(() => sessionSummary(sessions), [sessions]);
  const sessionReconnectBatch = useMemo(() => buildSessionReconnectBatch(
    sessions,
    terminalStatuses,
    sessionReconnects,
  ), [sessionReconnects, sessions, terminalStatuses]);
  const sessionReconnectBatchActionCount = shouldOfferSessionReconnectBatch(
    sessionReconnectBatch.sessionIds,
    activeKey,
  ) ? sessionReconnectBatch.sessionIds.length : 0;
  const workspaceActionState = buildWorkspaceActionState({
    hasSnapshot: buildWorkspaceSnapshotSummary(workspaceSummary).hasSnapshot,
    sessionCount: sessions.length,
  });
  const sessionNavigationState = useMemo(() => (
    buildSessionNavigationState(sessions, activeKey)
  ), [activeKey, sessions]);
  const sidebarSessionState = useMemo(() => buildSessionSidebarState(sessions, {
    activeKey,
    activity: sessionActivity,
    query: sidebarSessionQuery,
    scope: sidebarSessionScope,
  }), [activeKey, sessionActivity, sessions, sidebarSessionQuery, sidebarSessionScope]);
  const sidebarSessions = sidebarSessionState.sessions;
  const sessionIds = useMemo(() => sessions.map((session) => session.id), [sessions]);
  useEffect(() => {
    updateSessionReconnects((current) => reconcileSessionReconnects(current, sessionIds));
  }, [sessionIds]);
  const visibleQuickCommands = useMemo(() => filterQuickCommands(quickCommands, commandQuery, {
    favoriteOnly: commandScope === 'favorites',
    providerType: commandScope === 'current' ? activeSession?.providerType || 'all' : 'all',
  }), [activeSession?.providerType, commandQuery, commandScope, quickCommands]);
  const visibleCommandHistory = useMemo(() => filterCommandHistory(commandHistory, {
    providerType: historyScope === 'all' ? 'all' : activeSession?.providerType || 'all',
    query: historyQuery,
    sessionId: historyScope === 'session' ? activeKey : '',
  }), [activeKey, activeSession?.providerType, commandHistory, historyQuery, historyScope]);
  const quickCommandSummary = useMemo(() => (
    buildQuickCommandSummary(quickCommands, { activeSession, terminalStatus: activeTerminalStatus })
  ), [activeSession, activeTerminalStatus, quickCommands]);
  const openCommandCenter = (tab = 'library') => {
    setCommandCenterTab(tab);
    setCommandCenterOpen(true);
  };
  useEffect(() => {
    if (!commandEditorOpen) return;
    const command = quickCommands.find((item) => item.id === editingQuickCommandId);
    commandForm.setFieldsValue(command ? {
      command: command.command,
      name: command.name,
      providerType: command.providerType || 'all',
    } : {
      command: '',
      name: '',
      providerType: activeSession?.providerType || 'all',
    });
  }, [commandEditorOpen, editingQuickCommandId]);
  const terminalDefaults = useMemo(
    () => buildTerminalDefaults(settings, providers.length > 0 ? providers : fallbackProviders),
    [providers, settings],
  );
  const desktopBridgeReady = hasWailsMethod(['session', 'API', 'CreateSession']);

  useEffect(() => {
    if (providers.length > 0 && !providers.some((provider) => provider.type === newType)) {
      setNewType(providers[0].type);
    }
  }, [newType, providers]);

  const openDrawer = (
    type = terminalDefaults.defaultProviderType,
    profile = null,
    intent = 'session',
    initialGroup = '',
  ) => {
    const providerType = profile?.providerType || type;
    const provider = providers.find((item) => item.type === providerType);
    const resolvedIntent = profile ? 'edit' : intent;
    if (resolvedIntent !== 'session') {
      setSelectedProfileId('');
      setConnectionDetailProfileId('');
    }
    setNewType(providerType);
    setTerminalDrawerIntent(resolvedIntent);
    form.setFieldsValue({
      accent: normalizeConnectionAccent(profile?.accent),
      displayName: profile?.displayName || '',
      group: profile?.group || initialGroup,
      tags: normalizeConnectionTags(profile?.tags),
      host: profile?.config?.host || '',
      port: profile?.config?.port || 22,
      username: profile?.auth?.username || '',
      password: '',
      authType: profile?.auth?.authType || 'password',
      agentSocketPath: profile?.config?.agentSocketPath || '',
      connectTimeoutSeconds: profile?.config?.connectTimeoutSeconds ?? 10,
      privateKey: '',
      passphrase: '',
      jumpHost: profile?.config?.jumpHost || '',
      jumpPort: profile?.config?.jumpPort || 22,
      jumpUsername: profile?.auth?.jumpUsername || '',
      jumpPassword: '',
      hostKeyPolicy: profile?.config?.hostKeyPolicy || 'accept-new',
      knownHostsPath: profile?.config?.knownHostsPath || '',
      keepAliveIntervalSeconds: profile?.config?.keepAliveIntervalSeconds ?? 0,
      keepAliveMaxFailures: profile?.config?.keepAliveMaxFailures ?? 3,
      credentialRef: profile?.auth?.credentialRef ? JSON.stringify(profile.auth.credentialRef) : '',
      rememberCredential: !!profile?.auth?.credentialRef,
      shell: profile?.config?.shell || '',
      workingDirectory: profile?.config?.workingDirectory || terminalDefaults.defaultWorkingDirectory,
      ...(provider?.category === 'extension'
        ? buildExtensionTerminalFormValues(provider, profile)
        : { config: {}, auth: {} }),
      saveProfile: resolveProfileSaveDefault({ intent, profile }),
    });
    setEditingProfileId(profile?.id || '');
    setSshAuthType(profile?.auth?.authType || 'password');
    setConnectionTestResult(null);
    setDrawerOpen(true);
  };

  const changeTerminalProvider = (providerType) => {
    const provider = providers.find((item) => item.type === providerType);
    setNewType(providerType);
    setConnectionTestResult(null);
    form.setFieldsValue(provider?.category === 'extension'
      ? { ...buildExtensionTerminalFormValues(provider), rememberCredential: false }
      : {
        config: {},
        auth: {},
        agentSocketPath: '',
        connectTimeoutSeconds: 10,
        hostKeyPolicy: providerType === 'ssh' ? 'accept-new' : undefined,
        knownHostsPath: '',
        keepAliveIntervalSeconds: 0,
        keepAliveMaxFailures: 3,
        rememberCredential: false,
      });
  };

  const openConnectionDrawer = (
    type = terminalDefaults.defaultProviderType,
    group = '',
  ) => openDrawer(type, null, 'connection', group);

  const openExtensionsForProvider = (providerType = '') => {
    setExtensionQuery(String(providerType || '').trim());
    setExtensionScope('all');
    setSelectedNav('extensions');
  };

  const openProviderExtension = (runtimeState = {}) => {
    setExtensionQuery(runtimeState.extensionId || runtimeState.providerType || '');
    setExtensionScope(runtimeState.status === 'missing' ? 'all' : 'installed');
    setSelectedNav('extensions');
  };

  const openFileProvider = (providerType = '') => {
    setFileProviderType(providerType);
    setFileConnectionProfileId('');
    setFileCredentialEditing(false);
    setFileEntries([]);
    setSelectedNav('files');
  };

  const clearExtensionFilters = () => {
    setExtensionQuery('');
    setExtensionScope('all');
  };

  const createSession = async (action = 'create') => {
    const values = await form.validateFields();
    const provider = providers.find((item) => item.type === newType) || fallbackProviders[0];
    const label = values.displayName || providerLabel(provider);
    let request = buildRequest(newType, label, values, provider);
    let profileId = editingProfileId;
    const submitPlan = buildTerminalSubmitPlan({
      action,
      intent: terminalDrawerIntent,
      saveProfile: values.saveProfile,
    });

    setCreatingSession(true);
    try {
      if (submitPlan.persistProfile) {
        const existingCredentialRef = parseCredentialRef(values.credentialRef);
        const hasNewCredentialSecret = !!(
          (values.authType === 'password' && values.password)
          || (values.authType === 'privateKey' && (values.privateKey || values.passphrase))
          || values.jumpPassword
        );
        if (newType === 'ssh' && shouldClearStoredSshCredential({
          editingProfileId,
          rememberCredential: values.rememberCredential,
        })) {
          await CredentialsAPI.DeleteSSHCredential(editingProfileId);
          request = {
            ...request,
            auth: {
              ...request.auth,
              credentialRef: null,
            },
          };
        }
        const shouldMigrateAgentCredential = values.authType === 'agent' && !!existingCredentialRef;
        if (newType === 'ssh' && values.rememberCredential
          && (hasNewCredentialSecret || shouldMigrateAgentCredential)) {
          profileId = profileId || (crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}`);
          const credentialRef = await CredentialsAPI.SaveSSHCredential({
            id: profileId,
            authType: values.authType || 'password',
            password: values.authType === 'password' ? values.password || '' : '',
            privateKey: values.authType === 'privateKey' ? values.privateKey || '' : '',
            passphrase: values.authType === 'privateKey' ? values.passphrase || '' : '',
            jumpPassword: values.jumpPassword || '',
            preserveExisting: !!existingCredentialRef,
          });
          request = {
            ...request,
            auth: {
              ...request.auth,
              credentialRef: hasStoredSshCredential(credentialRef) ? credentialRef : null,
            },
          };
        }
        if (provider.category === 'extension') {
          profileId = profileId || (crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}`);
          const existingProfile = profiles.find((item) => item.id === editingProfileId);
          let credentialRef = existingProfile?.auth?.credentialRef || null;
          const credentialValues = buildExtensionTerminalCredentialValues(provider, values.auth || {});
          if (values.rememberCredential && Object.keys(credentialValues).length > 0) {
            credentialRef = await CredentialsAPI.SaveProviderCredential({
              id: profileId,
              previousFields: credentialRef?.fields || [],
              providerType: provider.type,
              values: credentialValues,
            });
          }
          if (!values.rememberCredential && credentialRef) {
            await CredentialsAPI.DeleteProviderCredential(credentialRef);
            credentialRef = null;
          }
          request = { ...request, auth: { ...request.auth, credentialRef } };
        }
        profileId = profileId || (crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}`);
        request = { ...request, profileId };
        const nextProfiles = saveProfile(profiles, request, editingProfileId, profileId);
        setProfiles(nextProfiles);
        updateConnectionHealth((current) => clearConnectionHealth(current, [profileId]));
        messageApi.success(t('message.profileSaved'));
      }
      setDrawerOpen(false);
      if (!submitPlan.openSession) return;
      await startProfileRequests([request], { closeDrawer: true });
    } catch (error) {
      showOperationError('message.credentialFailed', error);
    } finally {
      setCreatingSession(false);
    }
  };

  const startProfileRequests = async (requests, { closeDrawer = false } = {}) => {
    const reservation = reserveConnectionLaunchRequests(
      connectionLaunchKeysRef.current,
      requests,
    );
    const { acceptedRequests, blockedKeys } = reservation;
    if (blockedKeys.length > 0) {
      messageApi.info(t(
        blockedKeys.length > 1 || acceptedRequests.length > 0
          ? 'message.connectionLaunchSkipped'
          : 'message.connectionLaunchInProgress',
        { count: blockedKeys.length },
      ));
    }
    if (acceptedRequests.length === 0) {
      return { createdCount: 0, createdProfileIds: [], skippedPendingCount: blockedKeys.length };
    }
    updateConnectionLaunchKeys(reservation.pendingKeys);
    const createdSessions = [];
    try {
      for (const request of acceptedRequests) {
        const id = crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${createdSessions.length}`;
        const label = request.displayName || request.providerType;
        rememberConnection(request, setRecentConnections);
        const sessionRequest = await resolveCredentialRequest(request);
        createdSessions.push({
          id,
          auditEvents: [createAuditEvent({
            detail: profileDescription(profileFromRequest(request)),
            sessionId: id,
            sessionLabel: label,
            type: 'session.open',
          })],
          label,
          providerType: request.providerType,
          request: sessionRequest,
          startedAt: new Date().toISOString(),
          status: 'connecting',
          revision: 0,
        });
      }
      if (createdSessions.length === 0) {
        return { createdCount: 0, createdProfileIds: [], skippedPendingCount: blockedKeys.length };
      }
      if (closeDrawer) setDrawerOpen(false);
      setSessions((current) => [...current, ...createdSessions]);
      setActiveKey(createdSessions[createdSessions.length - 1].id);
      setSelectedNav('sessions');
      messageApi.success(createdSessions.length > 1
        ? `${t('message.batchSessionsStarted')}: ${createdSessions.length}`
        : t('terminal.status.connecting'));
      return {
        createdCount: createdSessions.length,
        createdProfileIds: acceptedRequests.map((request) => request.profileId).filter(Boolean),
        skippedPendingCount: blockedKeys.length,
      };
    } finally {
      updateConnectionLaunchKeys(releaseConnectionLaunchRequests(
        connectionLaunchKeysRef.current,
        acceptedRequests,
      ));
    }
  };

  const defaultTerminalLaunchFor = (providerType = terminalDefaults.defaultProviderType) => {
    const provider = providers.find((item) => item.type === providerType) || fallbackProviders[0];
    return buildDefaultTerminalLaunch({
      providerName: providerLabel(provider),
      providerType,
      workingDirectory: terminalDefaults.defaultWorkingDirectory,
    });
  };

  const isDefaultTerminalLaunching = (providerType = terminalDefaults.defaultProviderType) => {
    const launch = defaultTerminalLaunchFor(providerType);
    return launch.kind === 'open'
      && connectionLaunchKeys.includes(buildConnectionLaunchKey(launch.request));
  };

  const launchDefaultTerminal = async (providerType = terminalDefaults.defaultProviderType) => {
    const launch = defaultTerminalLaunchFor(providerType);
    if (launch.kind === 'configure') {
      openDrawer(providerType);
      return;
    }
    try {
      await startProfileRequests([launch.request]);
    } catch (error) {
      showOperationError('message.terminalStartFailed', error, {
        retry: () => launchDefaultTerminal(providerType),
      });
    }
  };

  const clearSessionRecovery = (sessionId) => {
    if (!sessionId) return;
    const timer = sessionRecoveryTimersRef.current[sessionId];
    if (timer) window.clearTimeout(timer);
    delete sessionRecoveryTimersRef.current[sessionId];
    if (!Object.prototype.hasOwnProperty.call(sessionRecoveriesRef.current, sessionId)) return;
    updateSessionRecoveries((current) => {
      const next = { ...current };
      delete next[sessionId];
      return next;
    });
  };

  const clearAllSessionRecoveries = () => {
    Object.values(sessionRecoveryTimersRef.current).forEach((timer) => window.clearTimeout(timer));
    sessionRecoveryTimersRef.current = {};
    if (Object.keys(sessionRecoveriesRef.current).length > 0) updateSessionRecoveries({});
  };

  const scheduleSessionRecovery = (sessionId, status, revision = 0) => {
    const session = sessionsRef.current.find((item) => item.id === sessionId);
    const plan = buildSessionRecoveryPlan({
      recovery: sessionRecoveriesRef.current[sessionId],
      revision,
      session,
      settings,
      status,
    });
    if (plan.kind === 'none') return plan;
    const currentTimer = sessionRecoveryTimersRef.current[sessionId];
    if (currentTimer) window.clearTimeout(currentTimer);
    delete sessionRecoveryTimersRef.current[sessionId];
    updateSessionRecoveries((current) => ({ ...current, [sessionId]: plan.recovery }));
    if (plan.kind === 'exhausted') return plan;
    sessionRecoveryTimersRef.current[sessionId] = window.setTimeout(() => {
      delete sessionRecoveryTimersRef.current[sessionId];
      const recovery = sessionRecoveriesRef.current[sessionId];
      if (recovery?.status !== 'scheduled' || recovery.retryAt !== plan.recovery.retryAt) return;
      const result = reconnectSession(sessionId, {
        attempt: recovery.attempt,
        automatic: true,
      });
      if (!result?.started) clearSessionRecovery(sessionId);
    }, plan.recovery.delaySeconds * 1000);
    return plan;
  };

  const cancelSessionRecovery = (sessionId, { silent = false } = {}) => {
    const recovery = sessionRecoveriesRef.current[sessionId];
    if (!recovery) return;
    clearSessionRecovery(sessionId);
    if (recovery.status === 'scheduled') {
      appendAuditEvent(sessionId, 'session.auto-reconnect.cancel');
      if (!silent) messageApi.info(t('message.autoReconnectCancelled'));
    }
  };

  useEffect(() => {
    clearAllSessionRecoveries();
    const policy = normalizeSessionRecoveryPolicy(settings);
    if (!policy.enabled) return;
    sessionsRef.current.forEach((session) => {
      const status = terminalStatuses[session.id];
      if (status?.status === 'error') scheduleSessionRecovery(
        session.id,
        status,
        session.revision || 0,
      );
    });
  }, [
    settings.autoReconnect,
    settings.autoReconnectDelaySeconds,
    settings.autoReconnectMaxAttempts,
  ]);

  useEffect(() => () => {
    Object.values(sessionRecoveryTimersRef.current).forEach((timer) => window.clearTimeout(timer));
    sessionRecoveryTimersRef.current = {};
  }, []);

  const rememberClosedSessions = (closingSessions) => {
    if (!closingSessions?.length) return;
    setClosedSessions((current) => appendClosedSessions(current, closingSessions, 10));
  };

  const restoreLastClosedSession = async () => {
    const { entry, remaining } = takeClosedSession(closedSessions);
    if (!entry) return;
    if (!providers.some((provider) => provider.type === entry.providerType)) {
      messageApi.warning(t('message.providerUnavailable'));
      return;
    }
    setClosedSessions(remaining);
    try {
      const result = await startProfileRequests([entry.request]);
      if (result.createdCount === 0) {
        setClosedSessions((current) => [entry, ...current].slice(0, 10));
      }
    } catch (error) {
      setClosedSessions((current) => [entry, ...current].slice(0, 10));
      showOperationError('message.credentialFailed', error, { retry: restoreLastClosedSession });
    }
  };

  const testConnection = async () => {
    if (newType === 'local') {
      messageApi.info(t('message.localTestSkipped'));
      return;
    }
    const values = await form.validateFields();
    const provider = providers.find((item) => item.type === newType) || fallbackProviders[0];
    setConnectionTestResult(null);
    setTestingConnection(true);
    try {
      const request = await resolveCredentialRequest(buildRequest(
        newType,
        values.displayName || providerLabel(provider),
        values,
        provider,
      ));
      if (newType === 'ssh') await TerminalAPI.TestSSHConnection(request);
      else await SessionAPI.TestProvider(request);
      setConnectionTestResult({ status: 'success' });
      messageApi.success(t('message.connectionTestSuccess'));
    } catch (error) {
      setConnectionTestResult({ status: 'error', model: buildOperationError(error) });
      showOperationError('message.connectionTestFailed', error, { retry: testConnection });
    } finally {
      setTestingConnection(false);
    }
  };

  const executeConnectionProbe = async (profile) => {
    if (profile.kind === 'file') {
      const credential = await resolveStoredProviderCredential(profile);
      if (!credential.complete) throw new Error('saved credential unavailable');
      await FilesAPI.List(buildFileConnectionRequest(profile, credential.auth));
      return;
    }
    const request = await resolveCredentialRequest(profileToRequest(profile));
    if (profile.providerType === 'ssh') {
      await TerminalAPI.TestSSHConnection(request);
      return;
    }
    await SessionAPI.TestProvider(request);
  };

  const testConnectionProfile = async (profile, { reserved = false, silent = false } = {}) => {
    if (!profile?.id) return { profileId: '', reason: 'missing', status: 'skipped' };
    if (!reserved) {
      const plan = buildConnectionProbePlan(
        [profile],
        [profile.id],
        connectionProviders,
        connectionHealthRef.current,
      );
      if (plan.probeableProfiles.length === 0) {
        const reason = plan.skipped.checking > 0
          ? 'checking'
          : plan.skipped.local > 0 ? 'local' : 'unavailable';
        if (!silent) messageApi.info(t(`message.connectionHealthSkipped.${reason}`));
        return { profileId: profile.id, reason, status: 'skipped' };
      }
      updateConnectionHealth((current) => beginConnectionProbes(current, [profile]));
    }
    try {
      await executeConnectionProbe(profile);
      const completed = updateConnectionHealth((current) => completeConnectionProbe(
        current,
        profile.id,
      ));
      const latency = completed[profile.id]?.latencyMs || 0;
      if (!silent) messageApi.success(t('message.connectionHealthSuccess', { latency }));
      return { latency, profileId: profile.id, status: 'success' };
    } catch (error) {
      const model = buildOperationError(error);
      updateConnectionHealth((current) => completeConnectionProbe(current, profile.id, { error: model }));
      if (!silent) {
        showOperationError('message.connectionHealthFailed', error, {
          retry: () => testConnectionProfile(profile),
        });
      }
      return { error: model, profileId: profile.id, status: 'error' };
    }
  };

  const duplicateProfile = (profile) => {
    const copy = {
      ...profile,
      importSource: undefined,
      auth: {
        ...(profile.auth || {}),
        credentialRef: null,
      },
      id: crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}`,
      displayName: `${profile.displayName} Copy`,
      lastUsedAt: '',
    };
    const nextProfiles = [...profiles, copy];
    persistProfiles(nextProfiles);
    setProfiles(nextProfiles);
    messageApi.success(t('message.profileSaved'));
  };

  const toggleProfileFavorite = (profileId) => {
    const nextProfiles = profiles.map((profile) => (
      profile.id === profileId ? { ...profile, favorite: !profile.favorite } : profile
    ));
    persistProfiles(nextProfiles);
    setProfiles(nextProfiles);
  };

  const duplicateSession = (session) => {
    const id = crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}`;
    setSessions((current) => [...current, {
      ...session,
      id,
      backendSessionId: '',
      label: `${session.label} Copy`,
      protected: false,
      status: 'connecting',
      startedAt: new Date().toISOString(),
      auditEvents: [],
      auditRecordSaved: false,
      revision: 0,
    }]);
    setActiveKey(id);
    setSelectedNav('sessions');
  };

  const closeSessionSet = (closingSessions = []) => {
    if (closingSessions.length === 0) return;
    const closingSessionIds = new Set(closingSessions.map((session) => session.id));
    closingSessions.forEach((session) => clearSessionRecovery(session.id));
    closingSessions.forEach((session) => saveAuditRecord(session.id, { finalize: true }));
    rememberClosedSessions(closingSessions);
    const remainingSessions = sessions.filter((session) => !closingSessionIds.has(session.id));
    setSessions((current) => current.filter((session) => !closingSessionIds.has(session.id)));
    if (closingSessionIds.has(activeKey)) setActiveKey(remainingSessions[0]?.id || '');
    if (remainingSessions.length === 0) setFocusMode(false);
    terminalRefs.current = Object.fromEntries(
      Object.entries(terminalRefs.current).filter(([sessionId]) => !closingSessionIds.has(sessionId)),
    );
  };

  const removeSession = (targetKey) => {
    const closingSession = sessions.find((session) => session.id === targetKey);
    if (!closingSession || closingSession.protected) return;
    closeSessionSet([closingSession]);
  };

  const confirmRemoveSession = (targetKey) => {
    const session = sessions.find((item) => item.id === targetKey);
    if (!session) return;
    if (session.protected) {
      messageApi.info(t('palette.reason.protectedSession'));
      return;
    }
    if (settings.confirmDangerousActions === false) {
      removeSession(targetKey);
      return;
    }
    const confirm = buildSessionCloseConfirm(session);
    if (!confirm) return;
    modalApi.confirm({
      title: t(confirm.titleKey),
      content: t(confirm.contentKey, confirm.contentValues),
      okButtonProps: { danger: true },
      okText: t(confirm.okActionKey),
      cancelText: t('action.cancel'),
      onOk: () => removeSession(targetKey),
    });
  };

  const closeAllSessions = () => closeSessionSet(sessionClosePlans.all.closingSessions);

  const closeClosedSessions = () => closeSessionSet(sessionClosePlans.closed.closingSessions);

  const stopProtectedOnlyClose = (plan) => {
    if (plan.closingSessions.length > 0) return false;
    if (plan.protectedSessions.length > 0) {
      messageApi.info(t('message.protectedSessionsRemain', { count: plan.protectedSessions.length }));
    }
    return true;
  };

  const confirmCloseClosedSessions = () => {
    const plan = sessionClosePlans.closed;
    if (stopProtectedOnlyClose(plan)) return;
    if (settings.confirmDangerousActions === false) {
      closeClosedSessions();
      return;
    }
    const confirm = buildSessionCloseConfirm({
      mode: 'closed',
      protectedCount: plan.protectedSessions.length,
      sessions: plan.closingSessions,
    });
    if (!confirm) return;
    modalApi.confirm({
      title: t(confirm.titleKey),
      content: t(confirm.contentKey, confirm.contentValues),
      okButtonProps: { danger: true },
      okText: t(confirm.okActionKey),
      cancelText: t('action.cancel'),
      onOk: closeClosedSessions,
    });
  };

  const confirmCloseOtherSessions = (keepSessionId = activeKey) => {
    const plan = keepSessionId === activeKey
      ? sessionClosePlans.others
      : buildSessionClosePlan(sessions, { keepSessionId, mode: 'others' });
    if (stopProtectedOnlyClose(plan)) return;
    if (settings.confirmDangerousActions === false) {
      closeSessionSet(plan.closingSessions);
      return;
    }
    const confirm = buildSessionCloseConfirm({
      mode: 'others',
      protectedCount: plan.protectedSessions.length,
      sessions: plan.closingSessions,
    });
    if (!confirm) return;
    modalApi.confirm({
      title: t(confirm.titleKey),
      content: t(confirm.contentKey, confirm.contentValues),
      okButtonProps: { danger: true },
      okText: t(confirm.okActionKey),
      cancelText: t('action.cancel'),
      onOk: () => closeSessionSet(plan.closingSessions),
    });
  };

  const confirmCloseDirectionalSessions = (mode, anchorSessionId) => {
    const plan = buildSessionClosePlan(sessions, { anchorSessionId, mode });
    if (stopProtectedOnlyClose(plan)) return;
    if (settings.confirmDangerousActions === false) {
      closeSessionSet(plan.closingSessions);
      return;
    }
    const confirm = buildSessionCloseConfirm({
      mode,
      protectedCount: plan.protectedSessions.length,
      sessions: plan.closingSessions,
    });
    if (!confirm) return;
    modalApi.confirm({
      title: t(confirm.titleKey),
      content: t(confirm.contentKey, confirm.contentValues),
      okButtonProps: { danger: true },
      okText: t(confirm.okActionKey),
      cancelText: t('action.cancel'),
      onOk: () => closeSessionSet(plan.closingSessions),
    });
  };

  const confirmCloseAllSessions = () => {
    const plan = sessionClosePlans.all;
    if (stopProtectedOnlyClose(plan)) return;
    if (settings.confirmDangerousActions === false) {
      closeAllSessions();
      return;
    }
    const confirm = buildSessionCloseConfirm({
      mode: 'all',
      protectedCount: plan.protectedSessions.length,
      sessions: plan.closingSessions,
    });
    if (!confirm) return;
    modalApi.confirm({
      title: t(confirm.titleKey),
      content: t(confirm.contentKey, confirm.contentValues),
      okButtonProps: { danger: true },
      okText: t(confirm.okActionKey),
      cancelText: t('action.cancel'),
      onOk: closeAllSessions,
    });
  };

  const openRenameSession = (session = sessions.find((item) => item.id === activeKey)) => {
    if (!session) {
      messageApi.warning(t('message.noActiveSession'));
      return;
    }
    setRenamingSessionId(session.id);
    setRenamingSessionName(session.label);
    setRenameOpen(true);
  };

  const renameSession = () => {
    const name = renamingSessionName.trim();
    if (!name) {
      messageApi.warning(t('validation.required'));
      return;
    }
    setSessions((current) => current.map((session) => (
      session.id === renamingSessionId
        ? { ...session, label: name, request: { ...session.request, displayName: name } }
        : session
    )));
    setRenameOpen(false);
    setRenamingSessionId('');
    setRenamingSessionName('');
    messageApi.success(t('message.sessionRenamed'));
  };

  const toggleProtectedSession = (sessionId = activeKey) => {
    const session = sessions.find((item) => item.id === sessionId);
    if (!session) {
      messageApi.warning(t('message.noActiveSession'));
      return;
    }
    setSessions((current) => toggleSessionProtection(current, sessionId));
    messageApi.success(t(session.protected ? 'message.sessionUnprotected' : 'message.sessionProtected'));
  };

  const reconnectSession = (sessionId = activeKey, options = {}) => {
    const automatic = options.automatic === true;
    const preserveContext = options.preserveContext === true;
    const silent = options.silent === true;
    if (automatic && settings.autoReconnect !== true) return { started: false };
    if (!automatic) clearSessionRecovery(sessionId);
    if (!sessionId) {
      if (!automatic && !silent) messageApi.warning(t('message.noActiveSession'));
      return { started: false };
    }
    const session = sessionsRef.current.find((item) => item.id === sessionId);
    if (!session) {
      if (!automatic && !silent) messageApi.warning(t('message.noActiveSession'));
      return { started: false };
    }
    const revision = (session.revision || 0) + 1;
    const reservation = reserveSessionReconnect(sessionReconnectsRef.current, sessionId, revision);
    if (!reservation.reserved) {
      if (!automatic && !silent) messageApi.info(t('message.sessionReconnectInProgress'));
      return { started: false };
    }
    updateSessionReconnects(reservation.reconnects);
    if (automatic) {
      updateSessionRecoveries((current) => ({
        ...current,
        [sessionId]: markSessionRecoveryStarted(current[sessionId], revision),
      }));
    }
    saveAuditRecord(sessionId, { finalize: true });
    setTerminalStatuses((current) => ({
      ...current,
      [sessionId]: { status: 'connecting' },
    }));
    setSessions((current) => current.map((item) => (
      item.id === sessionId
        ? {
          ...item,
          auditEvents: [createAuditEvent({
            detail: automatic ? `attempt ${Number(options.attempt) || 1}` : '',
            sessionId: item.id,
            sessionLabel: item.label,
            type: automatic ? 'session.auto-reconnect' : 'session.reconnect',
          })],
          auditRecordSaved: false,
          backendSessionId: '',
          status: 'connecting',
          revision,
        }
        : item
    )));
    if (!automatic && !preserveContext) {
      setActiveKey(sessionId);
      setSelectedNav('sessions');
    }
    if (!automatic && !silent) {
      messageApi.success(t('terminal.status.connecting'));
    }
    return { revision, started: true };
  };

  const reconnectDisconnectedSessions = () => {
    const plan = buildSessionReconnectBatch(
      sessionsRef.current,
      terminalStatuses,
      sessionReconnectsRef.current,
    );
    const startedCount = plan.sessionIds.reduce((count, sessionId) => {
      const result = reconnectSession(sessionId, {
        preserveContext: true,
        silent: true,
      });
      return result.started ? count + 1 : count;
    }, 0);
    if (startedCount === 0) {
      messageApi.info(t('message.noDisconnectedSessions'));
      return;
    }
    messageApi.success(t('message.sessionsReconnectStarted', { count: startedCount }));
  };

  const findInTerminal = (direction = 'next') => {
    const keyword = terminalSearch.trim();
    if (!keyword) {
      terminalRefs.current[activeKey]?.clearSearch?.();
      return;
    }
    const activeTerminal = terminalRefs.current[activeKey];
    if (!activeTerminal) {
      messageApi.warning(t('message.noActiveSession'));
      return;
    }
    if (validateTerminalSearchQuery(keyword, terminalSearchPreferences) !== 'valid') return;
    const requestKey = terminalSearchRequestKey(terminalSearch, terminalSearchPreferences);
    terminalSearchQueriesRef.current[activeKey] = requestKey;
    if (direction === 'previous') {
      const searchResult = activeTerminal.findPrevious?.(keyword, terminalSearchPreferences);
      if (searchResult === undefined) delete terminalSearchQueriesRef.current[activeKey];
      return;
    }
    const searchResult = activeTerminal.findNext?.(keyword, terminalSearchPreferences);
    if (searchResult === undefined) delete terminalSearchQueriesRef.current[activeKey];
  };

  const copyTerminalSelection = async () => {
    try {
      const copied = await terminalRefs.current[activeKey]?.copySelection?.();
      if (!copied) {
        messageApi.info(t('message.noTerminalSelection'));
        return;
      }
      messageApi.success(t('message.copied'));
    } catch (error) {
      messageApi.error(`${t('message.clipboardFailed')}: ${error}`);
    }
  };

  const copySessionTarget = async (session = activeSession) => {
    const identityDisplay = session ? sessionIdentityDisplays[session.id] : null;
    if (!identityDisplay?.copyValue) {
      messageApi.info(t('palette.reason.noSessionTarget'));
      return;
    }
    try {
      await writeClipboardText(identityDisplay.copyValue);
      messageApi.success(t('message.sessionTargetCopied'));
    } catch (error) {
      messageApi.error(`${t('message.clipboardFailed')}: ${error}`);
    }
  };

  const confirmTerminalPaste = (risk) => {
    if (!risk || settings.confirmDangerousActions === false) return Promise.resolve(true);
    if (pasteConfirmationPending.current) return Promise.resolve(false);
    pasteConfirmationPending.current = true;
    return new Promise((resolve) => {
      let settled = false;
      const settle = (allowed) => {
        if (settled) return;
        settled = true;
        resolve(allowed);
      };
      let confirmation;
      confirmation = modalApi.confirm({
        afterClose: () => settle(false),
        cancelText: t('action.cancel'),
        content: (
          <div className="terminal-paste-confirmation">
            <p>{t('confirm.terminalPasteContent', {
              characters: risk.characterCount,
              lines: risk.lineCount,
            })}</p>
            <Alert message={t('confirm.terminalPasteWarning')} showIcon type="warning" />
          </div>
        ),
        okButtonProps: { danger: true },
        okText: t('action.pasteClipboard'),
        onCancel: () => {
          settle(false);
          confirmation?.destroy();
        },
        onOk: () => {
          settle(true);
          confirmation?.destroy();
        },
        title: t('confirm.terminalPasteTitle'),
      });
    }).finally(() => {
      pasteConfirmationPending.current = false;
    });
  };

  const pasteClipboardToTerminal = async () => {
    try {
      const pasted = await terminalRefs.current[activeKey]?.pasteClipboard?.();
      if (pasted === null) {
        messageApi.info(t('message.pasteCancelled'));
        return;
      }
      if (!pasted) {
        messageApi.info(t('message.clipboardEmpty'));
        return;
      }
      messageApi.success(t('message.pasted'));
    } catch (error) {
      messageApi.error(`${t('message.clipboardFailed')}: ${error}`);
    }
  };

  const copyTerminalTranscript = async () => {
    try {
      const copied = await terminalRefs.current[activeKey]?.copyTranscript?.();
      if (!copied) {
        messageApi.info(t('message.terminalOutputEmpty'));
        return;
      }
      appendAuditEvent(activeKey, 'transcript.copy');
      messageApi.success(t('message.copied'));
    } catch (error) {
      messageApi.error(`${t('message.clipboardFailed')}: ${error}`);
    }
  };

  const exportTerminalTranscript = () => {
    const session = sessions.find((item) => item.id === activeKey);
    const output = terminalRefs.current[activeKey]?.transcript?.();
    const text = output?.raw || output?.screen || '';
    if (!session || !text.trim()) {
      messageApi.info(t('message.terminalOutputEmpty'));
      return;
    }
    downloadText(`${safeFileName(session.label)}-${timestampFilePart()}.log`, text);
    appendAuditEvent(activeKey, 'transcript.export');
    saveAuditRecord(activeKey);
    messageApi.success(t('message.transcriptExported'));
  };

  const clearActiveTerminal = () => {
    if (!terminalRefs.current[activeKey]?.clear) {
      messageApi.warning(t('message.noActiveSession'));
      return;
    }
    terminalRefs.current[activeKey].clear();
    appendAuditEvent(activeKey, 'terminal.clear');
  };

  const resetActiveTerminal = () => {
    if (!terminalRefs.current[activeKey]?.reset) {
      messageApi.warning(t('message.noActiveSession'));
      return;
    }
    terminalRefs.current[activeKey].reset();
    appendAuditEvent(activeKey, 'terminal.reset');
  };

  const zoomTerminalFont = (delta) => {
    setSettings((current) => ({
      ...current,
      fontSize: clampNumber((current.fontSize || defaultSettings.fontSize) + delta, 10, 24, defaultSettings.fontSize),
    }));
  };

  const resetTerminalFont = () => {
    setSettings((current) => ({ ...current, fontSize: defaultSettings.fontSize }));
  };

  const appendAuditEvent = (sessionId, type, detail = '') => {
    setSessions((current) => current.map((session) => (
      session.id === sessionId || session.backendSessionId === sessionId
        ? {
          ...session,
          auditEvents: [
            ...(session.auditEvents || []),
            createAuditEvent({
              detail,
              sessionId: session.id,
              sessionLabel: session.label,
              type,
            }),
          ],
        }
        : session
    )));
  };

  const openBroadcastCommand = () => {
    if (broadcastTargets.length < 2) {
      messageApi.info(t('message.broadcastNeedsSessions'));
      return;
    }
    const defaultTarget = broadcastTargets.find((target) => target.id === activeKey)
      || broadcastTargets[0];
    setBroadcastCommand('');
    setBroadcastTargetIds(defaultTarget ? [defaultTarget.id] : []);
    setBroadcastAppendEnter(true);
    setBroadcastOpen(true);
  };

  const sendBroadcastCommand = async () => {
    if (broadcastSendingRef.current) return;
    if (!broadcastPlan.ok) {
      messageApi.warning(t(`broadcast.reason.${broadcastPlan.reason}`));
      return;
    }
    broadcastSendingRef.current = true;
    setBroadcastSending(true);
    try {
      const results = await Promise.allSettled(
        broadcastPlan.targetIds.map(async (sessionId) => {
          const terminal = terminalRefs.current[sessionId];
          if (!terminal?.sendBackground) throw new Error('Terminal session is unavailable');
          await terminal.sendBackground(broadcastPlan.payload);
          appendAuditEvent(sessionId, 'broadcast-command.run', broadcastPlan.command);
          return sessionId;
        }),
      );
      const failedIds = results
        .map((result, index) => (result.status === 'rejected' ? broadcastPlan.targetIds[index] : ''))
        .filter(Boolean);
      if (failedIds.length === 0) {
        messageApi.success(t('message.broadcastSuccess', { count: results.length }));
        setBroadcastOpen(false);
        setBroadcastCommand('');
        setBroadcastTargetIds([]);
        return;
      }
      setBroadcastTargetIds(failedIds);
      messageApi.warning(t('message.broadcastPartial', {
        failed: failedIds.length,
        succeeded: results.length - failedIds.length,
        total: results.length,
      }));
    } finally {
      broadcastSendingRef.current = false;
      setBroadcastSending(false);
    }
  };

  const saveAuditRecord = (
    sessionId = activeKey,
    { finalize = false, updateSession = true } = {},
  ) => {
    const session = sessions.find((item) => item.id === sessionId || item.backendSessionId === sessionId);
    if (!session || session.auditRecordSaved) return null;
    const recording = terminalRefs.current[session.id]?.recording?.();
    const hasOutput = !!(recording?.raw || recording?.screen);
    const hasEvents = (session.auditEvents || []).length > 0;
    if (!hasOutput && !hasEvents) return null;
    const cast = buildAsciinemaCast({
      command: session.providerType,
      height: recording?.rows || 24,
      outputEvents: recording?.outputEvents || [],
      timestamp: recording?.startedAt ? Math.floor(new Date(recording.startedAt).getTime() / 1000) : Math.floor(Date.now() / 1000),
      title: session.label,
      width: recording?.cols || 80,
    });
    const record = buildAuditRecord({
      auditEvents: session.auditEvents || [],
      cast,
      endedAt: new Date().toISOString(),
      id: buildAuditCaptureID(session),
      providerType: session.providerType,
      revision: session.revision || 0,
      screen: recording?.screen || '',
      sessionId: session.id,
      startedAt: recording?.startedAt || session.startedAt || '',
      title: session.label,
    });
    const nextRecords = upsertAuditSessionRecord(loadAuditRecords(), record);
    const nextRecord = nextRecords[0];
    const persistence = persistAuditRecords(nextRecords, { preferredId: nextRecord.id });
    setAuditRecords(persistence.records);
    if (!persistence.preferredStored) {
      notificationApi.error({
        key: 'audit-storage-failed',
        message: t('message.auditRecordStorageFailed'),
        description: t('message.auditRecordStorageFailedHint'),
        duration: 0,
        placement: 'bottomRight',
      });
      return null;
    }
    if (persistence.evictedCount > 0) {
      messageApi.warning(t('message.auditRecordsPruned', { count: persistence.evictedCount }));
    }
    if (finalize && updateSession) {
      setSessions((current) => current.map((item) => (
        item.id === session.id ? { ...item, auditRecordSaved: true } : item
      )));
    }
    return nextRecord;
  };

  const saveCurrentAuditSnapshot = (sessionId = activeKey) => {
    const record = saveAuditRecord(sessionId);
    if (record) messageApi.success(t('message.auditSnapshotSaved'));
    if (!record) messageApi.info(t('message.terminalOutputEmpty'));
    return record;
  };

  saveAuditRecordRef.current = saveAuditRecord;

  useEffect(() => {
    const finalizeOpenAuditRecords = () => {
      sessionsRef.current.forEach((session) => {
        saveAuditRecordRef.current?.(session.id, { finalize: true, updateSession: false });
      });
    };
    window.addEventListener('beforeunload', finalizeOpenAuditRecords);
    return () => window.removeEventListener('beforeunload', finalizeOpenAuditRecords);
  }, []);

  const openAuditReplay = (record) => {
    setReplayRecord(record);
    setReplayExpanded(false);
  };

  const closeAuditReplay = () => {
    setReplayRecord(null);
    setReplayExpanded(false);
  };

  const deleteAuditRecord = (recordId) => {
    const persistence = persistAuditRecords(auditRecords.filter((record) => record.id !== recordId));
    setAuditRecords(persistence.records);
    if (!persistence.persisted) {
      messageApi.error(t('message.auditStorageUpdateFailed'));
      return;
    }
    if (replayRecord?.id === recordId) closeAuditReplay();
    messageApi.success(t('message.auditRecordDeleted'));
  };

  const clearAuditRecords = () => {
    const persistence = persistAuditRecords([]);
    setAuditRecords(persistence.records);
    if (!persistence.persisted) {
      messageApi.error(t('message.auditStorageUpdateFailed'));
      return;
    }
    closeAuditReplay();
    messageApi.success(t('message.auditRecordsCleared'));
  };

  const confirmDeleteAuditRecord = (record) => requestDangerousAction({
    contentKey: 'confirm.deleteAuditRecordContent',
    contentValues: {
      count: record?.auditEvents?.length || 0,
      name: record?.title || '-',
    },
    onConfirm: () => deleteAuditRecord(record.id),
    titleKey: 'confirm.deleteAuditRecordTitle',
  });

  const confirmClearAuditRecords = () => requestDangerousAction({
    actionKey: 'action.clear',
    contentKey: 'confirm.clearAuditRecordsContent',
    contentValues: { count: auditRecords.length },
    onConfirm: clearAuditRecords,
    titleKey: 'confirm.clearAuditRecordsTitle',
  });

  const exportAuditRecord = (record, format = 'cast') => {
    if (format === 'cast') {
      downloadText(`${safeFileName(record.title)}-${timestampFilePart(new Date(record.endedAt))}.cast`, record.cast || '');
      return;
    }
    downloadText(`${safeFileName(record.title)}-${timestampFilePart(new Date(record.endedAt))}.log`, record.screen || '');
  };

  const updateSessionStatus = (sessionId, status) => {
    if (status === 'closed') saveAuditRecord(sessionId, { finalize: true });
    setSessions((current) => current.map((item) => (
      item.backendSessionId === sessionId || item.id === sessionId ? { ...item, status } : item
    )));
  };

  const saveWorkspace = () => {
    if (workspaceActionState.save.disabled) {
      messageApi.info(t(workspaceActionState.save.reasonKey));
      return;
    }
    const snapshot = buildWorkspaceSnapshot(sessions, activeKey, sessionView);
    if (!persistWorkspaceSnapshot(snapshot)) {
      messageApi.error(t('message.workspaceSaveFailed'));
      return;
    }
    setWorkspaceSummary(loadWorkspaceSummary());
    messageApi.success(t('message.workspaceSaved'));
  };

  const restoreWorkspace = async ({ silent = false } = {}) => {
    if (workspaceRestoringRef.current) {
      if (!silent) messageApi.info(t('message.workspaceRestoreInProgress'));
      return null;
    }
    const snapshot = loadWorkspaceSnapshot();
    if (!snapshot || snapshot.sessions.length === 0) {
      if (!silent) messageApi.info(t('message.noWorkspaceSnapshot'));
      return null;
    }

    workspaceRestoringRef.current = true;
    try {
      const restorePlan = buildWorkspaceRestorePlan(snapshot, sessions, {
        resolveRequest: (session) => {
          const request = session.request || {};
          if (request.providerType === 'local') {
            return providers.some((provider) => provider.type === 'local') ? request : null;
          }
          const profile = profiles.find((item) => item.id === request.profileId);
          if (!profile || profile.kind === 'file') return null;
          if (!providers.some((provider) => provider.type === profile.providerType)) return null;
          if (profile.providerType === 'ssh' && !profile.auth?.credentialRef) return null;
          return profileToRequest(profile);
        },
      });
      const resolvedEntries = [];
      let credentialFailureCount = 0;
      for (const entry of restorePlan.restoreEntries) {
        try {
          resolvedEntries.push({
            ...entry,
            request: await resolveCredentialRequest(entry.request),
          });
        } catch {
          credentialFailureCount += 1;
        }
      }

      let restoredActiveKey = '';
      const restoredAt = new Date().toISOString();
      const restoredSessions = resolvedEntries.map(({ request, session }, index) => {
        const nextId = crypto.randomUUID
          ? crypto.randomUUID()
          : `${Date.now()}-${index}-${Math.random()}`;
        if (session.id === snapshot.activeKey) restoredActiveKey = nextId;
        return {
          ...session,
          auditEvents: [createAuditEvent({
            sessionId: nextId,
            sessionLabel: session.label,
            type: 'workspace.restore',
          })],
          id: nextId,
          backendSessionId: '',
          providerType: request.providerType,
          request,
          startedAt: restoredAt,
          status: 'connecting',
          revision: 0,
        };
      });
      const skippedCount = restorePlan.skippedCount + credentialFailureCount;
      const restoredCount = restoredSessions.length;
      const existingCount = restorePlan.existingCount;

      if (restoredCount > 0) setSessions((current) => [...current, ...restoredSessions]);
      const nextActiveKey = restoredActiveKey
        || restorePlan.activeExistingSessionId
        || activeKey
        || restoredSessions[0]?.id
        || '';
      if (nextActiveKey) setActiveKey(nextActiveKey);
      if (restoredCount > 0 || existingCount > 0) {
        setSessionView(snapshot.sessionView || 'tabs');
        setSelectedNav('sessions');
      }

      if (!silent) {
        if (restoredCount === 0 && existingCount === 0) {
          messageApi.warning(t('message.workspaceRestoreSkipped'));
        } else if (restoredCount === 0 && skippedCount === 0) {
          messageApi.info(t('message.workspaceAlreadyOpen', { count: existingCount }));
        } else {
          const summaryMessage = t('message.workspaceRestoreSummary', {
            existing: existingCount,
            restored: restoredCount,
            skipped: skippedCount,
          });
          if (skippedCount > 0) messageApi.warning(summaryMessage);
          else messageApi.success(summaryMessage);
        }
      }
      return { existingCount, restoredCount, skippedCount };
    } finally {
      workspaceRestoringRef.current = false;
    }
  };

  const clearWorkspaceSnapshot = () => {
    if (workspaceActionState.clear.disabled) {
      messageApi.info(t(workspaceActionState.clear.reasonKey));
      return;
    }
    if (!clearPersistedWorkspaceSnapshot()) {
      messageApi.error(t('message.workspaceClearFailed'));
      return;
    }
    setWorkspaceSummary(loadWorkspaceSummary());
    messageApi.success(t('message.workspaceCleared'));
  };

  const deleteProfileCredential = async (profile) => {
    if (!profile) return true;
    try {
      if (profile.auth?.credentialRef && profile.providerType !== 'ssh') {
        await CredentialsAPI.DeleteProviderCredential(profile.auth.credentialRef);
      } else if (profile.providerType === 'ssh') {
        await CredentialsAPI.DeleteSSHCredential(profile.id);
      }
    } catch {
      // Profiles remain removable even if the OS credential store is unavailable.
      return false;
    }
    return true;
  };

  const deleteProfile = async (profileId) => {
    const result = removeConnectionProfiles(profiles, [profileId]);
    if (result.removedProfiles.length === 0) return;
    persistProfiles(result.profiles);
    setProfiles(result.profiles);
    await deleteProfileCredential(result.removedProfiles[0]);
    messageApi.success(t('message.profileDeleted'));
  };

  const deleteSelectedProfiles = async () => {
    const result = removeConnectionProfiles(profiles, selectedProfileIds);
    if (result.removedProfiles.length === 0) return;
    persistProfiles(result.profiles);
    setProfiles(result.profiles);
    clearConnectionProfileSelection();
    await Promise.allSettled(result.removedProfiles.map(deleteProfileCredential));
    messageApi.success(t('message.profilesDeleted', { count: result.removedProfiles.length }));
  };

  const resolveStoredProviderCredential = async (profile) => {
    const ref = profile?.auth?.credentialRef;
    if (!ref) return { auth: {}, complete: true };
    const auth = await CredentialsAPI.ResolveProviderCredential({ auth: profile.auth });
    const complete = (ref.fields || []).every((field) => Object.prototype.hasOwnProperty.call(auth, field));
    return { auth, complete };
  };

  const openFileConnectionProfile = async (profile, { load = true } = {}) => {
    const provider = fileProviders.find((item) => item.type === profile.providerType);
    if (!provider) {
      openExtensionsForProvider(profile.providerType);
      return;
    }
    setSelectedNav('files');
    setFileProviderType(provider.type);
    setFileConnectionProfileId(profile.id);
    setFileCredentialEditing(false);
    setFileEntries([]);
    fileForm.setFieldValue('auth', {});
    fileForm.setFieldsValue(buildFileConnectionFormValues(provider, profile));
    if (!load) return;
    if (!profile.auth?.credentialRef && provider.authFields?.some((field) => field.required)) {
      setFileCredentialEditing(true);
      messageApi.info(t('message.fileCredentialRequired'));
      return;
    }
    setFileLoading(true);
    try {
      const credential = await resolveStoredProviderCredential(profile);
      if (!credential.complete) {
        setFileCredentialEditing(true);
        messageApi.info(t('message.fileCredentialUnavailable'));
        return;
      }
      const auth = credential.auth;
      const request = buildFileConnectionRequest(profile, auth);
      const entries = await FilesAPI.List(request);
      setFileEntries(Array.isArray(entries) ? entries : []);
      markProfilesUsed([profile.id]);
    } catch (error) {
      showOperationError('message.fileListFailed', error, {
        retry: () => openFileConnectionProfile(profile),
      });
    } finally {
      setFileLoading(false);
    }
  };

  const openProfile = async (profile) => {
    if (profile.kind === 'file') {
      await openFileConnectionProfile(profile);
      return;
    }
    if (!isProfileProviderAvailable(profile, connectionProviders)) {
      messageApi.warning(t('message.providerUnavailable'));
      return;
    }
    try {
      const result = await startProfileRequests([profileToRequest(profile)]);
      if (result.createdCount > 0) markProfilesUsed([profile.id]);
    } catch (error) {
      showOperationError('message.credentialFailed', error, {
        retry: () => openProfile(profile),
      });
    }
  };

  const openRecentConnection = async (connection) => {
    const providerType = connection.providerType || connection.request?.providerType;
    if (!providers.some((provider) => provider.type === providerType)) {
      openExtensionsForProvider(providerType);
      return;
    }
    try {
      await startProfileRequests([connection.request || profileToRequest(recentToProfile(connection))]);
    } catch (error) {
      showOperationError('message.credentialFailed', error, {
        retry: () => openRecentConnection(connection),
      });
    }
  };

  const openProfileEditor = (profile) => {
    if (profile.kind === 'file') {
      openFileConnectionProfile(profile, { load: false });
      return;
    }
    openDrawer(profile.providerType, profile);
  };

  const focusProfileSession = (profile) => {
    const summary = profileSessionSummary.get(profile.id);
    if (!summary?.focusSessionId) {
      openProfile(profile);
      return;
    }
    activateSession(summary.focusSessionId);
  };

  const connectionProfileLaunchModel = (profile) => {
    const sessionInfo = profileSessionSummary.get(profile.id) || { activeCount: 0, focusSessionId: '' };
    const providerAvailable = isProfileProviderAvailable(profile, connectionProviders);
    return buildConnectionProfileLaunchModel({
      launching: isProfileConnectionLaunching(profile, connectionLaunchKeys),
      profileKind: profile.kind,
      providerAvailable,
      sessionInfo,
    });
  };

  const connectionHealthPresentation = (profile) => buildConnectionHealthPresentation(
    connectionHealth[profile.id],
    profile,
  );

  const runConnectionProfileLaunchAction = (action, profile) => {
    if (!action) return;
    if (action.disabled) {
      messageApi.warning(action.reasonKey ? t(action.reasonKey) : t('message.providerUnavailable'));
      return;
    }
    if (action.action === 'findExtension') {
      openExtensionsForProvider(profile.providerType);
      return;
    }
    if (action.action === 'focus') {
      focusProfileSession(profile);
      return;
    }
    openProfile(profile);
  };

  const runConnectionProfilePrimaryAction = (profile) => {
    runConnectionProfileLaunchAction(connectionProfileLaunchModel(profile).primary, profile);
  };

  const runConnectionProfileNewAction = (profile) => {
    const launchModel = connectionProfileLaunchModel(profile);
    runConnectionProfileLaunchAction(launchModel.secondary || launchModel.primary, profile);
  };

  const switchSession = (direction) => {
    const nextId = direction === 'previous'
      ? sessionNavigationState.previousId
      : sessionNavigationState.nextId;
    if (!nextId) return;
    activateSession(nextId);
  };

  const activateNextAttentionSession = () => {
    const nextId = resolveNextAttentionSessionId(
      sessions.map((session) => session.id),
      sessionActivity,
      activeKey,
    );
    if (!nextId) {
      messageApi.info(t('message.noUnreadSessionActivity'));
      return;
    }
    setSessionActivity((current) => markSessionActivityRead(current, nextId));
    activateSession(nextId);
  };

  const markAllSessionAttentionRead = () => {
    setSessionActivity((current) => markAllSessionActivityRead(current));
    messageApi.success(t('message.sessionActivityMarkedRead'));
  };

  const runSessionPaletteAction = (action) => {
    if (action === 'restoreClosed') restoreLastClosedSession();
    if (action === 'previousSession') switchSession('previous');
    if (action === 'nextSession') switchSession('next');
    if (action === 'nextAttention') activateNextAttentionSession();
    if (action === 'markAllAttentionRead') markAllSessionAttentionRead();
    if (action === 'reconnect') reconnectSession();
    if (action === 'reconnectDisconnected') reconnectDisconnectedSessions();
    if (action === 'renameSession') openRenameSession();
    if (action === 'protectSession' || action === 'unprotectSession') toggleProtectedSession();
    if (action === 'copySessionTarget') copySessionTarget();
    if (action === 'clearTerminal') clearActiveTerminal();
    if (action === 'copyTranscript') copyTerminalTranscript();
    if (action === 'exportTranscript') exportTerminalTranscript();
    if (action === 'saveAudit') {
      saveCurrentAuditSnapshot(activeKey);
    }
    if (action === 'closeSession') confirmRemoveSession(activeKey);
    if (action === 'closeClosed') confirmCloseClosedSessions();
    if (action === 'closeOthers') confirmCloseOtherSessions();
    if (action === 'closeAll') confirmCloseAllSessions();
    if (action === 'commandHistory') openCommandCenter('history');
    if (action === 'quickCommands') openCommandCenter('library');
  };

  const runConnectionPaletteAction = (action) => {
    if (action === 'newLocalTerminal') launchDefaultTerminal('local');
    if (action === 'quickSsh') openDrawer('ssh');
    if (action === 'newConnection') openConnectionDrawer();
    if (action === 'importSshConfig') openSshConfigImporter();
    if (action === 'importProfiles') profileImportRef.current?.click();
    if (action === 'exportProfiles') exportProfiles();
    if (action === 'openFavorites') openBatchProfiles({ favoritesOnly: true });
    if (action === 'openAllConnections') openBatchProfiles({});
  };

  const confirmDeleteProfile = (profile) => {
    if (settings.confirmDangerousActions === false) {
      deleteProfile(profile.id);
      return;
    }
    modalApi.confirm({
      title: t('confirm.deleteProfileTitle'),
      content: `${profile.displayName} · ${profileDescription(profile)}`,
      okButtonProps: { danger: true },
      okText: t('action.delete'),
      cancelText: t('action.cancel'),
      onOk: () => deleteProfile(profile.id),
    });
  };

  const confirmDeleteSelectedProfiles = () => {
    if (connectionSelectionState.selectedCount === 0) return;
    if (settings.confirmDangerousActions === false) {
      deleteSelectedProfiles();
      return;
    }
    const selectedIds = new Set(selectedProfileIds);
    const activeCount = sessions.filter((session) => (
      session.status !== 'closed' && selectedIds.has(session.request?.profileId)
    )).length;
    const credentialCount = selectedConnectionProfiles.filter((profile) => profile.auth?.credentialRef).length;
    modalApi.confirm({
      title: t('confirm.deleteProfilesTitle', { count: connectionSelectionState.selectedCount }),
      content: t('confirm.deleteProfilesContent', {
        activeCount,
        count: connectionSelectionState.selectedCount,
        credentialCount,
      }),
      okButtonProps: { danger: true },
      okText: t('action.delete'),
      cancelText: t('action.cancel'),
      onOk: deleteSelectedProfiles,
    });
  };

  const commitConnectionGroupChange = (result, messageKey, values = {}) => {
    if (!result || result.changedCount <= 0) {
      messageApi.info(t('message.connectionGroupUnchanged'));
      return false;
    }
    persistProfiles(result.profiles);
    setProfiles(result.profiles);
    messageApi.success(t(messageKey, { count: result.changedCount, ...values }));
    return true;
  };

  const moveProfileToGroup = (profile, targetGroup) => {
    const result = moveConnectionProfilesToGroup(profiles, [profile.id], targetGroup);
    commitConnectionGroupChange(result, 'message.connectionMovedToGroup', {
      name: groupLabel(result.targetGroup || ungroupedKey),
    });
  };

  const moveSelectedProfilesToGroup = (targetGroup) => {
    const result = moveConnectionProfilesToGroup(profiles, selectedProfileIds, targetGroup);
    if (commitConnectionGroupChange(result, 'message.connectionsMovedToGroup', {
      name: groupLabel(result.targetGroup || ungroupedKey),
    })) {
      clearConnectionProfileSelection();
    }
  };

  const setSelectedProfilesFavorite = () => {
    const favorite = !connectionSelectionState.allFavorite;
    const result = updateConnectionProfilesFavorite(profiles, selectedProfileIds, favorite);
    if (result.changedCount <= 0) return;
    persistProfiles(result.profiles);
    setProfiles(result.profiles);
    messageApi.success(t(
      favorite ? 'message.connectionsFavorited' : 'message.connectionsUnfavorited',
      { count: result.changedCount },
    ));
  };

  const setSelectedProfilesAccent = (accent) => {
    const normalized = normalizeConnectionAccent(accent);
    const result = updateConnectionProfilesAccent(profiles, selectedProfileIds, normalized);
    if (result.changedCount <= 0) {
      messageApi.info(t('message.connectionAccentUnchanged'));
      return;
    }
    persistProfiles(result.profiles);
    setProfiles(result.profiles);
    messageApi.success(t('message.connectionsAccentUpdated', {
      color: t(`connection.accent.${normalized}`),
      count: result.changedCount,
    }));
  };

  const clearConnectionProfileDrag = () => {
    draggedProfileIdRef.current = '';
    setConnectionDragState({ profileId: '', targetKey: '' });
  };

  const beginConnectionProfileDrag = (event, profile) => {
    if (isInteractiveControl(event.target)) {
      event.preventDefault();
      return;
    }
    draggedProfileIdRef.current = profile.id;
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', profile.id);
    setConnectionDragState({ profileId: profile.id, targetKey: '' });
  };

  const connectionProfileDropPlan = (item) => {
    const profileId = draggedProfileIdRef.current;
    const profile = profiles.find((candidate) => candidate.id === profileId);
    return profile ? resolveConnectionProfileDrop(profile, item) : null;
  };

  const allowConnectionProfileDrop = (event, item) => {
    const plan = connectionProfileDropPlan(item);
    if (!plan) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
    if (connectionDragState.targetKey !== plan.targetKey) {
      setConnectionDragState((current) => ({ ...current, targetKey: plan.targetKey }));
    }
  };

  const leaveConnectionProfileDrop = (event, item) => {
    if (event.currentTarget.contains(event.relatedTarget)) return;
    setConnectionDragState((current) => (
      current.targetKey === item.key ? { ...current, targetKey: '' } : current
    ));
  };

  const dropConnectionProfile = (event, item) => {
    const plan = connectionProfileDropPlan(item);
    if (plan) event.preventDefault();
    const profile = profiles.find((candidate) => candidate.id === plan?.profileId);
    clearConnectionProfileDrag();
    if (!profile || !plan) return;
    if (plan.action === 'favorite') {
      toggleProfileFavorite(profile.id);
      messageApi.success(t('message.connectionFavorited', { name: profile.displayName }));
      return;
    }
    moveProfileToGroup(profile, plan.targetGroup);
  };

  const openNewGroupForProfile = (profile) => setConnectionGroupEditor({
    affectedCount: 1,
    mode: 'move',
    profileId: profile.id,
    profileName: profile.displayName,
  });

  const openNewGroupForSelectedProfiles = () => setConnectionGroupEditor({
    affectedCount: connectionSelectionState.selectedCount,
    mode: 'move',
    profileIds: selectedProfileIds,
  });

  const openRenameConnectionGroup = (item) => setConnectionGroupEditor({
    affectedCount: item.total,
    mode: 'rename',
    sourceGroup: item.groupKey,
  });

  const saveConnectionGroupEdit = (targetGroup) => {
    if (!connectionGroupEditor) return;
    if (connectionGroupEditor.mode === 'rename') {
      const result = renameConnectionGroup(
        profiles,
        connectionGroupEditor.sourceGroup,
        targetGroup,
      );
      if (commitConnectionGroupChange(result, 'message.connectionGroupRenamed', {
        name: targetGroup,
      })) {
        setGroupQuery(buildConnectionGroupFilter(targetGroup));
      }
    } else if (connectionGroupEditor.profileIds?.length > 0) {
      moveSelectedProfilesToGroup(targetGroup);
    } else {
      const profile = profiles.find((item) => item.id === connectionGroupEditor.profileId);
      if (profile) moveProfileToGroup(profile, targetGroup);
    }
    setConnectionGroupEditor(null);
  };

  const confirmRemoveConnectionGroup = (item) => requestDangerousAction({
    actionKey: 'action.removeGroup',
    contentKey: 'confirm.removeConnectionGroupContent',
    contentValues: {
      count: item.total,
      name: groupLabel(item.groupKey),
    },
    onConfirm: () => {
      const result = removeConnectionGroup(profiles, item.groupKey);
      if (commitConnectionGroupChange(result, 'message.connectionGroupRemoved', {
        name: groupLabel(item.groupKey),
      })) {
        setGroupQuery(buildConnectionGroupFilter(ungroupedKey));
      }
    },
    titleKey: 'confirm.removeConnectionGroupTitle',
    titleValues: { name: groupLabel(item.groupKey) },
  });

  const runProfileAction = (action, profile) => {
    if (action === 'connect') runConnectionProfileNewAction(profile);
    if (action === 'test') testConnectionProfile(profile);
    if (action === 'edit') openProfileEditor(profile);
    if (action === 'portForwarding') openTunnelForProfile(profile);
    if (action === 'rename') openProfileEditor(profile);
    if (action === 'duplicate') duplicateProfile(profile);
    if (action === 'favorite' || action === 'unfavorite') toggleProfileFavorite(profile.id);
    if (action === 'moveGroup:new') openNewGroupForProfile(profile);
    if (action.startsWith('moveGroup:group:')) {
      const groupFilter = action.slice('moveGroup:'.length);
      moveProfileToGroup(profile, resolveConnectionGroupFilter(groupFilter).group);
    }
    if (action === 'delete') confirmDeleteProfile(profile);
  };

  const buildConnectionProfileActionMenu = (profile) => {
    const launchModel = connectionProfileLaunchModel(profile);
    const primaryAction = launchModel.primary;
    const newSessionAction = launchModel.secondary || primaryAction;
    const health = connectionHealthPresentation(profile);
    const currentGroup = profile.group || ungroupedKey;
    const groupTargets = [...connectionGroupNames, ungroupedKey]
      .filter((group) => group !== currentGroup)
      .map((group) => ({
        key: `moveGroup:${buildConnectionGroupFilter(group)}`,
        label: groupLabel(group),
      }));
    const items = profileActionModel(profile)
      .filter((action) => action !== 'connect' || primaryAction.action === 'focus')
      .map((action) => ({
        key: action,
        danger: action === 'delete',
        disabled: action === 'connect' && newSessionAction.disabled,
        icon: connectionProfileActionIcon(action),
        label: t(action === 'connect'
          ? profile.kind === 'file' ? 'action.openFiles' : 'action.newTerminal'
          : `profile.action.${action}`),
      }));
    const editIndex = items.findIndex((item) => item.key === 'edit');
    items.splice(editIndex < 0 ? 0 : editIndex + 1, 0, {
      key: 'test',
      disabled: profile.providerType === 'local'
        || !isProfileProviderAvailable(profile, connectionProviders)
        || health?.status === 'checking',
      icon: health?.status === 'checking' ? <LoadingOutlined spin /> : <ApiOutlined />,
      label: t('action.testConnection'),
    });
    const deleteIndex = items.findIndex((item) => item.key === 'delete');
    items.splice(deleteIndex < 0 ? items.length : deleteIndex, 0,
      { type: 'divider' },
      {
        key: 'moveGroup',
        icon: <FolderOpenOutlined />,
        label: t('action.moveToGroup'),
        children: [
          ...groupTargets,
          ...(groupTargets.length > 0 ? [{ type: 'divider' }] : []),
          { key: 'moveGroup:new', icon: <PlusOutlined />, label: t('action.newGroup') },
        ],
      });
    return {
      items,
      onClick: ({ domEvent, key }) => {
        domEvent?.stopPropagation();
        runProfileAction(key, profile);
      },
    };
  };

  const connectionSelectionMoveMenu = {
    items: [
      ...[...connectionGroupNames, ungroupedKey].map((group) => ({
        key: buildConnectionGroupFilter(group),
        label: groupLabel(group),
      })),
      ...(profiles.length > 0 ? [{ type: 'divider' }] : []),
      { key: 'new', icon: <PlusOutlined />, label: t('action.newGroup') },
    ],
    onClick: ({ key }) => {
      if (key === 'new') openNewGroupForSelectedProfiles();
      else moveSelectedProfilesToGroup(resolveConnectionGroupFilter(key).group);
    },
  };

  const openConnectionTagEditor = () => {
    setConnectionTagEditor({ action: 'add', values: [] });
  };

  const applySelectedConnectionTags = () => {
    if (!connectionTagEditor) return;
    const values = normalizeConnectionTags(connectionTagEditor.values);
    if (values.length === 0) {
      messageApi.warning(t('validation.connectionTagRequired'));
      return;
    }
    const result = values.reduce((current, tag) => {
      const update = updateConnectionProfilesTag(
        current.profiles,
        selectedProfileIds,
        tag,
        connectionTagEditor.action,
      );
      return {
        changedCount: current.changedCount + update.changedCount,
        profiles: update.profiles,
      };
    }, { changedCount: 0, profiles });
    if (result.changedCount === 0) {
      messageApi.info(t('message.connectionTagsUnchanged'));
      setConnectionTagEditor(null);
      return;
    }
    persistProfiles(result.profiles);
    setProfiles(result.profiles);
    setConnectionTagEditor(null);
    messageApi.success(t(
      connectionTagEditor.action === 'remove'
        ? 'message.connectionTagsRemoved'
        : 'message.connectionTagsAdded',
      { count: result.changedCount },
    ));
  };

  const buildConnectionGroupActionMenu = (item) => ({
    items: [
      {
        key: 'openGroup',
        disabled: selectBatchProfiles(profiles, {
          availableProviders: providers,
          group: item.key,
        }).length === 0,
        icon: <ThunderboltOutlined />,
        label: t('action.openGroup'),
      },
      {
        key: 'newConnection',
        icon: <PlusOutlined />,
        label: t('action.newConnectionInGroup'),
      },
      ...(item.groupKey !== ungroupedKey ? [
        { type: 'divider' },
        { key: 'renameGroup', icon: <EditOutlined />, label: t('action.renameGroup') },
        { key: 'removeGroup', danger: true, icon: <DeleteOutlined />, label: t('action.removeGroup') },
      ] : []),
    ],
    onClick: ({ domEvent, key }) => {
      domEvent?.stopPropagation();
      if (key === 'openGroup') openBatchProfiles({ group: item.key });
      if (key === 'newConnection') {
        openConnectionDrawer(
          terminalDefaults.defaultProviderType,
          item.groupKey === ungroupedKey ? '' : item.groupKey,
        );
      }
      if (key === 'renameGroup') openRenameConnectionGroup(item);
      if (key === 'removeGroup') confirmRemoveConnectionGroup(item);
    },
  });

  const clearProfileFilters = () => {
    setProfileQuery('');
    setGroupQuery('all');
    setProviderFilter('all');
    setTagFilter('');
  };

  const updateConnectionWorkspace = (patch) => {
    setConnectionWorkspacePreferences((current) => persistConnectionWorkspacePreferences(
      updateConnectionWorkspacePreferences(current, patch),
    ));
  };

  const openBatchProfiles = async (options) => {
    const allSelectedProfiles = selectBatchProfiles(profiles, {
      sortBy: profileSort,
      ...options,
    });
    const selectedProfiles = selectBatchProfiles(profiles, {
      availableProviders: providers,
      sortBy: profileSort,
      ...options,
    });
    const skipped = allSelectedProfiles.length - selectedProfiles.length;
    if (selectedProfiles.length === 0) {
      messageApi.info(skipped > 0 ? t('message.noAvailableBatchConnections') : t('message.noBatchConnections'));
      return;
    }
    try {
      const result = await startProfileRequests(selectedProfiles.map(profileToRequest));
      markProfilesUsed(result.createdProfileIds);
      if (skipped > 0) {
        messageApi.warning(`${t('message.batchConnectionsSkipped')}: ${skipped}`);
      }
    } catch (error) {
      showOperationError('message.credentialFailed', error, {
        retry: () => openBatchProfiles(options),
      });
    }
  };

  const openSelectedProfiles = async () => {
    const openableProfiles = selectedConnectionProfiles.filter((profile) => (
      profile.kind !== 'file' && isProfileProviderAvailable(profile, providers)
    ));
    const skipped = selectedConnectionProfiles.length - openableProfiles.length;
    if (openableProfiles.length === 0) {
      messageApi.info(t('message.noAvailableBatchConnections'));
      return;
    }
    try {
      const result = await startProfileRequests(openableProfiles.map(profileToRequest));
      markProfilesUsed(result.createdProfileIds);
      if (skipped > 0) {
        messageApi.warning(t('message.selectedConnectionsSkipped', { count: skipped }));
      }
    } catch (error) {
      showOperationError('message.credentialFailed', error, {
        retry: openSelectedProfiles,
      });
    }
  };

  const testSelectedConnections = async () => {
    const plan = buildConnectionProbePlan(
      profiles,
      selectedProfileIds,
      connectionProviders,
      connectionHealthRef.current,
    );
    const skipped = Object.values(plan.skipped).reduce((total, count) => total + count, 0);
    if (plan.probeableProfiles.length === 0) {
      messageApi.info(t('message.connectionHealthNoTargets'));
      return;
    }
    updateConnectionHealth((current) => beginConnectionProbes(current, plan.probeableProfiles));
    const queueResults = await runConnectionProbeQueue(
      plan.probeableProfiles,
      (profile) => testConnectionProfile(profile, { reserved: true, silent: true }),
      3,
    );
    const results = queueResults.map((result) => (
      result.status === 'fulfilled' ? result.value : { status: 'error' }
    ));
    const succeeded = results.filter((result) => result.status === 'success').length;
    const failed = results.length - succeeded;
    const summary = t('connection.health.batchSummary', { failed, skipped, succeeded });
    if (failed > 0) messageApi.warning(summary);
    else messageApi.success(summary);
  };

  const markProfilesUsed = (profileIds) => {
    const usedIds = new Set(profileIds.filter(Boolean));
    if (usedIds.size === 0) return;
    const usedAt = new Date().toISOString();
    const nextProfiles = profiles.map((profile) => (
      usedIds.has(profile.id) ? { ...profile, lastUsedAt: usedAt } : profile
    ));
    persistProfiles(nextProfiles);
    setProfiles(nextProfiles);
  };

  const clearRecentConnections = () => {
    persistRecentConnections([]);
    setRecentConnections([]);
    messageApi.success(t('message.recentCleared'));
  };

  const dismissRecentConnection = (connection) => {
    setRecentConnections((current) => {
      const next = removeRecentConnection(current, connection.id);
      if (next === current) return current;
      persistRecentConnections(next);
      return next;
    });
    messageApi.success(t('message.recentRemoved', { name: connection.displayName }));
  };

  const exportProfiles = (profilesToExport = profiles, filename = 'galaxyterm-profiles.json') => {
    downloadJson(filename, buildConnectionProfilesExport(profilesToExport));
  };

  const exportSelectedProfiles = () => {
    if (selectedConnectionProfiles.length === 0) return;
    exportProfiles(selectedConnectionProfiles, 'galaxyterm-profiles-selected.json');
    messageApi.success(t('message.connectionsExported', { count: selectedConnectionProfiles.length }));
  };

  const openConnectionImportReview = (importedProfiles, source) => {
    if (!Array.isArray(importedProfiles) || importedProfiles.length === 0) {
      messageApi.warning(t('message.noImportableConnections'));
      return;
    }
    setConnectionImportReview({
      importedProfiles,
      plan: buildConnectionImportPlan(profiles, importedProfiles),
      source,
    });
    setConnectionImportStrategy('skip');
  };

  const closeConnectionImportReview = () => {
    if (connectionImportApplying) return;
    setConnectionImportReview(null);
  };

  const confirmConnectionImport = async () => {
    if (!connectionImportReview || connectionImportApplying) return;
    setConnectionImportApplying(true);
    try {
      const result = applyConnectionImportPlan(profiles, connectionImportReview.plan, connectionImportStrategy);
      persistProfiles(result.profiles);
      setProfiles(result.profiles);
      updateConnectionHealth((current) => clearConnectionHealth(current, result.updatedProfileIds));
      const credentialCleanup = await Promise.allSettled(
        result.clearedCredentialProfiles.map(deleteProfileCredential),
      );
      const credentialCleanupFailed = countConnectionImportCredentialCleanupFailures(credentialCleanup);
      if (connectionImportReview.source === 'sshConfig') setSshConfigContent('');
      setConnectionImportReview(null);
      messageApi.success(t('message.connectionImportSummary', result.summary));
      if (credentialCleanupFailed > 0) {
        messageApi.warning(t('message.connectionImportCredentialCleanupFailed', {
          count: credentialCleanupFailed,
        }));
      }
    } catch (error) {
      showOperationError('message.profileImportFailed', error);
    } finally {
      setConnectionImportApplying(false);
    }
  };

  const importProfiles = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    try {
      const payload = JSON.parse(await file.text());
      const incoming = Array.isArray(payload) ? payload : payload.profiles;
      if (!Array.isArray(incoming)) throw new Error('invalid profiles');
      const normalized = incoming.map(normalizeImportedConnectionProfile).filter(Boolean);
      openConnectionImportReview(normalized, 'json');
    } catch (error) {
      showOperationError('message.profileImportFailed', error);
    }
  };

  const runConnectionTransferAction = (action) => {
    if (action === 'importSshConfig') openSshConfigImporter();
    if (action === 'importProfiles') profileImportRef.current?.click();
    if (action === 'exportProfiles') exportProfiles();
  };

  const importSshConfigProfiles = () => {
    const importedProfiles = parseSshConfigProfiles(sshConfigContent);
    if (importedProfiles.length === 0) {
      messageApi.warning(t('message.sshConfigEmpty'));
      return;
    }
    setSshConfigOpen(false);
    openConnectionImportReview(importedProfiles, 'sshConfig');
  };

  const selectSshConfigFile = async () => {
    setSshConfigLoading(true);
    try {
      const selection = await DesktopAPI.SelectSSHConfig();
      if (!selection?.canceled && typeof selection?.content === 'string') {
        setSshConfigContent(selection.content);
      }
    } catch (error) {
      showOperationError('message.sshConfigReadFailed', error);
    } finally {
      setSshConfigLoading(false);
    }
  };

  const openSshConfigImporter = () => {
    setSshConfigOpen(true);
    selectSshConfigFile();
  };

  const dispatchQuickCommand = (command, appendEnter = true) => {
    const dispatch = buildQuickCommandDispatch(command, { appendEnter });
    if (!dispatch.ok) {
      if (dispatch.reason === 'sensitive') messageApi.warning(t('message.quickCommandSensitiveSkipped'));
      return false;
    }
    if (!quickCommandSummary.canRun) {
      messageApi.warning(t('message.noReadySession'));
      return false;
    }
    const activeTerminal = terminalRefs.current[activeKey];
    if (!activeTerminal?.send) {
      messageApi.warning(t('message.noActiveSession'));
      return false;
    }
    activeTerminal.send(dispatch.data);
    appendAuditEvent(activeKey, `quick-command.${dispatch.mode}`, command);
    if (dispatch.mode === 'insert') messageApi.success(t('message.commandInserted'));
    closeCommandCenter();
    setPaletteOpen(false);
    return true;
  };

  const runQuickCommand = (command) => dispatchQuickCommand(command, true);
  const insertQuickCommand = (command) => dispatchQuickCommand(command, false);

  const recordCommandHistory = (command, session = activeSession) => {
    if (settings.recordCommandHistory === false) return;
    const result = buildCommandHistoryEntryResult(command, {
      providerType: session?.providerType,
      sessionId: session?.id || activeKey,
      sessionLabel: session?.label || '',
    });
    const { entry, skippedReason } = result;
    if (skippedReason === 'sensitive') {
      messageApi.warning(t('message.commandHistorySensitiveSkipped'));
    }
    if (!entry) return;
    setCommandHistory((current) => {
      const nextHistory = upsertCommandHistory(current, entry, { limit: settings.commandHistoryLimit });
      persistCommandHistory(nextHistory, settings.commandHistoryLimit);
      return nextHistory;
    });
  };

  const runHistoryCommand = (item) => {
    if (!item?.command) return;
    runQuickCommand(item.command);
  };

  const toggleCommandHistoryFavorite = (item) => {
    const nextHistory = toggleCommandHistoryFavoriteItem(commandHistory, item);
    persistCommandHistory(nextHistory, settings.commandHistoryLimit);
    setCommandHistory(nextHistory);
  };

  const deleteCommandHistoryItem = (item) => {
    const nextHistory = removeCommandHistoryItem(commandHistory, item);
    persistCommandHistory(nextHistory, settings.commandHistoryLimit);
    setCommandHistory(nextHistory);
    messageApi.success(t('message.commandHistoryItemDeleted'));
  };

  const updateCommandHistoryLimit = (value) => {
    const limit = clampNumber(value, 20, 500, defaultSettings.commandHistoryLimit);
    const nextHistory = pruneCommandHistory(commandHistory, limit);
    persistCommandHistory(nextHistory, limit);
    setCommandHistory(nextHistory);
    setSettings((current) => ({ ...current, commandHistoryLimit: limit }));
  };

  const clearVisibleCommandHistory = () => {
    const scopeKey = historyScope === 'session' ? 'history.scope.session' : historyScope === 'all' ? 'history.scope.all' : 'history.scope.provider';
    const runClear = () => {
      const nextHistory = clearCommandHistory(commandHistory, {
        providerType: historyScope === 'all' ? 'all' : activeSession?.providerType || 'all',
        query: historyQuery,
        sessionId: historyScope === 'session' ? activeKey : '',
      });
      persistCommandHistory(nextHistory, settings.commandHistoryLimit);
      setCommandHistory(nextHistory);
      messageApi.success(t('message.commandHistoryCleared'));
    };
    if (settings.confirmDangerousActions === false) {
      runClear();
      return;
    }
    modalApi.confirm({
      title: t('confirm.clearCommandHistoryTitle'),
      content: t('confirm.clearCommandHistoryContent', {
        count: visibleCommandHistory.length,
        scope: t(scopeKey),
      }),
      okButtonProps: { danger: true },
      okText: t('action.clear'),
      cancelText: t('action.cancel'),
      onOk: runClear,
    });
  };

  const saveHistoryAsQuickCommand = (item) => {
    const quickCommand = buildQuickCommandFromHistory(item, {
      id: globalThis.crypto?.randomUUID?.() || `${Date.now()}`,
    });
    if (!quickCommand) return;
    const alreadySaved = quickCommands.some((command) => (
      command.command === quickCommand.command
      && (command.providerType || 'all') === quickCommand.providerType
    ));
    if (alreadySaved) {
      messageApi.info(t('message.commandAlreadySaved'));
      return;
    }
    const nextCommands = [...quickCommands, quickCommand];
    persistQuickCommands(nextCommands);
    setQuickCommands(nextCommands);
    messageApi.success(t('message.commandSaved'));
  };

  const runPaletteAction = (item) => {
    if (item.disabled) {
      messageApi.warning(item.reasonKey ? t(item.reasonKey) : t('message.providerUnavailable'));
      return false;
    }
    const nextRecentIds = recordPaletteRecent(paletteRecentIds, item.id);
    persistPaletteRecentIds(nextRecentIds);
    setPaletteRecentIds(nextRecentIds);
    item.run();
    setPaletteOpen(false);
    return true;
  };

  const addQuickCommand = async () => {
    const values = await commandForm.validateFields();
    const currentCommand = quickCommands.find((item) => item.id === editingQuickCommandId);
    const nextCommand = {
      id: editingQuickCommandId || globalThis.crypto?.randomUUID?.() || `${Date.now()}`,
      name: values.name,
      command: values.command,
      favorite: currentCommand?.favorite === true,
      providerType: values.providerType || 'all',
    };
    const saveResult = buildQuickCommandSaveResult(nextCommand);
    if (saveResult.skippedReason === 'sensitive') {
      messageApi.warning(t('message.quickCommandSensitiveSkipped'));
      return;
    }
    if (!saveResult.command) return;
    const nextCommands = upsertQuickCommand(quickCommands, saveResult.command);
    persistQuickCommands(nextCommands);
    setQuickCommands(nextCommands);
    commandForm.resetFields();
    setCommandEditorOpen(false);
    setEditingQuickCommandId('');
    messageApi.success(t(editingQuickCommandId ? 'message.commandUpdated' : 'message.commandSaved'));
  };

  const openNewQuickCommand = () => {
    setEditingQuickCommandId('');
    setCommandEditorOpen(true);
  };

  const closeQuickCommandEditor = () => {
    commandForm.resetFields();
    setEditingQuickCommandId('');
    setCommandEditorOpen(false);
  };

  const closeCommandCenter = () => {
    closeQuickCommandEditor();
    setCommandCenterOpen(false);
  };

  const deleteQuickCommand = (id) => {
    const nextCommands = quickCommands.filter((item) => item.id !== id);
    persistQuickCommands(nextCommands);
    setQuickCommands(nextCommands);
    if (editingQuickCommandId === id) {
      closeQuickCommandEditor();
    }
    messageApi.success(t('message.commandDeleted'));
  };

  const confirmDeleteQuickCommand = (command) => requestDangerousAction({
    contentKey: 'confirm.deleteQuickCommandContent',
    contentValues: {
      name: command?.name || '-',
      provider: quickCommandProviderLabel(command?.providerType, providers),
    },
    onConfirm: () => deleteQuickCommand(command.id),
    titleKey: 'confirm.deleteQuickCommandTitle',
  });

  const editQuickCommand = (item) => {
    setEditingQuickCommandId(item.id);
    setCommandEditorOpen(true);
  };

  const cancelQuickCommandEdit = () => {
    closeQuickCommandEditor();
  };

  const copyQuickCommand = async (item) => {
    await writeClipboardText(item.command);
    messageApi.success(t('message.copied'));
  };

  const toggleQuickCommandFavorite = (id) => {
    const nextCommands = quickCommands.map((item) => (
      item.id === id ? { ...item, favorite: !item.favorite } : item
    ));
    persistQuickCommands(nextCommands);
    setQuickCommands(nextCommands);
  };

  const updateTerminalStatus = (sessionId, status, revision) => {
    updateSessionReconnects((current) => releaseSessionReconnect(
      current,
      sessionId,
      revision,
      status?.status || '',
    ));
    setTerminalStatuses((current) => synchronizeSessionTerminalSnapshot(
      current,
      sessionsRef.current,
      sessionId,
      status,
      revision,
    ));
    setSessions((current) => synchronizeSessionTerminalStatus(current, sessionId, status, revision));
    if (status?.status === 'error') scheduleSessionRecovery(sessionId, status, revision);
    if (status?.status === 'connected' || status?.status === 'idle') clearSessionRecovery(sessionId);
  };

  const recordSessionActivity = (sessionId, outputAt) => {
    setSessionActivity((current) => recordSessionOutputActivity(current, {
      activeKey,
      outputAt,
      sessionId,
      visibleSessionIds,
    }));
  };

  const interruptSession = (sessionId = activeKey) => {
    const terminal = terminalRefs.current[sessionId];
    if (!terminal?.interrupt) {
      messageApi.warning(t('message.noActiveSession'));
      return;
    }
    terminal.interrupt();
  };

  const copyTerminalError = async (sessionId) => {
    const error = terminalStatuses[sessionId]?.error || '';
    if (!error) {
      messageApi.info(t('message.noTerminalError'));
      return;
    }
    try {
      await writeClipboardText(error);
      messageApi.success(t('message.copied'));
    } catch (error_) {
      messageApi.error(`${t('message.clipboardFailed')}: ${error_}`);
    }
  };

  const openSessionAudit = (sessionId) => {
    setActiveKey(sessionId);
    setAuditSessionFilter(sessionId || 'all');
    setSelectedNav('audit');
  };

  const renderTerminalPane = (session) => {
    const recording = terminalRefs.current[session.id]?.recording?.();
    const recordingActive = Boolean(recording?.startedAt) && session.status !== 'closed';
    const providerRuntime = buildProviderRuntimeState(session.providerType, {
      disabledExtensionIds: settings.disabledExtensionIds,
      installedExtensions,
      providers: allProviders,
    });
    return (
      <TerminalFrame
        auditSummary={buildSessionAuditSummary(session, { recordingActive })}
        contextFacts={buildSessionContextFacts(session, {
          providerName: providerTypeLabel(session.providerType, allProviders),
          recordingActive,
        })}
        onCancelRecovery={() => cancelSessionRecovery(session.id)}
        onCopyError={() => copyTerminalError(session.id)}
        onInterrupt={() => interruptSession(session.id)}
        onOpenAudit={() => openSessionAudit(session.id)}
        onManageProvider={() => openProviderExtension(providerRuntime)}
        onReconnect={() => reconnectSession(session.id)}
        providerRuntime={providerRuntime}
        recovery={sessionRecoveries[session.id]}
        reconnecting={isSessionReconnecting(session.id)}
        status={terminalStatuses[session.id]}
      >
        <Suspense fallback={<TerminalLoadingState />}>
          <TerminalPane
            key={`${session.id}-${session.revision || 0}`}
            ref={(el) => {
              terminalRefs.current[session.id] = el;
            }}
            request={session.request}
            settings={settings}
            onAuditEvent={(event) => appendAuditEvent(session.id, event.type, event.detail)}
            onCommandSubmitted={(command) => recordCommandHistory(command, session)}
            onConfirmPaste={confirmTerminalPaste}
            onOutputActivity={(outputAt) => recordSessionActivity(session.id, outputAt)}
            onSearchResultsChange={(result) => updateTerminalSearchResult(session.id, result)}
            onSessionCreated={(backendSessionId) => {
              clearSessionRecovery(session.id);
              updateSessionReconnects((current) => releaseSessionReconnect(
                current,
                session.id,
                session.revision || 0,
                'connected',
              ));
              setSessions((current) => synchronizeSessionCreated(
                current,
                session.id,
                backendSessionId,
                session.revision || 0,
              ));
            }}
            onSessionClosed={(backendSessionId) => updateSessionStatus(backendSessionId, 'closed')}
            onStatusChange={(status) => updateTerminalStatus(session.id, status, session.revision || 0)}
          />
        </Suspense>
      </TerminalFrame>
    );
  };

  const runSessionTabAction = (action, session) => {
    if (action === 'rename') openRenameSession(session);
    if (action === 'protect' || action === 'unprotect') toggleProtectedSession(session.id);
    if (action === 'copyTarget') copySessionTarget(session);
    if (action === 'reconnect') reconnectSession(session.id);
    if (action === 'duplicate') duplicateSession(session);
    if (action === 'moveLeft') setSessions((current) => moveSessionInOrder(current, session.id, 'previous'));
    if (action === 'moveRight') setSessions((current) => moveSessionInOrder(current, session.id, 'next'));
    if (action === 'closeLeft') confirmCloseDirectionalSessions('left', session.id);
    if (action === 'closeRight') confirmCloseDirectionalSessions('right', session.id);
    if (action === 'closeOthers') confirmCloseOtherSessions(session.id);
    if (action === 'closeCurrent') confirmRemoveSession(session.id);
  };
  const buildSessionActionMenu = (session) => {
    const sessionIndex = sessions.findIndex((item) => item.id === session.id);
    const identityDisplay = sessionIdentityDisplays[session.id];
    const reconnecting = isSessionReconnecting(session.id);
    const closeOtherPlan = buildSessionClosePlan(sessions, {
      keepSessionId: session.id,
      mode: 'others',
    });
    const closeLeftPlan = buildSessionClosePlan(sessions, {
      anchorSessionId: session.id,
      mode: 'left',
    });
    const closeRightPlan = buildSessionClosePlan(sessions, {
      anchorSessionId: session.id,
      mode: 'right',
    });
    const menuItems = buildSessionTabMenuModel({
      closableLeftCount: closeLeftPlan.closingSessions.length,
      closableOtherCount: closeOtherPlan.closingSessions.length,
      closableRightCount: closeRightPlan.closingSessions.length,
      hasTarget: Boolean(identityDisplay?.copyValue),
      protected: session.protected,
      reconnecting,
      sessionCount: sessions.length,
      sessionIndex,
    }).flatMap((action) => [
      ...(action.dividerBefore || action.key === 'closeOthers'
        ? [{ key: `divider-${action.key}`, type: 'divider' }]
        : []),
      {
        key: action.key,
        danger: action.danger,
        disabled: action.disabled,
        icon: action.key === 'reconnect' && reconnecting
          ? <LoadingOutlined spin />
          : sessionTabActionIcon(action.key),
        label: t(action.labelKey),
      },
    ]);
    return {
      items: menuItems,
      onClick: ({ domEvent, key }) => {
        domEvent?.stopPropagation();
        runSessionTabAction(key, session);
      },
    };
  };
  const beginSessionDrag = (event, sessionId) => {
    draggedSessionIdRef.current = sessionId;
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', sessionId);
    event.currentTarget.classList.add('dragging');
  };
  const endSessionDrag = (event) => {
    draggedSessionIdRef.current = '';
    event.currentTarget.classList.remove('dragging');
  };
  const allowSessionDrop = (event) => {
    if (!draggedSessionIdRef.current) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  };
  const dropSessionAt = (event, targetId, axis = 'x') => {
    event.preventDefault();
    const sourceId = draggedSessionIdRef.current || event.dataTransfer.getData('text/plain');
    const bounds = event.currentTarget.getBoundingClientRect();
    const pointer = axis === 'y' ? event.clientY : event.clientX;
    const midpoint = axis === 'y'
      ? bounds.top + bounds.height / 2
      : bounds.left + bounds.width / 2;
    setSessions((current) => reorderSessions(
      current,
      sourceId,
      targetId,
      pointer >= midpoint ? 'after' : 'before',
    ));
    draggedSessionIdRef.current = '';
  };
  const items = sessions.map((session) => {
    const identityDisplay = sessionIdentityDisplays[session.id];
    return {
      key: session.id,
      label: (
        <Dropdown
          menu={buildSessionActionMenu(session)}
          trigger={['contextMenu']}
        >
          <span
            className="session-tab-context-trigger"
            draggable={sessions.length > 1}
            onDragEnd={endSessionDrag}
            onDragOver={allowSessionDrop}
            onDragStart={(event) => beginSessionDrag(event, session.id)}
            onDrop={(event) => dropSessionAt(event, session.id)}
            onDoubleClick={(event) => {
              event.stopPropagation();
              openRenameSession(session);
            }}
          >
            <SessionTabLabel
              accent={sessionAccents[session.id]}
              active={session.id === activeKey}
              activityKind={sessionActivity[session.id]?.kind}
              displayName={sessionDisplayLabels[session.id]}
              identityDisplay={identityDisplay}
              session={session}
              unread={sessionActivity[session.id]?.unread}
            />
          </span>
        </Dropdown>
      ),
      closable: !session.protected,
    };
  });

  const renderSessions = () => {
    if (sessions.length === 0) {
      return (
        <SessionEmptyPanel
          connectionLaunchKeys={connectionLaunchKeys}
          localTerminalLaunching={isDefaultTerminalLaunching('local')}
          openConnections={() => setSelectedNav('connections')}
          openDefaultTerminal={launchDefaultTerminal}
          openDrawer={openDrawer}
          openProfile={openProfile}
          openRecentConnection={openRecentConnection}
          profiles={profiles}
          providers={providers}
          recentConnections={visibleRecentConnections}
          restoreWorkspace={restoreWorkspace}
          workspaceSnapshot={buildWorkspaceSnapshotSummary(workspaceSummary)}
        />
      );
    }
    const sessionToolbarModel = buildSessionToolbarModel({
      activeKey,
      activeProtected: activeSession?.protected,
      attentionCount: unreadSessionCount,
      broadcastReadyCount: broadcastTargets.length,
      canNavigate: sessionNavigationState.canNavigate,
      closableOtherCount: sessionClosePlans.others.closingSessions.length,
      closedCount: sessionClosePlans.closed.closingSessions.length,
      reconnecting: isSessionReconnecting(activeKey),
      recoverableCount: sessionReconnectBatchActionCount,
      sessionCount: sessions.length,
      terminalStatus: activeTerminalStatus,
      view: sessionView,
    });
    const sessionToolbarContext = buildSessionToolbarContext(activeSession, {
      providerName: activeSession
        ? providerTypeLabel(activeSession.providerType, allProviders)
        : '',
    });
    const runSessionToolbarAction = (action) => {
      if (action === 'grid') setSessionView('grid');
      if (action === 'tabs') setSessionView('tabs');
      if (action === 'nextAttention') activateNextAttentionSession();
      if (action === 'markAllAttentionRead') markAllSessionAttentionRead();
      if (action === 'interrupt') interruptSession();
      if (action === 'reconnect') reconnectSession();
      if (action === 'reconnectDisconnected') reconnectDisconnectedSessions();
      if (action === 'rename') openRenameSession();
      if (action === 'protect' || action === 'unprotect') toggleProtectedSession();
      if (action === 'broadcast') openBroadcastCommand();
      if (action === 'closeClosed') confirmCloseClosedSessions();
      if (action === 'closeOthers') confirmCloseOtherSessions();
      if (action === 'closeCurrent') confirmRemoveSession(activeKey);
    };
    const sessionToolbarActions = (
      <div className="session-tab-extra">
        {sessionToolbarContext && (
          <SessionToolbarContext
            model={sessionToolbarContext}
            onCopyTarget={() => copySessionTarget(activeSession)}
          />
        )}
        <SessionToolbarActions model={sessionToolbarModel} onAction={runSessionToolbarAction} />
      </div>
    );
    return (
      <div className={`session-tabs-page view-${sessionView}`}>
        <Tabs
          className="terminal-tabs"
          type="editable-card"
          hideAdd={false}
          addIcon={<PlusOutlined />}
          activeKey={activeKey}
          onChange={activateSession}
          onTabClick={focusTerminalSession}
          onEdit={(targetKey, action) => {
            if (action === 'add') openDrawer();
            if (action === 'remove') confirmRemoveSession(targetKey);
          }}
          items={items}
          tabBarExtraContent={sessionToolbarActions}
        />
        <div className={`terminal-pane-deck view-${sessionView}`}>
          {sessions.map((session) => (
            <section
              className={`terminal-pane-slot${session.id === activeKey ? ' active' : ''}`}
              key={session.id}
              onMouseDown={(event) => {
                if (isInteractiveControl(event.target)) return;
                activateSession(session.id);
              }}
            >
              {sessionView === 'grid' && (
                <div className="split-terminal-header">
                  <SessionTabLabel
                    accent={sessionAccents[session.id]}
                    active={session.id === activeKey}
                    activityKind={sessionActivity[session.id]?.kind}
                    displayName={sessionDisplayLabels[session.id]}
                    identityDisplay={sessionIdentityDisplays[session.id]}
                    session={session}
                    unread={sessionActivity[session.id]?.unread}
                  />
                  <Space size={2}>
                    <Tooltip title={t(session.protected ? 'action.unprotectSession' : 'action.protectSession')}>
                      <Button
                        aria-label={t(session.protected ? 'action.unprotectSession' : 'action.protectSession')}
                        size="small"
                        type="text"
                        icon={session.protected ? <UnlockOutlined /> : <LockOutlined />}
                        onClick={() => toggleProtectedSession(session.id)}
                      />
                    </Tooltip>
                    <Tooltip title={t('action.renameSession')}>
                      <Button
                        aria-label={t('action.renameSession')}
                        size="small"
                        type="text"
                        icon={<EditOutlined />}
                        onClick={() => openRenameSession(session)}
                      />
                    </Tooltip>
                    <Tooltip title={t('action.reconnect')}>
                      <Button
                        aria-label={t('action.reconnect')}
                        disabled={isSessionReconnecting(session.id)}
                        size="small"
                        type="text"
                        icon={<ReloadOutlined />}
                        loading={isSessionReconnecting(session.id)}
                        onClick={() => reconnectSession(session.id)}
                      />
                    </Tooltip>
                    <Tooltip title={t('action.duplicate')}>
                      <Button
                        aria-label={t('action.duplicate')}
                        size="small"
                        type="text"
                        icon={<CopyOutlined />}
                        onClick={() => duplicateSession(session)}
                      />
                    </Tooltip>
                    <Tooltip title={t(session.protected ? 'palette.reason.protectedSession' : 'action.closeSession')}>
                      <span className="tooltip-button-wrapper">
                        <Button
                          aria-label={t('action.closeSession')}
                          danger
                          disabled={session.protected}
                          size="small"
                          type="text"
                          icon={<DeleteOutlined />}
                          onClick={() => confirmRemoveSession(session.id)}
                        />
                      </span>
                    </Tooltip>
                  </Space>
                </div>
              )}
              <div className="terminal-workspace">
                {renderTerminalPane(session)}
              </div>
            </section>
          ))}
        </div>
      </div>
    );
  };

  const renderConnectionProfilePreview = (profile) => profile ? (
    <ConnectionProfilePreview
      health={connectionHealthPresentation(profile)}
      profile={profile}
      launching={isProfileConnectionLaunching(profile, connectionLaunchKeys)}
      providers={connectionProviders}
      openProfileEditor={openProfileEditor}
      openTunnelForProfile={openTunnelForProfile}
      duplicateProfile={duplicateProfile}
      profileSessionSummary={profileSessionSummary}
      runConnectionProfileLaunchAction={runConnectionProfileLaunchAction}
      testConnectionProfile={testConnectionProfile}
      toggleProfileFavorite={toggleProfileFavorite}
      confirmDeleteProfile={confirmDeleteProfile}
    />
  ) : null;

  const renderConnections = () => (
    <div className="workspace-page connections-page">
      <div className="page-header connection-page-header">
        <div>
          <Title level={3}>{t('section.connectionManager')}</Title>
          <div className="connection-summary-strip">
            <span>{`${t('metric.savedConnections')}: ${workspaceInsights.profiles.total}`}</span>
            <span>{`${t('label.favorite')}: ${workspaceInsights.profiles.favorites}`}</span>
            <span>{`${t('metric.activeSessions')}: ${workspaceInsights.sessions.active}`}</span>
            <span>{`${t('metric.providers')}: ${workspaceInsights.providers.total}`}</span>
          </div>
        </div>
        <Space>
          <Button icon={<CloudServerOutlined />} onClick={() => openDrawer('ssh')}>
            {t('action.quickSsh')}
          </Button>
          <Button type="primary" icon={<PlusOutlined />} onClick={() => openConnectionDrawer()}>
            {t('action.newConnection')}
          </Button>
        </Space>
      </div>

      <div className={showInlineConnectionDetail ? 'connection-manager-layout' : 'connection-manager-layout no-detail'}>
        <aside className="connection-groups-panel">
          <div className="connection-panel-head">
            <Text strong>{t('section.connectionGroups')}</Text>
            <div className="connection-panel-actions">
              <Tooltip title={t('action.openFavorites')}>
                <span className="connection-panel-action-trigger">
                  <Button
                    aria-label={t('action.openFavorites')}
                    size="small"
                    type="text"
                    icon={<StarFilled />}
                    onClick={() => openBatchProfiles({ favoritesOnly: true })}
                    disabled={!profiles.some((profile) => profile.favorite)}
                  />
                </span>
              </Tooltip>
              <Tooltip title={t(connectionGroupCreateTarget ? 'action.newConnectionInGroup' : 'action.newConnection')}>
                <Button
                  aria-label={t(connectionGroupCreateTarget ? 'action.newConnectionInGroup' : 'action.newConnection')}
                  size="small"
                  type="text"
                  icon={<PlusOutlined />}
                  onClick={() => openConnectionDrawer(terminalDefaults.defaultProviderType, connectionGroupCreateTarget)}
                />
              </Tooltip>
            </div>
          </div>
          <div className="connection-group-nav">
            {connectionGroupNav.map((item) => {
              const row = (
                <div
                  className={[
                    'connection-group-nav-item',
                    groupQuery === item.key ? 'active' : '',
                    connectionDragState.targetKey === item.key ? 'drop-target' : '',
                  ].filter(Boolean).join(' ')}
                  onDragLeave={(event) => leaveConnectionProfileDrop(event, item)}
                  onDragOver={(event) => allowConnectionProfileDrop(event, item)}
                  onDrop={(event) => dropConnectionProfile(event, item)}
                >
                  <button
                    aria-current={groupQuery === item.key ? 'page' : undefined}
                    className="connection-group-nav-activate"
                    type="button"
                    onClick={() => setGroupQuery(item.key)}
                  >
                    <span className="connection-group-nav-label">
                      <span>{connectionGroupLabel(item)}</span>
                      {(item.favoriteCount > 0 || item.credentialCount > 0) && (
                        <small>
                          {[
                            item.favoriteCount > 0 ? `${t('label.favorite')}: ${item.favoriteCount}` : '',
                            item.credentialCount > 0 ? `${t('label.credentialSaved')}: ${item.credentialCount}` : '',
                          ].filter(Boolean).join(' · ')}
                        </small>
                      )}
                    </span>
                    <strong>{item.total}</strong>
                  </button>
                  {item.type === 'group' && (
                    <Dropdown menu={buildConnectionGroupActionMenu(item)} trigger={['click']}>
                      <button
                        aria-label={t('action.manageGroup')}
                        className="connection-group-nav-menu"
                        title={t('action.manageGroup')}
                        type="button"
                        onClick={(event) => event.stopPropagation()}
                      >
                        <MoreOutlined />
                      </button>
                    </Dropdown>
                  )}
                </div>
              );
              return item.type === 'group' ? (
                <Dropdown key={item.key} menu={buildConnectionGroupActionMenu(item)} trigger={['contextMenu']}>
                  {row}
                </Dropdown>
              ) : <React.Fragment key={item.key}>{row}</React.Fragment>;
            })}
          </div>
        </aside>

        <section className="connection-list-panel">
          <div className="connection-list-header">
            <div>
              <Title level={4}>{connectionGroupLabel(activeConnectionGroup)}</Title>
              <Text type="secondary">{`${t('metric.visibleConnections')}: ${visibleProfiles.length}`}</Text>
            </div>
            <Space wrap>
              {hasProfileFilters && (
                <Button size="small" onClick={clearProfileFilters}>{t('action.clearFilters')}</Button>
              )}
              <Button
                size="small"
                onClick={() => openBatchProfiles({
                  ...(groupQuery === 'favorites' ? { favoritesOnly: true } : { group: groupQuery }),
                  providerType: providerFilter,
                  tag: tagFilter,
                })}
                disabled={
                  broadcastSending
                  || !visibleProfiles.some((profile) => (
                    profile.kind !== 'file' && isProfileProviderAvailable(profile, providers)
                  ))
                }
              >
                {groupQuery === 'all' ? t('action.openAll') : t('action.openGroup')}
              </Button>
              <Tooltip title={t('action.connectionTransfer')}>
                <span className="tooltip-dropdown-trigger">
                  <Dropdown
                    trigger={['click']}
                    menu={{
                      items: buildConnectionTransferActions({ profileCount: profiles.length }).map((action) => ({
                        key: action.key,
                        disabled: action.disabled,
                        icon: action.key === 'exportProfiles' ? <ExportOutlined /> : <ImportOutlined />,
                        label: t(action.labelKey),
                      })),
                      onClick: ({ key }) => runConnectionTransferAction(key),
                    }}
                  >
                    <Button
                      aria-label={t('action.connectionTransfer')}
                      icon={<MoreOutlined />}
                      size="small"
                    />
                  </Dropdown>
                </span>
              </Tooltip>
              <input
                ref={profileImportRef}
                type="file"
                accept="application/json,.json"
                className="hidden-file-input"
                onChange={importProfiles}
              />
            </Space>
          </div>

          <div className="connection-list-tools">
            <Input.Search
              className="profile-search"
              allowClear
              value={profileQuery}
              onChange={(event) => setProfileQuery(event.target.value)}
              placeholder={t('placeholder.searchConnections')}
            />
            <Select
              className="connection-provider-filter"
              value={providerFilter}
              onChange={setProviderFilter}
              options={[
                { label: t('filter.allProviders'), value: 'all' },
                ...connectionProviders.map((provider) => ({
                  label: providerLabel(provider),
                  value: provider.type,
                })),
              ]}
            />
            <Select
              className="connection-tag-filter"
              value={tagFilter}
              onChange={setTagFilter}
              options={[
                { label: t('filter.allTags'), value: '' },
                ...connectionTags.map((tag) => ({ label: tag, value: tag })),
              ]}
            />
            <Select
              className="connection-sort-select"
              value={profileSort}
              onChange={(sortBy) => updateConnectionWorkspace({ sortBy })}
              options={[
                { value: 'favorites', label: t('sort.favorites') },
                { value: 'recent', label: t('sort.recent') },
                { value: 'name', label: t('sort.name') },
                { value: 'provider', label: t('sort.provider') },
                { value: 'group', label: t('sort.group') },
              ]}
            />
            <div className="connection-view-controls">
              <Tooltip title={t(connectionWorkspacePreferences.showRecent
                ? 'action.hideRecentConnections'
                : 'action.showRecentConnections')}>
                <Button
                  aria-label={t(connectionWorkspacePreferences.showRecent
                    ? 'action.hideRecentConnections'
                    : 'action.showRecentConnections')}
                  aria-pressed={connectionWorkspacePreferences.showRecent}
                  disabled={recentConnections.length === 0}
                  icon={<HistoryOutlined />}
                  size="small"
                  type={connectionWorkspacePreferences.showRecent ? 'default' : 'text'}
                  onClick={() => updateConnectionWorkspace({
                    showRecent: !connectionWorkspacePreferences.showRecent,
                  })}
                />
              </Tooltip>
              {!compactConnectionDetail && (
                <Tooltip title={t(connectionWorkspacePreferences.showDetails
                  ? 'action.hideConnectionDetails'
                  : 'action.showConnectionDetails')}>
                  <Button
                    aria-label={t(connectionWorkspacePreferences.showDetails
                      ? 'action.hideConnectionDetails'
                      : 'action.showConnectionDetails')}
                    aria-pressed={connectionWorkspacePreferences.showDetails}
                    icon={connectionWorkspacePreferences.showDetails
                      ? <MenuFoldOutlined />
                      : <MenuUnfoldOutlined />}
                    size="small"
                    type={connectionWorkspacePreferences.showDetails ? 'default' : 'text'}
                    onClick={() => updateConnectionWorkspace({
                      showDetails: !connectionWorkspacePreferences.showDetails,
                    })}
                  />
                </Tooltip>
              )}
            </div>
            {visibleProfiles.length > 0 && (
              <Text type="secondary" className="connection-list-hint">{t('hint.connectionListKeyboard')}</Text>
            )}
          </div>

          <ConnectionSelectionToolbar
            allFavorite={connectionSelectionState.allFavorite}
            allVisibleSelected={visibleProfiles.length > 0 && visibleSelectedProfileCount === visibleProfiles.length}
            moveMenu={connectionSelectionMoveMenu}
            onAccent={setSelectedProfilesAccent}
            onClear={clearConnectionProfileSelection}
            onDelete={confirmDeleteSelectedProfiles}
            onExport={exportSelectedProfiles}
            onFavorite={setSelectedProfilesFavorite}
            onTags={openConnectionTagEditor}
            onOpen={openSelectedProfiles}
            onTest={testSelectedConnections}
            onToggleVisible={toggleVisibleConnectionProfiles}
            openableCount={connectionSelectionState.openableCount}
            partiallyVisibleSelected={visibleSelectedProfileCount > 0 && visibleSelectedProfileCount < visibleProfiles.length}
            selectedCount={connectionSelectionState.selectedCount}
            testableCount={selectedConnectionProbePlan.probeableProfiles.length + selectedConnectionProbeCheckingCount}
            testingCount={selectedConnectionProbeCheckingCount}
          />

          {connectionWorkspacePreferences.showRecent && visibleRecentConnections.length > 0 && (
            <div className="recent-connection-rail">
              <Text type="secondary">{t('section.recentConnections')}</Text>
              <div className="recent-connection-list compact">
                {visibleRecentConnections.slice(0, 4).map((connection) => {
                  const request = connection.request || profileToRequest(recentToProfile(connection));
                  const launching = connectionLaunchKeys.includes(buildConnectionLaunchKey(request));
                  return (
                    <span className="recent-connection-item" key={connection.id}>
                      <button
                        aria-busy={launching}
                        className={`recent-connection-chip${launching ? ' launching' : ''}`}
                        disabled={launching}
                        onClick={() => openRecentConnection(connection)}
                      >
                        <span className="provider-icon">
                          {launching
                            ? <LoadingOutlined spin />
                            : providerIcons[connection.providerType] || <CodeOutlined />}
                        </span>
                        <span>
                          <strong>{connection.displayName}</strong>
                          <small>
                            {launching
                              ? t('action.openingConnection')
                              : localizedConnectionProfileSubtitle(recentToProfile(connection))}
                          </small>
                        </span>
                      </button>
                      <Tooltip title={t('action.removeRecentConnection')}>
                        <button
                          aria-label={t('action.removeRecentConnection')}
                          className="recent-connection-remove"
                          onClick={() => dismissRecentConnection(connection)}
                        >
                          <CloseOutlined />
                        </button>
                      </Tooltip>
                    </span>
                  );
                })}
              </div>
              <Button size="small" type="text" onClick={clearRecentConnections}>{t('action.clear')}</Button>
            </div>
          )}

          {visibleProfiles.length === 0 && connectionEmptyState ? (
            <Empty
              className="connection-empty-state"
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              description={(
                <span className="connection-empty-copy">
                  <strong>{t(connectionEmptyState.titleKey)}</strong>
                  <small>{t(connectionEmptyState.descriptionKey)}</small>
                </span>
              )}
            >
              <Space wrap className="connection-empty-actions">
                <ConnectionEmptyAction
                  action={connectionEmptyState.primaryAction}
                  clearProfileFilters={clearProfileFilters}
                  openDrawer={openDrawer}
                  openConnectionDrawer={openConnectionDrawer}
                  primary
                  setSshConfigOpen={setSshConfigOpen}
                />
                {connectionEmptyState.secondaryActions.map((action) => (
                  <ConnectionEmptyAction
                    action={action}
                    clearProfileFilters={clearProfileFilters}
                    key={action}
                    openDrawer={openDrawer}
                    openConnectionDrawer={openConnectionDrawer}
                    setSshConfigOpen={setSshConfigOpen}
                  />
                ))}
              </Space>
            </Empty>
          ) : (
            <List
              aria-activedescendant={selectedProfile
                ? `connection-profile-option-${visibleProfiles.findIndex((profile) => profile.id === selectedProfile.id)}`
                : undefined}
              className="profile-list connection-profile-list"
              dataSource={visibleProfiles}
              aria-multiselectable="true"
              role="listbox"
              tabIndex={0}
              onKeyDown={handleConnectionListKeyDown}
              renderItem={(profile, profileIndex) => {
                const sessionInfo = profileSessionSummary.get(profile.id) || { activeCount: 0, focusSessionId: '' };
                const providerAvailable = isProfileProviderAvailable(profile, connectionProviders);
                const launching = isProfileConnectionLaunching(profile, connectionLaunchKeys);
                const checked = selectedProfileIds.includes(profile.id);
                const health = connectionHealthPresentation(profile);
                const launchModel = connectionProfileLaunchModel(profile);
                const primaryAction = launchModel.primary;
                const actions = [
                  <Button
                    key="primary"
                    disabled={primaryAction.disabled}
                    loading={launching && primaryAction.action !== 'focus'}
                    size="small"
                    type="primary"
                    onClick={(event) => {
                      event.stopPropagation();
                      runConnectionProfilePrimaryAction(profile);
                    }}
                  >
                    {t(primaryAction.labelKey)}
                  </Button>,
                  launchModel.secondary && (
                    <Tooltip key="secondary" title={t(launchModel.secondary.labelKey)}>
                      <Button
                        aria-label={t(launchModel.secondary.labelKey)}
                        disabled={launchModel.secondary.disabled}
                        icon={launchModel.secondary.action === 'findExtension'
                          ? <AppstoreAddOutlined />
                          : launchModel.secondary.action === 'openFiles'
                            ? <FolderOpenOutlined />
                            : <PlusOutlined />}
                        loading={launching && launchModel.secondary.action === 'connect'}
                        size="small"
                        onClick={(event) => {
                          event.stopPropagation();
                          runConnectionProfileLaunchAction(launchModel.secondary, profile);
                        }}
                      />
                    </Tooltip>
                  ),
                  <Tooltip key="manage" title={t('action.manage')}>
                    <span className="tooltip-dropdown-trigger">
                      <Dropdown
                        trigger={['click']}
                        menu={buildConnectionProfileActionMenu(profile)}
                      >
                        <Button
                          aria-label={t('action.manage')}
                          size="small"
                          icon={<MoreOutlined />}
                          onClick={(event) => event.stopPropagation()}
                        />
                      </Dropdown>
                    </span>
                  </Tooltip>,
                  <Tooltip key="favorite" title={profile.favorite ? t('action.unfavorite') : t('action.favorite')}>
                    <Button
                      size="small"
                      icon={profile.favorite ? <StarFilled /> : <StarOutlined />}
                      onClick={(event) => {
                        event.stopPropagation();
                        toggleProfileFavorite(profile.id);
                      }}
                    />
                  </Tooltip>,
                ];
                const badges = buildConnectionProfileBadges(profile, sessionInfo, {
                  healthBadge: health?.badge,
                  launching,
                  providerAvailable,
                });
                return (
                <Dropdown
                  menu={buildConnectionProfileActionMenu(profile)}
                  trigger={['contextMenu']}
                >
                  <List.Item
                    className={[
                      'connection-profile-row',
                      (compactConnectionDetail ? explicitlySelectedProfile?.id : selectedProfile?.id) === profile.id ? 'active' : '',
                      connectionDragState.profileId === profile.id ? 'dragging' : '',
                      checked ? 'selected' : '',
                      launching ? 'launching' : '',
                    ].filter(Boolean).join(' ')}
                    aria-busy={launching}
                    draggable={profiles.length > 0}
                    id={`connection-profile-option-${profileIndex}`}
                    role="option"
                    aria-selected={selectedProfileIds.length > 0
                      ? checked
                      : (compactConnectionDetail ? explicitlySelectedProfile?.id : selectedProfile?.id) === profile.id}
                    tabIndex={-1}
                    onDragEnd={clearConnectionProfileDrag}
                    onDragStart={(event) => beginConnectionProfileDrag(event, profile)}
                    onClick={(event) => {
                      if (event.metaKey || event.ctrlKey || event.shiftKey) {
                        toggleConnectionProfileSelection(profile.id, { range: event.shiftKey });
                        return;
                      }
                      setSelectedProfileId(profile.id);
                      if (compactConnectionDetail) setConnectionDetailProfileId(profile.id);
                    }}
                    onDoubleClick={(event) => {
                      if (isInteractiveControl(event.target) || event.metaKey || event.ctrlKey || event.shiftKey) return;
                      runConnectionProfileNewAction(profile);
                    }}
                    actions={actions.filter(Boolean)}
                  >
                    <List.Item.Meta
                      avatar={(
                        <span className="connection-profile-avatar">
                          <Checkbox
                            aria-label={t('action.selectConnection', { name: profile.displayName })}
                            checked={checked}
                            onClick={(event) => event.stopPropagation()}
                            onChange={(event) => toggleConnectionProfileSelection(profile.id, {
                              range: Boolean(event.nativeEvent?.shiftKey),
                            })}
                          />
                          <span className="provider-icon connection-profile-provider-icon">
                            {providerIcons[profile.providerType] || <CodeOutlined />}
                            <ConnectionAccentMarker accent={profile.accent} />
                          </span>
                        </span>
                      )}
                      title={(
                        <span className="connection-profile-title">
                          <strong>{profile.displayName}</strong>
                          <small>{providerTypeLabel(profile.providerType, providers)}</small>
                        </span>
                      )}
                      description={(
                        <span className="connection-profile-description">
                          <span className="connection-profile-endpoint-line">{localizedConnectionProfileSubtitle(profile)}</span>
                          <span className="connection-profile-badges">
                            {badges.map((badge) => (
                              <span key={badge.key} className={`connection-profile-badge tone-${badge.tone}`}>
                                {connectionProfileBadgeLabel(badge)}
                              </span>
                            ))}
                            {profile.lastUsedAt && (
                              <span className="connection-profile-badge tone-default">
                                {`${t('label.lastUsed')}: ${formatProfileLastUsed(profile.lastUsedAt)}`}
                              </span>
                            )}
                          </span>
                          {profile.tags?.length > 0 && (
                            <span className="connection-profile-user-tags">
                              {profile.tags.slice(0, 3).map((tag) => <Tag key={tag}>{tag}</Tag>)}
                              {profile.tags.length > 3 && <Tag>{`+${profile.tags.length - 3}`}</Tag>}
                            </span>
                          )}
                          {profile.providerType === 'ssh' && profile.config?.jumpHost && (
                            <small>{`${t('field.jumpHost')}: ${profile.config.jumpHost}`}</small>
                          )}
                        </span>
                      )}
                    />
                  </List.Item>
                </Dropdown>
                );
              }}
            />
          )}
        </section>
        {showInlineConnectionDetail && (
          <aside className="connection-detail-panel">
            {renderConnectionProfilePreview(selectedProfile)}
          </aside>
        )}
      </div>
      <Drawer
        className="connection-detail-drawer"
        open={selectedNav === 'connections' && compactConnectionDetail && Boolean(connectionDetailProfile)}
        title={t('section.connectionDetails')}
        width={380}
        onClose={() => setConnectionDetailProfileId('')}
      >
        {renderConnectionProfilePreview(connectionDetailProfile)}
      </Drawer>
    </div>
  );

  const renderExtensions = () => {
    const showSources = !visibleExtensionWorkspace.hasFilters || visibleExtensionWorkspace.sources.length > 0;
    const showInstalled = !visibleExtensionWorkspace.hasFilters || visibleExtensionWorkspace.installed.length > 0;
    const showCatalog = !visibleExtensionWorkspace.hasFilters || visibleExtensionWorkspace.catalog.length > 0;
    return (
    <div className="workspace-page extensions-page">
      <div className="page-header">
        <div>
          <Text type="secondary">{t('nav.extensions')}</Text>
          <Title level={3}>{t('section.extensionManager')}</Title>
        </div>
        <Space>
          <Button
            icon={<ReloadOutlined />}
            disabled={extensionSources.length === 0 || extensionOperationBusy}
            loading={extensionRefreshingAll}
            onClick={refreshAllExtensionSources}
          >
            {t('action.refreshSources')}
          </Button>
          <Button
            icon={<FolderOpenOutlined />}
            disabled={extensionOperationBusy && !extensionOfflineInstalling}
            onClick={installOfflineExtension}
            loading={extensionOfflineInstalling}
          >
            {t('action.installOffline')}
          </Button>
          <Button icon={<PlusOutlined />} onClick={() => setExtensionSourceOpen(true)}>{t('action.addSource')}</Button>
        </Space>
      </div>
      <div className="extension-summary-grid">
        <MetricCard label={t('metric.builtinProviders')} value={extensionSummary.builtinProviders} />
        <MetricCard label={t('metric.extensionProviders')} value={extensionSummary.extensionProviders} />
        <MetricCard label={t('metric.installedExtensions')} value={extensionSummary.installedExtensions} />
        <MetricCard label={t('metric.disabledExtensions')} value={extensionSummary.disabledExtensions} />
      </div>
      <div className="extension-core-banner">
        <div>
          <Text strong>{t('extension.coreTitle')}</Text>
          <Text type="secondary">{t('settings.coreOnly')}</Text>
        </div>
        <Button icon={<FolderOpenOutlined />} loading={extensionOfflineInstalling} disabled={extensionOperationBusy && !extensionOfflineInstalling} onClick={installOfflineExtension}>{t('action.installOffline')}</Button>
      </div>
      <div className="extension-discovery-toolbar">
        <Input.Search
          allowClear
          className="extension-search"
          placeholder={t('placeholder.searchExtensions')}
          value={extensionQuery}
          onChange={(event) => setExtensionQuery(event.target.value)}
        />
        <Segmented
          className="extension-scope-filter"
          value={extensionScope}
          onChange={setExtensionScope}
          options={[
            { label: t('filter.allExtensions'), value: 'all' },
            { label: t('filter.availableExtensions'), value: 'available' },
            { label: t('filter.installedExtensions'), value: 'installed' },
            { label: t('filter.extensionSources'), value: 'sources' },
          ]}
        />
        <Text type="secondary" className="extension-result-count">
          {t('extension.searchResult', { count: visibleExtensionWorkspace.total })}
        </Text>
        {visibleExtensionWorkspace.hasFilters && (
          <Button size="small" type="text" icon={<ClearOutlined />} onClick={clearExtensionFilters}>
            {t('action.clearFilters')}
          </Button>
        )}
      </div>
      {visibleExtensionWorkspace.hasFilters && visibleExtensionWorkspace.total === 0 && (
        <Empty
          className="extension-search-empty"
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description={t('empty.noMatchingExtensions')}
        >
          <Button size="small" onClick={clearExtensionFilters}>{t('action.clearFilters')}</Button>
        </Empty>
      )}
      {showSources && (
      <section className="extension-section">
        <div className="extension-section-head">
          <div>
            <Text type="secondary">{t('extension.sourceHint')}</Text>
            <Title level={4}>{t('section.extensionSources')}</Title>
          </div>
          <Button size="small" icon={<PlusOutlined />} onClick={() => setExtensionSourceOpen(true)}>{t('action.addSource')}</Button>
        </div>
        <List
          className="profile-list installed-extension-list"
          dataSource={visibleExtensionWorkspace.sources}
          locale={{
            emptyText: (
              <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={t('empty.noExtensionSources')}>
                <Button size="small" type="primary" onClick={() => setExtensionSourceOpen(true)}>{t('action.addSource')}</Button>
              </Empty>
            ),
          }}
          renderItem={(source) => {
            const sourceState = extensionSourceStates[source.id] || { status: 'idle', count: 0 };
            return (
              <List.Item
                actions={[
                  <Tooltip key="refresh" title={t('action.refresh')}>
                    <Button
                      size="small"
                      icon={<ReloadOutlined />}
                      disabled={extensionRefreshingAll}
                      loading={sourceState.status === 'loading'}
                      onClick={() => refreshExtensionSource(source)}
                      aria-label={t('action.refresh')}
                    />
                  </Tooltip>,
                  <Tooltip key="delete" title={t('action.delete')}>
                    <Button
                      size="small"
                      danger
                      icon={<DeleteOutlined />}
                      disabled={extensionRefreshingAll || sourceState.status === 'loading'}
                      onClick={() => confirmDeleteExtensionSource(source)}
                      aria-label={t('action.delete')}
                    />
                  </Tooltip>,
                ]}
              >
                <List.Item.Meta
                  avatar={<span className="provider-icon"><GlobalOutlined /></span>}
                  title={(
                    <span className="installed-extension-title">
                      <strong>{source.name}</strong>
                      <Tag color={extensionSourceStatusColor(sourceState.status)}>
                        {t(`extension.sourceState.${sourceState.status}`)}
                      </Tag>
                    </span>
                  )}
                  description={(
                    <span className="installed-extension-description extension-source-description">
                      <span>{source.url}</span>
                      <small>
                        {sourceState.status === 'ready'
                          ? t('extension.sourceResult', { count: sourceState.count })
                          : t('extension.sourceReadyHint')}
                        {sourceState.refreshedAt && ` · ${formatProfileLastUsed(sourceState.refreshedAt)}`}
                      </small>
                    </span>
                  )}
                />
              </List.Item>
            );
          }}
        />
      </section>
      )}
      {showInstalled && (
      <section className="extension-section">
        <div className="extension-section-head">
          <div>
            <Text type="secondary">{t('extension.installedHint')}</Text>
            <Title level={4}>{t('section.installedExtensions')}</Title>
          </div>
        </div>
        <List
          className="profile-list installed-extension-list"
          dataSource={visibleExtensionWorkspace.installed}
          locale={{ emptyText: t('empty.noInstalledExtensions') }}
          renderItem={(extension) => {
            const impact = extensionUsageById[extension.id] || {
              activeSessions: 0,
              hasImpact: false,
              savedConnections: 0,
            };
            return (
            <List.Item
              actions={[
                <Switch
                  key="enabled"
                  checked={extension.enabled}
                  disabled={extensionOperationBusy}
                  checkedChildren={t('label.enabled')}
                  unCheckedChildren={t('label.disabled')}
                  onChange={(checked) => confirmToggleExtensionEnabled(extension, checked)}
                />,
                extension.updateItem && (
                  <Button
                    key="update"
                    size="small"
                    type="primary"
                    icon={<ReloadOutlined />}
                    disabled={extensionOperationBusy}
                    loading={extensionInstallingId === extension.id}
                    onClick={() => installOnlineExtension(extension.updateItem)}
                  >
                    {`${t('action.update')} ${extension.updateItem.manifest.version}`}
                  </Button>
                ),
                <Button key="uninstall" size="small" danger disabled={extensionOperationBusy} loading={extensionUninstallingId === extension.id} onClick={() => confirmUninstallExtension(extension)}>{t('action.uninstall')}</Button>,
              ].filter(Boolean)}
            >
              <List.Item.Meta
                avatar={<span className="provider-icon"><AppstoreAddOutlined /></span>}
                title={(
                  <span className="installed-extension-title">
                    <strong>{extension.name}</strong>
                    <span className="connection-profile-badge tone-success">{extension.version}</span>
                    <span className={`connection-profile-badge ${extension.enabled ? 'tone-info' : 'tone-warning'}`}>
                      {extension.enabled ? t('extension.state.enabled') : t('extension.state.disabled')}
                    </span>
                  </span>
                )}
                description={(
                  <span className="installed-extension-description">
                    <span>{extension.id}</span>
                    <span className="connection-profile-badges">
                      {impact.savedConnections > 0 && (
                        <span className="connection-profile-badge tone-info">
                          {t('extension.usage.connections', { count: impact.savedConnections })}
                        </span>
                      )}
                      {impact.activeSessions > 0 && (
                        <span className="connection-profile-badge tone-warning">
                          {t('extension.usage.sessions', { count: impact.activeSessions })}
                        </span>
                      )}
                      {extension.providers.map((provider) => <span key={provider} className="connection-profile-badge tone-info">{provider}</span>)}
                      {extension.fileProviders.map((provider) => (
                        <span key={`file-${provider}`} className="connection-profile-badge tone-success" title={t('extension.fileProvider')}>
                          <FolderOpenOutlined /> {provider}
                        </span>
                      ))}
                      {extension.capabilities.map((capability) => <span key={capability} className="connection-profile-badge">{capability}</span>)}
                    </span>
                  </span>
                )}
              />
            </List.Item>
            );
          }}
        />
      </section>
      )}
      {showCatalog && (
      <section className="extension-section">
        <div className="extension-section-head">
          <div>
            <Text type="secondary">{t('extension.officialHint')}</Text>
            <Title level={4}>{t('section.officialExtensions')}</Title>
          </div>
        </div>
      <div className="extension-grid">
        {visibleExtensionWorkspace.catalog.map((extension) => {
          const catalogItem = findCatalogItemForType(remoteExtensionCatalog, extension.type);
          const action = buildExtensionAction(extension, catalogItem);
          const facts = buildExtensionCardFacts(extension);
          const CardTag = action.enabled ? 'button' : 'div';
          return (
            <CardTag
              className={`extension-card extension-card-${extension.status}`}
              key={`${extension.type}-${extension.status}`}
              type={action.enabled ? 'button' : undefined}
              disabled={action.enabled && extensionOperationBusy}
              onClick={() => {
                if (!action.enabled) return;
                if (catalogItem) {
                  installOnlineExtension(catalogItem);
                } else {
                  setExtensionSourceOpen(true);
                }
              }}
            >
              <span className="provider-icon">{providerIcons[extension.type] || <CodeOutlined />}</span>
              <span className="extension-card-body">
                <Text strong>{extension.nameKey ? t(extension.nameKey) : providerLabel(extension)}</Text>
                <span className="extension-card-facts">
                  {facts.map((fact) => (
                    <small key={fact.key}>{extensionFactLabel(fact.key)}: {extensionFactValue(fact)}</small>
                  ))}
                </span>
              </span>
              <span className="extension-card-side">
                <Tag color={extensionStatusColor(extension.status)}>
                  {t(`extension.status.${extension.status}`)}
                </Tag>
                <span className={`extension-action tone-${action.tone}`}>
                  {extensionInstallingId === catalogItem?.manifest?.id
                    ? t('extension.action.installing')
                    : t(`extension.action.${action.key}`)}
                </span>
              </span>
            </CardTag>
          );
        })}
      </div>
      </section>
      )}
    </div>
    );
  };

  const refreshExtensionSource = async (source, { announce = true } = {}) => {
    setExtensionSourceStates((current) => ({
      ...current,
      [source.id]: { ...current[source.id], status: 'loading' },
    }));
    try {
      const items = await ExtensionsAPI.FetchCatalog(source.url);
      const catalogItems = Array.isArray(items) ? items : [];
      setRemoteExtensionCatalog((current) => replaceExtensionCatalogSource(current, source, catalogItems));
      setExtensionSourceStates((current) => ({
        ...current,
        [source.id]: {
          count: catalogItems.length,
          refreshedAt: new Date().toISOString(),
          status: 'ready',
        },
      }));
      if (announce) {
        messageApi.success(t('message.extensionSourceRefreshed', { count: catalogItems.length }));
      }
      return catalogItems;
    } catch (error) {
      setExtensionSourceStates((current) => ({
        ...current,
        [source.id]: { ...current[source.id], status: 'error' },
      }));
      showOperationError('message.extensionSourceRefreshFailed', error, {
        retry: () => refreshExtensionSource(source),
        scope: 'extension',
      });
      return null;
    }
  };

  const refreshAllExtensionSources = async () => {
    if (extensionSources.length === 0) return;
    setExtensionRefreshingAll(true);
    let available = 0;
    let failed = 0;
    try {
      for (const source of extensionSources) {
        const items = await refreshExtensionSource(source, { announce: false });
        available += items?.length || 0;
        if (items === null) failed += 1;
      }
      if (failed > 0) {
        messageApi.warning(t('message.extensionSourcesRefreshPartial', {
          count: available,
          failed,
        }));
      } else {
        messageApi.success(t('message.extensionSourcesRefreshed', { count: available }));
      }
    } finally {
      setExtensionRefreshingAll(false);
    }
  };

  const saveExtensionSource = async () => {
    const source = normalizeExtensionSource({
      name: extensionSourceName,
      url: extensionSourceUrl,
      type: 'github',
    });
    if (!source) {
      messageApi.warning(t(
        extensionSourceName.trim() && extensionSourceUrl.trim()
          ? 'validation.extensionSourceHttps'
          : 'validation.required',
      ));
      return;
    }
    const nextSources = upsertExtensionSource(extensionSources, source);
    persistExtensionSources(nextSources);
    setExtensionSources(nextSources);
    setExtensionSourceName('');
    setExtensionSourceUrl('');
    setExtensionSourceOpen(false);
    messageApi.success(t('message.extensionSourceSaved'));
    await refreshExtensionSource(source, { announce: false });
  };

  const deleteExtensionSource = (sourceId) => {
    const nextSources = removeExtensionSource(extensionSources, sourceId);
    persistExtensionSources(nextSources);
    setExtensionSources(nextSources);
    setRemoteExtensionCatalog((current) => removeExtensionCatalogSource(current, sourceId));
    setExtensionSourceStates((current) => {
      const next = { ...current };
      delete next[sourceId];
      return next;
    });
    messageApi.success(t('message.extensionSourceDeleted'));
  };

  const confirmDeleteExtensionSource = (source) => requestDangerousAction({
    contentKey: 'confirm.deleteExtensionSourceContent',
    contentValues: {
      name: source?.name || '-',
      url: source?.url || '-',
    },
    onConfirm: () => deleteExtensionSource(source.id),
    titleKey: 'confirm.deleteExtensionSourceTitle',
  });

  const toggleExtensionEnabled = (extensionId, enabled) => {
    setSettings((current) => {
      const disabledIds = new Set(current.disabledExtensionIds || []);
      if (enabled) {
        disabledIds.delete(extensionId);
      } else {
        disabledIds.add(extensionId);
      }
      return {
        ...current,
        disabledExtensionIds: [...disabledIds],
      };
    });
    messageApi.success(enabled ? t('message.extensionEnabled') : t('message.extensionDisabled'));
  };

  const confirmToggleExtensionEnabled = (extension, enabled) => {
    if (enabled) {
      toggleExtensionEnabled(extension.id, true);
      return;
    }
    const impact = extensionUsageById[extension.id] || buildExtensionUsageImpact(extension);
    if (!impact.hasImpact) {
      toggleExtensionEnabled(extension.id, false);
      return;
    }
    requestDangerousAction({
      actionKey: 'action.disable',
      contentKey: 'confirm.disableExtensionImpactContent',
      contentValues: {
        connectionCount: impact.savedConnections,
        name: extension.name || extension.id,
        sessionCount: impact.activeSessions,
      },
      onConfirm: () => toggleExtensionEnabled(extension.id, false),
      titleKey: 'confirm.disableExtensionTitle',
      titleValues: { name: extension.name || extension.id },
    });
  };

  const refreshExtensionRuntime = async () => {
    const items = await ExtensionsAPI.ListInstalled();
    setInstalledExtensions(Array.isArray(items) ? items : []);
    try {
      await SessionAPI.RefreshProviders();
      const loadedProviders = await SessionAPI.ListProviders();
      setAllProviders(Array.isArray(loadedProviders) && loadedProviders.length > 0
        ? loadedProviders
        : fallbackProviders);
      return true;
    } catch (error) {
      showOperationError('message.extensionProviderRefreshFailed', error, {
        retry: refreshExtensionRuntime,
        scope: 'extension',
      });
      return false;
    }
  };

  const installOfflineExtension = async () => {
    setExtensionOfflineInstalling(true);
    try {
      const result = await ExtensionsAPI.InstallOfflineFromDialog();
      if (result?.canceled) return;
      if (await refreshExtensionRuntime()) messageApi.success(t('message.extensionInstalled'));
    } catch (error) {
      showOperationError('message.extensionInstallFailed', error, {
        retry: installOfflineExtension,
        scope: 'extension',
      });
    } finally {
      setExtensionOfflineInstalling(false);
    }
  };

  const installOnlineExtension = async (catalogItem) => {
    const manifest = catalogItem?.manifest || {};
    const asset = catalogItem?.asset || {};
    if (!manifest.id || !asset.url || !asset.sha256) {
      messageApi.warning(t('message.extensionCatalogUnavailable'));
      return;
    }
    setExtensionInstallingId(manifest.id);
    try {
      await ExtensionsAPI.InstallOnline({
        extensionId: manifest.id,
        manifest,
        version: manifest.version,
        url: asset.url,
        sha256: asset.sha256,
      });
      if (await refreshExtensionRuntime()) messageApi.success(t('message.extensionInstalled'));
    } catch (error) {
      showOperationError('message.extensionInstallFailed', error, {
        retry: () => installOnlineExtension(catalogItem),
        scope: 'extension',
      });
    } finally {
      setExtensionInstallingId('');
    }
  };

  const uninstallExtension = async (extensionID) => {
    setExtensionUninstallingId(extensionID);
    try {
      await ExtensionsAPI.Uninstall(extensionID);
      if (await refreshExtensionRuntime()) messageApi.success(t('message.extensionUninstalled'));
    } catch (error) {
      showOperationError('message.extensionInstallFailed', error, {
        retry: () => uninstallExtension(extensionID),
        scope: 'extension',
      });
    } finally {
      setExtensionUninstallingId('');
    }
  };

  const confirmUninstallExtension = (extension) => {
    const impact = extensionUsageById[extension.id] || buildExtensionUsageImpact(extension);
    return requestDangerousAction({
      actionKey: 'action.uninstall',
      contentKey: impact.hasImpact ? 'confirm.uninstallExtensionImpactContent' : 'confirm.uninstallExtensionContent',
      contentValues: {
        connectionCount: impact.savedConnections,
        name: extension?.name || extension?.id || '-',
        sessionCount: impact.activeSessions,
        version: extension?.version || '-',
      },
      onConfirm: () => uninstallExtension(extension.id),
      titleKey: 'confirm.uninstallExtensionTitle',
    });
  };

  const resolveSelectedSshProfile = async (profileId) => {
    if (!profileId) return null;
    const profile = profiles.find((item) => item.id === profileId && item.providerType === 'ssh');
    if (!profile) throw new Error(t('message.savedConnectionUnavailable'));
    return resolveCredentialRequest(profileToRequest(profile));
  };

  const selectFileSshProfile = (profileId) => {
    if (!profileId) {
      setFileProfileId('');
      fileForm.setFieldValue('profileId', '');
      return;
    }
    const fields = buildSshProfileFields(profiles.find((item) => item.id === profileId));
    if (!fields) return;
    setFileProfileId(fields.profileId);
    setFileAuthType(fields.authType);
    fileForm.setFieldsValue({
      agentSocketPath: fields.agentSocketPath,
      authType: fields.authType,
      host: fields.host,
      hostKeyPolicy: fields.hostKeyPolicy,
      connectTimeoutSeconds: fields.connectTimeoutSeconds,
      keepAliveIntervalSeconds: fields.keepAliveIntervalSeconds,
      keepAliveMaxFailures: fields.keepAliveMaxFailures,
      knownHostsPath: fields.knownHostsPath,
      passphrase: '',
      password: '',
      port: fields.port,
      privateKey: '',
      profileId: fields.profileId,
      username: fields.username,
    });
    setFileEntries([]);
  };

  const selectFileConnectionProfile = (profileId) => {
    setFileConnectionProfileId(profileId || '');
    setFileCredentialEditing(false);
    setFileEntries([]);
  };

  const resetFileConnectionProfile = () => {
    setFileConnectionProfileId('');
    setFileCredentialEditing(false);
    setFileEntries([]);
    if (!selectedFileProvider || selectedFileProvider.protocol === 'sftp') return;
    fileForm.setFieldValue('auth', {});
    fileForm.setFieldsValue({
      accent: 'none',
      ...buildFileProviderFormValues(selectedFileProvider),
      displayName: '',
      group: '',
      tags: [],
      path: '.',
      rememberCredential: false,
    });
  };

  const saveFileConnectionProfile = async () => {
    if (!selectedFileProvider || selectedFileProvider.protocol === 'sftp') return;
    const draft = fileForm.getFieldsValue(true);
    const fieldsToValidate = [
      'displayName',
      'group',
      'tags',
      'path',
      ...selectedFileProvider.configFields.map((field) => ['config', field.key]),
      ...(draft.rememberCredential
        ? selectedFileProvider.authFields.map((field) => ['auth', field.key])
        : []),
    ];
    try {
      await fileForm.validateFields(fieldsToValidate);
    } catch {
      return;
    }
    const values = fileForm.getFieldsValue(true);
    const displayName = String(values.displayName || '').trim();
    if (!displayName) {
      messageApi.warning(t('validation.connectionNameRequired'));
      return;
    }
    const existing = selectedFileConnectionProfile;
    const profileId = existing?.id || createProfileID();
    const credentialValues = buildFileProviderAuthValues(selectedFileProvider, values.auth || {});
    let credentialRef = existing?.auth?.credentialRef || null;
    try {
      if (values.rememberCredential && Object.keys(credentialValues).length > 0) {
        credentialRef = await CredentialsAPI.SaveProviderCredential({
          id: profileId,
          previousFields: existing?.auth?.credentialRef?.fields || [],
          providerType: selectedFileProvider.type,
          values: credentialValues,
        });
      }
      if (!values.rememberCredential && credentialRef) {
        await CredentialsAPI.DeleteProviderCredential(credentialRef);
        credentialRef = null;
      }
      const profile = buildFileConnectionProfile(selectedFileProvider, {
        ...values,
        displayName,
      }, {
        credentialRef,
        id: profileId,
        profile: existing,
      });
      const nextProfiles = existing
        ? profiles.map((item) => (item.id === existing.id ? profile : item))
        : [...profiles, profile];
      persistProfiles(nextProfiles);
      setProfiles(nextProfiles);
      updateConnectionHealth((current) => clearConnectionHealth(current, [profileId]));
      setFileConnectionProfileId(profile.id);
      setFileCredentialEditing(false);
      messageApi.success(t('message.fileConnectionSaved'));
    } catch (error) {
      showOperationError('message.credentialFailed', error, { retry: saveFileConnectionProfile });
    }
  };

  const selectTunnelSshProfile = (profileId) => {
    if (!profileId) {
      setTunnelProfileId('');
      tunnelForm.setFieldValue('profileId', '');
      return;
    }
    const fields = buildSshProfileFields(profiles.find((item) => item.id === profileId));
    if (!fields) return;
    setTunnelProfileId(fields.profileId);
    setTunnelAuthType(fields.authType);
    tunnelForm.setFieldsValue({
      name: fields.displayName,
      profileId: fields.profileId,
      sshAgentSocketPath: fields.agentSocketPath,
      sshAuthType: fields.authType,
      sshHost: fields.host,
      sshHostKeyPolicy: fields.hostKeyPolicy,
      sshConnectTimeoutSeconds: fields.connectTimeoutSeconds,
      sshKeepAliveIntervalSeconds: fields.keepAliveIntervalSeconds,
      sshKeepAliveMaxFailures: fields.keepAliveMaxFailures,
      sshKnownHostsPath: fields.knownHostsPath,
      sshPassphrase: '',
      sshPassword: '',
      sshPort: fields.port,
      sshPrivateKey: '',
      sshUser: fields.username,
    });
  };

  const resetTunnelEditor = (profileId = '') => {
    setEditingTunnelPresetId('');
    setTunnelProfileId('');
    setTunnelAuthType('password');
    tunnelForm.resetFields();
    tunnelForm.setFieldsValue({
      name: '',
      profileId: '',
      sshAgentSocketPath: '',
      sshAuthType: 'password',
      sshConnectTimeoutSeconds: 10,
      sshHost: '',
      sshHostKeyPolicy: 'accept-new',
      sshKeepAliveIntervalSeconds: 0,
      sshKeepAliveMaxFailures: 3,
      sshKnownHostsPath: '',
      sshPassphrase: '',
      sshPassword: '',
      sshPort: 22,
      sshPrivateKey: '',
      sshUser: '',
      localHost: '127.0.0.1',
      localPort: undefined,
      remoteHost: '',
      remotePort: undefined,
    });
    if (profileId) selectTunnelSshProfile(profileId);
  };

  const openTunnelForProfile = (profile) => {
    setSelectedNav('tunnels');
    resetTunnelEditor(profile?.providerType === 'ssh' ? profile.id : '');
  };

  const editTunnelPreset = (preset) => {
    resetTunnelEditor(preset.profileId);
    setEditingTunnelPresetId(preset.id);
    tunnelForm.setFieldsValue({
      name: preset.name,
      localHost: preset.localHost,
      localPort: preset.localPort,
      remoteHost: preset.remoteHost,
      remotePort: preset.remotePort,
    });
  };

  const commitTunnelPresets = (nextPresets, successKey, successValues = {}) => {
    const result = persistTunnelPresets(nextPresets);
    setTunnelPresets(result.presets);
    messageApi.success(t(successKey, successValues));
    if (!result.persisted) messageApi.warning(t('message.tunnelPresetStorageFailed'));
    return result.presets;
  };

  const saveTunnelPreset = async () => {
    let values;
    try {
      values = await tunnelForm.validateFields([
        'name',
        'profileId',
        'localHost',
        'localPort',
        'remoteHost',
        'remotePort',
      ]);
    } catch {
      return;
    }
    if (!tunnelProfileId) {
      messageApi.warning(t('message.tunnelPresetRequiresProfile'));
      return;
    }
    const existing = tunnelPresets.find((item) => item.id === editingTunnelPresetId);
    const preset = buildTunnelPreset({
      ...values,
      profileId: tunnelProfileId,
    }, { existing });
    if (!preset) {
      messageApi.warning(t('validation.tunnelPresetIncomplete'));
      return;
    }
    const next = upsertTunnelPreset(tunnelPresets, preset);
    commitTunnelPresets(
      next,
      existing ? 'message.tunnelPresetUpdated' : 'message.tunnelPresetSaved',
      { name: preset.name },
    );
    setEditingTunnelPresetId(preset.id);
  };

  const duplicateTunnelPresetConfig = (preset) => {
    const copy = duplicateTunnelPreset(preset, {
      name: t('tunnel.copyName', { name: preset.name }),
    });
    if (!copy) return;
    commitTunnelPresets(
      upsertTunnelPreset(tunnelPresets, copy),
      'message.tunnelPresetDuplicated',
      { name: copy.name },
    );
  };

  const confirmRemoveTunnelPreset = (preset) => requestDangerousAction({
    contentKey: 'confirm.deleteTunnelPresetContent',
    contentValues: { name: preset.name },
    onConfirm: () => {
      commitTunnelPresets(
        removeTunnelPreset(tunnelPresets, preset.id),
        'message.tunnelPresetRemoved',
        { name: preset.name },
      );
      if (editingTunnelPresetId === preset.id) resetTunnelEditor();
    },
    titleKey: 'confirm.deleteTunnelPresetTitle',
  });

  const loadFiles = async (overridePath = null) => {
    if (!selectedFileProvider) {
      messageApi.warning(t('file.noProviderHint'));
      return;
    }
    await fileForm.validateFields();
    setFileLoading(true);
    try {
      const req = await currentFileRequest(overridePath);
      const entries = await FilesAPI.List(req);
      fileForm.setFieldsValue({ path: req.path });
      setFileEntries(Array.isArray(entries) ? entries : []);
    } catch (error) {
      showOperationError('message.fileListFailed', error, {
        retry: () => loadFiles(overridePath),
      });
    } finally {
      setFileLoading(false);
    }
  };

  const currentFileRequest = async (overridePath = null) => {
    if (!selectedFileProvider) throw new Error(t('file.noProviderHint'));
    const values = fileForm.getFieldsValue(true);
    if (selectedFileProvider.protocol !== 'sftp') {
      const enteredAuth = buildFileProviderAuthValues(selectedFileProvider, values.auth || {});
      let auth = enteredAuth;
      if (Object.keys(auth).length === 0 && selectedFileConnectionProfile?.auth?.credentialRef) {
        const credential = await resolveStoredProviderCredential(selectedFileConnectionProfile);
        if (!credential.complete) {
          setFileCredentialEditing(true);
          throw new Error(t('message.fileCredentialUnavailable'));
        }
        auth = credential.auth;
      }
      return {
        providerType: selectedFileProvider.type,
        config: buildFileProviderConfigValues(selectedFileProvider, values.config || {}),
        auth,
        path: overridePath || values.path || '.',
      };
    }
    const resolvedProfile = await resolveSelectedSshProfile(fileProfileId);
    const connectionAuth = buildSshConnectionAuth(values, resolvedProfile);
    const sshAgent = buildSshAgentConfig(values, resolvedProfile);
    const sshNetwork = buildSshNetworkConfig(values, resolvedProfile);
    const sshSecurity = buildSshSecurityConfig(values, resolvedProfile);
    return {
      providerType: selectedFileProvider.type,
      config: {
        host: values.host,
        port: values.port || 22,
        ...sshAgent,
        ...sshNetwork,
        ...sshSecurity,
      },
      auth: {
        username: values.username,
        ...connectionAuth,
      },
      path: overridePath || values.path || '.',
    };
  };

  const goParent = async () => {
    const current = fileForm.getFieldValue('path') || '.';
    const parent = parentPath(current);
    await loadFiles(parent);
  };

  const createRemoteDirectory = async () => {
    const name = mkdirName.trim();
    if (!name) return;
    setFileLoading(true);
    try {
      const req = await currentFileRequest();
      const base = req.path || '.';
      req.path = joinRemotePath(base, name);
      await FilesAPI.Mkdir(req);
      messageApi.success(t('message.mkdirSuccess'));
      setMkdirOpen(false);
      setMkdirName('');
      await loadFiles(base);
    } catch (error) {
      showOperationError('message.fileListFailed', error, { retry: createRemoteDirectory });
    } finally {
      setFileLoading(false);
    }
  };

  const openRemoteRename = (entry) => {
    setRenamingRemoteEntry(entry);
    setRemoteRenameName(entry.name || '');
  };

  const renameRemoteEntry = async () => {
    if (!renamingRemoteEntry) return;
    const destinationPath = buildRemoteRenameDestination(
      renamingRemoteEntry.path,
      remoteRenameName,
    );
    if (!destinationPath) {
      messageApi.warning(t('validation.remoteEntryName'));
      return;
    }
    if (destinationPath === renamingRemoteEntry.path) {
      setRenamingRemoteEntry(null);
      return;
    }
    setFileLoading(true);
    try {
      const req = await currentFileRequest();
      await FilesAPI.Rename({
        ...req,
        destinationPath,
        path: renamingRemoteEntry.path,
      });
      messageApi.success(t('message.fileRenameSuccess'));
      setRenamingRemoteEntry(null);
      setRemoteRenameName('');
      await loadFiles(fileForm.getFieldValue('path') || '.');
    } catch (error) {
      showOperationError('message.fileRenameFailed', error, { retry: renameRemoteEntry });
    } finally {
      setFileLoading(false);
    }
  };

  const deleteRemoteEntry = async (entry) => {
    setFileLoading(true);
    try {
      const req = await currentFileRequest();
      req.path = entry.path;
      await FilesAPI.Delete(req);
      messageApi.success(t('message.deleteSuccess'));
      await loadFiles(fileForm.getFieldValue('path') || '.');
    } catch (error) {
      showOperationError('message.fileDeleteFailed', error, {
        retry: () => deleteRemoteEntry(entry),
      });
    } finally {
      setFileLoading(false);
    }
  };

  const confirmDeleteRemoteEntry = (entry) => {
    if (settings.confirmDangerousActions === false) {
      deleteRemoteEntry(entry);
      return;
    }
    modalApi.confirm({
      title: t('confirm.deleteRemoteEntryTitle'),
      content: t('confirm.deleteRemoteEntryContent', {
        name: entry.name || entry.path,
        path: entry.path || '-',
      }),
      okButtonProps: { danger: true },
      okText: t('action.delete'),
      cancelText: t('action.cancel'),
      onOk: () => deleteRemoteEntry(entry),
    });
  };

  const beginFileTransfer = (kind, name, total = 0) => {
    const transferId = createFileTransferID();
    fileTransferCleanupRef.current?.();
    fileTransferCleanupRef.current = typeof window !== 'undefined' && window.runtime?.EventsOn
      ? runtime.EventsOn(`files:transfer:${transferId}`, (event) => {
        setFileTransfer((current) => updateFileTransferProgress(current, event));
      })
      : () => {};
    setFileTransfer({ id: transferId, kind, name, bytes: 0, total, percent: 0, canceling: false });
    return transferId;
  };

  const finishFileTransfer = (transferId) => {
    fileTransferCleanupRef.current?.();
    fileTransferCleanupRef.current = null;
    setFileTransfer((current) => (current?.id === transferId ? null : current));
  };

  const cancelFileTransfer = async () => {
    const transfer = fileTransfer;
    if (!transfer || transfer.canceling) return;
    setFileTransfer((current) => (
      current?.id === transfer.id ? { ...current, canceling: true } : current
    ));
    canceledTransferIdsRef.current.add(transfer.id);
    try {
      const canceled = await FilesAPI.CancelTransfer(transfer.id);
      if (!canceled) {
        canceledTransferIdsRef.current.delete(transfer.id);
        setFileTransfer((current) => (
          current?.id === transfer.id ? { ...current, canceling: false } : current
        ));
      }
    } catch (error) {
      canceledTransferIdsRef.current.delete(transfer.id);
      setFileTransfer((current) => (
        current?.id === transfer.id ? { ...current, canceling: false } : current
      ));
      showOperationError('message.transferCancelFailed', error);
    }
  };

  const downloadRemoteFile = async (entry) => {
    if (entry.isDir) return;
    const transferId = beginFileTransfer('download', entry.name, Number(entry.size || 0));
    try {
      const req = await currentFileRequest();
      req.path = entry.path;
      const result = await FilesAPI.DownloadWithID(req, entry.name, transferId);
      if (!result?.canceled) {
        messageApi.success(t('message.downloadSuccess', { name: result?.fileName || entry.name }));
      }
    } catch (error) {
      if (canceledTransferIdsRef.current.has(transferId)) {
        messageApi.info(t('message.transferCanceled'));
      } else {
        showOperationError('message.downloadFailed', error, {
          retry: () => downloadRemoteFile(entry),
        });
      }
    } finally {
      canceledTransferIdsRef.current.delete(transferId);
      finishFileTransfer(transferId);
    }
  };

  const uploadRemoteFile = async () => {
    const base = fileForm.getFieldValue('path') || '.';
    try {
      await fileForm.validateFields();
    } catch {
      return;
    }
    const transferId = beginFileTransfer('upload', '');
    try {
      const req = await currentFileRequest();
      const result = await FilesAPI.UploadWithID(req, transferId);
      if (!result?.canceled) {
        messageApi.success(t('message.uploadFileSuccess', { name: result?.fileName || '' }));
        await loadFiles(base);
      }
    } catch (error) {
      if (canceledTransferIdsRef.current.has(transferId)) {
        messageApi.info(t('message.transferCanceled'));
      } else {
        showOperationError('message.uploadFailed', error, { retry: uploadRemoteFile });
      }
    } finally {
      canceledTransferIdsRef.current.delete(transferId);
      finishFileTransfer(transferId);
    }
  };

  const openRemoteFileEditor = async (entry) => {
    if (entry.isDir) return;
    if (entry.size > 1024 * 1024) {
      messageApi.warning(t('message.fileTooLarge'));
      return;
    }
    setFileEditorLoading(true);
    try {
      const req = await currentFileRequest();
      req.path = entry.path;
      const content = await FilesAPI.ReadFile(req);
      setEditingRemoteFile(entry);
      setEditingRemoteContent(content);
      setFileEditorOpen(true);
    } catch (error) {
      showOperationError('message.fileListFailed', error, {
        retry: () => openRemoteFileEditor(entry),
      });
    } finally {
      setFileEditorLoading(false);
    }
  };

  const saveRemoteFile = async () => {
    if (!editingRemoteFile) return;
    setFileEditorLoading(true);
    try {
      const req = await currentFileRequest();
      req.path = editingRemoteFile.path;
      await FilesAPI.WriteFile({ ...req, content: editingRemoteContent });
      messageApi.success(t('message.fileSaved'));
      setFileEditorOpen(false);
      await loadFiles(fileForm.getFieldValue('path') || '.');
    } catch (error) {
      showOperationError('message.fileSaveFailed', error, { retry: saveRemoteFile });
    } finally {
      setFileEditorLoading(false);
    }
  };

  const createRemoteTextFile = async () => {
    const name = uploadRemoteName.trim();
    if (!name) {
      messageApi.warning(t('validation.required'));
      return;
    }
    setFileLoading(true);
    try {
      const req = await currentFileRequest();
      const base = req.path || '.';
      req.path = joinRemotePath(base, name);
      await FilesAPI.WriteFile({ ...req, content: uploadLocalContent });
      messageApi.success(t('message.uploadSuccess'));
      setUploadOpen(false);
      setUploadRemoteName('');
      setUploadLocalContent('');
      await loadFiles(base);
    } catch (error) {
      showOperationError('message.uploadFailed', error, { retry: createRemoteTextFile });
    } finally {
      setFileLoading(false);
    }
  };

  const renderFiles = () => {
    const currentPath = watchedFilePath || fileForm.getFieldValue('path') || '.';
    const fileSummary = buildRemoteFileSummary(fileEntries, { path: currentPath, loading: fileLoading });
    const fileView = buildRemoteFileView(fileEntries, { query: fileQuery, sortBy: fileSort });
    const breadcrumbs = buildRemoteFileBreadcrumbs(fileSummary.path);
    const selectedFileConnection = buildSavedSshConnections(profiles)
      .find((item) => item.id === fileProfileId);
    if (!selectedFileProvider) {
      return (
        <div className="workspace-page remote-workspace-page">
          <div className="page-header">
            <div>
              <Text type="secondary">{t('nav.files')}</Text>
              <Title level={3}>{t('section.remoteFiles')}</Title>
            </div>
          </div>
          <div className="workspace-empty-state remote-provider-empty">
            <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={t('file.noProviderTitle')}>
              <Text type="secondary">{t('file.noProviderHint')}</Text>
              <Button type="primary" icon={<AppstoreAddOutlined />} onClick={() => setSelectedNav('extensions')}>
                {t('file.installProvider')}
              </Button>
            </Empty>
          </div>
        </div>
      );
    }
    const canListFiles = fileProviderSupports(selectedFileProvider, 'list');
    const canReadFiles = fileProviderSupports(selectedFileProvider, 'read');
    const canWriteFiles = fileProviderSupports(selectedFileProvider, 'write');
    const canUploadFiles = fileProviderSupports(selectedFileProvider, 'upload');
    const canDownloadFiles = fileProviderSupports(selectedFileProvider, 'download');
    const canCreateDirectories = fileProviderSupports(selectedFileProvider, 'mkdir');
    const canDeleteFiles = fileProviderSupports(selectedFileProvider, 'delete');
    const canRenameFiles = fileProviderSupports(selectedFileProvider, 'rename');
    const fileBusy = fileLoading || Boolean(fileTransfer);
    const runRemoteFileAction = (action, entry) => {
      if (action === 'open') loadFiles(entry.path);
      if (action === 'edit' || action === 'view') openRemoteFileEditor(entry);
      if (action === 'download' && canDownloadFiles) downloadRemoteFile(entry);
      if (action === 'rename' && canRenameFiles) openRemoteRename(entry);
      if (action === 'delete' && canDeleteFiles) confirmDeleteRemoteEntry(entry);
    };
    return (
      <div className="workspace-page remote-workspace-page">
        <div className="page-header">
          <div>
            <Text type="secondary">{t('nav.files')}</Text>
            <Title level={3}>{t('section.remoteFiles')}</Title>
          </div>
          <Space wrap>
            <Button icon={<ReloadOutlined />} disabled={!canListFiles || fileBusy} onClick={() => loadFiles()} loading={fileLoading}>{t('action.refresh')}</Button>
            <Button type="primary" disabled={!canListFiles || fileBusy} onClick={() => loadFiles()} loading={fileLoading}>{t('action.open')}</Button>
          </Space>
        </div>
        <div className="remote-summary-grid">
          <MetricCard label={t('metric.directories')} value={fileSummary.directories} />
          <MetricCard label={t('metric.files')} value={fileSummary.files} />
          <MetricCard label={t('metric.totalSize')} value={fileSummary.readableSize} />
        </div>
        <div className="remote-browser-shell">
          <div className="remote-context-panel">
            <Text strong>{t('section.quickConnect')}</Text>
            <Text type="secondary">{t('file.browserHint')}</Text>
            <Form
              form={fileForm}
              layout="vertical"
              className="remote-context-form"
              disabled={fileBusy}
              initialValues={{ agentSocketPath: '', connectTimeoutSeconds: 10, hostKeyPolicy: 'accept-new', keepAliveIntervalSeconds: 0, keepAliveMaxFailures: 3, port: 22, path: '.', profileId: '' }}
            >
              <Form.Item label={t('field.fileProvider')}>
                <Select
                  value={selectedFileProvider.type}
                  options={fileProviders.map((provider) => ({
                    value: provider.type,
                    label: provider.nameKey ? t(provider.nameKey, provider.extensionName) : provider.extensionName,
                  }))}
                  onChange={(providerType) => {
                    setFileProviderType(providerType);
                    setFileConnectionProfileId('');
                    setFileCredentialEditing(false);
                    setFileEntries([]);
                    setFileQuery('');
                    fileForm.setFieldValue('path', '.');
                  }}
                />
              </Form.Item>
              {selectedFileProvider.protocol === 'sftp' ? (
                <>
              <Form.Item name="profileId" hidden><Input /></Form.Item>
              <SavedSSHProfileSelect
                disabled={fileLoading}
                onChange={selectFileSshProfile}
                onManageConnections={() => setSelectedNav('connections')}
                profiles={profiles}
                value={fileProfileId}
              />
              <div className={selectedFileConnection ? 'remote-manual-fields is-hidden' : 'remote-manual-fields'}>
                <Form.Item name="host" label={t('field.host')} rules={[{ required: true, message: t('validation.required') }]}>
                  <Input placeholder={t('placeholder.host')} />
                </Form.Item>
                <Space size={8} className="remote-form-row">
                  <Form.Item name="port" label={t('field.port')}>
                    <InputNumber min={1} max={65535} />
                  </Form.Item>
                  <Form.Item name="username" label={t('field.username')} rules={[{ required: true, message: t('validation.required') }]}>
                    <Input />
                  </Form.Item>
                </Space>
                <Form.Item name="authType" label={t('field.authType')} initialValue="password">
                  <Segmented
                    block
                    onChange={setFileAuthType}
                    options={[
                      { value: 'password', label: t('auth.password') },
                      { value: 'privateKey', label: t('auth.privateKey') },
                      { value: 'agent', label: t('auth.agent') },
                    ]}
                  />
                </Form.Item>
              </div>
              {(!selectedFileConnection?.hasSavedSecret && fileAuthType === 'password') && (
                <Form.Item name="password" label={t('field.password')}>
                  <Input.Password placeholder={selectedFileConnection ? t('placeholder.oneTimeCredential') : ''} />
                </Form.Item>
              )}
              {(!selectedFileConnection?.hasSavedSecret && fileAuthType === 'privateKey') && (
                <>
                  <Form.Item name="privateKey" label={t('field.privateKey')} rules={[{ required: true, message: t('validation.required') }]}>
                    <Input.TextArea rows={4} />
                  </Form.Item>
                  <Form.Item name="passphrase" label={t('field.passphrase')}>
                    <Input.Password />
                  </Form.Item>
                </>
              )}
              {fileAuthType === 'agent' && <SshAgentSocketField />}
              <Collapse
                className="ssh-advanced-collapse"
                ghost
                items={[{
                  key: 'sftp-security',
                  label: t('section.sshSecurity'),
                  children: (
                    <>
                      <SshSecurityFields />
                      <SshNetworkFields showKeepAlive={false} />
                    </>
                  ),
                }]}
                size="small"
              />
                </>
              ) : (
                <>
                  <Form.Item label={t('field.savedConnection')}>
                    <Space.Compact block>
                      <Select
                        allowClear
                        className="file-connection-select"
                        onChange={selectFileConnectionProfile}
                        options={fileConnectionProfiles.map((profile) => ({
                          label: profile.displayName,
                          value: profile.id,
                        }))}
                        placeholder={t('placeholder.selectSavedConnection')}
                        value={fileConnectionProfileId || undefined}
                      />
                      <Tooltip title={t('action.newConnection')}>
                        <Button
                          aria-label={t('action.newConnection')}
                          icon={<PlusOutlined />}
                          onClick={resetFileConnectionProfile}
                        />
                      </Tooltip>
                    </Space.Compact>
                  </Form.Item>
                  <Form.Item name="displayName" label={t('field.name')}>
                    <Input placeholder={t('placeholder.connectionName')} />
                  </Form.Item>
                  <ConnectionMetadataFields groups={connectionGroupNames} tags={connectionTags} />
                  <FileProviderFormFields
                    hideAuthFields={!!selectedFileConnectionProfile?.auth?.credentialRef && !fileCredentialEditing}
                    provider={selectedFileProvider}
                  />
                  {!!selectedFileConnectionProfile?.auth?.credentialRef && !fileCredentialEditing && (
                    <Alert
                      action={<Button size="small" onClick={() => setFileCredentialEditing(true)}>{t('action.updateCredential')}</Button>}
                      message={t('file.savedCredentialActive')}
                      showIcon
                      type="success"
                    />
                  )}
                  <Form.Item name="rememberCredential" valuePropName="checked">
                    <Checkbox>{t('field.rememberCredential')}</Checkbox>
                  </Form.Item>
                  <Button block icon={<SaveOutlined />} onClick={saveFileConnectionProfile}>
                    {selectedFileConnectionProfile ? t('action.updateConnection') : t('action.saveConnection')}
                  </Button>
                </>
              )}
              <Form.Item name="path" label={t('field.path')}>
                <Input />
              </Form.Item>
            </Form>
          </div>
          <div className="remote-file-panel">
            <div className="remote-file-toolbar">
              <div className="remote-breadcrumbs">
                {breadcrumbs.map((crumb, index) => (
                  <React.Fragment key={crumb.key}>
                    {index > 0 && <span className="remote-breadcrumb-separator">/</span>}
                    <button type="button" disabled={fileBusy} onClick={() => loadFiles(crumb.path)}>
                      {crumb.label}
                    </button>
                  </React.Fragment>
                ))}
              </div>
              <Space wrap>
                <Button disabled={!canListFiles || fileBusy} onClick={goParent}>{t('action.up')}</Button>
                {canCreateDirectories && <Button disabled={fileBusy} onClick={() => setMkdirOpen(true)}>{t('action.mkdir')}</Button>}
                {canUploadFiles && (
                  <Button
                    type="primary"
                    icon={<UploadOutlined />}
                    loading={fileTransfer?.kind === 'upload'}
                    disabled={fileBusy && fileTransfer?.kind !== 'upload'}
                    onClick={uploadRemoteFile}
                  >
                    {t('action.upload')}
                  </Button>
                )}
                {canWriteFiles && <Button disabled={fileBusy} icon={<FileTextOutlined />} onClick={() => setUploadOpen(true)}>{t('action.newTextFile')}</Button>}
              </Space>
            </div>
            {fileTransfer && (
              <div className="remote-transfer-bar" role="status" aria-live="polite">
                <div className="remote-transfer-copy">
                  <Text strong ellipsis>
                    {fileTransfer.kind === 'upload'
                      ? t('file.uploading')
                      : t('file.downloading', { name: fileTransfer.name || '' })}
                  </Text>
                  <Text type="secondary">
                    {fileTransfer.total > 0
                      ? t('file.transferProgress', {
                        bytes: readableBytes(fileTransfer.bytes),
                        total: readableBytes(fileTransfer.total),
                      })
                      : t('file.transferStarting')}
                  </Text>
                </div>
                <div className="remote-transfer-track">
                  {fileTransfer.total > 0 ? (
                    <Progress percent={fileTransfer.percent} showInfo={false} size="small" />
                  ) : (
                    <LoadingOutlined spin />
                  )}
                </div>
                <Tooltip title={t('action.cancel')}>
                  <Button
                    aria-label={t('action.cancel')}
                    danger
                    type="text"
                    icon={<StopOutlined />}
                    loading={fileTransfer.canceling}
                    onClick={cancelFileTransfer}
                  />
                </Tooltip>
              </div>
            )}
            <div className="remote-file-filterbar">
              <Input.Search
                ref={fileSearchRef}
                allowClear
                value={fileQuery}
                onChange={(event) => setFileQuery(event.target.value)}
                placeholder={t('placeholder.searchRemoteFiles')}
              />
              <Select
                className="remote-file-sort"
                value={fileSort}
                onChange={setFileSort}
                options={[
                  { value: 'name', label: t('sort.name') },
                  { value: 'modified', label: t('sort.modified') },
                  { value: 'size', label: t('sort.size') },
                ]}
              />
              <Text type="secondary" className="remote-file-visible-count">
                {t('file.visibleCount', { visible: fileView.visible, total: fileView.total })}
              </Text>
            </div>
            <List
              className="remote-file-list"
              loading={fileLoading}
              dataSource={fileView.entries}
              locale={{
                emptyText: (
                  <Empty
                    image={Empty.PRESENTED_IMAGE_SIMPLE}
                    description={t(fileView.filtered ? 'file.emptyFilteredTitle' : 'empty.noFiles')}
                  >
                    {fileView.filtered ? (
                      <Button onClick={() => setFileQuery('')}>{t('action.clearFilters')}</Button>
                    ) : (
                      <Button type="primary" onClick={() => loadFiles()} loading={fileLoading}>{t('action.open')}</Button>
                    )}
                  </Empty>
                ),
              }}
              renderItem={(entry) => {
                const entryActions = buildRemoteFileActions(entry, selectedFileProvider.capabilities);
                return (
                  <List.Item
                    className={entry.isDir ? 'remote-file-row directory' : 'remote-file-row'}
                    actions={[
                      entryActions.length > 0 && (
                        <Dropdown
                          key="actions"
                          trigger={['click']}
                          menu={{
                            items: entryActions.map((action) => ({
                              key: action.key,
                              danger: action.danger,
                              icon: remoteFileActionIcon(action.key),
                              label: t(action.labelKey),
                            })),
                            onClick: ({ key, domEvent }) => {
                              domEvent?.stopPropagation();
                              runRemoteFileAction(key, entry);
                            },
                          }}
                        >
                          <Button
                            aria-label={t('file.entryActions', { name: entry.name })}
                            disabled={fileBusy || fileEditorLoading}
                            icon={<MoreOutlined />}
                            size="small"
                            type="text"
                            onClick={(event) => event.stopPropagation()}
                            onDoubleClick={(event) => event.stopPropagation()}
                          />
                        </Dropdown>
                      ),
                    ].filter(Boolean)}
                    onDoubleClick={() => {
                      if (fileBusy) return;
                      if (entry.isDir && canListFiles) loadFiles(entry.path);
                      if (!entry.isDir && canReadFiles) openRemoteFileEditor(entry);
                    }}
                  >
                    <List.Item.Meta
                      avatar={<span className="provider-icon">{entry.isDir ? <FolderOpenOutlined /> : <CodeOutlined />}</span>}
                      title={(
                        <span className="remote-file-title">
                          <strong>{entry.name}</strong>
                          {entry.isDir && <span className="connection-profile-badge tone-info">{t('field.path')}</span>}
                        </span>
                      )}
                      description={(
                        <span className="remote-file-meta">
                          <span>{entry.mode}</span>
                          <span>{entry.isDir ? '-' : entry.size}</span>
                          <span>{entry.modTime}</span>
                        </span>
                      )}
                    />
                  </List.Item>
                );
              }}
            />
          </div>
        </div>
      <Drawer
        title={t('action.mkdir')}
        width={320}
        open={mkdirOpen}
        onClose={() => setMkdirOpen(false)}
        extra={<Button type="primary" onClick={createRemoteDirectory}>{t('action.create')}</Button>}
      >
        <Input value={mkdirName} onChange={(event) => setMkdirName(event.target.value)} placeholder={t('field.name')} />
      </Drawer>
      <Drawer
        title={editingRemoteFile
          ? `${t(canWriteFiles ? 'action.edit' : 'action.view')} ${editingRemoteFile.name}`
          : t(canWriteFiles ? 'action.edit' : 'action.view')}
        width={760}
        open={fileEditorOpen}
        onClose={() => setFileEditorOpen(false)}
        extra={canWriteFiles && <Button type="primary" loading={fileEditorLoading} onClick={saveRemoteFile}>{t('action.save')}</Button>}
      >
        <Input.TextArea
          className="remote-file-editor"
          value={editingRemoteContent}
          onChange={(event) => setEditingRemoteContent(event.target.value)}
          readOnly={!canWriteFiles}
          spellCheck={false}
        />
      </Drawer>
      <Drawer
        title={t('file.renameTitle')}
        width={360}
        open={Boolean(renamingRemoteEntry)}
        onClose={() => setRenamingRemoteEntry(null)}
        extra={<Button type="primary" loading={fileLoading} onClick={renameRemoteEntry}>{t('action.rename')}</Button>}
      >
        <Form layout="vertical">
          <Form.Item label={t('field.name')} required>
            <Input
              autoFocus
              value={remoteRenameName}
              onChange={(event) => setRemoteRenameName(event.target.value)}
              onPressEnter={renameRemoteEntry}
            />
          </Form.Item>
          {renamingRemoteEntry?.path && (
            <Text type="secondary" className="remote-rename-path">{renamingRemoteEntry.path}</Text>
          )}
        </Form>
      </Drawer>
      <Drawer
        title={t('action.newTextFile')}
        width={560}
        open={uploadOpen}
        onClose={() => setUploadOpen(false)}
        extra={<Button type="primary" onClick={createRemoteTextFile} loading={fileLoading}>{t('action.create')}</Button>}
      >
        <Form layout="vertical" className="terminal-form">
          <Form.Item label={t('field.name')} required>
            <Input value={uploadRemoteName} onChange={(event) => setUploadRemoteName(event.target.value)} placeholder={t('placeholder.remoteFileName')} />
          </Form.Item>
          <Form.Item label={t('field.content')}>
            <Input.TextArea rows={14} value={uploadLocalContent} onChange={(event) => setUploadLocalContent(event.target.value)} />
          </Form.Item>
        </Form>
      </Drawer>
    </div>
    );
  };

  const settingsSectionNav = buildSettingsSectionNav(settingsSection);
  const handleSettingsSectionKeyDown = (event) => {
    const nextSection = resolveSettingsSectionNavigation(settingsSection, event.key);
    if (!nextSection) return;
    event.preventDefault();
    setSettingsSection(nextSection);
    globalThis.requestAnimationFrame?.(() => {
      document.getElementById(`settings-tab-${nextSection}`)?.focus();
    });
  };

  const resetShortcutBindings = () => {
    setSettings((current) => ({
      ...current,
      shortcutBindings: defaultShortcutBindings(),
    }));
    messageApi.success(t('message.shortcutsReset'));
  };

  const renderSettings = () => (
    <div className="workspace-page settings-page">
      <div className="page-header">
        <div>
          <Text type="secondary">{t('nav.settings')}</Text>
          <Title level={3}>{t('section.preferences')}</Title>
        </div>
      </div>
      <div className="settings-appearance-strip">
        {buildAppearanceSummary(settings).map((item) => (
          <span key={item.key}>
            <small>{settingsSummaryLabel(item.key)}</small>
            <strong>{settingsSummaryValue(item)}</strong>
          </span>
        ))}
      </div>
      <div className="settings-workbench">
        <nav
          aria-label={t('settings.sectionNavigation')}
          className="settings-section-nav"
          onKeyDown={handleSettingsSectionKeyDown}
          role="tablist"
        >
          {settingsSectionNav.map((item) => (
            <button
              aria-controls={`settings-panel-${item.key}`}
              aria-selected={item.active}
              className={item.active ? 'active' : ''}
              id={`settings-tab-${item.key}`}
              key={item.key}
              onClick={() => setSettingsSection(item.key)}
              role="tab"
              tabIndex={item.active ? 0 : -1}
              type="button"
            >
              {t(item.labelKey)}
            </button>
          ))}
        </nav>
        <div className="settings-panel-stack">
          <SettingsPanel activeSection={settingsSection} section="interface" title={t('settings.interface')}>
          <Form layout="vertical">
            <Form.Item label={t('field.locale')}>
              <Select
                value={locale}
                options={availableLocales().map((locale) => ({
                  value: locale,
                  label: t(`locale.${locale}`, locale),
                }))}
                onChange={(nextLocale) => {
                  setLocale(nextLocale);
                  setLocaleState(nextLocale);
                }}
              />
            </Form.Item>
            <Form.Item label={t('field.appTheme')}>
              <Segmented
                block
                value={settings.appTheme}
                options={[
                  { value: 'system', label: t('theme.system') },
                  { value: 'light', label: t('theme.light') },
                  { value: 'dark', label: t('theme.dark') },
                ]}
                onChange={(value) => setSettings((current) => ({ ...current, appTheme: value }))}
              />
            </Form.Item>
            <Form.Item label={t('field.interfaceDensity')}>
              <Segmented
                block
                value={settings.interfaceDensity || defaultSettings.interfaceDensity}
                options={[
                  { value: 'comfortable', label: t('density.comfortable') },
                  { value: 'compact', label: t('density.compact') },
                ]}
                onChange={(value) => setSettings((current) => ({ ...current, interfaceDensity: value }))}
              />
            </Form.Item>
            <Form.Item label={t('field.sidebarMode')} extra={t('settings.sidebarModeHint')}>
              <Segmented
                block
                value={settings.sidebarMode || defaultSettings.sidebarMode}
                options={[
                  { value: 'auto', label: t('sidebar.auto') },
                  { value: 'expanded', label: t('sidebar.expanded') },
                  { value: 'compact', label: t('sidebar.compact') },
                ]}
                onChange={(value) => setSettings((current) => ({ ...current, sidebarMode: value }))}
              />
            </Form.Item>
            <Text type="secondary">{t('settings.languageHint')}</Text>
          </Form>
          </SettingsPanel>

          <SettingsPanel activeSection={settingsSection} section="terminal" title={t('settings.terminal')}>
          <TerminalSettingsPreview preview={buildTerminalPreview(settings)} />
          <Form layout="vertical">
            <Form.Item label={t('field.terminalTheme')}>
              <Select
                value={settings.terminalTheme}
                options={terminalThemes.map((name) => ({
                  value: name,
                  label: name === 'auto' ? t('theme.auto') : name,
                }))}
                onChange={(value) => setSettings((current) => ({ ...current, terminalTheme: value }))}
              />
            </Form.Item>
            <Form.Item label={t('field.defaultProviderType')}>
              <Select
                value={terminalDefaults.defaultProviderType}
                options={providerOptions}
                onChange={(value) => setSettings((current) => ({ ...current, defaultProviderType: value }))}
              />
            </Form.Item>
            <Form.Item label={t('field.defaultWorkingDirectory')}>
              <Input
                value={settings.defaultWorkingDirectory}
                placeholder={t('placeholder.defaultWorkingDirectory')}
                onChange={(event) => setSettings((current) => ({
                  ...current,
                  defaultWorkingDirectory: event.target.value,
                }))}
              />
            </Form.Item>
            <SessionRecoverySettings
              settings={settings}
              onChange={(patch) => setSettings((current) => ({ ...current, ...patch }))}
            />
            <Text type="secondary">{t('settings.terminalDefaultsHint')}</Text>
            <Form.Item label={t('field.fontFamily')}>
              <Input
                value={settings.fontFamily}
                onChange={(event) => setSettings((current) => ({ ...current, fontFamily: event.target.value }))}
              />
            </Form.Item>
            <Space size={12} wrap>
              <Form.Item label={t('field.fontSize')}>
                <InputNumber
                  min={10}
                  max={24}
                  value={settings.fontSize}
                  onChange={(value) => setSettings((current) => ({ ...current, fontSize: value || defaultSettings.fontSize }))}
                />
              </Form.Item>
              <Form.Item label={t('field.scrollback')}>
                <InputNumber
                  min={500}
                  max={100000}
                  step={500}
                  value={settings.scrollback}
                  onChange={(value) => setSettings((current) => ({ ...current, scrollback: value || defaultSettings.scrollback }))}
                />
              </Form.Item>
            </Space>
          </Form>
          </SettingsPanel>

          <SettingsPanel activeSection={settingsSection} section="workspace" title={t('settings.workspace')}>
          <Space direction="vertical" className="settings-stack">
            <Space align="center" className="settings-row">
              <div>
                <Text strong>{t('field.autoSaveWorkspace')}</Text>
                <Text type="secondary">{t('settings.autoSaveHint')}</Text>
              </div>
              <Switch
                checked={settings.autoSaveWorkspace}
                onChange={(checked) => setSettings((current) => ({ ...current, autoSaveWorkspace: checked }))}
              />
            </Space>
            <Space align="center" className="settings-row">
              <div>
                <Text strong>{t('field.autoRestoreWorkspace')}</Text>
                <Text type="secondary">{t('settings.autoRestoreHint')}</Text>
              </div>
              <Switch
                checked={settings.autoRestoreWorkspace}
                onChange={(checked) => setSettings((current) => ({ ...current, autoRestoreWorkspace: checked }))}
              />
            </Space>
            <WorkspaceSnapshotStatus summary={buildWorkspaceSnapshotSummary(workspaceSummary)} />
            <Space wrap>
              <WorkspaceActionButton
                action={workspaceActionState.save}
                icon={<SaveOutlined />}
                onClick={saveWorkspace}
              >
                {t('action.saveWorkspace')}
              </WorkspaceActionButton>
              <WorkspaceActionButton
                action={workspaceActionState.restore}
                icon={<ReloadOutlined />}
                onClick={() => restoreWorkspace()}
              >
                {t('action.restoreWorkspace')}
              </WorkspaceActionButton>
              <WorkspaceActionButton
                action={workspaceActionState.clear}
                danger
                icon={<DeleteOutlined />}
                onClick={clearWorkspaceSnapshot}
              >
                {t('action.clearWorkspace')}
              </WorkspaceActionButton>
            </Space>
          </Space>
          </SettingsPanel>

          <SettingsPanel activeSection={settingsSection} section="security" title={t('settings.security')}>
          <Space direction="vertical" className="settings-stack">
            <Alert type="success" showIcon message={t('settings.secretsHint')} />
            <div className="settings-mini-summary">
              {buildSecuritySummary(settings).map((item) => (
                <span key={item.key}>
                  <small>{settingsSummaryLabel(item.key)}</small>
                  <strong>{settingsSummaryValue(item)}</strong>
                </span>
              ))}
              {buildOperationalSummary(settings).map((item) => (
                <span key={item.key}>
                  <small>{settingsSummaryLabel(item.key)}</small>
                  <strong>{settingsSummaryValue(item)}</strong>
                </span>
              ))}
            </div>
            <Space align="center" className="settings-row">
              <div>
                <Text strong>{t('field.confirmDangerousActions')}</Text>
                <Text type="secondary">{t('settings.dangerousConfirmHint')}</Text>
              </div>
              <Switch
                checked={settings.confirmDangerousActions !== false}
                onChange={(checked) => setSettings((current) => ({ ...current, confirmDangerousActions: checked }))}
              />
            </Space>
            <Space align="center" className="settings-row command-history-setting-row">
              <div>
                <Text strong>{t('field.recordCommandHistory')}</Text>
                <Text type="secondary">{t('settings.commandHistoryHint')}</Text>
              </div>
              <Space size={8}>
                <InputNumber
                  aria-label={t('field.commandHistoryLimit')}
                  min={20}
                  max={500}
                  step={20}
                  value={settings.commandHistoryLimit}
                  onChange={updateCommandHistoryLimit}
                />
                <Switch
                  checked={settings.recordCommandHistory !== false}
                  onChange={(checked) => setSettings((current) => ({
                    ...current,
                    recordCommandHistory: checked,
                  }))}
                />
              </Space>
            </Space>
            <Button
              icon={<HistoryOutlined />}
              size="small"
              type="text"
              onClick={() => openCommandCenter('history')}
            >
              {t('action.manageCommandHistory')}
            </Button>
            <Form layout="vertical">
              <Form.Item label={t('field.logLevel')}>
                <Select
                  value={settings.logLevel}
                  options={[
                    { value: 'error', label: t('logLevel.error') },
                    { value: 'warn', label: t('logLevel.warn') },
                    { value: 'info', label: t('logLevel.info') },
                    { value: 'debug', label: t('logLevel.debug') },
                  ]}
                  onChange={(value) => setSettings((current) => ({ ...current, logLevel: value }))}
                />
              </Form.Item>
              <Text type="secondary">{t('settings.logLevelHint')}</Text>
            </Form>
          </Space>
          </SettingsPanel>

          <SettingsPanel activeSection={settingsSection} section="shortcuts" title={t('settings.shortcuts')}>
          <Form layout="vertical" className="settings-shortcut-form">
            <Form.Item label={t('field.shortcutModifier')}>
              <Select
                value={shortcutModifier}
                options={[
                  { value: 'auto', label: t('shortcutModifier.auto') },
                  { value: 'meta', label: t('shortcutModifier.meta') },
                  { value: 'ctrl', label: t('shortcutModifier.ctrl') },
                ]}
                onChange={(value) => setSettings((current) => ({ ...current, shortcutModifier: value }))}
              />
            </Form.Item>
            <Text type="secondary">{t('settings.shortcutModifierHint', { shortcut: shortcutLabel })}</Text>
          </Form>
          <div className="settings-shortcut-editor">
            <div className="settings-shortcut-editor-head">
              <div>
                <Text strong>{t('settings.actionShortcuts')}</Text>
                <Text type="secondary">{t('settings.shortcutBindingHint')}</Text>
              </div>
              <Button
                icon={<ReloadOutlined />}
                onClick={resetShortcutBindings}
                size="small"
                type="text"
              >
                {t('action.resetShortcuts')}
              </Button>
            </div>
            <div className="settings-shortcut-editor-grid">
              {shortcutEditorRows.map((row) => (
                <div className="settings-shortcut-editor-row" key={row.action}>
                  <Text>{t(row.labelKey)}</Text>
                  <Select
                    aria-label={t(row.labelKey)}
                    onChange={(value) => setSettings((current) => ({
                      ...current,
                      shortcutBindings: updateShortcutBinding(current.shortcutBindings, row.action, value),
                    }))}
                    options={shortcutKeyOptions}
                    size="small"
                    value={row.key}
                  />
                </div>
              ))}
            </div>
          </div>
          <div className="shortcut-group-grid">
            {shortcutGroups.map((group) => (
              <div key={group.key} className="shortcut-group">
                <Text strong>{t(`shortcut.group.${group.key}`)}</Text>
                <List
                  size="small"
                  dataSource={group.items}
                  renderItem={([shortcut, actionKey]) => (
                    <List.Item>
                      <Text code>{shortcut}</Text>
                      <Text>{t(actionKey)}</Text>
                    </List.Item>
                  )}
                />
              </div>
            ))}
          </div>
          </SettingsPanel>
        </div>
      </div>
    </div>
  );

  const renderHelpPanel = () => (
    <div className="help-panel">
      <div className="help-hero">
        <div>
          <Text type="secondary">{t('help.kicker')}</Text>
          <Title level={4}>{t('help.title')}</Title>
          <Text type="secondary">{t('help.description')}</Text>
        </div>
        <Space wrap>
          <Tag color="processing">{`${t('metric.activeSessions')}: ${workspaceInsights.sessions.active}`}</Tag>
          <Tag color="cyan">{`${t('metric.providers')}: ${workspaceInsights.providers.total}`}</Tag>
          <Tag color="gold">{`${t('metric.auditRecords')}: ${auditRecords.length}`}</Tag>
        </Space>
      </div>

      <Alert type="info" showIcon message={t('help.quickOpenHint', { shortcut: commandPaletteShortcut })} />

      <div className="help-shortcut-grid">
        {shortcutGroups.map((group) => (
          <section key={group.key} className="help-shortcut-card">
            <Text strong>{t(`shortcut.group.${group.key}`)}</Text>
            <List
              size="small"
              dataSource={group.items}
              renderItem={([shortcut, actionKey]) => (
                <List.Item>
                  <Text code>{shortcut}</Text>
                  <Text>{t(actionKey)}</Text>
                </List.Item>
              )}
            />
          </section>
        ))}
      </div>

      <div className="help-workflow-grid">
        {[
          ['connections', 'nav.connections', 'help.workflow.connections'],
          ['sessions', 'nav.sessions', 'help.workflow.sessions'],
          ['audit', 'nav.audit', 'help.workflow.audit'],
          ['extensions', 'nav.extensions', 'help.workflow.extensions'],
        ].map(([key, titleKey, bodyKey]) => (
          <button
            key={key}
            type="button"
            className="help-workflow-card"
            onClick={() => {
              setSelectedNav(key);
              setHelpOpen(false);
            }}
          >
            <Text strong>{t(titleKey)}</Text>
            <Text type="secondary">{t(bodyKey)}</Text>
          </button>
        ))}
      </div>
    </div>
  );

  const executeTunnelStart = async (values, selectedProfileId = '', presetId = '') => {
    if (tunnelBusyRef.current) return;
    tunnelBusyRef.current = true;
    setTunnelBusy(true);
    try {
      const resolvedProfile = await resolveSelectedSshProfile(selectedProfileId);
      const auth = buildSshConnectionAuth({
        authType: values.sshAuthType,
        passphrase: values.sshPassphrase,
        password: values.sshPassword,
        privateKey: values.sshPrivateKey,
      }, resolvedProfile);
      const sshAgent = buildSshAgentConfig({
        agentSocketPath: values.sshAgentSocketPath,
      }, resolvedProfile);
      const sshNetwork = buildSshNetworkConfig({
        connectTimeoutSeconds: values.sshConnectTimeoutSeconds,
        keepAliveIntervalSeconds: values.sshKeepAliveIntervalSeconds,
        keepAliveMaxFailures: values.sshKeepAliveMaxFailures,
      }, resolvedProfile);
      const sshSecurity = buildSshSecurityConfig({
        hostKeyPolicy: values.sshHostKeyPolicy,
        knownHostsPath: values.sshKnownHostsPath,
      }, resolvedProfile);
      const info = await TunnelAPI.Start({
        name: values.name || 'Tunnel',
        sshHost: values.sshHost,
        sshPort: values.sshPort || 22,
        sshUser: values.sshUser,
        sshAuthType: auth.authType,
        sshAgentSocketPath: sshAgent.agentSocketPath,
        sshConnectTimeoutSeconds: sshNetwork.connectTimeoutSeconds,
        sshKeepAliveIntervalSeconds: sshNetwork.keepAliveIntervalSeconds,
        sshKeepAliveMaxFailures: sshNetwork.keepAliveMaxFailures,
        sshPassphrase: auth.passphrase,
        sshPassword: auth.password,
        sshPrivateKey: auth.privateKey,
        sshHostKeyPolicy: sshSecurity.hostKeyPolicy,
        sshKnownHostsPath: sshSecurity.knownHostsPath,
        localHost: values.localHost || '127.0.0.1',
        localPort: values.localPort,
        remoteHost: values.remoteHost,
        remotePort: values.remotePort,
      });
      setTunnels((current) => [...current, { ...info, presetId }]);
      messageApi.success(t('message.tunnelStarted'));
    } catch (error) {
      showOperationError('message.tunnelFailed', error);
    } finally {
      tunnelBusyRef.current = false;
      setTunnelBusy(false);
    }
  };

  const startTunnel = async () => {
    let values;
    try {
      values = await tunnelForm.validateFields();
    } catch {
      return;
    }
    return executeTunnelStart(values, tunnelProfileId, editingTunnelPresetId);
  };

  const startTunnelPreset = (preset) => {
    const profile = profiles.find((item) => item.id === preset.profileId && item.providerType === 'ssh');
    const fields = buildSshProfileFields(profile);
    if (!fields) {
      messageApi.warning(t('tunnel.profileUnavailable'));
      return;
    }
    const values = {
      name: preset.name,
      localHost: preset.localHost,
      localPort: preset.localPort,
      remoteHost: preset.remoteHost,
      remotePort: preset.remotePort,
      sshAgentSocketPath: fields.agentSocketPath,
      sshAuthType: fields.authType,
      sshConnectTimeoutSeconds: fields.connectTimeoutSeconds,
      sshHost: fields.host,
      sshHostKeyPolicy: fields.hostKeyPolicy,
      sshKeepAliveIntervalSeconds: fields.keepAliveIntervalSeconds,
      sshKeepAliveMaxFailures: fields.keepAliveMaxFailures,
      sshKnownHostsPath: fields.knownHostsPath,
      sshPort: fields.port,
      sshUser: fields.username,
    };
    return executeTunnelStart(values, preset.profileId, preset.id);
  };

  const stopTunnel = async (id) => {
    if (!id || tunnelBusyRef.current) return;
    tunnelBusyRef.current = true;
    setTunnelBusy(true);
    try {
      await TunnelAPI.Stop(id);
      setTunnels((current) => current.filter((item) => item.id !== id));
      messageApi.success(t('message.tunnelStopped'));
    } catch (error) {
      showOperationError('message.tunnelFailed', error, {
        retry: () => stopTunnel(id),
      });
    } finally {
      tunnelBusyRef.current = false;
      setTunnelBusy(false);
    }
  };

  const confirmStopTunnel = (tunnel, display) => requestDangerousAction({
    actionKey: 'action.stop',
    contentKey: 'confirm.stopTunnelContent',
    contentValues: {
      name: display?.name || tunnel?.name || '-',
      route: (display?.route || '-').replace(' -> ', ' → '),
    },
    onConfirm: () => stopTunnel(tunnel.id),
    titleKey: 'confirm.stopTunnelTitle',
  });

  const renderTunnels = () => {
    const tunnelSummary = buildTunnelSummary(tunnels);
    const selectedTunnelConnection = buildSavedSshConnections(profiles)
      .find((item) => item.id === tunnelProfileId);
    return (
      <div className="workspace-page remote-workspace-page">
        <div className="page-header">
          <div>
            <Text type="secondary">{t('nav.tunnels')}</Text>
            <Title level={3}>{t('section.tunnels')}</Title>
          </div>
          <Button icon={<PlusOutlined />} onClick={() => resetTunnelEditor()}>{t('action.newForwardingRule')}</Button>
        </div>
        <div className="remote-summary-grid">
          <MetricCard
            label={t('metric.activeTunnels')}
            value={tunnelSummary.active}
            meta={tunnelSummary.failed > 0 ? t('tunnel.failedCount', { count: tunnelSummary.failed }) : ''}
          />
          <MetricCard label={t('metric.savedTunnelRules')} value={tunnelPresets.length} />
          <MetricCard label={t('metric.localPorts')} value={tunnelSummary.localPorts.length || 0} meta={tunnelSummary.localPorts.join(', ')} />
        </div>
        <div className="tunnel-workbench">
          <div className="remote-context-panel">
            <Text strong>{t(editingTunnelPresetId ? 'section.editTunnelRule' : 'section.newTunnelRule')}</Text>
            <Text type="secondary">{t('tunnel.formHint')}</Text>
            <Form
              form={tunnelForm}
              layout="vertical"
              className="remote-context-form"
              initialValues={{
                sshPort: 22,
                sshAgentSocketPath: '',
                sshConnectTimeoutSeconds: 10,
                sshKeepAliveIntervalSeconds: 0,
                sshKeepAliveMaxFailures: 3,
                sshHostKeyPolicy: 'accept-new',
                localHost: '127.0.0.1',
                profileId: '',
                sshAuthType: 'password',
              }}
            >
              <Form.Item name="profileId" hidden><Input /></Form.Item>
              <SavedSSHProfileSelect
                disabled={tunnelBusy}
                onChange={selectTunnelSshProfile}
                onManageConnections={() => setSelectedNav('connections')}
                profiles={profiles}
                value={tunnelProfileId}
              />
              <Form.Item name="name" label={t('field.name')}>
                <Input />
              </Form.Item>
              <div className={selectedTunnelConnection ? 'remote-manual-fields is-hidden' : 'remote-manual-fields'}>
                <Space size={8} className="remote-form-row">
                  <Form.Item name="sshHost" label={t('field.host')} rules={[{ required: true, message: t('validation.required') }]}>
                    <Input placeholder={t('placeholder.host')} />
                  </Form.Item>
                  <Form.Item name="sshPort" label={t('field.port')} initialValue={22}>
                    <InputNumber min={1} max={65535} />
                  </Form.Item>
                </Space>
                <Form.Item name="sshUser" label={t('field.username')} rules={[{ required: true, message: t('validation.required') }]}>
                  <Input />
                </Form.Item>
                <Form.Item name="sshAuthType" label={t('field.authType')} initialValue="password">
                  <Segmented
                    block
                    onChange={setTunnelAuthType}
                    options={[
                      { value: 'password', label: t('auth.password') },
                      { value: 'privateKey', label: t('auth.privateKey') },
                      { value: 'agent', label: t('auth.agent') },
                    ]}
                  />
                </Form.Item>
              </div>
              {(!selectedTunnelConnection?.hasSavedSecret && tunnelAuthType === 'password') && (
                <Form.Item name="sshPassword" label={t('field.password')}>
                  <Input.Password placeholder={selectedTunnelConnection ? t('placeholder.oneTimeCredential') : ''} />
                </Form.Item>
              )}
              {(!selectedTunnelConnection?.hasSavedSecret && tunnelAuthType === 'privateKey') && (
                <>
                  <Form.Item name="sshPrivateKey" label={t('field.privateKey')} rules={[{ required: true, message: t('validation.required') }]}>
                    <Input.TextArea rows={4} />
                  </Form.Item>
                  <Form.Item name="sshPassphrase" label={t('field.passphrase')}>
                    <Input.Password placeholder={selectedTunnelConnection ? t('placeholder.oneTimeCredential') : ''} />
                  </Form.Item>
                </>
              )}
              {tunnelAuthType === 'agent' && <SshAgentSocketField name="sshAgentSocketPath" />}
              <Collapse
                className="ssh-advanced-collapse"
                ghost
                items={[{
                  key: 'tunnel-security',
                  label: t('section.sshSecurity'),
                  children: (
                    <>
                      <SshSecurityFields
                        pathName="sshKnownHostsPath"
                        policyName="sshHostKeyPolicy"
                      />
                      <SshNetworkFields
                        connectTimeoutName="sshConnectTimeoutSeconds"
                        keepAliveIntervalName="sshKeepAliveIntervalSeconds"
                        keepAliveMaxFailuresName="sshKeepAliveMaxFailures"
                      />
                    </>
                  ),
                }]}
                size="small"
              />
              <Space size={8} className="remote-form-row">
                <Form.Item name="localHost" label={t('field.localHost')} initialValue="127.0.0.1">
                  <Input />
                </Form.Item>
                <Form.Item name="localPort" label={t('field.localPort')} rules={[{ required: true, message: t('validation.required') }]}>
                  <InputNumber min={1} max={65535} />
                </Form.Item>
              </Space>
              <Space size={8} className="remote-form-row">
                <Form.Item name="remoteHost" label={t('field.remoteHost')} rules={[{ required: true, message: t('validation.required') }]}>
                  <Input />
                </Form.Item>
                <Form.Item name="remotePort" label={t('field.remotePort')} rules={[{ required: true, message: t('validation.required') }]}>
                  <InputNumber min={1} max={65535} />
                </Form.Item>
              </Space>
              <div className="tunnel-form-actions">
                <Button type="primary" loading={tunnelBusy} onClick={() => startTunnel()}>{t('action.start')}</Button>
                <Button
                  disabled={!tunnelProfileId}
                  icon={<SaveOutlined />}
                  onClick={saveTunnelPreset}
                >
                  {t(editingTunnelPresetId ? 'action.updateForwardingRule' : 'action.saveForwardingRule')}
                </Button>
              </div>
            </Form>
          </div>
          <TunnelWorkspaceList
            busy={tunnelBusy}
            onDuplicatePreset={duplicateTunnelPresetConfig}
            onEditPreset={editTunnelPreset}
            onNewPreset={() => resetTunnelEditor()}
            onQueryChange={setTunnelPresetQuery}
            onRemovePreset={confirmRemoveTunnelPreset}
            onRemoveRuntime={(item) => stopTunnel(item.id)}
            onStartPreset={startTunnelPreset}
            onStopRuntime={(item) => confirmStopTunnel(item, buildTunnelDisplay(item))}
            presets={tunnelPresets}
            profiles={profiles}
            query={tunnelPresetQuery}
            tunnels={tunnels}
          />
        </div>
      </div>
    );
  };

  const renderAuditLogs = () => (
    <div className="workspace-page">
      <div className="page-header">
        <div>
          <Text type="secondary">{t('nav.audit')}</Text>
          <Title level={3}>{t('section.auditLogs')}</Title>
        </div>
        <Space>
          <Button danger onClick={confirmClearAuditRecords} disabled={auditRecords.length === 0}>{t('action.clear')}</Button>
        </Space>
      </div>
      <div className="audit-hint-strip">{t('settings.auditHint')}</div>
      {auditWorkspaceSummary && (
        <div className="audit-live-session-strip">
          <span className="provider-icon"><AuditOutlined /></span>
          <div className="audit-live-session-copy">
            <strong>
              {sessionIdentityDisplays[auditWorkspaceSession.id]?.displayName || auditWorkspaceSession.label}
            </strong>
            <small>{t('audit.currentSessionDescription')}</small>
          </div>
          <div className="audit-live-session-facts">
            <span>
              <small>{t('label.auditEvents')}</small>
              <strong>{auditWorkspaceSummary.eventCount}</strong>
            </span>
            <span>
              <small>{t('metric.recordings')}</small>
              <strong>{auditWorkspaceSummary.captureCount}</strong>
            </span>
            <span className={auditWorkspaceRecordingState === 'pending' ? 'tone-warning' : 'tone-success'}>
              <small>{t('label.recording')}</small>
              <strong>{t(`recording.state.${auditWorkspaceRecordingState}`)}</strong>
            </span>
          </div>
          <Button
            icon={<SaveOutlined />}
            disabled={auditWorkspaceSummary.finalized}
            onClick={() => saveCurrentAuditSnapshot(auditWorkspaceSession.id)}
          >
            {t('action.saveAuditSnapshot')}
          </Button>
        </div>
      )}
      <div className="audit-summary-grid">
        <MetricCard label={t('metric.recordings')} value={auditRecords.length} />
        <MetricCard label={t('metric.visibleRecords')} value={visibleAuditRecords.length} />
        <MetricCard
          label={t('metric.auditEvents')}
          value={auditRecords.reduce((count, record) => count + (record.auditEvents || []).length, 0)}
        />
      </div>
      <div className="list-toolbar">
        <Input.Search
          allowClear
          className="list-search"
          value={auditQuery}
          onChange={(event) => setAuditQuery(event.target.value)}
          placeholder={t('placeholder.auditSearch')}
        />
        <Select
          className="audit-session-filter"
          value={auditSessionFilter}
          onChange={setAuditSessionFilter}
          options={auditSessionOptions}
        />
        <Select
          className="provider-filter"
          value={auditProviderFilter}
          onChange={setAuditProviderFilter}
          options={auditProviderOptions}
        />
      </div>
      <List
        className="profile-list audit-record-list"
        dataSource={visibleAuditRecords}
        locale={{
          emptyText: (
            <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={t('empty.noAuditRecords')}>
              <Button
                onClick={() => saveCurrentAuditSnapshot(auditWorkspaceSession?.id)}
                disabled={!auditWorkspaceSession}
              >
                {t('action.saveAuditSnapshot')}
              </Button>
            </Empty>
          ),
        }}
        renderItem={(record) => {
          const summary = buildAuditRecordSummary(record);
          return (
            <List.Item
              actions={[
                <Button key="replay" size="small" onClick={() => openAuditReplay(record)}>{t('action.replay')}</Button>,
                <Button key="cast" size="small" onClick={() => exportAuditRecord(record, 'cast')}>{t('action.exportCast')}</Button>,
                <Button key="log" size="small" onClick={() => exportAuditRecord(record, 'log')}>{t('action.exportLog')}</Button>,
                <Button key="delete" size="small" danger onClick={() => confirmDeleteAuditRecord(record)}>{t('action.delete')}</Button>,
              ]}
            >
              <List.Item.Meta
                avatar={<span className="provider-icon"><AuditOutlined /></span>}
                title={(
                  <span className="audit-record-title">
                    <strong>{summary.title}</strong>
                    <small>{summary.providerType}</small>
                  </span>
                )}
                description={(
                  <span className="audit-record-description">
                    <span>{`${record.startedAt || '-'} -> ${record.endedAt || '-'}`}</span>
                    <span className="audit-record-badges">
                      <span>{t('audit.connectionSegment', { count: (Number(record.revision) || 0) + 1 })}</span>
                      <span>{`${t('label.auditEvents')}: ${summary.eventCount}`}</span>
                      <span>{`${t('label.duration')}: ${formatReplayTime(summary.duration)}`}</span>
                      {summary.hasRecording && <span>{t('label.recording')}</span>}
                    </span>
                  </span>
                )}
              />
            </List.Item>
          );
        }}
      />
      <Drawer
        className={`audit-replay-drawer${replayExpanded ? ' is-expanded' : ''}`}
        title={replayRecord ? `${t('action.replay')} · ${replayRecord.title}` : t('action.replay')}
        width={screens.md === false || replayExpanded ? '100%' : 920}
        open={!!replayRecord}
        onClose={closeAuditReplay}
        extra={replayRecord && (
          <Space>
            <Tooltip title={t(replayExpanded ? 'action.collapseReplay' : 'action.expandReplay')}>
              <Button
                aria-label={t(replayExpanded ? 'action.collapseReplay' : 'action.expandReplay')}
                className="audit-drawer-expand"
                icon={replayExpanded ? <FullscreenExitOutlined /> : <FullscreenOutlined />}
                onClick={() => setReplayExpanded((current) => !current)}
                type="text"
              />
            </Tooltip>
            <Button
              aria-label={t('action.exportCast')}
              className="audit-drawer-export"
              icon={<VideoCameraOutlined />}
              onClick={() => exportAuditRecord(replayRecord, 'cast')}
            >
              <span>{t('action.exportCast')}</span>
            </Button>
            <Button
              aria-label={t('action.exportLog')}
              className="audit-drawer-export"
              icon={<FileTextOutlined />}
              onClick={() => exportAuditRecord(replayRecord, 'log')}
            >
              <span>{t('action.exportLog')}</span>
            </Button>
          </Space>
        )}
      >
        {replayRecord && (
          <div className="audit-replay-content">
            <Suspense fallback={<ReplayLoadingState />}>
              <AuditReplayPlayer locale={locale} record={replayRecord} />
            </Suspense>
          </div>
        )}
      </Drawer>
    </div>
  );

  const renderContent = () => {
    if (selectedNav === 'connections') return renderConnections();
    if (selectedNav === 'files') return renderFiles();
    if (selectedNav === 'tunnels') return renderTunnels();
    if (selectedNav === 'extensions') return renderExtensions();
    if (selectedNav === 'audit') return renderAuditLogs();
    if (selectedNav === 'settings') return renderSettings();
    return null;
  };

  const isDarkTheme = resolveAppTheme(settings.appTheme) === 'dark';
  const openLanguageSettings = () => {
    setSettingsSection('interface');
    setSettingsOpen(true);
  };
  const paletteItems = buildPaletteItems({
    activeSessionId: activeKey,
    activeSessionHasTarget: Boolean(sessionIdentityDisplays[activeKey]?.copyValue),
    activeSessionProtected: Boolean(activeSession?.protected),
    activeSessionReconnecting: isSessionReconnecting(activeKey),
    attentionCount: unreadSessionCount,
    canNavigateSessions: sessionNavigationState.canNavigate,
    closableClosedCount: sessionClosePlans.closed.closingSessions.length,
    closableOtherCount: sessionClosePlans.others.closingSessions.length,
    closableSessionCount: sessionClosePlans.all.closingSessions.length,
    closedSessionCount: currentSessionSummary.closed,
    restorableSessionCount: closedSessions.length,
    reconnectableSessionCount: sessionReconnectBatchActionCount,
    favoriteConnectionCount: profiles.filter((profile) => profile.favorite).length,
    fileProviders,
    profiles,
    quickCommands,
    quickCommandCanRun: quickCommandSummary.canRun,
    quickCommandProviderType: activeSession?.providerType || 'all',
    providers: connectionProviders,
    terminalProviders: providers,
    sessions,
    sessionDisplayLabels,
    sessionCount: sessions.length,
    setSelectedNav,
    activateSession,
    openDrawer,
    openExtensionsForProvider,
    openFileProvider,
    openProfile,
    runQuickCommand,
    runConnectionAction: runConnectionPaletteAction,
    runSessionAction: runSessionPaletteAction,
    savedConnectionCount: profiles.length,
    openQuickCommands: () => openCommandCenter('library'),
    openLanguageSettings,
    setHelpOpen,
    saveWorkspace,
    restoreWorkspace,
    workspaceActionState,
    commandPaletteShortcut,
  });
  const closePalette = () => {
    setPaletteOpen(false);
  };

  const runPaletteEmptyAction = (action) => {
    closePalette();
    if (action === 'local') launchDefaultTerminal('local');
    if (action === 'ssh') openDrawer('ssh');
    if (action === 'connections') setSelectedNav('connections');
  };

  const workspaceMenuActions = {
    saveWorkspace,
    restoreWorkspace: () => restoreWorkspace(),
    quickCommands: () => openCommandCenter('library'),
    commandHistory: () => openCommandCenter('history'),
    language: openLanguageSettings,
    help: () => setHelpOpen(true),
    extensions: () => setSelectedNav('extensions'),
    settings: () => setSelectedNav('settings'),
  };
  const workspaceMenuItems = [
    {
      key: 'saveWorkspace',
      disabled: workspaceActionState.save.disabled,
      icon: <SaveOutlined />,
      label: t('action.saveWorkspace'),
    },
    {
      key: 'restoreWorkspace',
      disabled: workspaceActionState.restore.disabled,
      icon: <ReloadOutlined />,
      label: t('action.restoreWorkspace'),
    },
    { key: 'quickCommands', icon: <CodeOutlined />, label: t('action.commands') },
    { key: 'commandHistory', icon: <HistoryOutlined />, label: t('action.commandHistory') },
    { key: 'language', icon: <GlobalOutlined />, label: t('action.language') },
    { key: 'help', icon: <QuestionCircleOutlined />, label: t('action.help') },
    { key: 'extensions', icon: <AppstoreAddOutlined />, label: t('nav.extensions') },
    { key: 'settings', icon: <SettingOutlined />, label: t('nav.settings') },
  ];
  const sessionMenuActions = {
    restoreClosed: restoreLastClosedSession,
    view: () => setSessionView(sessionView === 'tabs' ? 'grid' : 'tabs'),
    focus: () => setFocusMode((current) => !current),
    copy: copyTerminalSelection,
    copyTarget: () => copySessionTarget(),
    paste: pasteClipboardToTerminal,
    clear: clearActiveTerminal,
    reset: resetActiveTerminal,
    copyTranscript: copyTerminalTranscript,
    exportTranscript: exportTerminalTranscript,
    history: () => openCommandCenter('history'),
    broadcast: openBroadcastCommand,
    saveAudit: () => {
      saveCurrentAuditSnapshot(activeKey);
    },
    zoomIn: () => zoomTerminalFont(1),
    zoomOut: () => zoomTerminalFont(-1),
    zoomReset: resetTerminalFont,
    previousSession: () => switchSession('previous'),
    nextSession: () => switchSession('next'),
    nextAttention: activateNextAttentionSession,
    markAllAttentionRead: markAllSessionAttentionRead,
    rename: () => openRenameSession(),
    protect: () => toggleProtectedSession(),
    unprotect: () => toggleProtectedSession(),
    reconnect: () => reconnectSession(),
    reconnectDisconnected: reconnectDisconnectedSessions,
    closeClosed: confirmCloseClosedSessions,
    closeOthers: confirmCloseOtherSessions,
    closeAll: confirmCloseAllSessions,
  };
  const sessionMenuItems = [
    {
      key: 'restoreClosed',
      icon: <HistoryOutlined />,
      label: t('action.restoreClosedSession'),
      disabled: closedSessions.length === 0,
    },
    { type: 'divider' },
    {
      key: 'view',
      label: sessionView === 'tabs' ? t('action.grid') : t('action.tabs'),
      disabled: sessions.length === 0,
    },
    {
      key: 'focus',
      icon: focusMode ? <FullscreenExitOutlined /> : <FullscreenOutlined />,
      label: focusMode ? t('action.exitFocus') : t('action.focusMode'),
      disabled: sessions.length === 0,
    },
    unreadSessionCount > 0 && { type: 'divider' },
    unreadSessionCount > 0 && {
      key: 'nextAttention',
      icon: <BellOutlined />,
      label: t('action.nextAttentionSessionCount', { count: unreadSessionCount }),
    },
    unreadSessionCount > 0 && {
      key: 'markAllAttentionRead',
      icon: <ClearOutlined />,
      label: t('action.markAllSessionActivityRead'),
    },
    activeKey && { type: 'divider' },
    activeKey && {
      key: 'copy',
      icon: <CopyOutlined />,
      label: t('action.copySelection'),
    },
    activeKey && {
      key: 'paste',
      icon: <CopyOutlined />,
      label: t('action.pasteClipboard'),
    },
    activeKey && {
      key: 'copyTarget',
      icon: <CopyOutlined />,
      label: t('action.copySessionTarget'),
      disabled: !sessionIdentityDisplays[activeKey]?.copyValue,
    },
    activeKey && {
      key: 'clear',
      icon: <ClearOutlined />,
      label: t('action.clearTerminal'),
    },
    activeKey && {
      key: 'copyTranscript',
      icon: <FileTextOutlined />,
      label: t('action.copyTranscript'),
    },
    activeKey && {
      key: 'history',
      icon: <HistoryOutlined />,
      label: t('action.commandHistory'),
    },
    activeKey && {
      key: 'broadcast',
      icon: <SendOutlined />,
      label: t('action.broadcastCommand'),
      disabled: broadcastTargets.length < 2,
    },
    activeKey && {
      key: 'exportTranscript',
      icon: <ExportOutlined />,
      label: t('action.exportTranscript'),
    },
    activeKey && {
      key: 'saveAudit',
      icon: <AuditOutlined />,
      label: t('action.saveAuditSnapshot'),
    },
    activeKey && {
      key: 'reset',
      icon: <ReloadOutlined />,
      label: t('action.resetTerminal'),
    },
    activeKey && { type: 'divider' },
    activeKey && {
      key: 'zoomIn',
      icon: <PlusOutlined />,
      label: t('action.zoomIn'),
    },
    activeKey && {
      key: 'zoomOut',
      icon: <MinusOutlined />,
      label: t('action.zoomOut'),
    },
    activeKey && {
      key: 'zoomReset',
      label: t('action.zoomReset'),
    },
    activeKey && { type: 'divider' },
    activeKey && {
      key: 'previousSession',
      label: t('action.previousSession'),
      disabled: !sessionNavigationState.canNavigate,
    },
    activeKey && {
      key: 'nextSession',
      label: t('action.nextSession'),
      disabled: !sessionNavigationState.canNavigate,
    },
    activeKey && { type: 'divider' },
    activeKey && {
      key: 'rename',
      icon: <EditOutlined />,
      label: t('action.renameSession'),
    },
    activeKey && {
      key: activeSession?.protected ? 'unprotect' : 'protect',
      icon: activeSession?.protected ? <UnlockOutlined /> : <LockOutlined />,
      label: t(activeSession?.protected ? 'action.unprotectSession' : 'action.protectSession'),
    },
    activeKey && {
      key: 'reconnect',
      disabled: isSessionReconnecting(activeKey),
      icon: isSessionReconnecting(activeKey) ? <LoadingOutlined spin /> : <ReloadOutlined />,
      label: t('action.reconnect'),
    },
    sessionReconnectBatchActionCount > 0 && {
      key: 'reconnectDisconnected',
      icon: <ReloadOutlined />,
      label: t('action.reconnectDisconnectedSessionsCount', {
        count: sessionReconnectBatchActionCount,
      }),
    },
    currentSessionSummary.closed > 0 && {
      key: 'closeClosed',
      icon: <DeleteOutlined />,
      label: t('action.closeClosed'),
      disabled: sessionClosePlans.closed.closingSessions.length === 0,
    },
    activeKey && sessions.length > 1 && {
      key: 'closeOthers',
      icon: <DeleteOutlined />,
      label: t('action.closeOthers'),
      disabled: sessionClosePlans.others.closingSessions.length === 0,
      danger: true,
    },
    {
      key: 'closeAll',
      icon: <DeleteOutlined />,
      label: t('action.closeAll'),
      disabled: sessionClosePlans.all.closingSessions.length === 0,
      danger: true,
    },
  ].filter(Boolean);

  return (
    <ConfigProvider theme={{
      algorithm: isDarkTheme ? antdTheme.darkAlgorithm : antdTheme.defaultAlgorithm,
      token: {
        borderRadius: 6,
        colorPrimary: isDarkTheme ? '#7dd3fc' : '#176b87',
        colorInfo: isDarkTheme ? '#7dd3fc' : '#176b87',
        fontFamily: "Inter, 'PingFang SC', 'Microsoft YaHei', Arial, sans-serif",
      },
    }}>
    {messageContextHolder}
    {notificationContextHolder}
    {modalContextHolder}
    <Layout className={`app-shell theme-${isDarkTheme ? 'dark' : 'light'}${focusMode ? ' focus-mode' : ''}`}>
      <SessionQuickSwitcher
        items={sessionSwitcherItems}
        open={sessionSwitchState.open}
        selectedId={sessionSwitchState.selectedId}
      />
      <Sider
        breakpoint="lg"
        collapsed={sidebarCompact}
        collapsedWidth={68}
        collapsible
        className="workspace-sidebar"
        trigger={null}
        width={248}
      >
        <div className="brand-block">
          <div className="brand-mark"><ThunderboltOutlined /></div>
          {!sidebarCompact && (
            <div>
              <Title level={4}>{t('app.title')}</Title>
              <Text type="secondary">{t('app.subtitle')}</Text>
            </div>
          )}
        </div>

        <Menu
          className="workspace-nav"
          inlineCollapsed={sidebarCompact}
          mode="inline"
          selectedKeys={[selectedNav]}
          onSelect={({ key }) => setSelectedNav(key)}
          items={[
            { key: 'connections', icon: <CloudServerOutlined />, label: t('nav.connections') },
            {
              key: 'sessions',
              icon: (
                <Badge
                  className={`session-nav-badge${sessionAttentionSummary.errors > 0 ? ' tone-error' : ''}`}
                  dot={unreadSessionCount > 0}
                >
                  <CodeOutlined />
                </Badge>
              ),
              label: (
                <span className="workspace-nav-label">
                  <span>{t('nav.sessions')}</span>
                  {unreadSessionCount > 0 && (
                    <span
                      aria-label={t(
                        sessionAttentionSummary.errors > 0
                          ? 'session.activity.errorCount'
                          : 'session.activity.unreadCount',
                        {
                          count: sessionAttentionSummary.errors > 0
                            ? sessionAttentionSummary.errors
                            : unreadSessionCount,
                        },
                      )}
                      className={`workspace-nav-count${sessionAttentionSummary.errors > 0 ? ' tone-error' : ''}`}
                    >
                      {unreadSessionCount}
                    </span>
                  )}
                </span>
              ),
            },
            { key: 'files', icon: <FolderOpenOutlined />, label: t('nav.files') },
            { key: 'tunnels', icon: <ApiOutlined />, label: t('nav.tunnels') },
            { key: 'audit', icon: <AuditOutlined />, label: t('nav.audit') },
            { key: 'extensions', icon: <AppstoreAddOutlined />, label: t('nav.extensions') },
            { key: 'settings', icon: <SettingOutlined />, label: t('nav.settings') },
          ]}
        />

        {!sidebarCompact && (
          <>
            <div className="sidebar-section">
              <div className="section-title">
                <span>{t('section.quickConnect')}</span>
                <Tooltip title={t('action.newTerminal')}>
                  <Button type="text" size="small" icon={<PlusOutlined />} onClick={() => openDrawer()} />
                </Tooltip>
              </div>
              <List
                size="small"
                dataSource={providers}
                renderItem={(provider) => {
                  const launching = isDefaultTerminalLaunching(provider.type);
                  return (
                    <List.Item aria-busy={launching} className="provider-row">
                      <button
                        aria-label={providerLabel(provider)}
                        className="provider-row-activate"
                        disabled={launching}
                        type="button"
                        onClick={() => launchDefaultTerminal(provider.type)}
                      >
                        <Space>
                          <span className="provider-icon">
                            {launching
                              ? <LoadingOutlined spin />
                              : providerIcons[provider.type] || <CodeOutlined />}
                          </span>
                          <span>{launching ? t('action.openingConnection') : providerLabel(provider)}</span>
                        </Space>
                        <Badge status={provider.category === 'builtin' ? 'success' : 'processing'} />
                      </button>
                    </List.Item>
                  );
                }}
              />
              {sidebarQuickProfiles.length > 0 && (
                <div className="sidebar-quick-profiles">
                  <div className="section-title compact">{t('section.savedConnections')}</div>
                  <List
                    size="small"
                    dataSource={sidebarQuickProfiles}
                    renderItem={(profile) => {
                      const sessionInfo = profileSessionSummary.get(profile.id) || { activeCount: 0, focusSessionId: '' };
                      const launching = isProfileConnectionLaunching(profile, connectionLaunchKeys);
                      const health = connectionHealthPresentation(profile);
                      const primaryAction = connectionProfileLaunchModel(profile).primary;
                      const badges = buildConnectionProfileBadges(profile, sessionInfo, {
                        healthBadge: health?.badge,
                        launching,
                      })
                        .filter((badge) => badge.key !== 'group')
                        .slice(0, 2);
                      return (
                        <Dropdown
                          menu={buildConnectionProfileActionMenu(profile)}
                          trigger={['contextMenu']}
                        >
                          <List.Item
                            aria-busy={launching}
                            className={[
                              'quick-profile-row',
                              sessionInfo.activeCount > 0 ? 'active' : '',
                              launching ? 'launching' : '',
                            ].filter(Boolean).join(' ')}
                            title={`${profile.displayName} · ${localizedConnectionProfileSubtitle(profile)}`}
                          >
                            <button
                              aria-label={profile.displayName}
                              className="quick-profile-activate"
                              disabled={primaryAction.disabled}
                              type="button"
                              onClick={() => runConnectionProfilePrimaryAction(profile)}
                            >
                              <span className="provider-icon connection-profile-provider-icon">
                                {launching && primaryAction.action !== 'focus'
                                  ? <LoadingOutlined spin />
                                  : providerIcons[profile.providerType] || <CodeOutlined />}
                                <ConnectionAccentMarker accent={profile.accent} />
                              </span>
                              <span className="quick-profile-main">
                                <span>{profile.displayName}</span>
                                <small>{localizedConnectionProfileSubtitle(profile)}</small>
                                {badges.length > 0 && (
                                  <span className="quick-profile-badges">
                                    {badges.map((badge) => (
                                      <span key={badge.key} className={`connection-profile-badge tone-${badge.tone}`}>
                                        {connectionProfileBadgeLabel(badge)}
                                      </span>
                                    ))}
                                  </span>
                                )}
                              </span>
                              {profile.favorite && <StarFilled className="quick-profile-star" />}
                            </button>
                            <Tooltip title={t('action.manage')}>
                              <Dropdown menu={buildConnectionProfileActionMenu(profile)} trigger={['click']}>
                                <Button
                                  aria-label={`${t('action.manage')}: ${profile.displayName}`}
                                  className="quick-profile-menu"
                                  icon={<MoreOutlined />}
                                  size="small"
                                  type="text"
                                  onClick={(event) => event.stopPropagation()}
                                />
                              </Dropdown>
                            </Tooltip>
                          </List.Item>
                        </Dropdown>
                      );
                    }}
                  />
                </div>
              )}
            </div>

            <div className="sidebar-section sidebar-fill">
              <div className="section-title with-hint">
                <span>{t('nav.sessions')}</span>
                {sessions.length > 0 && <Text code>{numberedSessionShortcut}</Text>}
              </div>
              <SessionSidebarFilter
                query={sidebarSessionQuery}
                scope={sidebarSessionScope}
                state={sidebarSessionState}
                onActivateFirst={() => activateSession(sidebarSessions[0]?.id)}
                onQueryChange={setSidebarSessionQuery}
                onScopeChange={setSidebarSessionScope}
              />
              {sidebarSessions.length === 0 ? (
                <Empty
                  image={Empty.PRESENTED_IMAGE_SIMPLE}
                  description={t(sidebarSessionState.filtered ? 'empty.noSessionMatches' : 'empty.noSessions')}
                >
                  {sidebarSessionState.filtered && (
                    <Button
                      size="small"
                      onClick={() => {
                        setSidebarSessionQuery('');
                        setSidebarSessionScope('all');
                      }}
                    >
                      {t('action.clearFilters')}
                    </Button>
                  )}
                </Empty>
              ) : (
                <List
                  size="small"
                  dataSource={sidebarSessions}
                  renderItem={(session) => {
                    const shortcutNumber = resolveSessionShortcutNumber(sessionIds, session.id);
                    return (
                      <Dropdown
                        menu={buildSessionActionMenu(session)}
                        trigger={['contextMenu']}
                      >
                        <List.Item
                          className={session.id === activeKey ? 'session-row active' : 'session-row'}
                          draggable={sessions.length > 1 && !sidebarSessionState.filtered}
                          onDragEnd={endSessionDrag}
                          onDragOver={allowSessionDrop}
                          onDragStart={(event) => beginSessionDrag(event, session.id)}
                          onDrop={(event) => dropSessionAt(event, session.id, 'y')}
                        >
                          <button
                            aria-current={session.id === activeKey ? 'page' : undefined}
                            aria-label={sessionDisplayLabels[session.id] || session.label}
                            className="session-row-activate"
                            type="button"
                            onClick={() => activateSession(session.id)}
                          >
                            <SessionSidebarLabel
                              accent={sessionAccents[session.id]}
                              activityKind={sessionActivity[session.id]?.kind}
                              displayName={sessionDisplayLabels[session.id]}
                              identityDisplay={sessionIdentityDisplays[session.id]}
                              session={session}
                              unread={sessionActivity[session.id]?.unread}
                            />
                          </button>
                          <span className="session-row-trailing">
                            {shortcutNumber && <Text className="session-row-shortcut" code>{shortcutNumber}</Text>}
                            <Dropdown menu={buildSessionActionMenu(session)} trigger={['click']}>
                              <Button
                                aria-label={t('action.sessionActions')}
                                className="session-row-menu"
                                icon={<MoreOutlined />}
                                size="small"
                                type="text"
                                onClick={(event) => event.stopPropagation()}
                              />
                            </Dropdown>
                          </span>
                        </List.Item>
                      </Dropdown>
                    );
                  }}
                />
              )}
            </div>
          </>
        )}
      </Sider>

      <Layout className="main-layout">
        <div className="topbar">
          <Space className="topbar-command-group">
            {!focusMode && (
              <Tooltip title={t(sidebarCompact ? 'action.expandSidebar' : 'action.collapseSidebar')}>
                <Button
                  aria-label={t(sidebarCompact ? 'action.expandSidebar' : 'action.collapseSidebar')}
                  className="topbar-sidebar-toggle"
                  icon={sidebarCompact ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
                  onClick={() => setSettings((current) => ({
                    ...current,
                    sidebarMode: sidebarCompact ? 'expanded' : 'compact',
                  }))}
                />
              </Tooltip>
            )}
            <Space.Compact className="topbar-new-terminal-group">
              <Tooltip title={t('action.newTerminal')}>
                <Button
                  aria-label={t('action.newTerminal')}
                  className="topbar-new-terminal"
                  loading={isDefaultTerminalLaunching()}
                  type="primary"
                  icon={<PlusOutlined />}
                  onClick={() => launchDefaultTerminal()}
                >
                  <span className="topbar-button-label">{t('action.newTerminal')}</span>
                </Button>
              </Tooltip>
              <Dropdown
                menu={{
                  items: providers.map((provider) => ({
                    key: provider.type,
                    icon: providerIcons[provider.type] || <CodeOutlined />,
                    label: providerLabel(provider),
                  })),
                  onClick: ({ key }) => openDrawer(key),
                }}
                trigger={['click']}
              >
                <Button
                  aria-label={t('action.configureTerminal')}
                  className="topbar-new-terminal-menu"
                  icon={<DownOutlined />}
                  title={t('action.configureTerminal')}
                />
              </Dropdown>
            </Space.Compact>
            <Button className="topbar-secondary-action" icon={<CloudServerOutlined />} onClick={() => openDrawer('ssh')}>
              {t('action.quickSsh')}
            </Button>
            <Tooltip title={t('placeholder.commandPalette')}>
              <Button
                aria-label={t('placeholder.commandPalette')}
                className="command-palette-trigger"
                icon={<ThunderboltOutlined />}
                onClick={() => setPaletteOpen(true)}
              >
                <span className="command-palette-label">{t('placeholder.commandPalette')}</span>
                <Text className="command-palette-shortcut" code>{commandPaletteShortcut}</Text>
              </Button>
            </Tooltip>
            {(sessions.length > 0 || closedSessions.length > 0) && (
              <Dropdown menu={{ items: sessionMenuItems, onClick: ({ key }) => sessionMenuActions[key]?.() }} trigger={['click']}>
                <Button icon={<CodeOutlined />} aria-label={t('action.sessionActions')} title={t('action.sessionActions')} />
              </Dropdown>
            )}
            <Dropdown menu={{ items: workspaceMenuItems, onClick: ({ key }) => workspaceMenuActions[key]?.() }} trigger={['click']}>
              <Button icon={<MoreOutlined />} aria-label={t('action.workspaceActions')} title={t('action.workspaceActions')} />
            </Dropdown>
          </Space>
          <Space className="topbar-actions">
            {activeKey && selectedNav === 'sessions' && (
              <TerminalSearchControl
                ref={terminalSearchRef}
                query={terminalSearch}
                result={activeTerminalSearchResult}
                preferences={terminalSearchPreferences}
                onChange={updateTerminalSearchQuery}
                onClose={closeTerminalSearch}
                onFindPrevious={() => findInTerminal('previous')}
                onFindNext={() => findInTerminal('next')}
                onPreferencesChange={updateTerminalSearchPreferences}
              />
            )}
            <Tooltip title={t('action.language')}>
              <Button className="topbar-utility-action" aria-label={t('action.language')} icon={<GlobalOutlined />} onClick={openLanguageSettings} />
            </Tooltip>
            <Tooltip title={t('action.help')}>
              <Button className="topbar-utility-action" aria-label={t('action.help')} icon={<QuestionCircleOutlined />} onClick={() => setHelpOpen(true)} />
            </Tooltip>
            <Tooltip title={t('nav.extensions')}>
              <Button className="topbar-utility-action" aria-label={t('nav.extensions')} icon={<AppstoreAddOutlined />} onClick={() => setSelectedNav('extensions')} />
            </Tooltip>
            <Tooltip title={t('nav.settings')}>
              <Button className="topbar-utility-action" aria-label={t('nav.settings')} icon={<SettingOutlined />} onClick={() => setSelectedNav('settings')} />
            </Tooltip>
          </Space>
        </div>

        <Content className="content-area">
          {!desktopBridgeReady && (
            <Alert
              className="bridge-alert"
              type="warning"
              showIcon
              message={t('message.desktopBridgeUnavailable')}
            />
          )}
          <div
            className={selectedNav === 'sessions' ? 'content-page-layer hidden' : 'content-page-layer'}
            ref={contentPageRef}
          >
            {renderContent()}
          </div>
          <div className={selectedNav === 'sessions' ? 'session-page-layer active' : 'session-page-layer'}>
            {renderSessions()}
          </div>
        </Content>

      </Layout>

      <CommandPalette
        items={paletteItems}
        onClose={closePalette}
        onEmptyAction={runPaletteEmptyAction}
        onRun={runPaletteAction}
        open={paletteOpen}
        recentIds={paletteRecentIds}
      />

      <ConnectionGroupDialog
        editor={connectionGroupEditor}
        existingGroups={connectionGroupNames}
        onCancel={() => setConnectionGroupEditor(null)}
        onSubmit={saveConnectionGroupEdit}
      />

      <Modal
        destroyOnHidden
        open={Boolean(connectionTagEditor)}
        title={t('connection.tagsEditorTitle', { count: selectedProfileIds.length })}
        okText={t('action.apply')}
        cancelText={t('action.cancel')}
        onCancel={() => setConnectionTagEditor(null)}
        onOk={applySelectedConnectionTags}
      >
        <div className="connection-tag-editor">
          <Segmented
            block
            value={connectionTagEditor?.action || 'add'}
            options={[
              { value: 'add', label: t('action.addTags') },
              { value: 'remove', label: t('action.removeTags'), disabled: selectedConnectionTags.length === 0 },
            ]}
            onChange={(action) => setConnectionTagEditor({ action, values: [] })}
          />
          <Select
            autoFocus
            mode={connectionTagEditor?.action === 'remove' ? 'multiple' : 'tags'}
            maxCount={connectionTagEditor?.action === 'remove' ? undefined : 12}
            maxTagCount="responsive"
            value={connectionTagEditor?.values || []}
            options={(connectionTagEditor?.action === 'remove' ? selectedConnectionTags : connectionTags)
              .map((tag) => ({ label: tag, value: tag }))}
            placeholder={t(connectionTagEditor?.action === 'remove'
              ? 'placeholder.removeConnectionTags'
              : 'placeholder.connectionTags')}
            tokenSeparators={[',', '，', ';']}
            onChange={(values) => setConnectionTagEditor((current) => ({ ...current, values }))}
          />
          <Text type="secondary">{t('connection.tagsBulkHint')}</Text>
        </div>
      </Modal>

      <Drawer
        className="terminal-drawer"
        title={t(terminalDrawerIntent === 'edit'
          ? 'profile.action.edit'
          : terminalDrawerIntent === 'connection' ? 'action.newConnection' : 'drawer.newTerminal')}
        width={screens.sm === false ? '100%' : 420}
        open={drawerOpen}
        destroyOnHidden
        onClose={() => setDrawerOpen(false)}
        footer={(
          <div className="terminal-drawer-footer">
            <Button onClick={testConnection} loading={testingConnection}>{t('action.testConnection')}</Button>
            <Space>
              <Button onClick={() => setDrawerOpen(false)}>{t('action.cancel')}</Button>
              {terminalDrawerIntent === 'session' ? (
                <Button type="primary" onClick={() => createSession('create')} loading={creatingSession}>
                  {t('action.create')}
                </Button>
              ) : (
                <>
                  <Button
                    icon={<SaveOutlined />}
                    loading={creatingSession}
                    onClick={() => createSession('save')}
                    type="primary"
                  >
                    {t('action.save')}
                  </Button>
                  <Button
                    disabled={creatingSession}
                    icon={<ThunderboltOutlined />}
                    onClick={() => createSession('saveAndOpen')}
                  >
                    {t('action.saveAndOpen')}
                  </Button>
                </>
              )}
            </Space>
          </div>
        )}
      >
        <div className="drawer-provider-head">
          <span className="drawer-provider-icon">{providerIcons[selectedProvider.type] || <CodeOutlined />}</span>
          <div className="drawer-provider-copy">
            <div className="drawer-provider-title">
              <Text strong>{providerLabel(selectedProvider)}</Text>
              {selectedProviderSummary.description && (
                <Tooltip title={selectedProviderSummary.description}>
                  <InfoCircleOutlined className="drawer-provider-info" />
                </Tooltip>
              )}
              <Tag bordered={false}>
                {t(selectedProviderSummary.isExtension ? 'provider.category.extension' : 'provider.category.builtin')}
              </Tag>
              {selectedProviderSummary.isExtension && (
                <Tooltip title={t('action.manageExtension')}>
                  <Button
                    aria-label={t('action.manageExtension')}
                    className="drawer-provider-manage"
                    icon={<AppstoreAddOutlined />}
                    size="small"
                    type="text"
                    onClick={() => {
                      setDrawerOpen(false);
                      openProviderExtension({
                        extensionId: selectedProviderSummary.extensionId,
                        providerType: selectedProvider.type,
                      });
                    }}
                  />
                </Tooltip>
              )}
            </div>
            <Text type="secondary">
              {selectedProviderSummary.isExtension
                ? t('provider.runtime.extensionDescription', {
                  name: selectedProvider.name || providerLabel(selectedProvider),
                  version: selectedProviderSummary.extensionVersion,
                })
                : t('provider.runtime.builtinDescription')}
            </Text>
            {selectedProviderSummary.isExtension && (
              <div className="drawer-provider-meta">
                {selectedProviderSummary.extensionVersion && (
                  <Tooltip title={selectedProviderSummary.extensionId}>
                    <Tag>{`v${selectedProviderSummary.extensionVersion}`}</Tag>
                  </Tooltip>
                )}
                {selectedProviderSummary.capabilities.slice(0, 4).map((capability) => (
                  <Tag key={capability}>{providerCapabilityLabel(capability)}</Tag>
                ))}
              </div>
            )}
          </div>
        </div>
        {connectionTestResult && (
          <Alert
            className="connection-test-result"
            closable
            showIcon
            type={connectionTestResult.status === 'success' ? 'success' : 'error'}
            message={t(connectionTestResult.status === 'success'
              ? 'message.connectionTestSuccess'
              : 'message.connectionTestFailed')}
            description={connectionTestResult.status === 'success'
              ? t('message.connectionTestSuccessDescription')
              : <OperationErrorDescription model={connectionTestResult.model} />}
            onClose={() => setConnectionTestResult(null)}
          />
        )}
        <Form
          form={form}
          layout="vertical"
          className="terminal-form"
          onValuesChange={() => setConnectionTestResult(null)}
        >
          <Form.Item label={t('field.type')}>
            <Select value={newType} onChange={changeTerminalProvider} options={providerOptions} />
          </Form.Item>
          <Form.Item name="displayName" label={t('field.name')}>
            <Input placeholder={t('placeholder.sessionName')} />
          </Form.Item>
          <ConnectionMetadataFields groups={connectionGroupNames} tags={connectionTags} />
          {newType === 'local' && (
            <>
              <Form.Item name="shell" label={t('field.shell')}>
                <Input placeholder={t('placeholder.shell')} />
              </Form.Item>
              <Form.Item name="workingDirectory" label={t('field.workingDirectory')}>
                <Input placeholder={t('placeholder.workingDirectory')} />
              </Form.Item>
            </>
          )}
          {newType === 'ssh' && (
            <>
              <Form.Item name="credentialRef" hidden>
                <Input />
              </Form.Item>
              <Form.Item name="host" label={t('field.host')} rules={[{ required: true, message: t('validation.required') }]}>
                <Input placeholder={t('placeholder.host')} />
              </Form.Item>
              <Form.Item name="port" label={t('field.port')} initialValue={22}>
                <InputNumber min={1} max={65535} style={{ width: '100%' }} />
              </Form.Item>
              <Form.Item name="username" label={t('field.username')} rules={[{ required: true, message: t('validation.required') }]}>
                <Input />
              </Form.Item>
              <Form.Item name="authType" label={t('field.authType')} initialValue="password">
                <Select
                  onChange={setSshAuthType}
                  options={[
                    { value: 'password', label: t('auth.password') },
                    { value: 'privateKey', label: t('auth.privateKey') },
                    { value: 'agent', label: t('auth.agent') },
                  ]}
                />
              </Form.Item>
              {sshAuthType === 'password' && (
                <Form.Item name="password" label={t('field.password')}>
                  <Input.Password />
                </Form.Item>
              )}
              {sshAuthType === 'privateKey' && (
                <>
                  <Form.Item name="privateKey" label={t('field.privateKey')}>
                    <Input.TextArea rows={7} placeholder={t('placeholder.privateKey')} />
                  </Form.Item>
                  <Form.Item name="passphrase" label={t('field.passphrase')}>
                    <Input.Password />
                  </Form.Item>
                </>
              )}
              {sshAuthType === 'agent' && <SshAgentSocketField />}
              <Collapse
                className="ssh-advanced-collapse"
                ghost
                items={[{
                  key: 'ssh-advanced',
                  label: t('section.advancedSSH'),
                  children: (
                    <>
                      <SshSecurityFields />
                      <SshNetworkFields />
                      <Divider />
                      <Form.Item name="jumpHost" label={t('field.jumpHost')}>
                        <Input placeholder={t('placeholder.host')} />
                      </Form.Item>
                      <Form.Item name="jumpPort" label={t('field.jumpPort')} initialValue={22}>
                        <InputNumber min={1} max={65535} style={{ width: '100%' }} />
                      </Form.Item>
                      <Form.Item name="jumpUsername" label={t('field.jumpUsername')}>
                        <Input />
                      </Form.Item>
                      <Form.Item name="jumpPassword" label={t('field.jumpPassword')}>
                        <Input.Password />
                      </Form.Item>
                    </>
                  ),
                }]}
                size="small"
              />
              {(sshAuthType !== 'agent' || watchedJumpHost) && (
                <>
                  <Form.Item name="rememberCredential" valuePropName="checked">
                    <Checkbox>{t('field.rememberCredential')}</Checkbox>
                  </Form.Item>
                  <Alert type="info" showIcon message={t('settings.credentialHint')} />
                </>
              )}
            </>
          )}
          {selectedProvider.category === 'extension' && (
            <>
              <FileProviderFormFields provider={selectedProvider} />
              {selectedProvider.authFields?.length > 0 && (
                <>
                  <Form.Item name="rememberCredential" valuePropName="checked">
                    <Checkbox>{t('field.rememberCredential')}</Checkbox>
                  </Form.Item>
                  <Alert type="info" showIcon message={t('settings.credentialHint')} />
                </>
              )}
            </>
          )}
          {terminalDrawerIntent === 'session' && (
            <Form.Item name="saveProfile" valuePropName="checked">
              <Checkbox>{t('field.saveProfile')}</Checkbox>
            </Form.Item>
          )}
        </Form>
      </Drawer>

      <Drawer
        className="settings-drawer"
        title={t('drawer.settings')}
        width={screens.sm === false ? '100%' : 560}
        open={settingsOpen}
        destroyOnHidden
        onClose={() => setSettingsOpen(false)}
      >
        {renderSettings()}
      </Drawer>
      <Drawer
        title={t('drawer.help')}
        width={620}
        open={helpOpen}
        destroyOnHidden
        onClose={() => setHelpOpen(false)}
      >
        {renderHelpPanel()}
      </Drawer>
      <Drawer
        className="command-center-drawer"
        title={t('drawer.commandCenter')}
        width={screens.sm === false ? '100%' : 700}
        open={commandCenterOpen}
        destroyOnHidden
        onClose={closeCommandCenter}
      >
        <Tabs
          activeKey={commandCenterTab}
          className="command-center-tabs"
          onChange={setCommandCenterTab}
          items={[
            {
              key: 'library',
              label: t('action.commands'),
              children: (
                <QuickCommandLibrary
                  canRun={quickCommandSummary.canRun}
                  commandForm={commandForm}
                  commands={visibleQuickCommands}
                  editing={Boolean(editingQuickCommandId)}
                  editorOpen={commandEditorOpen}
                  onCancelEditor={cancelQuickCommandEdit}
                  onChangeQuery={setCommandQuery}
                  onChangeScope={setCommandScope}
                  onCopy={copyQuickCommand}
                  onDelete={confirmDeleteQuickCommand}
                  onEdit={editQuickCommand}
                  onFavorite={toggleQuickCommandFavorite}
                  onInsert={insertQuickCommand}
                  onNew={openNewQuickCommand}
                  onRun={runQuickCommand}
                  onSave={addQuickCommand}
                  providerLabel={(type) => quickCommandProviderLabel(type, providers)}
                  providerOptions={quickCommandProviderOptions}
                  query={commandQuery}
                  scope={commandScope}
                  summary={quickCommandSummary}
                />
              ),
            },
            {
              key: 'history',
              label: t('action.commandHistory'),
              children: (
                <CommandHistoryPanel
                  canRun={quickCommandSummary.canRun}
                  entries={visibleCommandHistory}
                  formatTimestamp={formatProfileLastUsed}
                  hasActiveSession={Boolean(activeKey)}
                  historyCount={commandHistory.length}
                  onChangeQuery={setHistoryQuery}
                  onChangeScope={setHistoryScope}
                  onClear={clearVisibleCommandHistory}
                  onCopy={copyQuickCommand}
                  onDelete={deleteCommandHistoryItem}
                  onFavorite={toggleCommandHistoryFavorite}
                  onInsert={insertQuickCommand}
                  onRun={runHistoryCommand}
                  onSave={saveHistoryAsQuickCommand}
                  query={historyQuery}
                  recordingEnabled={settings.recordCommandHistory !== false}
                  scope={historyScope}
                  target={quickCommandSummary.target}
                />
              ),
            },
          ]}
        />
      </Drawer>
      <Modal
        className="broadcast-command-modal"
        title={t('action.broadcastCommand')}
        open={broadcastOpen}
        closable={!broadcastSending}
        keyboard={!broadcastSending}
        maskClosable={false}
        okText={t('action.send')}
        cancelText={t('action.cancel')}
        confirmLoading={broadcastSending}
        okButtonProps={{ disabled: !broadcastPlan.ok }}
        onCancel={() => {
          if (!broadcastSending) setBroadcastOpen(false);
        }}
        onOk={sendBroadcastCommand}
      >
        <div className="broadcast-command-body">
          <Alert type="info" showIcon message={t('broadcast.hint')} />
          <div className="broadcast-command-field">
            <div className="broadcast-command-field-head">
              <Text strong>{t('field.targetSessions')}</Text>
              <Button
                size="small"
                type="text"
                onClick={() => setBroadcastTargetIds(broadcastReadyIds)}
              >
                {t('action.selectAllReady')}
              </Button>
            </div>
            <Select
              aria-label={t('field.targetSessions')}
              className="broadcast-command-targets"
              mode="multiple"
              maxTagCount="responsive"
              disabled={broadcastSending}
              value={broadcastTargetIds}
              onChange={setBroadcastTargetIds}
              options={broadcastTargets.map((target) => ({
                label: `${target.displayName} · ${t(`terminal.runStatus.${target.status}`)}`,
                value: target.id,
              }))}
              placeholder={t('placeholder.selectTargetSessions')}
            />
          </div>
          <div className="broadcast-command-field">
            <Text strong>{t('field.command')}</Text>
            <Input.TextArea
              aria-label={t('field.command')}
              autoFocus
              autoSize={{ minRows: 2, maxRows: 4 }}
              disabled={broadcastSending}
              maxLength={2000}
              showCount
              value={broadcastCommand}
              onChange={(event) => setBroadcastCommand(event.target.value)}
              placeholder={t('placeholder.broadcastCommand')}
              onPressEnter={(event) => {
                if (!event.shiftKey
                  && !event.isComposing
                  && !event.nativeEvent?.isComposing
                  && broadcastPlan.ok
                  && !broadcastSending) {
                  event.preventDefault();
                  sendBroadcastCommand();
                }
              }}
            />
          </div>
          <Checkbox
            checked={broadcastAppendEnter}
            disabled={broadcastSending}
            onChange={(event) => setBroadcastAppendEnter(event.target.checked)}
          >
            {t('field.appendEnter')}
          </Checkbox>
          {broadcastCommand && broadcastPlan.reason && broadcastPlan.reason !== 'empty' && (
            <Alert
              showIcon
              type={broadcastPlan.reason === 'sensitive' || broadcastPlan.reason === 'multiline' ? 'error' : 'warning'}
              message={t(`broadcast.reason.${broadcastPlan.reason}`)}
            />
          )}
          {broadcastPlan.ok && (
            <Alert
              showIcon
              type="success"
              message={t('broadcast.impact', { count: broadcastPlan.targetIds.length })}
            />
          )}
        </div>
      </Modal>
      <Drawer
        title={t('drawer.renameSession')}
        width={360}
        open={renameOpen}
        destroyOnHidden
        onClose={() => setRenameOpen(false)}
        extra={<Button type="primary" onClick={renameSession}>{t('action.save')}</Button>}
      >
        <Form layout="vertical" className="terminal-form">
          <Form.Item label={t('field.name')} required>
            <Input value={renamingSessionName} onChange={(event) => setRenamingSessionName(event.target.value)} />
          </Form.Item>
        </Form>
      </Drawer>
      <Drawer
        title={t('drawer.extensionSources')}
        width={440}
        open={extensionSourceOpen}
        destroyOnHidden
        onClose={() => setExtensionSourceOpen(false)}
        extra={<Button type="primary" onClick={saveExtensionSource}>{t('action.save')}</Button>}
      >
        <Alert type="info" showIcon message={t('extension.sourceDrawerHint')} />
        <Form layout="vertical" className="terminal-form">
          <Form.Item label={t('field.name')} required>
            <Input
              value={extensionSourceName}
              onChange={(event) => setExtensionSourceName(event.target.value)}
              placeholder={t('placeholder.extensionSourceName')}
            />
          </Form.Item>
          <Form.Item label={t('field.url')} required>
            <Input
              value={extensionSourceUrl}
              onChange={(event) => setExtensionSourceUrl(event.target.value)}
              placeholder={t('placeholder.extensionSourceUrl')}
            />
          </Form.Item>
        </Form>
      </Drawer>
      <Drawer
        title={t('drawer.importSshConfig')}
        width={560}
        open={sshConfigOpen}
        destroyOnHidden
        onClose={() => setSshConfigOpen(false)}
        extra={(
          <Space>
            <Button icon={<FolderOpenOutlined />} loading={sshConfigLoading} onClick={selectSshConfigFile}>{t('action.chooseFile')}</Button>
            <Button type="primary" disabled={!sshConfigContent.trim()} onClick={importSshConfigProfiles}>{t('action.importSshConfig')}</Button>
          </Space>
        )}
      >
        <Alert type="info" showIcon message={t('settings.sshConfigImportHint')} />
        <Input.TextArea
          className="ssh-config-import-editor"
          value={sshConfigContent}
          onChange={(event) => setSshConfigContent(event.target.value)}
          placeholder={t('placeholder.sshConfig')}
          spellCheck={false}
        />
      </Drawer>
      <ConnectionImportReviewModal
        applying={connectionImportApplying}
        formatProfileTarget={localizedConnectionProfileSubtitle}
        onCancel={closeConnectionImportReview}
        onConfirm={confirmConnectionImport}
        onStrategyChange={setConnectionImportStrategy}
        open={Boolean(connectionImportReview)}
        plan={connectionImportReview?.plan}
        sourceLabel={connectionImportReview
          ? t(`connection.import.source.${connectionImportReview.source}`)
          : ''}
        strategy={connectionImportStrategy}
      />
    </Layout>
    </ConfigProvider>
  );
}

function defaultQuickCommands() {
  return [
    { id: 'list-files', name: 'List files', command: 'ls -lah' },
    { id: 'disk-usage', name: 'Disk usage', command: 'df -h' },
    { id: 'memory-usage', name: 'Memory usage', command: 'free -m' },
    { id: 'current-directory', name: 'Current directory', command: 'pwd' },
    { id: 'network-ports', name: 'Network ports', command: 'netstat -tunlp' },
  ].map(normalizeQuickCommand);
}

function WelcomePanel({ providers, openDrawer }) {
  return (
    <div className="welcome-panel">
      <div className="welcome-copy">
        <Text type="secondary">{t('welcome.eyebrow')}</Text>
        <Title>{t('welcome.title')}</Title>
        <Text>{t('welcome.description')}</Text>
        <Space className="welcome-actions">
          <Button type="primary" icon={<PlusOutlined />} onClick={() => openDrawer('local')}>
            {t('provider.local.name')}
          </Button>
          <Button icon={<CloudServerOutlined />} onClick={() => openDrawer('ssh')}>
            {t('provider.ssh.name')}
          </Button>
        </Space>
      </div>
      <div className="welcome-grid">
        {providers.map((provider) => (
          <ProviderCard key={provider.type} provider={provider} openDrawer={openDrawer} />
        ))}
      </div>
    </div>
  );
}

function SessionEmptyPanel({
  connectionLaunchKeys = [],
  localTerminalLaunching = false,
  openConnections,
  openDefaultTerminal,
  openDrawer,
  openProfile,
  openRecentConnection,
  profiles,
  providers,
  recentConnections,
  restoreWorkspace,
  workspaceSnapshot,
}) {
  const suggestedProfiles = sortSidebarProfiles(profiles, 4, { availableProviders: providers });
  const hasSuggestions = suggestedProfiles.length > 0 || recentConnections.length > 0;
  return (
    <div className={`session-empty-panel${hasSuggestions ? ' has-suggestions' : ''}`}>
      <div className="session-empty-primary">
        <span className="session-empty-icon"><CodeOutlined /></span>
        <div className="session-empty-copy">
          <Title level={2}>{t('session.empty.title')}</Title>
          <Text>{t('session.empty.description')}</Text>
        </div>
        <Space className="session-empty-actions" wrap>
          <Button
            disabled={localTerminalLaunching}
            icon={<LaptopOutlined />}
            loading={localTerminalLaunching}
            type="primary"
            onClick={() => openDefaultTerminal('local')}
          >
            {localTerminalLaunching ? t('action.openingConnection') : t('provider.local.name')}
          </Button>
          <Button icon={<CloudServerOutlined />} onClick={() => openDrawer('ssh')}>
            {t('provider.ssh.name')}
          </Button>
          <Tooltip title={t(
            workspaceSnapshot.hasSnapshot ? 'session.empty.restoreAvailable' : 'session.empty.restoreUnavailable',
            workspaceSnapshot,
          )}>
            <span>
              <Button
                disabled={!workspaceSnapshot.hasSnapshot}
                icon={<ReloadOutlined />}
                onClick={() => restoreWorkspace()}
              >
                {t('action.restoreWorkspace')}
              </Button>
            </span>
          </Tooltip>
        </Space>
        <Button className="session-empty-connection-link" type="link" icon={<FolderOpenOutlined />} onClick={openConnections}>
          {t('section.connectionManager')}
        </Button>
      </div>
      {hasSuggestions && (
        <div className="session-empty-side">
          {suggestedProfiles.length > 0 && (
            <section>
              <Text strong>{t('section.savedConnections')}</Text>
              <div className="session-empty-profile-list">
                {suggestedProfiles.map((profile) => {
                  const launching = isProfileConnectionLaunching(profile, connectionLaunchKeys);
                  return (
                    <button
                      aria-busy={launching}
                      disabled={launching}
                      key={profile.id}
                      type="button"
                      onClick={() => openProfile(profile)}
                    >
                      <span className="provider-icon">
                        {launching
                          ? <LoadingOutlined spin />
                          : providerIcons[profile.providerType] || <CodeOutlined />}
                      </span>
                      <span>
                        <strong>{profile.displayName}</strong>
                        <small>
                          {launching ? t('action.openingConnection') : localizedConnectionProfileSubtitle(profile)}
                        </small>
                      </span>
                    </button>
                  );
                })}
              </div>
            </section>
          )}
          {recentConnections.length > 0 && (
            <section>
              <Text strong>{t('section.recentConnections')}</Text>
              <div className="session-empty-profile-list compact">
                {recentConnections.slice(0, 3).map((connection) => {
                  const request = connection.request || profileToRequest(recentToProfile(connection));
                  const launching = connectionLaunchKeys.includes(buildConnectionLaunchKey(request));
                  return (
                    <button
                      aria-busy={launching}
                      disabled={launching}
                      key={connection.id}
                      type="button"
                      onClick={() => openRecentConnection(connection)}
                    >
                      <span className="provider-icon">
                        {launching
                          ? <LoadingOutlined spin />
                          : providerIcons[connection.providerType] || <CodeOutlined />}
                      </span>
                      <span>
                        <strong>{connection.displayName}</strong>
                        <small>
                          {launching
                            ? t('action.openingConnection')
                            : localizedConnectionProfileSubtitle(recentToProfile(connection))}
                        </small>
                      </span>
                    </button>
                  );
                })}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  );
}

function ProviderCard({ provider, openDrawer }) {
  return (
    <button className="provider-card" type="button" onClick={() => openDrawer(provider.type)}>
      <span>{providerIcons[provider.type] || <CodeOutlined />}</span>
      <strong>{providerLabel(provider)}</strong>
      <small>{provider.category === 'builtin' ? t('provider.category.builtin') : t('provider.category.extension')}</small>
    </button>
  );
}

function SettingsPanel({ activeSection, children, section, title }) {
  return (
    <section
      aria-labelledby={`settings-tab-${section}`}
      hidden={activeSection !== section}
      id={`settings-panel-${section}`}
      role="tabpanel"
    >
      <Card title={title}>{children}</Card>
    </section>
  );
}

function TerminalSettingsPreview({ preview }) {
  return (
    <div className="terminal-settings-preview">
      <div className="terminal-settings-preview-head">
        <span>{preview.terminalTheme === 'auto' ? t('theme.auto') : preview.terminalTheme}</span>
        <small>{`${preview.fontSize}px | ${preview.scrollback}`}</small>
      </div>
      <pre style={{
        fontFamily: preview.fontFamily,
        fontSize: preview.fontSize,
      }}
      >
        <code>{'galaxyterm % ssh prod\nconnected | audit enabled\n$ kubectl get pods'}</code>
      </pre>
    </div>
  );
}

function ConnectionEmptyAction({
  action,
  clearProfileFilters,
  openConnectionDrawer,
  openDrawer,
  primary = false,
  setSshConfigOpen,
}) {
  const actionMap = {
    clearFilters: {
      icon: <ClearOutlined />,
      label: t('action.clearFilters'),
      onClick: clearProfileFilters,
    },
    importSshConfig: {
      icon: <ImportOutlined />,
      label: t('action.importSshConfig'),
      onClick: () => setSshConfigOpen(true),
    },
    newConnection: {
      icon: <PlusOutlined />,
      label: t('action.newConnection'),
      onClick: () => openConnectionDrawer(),
    },
    quickSsh: {
      icon: <CloudServerOutlined />,
      label: t('action.quickSsh'),
      onClick: () => openDrawer('ssh'),
    },
  };
  const item = actionMap[action];
  if (!item) return null;
  return (
    <Button
      icon={item.icon}
      onClick={item.onClick}
      type={primary ? 'primary' : 'default'}
    >
      {item.label}
    </Button>
  );
}

function WorkspaceSnapshotStatus({ summary }) {
  return (
    <div className={summary.hasSnapshot ? 'workspace-snapshot-status active' : 'workspace-snapshot-status'}>
      <span>
        <small>{t('settings.workspaceSnapshot')}</small>
        <strong>{summary.hasSnapshot ? summary.count : t('message.noWorkspaceSnapshot')}</strong>
      </span>
      {summary.hasSnapshot && <small>{summary.updatedAt}</small>}
    </div>
  );
}

function WorkspaceActionButton({ action, children, ...buttonProps }) {
  const button = (
    <Button {...buttonProps} disabled={action.disabled}>
      {children}
    </Button>
  );
  if (!action.disabled) return button;
  return (
    <Tooltip title={t(action.reasonKey)}>
      <span className="tooltip-disabled-action">{button}</span>
    </Tooltip>
  );
}

function ConnectionProfilePreview({
  confirmDeleteProfile,
  duplicateProfile,
  health = null,
  launching = false,
  openProfileEditor,
  openTunnelForProfile,
  profile,
  profileSessionSummary,
  providers,
  runConnectionProfileLaunchAction,
  testConnectionProfile,
  toggleProfileFavorite,
}) {
  const sessionInfo = profileSessionSummary.get(profile.id) || { activeCount: 0, focusSessionId: '' };
  const providerAvailable = isProfileProviderAvailable(profile, providers);
  const badges = buildConnectionProfileBadges(profile, sessionInfo, {
    healthBadge: health?.badge,
    launching,
    providerAvailable,
  });
  const facts = buildConnectionProfileFacts(profile, { defaultShellLabel: t('label.defaultShell') });
  const hints = buildConnectionProfileHints(sessionInfo);
  const launchModel = buildConnectionProfileLaunchModel({
    launching,
    profileKind: profile.kind,
    providerAvailable,
    sessionInfo,
  });
  const primaryAction = launchModel.primary;
  const statusSummary = buildConnectionProfileStatusSummary({
    launching,
    profileKind: profile.kind,
    providerAvailable,
    sessionInfo,
  });
  return (
    <div aria-busy={launching} className="connection-profile-preview">
      <div className="connection-profile-hero">
        <span className="provider-icon large connection-profile-provider-icon">
          {providerIcons[profile.providerType] || <CodeOutlined />}
          <ConnectionAccentMarker accent={profile.accent} />
        </span>
        <div>
          <Text type="secondary">{providerTypeLabel(profile.providerType, providers)}</Text>
          <Title level={4}>{profile.displayName}</Title>
          <Text className="connection-profile-endpoint">{localizedConnectionProfileSubtitle(profile)}</Text>
        </div>
      </div>
      <div className="connection-profile-actions">
        <Button
          size="small"
          type="primary"
          disabled={primaryAction.disabled}
          loading={launching && primaryAction.action !== 'focus'}
          onClick={() => runConnectionProfileLaunchAction(primaryAction, profile)}
        >
          {t(primaryAction.labelKey)}
        </Button>
        {launchModel.secondary && (
          <Button
            size="small"
            disabled={launchModel.secondary.disabled}
            icon={launchModel.secondary.action === 'findExtension'
              ? <AppstoreAddOutlined />
              : launchModel.secondary.action === 'openFiles'
                ? <FolderOpenOutlined />
                : <PlusOutlined />}
            loading={launching && launchModel.secondary.action === 'connect'}
            onClick={() => runConnectionProfileLaunchAction(launchModel.secondary, profile)}
          >
            {t(launchModel.secondary.labelKey)}
          </Button>
        )}
        <Button size="small" icon={<EditOutlined />} onClick={() => openProfileEditor(profile)}>{t('action.edit')}</Button>
        {profile.providerType === 'ssh' && (
          <Button size="small" icon={<ApiOutlined />} onClick={() => openTunnelForProfile(profile)}>{t('action.portForwarding')}</Button>
        )}
        <Button
          disabled={profile.providerType === 'local' || !providerAvailable || health?.status === 'checking'}
          icon={<ApiOutlined />}
          loading={health?.status === 'checking'}
          size="small"
          onClick={() => testConnectionProfile(profile)}
        >
          {t('action.testConnection')}
        </Button>
      </div>
      <Alert
        showIcon
        type={statusSummary.tone}
        message={t(statusSummary.titleKey, statusSummary.values)}
        description={t(statusSummary.descriptionKey, statusSummary.values)}
      />
      <ConnectionHealthStatus
        checkedLabel={health?.checkedAt ? formatProfileLastUsed(health.checkedAt) : ''}
        onRetry={() => testConnectionProfile(profile)}
        presentation={health}
      />
      <div className="connection-profile-tags">
        {badges.map((badge) => (
          <span key={badge.key} className={`connection-profile-badge tone-${badge.tone}`}>
            {connectionProfileBadgeLabel(badge)}
          </span>
        ))}
      </div>
      {profile.tags?.length > 0 && (
        <div className="connection-profile-user-tags detail">
          {profile.tags.map((tag) => <Tag key={tag}>{tag}</Tag>)}
        </div>
      )}
      <div className="connection-profile-facts">
        {facts.map((fact) => (
          <span key={fact.key}>
            <small>{connectionProfileFactLabel(fact.key)}</small>
            <strong>{connectionProfileFactValue(fact)}</strong>
          </span>
        ))}
      </div>
      <Space size={6} wrap>
        <Button size="small" icon={<CopyOutlined />} onClick={() => duplicateProfile(profile)}>{t('action.duplicate')}</Button>
        <Button
          size="small"
          icon={profile.favorite ? <StarFilled /> : <StarOutlined />}
          onClick={() => toggleProfileFavorite(profile.id)}
        >
          {profile.favorite ? t('action.unfavorite') : t('action.favorite')}
        </Button>
        <Button size="small" danger icon={<DeleteOutlined />} onClick={() => confirmDeleteProfile(profile)}>{t('action.delete')}</Button>
      </Space>
      <div className="connection-profile-hints">
        {hints.map((hint) => (
          <span key={hint}>{t(`connection.hint.${hint}`)}</span>
        ))}
      </div>
    </div>
  );
}

function ConnectionAccentMarker({ accent = 'none' }) {
  const normalized = normalizeConnectionAccent(accent);
  if (normalized === 'none') return null;
  const label = t(`connection.accent.${normalized}`);
  return (
    <span
      aria-label={label}
      className={`connection-accent-marker accent-${normalized}`}
      role="img"
      title={label}
    />
  );
}

function SessionTabLabel({
  accent = 'none',
  active = false,
  activityKind = 'output',
  displayName = '',
  identityDisplay = null,
  session,
  unread = false,
}) {
  const display = sessionTabDisplay(session, active, { displayName, unread });
  const activityLabel = activityKind === 'error'
    ? t('session.activity.error')
    : t('session.activity.unread');
  return (
    <span
      className={`tab-label session-tab-label tone-${display.statusTone} accent-${normalizeConnectionAccent(accent)}${display.active ? ' active' : ''}${display.unread ? ' unread' : ''}`}
      title={identityDisplay?.tooltip || display.title}
    >
      <span className="session-status-dot" />
      {providerIcons[display.iconType] || <CodeOutlined />}
      <span className="session-tab-title">{display.title}</span>
      {display.protected && (
        <LockOutlined
          aria-label={t('action.protectSession')}
          className="session-protection-icon"
          title={t('action.protectSession')}
        />
      )}
      {display.unread && (
        <span
          aria-label={activityLabel}
          className={`session-activity-dot${activityKind === 'error' ? ' tone-error' : ''}`}
          role="status"
          title={activityLabel}
        />
      )}
    </span>
  );
}

function connectionProfileActionIcon(action) {
  if (action === 'connect') return <PlusOutlined />;
  if (action === 'edit' || action === 'rename') return <EditOutlined />;
  if (action === 'portForwarding') return <ApiOutlined />;
  if (action === 'duplicate') return <CopyOutlined />;
  if (action === 'favorite') return <StarOutlined />;
  if (action === 'unfavorite') return <StarFilled />;
  return <DeleteOutlined />;
}

function sessionTabActionIcon(action) {
  if (action === 'rename') return <EditOutlined />;
  if (action === 'protect') return <LockOutlined />;
  if (action === 'unprotect') return <UnlockOutlined />;
  if (action === 'reconnect' || action === 'reconnectDisconnected') return <ReloadOutlined />;
  if (action === 'broadcast') return <SendOutlined />;
  if (action === 'markAllAttentionRead') return <ClearOutlined />;
  if (action === 'duplicate' || action === 'copyTarget') return <CopyOutlined />;
  if (action === 'moveLeft') return <LeftOutlined />;
  if (action === 'moveRight') return <RightOutlined />;
  return <DeleteOutlined />;
}

function remoteFileActionIcon(action) {
  if (action === 'open') return <FolderOpenOutlined />;
  if (action === 'edit' || action === 'rename') return <EditOutlined />;
  if (action === 'view') return <FileTextOutlined />;
  if (action === 'download') return <DownloadOutlined />;
  return <DeleteOutlined />;
}

function SessionSidebarLabel({
  accent = 'none',
  activityKind = 'output',
  displayName = '',
  identityDisplay = null,
  session,
  unread = false,
}) {
  const tone = sessionStatusTone(session);
  const statusLabel = t(`session.status.${sessionStatusLabel(session)}`);
  const activityLabel = activityKind === 'error'
    ? t('session.activity.error')
    : t('session.activity.unread');
  const detail = identityDisplay?.identity || identityDisplay?.provider || statusLabel;
  return (
    <span className={`session-sidebar-label tone-${tone} accent-${normalizeConnectionAccent(accent)}`} title={identityDisplay?.tooltip || displayName || session.label}>
      <span aria-label={statusLabel} className="session-status-dot" role="img" title={statusLabel} />
      <span className="session-sidebar-main">
        <span>{displayName || session.label}</span>
        <small>{detail}</small>
      </span>
      {session.protected && (
        <LockOutlined
          aria-label={t('action.protectSession')}
          className="session-protection-icon"
          title={t('action.protectSession')}
        />
      )}
      {unread && (
        <span
          aria-label={activityLabel}
          className={`session-activity-dot${activityKind === 'error' ? ' tone-error' : ''}`}
          role="status"
          title={activityLabel}
        />
      )}
    </span>
  );
}

function SessionToolbarActions({ model, onAction }) {
  const icons = {
    grid: <AppstoreOutlined />,
    interrupt: <StopOutlined />,
    nextAttention: <BellOutlined />,
    reconnect: <ReloadOutlined />,
    tabs: <CodeOutlined />,
  };
  const overflowItems = model.overflow.flatMap((action, index) => [
    ...(action.danger && !model.overflow[index - 1]?.danger
      ? [{ key: 'danger-divider', type: 'divider' }]
      : []),
    {
      key: action.key,
      danger: action.danger,
      disabled: action.disabled,
      icon: sessionTabActionIcon(action.key),
      label: t(action.labelKey),
    },
  ]);

  return (
    <div className="session-toolbar-actions">
      <div className="session-toolbar-primary">
        {model.primary.map((action) => (
          <Tooltip key={action.key} title={t(action.labelKey)}>
            <Button
              aria-label={t(action.labelKey)}
              className="session-toolbar-button"
              disabled={action.disabled}
              danger={action.danger}
              icon={icons[action.key]}
              loading={action.loading}
              size="small"
              type={action.key === 'interrupt' || action.key === 'reconnect' ? 'primary' : 'text'}
              onClick={() => onAction(action.key)}
            />
          </Tooltip>
        ))}
      </div>
      <Tooltip title={t('action.sessionActions')}>
        <span className="tooltip-dropdown-trigger">
          <Dropdown
            menu={{ items: overflowItems, onClick: ({ key }) => onAction(key) }}
            placement="bottomRight"
            trigger={['click']}
          >
            <Button
              aria-label={t('action.sessionActions')}
              className="session-toolbar-button"
              icon={<MoreOutlined />}
              size="small"
              type="text"
            />
          </Dropdown>
        </span>
      </Tooltip>
    </div>
  );
}

function SessionToolbarContext({ model, onCopyTarget }) {
  return (
    <div
      aria-label={t('session.context.summary', model)}
      className="session-toolbar-context"
      title={t('session.context.summary', model)}
    >
      <span className="session-toolbar-context-icon">
        {providerIcons[model.iconType] || <CodeOutlined />}
      </span>
      <span className="session-toolbar-context-provider">{model.provider}</span>
      {model.identity && <strong>{model.identity}</strong>}
      {model.identity && onCopyTarget && (
        <Tooltip title={t('action.copySessionTarget')}>
          <Button
            aria-label={t('action.copySessionTarget')}
            className="session-toolbar-context-copy"
            icon={<CopyOutlined />}
            size="small"
            type="text"
            onClick={onCopyTarget}
          />
        </Tooltip>
      )}
    </div>
  );
}

function TerminalLoadingState() {
  return (
    <div className="terminal-loading-state" role="status">
      <span aria-hidden="true" className="terminal-loading-spinner" />
      <span>{t('terminal.status.preparing')}</span>
    </div>
  );
}

function ReplayLoadingState() {
  return (
    <div className="replay-loading-state" role="status">
      <span aria-hidden="true" className="terminal-loading-spinner" />
      <span>{t('message.preparingReplay')}</span>
    </div>
  );
}

function TerminalFrame({
  auditSummary,
  children,
  contextFacts = [],
  onCancelRecovery,
  onCopyError,
  onInterrupt,
  onManageProvider,
  onOpenAudit,
  onReconnect,
  providerRuntime,
  recovery = null,
  reconnecting = false,
  status,
}) {
  const facts = buildTerminalStatusFacts(status || {});
  const controlActions = buildTerminalControlActions(status || {});
  const errorDetail = buildTerminalErrorDetail(status || {});
  const recoveryActions = buildTerminalRecoveryActions(status || {}, { reconnecting });
  const recordingFact = contextFacts.find((fact) => fact.key === 'recording');
  const visibleContextFacts = contextFacts.filter((fact) => ['provider', 'target', 'user'].includes(fact.key));
  return (
    <div className="terminal-frame">
      <div className="terminal-frame-body">{children}</div>
      <div className="terminal-status-bar">
        <div className="terminal-status-facts">
          {visibleContextFacts.map((fact) => (
            <span
              key={fact.key}
              className={`terminal-status-fact session-context-status-fact fact-${fact.key} tone-${fact.tone}`}
            >
              <small>{sessionContextFactLabel(fact)}</small>
              <strong>{sessionContextFactValue(fact)}</strong>
            </span>
          ))}
          {facts.map((fact) => (
            <span key={fact.key} className={`terminal-status-fact fact-${fact.key} tone-${fact.tone}`}>
              <small>{terminalStatusFactLabel(fact)}</small>
              <strong>{terminalStatusFactValue(fact)}</strong>
            </span>
          ))}
        </div>
        {(providerRuntime || recordingFact || auditSummary || recovery || controlActions.length > 0 || errorDetail || recoveryActions.length > 0) && (
          <div className="terminal-recovery-actions">
            {recovery && (
              <SessionRecoveryNotice
                onCancel={onCancelRecovery}
                recovery={recovery}
              />
            )}
            {providerRuntime && (
              <Tooltip title={providerRuntimeDescription(providerRuntime)}>
                {providerRuntime.manageable ? (
                  <Button
                    aria-label={providerRuntimeDescription(providerRuntime)}
                    className={`provider-runtime-indicator tone-${providerRuntime.tone}`}
                    icon={<AppstoreOutlined />}
                    onClick={onManageProvider}
                    size="small"
                    type="text"
                  >
                    <span className="session-capture-indicator-label">{t(providerRuntime.labelKey)}</span>
                  </Button>
                ) : (
                  <span
                    aria-label={providerRuntimeDescription(providerRuntime)}
                    className={`provider-runtime-indicator tone-${providerRuntime.tone}`}
                    role="status"
                  >
                    <ApiOutlined />
                    <span className="session-capture-indicator-label">{t(providerRuntime.labelKey)}</span>
                  </span>
                )}
              </Tooltip>
            )}
            {recordingFact && (
              <Tooltip title={`${sessionContextFactLabel(recordingFact)}: ${sessionContextFactValue(recordingFact)}`}>
                <Button
                  aria-label={`${sessionContextFactLabel(recordingFact)}: ${sessionContextFactValue(recordingFact)}`}
                  className={`session-recording-indicator tone-${recordingFact.tone}`}
                  icon={<VideoCameraOutlined />}
                  onClick={onOpenAudit}
                  size="small"
                  type="text"
                >
                  <span className="session-capture-indicator-label">{sessionRecordingIndicatorLabel(recordingFact)}</span>
                </Button>
              </Tooltip>
            )}
            {auditSummary && (
              <Tooltip title={t(auditSummary.descriptionKey, auditSummary.values)}>
                <Button
                  aria-label={t(auditSummary.titleKey, auditSummary.values)}
                  className={`session-audit-indicator tone-${auditSummary.tone}`}
                  icon={<AuditOutlined />}
                  onClick={onOpenAudit}
                  size="small"
                  type="text"
                >
                  <span className="session-capture-indicator-label">{sessionAuditIndicatorLabel(auditSummary)}</span>
                </Button>
              </Tooltip>
            )}
            {controlActions.map((action) => (
              <Tooltip key={action.key} title={terminalRecoveryActionLabel(action)}>
                <Button
                  aria-label={terminalRecoveryActionLabel(action)}
                  danger={action.tone === 'danger'}
                  icon={terminalRecoveryActionIcon(action)}
                  onClick={() => runTerminalRecoveryAction(action.key, { onInterrupt })}
                  size="small"
                  type="primary"
                >
                  <span className="terminal-recovery-label">{terminalRecoveryActionLabel(action)}</span>
                </Button>
              </Tooltip>
            ))}
            {errorDetail && (
              <Popover
                content={(
                  <div className="terminal-error-popover">
                    <strong>{errorDetail.message}</strong>
                    <small>{t(errorDetail.suggestionKey)}</small>
                  </div>
                )}
                placement="topRight"
                title={t(errorDetail.titleKey)}
                trigger="click"
              >
                <Button
                  aria-label={t(errorDetail.titleKey)}
                  className="terminal-error-details"
                  danger
                  icon={<InfoCircleOutlined />}
                  size="small"
                >
                  <span className="terminal-recovery-label">{t(errorDetail.titleKey)}</span>
                </Button>
              </Popover>
            )}
            {recoveryActions.map((action) => (
              <Tooltip key={action.key} title={terminalRecoveryActionLabel(action)}>
                <Button
                  aria-label={terminalRecoveryActionLabel(action)}
                  size="small"
                  type={action.tone === 'primary' ? 'primary' : 'default'}
                  disabled={action.disabled}
                  icon={terminalRecoveryActionIcon(action)}
                  loading={action.loading}
                  onClick={() => runTerminalRecoveryAction(action.key, {
                    onCopyError,
                    onOpenAudit,
                    onReconnect,
                  })}
                >
                  <span className="terminal-recovery-label">{terminalRecoveryActionLabel(action)}</span>
                </Button>
              </Tooltip>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function MetricCard({
  accent = 'default',
  label,
  meta = '',
  value,
}) {
  return (
    <div className={`metric-card metric-card-${accent}`}>
      <Text type="secondary">{label}</Text>
      <strong>{value}</strong>
      {meta && <small>{meta}</small>}
    </div>
  );
}

function loadProfiles() {
  try {
    const raw = localStorage.getItem(profileStorageKey);
    const parsed = JSON.parse(raw || '[]');
    const profiles = Array.isArray(parsed) ? parsed : parsed.profiles;
    if (!Array.isArray(profiles)) return [];
    return profiles
      .filter((profile) => profile?.providerType && profile?.displayName)
      .map((profile) => normalizeStoredConnectionProfile(profile));
  } catch {
    return [];
  }
}

function persistProfiles(profiles) {
  localStorage.setItem(profileStorageKey, JSON.stringify({
    version: profileSchemaVersion,
    profiles: profiles.map((profile) => normalizeStoredConnectionProfile(profile)),
  }));
}

function loadQuickCommands() {
  try {
    const raw = localStorage.getItem(commandStorageKey);
    const parsed = JSON.parse(raw || '[]');
    if (!Array.isArray(parsed) || parsed.length === 0) return defaultQuickCommands();
    return parsed.filter((item) => item?.name && item?.command).map((item) => normalizeQuickCommand({
      ...item,
      id: item.id || (crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`),
    }));
  } catch {
    return defaultQuickCommands();
  }
}

function persistQuickCommands(commands) {
  localStorage.setItem(commandStorageKey, JSON.stringify(commands));
}

function loadCommandHistory(limit = defaultSettings.commandHistoryLimit) {
  try {
    const parsed = JSON.parse(localStorage.getItem(commandHistoryStorageKey) || '[]');
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((item) => item?.command && item?.providerType)
      .map(normalizeCommandHistoryItem)
      .slice(0, clampNumber(limit, 20, 500, defaultSettings.commandHistoryLimit));
  } catch {
    return [];
  }
}

function persistCommandHistory(history, limit = defaultSettings.commandHistoryLimit) {
  localStorage.setItem(commandHistoryStorageKey, JSON.stringify(pruneCommandHistory(history, limit)));
}

function loadExtensionSources() {
  try {
    const parsed = JSON.parse(localStorage.getItem(extensionSourceStorageKey) || '[]');
    if (!Array.isArray(parsed) || parsed.length === 0) return defaultExtensionSources;
    return parsed.map(normalizeExtensionSource).filter(Boolean);
  } catch {
    return defaultExtensionSources;
  }
}

function persistExtensionSources(sources) {
  localStorage.setItem(extensionSourceStorageKey, JSON.stringify(sources));
}

function loadRecentConnections() {
  try {
    const raw = localStorage.getItem(recentConnectionStorageKey);
    const parsed = JSON.parse(raw || '[]');
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((item) => item?.providerType && item?.displayName).slice(0, 12);
  } catch {
    return [];
  }
}

function persistRecentConnections(items) {
  localStorage.setItem(recentConnectionStorageKey, JSON.stringify(items.slice(0, 12)));
}

function loadAuditRecords() {
  try {
    const stored = localStorage.getItem(auditRecordStorageKey);
    const parsed = JSON.parse(stored || '[]');
    if (!Array.isArray(parsed)) return [];
    const nextRecords = parsed
      .filter((record) => record?.id && record?.title)
      .map(sanitizeAuditRecord)
      .slice(0, 100);
    const serialized = JSON.stringify(nextRecords);
    if (stored && stored !== serialized) {
      try {
        localStorage.setItem(auditRecordStorageKey, serialized);
      } catch {
        // Existing valid records stay readable when storage cleanup cannot be persisted.
      }
    }
    return nextRecords;
  } catch {
    return [];
  }
}

function persistAuditRecords(records, options = {}) {
  return persistAuditRecordSet(localStorage, auditRecordStorageKey, records, options);
}

function rememberConnection(request, setRecentConnections) {
  const safeRequest = sanitizeWorkspaceRequest(request);
  const recent = {
    id: recentConnectionKey(safeRequest),
    providerType: safeRequest.providerType,
    displayName: safeRequest.displayName || safeRequest.providerType,
    description: profileDescription(profileFromRequest(safeRequest)),
    request: safeRequest,
    updatedAt: new Date().toISOString(),
  };
  setRecentConnections((current) => {
    const next = [recent, ...current.filter((item) => item.id !== recent.id)].slice(0, 12);
    persistRecentConnections(next);
    return next;
  });
}

function recentConnectionKey(request) {
  if (request.providerType === 'ssh') {
    return `ssh:${request.auth?.username || ''}@${request.config?.host || ''}:${request.config?.port || 22}`;
  }
  if (request.providerType === 'local') return `local:${request.config?.shell || 'default'}`;
  return `${request.providerType}:${JSON.stringify(request.config || {})}`;
}

function profileFromRequest(request) {
  return {
    id: request.id || recentConnectionKey(request),
    providerType: request.providerType,
    displayName: request.displayName,
    accent: normalizeConnectionAccent(request.accent),
    group: request.group || '',
    tags: normalizeConnectionTags(request.tags),
    config: request.config || {},
    auth: request.auth || {},
  };
}

function profileToRequest(profile) {
  return {
    profileId: profile.id,
    providerType: profile.providerType,
    displayName: profile.displayName,
    accent: normalizeConnectionAccent(profile.accent),
    group: profile.group || '',
    tags: normalizeConnectionTags(profile.tags),
    config: profile.config || {},
    auth: profile.auth || {},
  };
}

function recentToProfile(recent) {
  return profileFromRequest(recent.request || {
    providerType: recent.providerType,
    displayName: recent.displayName,
    config: {},
    auth: {},
  });
}

function buildPaletteItems(actions) {
  const navigation = [
    ['connections', 'nav.connections', <CloudServerOutlined />],
    ['sessions', 'nav.sessions', <CodeOutlined />],
    ['files', 'nav.files', <FolderOpenOutlined />],
    ['tunnels', 'nav.tunnels', <ApiOutlined />],
    ['audit', 'nav.audit', <AuditOutlined />],
    ['extensions', 'nav.extensions', <AppstoreAddOutlined />],
    ['settings', 'nav.settings', <SettingOutlined />],
  ].map(([key, labelKey, icon]) => ({
    id: `nav:${key}`,
    group: t('palette.group.navigation'),
    title: t(labelKey),
    description: t('palette.description.navigation'),
    icon,
    keywords: `${key} ${t(labelKey)}`,
    run: () => actions.setSelectedNav(key),
  }));

  const providerItems = actions.terminalProviders.map((provider) => ({
    id: `provider:${provider.type}`,
    group: t('palette.group.providers'),
    title: providerLabel(provider),
    description: provider.type,
    icon: providerIcons[provider.type] || <CodeOutlined />,
    keywords: `${provider.type} ${providerLabel(provider)}`,
    run: () => actions.openDrawer(provider.type),
  }));
  const fileProviderItems = actions.fileProviders.map((provider) => ({
    id: `file-provider:${provider.type}`,
    group: t('palette.group.providers'),
    title: providerLabel(provider),
    description: `${t('nav.files')} · ${provider.protocol || provider.type}`,
    icon: providerIcons[provider.type] || <FolderOpenOutlined />,
    keywords: `${provider.type} ${provider.protocol || ''} ${providerLabel(provider)} ${t('nav.files')}`,
    run: () => actions.openFileProvider(provider.type),
  }));

  const profileItems = buildProfilePaletteItems({
    groupLabel: t('palette.group.connections'),
    iconForProfile: (profile) => providerIcons[profile.providerType] || <CodeOutlined />,
    profiles: actions.profiles,
    providers: actions.providers,
    runProfile: actions.openProfile,
    runUnavailableProfile: (profile) => actions.openExtensionsForProvider(profile.providerType),
    subtitleForProfile: buildConnectionProfileSubtitle,
  });

  const connectionActionItems = buildConnectionActionPaletteItems({
    favoriteCount: actions.favoriteConnectionCount,
    groupLabel: t('palette.group.connectionActions'),
    labels: {
      importSshConfig: t('action.importSshConfig'),
      importSshConfigDescription: t('palette.description.importSshConfig'),
      importProfiles: t('action.importConnections'),
      importProfilesDescription: t('palette.description.importProfiles'),
      exportProfiles: t('action.exportConnections'),
      exportProfilesDescription: t('palette.description.exportProfiles'),
      newConnection: t('action.newConnection'),
      newConnectionDescription: t('palette.description.newConnection'),
      newLocalTerminal: t('action.newTerminal'),
      newLocalTerminalDescription: t('palette.description.newLocalTerminal'),
      openAllConnections: t('action.openAll'),
      openAllConnectionsDescription: t('palette.description.openAllConnections'),
      openFavorites: t('action.openFavorites'),
      openFavoritesDescription: t('palette.description.openFavorites'),
      quickSsh: t('action.quickSsh'),
      quickSshDescription: t('palette.description.quickSsh'),
    },
    runAction: actions.runConnectionAction,
    savedConnectionCount: actions.savedConnectionCount,
  });

  const sessionItems = actions.sessions.map((session, index) => ({
    id: `session:${session.id}`,
    group: t('palette.group.sessions'),
    title: actions.sessionDisplayLabels?.[session.id] || session.label,
    description: `${t(`session.status.${sessionStatusLabel(session)}`)} · ${profileDescription(profileFromRequest(session.request))}`,
    icon: providerIcons[session.providerType] || <CodeOutlined />,
    keywords: `${actions.sessionDisplayLabels?.[session.id] || ''} ${session.label} ${session.providerType} ${session.status} ${index + 1}`,
    run: () => actions.activateSession(session.id),
  }));

  const sessionActionItems = buildSessionActionPaletteItems({
    activeSessionHasTarget: actions.activeSessionHasTarget,
    activeSessionId: actions.activeSessionId,
    activeSessionProtected: actions.activeSessionProtected,
    activeSessionReconnecting: actions.activeSessionReconnecting,
    attentionCount: actions.attentionCount,
    canNavigate: actions.canNavigateSessions,
    closableClosedCount: actions.closableClosedCount,
    closableOtherCount: actions.closableOtherCount,
    closableSessionCount: actions.closableSessionCount,
    closedSessionCount: actions.closedSessionCount,
    reconnectableSessionCount: actions.reconnectableSessionCount,
    restorableSessionCount: actions.restorableSessionCount,
    groupLabel: t('palette.group.sessionActions'),
    labels: {
      clearTerminal: t('action.clearTerminal'),
      closeAll: t('action.closeAll'),
      closeClosed: t('action.closeClosed'),
      closeSession: t('action.closeSession'),
      closeOthers: t('action.closeOthers'),
      commandHistory: t('action.commandHistory'),
      copyTranscript: t('action.copyTranscript'),
      copySessionTarget: t('action.copySessionTarget'),
      exportTranscript: t('action.exportTranscript'),
      markAllAttentionRead: t('action.markAllSessionActivityRead'),
      nextSession: t('action.nextSession'),
      nextAttention: t('action.nextAttentionSession'),
      previousSession: t('action.previousSession'),
      protectSession: t('action.protectSession'),
      quickCommands: t('action.commands'),
      reconnect: t('action.reconnect'),
      reconnectDisconnected: t('action.reconnectDisconnectedSessions'),
      restoreClosed: t('action.restoreClosedSession'),
      renameSession: t('action.renameSession'),
      saveAudit: t('action.saveAuditSnapshot'),
      unprotectSession: t('action.unprotectSession'),
    },
    runAction: actions.runSessionAction,
    sessionCount: actions.sessionCount,
  });

  const quickCommandItems = filterQuickCommands(actions.quickCommands, '', {
    providerType: actions.quickCommandProviderType || 'all',
  }).map((command) => {
    const safety = buildQuickCommandSafetyState(command);
    return {
      id: `command:${command.id}`,
      group: t('palette.group.commands'),
      title: command.name,
      description: safety.sensitive ? t(safety.displayCommand) : safety.displayCommand,
      icon: <CodeOutlined />,
      keywords: safety.sensitive ? command.name : `${command.name} ${command.command}`,
      disabled: !safety.canRun || !actions.quickCommandCanRun,
      reasonKey: safety.warningKey || 'palette.reason.noReadySession',
      run: () => actions.runQuickCommand(command.command),
    };
  });

  const workspaceItems = [
    {
      id: 'workspace:save',
      group: t('palette.group.workspace'),
      title: t('action.saveWorkspace'),
      description: t('settings.autoSaveHint'),
      icon: <SaveOutlined />,
      keywords: 'save workspace snapshot',
      disabled: actions.workspaceActionState.save.disabled,
      reasonKey: actions.workspaceActionState.save.reasonKey,
      run: actions.saveWorkspace,
    },
    {
      id: 'workspace:restore',
      group: t('palette.group.workspace'),
      title: t('action.restoreWorkspace'),
      description: t('settings.workspaceSnapshot'),
      icon: <ReloadOutlined />,
      keywords: 'restore workspace snapshot',
      disabled: actions.workspaceActionState.restore.disabled,
      reasonKey: actions.workspaceActionState.restore.reasonKey,
      run: actions.restoreWorkspace,
    },
    {
      id: 'settings:language',
      group: t('palette.group.settings'),
      title: t('action.language'),
      description: t('settings.languageHint'),
      icon: <GlobalOutlined />,
      keywords: 'language locale settings',
      run: actions.openLanguageSettings,
    },
    {
      id: 'help:shortcuts',
      group: t('palette.group.settings'),
      title: t('action.help'),
      description: t('help.quickOpenHint', { shortcut: actions.commandPaletteShortcut }),
      icon: <QuestionCircleOutlined />,
      keywords: 'help shortcuts keyboard audit replay search session ?',
      run: () => actions.setHelpOpen(true),
    },
    {
      id: 'commands:manage',
      group: t('palette.group.commands'),
      title: t('action.commands'),
      description: t('section.quickCommands'),
      icon: <ThunderboltOutlined />,
      keywords: 'quick commands manage',
      run: actions.openQuickCommands,
    },
  ];

  return [...navigation, ...connectionActionItems, ...sessionActionItems, ...sessionItems, ...providerItems, ...fileProviderItems, ...profileItems, ...quickCommandItems, ...workspaceItems];
}

function downloadJson(fileName, payload) {
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = fileName;
  anchor.click();
  URL.revokeObjectURL(url);
}

function downloadText(fileName, text) {
  const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = fileName;
  anchor.click();
  URL.revokeObjectURL(url);
}

function safeFileName(value) {
  return (value || 'terminal').replace(/[^a-z0-9._-]+/gi, '-').replace(/^-+|-+$/g, '') || 'terminal';
}

function timestampFilePart(date = new Date()) {
  return date.toISOString().replace(/[:.]/g, '-');
}

function formatReplayTime(seconds = 0) {
  const safeSeconds = Math.max(0, Number(seconds) || 0);
  const minutes = Math.floor(safeSeconds / 60);
  const remainingSeconds = Math.floor(safeSeconds % 60);
  return `${minutes}:${String(remainingSeconds).padStart(2, '0')}`;
}

function formatProfileLastUsed(value = '') {
  const timestamp = Date.parse(value);
  if (!timestamp) return '-';
  const diffSeconds = Math.max(0, Math.floor((Date.now() - timestamp) / 1000));
  if (diffSeconds < 60) return t('time.justNow');
  const diffMinutes = Math.floor(diffSeconds / 60);
  if (diffMinutes < 60) return `${diffMinutes}${t('time.minuteShort')}`;
  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours}${t('time.hourShort')}`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays}${t('time.dayShort')}`;
  return new Date(timestamp).toLocaleDateString();
}

function extensionStatusColor(status) {
  if (status === 'builtin') return 'green';
  if (status === 'installed') return 'blue';
  return 'default';
}

function extensionSourceStatusColor(status) {
  if (status === 'ready') return 'green';
  if (status === 'error') return 'red';
  if (status === 'loading') return 'blue';
  return 'default';
}

function extensionFactLabel(key) {
  return t(`extension.fact.${key}`);
}

function extensionFactValue(fact) {
  if (fact.key === 'status') return t(`extension.status.${fact.value}`);
  return fact.value || '-';
}

function groupLabel(group) {
  return group === ungroupedKey ? t('group.ungrouped') : group;
}

function connectionProfileBadgeLabel(badge) {
  if (badge.key === 'group') return groupLabel(badge.value);
  if (badge.key === 'sessions') return `${t('label.openSessions')}: ${badge.value}`;
  if (badge.key === 'favorite') return t('label.favorite');
  if (badge.key === 'credential') return t('label.credentialSaved');
  if (badge.key === 'fileWorkspace') return t('label.fileConnection');
  if (badge.key === 'launching') return t('label.connectionLaunching');
  if (badge.key === 'healthChecking') return t('label.connectionChecking');
  if (badge.key === 'healthSuccess') return `${t('label.connectionAvailable')} · ${badge.value} ms`;
  if (badge.key === 'healthError') return t('label.connectionUnavailable');
  if (badge.key === 'providerUnavailable') return t('label.providerUnavailable');
  return String(badge.value || badge.key);
}

function connectionProfileFactLabel(key) {
  if (key === 'host') return t('field.host');
  if (key === 'endpoint') return t('field.endpoint');
  if (key === 'path') return t('field.path');
  if (key === 'port') return t('field.port');
  if (key === 'username') return t('field.username');
  if (key === 'shell') return t('field.shell');
  if (key === 'workingDirectory') return t('field.workingDirectory');
  if (key === 'lastUsed') return t('label.lastUsed');
  if (key === 'jumpHost') return t('field.jumpHost');
  if (key === 'authType') return t('field.authType');
  if (key === 'connectTimeout') return t('field.connectTimeout');
  if (key === 'keepAlive') return t('field.keepAliveInterval');
  if (key === 'hostKeyPolicy') return t('field.hostKeyPolicy');
  return key;
}

function connectionProfileFactValue(fact) {
  if (fact.key === 'lastUsed') return fact.value ? formatProfileLastUsed(fact.value) : '-';
  if (fact.key === 'hostKeyPolicy') return t(`ssh.hostKeyPolicy.${fact.value === 'strict' ? 'strict' : 'acceptNew'}`);
  if (fact.key === 'authType') {
    if (fact.value === 'privateKey') return t('auth.privateKey');
    if (fact.value === 'agent') return t('auth.agent');
    return t('auth.password');
  }
  if (fact.key === 'connectTimeout' || fact.key === 'keepAlive') {
    return `${fact.value} ${t('unit.seconds')}`;
  }
  return fact.value || '-';
}

function settingsSummaryLabel(key) {
  if (key === 'appTheme') return t('field.appTheme');
  if (key === 'confirmDangerousActions') return t('field.confirmDangerousActions');
  if (key === 'interfaceDensity') return t('field.interfaceDensity');
  if (key === 'terminalTheme') return t('field.terminalTheme');
  if (key === 'defaultProviderType') return t('field.defaultProviderType');
  if (key === 'defaultWorkingDirectory') return t('field.defaultWorkingDirectory');
  if (key === 'logLevel') return t('field.logLevel');
  if (key === 'shortcutModifier') return t('field.shortcutModifier');
  return key;
}

function settingsSummaryValue(item) {
  if (item.key === 'appTheme') return t(`theme.${item.value}`);
  if (item.key === 'confirmDangerousActions') return item.value ? t('label.enabled') : t('label.disabled');
  if (item.key === 'interfaceDensity') return t(`density.${item.value}`);
  if (item.key === 'terminalTheme') return item.value === 'auto' ? t('theme.auto') : item.value;
  if (item.key === 'defaultWorkingDirectory') return item.value || t('label.default');
  if (item.key === 'logLevel') return t(`logLevel.${item.value}`);
  if (item.key === 'shortcutModifier') return t(`shortcutModifier.${item.value}`);
  return item.value;
}

function sessionContextFactLabel(fact) {
  if (fact.key === 'provider') return t('label.provider');
  if (fact.key === 'target') return t('label.target');
  if (fact.key === 'user') return t('label.user');
  if (fact.key === 'audit') return t('label.auditEvents');
  if (fact.key === 'recording') return t('label.recording');
  return fact.key;
}

function sessionContextFactValue(fact) {
  if (fact.key === 'recording') return t(`recording.state.${fact.value}`);
  return fact.value || '-';
}

function sessionRecordingIndicatorLabel(fact) {
  return t(`recording.indicator.${fact?.value || 'pending'}`);
}

function sessionAuditIndicatorLabel(summary) {
  if (summary?.titleKey === 'session.audit.saved.title') return t('session.audit.indicator.saved');
  if (summary?.titleKey === 'session.audit.recording.title') return t('session.audit.indicator.active');
  return t('session.audit.indicator.pending');
}

function providerRuntimeDescription(runtimeState = {}) {
  if (runtimeState.status === 'disabled') {
    return t('provider.runtime.disabledDescription', {
      name: runtimeState.extensionName || runtimeState.providerType,
      version: runtimeState.version,
    });
  }
  if (runtimeState.status === 'missing') {
    return t('provider.runtime.missingDescription', { type: runtimeState.providerType });
  }
  if (runtimeState.source === 'extension') {
    return t('provider.runtime.extensionDescription', {
      name: runtimeState.extensionName || runtimeState.providerType,
      version: runtimeState.version,
    });
  }
  return t('provider.runtime.builtinDescription');
}

function terminalStatusFactLabel(fact) {
  if (fact.key === 'status') return t('terminal.fact.status');
  if (fact.key === 'result') return t('terminal.fact.result');
  if (fact.key === 'lastCommand') return t('terminal.fact.lastCommand');
  if (fact.key === 'duration') return t('label.duration');
  if (fact.key === 'exitCode') return t('terminal.fact.exitCode');
  if (fact.key === 'size') return t('terminal.fact.size');
  if (fact.key === 'error') return t('terminal.fact.error');
  return fact.key;
}

function terminalStatusFactValue(fact) {
  if (fact.key === 'status') return t(`terminal.runStatus.${fact.value}`);
  if (fact.key === 'result') return t(`terminal.result.${fact.value}`);
  return fact.value ?? '-';
}

function terminalRecoveryActionLabel(action) {
  if (action.key === 'interrupt') return t('action.interruptCommand');
  if (action.key === 'reconnect') return t('action.reconnect');
  if (action.key === 'copyError') return t('action.copyError');
  if (action.key === 'audit') return t('nav.audit');
  return action.key;
}

function terminalRecoveryActionIcon(action) {
  if (action.key === 'interrupt') return <StopOutlined />;
  if (action.key === 'reconnect') return <ReloadOutlined />;
  if (action.key === 'copyError') return <CopyOutlined />;
  if (action.key === 'audit') return <AuditOutlined />;
  return null;
}

function runTerminalRecoveryAction(key, actions) {
  if (key === 'interrupt') actions.onInterrupt?.();
  if (key === 'reconnect') actions.onReconnect?.();
  if (key === 'copyError') actions.onCopyError?.();
  if (key === 'audit') actions.onOpenAudit?.();
}

function connectionGroupLabel(item) {
  if (item?.type === 'all' || item?.key === 'all') return t('group.all');
  if (item?.type === 'favorites' || item?.key === 'favorites') return t('group.favorites');
  return groupLabel(item?.groupKey || ungroupedKey);
}

function parseCredentialRef(value) {
  if (!value) return null;
  if (typeof value === 'object') return value;
  try {
    const parsed = JSON.parse(value);
    return parsed?.id ? parsed : null;
  } catch {
    return null;
  }
}

async function resolveCredentialRequest(request) {
  if (!request.auth?.credentialRef) return request;
  if (request.providerType === 'ssh') return CredentialsAPI.ResolveSSHRequest(request);
  const auth = await CredentialsAPI.ResolveProviderCredential({ auth: request.auth });
  return { ...request, auth };
}

function saveProfile(profiles, request, editingProfileId = '', profileId = '') {
  const existingProfile = profiles.find((item) => item.id === editingProfileId);
  const profile = {
    id: editingProfileId || profileId || (crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}`),
    providerType: request.providerType,
    displayName: request.displayName,
    importSource: existingProfile?.importSource,
    accent: normalizeConnectionAccent(request.accent),
    group: request.group || '',
    tags: normalizeConnectionTags(request.tags),
    config: request.config,
    favorite: !!existingProfile?.favorite,
    lastUsedAt: existingProfile?.lastUsedAt || '',
    auth: request.providerType === 'ssh' ? {
      username: request.auth?.username || '',
      authType: request.auth?.authType || 'password',
      jumpUsername: request.auth?.jumpUsername || '',
      credentialRef: request.auth?.credentialRef || null,
    } : { credentialRef: request.auth?.credentialRef || null },
  };
  if (editingProfileId) {
    const nextProfiles = profiles.map((item) => (item.id === editingProfileId ? profile : item));
    persistProfiles(nextProfiles);
    return nextProfiles;
  }
  const nextProfiles = [...profiles, profile];
  persistProfiles(nextProfiles);
  return nextProfiles;
}

function profileDescription(profile) {
  if (profile.providerType === 'ssh') {
    return `${profile.auth?.username || '-'}@${profile.config?.host || '-'}:${profile.config?.port || 22}`;
  }
  if (profile.kind === 'file') return buildConnectionProfileSubtitle(profile);
  if (profile.providerType !== 'local') {
    return extensionTerminalDescription({ type: profile.providerType }, profile);
  }
  return profile.config?.shell || t('label.defaultShell');
}

function loadSettings() {
  try {
    const raw = localStorage.getItem(settingsStorageKey);
    const parsed = JSON.parse(raw || '{}');
    return normalizeSettings(parsed);
  } catch {
    return { ...defaultSettings };
  }
}

function normalizeSettings(settings) {
  const interfaceDensity = ['comfortable', 'compact'].includes(settings.interfaceDensity)
    ? settings.interfaceDensity
    : defaultSettings.interfaceDensity;
  const recoveryPolicy = normalizeSessionRecoveryPolicy(settings);
  return {
    ...defaultSettings,
    ...settings,
    confirmDangerousActions: settings.confirmDangerousActions !== false,
    recordCommandHistory: settings.recordCommandHistory !== false,
    commandHistoryLimit: clampNumber(
      settings.commandHistoryLimit,
      20,
      500,
      defaultSettings.commandHistoryLimit,
    ),
    autoReconnect: recoveryPolicy.enabled,
    autoReconnectDelaySeconds: recoveryPolicy.baseDelaySeconds,
    autoReconnectMaxAttempts: recoveryPolicy.maxAttempts,
    interfaceDensity,
    sidebarMode: normalizeSidebarMode(settings.sidebarMode),
    defaultProviderType: String(settings.defaultProviderType || defaultSettings.defaultProviderType).trim() || defaultSettings.defaultProviderType,
    defaultWorkingDirectory: String(settings.defaultWorkingDirectory || '').trim(),
    disabledExtensionIds: Array.isArray(settings.disabledExtensionIds)
      ? [...new Set(settings.disabledExtensionIds.map((item) => String(item)).filter(Boolean))]
      : [],
    logLevel: normalizeLogLevel(settings.logLevel),
    shortcutModifier: normalizeShortcutModifier(settings.shortcutModifier),
    shortcutBindings: normalizeShortcutBindings(settings.shortcutBindings),
    fontSize: clampNumber(settings.fontSize, 10, 24, defaultSettings.fontSize),
    scrollback: clampNumber(settings.scrollback, 500, 100000, defaultSettings.scrollback),
  };
}

function persistSettings(settings) {
  localStorage.setItem(settingsStorageKey, JSON.stringify(normalizeSettings(settings)));
}

function clampNumber(value, min, max, fallback) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(min, Math.min(max, parsed));
}

function isEditableTarget(target) {
  const tagName = target?.tagName?.toLowerCase();
  return tagName === 'input'
    || tagName === 'textarea'
    || tagName === 'select'
    || target?.isContentEditable;
}

function isInteractiveControl(target) {
  return Boolean(target?.closest?.(
    'button, a, input, textarea, select, summary, [role="button"], [role="menuitem"]',
  ));
}

function resolveAppTheme(theme) {
  if (theme === 'dark' || theme === 'light') return theme;
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function parentPath(current) {
  if (!current || current === '.') return '.';
  const normalized = current.replace(/\/+$/, '');
  if (normalized === '' || normalized === '/') return '/';
  const index = normalized.lastIndexOf('/');
  if (index <= 0) return normalized.startsWith('/') ? '/' : '.';
  return normalized.slice(0, index);
}

function joinRemotePath(base, name) {
  if (!base || base === '.') return name;
  return `${base.replace(/\/+$/, '')}/${name}`;
}

function buildRequest(type, displayName, values, provider = null) {
  if (type === 'ssh') {
    const credentialRef = parseCredentialRef(values.credentialRef);
    return {
      providerType: type,
      displayName,
      accent: normalizeConnectionAccent(values.accent),
      group: values.group || '',
      tags: normalizeConnectionTags(values.tags),
      config: {
        agentSocketPath: String(values.agentSocketPath || '').trim(),
        connectTimeoutSeconds: Number(values.connectTimeoutSeconds) || 10,
        host: values.host,
        hostKeyPolicy: values.hostKeyPolicy || 'accept-new',
        knownHostsPath: String(values.knownHostsPath || '').trim(),
        keepAliveIntervalSeconds: Number(values.keepAliveIntervalSeconds) || 0,
        keepAliveMaxFailures: Number(values.keepAliveMaxFailures) || 3,
        port: values.port || 22,
        jumpHost: values.jumpHost || '',
        jumpPort: values.jumpPort || 22,
      },
      auth: {
        username: values.username,
        authType: values.authType || 'password',
        password: values.password || '',
        privateKey: values.privateKey || '',
        passphrase: values.passphrase || '',
        jumpUsername: values.jumpUsername || '',
        jumpPassword: values.jumpPassword || '',
        credentialRef,
      },
    };
  }

  if (provider?.category === 'extension') {
    const request = buildExtensionTerminalRequest(provider, displayName, values);
    return {
      ...request,
      accent: normalizeConnectionAccent(values.accent),
      group: values.group || '',
      tags: normalizeConnectionTags(values.tags),
      auth: {
        ...request.auth,
        credentialRef: parseCredentialRef(values.credentialRef),
      },
    };
  }

  return {
    providerType: type,
    displayName,
    accent: normalizeConnectionAccent(values.accent),
    group: values.group || '',
    tags: normalizeConnectionTags(values.tags),
    config: {
      shell: values.shell || '',
      workingDirectory: type === 'local'
        ? String(values.workingDirectory || '').trim() || '~'
        : values.workingDirectory || '',
    },
    auth: {},
  };
}

export default App;
