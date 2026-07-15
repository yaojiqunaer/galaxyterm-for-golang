import React, { lazy, Suspense, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Badge,
  Button,
  Card,
  Checkbox,
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
  CloudServerOutlined,
  CodeOutlined,
  ClearOutlined,
  CopyOutlined,
  DatabaseOutlined,
  DeleteOutlined,
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
  QuestionCircleOutlined,
  LaptopOutlined,
  MinusOutlined,
  MoreOutlined,
  PlusOutlined,
  ReloadOutlined,
  SaveOutlined,
  SettingOutlined,
  StarFilled,
  StarOutlined,
  StopOutlined,
  ThunderboltOutlined,
  UpOutlined,
  VideoCameraOutlined,
} from '@ant-design/icons';
import {
  buildAsciinemaCast,
  buildAuditRecord,
  buildAuditRecordSummary,
  createAuditEvent,
  sanitizeAuditRecord,
} from './auditLog.js';
import {
  buildExtensionCatalog,
  filterAuditRecords,
  summarizeWorkspace,
} from './workspaceInsights.js';
import {
  buildConnectionGroupNav,
  buildConnectionEmptyState,
  buildConnectionProfileBadges,
  buildConnectionProfileFacts,
  buildConnectionProfileHints,
  buildConnectionProfilePrimaryAction,
  buildConnectionProfileStatusSummary,
  buildConnectionProfileSubtitle,
  buildConnectionTransferActions,
  buildTerminalSubmitPlan,
  filterConnectionProfiles,
  filterRecentConnectionsByProviders,
  isProfileProviderAvailable,
  resolveProfileSaveDefault,
  resolveSelectedProfileId,
  selectBatchProfiles,
  summarizeProfileSessions,
  sortConnectionProfiles,
  sortSidebarProfiles,
  ungroupedKey,
} from './connectionManager.js';
import {
  appendClosedSessions,
  buildSessionAuditSummary,
  buildSessionCloseConfirm,
  buildSessionContextFacts,
  buildSessionNavigationState,
  buildSessionTabMenuModel,
  buildSessionToolbarModel,
  filterSessions,
  profileActionModel,
  sessionTabDisplay,
  sessionStatusLabel,
  sessionStatusTone,
  sessionSummary,
  synchronizeSessionTerminalStatus,
  takeClosedSession,
} from './sessionPresentation.js';
import {
  buildAppearanceSummary,
  buildOperationalSummary,
  buildSettingsSectionNav,
  buildSecuritySummary,
  buildShortcutGroups,
  buildTerminalDefaults,
  buildTerminalPreview,
  isCommandShortcut,
  isTerminalInputTarget,
  normalizeShortcutModifier,
  buildWorkspaceSnapshotSummary,
  normalizeLogLevel,
  resolveSettingsSectionNavigation,
  shortcutModifierLabel,
} from './settingsPresentation.js';
import {
  buildRemoteFileBreadcrumbs,
  buildRemoteFileSummary,
  buildSavedSshConnections,
  buildSshConnectionAuth,
  buildSshProfileFields,
  buildTunnelDisplay,
  buildTunnelSummary,
} from './remoteWorkspace.js';
import {
  buildTerminalControlActions,
  buildTerminalErrorDetail,
  buildTerminalRecoveryActions,
  buildTerminalStatusFacts,
} from './terminalStatus.js';
import { parseSshConfigProfiles } from './sshConfigProfiles.js';
import { hasWailsMethod, syncDesktopWindowTheme, writeClipboardText } from './desktopBridge.js';
import {
  buildConnectionActionPaletteItems,
  buildProfilePaletteItems,
  buildPaletteSummary,
  buildSessionActionPaletteItems,
  filterPaletteItems,
  resolvePaletteIndex,
} from './paletteModel.js';
import {
  buildCommandHistoryEntryResult,
  clearCommandHistory,
  filterCommandHistory,
  normalizeCommandHistoryItem,
  upsertCommandHistory,
} from './commandHistory.js';

import {
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
  buildInstalledExtensionRows,
  filterProvidersByDisabledExtensions,
  fileProviderSupports,
} from './extensionPresentation.js';
import {
  defaultExtensionSources,
  normalizeExtensionSource,
  removeExtensionSource,
  upsertExtensionSource,
} from './extensionSources.js';
import {
  resolveListIndex,
  resolveBracketSessionAction,
  resolveNumberedSessionIndex,
  resolveRelativeSessionIndex,
  resolveSessionShortcutNumber,
} from './listNavigation.js';
import * as ExtensionsAPI from '../wailsjs/go/extensions/API.js';
import * as FilesAPI from '../wailsjs/go/files/API.js';
import * as ThemeAPI from '../wailsjs/go/internal/Theme.js';
import * as CredentialsAPI from '../wailsjs/go/credentials/API.js';
import * as SessionAPI from '../wailsjs/go/session/API.js';
import * as TerminalAPI from '../wailsjs/go/terminal/API.js';
import * as TunnelAPI from '../wailsjs/go/tunnel/API.js';
import { availableLocales, currentLocale, setLocale, t } from './i18n.js';
import SavedSSHProfileSelect from './components/SavedSSHProfileSelect.jsx';
import FileProviderFormFields from './components/FileProviderFormFields.jsx';
import OperationErrorDescription from './components/OperationErrorDescription.jsx';
import { buildOperationError } from './operationFeedback.js';

const TerminalPane = lazy(() => import('./components/TerminalPane.jsx'));
const AuditReplayPlayer = lazy(() => import('./components/AuditReplayPlayer.jsx'));
const { Sider, Content } = Layout;
const { Text, Title } = Typography;

const profileStorageKey = 'galaxyterm.connectionProfiles';
const settingsStorageKey = 'galaxyterm.settings';
const workspaceStorageKey = 'galaxyterm.workspaceSnapshot';
const commandStorageKey = 'galaxyterm.quickCommands';
const commandHistoryStorageKey = 'galaxyterm.commandHistory';
const recentConnectionStorageKey = 'galaxyterm.recentConnections';
const auditRecordStorageKey = 'galaxyterm.auditRecords';
const extensionSourceStorageKey = 'galaxyterm.extensionSources';
const profileSchemaVersion = 1;

const defaultSettings = {
  appTheme: 'dark',
  terminalTheme: 'auto',
  fontFamily: 'SFMono-Regular,JetBrains Mono,Menlo,Consolas,Liberation Mono,monospace',
  fontSize: 14,
  scrollback: 5000,
  interfaceDensity: 'comfortable',
  autoSaveWorkspace: true,
  autoRestoreWorkspace: false,
  confirmDangerousActions: true,
  defaultProviderType: 'local',
  defaultWorkingDirectory: '',
  disabledExtensionIds: [],
  logLevel: 'info',
  shortcutModifier: 'auto',
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

function providerTypeLabel(type, providers = []) {
  const provider = providers.find((item) => item.type === type);
  return provider ? providerLabel(provider) : type;
}

function quickCommandProviderLabel(type, providers = []) {
  return !type || type === 'all' ? t('filter.allProviders') : providerTypeLabel(type, providers);
}

function App() {
  const screens = Grid.useBreakpoint();
  const compactConnectionDetail = screens.xl !== true;
  const [messageApi, messageContextHolder] = message.useMessage();
  const [notificationApi, notificationContextHolder] = notification.useNotification();
  const [modalApi, modalContextHolder] = Modal.useModal();
  const [allProviders, setAllProviders] = useState(fallbackProviders);
  const [sessions, setSessions] = useState([]);
  const [closedSessions, setClosedSessions] = useState([]);
  const [profiles, setProfiles] = useState(() => loadProfiles());
  const [settings, setSettings] = useState(() => loadSettings());
  const [locale, setLocaleState] = useState(() => currentLocale());
  const [terminalThemes, setTerminalThemes] = useState(['auto']);
  const [installedExtensions, setInstalledExtensions] = useState([]);
  const [extensionSources, setExtensionSources] = useState(() => loadExtensionSources());
  const [tunnels, setTunnels] = useState([]);
  const [activeKey, setActiveKey] = useState('');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [terminalDrawerIntent, setTerminalDrawerIntent] = useState('session');
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [commandsOpen, setCommandsOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [extensionInstallOpen, setExtensionInstallOpen] = useState(false);
  const [extensionSourceOpen, setExtensionSourceOpen] = useState(false);
  const [extensionPackagePath, setExtensionPackagePath] = useState('');
  const [extensionSourceName, setExtensionSourceName] = useState('');
  const [extensionSourceUrl, setExtensionSourceUrl] = useState('');
  const [sshConfigOpen, setSshConfigOpen] = useState(false);
  const [sshConfigContent, setSshConfigContent] = useState('');
  const [renameOpen, setRenameOpen] = useState(false);
  const [renamingSessionId, setRenamingSessionId] = useState('');
  const [renamingSessionName, setRenamingSessionName] = useState('');
  const [terminalSearch, setTerminalSearch] = useState('');
  const [terminalStatuses, setTerminalStatuses] = useState({});
  const [focusMode, setFocusMode] = useState(false);
  const [sidebarCompact, setSidebarCompact] = useState(() => (
    typeof window !== 'undefined' && window.matchMedia('(max-width: 991px)').matches
  ));
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [paletteQuery, setPaletteQuery] = useState('');
  const [paletteActiveIndex, setPaletteActiveIndex] = useState(-1);
  const [selectedNav, setSelectedNav] = useState('connections');
  const [settingsSection, setSettingsSection] = useState('interface');
  const [sessionView, setSessionView] = useState('tabs');
  const [profileQuery, setProfileQuery] = useState('');
  const [groupQuery, setGroupQuery] = useState('all');
  const [providerFilter, setProviderFilter] = useState('all');
  const [profileSort, setProfileSort] = useState('favorites');
  const [selectedProfileId, setSelectedProfileId] = useState('');
  const [auditQuery, setAuditQuery] = useState('');
  const [auditProviderFilter, setAuditProviderFilter] = useState('all');
  const [workspaceSummary, setWorkspaceSummary] = useState(() => loadWorkspaceSummary());
  const [quickCommands, setQuickCommands] = useState(() => loadQuickCommands());
  const [commandHistory, setCommandHistory] = useState(() => loadCommandHistory());
  const [commandQuery, setCommandQuery] = useState('');
  const [commandScope, setCommandScope] = useState('current');
  const [editingQuickCommandId, setEditingQuickCommandId] = useState('');
  const [historyOpen, setHistoryOpen] = useState(false);
  const [historyQuery, setHistoryQuery] = useState('');
  const [historyScope, setHistoryScope] = useState('provider');
  const [recentConnections, setRecentConnections] = useState(() => loadRecentConnections());
  const [auditRecords, setAuditRecords] = useState(() => loadAuditRecords());
  const [replayRecord, setReplayRecord] = useState(null);
  const [editingProfileId, setEditingProfileId] = useState('');
  const [newType, setNewType] = useState('local');
  const [fileEntries, setFileEntries] = useState([]);
  const [fileLoading, setFileLoading] = useState(false);
  const [fileProviderType, setFileProviderType] = useState('');
  const [fileProfileId, setFileProfileId] = useState('');
  const [testingConnection, setTestingConnection] = useState(false);
  const [creatingSession, setCreatingSession] = useState(false);
  const [extensionBusy, setExtensionBusy] = useState(false);
  const [tunnelBusy, setTunnelBusy] = useState(false);
  const [fileAuthType, setFileAuthType] = useState('password');
  const [tunnelAuthType, setTunnelAuthType] = useState('password');
  const [tunnelProfileId, setTunnelProfileId] = useState('');
  const [fileEditorOpen, setFileEditorOpen] = useState(false);
  const [fileEditorLoading, setFileEditorLoading] = useState(false);
  const [editingRemoteFile, setEditingRemoteFile] = useState(null);
  const [editingRemoteContent, setEditingRemoteContent] = useState('');
  const [uploadOpen, setUploadOpen] = useState(false);
  const [uploadRemoteName, setUploadRemoteName] = useState('');
  const [uploadLocalContent, setUploadLocalContent] = useState('');
  const [mkdirOpen, setMkdirOpen] = useState(false);
  const [mkdirName, setMkdirName] = useState('');
  const [sshAuthType, setSshAuthType] = useState('password');
  const [form] = Form.useForm();
  const [fileForm] = Form.useForm();
  const [tunnelForm] = Form.useForm();
  const [commandForm] = Form.useForm();
  const watchedFilePath = Form.useWatch('path', fileForm);
  const pasteConfirmationPending = useRef(false);

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
  const terminalRefs = useRef({});
  const terminalSearchRef = useRef(null);
  const profileImportRef = useRef(null);
  const contentPageRef = useRef(null);
  const contentPageScrollPositionsRef = useRef(new Map());
  const previousContentPageRef = useRef(selectedNav);
  const activeSession = sessions.find((session) => session.id === activeKey);
  const activeTerminalStatus = terminalStatuses[activeKey] || {};

  useEffect(() => {
    document.documentElement.lang = locale;
    document.title = t('app.title');
  }, [locale]);

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
    if (settings.autoRestoreWorkspace) {
      restoreWorkspace({ silent: true });
    }
  }, []);

  useEffect(() => {
    if (!settings.autoSaveWorkspace || sessions.length === 0) return;
    persistWorkspaceSnapshot(buildWorkspaceSnapshot(sessions, activeKey, sessionView));
    setWorkspaceSummary(loadWorkspaceSummary());
  }, [activeKey, sessionView, sessions, settings.autoSaveWorkspace]);

  useEffect(() => {
    if (!commandsOpen) return;
    commandForm.setFieldValue('providerType', activeSession?.providerType || 'all');
  }, [activeSession?.providerType, commandForm, commandsOpen]);

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
      if (event.key === '?' && !isEditableTarget(event.target)) {
        event.preventDefault();
        setHelpOpen(true);
        return;
      }
      const commandKey = isCommandShortcut(event, settings);
      if (!commandKey) return;
      const key = event.key.toLowerCase();
      if (key === 'n') {
        event.preventDefault();
        openDrawer();
      }
      if (key === 'k') {
        event.preventDefault();
        setCommandsOpen(true);
      }
      if (key === 'p') {
        event.preventDefault();
        setPaletteOpen(true);
      }
      if (key === 't' && event.shiftKey) {
        event.preventDefault();
        restoreLastClosedSession();
      }
      if (key === 'w' && !event.shiftKey && activeKey && selectedNav === 'sessions') {
        event.preventDefault();
        confirmRemoveSession(activeKey);
      }
      if (key === 'f' && !event.shiftKey && activeKey && selectedNav === 'sessions') {
        event.preventDefault();
        terminalSearchRef.current?.focus();
      }
      const numberedSessionIndex = resolveNumberedSessionIndex(key, sessions.length);
      if (numberedSessionIndex >= 0) {
        const nextSession = sessions[numberedSessionIndex];
        if (nextSession) {
          event.preventDefault();
          setActiveKey(nextSession.id);
          setSelectedNav('sessions');
        }
      }
      const relativeSessionAction = resolveBracketSessionAction(event);
      if (relativeSessionAction && sessions.length > 0) {
        const sessionIds = sessions.map((session) => session.id);
        const nextIndex = resolveRelativeSessionIndex(sessionIds, activeKey, relativeSessionAction);
        const nextSession = sessions[nextIndex];
        if (nextSession) {
          event.preventDefault();
          setActiveKey(nextSession.id);
          setSelectedNav('sessions');
        }
      }
      if (key === 'f' && event.shiftKey && sessions.length > 0) {
        event.preventDefault();
        setFocusMode((current) => !current);
      }
      if (key === 'r' && activeKey) {
        event.preventDefault();
        reconnectSession();
      }
      if (
        isEditableTarget(event.target)
        && !isTerminalInputTarget(event.target)
        && ['c', 'v', 'l', '=', '+', '-', '0'].includes(key)
      ) {
        return;
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
    window.addEventListener('keydown', handleKeydown, true);
    return () => window.removeEventListener('keydown', handleKeydown, true);
  }, [activeKey, closedSessions, selectedNav, sessions, settings.confirmDangerousActions, settings.shortcutModifier]);

  useEffect(() => {
    if (activeKey && terminalRefs.current[activeKey]?.fit) {
      setTimeout(() => terminalRefs.current[activeKey]?.fit(), 0);
    }
  }, [activeKey, focusMode, selectedNav, sessionView]);

  const providers = useMemo(() => filterProvidersByDisabledExtensions(
    allProviders,
    installedExtensions,
    settings.disabledExtensionIds,
  ), [allProviders, installedExtensions, settings.disabledExtensionIds]);
  const providerOptions = useMemo(() => providers.map((provider) => ({
    value: provider.type,
    label: (
      <span className="provider-option">
        {providerIcons[provider.type] || <CodeOutlined />}
        {providerLabel(provider)}
      </span>
    ),
  })), [providers, locale]);
  const quickCommandProviderOptions = useMemo(() => [
    { value: 'all', label: t('filter.allProviders') },
    ...providers.map((provider) => ({
      value: provider.type,
      label: providerTypeLabel(provider.type, providers),
    })),
  ], [providers, locale]);
  const shortcutModifier = normalizeShortcutModifier(settings.shortcutModifier);
  const shortcutLabel = shortcutModifierLabel(shortcutModifier);
  const shortcutGroups = useMemo(
    () => buildShortcutGroups({ shortcutModifier }),
    [shortcutModifier],
  );
  const commandPaletteShortcut = `${shortcutLabel} + P`;
  const numberedSessionShortcut = `${shortcutLabel} + 1..9`;

  const selectedProvider = providers.find((item) => item.type === newType) || providers[0] || fallbackProviders[0];
  const profileSessionSummary = useMemo(() => summarizeProfileSessions(profiles, sessions), [profiles, sessions]);
  const visibleProfiles = useMemo(
    () => sortConnectionProfiles(filterConnectionProfiles(profiles, {
      group: groupQuery,
      providerType: providerFilter,
      query: profileQuery,
    }), profileSort),
    [profiles, profileQuery, groupQuery, providerFilter, profileSort],
  );
  const explicitlySelectedProfile = visibleProfiles.find((profile) => profile.id === selectedProfileId) || null;
  const selectedProfile = explicitlySelectedProfile || visibleProfiles[0] || null;
  const hasProfileFilters = profileQuery.trim() || groupQuery !== 'all' || providerFilter !== 'all' || profileSort !== 'favorites';
  const connectionEmptyState = useMemo(() => buildConnectionEmptyState({
    profileCount: profiles.length,
    visibleCount: visibleProfiles.length,
    hasFilters: !!hasProfileFilters,
  }), [hasProfileFilters, profiles.length, visibleProfiles.length]);
  const sidebarQuickProfiles = useMemo(
    () => sortSidebarProfiles(profiles, 5, { availableProviders: providers }),
    [profiles, providers],
  );
  const visibleRecentConnections = useMemo(
    () => filterRecentConnectionsByProviders(recentConnections, providers),
    [recentConnections, providers],
  );

  useEffect(() => {
    const nextSelectedProfileId = resolveSelectedProfileId(visibleProfiles, selectedProfileId, {
      fallbackToFirst: !compactConnectionDetail,
    });
    if (nextSelectedProfileId !== selectedProfileId) {
      setSelectedProfileId(nextSelectedProfileId);
    }
  }, [compactConnectionDetail, selectedProfileId, visibleProfiles]);

  const moveSelectedProfile = (action) => {
    const currentIndex = visibleProfiles.findIndex((profile) => profile.id === selectedProfile?.id);
    const nextIndex = resolveListIndex(visibleProfiles.length, currentIndex, action);
    const nextProfile = visibleProfiles[nextIndex];
    if (nextProfile) setSelectedProfileId(nextProfile.id);
  };

  const handleConnectionListKeyDown = (event) => {
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
      runConnectionProfilePrimaryAction(selectedProfile);
    }
  };

  const connectionGroupNav = useMemo(() => buildConnectionGroupNav(profiles), [profiles]);
  const workspaceInsights = useMemo(() => summarizeWorkspace({
    auditRecords,
    installedExtensions,
    profiles,
    providers,
    recentConnections,
    sessions,
    tunnels,
  }), [auditRecords, installedExtensions, profiles, providers, recentConnections, sessions, tunnels]);
  const extensionCatalog = useMemo(() => buildExtensionCatalog({
    installedExtensions,
    officialExtensions,
    providers,
  }), [installedExtensions, providers]);
  const extensionSummary = useMemo(() => (
    buildExtensionSummary({
      disabledExtensionIds: settings.disabledExtensionIds,
      installedExtensions,
      providers,
    })
  ), [installedExtensions, providers, settings.disabledExtensionIds]);
  const installedExtensionRows = useMemo(() => (
    buildInstalledExtensionRows(installedExtensions, settings.disabledExtensionIds)
  ), [installedExtensions, settings.disabledExtensionIds]);
  const fileProviders = useMemo(() => (
    buildEnabledFileProviders(installedExtensions, settings.disabledExtensionIds)
  ), [installedExtensions, settings.disabledExtensionIds]);
  const selectedFileProvider = fileProviders.find((provider) => provider.type === fileProviderType)
    || fileProviders[0]
    || null;

  useEffect(() => {
    const nextType = selectedFileProvider?.type || '';
    if (nextType !== fileProviderType) {
      setFileProviderType(nextType);
      setFileEntries([]);
    }
  }, [fileProviderType, selectedFileProvider?.type]);

  useEffect(() => {
    const nextProvider = selectedFileProvider;
    if (!nextProvider) return;
    const values = nextProvider.protocol === 'sftp'
      ? { config: {}, auth: {} }
      : buildFileProviderFormValues(nextProvider);
    fileForm.setFieldValue('config', values.config);
    fileForm.setFieldValue('auth', values.auth);
  }, [fileForm, selectedFileProvider?.type]);
  const auditProviderOptions = useMemo(() => [
    { value: 'all', label: t('filter.allProviders') },
    ...Array.from(new Set(auditRecords.map((record) => record.providerType || 'terminal')))
      .map((type) => ({ value: type, label: type })),
  ], [auditRecords, locale]);
  const visibleAuditRecords = useMemo(() => filterAuditRecords(auditRecords, {
    providerType: auditProviderFilter,
    query: auditQuery,
  }), [auditProviderFilter, auditQuery, auditRecords]);
  const currentSessionSummary = useMemo(() => sessionSummary(sessions), [sessions]);
  const sessionNavigationState = useMemo(() => (
    buildSessionNavigationState(sessions, activeKey)
  ), [activeKey, sessions]);
  const sidebarSessions = useMemo(() => filterSessions(sessions, {
    activeKey,
    status: 'active',
  }), [activeKey, sessions]);
  const sessionIds = useMemo(() => sessions.map((session) => session.id), [sessions]);
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
    buildQuickCommandSummary(quickCommands, { activeSession })
  ), [activeSession, quickCommands]);
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

  const openDrawer = (type = terminalDefaults.defaultProviderType, profile = null, intent = 'session') => {
    const providerType = profile?.providerType || type;
    const resolvedIntent = profile ? 'edit' : intent;
    if (resolvedIntent !== 'session') setSelectedProfileId('');
    setNewType(providerType);
    setTerminalDrawerIntent(resolvedIntent);
    form.setFieldsValue({
      displayName: profile?.displayName || '',
      group: profile?.group || '',
      host: profile?.config?.host || '',
      port: profile?.config?.port || 22,
      username: profile?.auth?.username || '',
      password: '',
      authType: profile?.auth?.authType || 'password',
      privateKey: '',
      passphrase: '',
      jumpHost: profile?.config?.jumpHost || '',
      jumpPort: profile?.config?.jumpPort || 22,
      jumpUsername: profile?.auth?.jumpUsername || '',
      jumpPassword: '',
      credentialRef: profile?.auth?.credentialRef ? JSON.stringify(profile.auth.credentialRef) : '',
      rememberCredential: !!profile?.auth?.credentialRef,
      shell: profile?.config?.shell || '',
      workingDirectory: profile?.config?.workingDirectory || terminalDefaults.defaultWorkingDirectory,
      saveProfile: resolveProfileSaveDefault({ intent, profile }),
    });
    setEditingProfileId(profile?.id || '');
    setSshAuthType(profile?.auth?.authType || 'password');
    setDrawerOpen(true);
  };

  const openConnectionDrawer = (type = terminalDefaults.defaultProviderType) => openDrawer(type, null, 'connection');

  const createSession = async (action = 'create') => {
    const values = await form.validateFields();
    const provider = providers.find((item) => item.type === newType) || fallbackProviders[0];
    const label = values.displayName || providerLabel(provider);
    let request = buildRequest(newType, label, values);
    let profileId = editingProfileId;
    const submitPlan = buildTerminalSubmitPlan({
      action,
      intent: terminalDrawerIntent,
      saveProfile: values.saveProfile,
    });

    setCreatingSession(true);
    try {
      if (submitPlan.persistProfile) {
        const hasNewCredentialSecret = !!(
          values.password
          || values.privateKey
          || values.passphrase
          || values.jumpPassword
        );
        if (newType === 'ssh' && values.rememberCredential && hasNewCredentialSecret) {
          profileId = profileId || (crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}`);
          const credentialRef = await CredentialsAPI.SaveSSHCredential({
            id: profileId,
            password: values.password || '',
            privateKey: values.privateKey || '',
            passphrase: values.passphrase || '',
            jumpPassword: values.jumpPassword || '',
          });
          request = {
            ...request,
            auth: {
              ...request.auth,
              credentialRef,
            },
          };
        }
        if (newType === 'ssh' && !values.rememberCredential && editingProfileId) {
          await CredentialsAPI.DeleteSSHCredential(editingProfileId);
          request = {
            ...request,
            auth: {
              ...request.auth,
              credentialRef: null,
            },
          };
        }
        profileId = profileId || (crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}`);
        request = { ...request, profileId };
        const nextProfiles = saveProfile(profiles, request, editingProfileId, profileId);
        setProfiles(nextProfiles);
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
    const createdSessions = [];
    for (const request of requests) {
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
    if (createdSessions.length === 0) return;
    if (closeDrawer) setDrawerOpen(false);
    setSessions((current) => [...current, ...createdSessions]);
    setActiveKey(createdSessions[createdSessions.length - 1].id);
    setSelectedNav('sessions');
    messageApi.success(createdSessions.length > 1
      ? `${t('message.batchSessionsStarted')}: ${createdSessions.length}`
      : t('terminal.status.connecting'));
  };

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
      await startProfileRequests([entry.request]);
    } catch (error) {
      setClosedSessions((current) => [entry, ...current].slice(0, 10));
      showOperationError('message.credentialFailed', error, { retry: restoreLastClosedSession });
    }
  };

  const testConnection = async () => {
    if (newType !== 'ssh') {
      messageApi.info(t('message.localTestSkipped'));
      return;
    }
    const values = await form.validateFields();
    const provider = providers.find((item) => item.type === newType) || fallbackProviders[0];
    setTestingConnection(true);
    try {
      const request = await resolveCredentialRequest(buildRequest(newType, values.displayName || providerLabel(provider), values));
      await TerminalAPI.TestSSHConnection(request);
      messageApi.success(t('message.connectionTestSuccess'));
    } catch (error) {
      showOperationError('message.connectionTestFailed', error, { retry: testConnection });
    } finally {
      setTestingConnection(false);
    }
  };

  const duplicateProfile = (profile) => {
    const copy = {
      ...profile,
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
      status: 'connecting',
      startedAt: new Date().toISOString(),
      auditEvents: [],
      revision: 0,
    }]);
    setActiveKey(id);
    setSelectedNav('sessions');
  };

  const removeSession = (targetKey) => {
    const closingSession = sessions.find((session) => session.id === targetKey);
    saveAuditRecord(targetKey);
    if (closingSession) rememberClosedSessions([closingSession]);
    setSessions((current) => {
      const next = current.filter((item) => item.id !== targetKey);
      if (activeKey === targetKey) {
        setActiveKey(next[0]?.id || '');
      }
      return next;
    });
  };

  const confirmRemoveSession = (targetKey) => {
    if (settings.confirmDangerousActions === false) {
      removeSession(targetKey);
      return;
    }
    const session = sessions.find((item) => item.id === targetKey);
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

  const closeAllSessions = () => {
    sessions.forEach((session) => saveAuditRecord(session.id));
    rememberClosedSessions(sessions);
    setSessions([]);
    setActiveKey('');
    setFocusMode(false);
    terminalRefs.current = {};
  };

  const closeOtherSessions = (keepSessionId = activeKey) => {
    if (!keepSessionId) return;
    const closingSessions = sessions.filter((session) => session.id !== keepSessionId);
    closingSessions.forEach((session) => saveAuditRecord(session.id));
    rememberClosedSessions(closingSessions);
    setSessions((current) => current.filter((session) => session.id === keepSessionId));
    setActiveKey(keepSessionId);
    terminalRefs.current = Object.fromEntries(
      Object.entries(terminalRefs.current).filter(([sessionId]) => sessionId === keepSessionId),
    );
  };

  const closeClosedSessions = () => {
    const closingSessions = sessions.filter((session) => sessionStatusLabel(session) === 'closed');
    closingSessions.forEach((session) => saveAuditRecord(session.id));
    rememberClosedSessions(closingSessions);
    const closingSessionIds = new Set(closingSessions.map((session) => session.id));
    setSessions((current) => current.filter((session) => !closingSessionIds.has(session.id)));
    if (closingSessionIds.has(activeKey)) {
      const nextActive = sessions.find((session) => !closingSessionIds.has(session.id));
      setActiveKey(nextActive?.id || '');
    }
    terminalRefs.current = Object.fromEntries(
      Object.entries(terminalRefs.current).filter(([sessionId]) => !closingSessionIds.has(sessionId)),
    );
  };

  const confirmCloseClosedSessions = () => {
    const closingSessions = sessions.filter((session) => sessionStatusLabel(session) === 'closed');
    if (settings.confirmDangerousActions === false) {
      closeClosedSessions();
      return;
    }
    const confirm = buildSessionCloseConfirm({ mode: 'closed', sessions: closingSessions });
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
    const closingSessions = sessions.filter((session) => session.id !== keepSessionId);
    if (settings.confirmDangerousActions === false) {
      closeOtherSessions(keepSessionId);
      return;
    }
    const confirm = buildSessionCloseConfirm({ mode: 'others', sessions: closingSessions });
    if (!confirm) return;
    modalApi.confirm({
      title: t(confirm.titleKey),
      content: t(confirm.contentKey, confirm.contentValues),
      okButtonProps: { danger: true },
      okText: t(confirm.okActionKey),
      cancelText: t('action.cancel'),
      onOk: () => closeOtherSessions(keepSessionId),
    });
  };

  const confirmCloseAllSessions = () => {
    if (settings.confirmDangerousActions === false) {
      closeAllSessions();
      return;
    }
    const confirm = buildSessionCloseConfirm(sessions);
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

  const reconnectSession = (sessionId = activeKey) => {
    if (!sessionId) {
      messageApi.warning(t('message.noActiveSession'));
      return;
    }
    setSessions((current) => current.map((session) => (
      session.id === sessionId
        ? {
          ...session,
          auditEvents: [
            ...(session.auditEvents || []),
            createAuditEvent({
              sessionId: session.id,
              sessionLabel: session.label,
              type: 'session.reconnect',
            }),
          ],
          backendSessionId: '',
          status: 'connecting',
          revision: (session.revision || 0) + 1,
        }
        : session
    )));
    setActiveKey(sessionId);
    setSelectedNav('sessions');
    messageApi.success(t('terminal.status.connecting'));
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
    if (direction === 'previous') {
      activeTerminal.findPrevious?.(keyword);
      return;
    }
    activeTerminal.findNext?.(keyword);
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

  const saveAuditRecord = (sessionId = activeKey) => {
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
      providerType: session.providerType,
      screen: recording?.screen || '',
      sessionId: session.id,
      startedAt: recording?.startedAt || session.startedAt || '',
      title: session.label,
    });
    const nextRecords = persistAuditRecords([record, ...loadAuditRecords()]);
    setAuditRecords(nextRecords);
    setSessions((current) => current.map((item) => (
      item.id === session.id ? { ...item, auditRecordSaved: true } : item
    )));
    return record;
  };

  const deleteAuditRecord = (recordId) => {
    const nextRecords = persistAuditRecords(auditRecords.filter((record) => record.id !== recordId));
    setAuditRecords(nextRecords);
    if (replayRecord?.id === recordId) setReplayRecord(null);
    messageApi.success(t('message.auditRecordDeleted'));
  };

  const clearAuditRecords = () => {
    persistAuditRecords([]);
    setAuditRecords([]);
    setReplayRecord(null);
    messageApi.success(t('message.auditRecordsCleared'));
  };

  const exportAuditRecord = (record, format = 'cast') => {
    if (format === 'cast') {
      downloadText(`${safeFileName(record.title)}-${timestampFilePart(new Date(record.endedAt))}.cast`, record.cast || '');
      return;
    }
    downloadText(`${safeFileName(record.title)}-${timestampFilePart(new Date(record.endedAt))}.log`, record.screen || '');
  };

  const updateSessionStatus = (sessionId, status) => {
    if (status === 'closed') saveAuditRecord(sessionId);
    setSessions((current) => current.map((item) => (
      item.backendSessionId === sessionId || item.id === sessionId ? { ...item, status } : item
    )));
  };

  const saveWorkspace = () => {
    const snapshot = buildWorkspaceSnapshot(sessions, activeKey, sessionView);
    persistWorkspaceSnapshot(snapshot);
    setWorkspaceSummary(loadWorkspaceSummary());
    messageApi.success(t('message.workspaceSaved'));
  };

  const restoreWorkspace = ({ silent = false } = {}) => {
    const snapshot = loadWorkspaceSnapshot();
    if (!snapshot || snapshot.sessions.length === 0) {
      if (!silent) messageApi.info(t('message.noWorkspaceSnapshot'));
      return;
    }
    const restorableSessions = snapshot.sessions.filter((session) => canRestoreSession(session.request));
    const skipped = snapshot.sessions.length - restorableSessions.length;
    if (restorableSessions.length === 0) {
      if (!silent) messageApi.warning(t('message.workspaceRestoreSkipped'));
      return;
    }
    let restoredActiveKey = '';
    const restoredSessions = restorableSessions.map((session) => {
      const nextId = crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`;
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
        startedAt: new Date().toISOString(),
        status: 'connecting',
        revision: 0,
      };
    });
    setSessions((current) => [...current, ...restoredSessions]);
    setActiveKey(restoredActiveKey || restoredSessions[0].id);
    setSessionView(snapshot.sessionView || 'tabs');
    setSelectedNav('sessions');
    if (!silent) {
      messageApi.success(skipped > 0 ? t('message.workspaceRestoredPartial') : t('message.workspaceRestored'));
    }
  };

  const clearWorkspaceSnapshot = () => {
    localStorage.removeItem(workspaceStorageKey);
    setWorkspaceSummary(loadWorkspaceSummary());
    messageApi.success(t('message.workspaceCleared'));
  };

  const deleteProfile = async (profileId) => {
    const nextProfiles = profiles.filter((profile) => profile.id !== profileId);
    persistProfiles(nextProfiles);
    setProfiles(nextProfiles);
    try {
      await CredentialsAPI.DeleteSSHCredential(profileId);
    } catch {
      // Profiles remain removable even if the OS credential store is unavailable.
    }
    messageApi.success(t('message.profileDeleted'));
  };

  const openProfile = async (profile) => {
    if (!isProfileProviderAvailable(profile, providers)) {
      messageApi.warning(t('message.providerUnavailable'));
      return;
    }
    try {
      await startProfileRequests([profileToRequest(profile)]);
      markProfilesUsed([profile.id]);
    } catch (error) {
      showOperationError('message.credentialFailed', error, {
        retry: () => openProfile(profile),
      });
    }
  };

  const openRecentConnection = async (connection) => {
    const providerType = connection.providerType || connection.request?.providerType;
    if (!providers.some((provider) => provider.type === providerType)) {
      messageApi.warning(t('message.providerUnavailable'));
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
    openDrawer(profile.providerType, profile);
  };

  const focusProfileSession = (profile) => {
    const summary = profileSessionSummary.get(profile.id);
    if (!summary?.focusSessionId) {
      openProfile(profile);
      return;
    }
    setActiveKey(summary.focusSessionId);
    setSelectedNav('sessions');
  };

  const runConnectionProfilePrimaryAction = (profile) => {
    const sessionInfo = profileSessionSummary.get(profile.id) || { activeCount: 0, focusSessionId: '' };
    const providerAvailable = isProfileProviderAvailable(profile, providers);
    const primaryAction = buildConnectionProfilePrimaryAction({ providerAvailable, sessionInfo });
    if (primaryAction.disabled) {
      messageApi.warning(primaryAction.reasonKey ? t(primaryAction.reasonKey) : t('message.providerUnavailable'));
      return;
    }
    if (primaryAction.action === 'focus') {
      focusProfileSession(profile);
      return;
    }
    openProfile(profile);
  };

  const switchSession = (direction) => {
    const nextId = direction === 'previous'
      ? sessionNavigationState.previousId
      : sessionNavigationState.nextId;
    if (!nextId) return;
    setActiveKey(nextId);
    setSelectedNav('sessions');
  };

  const runSessionPaletteAction = (action) => {
    if (action === 'restoreClosed') restoreLastClosedSession();
    if (action === 'previousSession') switchSession('previous');
    if (action === 'nextSession') switchSession('next');
    if (action === 'reconnect') reconnectSession();
    if (action === 'renameSession') openRenameSession();
    if (action === 'clearTerminal') clearActiveTerminal();
    if (action === 'copyTranscript') copyTerminalTranscript();
    if (action === 'exportTranscript') exportTerminalTranscript();
    if (action === 'saveAudit') {
      const record = saveAuditRecord(activeKey);
      if (record) messageApi.success(t('message.auditRecordSaved'));
      if (!record) messageApi.info(t('message.terminalOutputEmpty'));
    }
    if (action === 'closeSession') confirmRemoveSession(activeKey);
    if (action === 'closeClosed') confirmCloseClosedSessions();
    if (action === 'closeOthers') confirmCloseOtherSessions();
    if (action === 'closeAll') confirmCloseAllSessions();
    if (action === 'commandHistory') setHistoryOpen(true);
    if (action === 'quickCommands') setCommandsOpen(true);
  };

  const runConnectionPaletteAction = (action) => {
    if (action === 'newLocalTerminal') openDrawer('local');
    if (action === 'quickSsh') openDrawer('ssh');
    if (action === 'newConnection') openConnectionDrawer();
    if (action === 'importSshConfig') setSshConfigOpen(true);
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

  const runProfileAction = (action, profile) => {
    if (action === 'connect') openProfile(profile);
    if (action === 'edit') openProfileEditor(profile);
    if (action === 'rename') openProfileEditor(profile);
    if (action === 'duplicate') duplicateProfile(profile);
    if (action === 'favorite' || action === 'unfavorite') toggleProfileFavorite(profile.id);
    if (action === 'delete') confirmDeleteProfile(profile);
  };

  const clearProfileFilters = () => {
    setProfileQuery('');
    setGroupQuery('all');
    setProviderFilter('all');
    setProfileSort('favorites');
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
      await startProfileRequests(selectedProfiles.map(profileToRequest));
      markProfilesUsed(selectedProfiles.map((profile) => profile.id));
      if (skipped > 0) {
        messageApi.warning(`${t('message.batchConnectionsSkipped')}: ${skipped}`);
      }
    } catch (error) {
      showOperationError('message.credentialFailed', error, {
        retry: () => openBatchProfiles(options),
      });
    }
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

  const exportProfiles = () => {
    downloadJson('galaxyterm-profiles.json', {
      version: profileSchemaVersion,
      exportedAt: new Date().toISOString(),
      secrets: 'omitted',
      profiles: profiles.map((profile) => sanitizeProfile(profile)),
    });
  };

  const importProfiles = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    try {
      const payload = JSON.parse(await file.text());
      const incoming = Array.isArray(payload) ? payload : payload.profiles;
      if (!Array.isArray(incoming)) throw new Error('invalid profiles');
      const normalized = incoming.map(normalizeImportedProfile).filter(Boolean);
      const nextProfiles = mergeProfiles(profiles, normalized);
      persistProfiles(nextProfiles);
      setProfiles(nextProfiles);
      messageApi.success(t('message.profileImported'));
    } catch (error) {
      showOperationError('message.profileImportFailed', error);
    }
  };

  const runConnectionTransferAction = (action) => {
    if (action === 'importSshConfig') setSshConfigOpen(true);
    if (action === 'importProfiles') profileImportRef.current?.click();
    if (action === 'exportProfiles') exportProfiles();
  };

  const importSshConfigProfiles = () => {
    const importedProfiles = parseSshConfigProfiles(sshConfigContent);
    if (importedProfiles.length === 0) {
      messageApi.warning(t('message.sshConfigEmpty'));
      return;
    }
    const nextProfiles = mergeProfiles(profiles, importedProfiles);
    persistProfiles(nextProfiles);
    setProfiles(nextProfiles);
    setSshConfigOpen(false);
    setSshConfigContent('');
    messageApi.success(t('message.sshConfigImported'));
  };

  const runQuickCommand = (command) => {
    const activeTerminal = terminalRefs.current[activeKey];
    if (!activeTerminal?.send) {
      messageApi.warning(t('message.noActiveSession'));
      return;
    }
    activeTerminal.send(command.endsWith('\n') ? command : `${command}\n`);
    appendAuditEvent(activeKey, 'quick-command.run', command);
    setCommandsOpen(false);
    setPaletteOpen(false);
  };

  const recordCommandHistory = (command, session = activeSession) => {
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
      const nextHistory = upsertCommandHistory(current, entry);
      persistCommandHistory(nextHistory);
      return nextHistory;
    });
  };

  const runHistoryCommand = (item) => {
    if (!item?.command) return;
    runQuickCommand(item.command);
    setHistoryOpen(false);
  };

  const toggleCommandHistoryFavorite = (item) => {
    const nextHistory = commandHistory.map((historyItem) => (
      historyItem.command === item.command && historyItem.providerType === item.providerType
        ? { ...historyItem, favorite: !historyItem.favorite }
        : historyItem
    ));
    persistCommandHistory(nextHistory);
    setCommandHistory(nextHistory);
  };

  const clearVisibleCommandHistory = () => {
    const scopeKey = historyScope === 'session' ? 'history.scope.session' : historyScope === 'all' ? 'history.scope.all' : 'history.scope.provider';
    const runClear = () => {
      const nextHistory = clearCommandHistory(commandHistory, {
        providerType: historyScope === 'all' ? 'all' : activeSession?.providerType || 'all',
        query: historyQuery,
        sessionId: historyScope === 'session' ? activeKey : '',
      });
      persistCommandHistory(nextHistory);
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
      return;
    }
    item.run();
    setPaletteOpen(false);
    setPaletteQuery('');
    setPaletteActiveIndex(-1);
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
    setEditingQuickCommandId('');
    messageApi.success(t(editingQuickCommandId ? 'message.commandUpdated' : 'message.commandSaved'));
  };

  const deleteQuickCommand = (id) => {
    const nextCommands = quickCommands.filter((item) => item.id !== id);
    persistQuickCommands(nextCommands);
    setQuickCommands(nextCommands);
    if (editingQuickCommandId === id) {
      commandForm.resetFields();
      setEditingQuickCommandId('');
    }
    messageApi.success(t('message.commandDeleted'));
  };

  const editQuickCommand = (item) => {
    setEditingQuickCommandId(item.id);
    commandForm.setFieldsValue({
      name: item.name,
      providerType: item.providerType || 'all',
      command: item.command,
    });
  };

  const cancelQuickCommandEdit = () => {
    commandForm.resetFields();
    setEditingQuickCommandId('');
  };

  const toggleQuickCommandFavorite = (id) => {
    const nextCommands = quickCommands.map((item) => (
      item.id === id ? { ...item, favorite: !item.favorite } : item
    ));
    persistQuickCommands(nextCommands);
    setQuickCommands(nextCommands);
  };

  const updateTerminalStatus = (sessionId, status, revision) => {
    setTerminalStatuses((current) => ({
      ...current,
      [sessionId]: status,
    }));
    setSessions((current) => synchronizeSessionTerminalStatus(current, sessionId, status, revision));
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
    setSelectedNav('audit');
  };

  const renderTerminalPane = (session) => {
    const recording = terminalRefs.current[session.id]?.recording?.();
    const recordingActive = Boolean(recording?.startedAt) && session.status !== 'closed';
    return (
      <TerminalFrame
        auditSummary={buildSessionAuditSummary(session, { recordingActive })}
        contextFacts={buildSessionContextFacts(session, {
          providerName: providerTypeLabel(session.providerType, providers),
          recordingActive,
        })}
        onCopyError={() => copyTerminalError(session.id)}
        onInterrupt={() => interruptSession(session.id)}
        onOpenAudit={() => openSessionAudit(session.id)}
        onReconnect={() => reconnectSession(session.id)}
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
            onSessionCreated={(backendSessionId) => {
              setSessions((current) => current.map((item) => (
                item.id === session.id ? { ...item, backendSessionId, status: 'connected' } : item
              )));
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
    if (action === 'reconnect') reconnectSession(session.id);
    if (action === 'duplicate') duplicateSession(session);
    if (action === 'closeOthers') confirmCloseOtherSessions(session.id);
    if (action === 'closeCurrent') confirmRemoveSession(session.id);
  };
  const items = sessions.map((session) => {
    const tabMenuItems = buildSessionTabMenuModel({ sessionCount: sessions.length }).flatMap((action, index) => [
      ...(index === 3 ? [{ key: 'danger-divider', type: 'divider' }] : []),
      {
        key: action.key,
        danger: action.danger,
        disabled: action.disabled,
        icon: sessionTabActionIcon(action.key),
        label: t(action.labelKey),
      },
    ]);
    return {
      key: session.id,
      label: (
        <Dropdown
          menu={{
            items: tabMenuItems,
            onClick: ({ domEvent, key }) => {
              domEvent?.stopPropagation();
              runSessionTabAction(key, session);
            },
          }}
          trigger={['contextMenu']}
        >
          <span
            className="session-tab-context-trigger"
            onContextMenu={() => setActiveKey(session.id)}
            onDoubleClick={(event) => {
              event.stopPropagation();
              openRenameSession(session);
            }}
          >
            <SessionTabLabel active={session.id === activeKey} session={session} />
          </span>
        </Dropdown>
      ),
      closable: true,
    };
  });

  const renderSessions = () => {
    if (sessions.length === 0) {
      return (
        <SessionEmptyPanel
          openConnections={() => setSelectedNav('connections')}
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
      canNavigate: sessionNavigationState.canNavigate,
      closedCount: currentSessionSummary.closed,
      sessionCount: sessions.length,
      terminalStatus: activeTerminalStatus,
      view: sessionView,
    });
    const runSessionToolbarAction = (action) => {
      if (action === 'grid') setSessionView('grid');
      if (action === 'tabs') setSessionView('tabs');
      if (action === 'interrupt') interruptSession();
      if (action === 'reconnect') reconnectSession();
      if (action === 'rename') openRenameSession();
      if (action === 'closeClosed') confirmCloseClosedSessions();
      if (action === 'closeOthers') confirmCloseOtherSessions();
      if (action === 'closeCurrent') confirmRemoveSession(activeKey);
    };
    const sessionToolbarActions = (
      <SessionToolbarActions model={sessionToolbarModel} onAction={runSessionToolbarAction} />
    );
    return (
      <div className={`session-tabs-page view-${sessionView}`}>
        <Tabs
          className="terminal-tabs"
          type="editable-card"
          hideAdd
          activeKey={activeKey}
          onChange={setActiveKey}
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
              onMouseDown={() => setActiveKey(session.id)}
            >
              {sessionView === 'grid' && (
                <div className="split-terminal-header">
                  <SessionTabLabel active={session.id === activeKey} session={session} />
                  <Space size={2}>
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
                        size="small"
                        type="text"
                        icon={<ReloadOutlined />}
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
                    <Tooltip title={t('action.closeSession')}>
                      <Button
                        aria-label={t('action.closeSession')}
                        danger
                        size="small"
                        type="text"
                        icon={<DeleteOutlined />}
                        onClick={() => confirmRemoveSession(session.id)}
                      />
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
      profile={profile}
      providers={providers}
      openProfile={openProfile}
      openProfileEditor={openProfileEditor}
      duplicateProfile={duplicateProfile}
      focusProfileSession={focusProfileSession}
      profileSessionSummary={profileSessionSummary}
      toggleProfileFavorite={toggleProfileFavorite}
      confirmDeleteProfile={confirmDeleteProfile}
    />
  ) : null;

  const renderConnections = () => (
    <div className="workspace-page connections-page">
      <div className="page-header">
        <div>
          <Text type="secondary">{t('nav.connections')}</Text>
          <Title level={3}>{t('section.connectionManager')}</Title>
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

      <div className="connection-summary-strip">
        <span>{`${t('metric.savedConnections')}: ${workspaceInsights.profiles.total}`}</span>
        <span>{`${t('label.favorite')}: ${workspaceInsights.profiles.favorites}`}</span>
        <span>{`${t('metric.activeSessions')}: ${workspaceInsights.sessions.active}`}</span>
        <span>{`${t('metric.providers')}: ${workspaceInsights.providers.total}`}</span>
      </div>

      <div className={selectedProfile && !compactConnectionDetail ? 'connection-manager-layout' : 'connection-manager-layout no-detail'}>
        <aside className="connection-groups-panel">
          <div className="connection-panel-head">
            <Text strong>{t('section.connectionGroups')}</Text>
            <Button
              size="small"
              type="text"
              icon={<StarFilled />}
              onClick={() => openBatchProfiles({ favoritesOnly: true })}
              disabled={!profiles.some((profile) => profile.favorite)}
            />
          </div>
          <div className="connection-group-nav">
            {connectionGroupNav.map((item) => (
              <button
                key={item.key}
                className={groupQuery === item.key ? 'connection-group-nav-item active' : 'connection-group-nav-item'}
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
            ))}
          </div>
        </aside>

        <section className="connection-list-panel">
          <div className="connection-list-header">
            <div>
              <Text type="secondary">{t('section.savedConnections')}</Text>
              <Title level={4}>{connectionGroupLabel(connectionGroupNav.find((item) => item.key === groupQuery) || { key: groupQuery, type: 'group' })}</Title>
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
                })}
                disabled={visibleProfiles.length === 0}
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
            <Segmented
              className="connection-provider-filter"
              value={providerFilter}
              onChange={setProviderFilter}
              options={[
                { label: t('filter.allProviders'), value: 'all' },
                ...providers.map((provider) => ({
                  label: providerLabel(provider),
                  value: provider.type,
                })),
              ]}
            />
            <Select
              className="connection-sort-select"
              value={profileSort}
              onChange={setProfileSort}
              options={[
                { value: 'favorites', label: t('sort.favorites') },
                { value: 'recent', label: t('sort.recent') },
                { value: 'name', label: t('sort.name') },
                { value: 'provider', label: t('sort.provider') },
                { value: 'group', label: t('sort.group') },
              ]}
            />
            {visibleProfiles.length > 0 && (
              <Text type="secondary" className="connection-list-hint">{t('hint.connectionListKeyboard')}</Text>
            )}
          </div>

          {visibleRecentConnections.length > 0 && (
            <div className="recent-connection-rail">
              <Text type="secondary">{t('section.recentConnections')}</Text>
              <div className="recent-connection-list compact">
                {visibleRecentConnections.slice(0, 4).map((connection) => (
                  <button
                    key={connection.id}
                    className="recent-connection-chip"
                    onClick={() => openRecentConnection(connection)}
                  >
                    <span className="provider-icon">{providerIcons[connection.providerType] || <CodeOutlined />}</span>
                    <span>
                      <strong>{connection.displayName}</strong>
                      <small>{connection.description}</small>
                    </span>
                  </button>
                ))}
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
              className="profile-list connection-profile-list"
              dataSource={visibleProfiles}
              role="listbox"
              tabIndex={0}
              onKeyDown={handleConnectionListKeyDown}
              renderItem={(profile) => {
                const sessionInfo = profileSessionSummary.get(profile.id) || { activeCount: 0, focusSessionId: '' };
                const providerAvailable = isProfileProviderAvailable(profile, providers);
                const primaryAction = buildConnectionProfilePrimaryAction({ providerAvailable, sessionInfo });
                const actions = [
                  <Button key="primary" size="small" type="primary" onClick={(event) => {
                    event.stopPropagation();
                    runConnectionProfilePrimaryAction(profile);
                  }} disabled={primaryAction.disabled}>{t(primaryAction.labelKey)}</Button>,
                  <Dropdown
                    key="manage"
                    trigger={['click']}
                    menu={{
                      items: profileActionModel(profile).filter((action) => action !== 'connect').map((action) => ({
                        key: action,
                        danger: action === 'delete',
                        label: t(`profile.action.${action}`),
                      })),
                      onClick: ({ domEvent, key }) => {
                        domEvent.stopPropagation();
                        runProfileAction(key, profile);
                      },
                    }}
                  >
                    <Button size="small" icon={<MoreOutlined />} onClick={(event) => event.stopPropagation()}>{t('action.manage')}</Button>
                  </Dropdown>,
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
                const badges = buildConnectionProfileBadges(profile, sessionInfo, { providerAvailable });
                return (
                <List.Item
                  className={(compactConnectionDetail ? explicitlySelectedProfile?.id : selectedProfile?.id) === profile.id ? 'connection-profile-row active' : 'connection-profile-row'}
                  role="option"
                  aria-selected={(compactConnectionDetail ? explicitlySelectedProfile?.id : selectedProfile?.id) === profile.id}
                  tabIndex={-1}
                  onClick={() => setSelectedProfileId(profile.id)}
                  onDoubleClick={() => openProfile(profile)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') {
                      event.preventDefault();
                      runConnectionProfilePrimaryAction(profile);
                    }
                    if (event.key === ' ') {
                      event.preventDefault();
                      setSelectedProfileId(profile.id);
                    }
                  }}
                  actions={actions}
                >
                  <List.Item.Meta
                    avatar={<span className="provider-icon">{providerIcons[profile.providerType] || <CodeOutlined />}</span>}
                    title={(
                      <span className="connection-profile-title">
                        <strong>{profile.displayName}</strong>
                        <small>{providerTypeLabel(profile.providerType, providers)}</small>
                      </span>
                    )}
                    description={(
                      <span className="connection-profile-description">
                        <span className="connection-profile-endpoint-line">{buildConnectionProfileSubtitle(profile)}</span>
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
                        {profile.providerType === 'ssh' && profile.config?.jumpHost && (
                          <small>{`${t('field.jumpHost')}: ${profile.config.jumpHost}`}</small>
                        )}
                      </span>
                    )}
                  />
                </List.Item>
                );
              }}
            />
          )}
        </section>
        {selectedProfile && !compactConnectionDetail && (
          <aside className="connection-detail-panel">
            {renderConnectionProfilePreview(selectedProfile)}
          </aside>
        )}
      </div>
      <Drawer
        className="connection-detail-drawer"
        open={selectedNav === 'connections' && compactConnectionDetail && Boolean(explicitlySelectedProfile)}
        title={t('section.connectionDetails')}
        width={380}
        onClose={() => setSelectedProfileId('')}
      >
        {renderConnectionProfilePreview(explicitlySelectedProfile)}
      </Drawer>
    </div>
  );

  const renderExtensions = () => (
    <div className="workspace-page extensions-page">
      <div className="page-header">
        <div>
          <Text type="secondary">{t('nav.extensions')}</Text>
          <Title level={3}>{t('section.extensionManager')}</Title>
        </div>
        <Space>
          <Button icon={<FolderOpenOutlined />} onClick={() => setExtensionInstallOpen(true)} loading={extensionBusy}>{t('action.installOffline')}</Button>
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
        <Button icon={<FolderOpenOutlined />} onClick={() => setExtensionInstallOpen(true)}>{t('action.installOffline')}</Button>
      </div>
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
          dataSource={extensionSources}
          locale={{
            emptyText: (
              <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={t('empty.noExtensionSources')}>
                <Button size="small" type="primary" onClick={() => setExtensionSourceOpen(true)}>{t('action.addSource')}</Button>
              </Empty>
            ),
          }}
          renderItem={(source) => (
            <List.Item
              actions={[
                <Button key="delete" size="small" danger onClick={() => deleteExtensionSource(source.id)}>{t('action.delete')}</Button>,
              ]}
            >
              <List.Item.Meta
                avatar={<span className="provider-icon"><GlobalOutlined /></span>}
                title={(
                  <span className="installed-extension-title">
                    <strong>{source.name}</strong>
                    <span className="connection-profile-badge tone-info">{source.type}</span>
                  </span>
                )}
                description={<span className="installed-extension-description"><span>{source.url}</span></span>}
              />
            </List.Item>
          )}
        />
      </section>
      <section className="extension-section">
        <div className="extension-section-head">
          <div>
            <Text type="secondary">{t('extension.installedHint')}</Text>
            <Title level={4}>{t('section.installedExtensions')}</Title>
          </div>
        </div>
        <List
          className="profile-list installed-extension-list"
          dataSource={installedExtensionRows}
          locale={{ emptyText: t('empty.noInstalledExtensions') }}
          renderItem={(extension) => (
            <List.Item
              actions={[
                <Switch
                  key="enabled"
                  checked={extension.enabled}
                  checkedChildren={t('label.enabled')}
                  unCheckedChildren={t('label.disabled')}
                  onChange={(checked) => toggleExtensionEnabled(extension.id, checked)}
                />,
                <Button key="uninstall" size="small" danger loading={extensionBusy} onClick={() => uninstallExtension(extension.id)}>{t('action.uninstall')}</Button>,
              ]}
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
          )}
        />
      </section>
      <section className="extension-section">
        <div className="extension-section-head">
          <div>
            <Text type="secondary">{t('extension.officialHint')}</Text>
            <Title level={4}>{t('section.officialExtensions')}</Title>
          </div>
        </div>
      <div className="extension-grid">
        {extensionCatalog.map((extension) => {
          const action = buildExtensionAction(extension);
          const facts = buildExtensionCardFacts(extension);
          const CardTag = action.enabled ? 'button' : 'div';
          return (
            <CardTag
              className={`extension-card extension-card-${extension.status}`}
              key={`${extension.type}-${extension.status}`}
              type={action.enabled ? 'button' : undefined}
              onClick={() => action.enabled && setExtensionInstallOpen(true)}
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
                  {t(`extension.action.${action.key}`)}
                </span>
              </span>
            </CardTag>
          );
        })}
      </div>
      </section>
    </div>
  );

  const saveExtensionSource = () => {
    const source = normalizeExtensionSource({
      name: extensionSourceName,
      url: extensionSourceUrl,
      type: 'github',
    });
    if (!source) {
      messageApi.warning(t('validation.required'));
      return;
    }
    const nextSources = upsertExtensionSource(extensionSources, source);
    persistExtensionSources(nextSources);
    setExtensionSources(nextSources);
    setExtensionSourceName('');
    setExtensionSourceUrl('');
    setExtensionSourceOpen(false);
    messageApi.success(t('message.extensionSourceSaved'));
  };

  const deleteExtensionSource = (sourceId) => {
    const nextSources = removeExtensionSource(extensionSources, sourceId);
    persistExtensionSources(nextSources);
    setExtensionSources(nextSources);
    messageApi.success(t('message.extensionSourceDeleted'));
  };

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

  const installOfflineExtension = async () => {
    const packagePath = extensionPackagePath.trim();
    if (!packagePath) {
      messageApi.warning(t('validation.required'));
      return;
    }
    setExtensionBusy(true);
    try {
      await ExtensionsAPI.InstallOffline(packagePath);
      const items = await ExtensionsAPI.ListInstalled();
      setInstalledExtensions(Array.isArray(items) ? items : []);
      setExtensionInstallOpen(false);
      setExtensionPackagePath('');
      messageApi.success(t('message.extensionInstalled'));
    } catch (error) {
      showOperationError('message.extensionInstallFailed', error, {
        retry: installOfflineExtension,
        scope: 'extension',
      });
    } finally {
      setExtensionBusy(false);
    }
  };

  const uninstallExtension = async (extensionID) => {
    setExtensionBusy(true);
    try {
      await ExtensionsAPI.Uninstall(extensionID);
      const items = await ExtensionsAPI.ListInstalled();
      setInstalledExtensions(Array.isArray(items) ? items : []);
      messageApi.success(t('message.extensionUninstalled'));
    } catch (error) {
      showOperationError('message.extensionInstallFailed', error, {
        retry: () => uninstallExtension(extensionID),
        scope: 'extension',
      });
    } finally {
      setExtensionBusy(false);
    }
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
      authType: fields.authType,
      host: fields.host,
      passphrase: '',
      password: '',
      port: fields.port,
      privateKey: '',
      profileId: fields.profileId,
      username: fields.username,
    });
    setFileEntries([]);
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
      sshAuthType: fields.authType,
      sshHost: fields.host,
      sshPassphrase: '',
      sshPassword: '',
      sshPort: fields.port,
      sshPrivateKey: '',
      sshUser: fields.username,
    });
  };

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
      return {
        providerType: selectedFileProvider.type,
        config: values.config || {},
        auth: values.auth || {},
        path: overridePath || values.path || '.',
      };
    }
    const resolvedProfile = await resolveSelectedSshProfile(fileProfileId);
    const connectionAuth = buildSshConnectionAuth(values, resolvedProfile);
    return {
      providerType: selectedFileProvider.type,
      config: {
        host: values.host,
        port: values.port || 22,
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

  const deleteRemoteEntry = async (entry) => {
    setFileLoading(true);
    try {
      const req = await currentFileRequest();
      req.path = entry.path;
      await FilesAPI.Delete(req);
      messageApi.success(t('message.deleteSuccess'));
      await loadFiles(fileForm.getFieldValue('path') || '.');
    } catch (error) {
      showOperationError('message.fileListFailed', error, {
        retry: () => deleteRemoteEntry(entry),
      });
    } finally {
      setFileLoading(false);
    }
  };

  const downloadRemoteFile = async (entry) => {
    if (entry.isDir) return;
    setFileLoading(true);
    try {
      const req = await currentFileRequest();
      req.path = entry.path;
      const content = await FilesAPI.ReadFile(req);
      const blob = new Blob([content], { type: 'application/octet-stream' });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = entry.name;
      anchor.click();
      URL.revokeObjectURL(url);
      messageApi.success(t('message.downloadStarted'));
    } catch (error) {
      showOperationError('message.fileListFailed', error, {
        retry: () => downloadRemoteFile(entry),
      });
    } finally {
      setFileLoading(false);
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

  const uploadTextFile = async () => {
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
      showOperationError('message.uploadFailed', error, { retry: uploadTextFile });
    } finally {
      setFileLoading(false);
    }
  };

  const renderFiles = () => {
    const currentPath = watchedFilePath || fileForm.getFieldValue('path') || '.';
    const fileSummary = buildRemoteFileSummary(fileEntries, { path: currentPath, loading: fileLoading });
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
    const canCreateDirectories = fileProviderSupports(selectedFileProvider, 'mkdir');
    const canDeleteFiles = fileProviderSupports(selectedFileProvider, 'delete');
    return (
      <div className="workspace-page remote-workspace-page">
        <div className="page-header">
          <div>
            <Text type="secondary">{t('nav.files')}</Text>
            <Title level={3}>{t('section.remoteFiles')}</Title>
          </div>
          <Space wrap>
            <Button icon={<ReloadOutlined />} disabled={!canListFiles} onClick={() => loadFiles()} loading={fileLoading}>{t('action.refresh')}</Button>
            <Button type="primary" disabled={!canListFiles} onClick={() => loadFiles()} loading={fileLoading}>{t('action.open')}</Button>
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
            <Form form={fileForm} layout="vertical" className="remote-context-form" initialValues={{ port: 22, path: '.', profileId: '' }}>
              <Form.Item label={t('field.fileProvider')}>
                <Select
                  value={selectedFileProvider.type}
                  options={fileProviders.map((provider) => ({
                    value: provider.type,
                    label: provider.nameKey ? t(provider.nameKey, provider.extensionName) : provider.extensionName,
                  }))}
                  onChange={(providerType) => {
                    setFileProviderType(providerType);
                    setFileEntries([]);
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
                </>
              ) : (
                <FileProviderFormFields provider={selectedFileProvider} />
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
                    <button type="button" onClick={() => loadFiles(crumb.path)}>
                      {crumb.label}
                    </button>
                  </React.Fragment>
                ))}
              </div>
              <Space wrap>
                <Button disabled={!canListFiles} onClick={goParent}>{t('action.up')}</Button>
                {canCreateDirectories && <Button onClick={() => setMkdirOpen(true)}>{t('action.mkdir')}</Button>}
                {canWriteFiles && <Button onClick={() => setUploadOpen(true)}>{t('action.uploadText')}</Button>}
              </Space>
            </div>
            <List
              className="remote-file-list"
              loading={fileLoading}
              dataSource={fileEntries}
              locale={{
                emptyText: (
                  <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={t('empty.noFiles')}>
                    <Button type="primary" onClick={() => loadFiles()} loading={fileLoading}>{t('action.open')}</Button>
                  </Empty>
                ),
              }}
              renderItem={(entry) => (
                <List.Item
                  className={entry.isDir ? 'remote-file-row directory' : 'remote-file-row'}
                  actions={[
                    !entry.isDir && canReadFiles && canWriteFiles && <Button key="edit" size="small" onClick={() => openRemoteFileEditor(entry)} loading={fileEditorLoading}>{t('action.edit')}</Button>,
                    !entry.isDir && canReadFiles && <Button key="download" size="small" onClick={() => downloadRemoteFile(entry)}>{t('action.download')}</Button>,
                    canDeleteFiles && <Button key="delete" size="small" danger onClick={() => deleteRemoteEntry(entry)}>{t('action.delete')}</Button>,
                  ].filter(Boolean)}
                  onDoubleClick={() => {
                    if (entry.isDir) loadFiles(entry.path);
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
              )}
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
        title={editingRemoteFile ? `${t('action.edit')} ${editingRemoteFile.name}` : t('action.edit')}
        width={760}
        open={fileEditorOpen}
        onClose={() => setFileEditorOpen(false)}
        extra={<Button type="primary" loading={fileEditorLoading} onClick={saveRemoteFile}>{t('action.save')}</Button>}
      >
        <Input.TextArea
          className="remote-file-editor"
          value={editingRemoteContent}
          onChange={(event) => setEditingRemoteContent(event.target.value)}
          spellCheck={false}
        />
      </Drawer>
      <Drawer
        title={t('action.uploadText')}
        width={560}
        open={uploadOpen}
        onClose={() => setUploadOpen(false)}
        extra={<Button type="primary" onClick={uploadTextFile} loading={fileLoading}>{t('action.upload')}</Button>}
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
              <Button icon={<SaveOutlined />} onClick={saveWorkspace}>{t('action.saveWorkspace')}</Button>
              <Button icon={<ReloadOutlined />} onClick={() => restoreWorkspace()}>{t('action.restoreWorkspace')}</Button>
              <Button danger icon={<DeleteOutlined />} onClick={clearWorkspaceSnapshot}>{t('action.clearWorkspace')}</Button>
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

  const startTunnel = async () => {
    const values = await tunnelForm.validateFields();
    setTunnelBusy(true);
    try {
      const resolvedProfile = await resolveSelectedSshProfile(tunnelProfileId);
      const auth = buildSshConnectionAuth({
        authType: values.sshAuthType,
        passphrase: values.sshPassphrase,
        password: values.sshPassword,
        privateKey: values.sshPrivateKey,
      }, resolvedProfile);
      const info = await TunnelAPI.Start({
        name: values.name || 'Tunnel',
        sshHost: values.sshHost,
        sshPort: values.sshPort || 22,
        sshUser: values.sshUser,
        sshAuthType: auth.authType,
        sshPassphrase: auth.passphrase,
        sshPassword: auth.password,
        sshPrivateKey: auth.privateKey,
        localHost: values.localHost || '127.0.0.1',
        localPort: values.localPort,
        remoteHost: values.remoteHost,
        remotePort: values.remotePort,
      });
      setTunnels((current) => [...current, info]);
      messageApi.success(t('message.tunnelStarted'));
    } catch (error) {
      showOperationError('message.tunnelFailed', error);
    } finally {
      setTunnelBusy(false);
    }
  };

  const stopTunnel = async (id) => {
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
      setTunnelBusy(false);
    }
  };

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
          <Button type="primary" onClick={startTunnel} loading={tunnelBusy}>{t('action.create')}</Button>
        </div>
        <div className="remote-summary-grid">
          <MetricCard label={t('metric.activeTunnels')} value={tunnelSummary.total} />
          <MetricCard label={t('metric.localPorts')} value={tunnelSummary.localPorts.length || 0} meta={tunnelSummary.localPorts.join(', ')} />
          <MetricCard label={t('metric.remoteHosts')} value={tunnelSummary.remoteHosts.length || 0} meta={tunnelSummary.remoteHosts.join(', ')} />
        </div>
        <div className="tunnel-workbench">
          <div className="remote-context-panel">
            <Text strong>{t('section.quickConnect')}</Text>
            <Text type="secondary">{t('tunnel.formHint')}</Text>
            <Form form={tunnelForm} layout="vertical" className="remote-context-form" initialValues={{ sshPort: 22, localHost: '127.0.0.1', profileId: '', sshAuthType: 'password' }}>
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
            </Form>
          </div>
          <div className="remote-file-panel">
            <div className="remote-file-toolbar">
              <div>
                <Text strong>{t('section.tunnels')}</Text>
                <Text type="secondary">{t('tunnel.listHint')}</Text>
              </div>
            </div>
            <List
              className="profile-list tunnel-list"
              dataSource={tunnels}
              locale={{
                emptyText: (
                  <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={t('empty.noTunnels')}>
                    <Button type="primary" onClick={startTunnel} loading={tunnelBusy}>{t('action.create')}</Button>
                  </Empty>
                ),
              }}
              renderItem={(item) => {
                const display = buildTunnelDisplay(item);
                return (
                  <List.Item
                    className="tunnel-row"
                    actions={[<Button key="stop" danger size="small" loading={tunnelBusy} onClick={() => stopTunnel(item.id)}>{t('action.delete')}</Button>]}
                  >
                    <List.Item.Meta
                      avatar={<span className="provider-icon"><ApiOutlined /></span>}
                      title={(
                        <span className="remote-file-title">
                          <strong>{display.name}</strong>
                          <span className="connection-profile-badge tone-success">{display.localPort}</span>
                        </span>
                      )}
                      description={(
                        <span className="tunnel-route">
                          <span>{display.route}</span>
                          <small>{t('tunnel.via')} {display.via}</small>
                        </span>
                      )}
                    />
                  </List.Item>
                );
              }}
            />
          </div>
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
          <Button onClick={() => saveAuditRecord(activeKey)} disabled={!activeKey}>{t('action.saveAuditRecord')}</Button>
          <Button danger onClick={clearAuditRecords} disabled={auditRecords.length === 0}>{t('action.clear')}</Button>
        </Space>
      </div>
      <div className="audit-hint-strip">{t('settings.auditHint')}</div>
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
              <Button onClick={() => saveAuditRecord(activeKey)} disabled={!activeKey}>{t('action.saveAuditRecord')}</Button>
            </Empty>
          ),
        }}
        renderItem={(record) => {
          const summary = buildAuditRecordSummary(record);
          return (
            <List.Item
              actions={[
                <Button key="replay" size="small" onClick={() => setReplayRecord(record)}>{t('action.replay')}</Button>,
                <Button key="cast" size="small" onClick={() => exportAuditRecord(record, 'cast')}>{t('action.exportCast')}</Button>,
                <Button key="log" size="small" onClick={() => exportAuditRecord(record, 'log')}>{t('action.exportLog')}</Button>,
                <Button key="delete" size="small" danger onClick={() => deleteAuditRecord(record.id)}>{t('action.delete')}</Button>,
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
        className="audit-replay-drawer"
        title={replayRecord ? `${t('action.replay')} · ${replayRecord.title}` : t('action.replay')}
        width={screens.md === false ? '100%' : 920}
        open={!!replayRecord}
        onClose={() => setReplayRecord(null)}
        extra={replayRecord && (
          <Space>
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
              <AuditReplayPlayer record={replayRecord} />
            </Suspense>
            <div className="audit-timeline-section">
              <div className="audit-timeline-heading">
                <Text strong>{t('section.auditTimeline')}</Text>
                <Text type="secondary">{replayRecord.auditEvents?.length || 0}</Text>
              </div>
              <List
                className="audit-timeline-list"
                size="small"
                dataSource={replayRecord.auditEvents || []}
                renderItem={(event) => (
                  <List.Item>
                    <span className="audit-timeline-event">
                      <Text code>{event.type}</Text>
                      <span>
                        <Text>{event.detail || '-'}</Text>
                        <Text type="secondary">{formatAuditTimestamp(event.at, locale)}</Text>
                      </span>
                    </span>
                  </List.Item>
                )}
              />
            </div>
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
  const paletteItems = buildPaletteItems({
    activeSessionId: activeKey,
    canNavigateSessions: sessionNavigationState.canNavigate,
    closedSessionCount: currentSessionSummary.closed,
    restorableSessionCount: closedSessions.length,
    favoriteConnectionCount: profiles.filter((profile) => profile.favorite).length,
    profiles,
    quickCommands,
    quickCommandProviderType: activeSession?.providerType || 'all',
    providers,
    sessions,
    sessionCount: sessions.length,
    setSelectedNav,
    setActiveKey,
    openDrawer,
    openProfile,
    runQuickCommand,
    runConnectionAction: runConnectionPaletteAction,
    runSessionAction: runSessionPaletteAction,
    savedConnectionCount: profiles.length,
    setCommandsOpen,
    setSettingsOpen,
    setHelpOpen,
    saveWorkspace,
    restoreWorkspace,
    commandPaletteShortcut,
  });
  const visiblePaletteItems = filterPaletteItems(paletteItems, paletteQuery);
  const displayedPaletteItems = visiblePaletteItems.slice(0, 12);
  const paletteSummary = buildPaletteSummary(visiblePaletteItems);

  useEffect(() => {
    if (!paletteOpen) {
      setPaletteActiveIndex(-1);
      return;
    }
    setPaletteActiveIndex(displayedPaletteItems.length > 0 ? 0 : -1);
  }, [paletteOpen, paletteQuery, displayedPaletteItems.length]);

  const closePalette = () => {
    setPaletteOpen(false);
    setPaletteQuery('');
    setPaletteActiveIndex(-1);
  };

  const runActivePaletteAction = () => {
    const item = displayedPaletteItems[paletteActiveIndex] || displayedPaletteItems[0];
    if (item) runPaletteAction(item);
  };

  const runPaletteEmptyAction = (action) => {
    closePalette();
    if (action === 'local') openDrawer('local');
    if (action === 'ssh') openDrawer('ssh');
    if (action === 'connections') setSelectedNav('connections');
  };

  const handlePaletteKeyDown = (event) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setPaletteActiveIndex((current) => resolvePaletteIndex(displayedPaletteItems.length, current, 'next'));
    }
    if (event.key === 'ArrowUp') {
      event.preventDefault();
      setPaletteActiveIndex((current) => resolvePaletteIndex(displayedPaletteItems.length, current, 'previous'));
    }
    if (event.key === 'Home') {
      event.preventDefault();
      setPaletteActiveIndex(resolvePaletteIndex(displayedPaletteItems.length, paletteActiveIndex, 'first'));
    }
    if (event.key === 'End') {
      event.preventDefault();
      setPaletteActiveIndex(resolvePaletteIndex(displayedPaletteItems.length, paletteActiveIndex, 'last'));
    }
    if (event.key === 'Enter') {
      event.preventDefault();
      runActivePaletteAction();
    }
    if (event.key === 'Escape') {
      event.preventDefault();
      closePalette();
    }
  };

  const workspaceMenuActions = {
    saveWorkspace,
    restoreWorkspace: () => restoreWorkspace(),
    quickCommands: () => setCommandsOpen(true),
    commandHistory: () => setHistoryOpen(true),
    help: () => setHelpOpen(true),
    extensions: () => setSelectedNav('extensions'),
    settings: () => setSelectedNav('settings'),
  };
  const workspaceMenuItems = [
    { key: 'saveWorkspace', icon: <SaveOutlined />, label: t('action.saveWorkspace') },
    { key: 'restoreWorkspace', icon: <ReloadOutlined />, label: t('action.restoreWorkspace') },
    { key: 'quickCommands', icon: <CodeOutlined />, label: t('action.commands') },
    { key: 'commandHistory', icon: <HistoryOutlined />, label: t('action.commandHistory') },
    { key: 'help', icon: <QuestionCircleOutlined />, label: t('action.help') },
    { key: 'extensions', icon: <AppstoreAddOutlined />, label: t('nav.extensions') },
    { key: 'settings', icon: <SettingOutlined />, label: t('nav.settings') },
  ];
  const sessionMenuActions = {
    restoreClosed: restoreLastClosedSession,
    view: () => setSessionView(sessionView === 'tabs' ? 'grid' : 'tabs'),
    focus: () => setFocusMode((current) => !current),
    copy: copyTerminalSelection,
    paste: pasteClipboardToTerminal,
    clear: clearActiveTerminal,
    reset: resetActiveTerminal,
    copyTranscript: copyTerminalTranscript,
    exportTranscript: exportTerminalTranscript,
    history: () => setHistoryOpen(true),
    saveAudit: () => {
      const record = saveAuditRecord(activeKey);
      if (record) messageApi.success(t('message.auditRecordSaved'));
      if (!record) messageApi.info(t('message.terminalOutputEmpty'));
    },
    zoomIn: () => zoomTerminalFont(1),
    zoomOut: () => zoomTerminalFont(-1),
    zoomReset: resetTerminalFont,
    previousSession: () => switchSession('previous'),
    nextSession: () => switchSession('next'),
    rename: () => openRenameSession(),
    reconnect: () => reconnectSession(),
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
      key: 'exportTranscript',
      icon: <ExportOutlined />,
      label: t('action.exportTranscript'),
    },
    activeKey && {
      key: 'saveAudit',
      icon: <AuditOutlined />,
      label: t('action.saveAuditRecord'),
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
      key: 'reconnect',
      icon: <ReloadOutlined />,
      label: t('action.reconnect'),
    },
    currentSessionSummary.closed > 0 && {
      key: 'closeClosed',
      icon: <DeleteOutlined />,
      label: t('action.closeClosed'),
    },
    activeKey && sessions.length > 1 && {
      key: 'closeOthers',
      icon: <DeleteOutlined />,
      label: t('action.closeOthers'),
      danger: true,
    },
    {
      key: 'closeAll',
      icon: <DeleteOutlined />,
      label: t('action.closeAll'),
      disabled: sessions.length === 0,
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
      <Sider
        breakpoint="lg"
        collapsed={sidebarCompact}
        collapsedWidth={68}
        collapsible
        className="workspace-sidebar"
        onBreakpoint={setSidebarCompact}
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
            { key: 'sessions', icon: <CodeOutlined />, label: t('nav.sessions') },
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
                renderItem={(provider) => (
                  <List.Item className="provider-row" onClick={() => openDrawer(provider.type)}>
                    <Space>
                      <span className="provider-icon">{providerIcons[provider.type] || <CodeOutlined />}</span>
                      <span>{providerLabel(provider)}</span>
                    </Space>
                    <Badge status={provider.category === 'builtin' ? 'success' : 'processing'} />
                  </List.Item>
                )}
              />
              {sidebarQuickProfiles.length > 0 && (
                <div className="sidebar-quick-profiles">
                  <div className="section-title compact">{t('section.savedConnections')}</div>
                  <List
                    size="small"
                    dataSource={sidebarQuickProfiles}
                    renderItem={(profile) => {
                      const sessionInfo = profileSessionSummary.get(profile.id) || { activeCount: 0, focusSessionId: '' };
                      const badges = buildConnectionProfileBadges(profile, sessionInfo).filter((badge) => badge.key !== 'group').slice(0, 2);
                      return (
                        <List.Item
                          className={sessionInfo.activeCount > 0 ? 'quick-profile-row active' : 'quick-profile-row'}
                          onClick={() => focusProfileSession(profile)}
                          title={`${profile.displayName} · ${buildConnectionProfileSubtitle(profile)}`}
                        >
                          <span className="provider-icon">{providerIcons[profile.providerType] || <CodeOutlined />}</span>
                          <span className="quick-profile-main">
                            <span>{profile.displayName}</span>
                            <small>{buildConnectionProfileSubtitle(profile)}</small>
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
                        </List.Item>
                      );
                    }}
                  />
                </div>
              )}
            </div>

            <div className="sidebar-section sidebar-fill">
              <div className="section-title with-hint">
                <span>{t('section.activeSessions')}</span>
                {sessions.length > 0 && <Text code>{numberedSessionShortcut}</Text>}
              </div>
              {sidebarSessions.length === 0 ? (
                <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={t('empty.noSessions')} />
              ) : (
                <List
                  size="small"
                  dataSource={sidebarSessions}
                  renderItem={(session) => {
                    const shortcutNumber = resolveSessionShortcutNumber(sessionIds, session.id);
                    return (
                      <List.Item
                        className={session.id === activeKey ? 'session-row active' : 'session-row'}
                        onClick={() => {
                          setSelectedNav('sessions');
                          setActiveKey(session.id);
                        }}
                      >
                        <SessionSidebarLabel session={session} />
                        {shortcutNumber && <Text code>{shortcutNumber}</Text>}
                      </List.Item>
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
            <Tooltip title={t('action.newTerminal')}>
              <Button
                aria-label={t('action.newTerminal')}
                className="topbar-new-terminal"
                type="primary"
                icon={<PlusOutlined />}
                onClick={() => openDrawer()}
              >
                <span className="topbar-button-label">{t('action.newTerminal')}</span>
              </Button>
            </Tooltip>
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
              <>
                <Input.Search
                  className="terminal-search"
                  ref={terminalSearchRef}
                  allowClear
                  size="middle"
                  value={terminalSearch}
                  onChange={(event) => {
                    setTerminalSearch(event.target.value);
                    if (!event.target.value) terminalRefs.current[activeKey]?.clearSearch?.();
                  }}
                  onSearch={() => findInTerminal('next')}
                  placeholder={t('placeholder.searchTerminal')}
                />
                {terminalSearch.trim() && (
                  <>
                    <Tooltip title={t('action.findPrevious')}>
                      <Button icon={<UpOutlined />} onClick={() => findInTerminal('previous')} />
                    </Tooltip>
                    <Tooltip title={t('action.findNext')}>
                      <Button icon={<DownOutlined />} onClick={() => findInTerminal('next')} />
                    </Tooltip>
                  </>
                )}
              </>
            )}
            <Tooltip title={t('action.language')}>
              <Button aria-label={t('action.language')} icon={<GlobalOutlined />} onClick={() => setSettingsOpen(true)} />
            </Tooltip>
            <Tooltip title={t('action.help')}>
              <Button aria-label={t('action.help')} icon={<QuestionCircleOutlined />} onClick={() => setHelpOpen(true)} />
            </Tooltip>
            <Tooltip title={t('nav.extensions')}>
              <Button aria-label={t('nav.extensions')} icon={<AppstoreAddOutlined />} onClick={() => setSelectedNav('extensions')} />
            </Tooltip>
            <Tooltip title={t('nav.settings')}>
              <Button aria-label={t('nav.settings')} icon={<SettingOutlined />} onClick={() => setSelectedNav('settings')} />
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

      <Modal
        title={t('drawer.commandPalette')}
        open={paletteOpen}
        footer={null}
        width={620}
        className="command-palette-modal"
        onCancel={closePalette}
      >
        <Input
          autoFocus
          value={paletteQuery}
          onChange={(event) => setPaletteQuery(event.target.value)}
          onKeyDown={handlePaletteKeyDown}
          placeholder={t('placeholder.commandPalette')}
        />
        <div className="command-palette-summary">
          <span>
            <small>{t('metric.visibleResults')}</small>
            <strong>{paletteSummary.total}</strong>
          </span>
          {paletteSummary.groups.slice(0, 5).map((group) => (
            <span key={group.group}>
              <small>{group.group}</small>
              <strong>{group.count}</strong>
            </span>
          ))}
        </div>
        <List
          className="command-palette-list"
          dataSource={displayedPaletteItems}
          locale={{
            emptyText: (
              <div className="palette-empty-state">
                <strong>{t('palette.empty.title')}</strong>
                <span>{t('palette.empty.description')}</span>
                <Space wrap>
                  <Button size="small" type="primary" onClick={() => runPaletteEmptyAction('local')}>{t('action.newTerminal')}</Button>
                  <Button size="small" onClick={() => runPaletteEmptyAction('ssh')}>{t('action.quickSsh')}</Button>
                  <Button size="small" onClick={() => runPaletteEmptyAction('connections')}>{t('nav.connections')}</Button>
                </Space>
              </div>
            ),
          }}
          renderItem={(item, index) => (
            <List.Item
              className={[
                'command-palette-row',
                index === paletteActiveIndex ? 'active' : '',
                item.disabled ? 'disabled' : '',
              ].filter(Boolean).join(' ')}
              onClick={() => runPaletteAction(item)}
              onMouseEnter={() => setPaletteActiveIndex(index)}
            >
              <List.Item.Meta
                avatar={<span className="provider-icon">{item.icon}</span>}
                title={(
                  <span className="command-palette-title">
                    <strong>{item.title}</strong>
                    <small>{item.group}</small>
                  </span>
                )}
                description={(
                  <span className="command-palette-description">
                    <span>{item.description}</span>
                    {item.disabled && item.reasonKey && <small>{t(item.reasonKey)}</small>}
                  </span>
                )}
              />
            </List.Item>
          )}
        />
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
          <div>
            <Text strong>{providerLabel(selectedProvider)}</Text>
            <Text type="secondary">{selectedProvider.category === 'builtin' ? t('provider.category.builtin') : t('provider.category.extension')}</Text>
          </div>
        </div>
        <Form form={form} layout="vertical" className="terminal-form">
          <Form.Item label={t('field.type')}>
            <Select value={newType} onChange={setNewType} options={providerOptions} />
          </Form.Item>
          <Form.Item name="displayName" label={t('field.name')}>
            <Input placeholder={t('placeholder.sessionName')} />
          </Form.Item>
          <Form.Item name="group" label={t('field.group')}>
            <Input placeholder={t('placeholder.group')} />
          </Form.Item>
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
              <Form.Item name="rememberCredential" valuePropName="checked">
                <Checkbox>{t('field.rememberCredential')}</Checkbox>
              </Form.Item>
              <Alert type="info" showIcon message={t('settings.credentialHint')} />
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
        title={t('drawer.commands')}
        width={560}
        open={commandsOpen}
        destroyOnHidden
        onClose={() => setCommandsOpen(false)}
      >
        <div className="quick-command-summary">
          <span>
            <small>{t('metric.commands')}</small>
            <strong>{quickCommandSummary.total}</strong>
          </span>
          <span>
            <small>{t('metric.availableCommands')}</small>
            <strong>{quickCommandSummary.available}</strong>
          </span>
          <span>
            <small>{t('label.favorite')}</small>
            <strong>{quickCommandSummary.favorites}</strong>
          </span>
          <span>
            <small>{t('metric.multiLineCommands')}</small>
            <strong>{quickCommandSummary.multiLine}</strong>
          </span>
          <span className={quickCommandSummary.canRun ? 'active' : ''}>
            <small>{t('metric.targetSession')}</small>
            <strong>{quickCommandSummary.target || t('command.noTarget')}</strong>
          </span>
        </div>
        <Alert
          type={quickCommandSummary.canRun ? 'info' : 'warning'}
          showIcon
          message={t('command.drawerHint')}
          description={t('command.sensitiveHint')}
        />
        <div className="quick-command-panel">
          <Form form={commandForm} layout="vertical" className="quick-command-form">
            <Form.Item name="name" label={t('field.name')} rules={[{ required: true, message: t('validation.required') }]}>
              <Input />
            </Form.Item>
            <Form.Item name="providerType" label={t('field.providerScope')} initialValue={activeSession?.providerType || 'all'}>
              <Select options={quickCommandProviderOptions} />
            </Form.Item>
            <Form.Item name="command" label={t('field.command')} rules={[{ required: true, message: t('validation.required') }]}>
              <Input.TextArea rows={3} />
            </Form.Item>
            <Space>
              <Button type="primary" onClick={addQuickCommand}>
                {editingQuickCommandId ? t('action.save') : t('action.addCommand')}
              </Button>
              {editingQuickCommandId && (
                <Button onClick={cancelQuickCommandEdit}>{t('action.cancel')}</Button>
              )}
            </Space>
          </Form>
        </div>
        <Input.Search
          allowClear
          className="quick-command-search"
          value={commandQuery}
          onChange={(event) => setCommandQuery(event.target.value)}
          placeholder={t('placeholder.searchCommands')}
        />
        <Segmented
          block
          className="quick-command-scope"
          value={commandScope}
          onChange={setCommandScope}
          options={[
            { value: 'current', label: t('command.scope.current') },
            { value: 'all', label: t('command.scope.all') },
            { value: 'favorites', label: t('command.scope.favorites') },
          ]}
        />
        <List
          className="quick-command-list"
          dataSource={visibleQuickCommands}
          locale={{
            emptyText: (
              <Empty
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                description={quickCommands.length === 0 ? t('empty.noQuickCommands') : t('empty.noCommands')}
              />
            ),
          }}
          renderItem={(item) => {
            const safety = buildQuickCommandSafetyState(item);
            return (
              <List.Item
                className="quick-command-row"
                actions={[
                  <Button
                    key="favorite"
                    size="small"
                    icon={item.favorite ? <StarFilled /> : <StarOutlined />}
                    onClick={() => toggleQuickCommandFavorite(item.id)}
                  />,
                  <Tooltip key="run" title={safety.warningKey ? t(safety.warningKey) : ''}>
                    <Button
                      size="small"
                      type="primary"
                      disabled={!quickCommandSummary.canRun || !safety.canRun}
                      onClick={() => runQuickCommand(item.command)}
                    >
                      {t('action.run')}
                    </Button>
                  </Tooltip>,
                  <Button key="edit" size="small" disabled={!safety.canEdit} onClick={() => editQuickCommand(item)}>{t('action.edit')}</Button>,
                  <Button
                    key="copy"
                    size="small"
                    disabled={!safety.canCopy}
                    onClick={async () => {
                      await writeClipboardText(item.command);
                      messageApi.success(t('message.copied'));
                    }}
                  >
                    {t('action.copy')}
                  </Button>,
                  <Button key="delete" size="small" danger onClick={() => deleteQuickCommand(item.id)}>{t('action.delete')}</Button>,
                ]}
              >
                <List.Item.Meta
                  title={(
                    <span className="quick-command-title">
                      <span>{item.name}</span>
                      <Tag>{quickCommandProviderLabel(item.providerType, providers)}</Tag>
                      {safety.sensitive && <Tag color="warning">{t('command.sensitiveTag')}</Tag>}
                    </span>
                  )}
                  description={<pre className="quick-command-code">{safety.sensitive ? t(safety.displayCommand) : safety.displayCommand}</pre>}
                />
              </List.Item>
            );
          }}
        />
      </Drawer>
      <Drawer
        title={t('drawer.commandHistory')}
        width={620}
        open={historyOpen}
        destroyOnHidden
        onClose={() => setHistoryOpen(false)}
      >
        <div className="command-history-tools">
          <Segmented
            value={historyScope}
            onChange={setHistoryScope}
            options={[
              { value: 'provider', label: t('history.scope.provider') },
              { value: 'session', label: t('history.scope.session'), disabled: !activeKey },
              { value: 'all', label: t('history.scope.all') },
            ]}
          />
          <Input.Search
            allowClear
            value={historyQuery}
            onChange={(event) => setHistoryQuery(event.target.value)}
            placeholder={t('placeholder.searchHistory')}
          />
          <Button
            danger
            disabled={visibleCommandHistory.length === 0}
            onClick={clearVisibleCommandHistory}
          >
            {t('action.clear')}
          </Button>
        </div>
        <Alert type="info" showIcon message={t('history.drawerHint')} />
        <List
          className="command-history-list"
          dataSource={visibleCommandHistory}
          locale={{
            emptyText: (
              <Empty
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                description={commandHistory.length === 0 ? t('empty.noCommandHistory') : t('empty.noCommands')}
              />
            ),
          }}
          renderItem={(item) => (
            <List.Item
              className="command-history-row"
              actions={[
                <Button
                  key="favorite"
                  size="small"
                  icon={item.favorite ? <StarFilled /> : <StarOutlined />}
                  onClick={() => toggleCommandHistoryFavorite(item)}
                />,
                <Button
                  key="run"
                  size="small"
                  type="primary"
                  disabled={!activeKey}
                  onClick={() => runHistoryCommand(item)}
                >
                  {t('action.run')}
                </Button>,
                <Button
                  key="saveQuickCommand"
                  size="small"
                  onClick={() => saveHistoryAsQuickCommand(item)}
                >
                  {t('action.saveQuickCommand')}
                </Button>,
                <Button
                  key="copy"
                  size="small"
                  onClick={async () => {
                    await writeClipboardText(item.command);
                    messageApi.success(t('message.copied'));
                  }}
                >
                  {t('action.copy')}
                </Button>,
              ]}
            >
              <List.Item.Meta
                avatar={<span className="provider-icon">{providerIcons[item.providerType] || <CodeOutlined />}</span>}
                title={<pre className="command-history-code">{item.command}</pre>}
                description={(
                  <span className="command-history-meta">
                    <span>{item.sessionLabel || item.providerType}</span>
                    <span>{item.providerType}</span>
                    {item.updatedAt && <span>{formatProfileLastUsed(item.updatedAt)}</span>}
                  </span>
                )}
              />
            </List.Item>
          )}
        />
      </Drawer>
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
        title={t('drawer.installExtension')}
        width={420}
        open={extensionInstallOpen}
        destroyOnHidden
        onClose={() => setExtensionInstallOpen(false)}
        extra={<Button type="primary" onClick={installOfflineExtension}>{t('action.installOffline')}</Button>}
      >
        <Alert type="info" showIcon message={t('settings.extensionPackageHint')} />
        <Form layout="vertical" className="terminal-form">
          <Form.Item label={t('field.packagePath')} required>
            <Input
              value={extensionPackagePath}
              onChange={(event) => setExtensionPackagePath(event.target.value)}
              placeholder={t('placeholder.packagePath')}
            />
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
        extra={<Button type="primary" onClick={importSshConfigProfiles}>{t('action.importSshConfig')}</Button>}
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
  openConnections,
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
          <Button type="primary" icon={<LaptopOutlined />} onClick={() => openDrawer('local')}>
            {t('provider.local.name')}
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
                {suggestedProfiles.map((profile) => (
                  <button key={profile.id} type="button" onClick={() => openProfile(profile)}>
                    <span className="provider-icon">{providerIcons[profile.providerType] || <CodeOutlined />}</span>
                    <span>
                      <strong>{profile.displayName}</strong>
                      <small>{buildConnectionProfileSubtitle(profile)}</small>
                    </span>
                  </button>
                ))}
              </div>
            </section>
          )}
          {recentConnections.length > 0 && (
            <section>
              <Text strong>{t('section.recentConnections')}</Text>
              <div className="session-empty-profile-list compact">
                {recentConnections.slice(0, 3).map((connection) => (
                  <button key={connection.id} type="button" onClick={() => openRecentConnection(connection)}>
                    <span className="provider-icon">{providerIcons[connection.providerType] || <CodeOutlined />}</span>
                    <span>
                      <strong>{connection.displayName}</strong>
                      <small>{connection.description}</small>
                    </span>
                  </button>
                ))}
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

function ConnectionProfilePreview({
  confirmDeleteProfile,
  duplicateProfile,
  focusProfileSession,
  openProfile,
  openProfileEditor,
  profile,
  profileSessionSummary,
  providers,
  toggleProfileFavorite,
}) {
  const sessionInfo = profileSessionSummary.get(profile.id) || { activeCount: 0, focusSessionId: '' };
  const providerAvailable = isProfileProviderAvailable(profile, providers);
  const badges = buildConnectionProfileBadges(profile, sessionInfo, { providerAvailable });
  const facts = buildConnectionProfileFacts(profile);
  const hints = buildConnectionProfileHints(sessionInfo);
  const primaryAction = buildConnectionProfilePrimaryAction({ providerAvailable, sessionInfo });
  const statusSummary = buildConnectionProfileStatusSummary({ providerAvailable, sessionInfo });
  return (
    <div className="connection-profile-preview">
      <div className="connection-profile-hero">
        <span className="provider-icon large">{providerIcons[profile.providerType] || <CodeOutlined />}</span>
        <div>
          <Text type="secondary">{providerTypeLabel(profile.providerType, providers)}</Text>
          <Title level={4}>{profile.displayName}</Title>
          <Text className="connection-profile-endpoint">{buildConnectionProfileSubtitle(profile)}</Text>
        </div>
      </div>
      <div className="connection-profile-actions">
        <Button
          size="small"
          type="primary"
          disabled={primaryAction.disabled}
          onClick={() => {
            if (primaryAction.action === 'focus') {
              focusProfileSession(profile);
              return;
            }
            openProfile(profile);
          }}
        >
          {t(primaryAction.labelKey)}
        </Button>
        <Button size="small" icon={<EditOutlined />} onClick={() => openProfileEditor(profile)}>{t('action.edit')}</Button>
      </div>
      <Alert
        showIcon
        type={statusSummary.tone}
        message={t(statusSummary.titleKey, statusSummary.values)}
        description={t(statusSummary.descriptionKey, statusSummary.values)}
      />
      <div className="connection-profile-tags">
        {badges.map((badge) => (
          <span key={badge.key} className={`connection-profile-badge tone-${badge.tone}`}>
            {connectionProfileBadgeLabel(badge)}
          </span>
        ))}
      </div>
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

function SessionTabLabel({ active = false, session }) {
  const display = sessionTabDisplay(session, active);
  return (
    <span className={`tab-label session-tab-label tone-${display.statusTone}${display.active ? ' active' : ''}`}>
      <span className="session-status-dot" />
      {providerIcons[display.iconType] || <CodeOutlined />}
      <span className="session-tab-title">{display.title}</span>
    </span>
  );
}

function sessionTabActionIcon(action) {
  if (action === 'rename') return <EditOutlined />;
  if (action === 'reconnect') return <ReloadOutlined />;
  if (action === 'duplicate') return <CopyOutlined />;
  return <DeleteOutlined />;
}

function SessionSidebarLabel({ session }) {
  const tone = sessionStatusTone(session);
  return (
    <span className={`session-sidebar-label tone-${tone}`}>
      <span className="session-status-dot" />
      <span className="session-sidebar-main">
        <span>{session.label}</span>
        <small>{t(`session.status.${sessionStatusLabel(session)}`)}</small>
      </span>
    </span>
  );
}

function SessionToolbarActions({ model, onAction }) {
  const icons = {
    grid: <AppstoreOutlined />,
    interrupt: <StopOutlined />,
    reconnect: <ReloadOutlined />,
    tabs: <CodeOutlined />,
  };
  const overflowItems = model.overflow.flatMap((action, index) => [
    ...(index === 2 ? [{ key: 'danger-divider', type: 'divider' }] : []),
    {
      key: action.key,
      danger: action.danger,
      disabled: action.disabled,
      icon: action.key === 'rename' ? <EditOutlined /> : <DeleteOutlined />,
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
  onCopyError,
  onInterrupt,
  onOpenAudit,
  onReconnect,
  status,
}) {
  const facts = buildTerminalStatusFacts(status || {});
  const controlActions = buildTerminalControlActions(status || {});
  const errorDetail = buildTerminalErrorDetail(status || {});
  const recoveryActions = buildTerminalRecoveryActions(status || {});
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
        {(recordingFact || auditSummary || controlActions.length > 0 || errorDetail || recoveryActions.length > 0) && (
          <div className="terminal-recovery-actions">
            {recordingFact && (
              <Tooltip title={`${sessionContextFactLabel(recordingFact)}: ${sessionContextFactValue(recordingFact)}`}>
                <span
                  aria-label={`${sessionContextFactLabel(recordingFact)}: ${sessionContextFactValue(recordingFact)}`}
                  className={`session-recording-indicator tone-${recordingFact.tone}`}
                  role="status"
                >
                  <VideoCameraOutlined />
                  <span className="session-capture-indicator-label">{sessionRecordingIndicatorLabel(recordingFact)}</span>
                </span>
              </Tooltip>
            )}
            {auditSummary && (
              <Tooltip title={t(auditSummary.descriptionKey, auditSummary.values)}>
                <span
                  aria-label={t(auditSummary.titleKey, auditSummary.values)}
                  className={`session-audit-indicator tone-${auditSummary.tone}`}
                  role="status"
                >
                  <AuditOutlined />
                  <span className="session-capture-indicator-label">{sessionAuditIndicatorLabel(auditSummary)}</span>
                </span>
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
    return profiles.map(normalizeImportedProfile).filter(Boolean);
  } catch {
    return [];
  }
}

function persistProfiles(profiles) {
  localStorage.setItem(profileStorageKey, JSON.stringify({
    version: profileSchemaVersion,
    profiles: profiles.map((profile) => sanitizeProfile(profile)),
  }));
}

function sanitizeProfile(profile) {
  return {
    id: profile.id || (crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`),
    providerType: profile.providerType,
    displayName: profile.displayName,
    group: profile.group || '',
    config: { ...(profile.config || {}) },
    favorite: !!profile.favorite,
    lastUsedAt: profile.lastUsedAt || '',
    auth: {
      username: profile.auth?.username || '',
      authType: profile.auth?.authType || 'password',
      jumpUsername: profile.auth?.jumpUsername || '',
      credentialRef: profile.auth?.credentialRef || null,
    },
  };
}

function normalizeImportedProfile(profile) {
  if (!profile || !profile.providerType || !profile.displayName) return null;
  return sanitizeProfile({
    ...profile,
    id: profile.id || (crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`),
    config: profile.config || {},
    auth: profile.auth || {},
  });
}

function mergeProfiles(currentProfiles, importedProfiles) {
  const existingIds = new Set(currentProfiles.map((profile) => profile.id));
  const nextProfiles = [...currentProfiles];
  importedProfiles.forEach((profile) => {
    const nextProfile = existingIds.has(profile.id)
      ? { ...profile, id: crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}` }
      : profile;
    existingIds.add(nextProfile.id);
    nextProfiles.push(nextProfile);
  });
  return nextProfiles;
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

function loadCommandHistory() {
  try {
    const parsed = JSON.parse(localStorage.getItem(commandHistoryStorageKey) || '[]');
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((item) => item?.command && item?.providerType)
      .map(normalizeCommandHistoryItem)
      .slice(0, 80);
  } catch {
    return [];
  }
}

function persistCommandHistory(history) {
  localStorage.setItem(commandHistoryStorageKey, JSON.stringify(history.slice(0, 80)));
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
      localStorage.setItem(auditRecordStorageKey, serialized);
    }
    return nextRecords;
  } catch {
    return [];
  }
}

function persistAuditRecords(records) {
  const nextRecords = records.filter(Boolean).map(sanitizeAuditRecord).slice(0, 100);
  localStorage.setItem(auditRecordStorageKey, JSON.stringify(nextRecords));
  return nextRecords;
}

function rememberConnection(request, setRecentConnections) {
  const safeRequest = sanitizeRequest(request);
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
  return `local:${request.config?.shell || 'default'}`;
}

function profileFromRequest(request) {
  return {
    id: request.id || recentConnectionKey(request),
    providerType: request.providerType,
    displayName: request.displayName,
    group: request.group || '',
    config: request.config || {},
    auth: request.auth || {},
  };
}

function profileToRequest(profile) {
  return {
    profileId: profile.id,
    providerType: profile.providerType,
    displayName: profile.displayName,
    group: profile.group || '',
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

  const providerItems = actions.providers.map((provider) => ({
    id: `provider:${provider.type}`,
    group: t('palette.group.providers'),
    title: providerLabel(provider),
    description: provider.type,
    icon: providerIcons[provider.type] || <CodeOutlined />,
    keywords: `${provider.type} ${providerLabel(provider)}`,
    run: () => actions.openDrawer(provider.type),
  }));

  const profileItems = buildProfilePaletteItems({
    groupLabel: t('palette.group.connections'),
    iconForProfile: (profile) => providerIcons[profile.providerType] || <CodeOutlined />,
    profiles: actions.profiles,
    providers: actions.providers,
    runProfile: actions.openProfile,
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
    title: session.label,
    description: `${sessionStatusLabel(session.status)} · ${profileDescription(profileFromRequest(session.request))}`,
    icon: providerIcons[session.providerType] || <CodeOutlined />,
    keywords: `${session.label} ${session.providerType} ${session.status} ${index + 1}`,
    run: () => {
      actions.setActiveKey(session.id);
      actions.setSelectedNav('sessions');
    },
  }));

  const sessionActionItems = buildSessionActionPaletteItems({
    activeSessionId: actions.activeSessionId,
    canNavigate: actions.canNavigateSessions,
    closedSessionCount: actions.closedSessionCount,
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
      exportTranscript: t('action.exportTranscript'),
      nextSession: t('action.nextSession'),
      previousSession: t('action.previousSession'),
      quickCommands: t('action.commands'),
      reconnect: t('action.reconnect'),
      restoreClosed: t('action.restoreClosedSession'),
      renameSession: t('action.renameSession'),
      saveAudit: t('action.saveAuditRecord'),
    },
    runAction: actions.runSessionAction,
    sessionCount: actions.sessionCount,
  });

  const quickCommandItems = filterQuickCommands(actions.quickCommands, '', {
    providerType: actions.quickCommandProviderType || 'all',
  }).map((command) => ({
    id: `command:${command.id}`,
    group: t('palette.group.commands'),
    title: command.name,
    description: command.command,
    icon: <CodeOutlined />,
    keywords: `${command.name} ${command.command}`,
    run: () => actions.runQuickCommand(command.command),
  }));

  const workspaceItems = [
    {
      id: 'workspace:save',
      group: t('palette.group.workspace'),
      title: t('action.saveWorkspace'),
      description: t('settings.autoSaveHint'),
      icon: <SaveOutlined />,
      keywords: 'save workspace snapshot',
      run: actions.saveWorkspace,
    },
    {
      id: 'workspace:restore',
      group: t('palette.group.workspace'),
      title: t('action.restoreWorkspace'),
      description: t('settings.workspaceSnapshot'),
      icon: <ReloadOutlined />,
      keywords: 'restore workspace snapshot',
      run: actions.restoreWorkspace,
    },
    {
      id: 'settings:language',
      group: t('palette.group.settings'),
      title: t('action.language'),
      description: t('settings.languageHint'),
      icon: <GlobalOutlined />,
      keywords: 'language locale settings',
      run: () => actions.setSettingsOpen(true),
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
      run: () => actions.setCommandsOpen(true),
    },
  ];

  return [...navigation, ...connectionActionItems, ...sessionActionItems, ...sessionItems, ...providerItems, ...profileItems, ...quickCommandItems, ...workspaceItems];
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

function formatAuditTimestamp(value = '', locale = currentLocale()) {
  const timestamp = Date.parse(value);
  if (!timestamp) return value || '-';
  return new Date(timestamp).toLocaleString(locale, {
    dateStyle: 'medium',
    timeStyle: 'medium',
  });
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
  if (badge.key === 'providerUnavailable') return t('label.providerUnavailable');
  return String(badge.value || badge.key);
}

function connectionProfileFactLabel(key) {
  if (key === 'host') return t('field.host');
  if (key === 'port') return t('field.port');
  if (key === 'username') return t('field.username');
  if (key === 'shell') return t('field.shell');
  if (key === 'workingDirectory') return t('field.workingDirectory');
  if (key === 'lastUsed') return t('label.lastUsed');
  if (key === 'jumpHost') return t('field.jumpHost');
  return key;
}

function connectionProfileFactValue(fact) {
  if (fact.key === 'lastUsed') return fact.value ? formatProfileLastUsed(fact.value) : '-';
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

function terminalStatusFactLabel(fact) {
  if (fact.key === 'status') return t('terminal.fact.status');
  if (fact.key === 'lastCommand') return t('terminal.fact.lastCommand');
  if (fact.key === 'duration') return t('label.duration');
  if (fact.key === 'exitCode') return t('terminal.fact.exitCode');
  if (fact.key === 'size') return t('terminal.fact.size');
  if (fact.key === 'error') return t('terminal.fact.error');
  return fact.key;
}

function terminalStatusFactValue(fact) {
  if (fact.key === 'status') return t(`terminal.runStatus.${fact.value}`);
  return fact.value || '-';
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
  return groupLabel(item?.key || ungroupedKey);
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
  if (request.providerType !== 'ssh' || !request.auth?.credentialRef) return request;
  return CredentialsAPI.ResolveSSHRequest(request);
}

function saveProfile(profiles, request, editingProfileId = '', profileId = '') {
  const existingProfile = profiles.find((item) => item.id === editingProfileId);
  const profile = {
    id: editingProfileId || profileId || (crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}`),
    providerType: request.providerType,
    displayName: request.displayName,
    group: request.group || '',
    config: request.config,
    favorite: !!existingProfile?.favorite,
    lastUsedAt: existingProfile?.lastUsedAt || '',
    auth: {
      username: request.auth?.username || '',
      authType: request.auth?.authType || 'password',
      jumpUsername: request.auth?.jumpUsername || '',
      credentialRef: request.auth?.credentialRef || null,
    },
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
  return profile.config?.shell || 'default shell';
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
  return {
    ...defaultSettings,
    ...settings,
    confirmDangerousActions: settings.confirmDangerousActions !== false,
    interfaceDensity,
    defaultProviderType: String(settings.defaultProviderType || defaultSettings.defaultProviderType).trim() || defaultSettings.defaultProviderType,
    defaultWorkingDirectory: String(settings.defaultWorkingDirectory || '').trim(),
    disabledExtensionIds: Array.isArray(settings.disabledExtensionIds)
      ? [...new Set(settings.disabledExtensionIds.map((item) => String(item)).filter(Boolean))]
      : [],
    logLevel: normalizeLogLevel(settings.logLevel),
    shortcutModifier: normalizeShortcutModifier(settings.shortcutModifier),
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
  return tagName === 'input' || tagName === 'textarea' || target?.isContentEditable;
}

function resolveAppTheme(theme) {
  if (theme === 'dark' || theme === 'light') return theme;
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function buildWorkspaceSnapshot(sessions, activeKey, sessionView) {
  return {
    version: 1,
    updatedAt: new Date().toISOString(),
    activeKey,
    sessionView,
    sessions: sessions.map((session) => ({
      id: session.id,
      label: session.label,
      providerType: session.providerType,
      request: sanitizeRequest(session.request),
    })),
  };
}

function sanitizeRequest(request) {
  return {
    ...request,
    config: { ...(request?.config || {}) },
    auth: {
      username: request?.auth?.username || '',
      authType: request?.auth?.authType || 'password',
      jumpUsername: request?.auth?.jumpUsername || '',
      credentialRef: request?.auth?.credentialRef || null,
    },
  };
}

function canRestoreSession(request) {
  return request?.providerType === 'local';
}

function persistWorkspaceSnapshot(snapshot) {
  localStorage.setItem(workspaceStorageKey, JSON.stringify(snapshot));
}

function loadWorkspaceSnapshot() {
  try {
    const raw = localStorage.getItem(workspaceStorageKey);
    const parsed = JSON.parse(raw || 'null');
    if (!parsed || !Array.isArray(parsed.sessions)) return null;
    return parsed;
  } catch {
    return null;
  }
}

function loadWorkspaceSummary() {
  const snapshot = loadWorkspaceSnapshot();
  if (!snapshot) return null;
  return {
    count: snapshot.sessions.length,
    updatedAt: new Date(snapshot.updatedAt).toLocaleString(),
  };
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

function buildRequest(type, displayName, values) {
  if (type === 'ssh') {
    const credentialRef = parseCredentialRef(values.credentialRef);
    return {
      providerType: type,
      displayName,
      group: values.group || '',
      config: {
        host: values.host,
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

  return {
    providerType: type,
    displayName,
    group: values.group || '',
    config: {
      shell: values.shell || '',
      workingDirectory: values.workingDirectory || '',
    },
    auth: {},
  };
}

export default App;
