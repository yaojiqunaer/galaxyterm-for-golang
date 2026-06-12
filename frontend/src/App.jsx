import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Badge,
  Button,
  Card,
  Checkbox,
  ConfigProvider,
  Divider,
  Drawer,
  Empty,
  Form,
  Input,
  InputNumber,
  Layout,
  List,
  Menu,
  Modal,
  Segmented,
  Select,
  Space,
  Switch,
  Tabs,
  Tag,
  Tooltip,
  Typography,
  message,
  theme as antdTheme,
} from 'antd';
import {
  ApiOutlined,
  AppstoreAddOutlined,
  CloudServerOutlined,
  CodeOutlined,
  DatabaseOutlined,
  DeleteOutlined,
  EditOutlined,
  FolderOpenOutlined,
  FullscreenExitOutlined,
  FullscreenOutlined,
  GlobalOutlined,
  LaptopOutlined,
  PlusOutlined,
  ReloadOutlined,
  SaveOutlined,
  SettingOutlined,
  ThunderboltOutlined,
} from '@ant-design/icons';
import TerminalPane from './components/TerminalPane.jsx';
import * as ExtensionsAPI from '../wailsjs/go/extensions/API.js';
import * as FilesAPI from '../wailsjs/go/files/API.js';
import * as ThemeAPI from '../wailsjs/go/internal/Theme.js';
import * as SessionAPI from '../wailsjs/go/session/API.js';
import * as TunnelAPI from '../wailsjs/go/tunnel/API.js';
import { availableLocales, currentLocale, setLocale, t } from './i18n.js';

const { Sider, Content } = Layout;
const { Text, Title } = Typography;

const profileStorageKey = 'galaxyterm.connectionProfiles';
const settingsStorageKey = 'galaxyterm.settings';
const workspaceStorageKey = 'galaxyterm.workspaceSnapshot';
const commandStorageKey = 'galaxyterm.quickCommands';
const recentConnectionStorageKey = 'galaxyterm.recentConnections';
const profileSchemaVersion = 1;

const defaultSettings = {
  appTheme: 'dark',
  terminalTheme: 'auto',
  fontFamily: 'Consolas,Liberation Mono,Menlo,Courier,monospace',
  fontSize: 13,
  scrollback: 5000,
  autoSaveWorkspace: true,
  autoRestoreWorkspace: false,
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
];

const providerIcons = {
  local: <LaptopOutlined />,
  ssh: <CloudServerOutlined />,
  sftp: <FolderOpenOutlined />,
  mysql: <DatabaseOutlined />,
  redis: <DatabaseOutlined />,
  kubernetes: <ApiOutlined />,
  docker: <AppstoreAddOutlined />,
};

function providerLabel(provider) {
  return t(provider.nameKey, provider.name || provider.type);
}

function App() {
  const [providers, setProviders] = useState(fallbackProviders);
  const [sessions, setSessions] = useState([]);
  const [profiles, setProfiles] = useState(() => loadProfiles());
  const [settings, setSettings] = useState(() => loadSettings());
  const [terminalThemes, setTerminalThemes] = useState(['auto']);
  const [installedExtensions, setInstalledExtensions] = useState([]);
  const [tunnels, setTunnels] = useState([]);
  const [activeKey, setActiveKey] = useState('');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [commandsOpen, setCommandsOpen] = useState(false);
  const [extensionInstallOpen, setExtensionInstallOpen] = useState(false);
  const [extensionPackagePath, setExtensionPackagePath] = useState('');
  const [renameOpen, setRenameOpen] = useState(false);
  const [renamingSessionId, setRenamingSessionId] = useState('');
  const [renamingSessionName, setRenamingSessionName] = useState('');
  const [terminalSearch, setTerminalSearch] = useState('');
  const [focusMode, setFocusMode] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [paletteQuery, setPaletteQuery] = useState('');
  const [selectedNav, setSelectedNav] = useState('connections');
  const [sessionView, setSessionView] = useState('tabs');
  const [profileQuery, setProfileQuery] = useState('');
  const [groupQuery, setGroupQuery] = useState('all');
  const [workspaceSummary, setWorkspaceSummary] = useState(() => loadWorkspaceSummary());
  const [quickCommands, setQuickCommands] = useState(() => loadQuickCommands());
  const [recentConnections, setRecentConnections] = useState(() => loadRecentConnections());
  const [editingProfileId, setEditingProfileId] = useState('');
  const [newType, setNewType] = useState('local');
  const [fileEntries, setFileEntries] = useState([]);
  const [fileLoading, setFileLoading] = useState(false);
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
  const terminalRefs = useRef({});
  const profileImportRef = useRef(null);

  useEffect(() => {
    Promise.resolve()
      .then(() => SessionAPI.ListProviders())
      .then((loadedProviders) => {
        if (Array.isArray(loadedProviders) && loadedProviders.length > 0) {
          setProviders(loadedProviders);
          setNewType(loadedProviders[0].type);
        }
      })
      .catch(() => {
        setProviders(fallbackProviders);
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
    persistSettings(settings);
    document.documentElement.dataset.appTheme = resolveAppTheme(settings.appTheme);
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
    const handleKeydown = (event) => {
      const commandKey = event.metaKey || event.ctrlKey;
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
      if (key === 'f' && event.shiftKey && sessions.length > 0) {
        event.preventDefault();
        setFocusMode((current) => !current);
      }
      if (key === 'r' && activeKey) {
        event.preventDefault();
        reconnectSession();
      }
    };
    window.addEventListener('keydown', handleKeydown);
    return () => window.removeEventListener('keydown', handleKeydown);
  }, [activeKey, sessions.length]);

  useEffect(() => {
    if (activeKey && terminalRefs.current[activeKey]?.fit) {
      setTimeout(() => terminalRefs.current[activeKey]?.fit(), 0);
    }
  }, [activeKey, focusMode]);

  const providerOptions = useMemo(() => providers.map((provider) => ({
    value: provider.type,
    label: (
      <span className="provider-option">
        {providerIcons[provider.type] || <CodeOutlined />}
        {providerLabel(provider)}
      </span>
    ),
  })), [providers]);

  const selectedProvider = providers.find((item) => item.type === newType) || providers[0] || fallbackProviders[0];
  const profileGroups = useMemo(() => uniqueProfileGroups(profiles), [profiles]);
  const visibleProfiles = useMemo(
    () => filteredProfiles(profiles, profileQuery, groupQuery),
    [profiles, profileQuery, groupQuery],
  );

  const openDrawer = (type = providers[0]?.type || 'local', profile = null) => {
    const providerType = profile?.providerType || type;
    setNewType(providerType);
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
      shell: profile?.config?.shell || '',
      saveProfile: false,
    });
    setEditingProfileId(profile?.id || '');
    setSshAuthType(profile?.auth?.authType || 'password');
    setDrawerOpen(true);
  };

  const createSession = async () => {
    const values = await form.validateFields();
    const provider = providers.find((item) => item.type === newType) || fallbackProviders[0];
    const id = crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}`;
    const label = values.displayName || providerLabel(provider);
    const request = buildRequest(newType, label, values);

    if (values.saveProfile) {
      const nextProfiles = saveProfile(profiles, request, editingProfileId);
      setProfiles(nextProfiles);
      message.success(t('message.profileSaved'));
    }
    rememberConnection(request, setRecentConnections);

    setSessions((current) => [...current, { id, label, providerType: newType, request, status: 'connecting', revision: 0 }]);
    setActiveKey(id);
    setSelectedNav('sessions');
    setDrawerOpen(false);
    message.success(t('terminal.status.connecting'));
  };

  const duplicateProfile = (profile) => {
    const copy = {
      ...profile,
      id: crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}`,
      displayName: `${profile.displayName} Copy`,
    };
    const nextProfiles = [...profiles, copy];
    persistProfiles(nextProfiles);
    setProfiles(nextProfiles);
    message.success(t('message.profileSaved'));
  };

  const duplicateSession = (session) => {
    const id = crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}`;
    setSessions((current) => [...current, {
      ...session,
      id,
      backendSessionId: '',
      label: `${session.label} Copy`,
      status: 'connecting',
      revision: 0,
    }]);
    setActiveKey(id);
    setSelectedNav('sessions');
  };

  const removeSession = (targetKey) => {
    setSessions((current) => {
      const next = current.filter((item) => item.id !== targetKey);
      if (activeKey === targetKey) {
        setActiveKey(next[0]?.id || '');
      }
      return next;
    });
  };

  const closeAllSessions = () => {
    setSessions([]);
    setActiveKey('');
    setFocusMode(false);
    terminalRefs.current = {};
  };

  const openRenameSession = (session = sessions.find((item) => item.id === activeKey)) => {
    if (!session) {
      message.warning(t('message.noActiveSession'));
      return;
    }
    setRenamingSessionId(session.id);
    setRenamingSessionName(session.label);
    setRenameOpen(true);
  };

  const renameSession = () => {
    const name = renamingSessionName.trim();
    if (!name) {
      message.warning(t('validation.required'));
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
    message.success(t('message.sessionRenamed'));
  };

  const reconnectSession = (sessionId = activeKey) => {
    if (!sessionId) {
      message.warning(t('message.noActiveSession'));
      return;
    }
    setSessions((current) => current.map((session) => (
      session.id === sessionId
        ? { ...session, backendSessionId: '', status: 'connecting', revision: (session.revision || 0) + 1 }
        : session
    )));
    setActiveKey(sessionId);
    setSelectedNav('sessions');
    message.success(t('terminal.status.connecting'));
  };

  const findInTerminal = (direction = 'next') => {
    const keyword = terminalSearch.trim();
    if (!keyword) {
      terminalRefs.current[activeKey]?.clearSearch?.();
      return;
    }
    const activeTerminal = terminalRefs.current[activeKey];
    if (!activeTerminal) {
      message.warning(t('message.noActiveSession'));
      return;
    }
    if (direction === 'previous') {
      activeTerminal.findPrevious?.(keyword);
      return;
    }
    activeTerminal.findNext?.(keyword);
  };

  const updateSessionStatus = (sessionId, status) => {
    setSessions((current) => current.map((item) => (
      item.backendSessionId === sessionId || item.id === sessionId ? { ...item, status } : item
    )));
  };

  const saveWorkspace = () => {
    const snapshot = buildWorkspaceSnapshot(sessions, activeKey, sessionView);
    persistWorkspaceSnapshot(snapshot);
    setWorkspaceSummary(loadWorkspaceSummary());
    message.success(t('message.workspaceSaved'));
  };

  const restoreWorkspace = ({ silent = false } = {}) => {
    const snapshot = loadWorkspaceSnapshot();
    if (!snapshot || snapshot.sessions.length === 0) {
      if (!silent) message.info(t('message.noWorkspaceSnapshot'));
      return;
    }
    const restorableSessions = snapshot.sessions.filter((session) => canRestoreSession(session.request));
    const skipped = snapshot.sessions.length - restorableSessions.length;
    if (restorableSessions.length === 0) {
      if (!silent) message.warning(t('message.workspaceRestoreSkipped'));
      return;
    }
    let restoredActiveKey = '';
    const restoredSessions = restorableSessions.map((session) => {
      const nextId = crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`;
      if (session.id === snapshot.activeKey) restoredActiveKey = nextId;
      return {
        ...session,
        id: nextId,
        backendSessionId: '',
        status: 'connecting',
        revision: 0,
      };
    });
    setSessions((current) => [...current, ...restoredSessions]);
    setActiveKey(restoredActiveKey || restoredSessions[0].id);
    setSessionView(snapshot.sessionView || 'tabs');
    setSelectedNav('sessions');
    if (!silent) {
      message.success(skipped > 0 ? t('message.workspaceRestoredPartial') : t('message.workspaceRestored'));
    }
  };

  const clearWorkspaceSnapshot = () => {
    localStorage.removeItem(workspaceStorageKey);
    setWorkspaceSummary(loadWorkspaceSummary());
    message.success(t('message.workspaceCleared'));
  };

  const deleteProfile = (profileId) => {
    const nextProfiles = profiles.filter((profile) => profile.id !== profileId);
    persistProfiles(nextProfiles);
    setProfiles(nextProfiles);
    message.success(t('message.profileDeleted'));
  };

  const openProfile = (profile) => {
    rememberConnection(profileToRequest(profile), setRecentConnections);
    openDrawer(profile.providerType, profile);
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
      message.success(t('message.profileImported'));
    } catch (error) {
      message.error(`${t('message.profileImportFailed')}: ${error}`);
    }
  };

  const runQuickCommand = (command) => {
    const activeTerminal = terminalRefs.current[activeKey];
    if (!activeTerminal?.send) {
      message.warning(t('message.noActiveSession'));
      return;
    }
    activeTerminal.send(command.endsWith('\n') ? command : `${command}\n`);
    setCommandsOpen(false);
    setPaletteOpen(false);
  };

  const runPaletteAction = (item) => {
    item.run();
    setPaletteOpen(false);
    setPaletteQuery('');
  };

  const addQuickCommand = async () => {
    const values = await commandForm.validateFields();
    const nextCommands = [...quickCommands, {
      id: crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}`,
      name: values.name,
      command: values.command,
    }];
    persistQuickCommands(nextCommands);
    setQuickCommands(nextCommands);
    commandForm.resetFields();
    message.success(t('message.commandSaved'));
  };

  const deleteQuickCommand = (id) => {
    const nextCommands = quickCommands.filter((item) => item.id !== id);
    persistQuickCommands(nextCommands);
    setQuickCommands(nextCommands);
    message.success(t('message.commandDeleted'));
  };

  const items = sessions.map((session) => ({
    key: session.id,
    label: (
      <span className="tab-label">
        {providerIcons[session.providerType] || <CodeOutlined />}
        {session.label}
      </span>
    ),
    children: (
      <div className="terminal-workspace">
        <TerminalPane
          key={`${session.id}-${session.revision || 0}`}
          ref={(el) => {
            terminalRefs.current[session.id] = el;
          }}
          request={session.request}
          settings={settings}
          onSessionCreated={(backendSessionId) => {
            setSessions((current) => current.map((item) => (
              item.id === session.id ? { ...item, backendSessionId, status: 'connected' } : item
            )));
          }}
          onSessionClosed={(backendSessionId) => updateSessionStatus(backendSessionId, 'closed')}
        />
      </div>
    ),
    closable: true,
  }));

  const renderSessions = () => {
    if (sessions.length === 0) {
      return <WelcomePanel providers={providers} openDrawer={openDrawer} />;
    }
    if (sessionView === 'grid') {
      return (
        <div className="session-grid-page">
          <div className="session-grid-toolbar">
            <Text strong>{t('section.sessionGrid')}</Text>
            <Button size="small" onClick={() => setSessionView('tabs')}>{t('action.tabs')}</Button>
          </div>
          <div className="session-grid">
            {sessions.map((session) => (
              <div className="split-terminal" key={session.id}>
                <div className="split-terminal-header">
                  <span className="tab-label">{providerIcons[session.providerType] || <CodeOutlined />}{session.label}</span>
                  <Space>
                    <Button size="small" icon={<EditOutlined />} onClick={() => openRenameSession(session)} />
                    <Button size="small" icon={<ReloadOutlined />} onClick={() => reconnectSession(session.id)} />
                    <Button size="small" onClick={() => duplicateSession(session)}>{t('action.duplicate')}</Button>
                    <Button size="small" danger onClick={() => removeSession(session.id)}>{t('action.delete')}</Button>
                  </Space>
                </div>
                <TerminalPane
                  key={`${session.id}-${session.revision || 0}`}
                  ref={(el) => {
                    terminalRefs.current[session.id] = el;
                  }}
                  request={session.request}
                  settings={settings}
                  onSessionCreated={(backendSessionId) => {
                    setSessions((current) => current.map((item) => (
                      item.id === session.id ? { ...item, backendSessionId, status: 'connected' } : item
                    )));
                  }}
                  onSessionClosed={(backendSessionId) => updateSessionStatus(backendSessionId, 'closed')}
                />
              </div>
            ))}
          </div>
        </div>
      );
    }
    return (
      <Tabs
        className="terminal-tabs"
        type="editable-card"
        hideAdd
        activeKey={activeKey}
        onChange={setActiveKey}
        onEdit={(targetKey, action) => {
          if (action === 'add') openDrawer();
          if (action === 'remove') removeSession(targetKey);
        }}
        items={items}
      />
    );
  };

  const renderConnections = () => (
    <div className="workspace-page">
      <div className="page-header">
        <div>
          <Text type="secondary">{t('nav.connections')}</Text>
          <Title level={3}>{t('section.quickConnect')}</Title>
        </div>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => openDrawer()}>
          {t('action.newTerminal')}
        </Button>
      </div>

      <div className="provider-card-grid">
        {providers.map((provider) => (
          <ProviderCard key={provider.type} provider={provider} openDrawer={openDrawer} />
        ))}
      </div>

      <Divider />

      {recentConnections.length > 0 && (
        <>
          <div className="page-header compact">
            <Title level={4}>{t('section.recentConnections')}</Title>
          </div>
          <div className="recent-connection-list">
            {recentConnections.slice(0, 6).map((connection) => (
              <button
                key={connection.id}
                className="recent-connection-chip"
                onClick={() => openDrawer(connection.providerType, recentToProfile(connection))}
              >
                <span className="provider-icon">{providerIcons[connection.providerType] || <CodeOutlined />}</span>
                <span>
                  <strong>{connection.displayName}</strong>
                  <small>{connection.description}</small>
                </span>
              </button>
            ))}
          </div>
          <Divider />
        </>
      )}

      <div className="page-header compact">
        <Title level={4}>{t('section.savedConnections')}</Title>
        <Space>
          <Button size="small" onClick={() => profileImportRef.current?.click()}>{t('action.import')}</Button>
          <Button size="small" onClick={exportProfiles} disabled={profiles.length === 0}>{t('action.export')}</Button>
          <input
            ref={profileImportRef}
            type="file"
            accept="application/json,.json"
            className="hidden-file-input"
            onChange={importProfiles}
          />
        </Space>
      </div>
      <Space className="profile-filters" wrap>
        <Select
          value={groupQuery}
          className="profile-group-filter"
          onChange={setGroupQuery}
          options={[
            { value: 'all', label: t('group.all') },
            ...profileGroups.map((group) => ({ value: group, label: group })),
          ]}
        />
        <Input.Search
          className="profile-search"
          allowClear
          value={profileQuery}
          onChange={(event) => setProfileQuery(event.target.value)}
          placeholder={t('nav.connections')}
        />
      </Space>
      {visibleProfiles.length === 0 ? (
        <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={t('empty.noConnections')} />
      ) : (
        <List
          className="profile-list"
          dataSource={visibleProfiles}
          renderItem={(profile) => (
            <List.Item
              actions={[
                <Button key="open" size="small" onClick={() => openProfile(profile)}>{t('action.open')}</Button>,
                <Button key="edit" size="small" onClick={() => openDrawer(profile.providerType, profile)}>{t('action.edit')}</Button>,
                <Button key="duplicate" size="small" onClick={() => duplicateProfile(profile)}>{t('action.duplicate')}</Button>,
                <Button key="delete" size="small" danger onClick={() => deleteProfile(profile.id)}>{t('action.delete')}</Button>,
              ]}
            >
              <List.Item.Meta
                avatar={<span className="provider-icon">{providerIcons[profile.providerType] || <CodeOutlined />}</span>}
                title={(
                  <Space size={8}>
                    <span>{profile.displayName}</span>
                    {profile.group && <Tag>{profile.group}</Tag>}
                  </Space>
                )}
                description={profileDescription(profile)}
              />
            </List.Item>
          )}
        />
      )}
    </div>
  );

  const renderExtensions = () => (
    <div className="workspace-page">
      <div className="page-header">
        <div>
          <Text type="secondary">{t('nav.extensions')}</Text>
          <Title level={3}>{t('section.officialExtensions')}</Title>
        </div>
        <Space>
          <Button icon={<FolderOpenOutlined />} onClick={() => setExtensionInstallOpen(true)}>{t('action.installOffline')}</Button>
          <Button icon={<PlusOutlined />} onClick={registerDemoExtension}>{t('action.addSource')}</Button>
        </Space>
      </div>
      <Alert type="info" showIcon message={t('settings.coreOnly')} />
      {installedExtensions.length > 0 && (
        <>
          <Divider />
          <Title level={4}>{t('section.installedProviders')}</Title>
          <List
            dataSource={installedExtensions}
            renderItem={(extension) => (
              <List.Item
                actions={[
                  <Button key="uninstall" size="small" danger onClick={() => uninstallExtension(extension.id)}>{t('action.uninstall')}</Button>,
                ]}
              >
                <List.Item.Meta
                  title={(
                    <Space size={8}>
                      <span>{extension.name}</span>
                      <Tag color="green">{t('extension.status.installed')}</Tag>
                    </Space>
                  )}
                  description={(
                    <Space direction="vertical" size={4}>
                      <Text type="secondary">{`${extension.id} · ${extension.version}`}</Text>
                      <Space wrap>
                        {(extension.providers || []).map((provider) => (
                          <Tag key={provider.type}>{provider.type}</Tag>
                        ))}
                        {(extension.providers || []).flatMap((provider) => provider.capabilities || []).map((capability) => (
                          <Tag key={capability} color="blue">{capability}</Tag>
                        ))}
                      </Space>
                    </Space>
                  )}
                />
              </List.Item>
            )}
          />
        </>
      )}
      <div className="extension-grid">
        {providers.map((provider) => (
          <Card key={provider.type} size="small">
            <Space direction="vertical">
              <span className="provider-icon">{providerIcons[provider.type] || <CodeOutlined />}</span>
              <Text strong>{providerLabel(provider)}</Text>
              <Tag color="green">{t('extension.status.builtin')}</Tag>
            </Space>
          </Card>
        ))}
        {officialExtensions.map((extension) => (
          <Card key={extension.type} size="small">
            <Space direction="vertical">
              <span className="provider-icon">{providerIcons[extension.type] || <CodeOutlined />}</span>
              <Text strong>{t(extension.nameKey)}</Text>
              <Tag>{t('extension.status.planned')}</Tag>
            </Space>
          </Card>
        ))}
      </div>
    </div>
  );

  const registerDemoExtension = async () => {
    const manifest = {
      id: 'galaxyterm-extension-demo',
      name: 'Demo Extension',
      version: '0.1.0',
      apiVersion: 'v1',
      description: 'Local extension manifest preview',
      providers: [{ type: 'demo', nameKey: 'extension.demo', category: 'extension', capabilities: ['stream'] }],
      locales: ['zh-CN', 'en-US'],
    };
    await ExtensionsAPI.RegisterInstalled(manifest);
    const items = await ExtensionsAPI.ListInstalled();
    setInstalledExtensions(Array.isArray(items) ? items : []);
    message.success(t('message.extensionComing'));
  };

  const installOfflineExtension = async () => {
    const packagePath = extensionPackagePath.trim();
    if (!packagePath) {
      message.warning(t('validation.required'));
      return;
    }
    try {
      await ExtensionsAPI.InstallOffline(packagePath);
      const items = await ExtensionsAPI.ListInstalled();
      setInstalledExtensions(Array.isArray(items) ? items : []);
      setExtensionInstallOpen(false);
      setExtensionPackagePath('');
      message.success(t('message.extensionInstalled'));
    } catch (error) {
      message.error(`${t('message.extensionInstallFailed')}: ${error}`);
    }
  };

  const uninstallExtension = async (extensionID) => {
    await ExtensionsAPI.Uninstall(extensionID);
    const items = await ExtensionsAPI.ListInstalled();
    setInstalledExtensions(Array.isArray(items) ? items : []);
    message.success(t('message.extensionUninstalled'));
  };

  const loadFiles = async (overridePath = null) => {
    const values = await fileForm.validateFields();
    const req = {
      host: values.host,
      port: values.port || 22,
      username: values.username,
      password: values.password || '',
      path: overridePath || values.path || '.',
    };
    setFileLoading(true);
    try {
      const entries = await FilesAPI.List(req);
      fileForm.setFieldsValue({ path: req.path });
      setFileEntries(Array.isArray(entries) ? entries : []);
    } catch (error) {
      message.error(`${t('message.fileListFailed')}: ${error}`);
    } finally {
      setFileLoading(false);
    }
  };

  const currentFileRequest = () => {
    const values = fileForm.getFieldsValue();
    return {
      host: values.host,
      port: values.port || 22,
      username: values.username,
      password: values.password || '',
      path: values.path || '.',
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
    const req = currentFileRequest();
    const base = req.path || '.';
    req.path = joinRemotePath(base, name);
    setFileLoading(true);
    try {
      await FilesAPI.Mkdir(req);
      message.success(t('message.mkdirSuccess'));
      setMkdirOpen(false);
      setMkdirName('');
      await loadFiles(base);
    } catch (error) {
      message.error(`${t('message.fileListFailed')}: ${error}`);
    } finally {
      setFileLoading(false);
    }
  };

  const deleteRemoteEntry = async (entry) => {
    const req = currentFileRequest();
    req.path = entry.path;
    setFileLoading(true);
    try {
      await FilesAPI.Delete(req);
      message.success(t('message.deleteSuccess'));
      await loadFiles(fileForm.getFieldValue('path') || '.');
    } catch (error) {
      message.error(`${t('message.fileListFailed')}: ${error}`);
    } finally {
      setFileLoading(false);
    }
  };

  const downloadRemoteFile = async (entry) => {
    if (entry.isDir) return;
    const req = currentFileRequest();
    req.path = entry.path;
    setFileLoading(true);
    try {
      const content = await FilesAPI.ReadFile(req);
      const blob = new Blob([content], { type: 'application/octet-stream' });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = entry.name;
      anchor.click();
      URL.revokeObjectURL(url);
      message.success(t('message.downloadStarted'));
    } catch (error) {
      message.error(`${t('message.fileListFailed')}: ${error}`);
    } finally {
      setFileLoading(false);
    }
  };

  const openRemoteFileEditor = async (entry) => {
    if (entry.isDir) return;
    if (entry.size > 1024 * 1024) {
      message.warning(t('message.fileTooLarge'));
      return;
    }
    const req = currentFileRequest();
    req.path = entry.path;
    setFileEditorLoading(true);
    try {
      const content = await FilesAPI.ReadFile(req);
      setEditingRemoteFile(entry);
      setEditingRemoteContent(content);
      setFileEditorOpen(true);
    } catch (error) {
      message.error(`${t('message.fileListFailed')}: ${error}`);
    } finally {
      setFileEditorLoading(false);
    }
  };

  const saveRemoteFile = async () => {
    if (!editingRemoteFile) return;
    const req = currentFileRequest();
    req.path = editingRemoteFile.path;
    setFileEditorLoading(true);
    try {
      await FilesAPI.WriteFile({ ...req, content: editingRemoteContent });
      message.success(t('message.fileSaved'));
      setFileEditorOpen(false);
      await loadFiles(fileForm.getFieldValue('path') || '.');
    } catch (error) {
      message.error(`${t('message.fileSaveFailed')}: ${error}`);
    } finally {
      setFileEditorLoading(false);
    }
  };

  const uploadTextFile = async () => {
    const name = uploadRemoteName.trim();
    if (!name) {
      message.warning(t('validation.required'));
      return;
    }
    const req = currentFileRequest();
    const base = req.path || '.';
    req.path = joinRemotePath(base, name);
    setFileLoading(true);
    try {
      await FilesAPI.WriteFile({ ...req, content: uploadLocalContent });
      message.success(t('message.uploadSuccess'));
      setUploadOpen(false);
      setUploadRemoteName('');
      setUploadLocalContent('');
      await loadFiles(base);
    } catch (error) {
      message.error(`${t('message.uploadFailed')}: ${error}`);
    } finally {
      setFileLoading(false);
    }
  };

  const renderFiles = () => (
    <div className="workspace-page">
      <div className="page-header">
        <div>
          <Text type="secondary">{t('nav.files')}</Text>
          <Title level={3}>{t('section.remoteFiles')}</Title>
        </div>
      </div>
      <Card className="file-browser-card">
        <Form form={fileForm} layout="inline" className="file-browser-form" initialValues={{ port: 22, path: '.' }}>
          <Form.Item name="host" label={t('field.host')} rules={[{ required: true, message: t('validation.required') }]}>
            <Input placeholder={t('placeholder.host')} />
          </Form.Item>
          <Form.Item name="port" label={t('field.port')}>
            <InputNumber min={1} max={65535} />
          </Form.Item>
          <Form.Item name="username" label={t('field.username')} rules={[{ required: true, message: t('validation.required') }]}>
            <Input />
          </Form.Item>
          <Form.Item name="password" label={t('field.password')}>
            <Input.Password />
          </Form.Item>
          <Form.Item name="path" label={t('field.path')}>
            <Input />
          </Form.Item>
          <Form.Item>
            <Button type="primary" onClick={() => loadFiles()} loading={fileLoading}>{t('action.open')}</Button>
          </Form.Item>
        </Form>
        <Space className="file-toolbar">
          <Button onClick={goParent}>{t('action.up')}</Button>
          <Button onClick={() => loadFiles()} loading={fileLoading}>{t('action.refresh')}</Button>
          <Button onClick={() => setMkdirOpen(true)}>{t('action.mkdir')}</Button>
          <Button onClick={() => setUploadOpen(true)}>{t('action.uploadText')}</Button>
        </Space>
        <List
          className="remote-file-list"
          loading={fileLoading}
          dataSource={fileEntries}
          locale={{ emptyText: t('empty.noFiles') }}
          renderItem={(entry) => (
            <List.Item
              className="remote-file-row"
              actions={[
                !entry.isDir && <Button key="edit" size="small" onClick={() => openRemoteFileEditor(entry)} loading={fileEditorLoading}>{t('action.edit')}</Button>,
                !entry.isDir && <Button key="download" size="small" onClick={() => downloadRemoteFile(entry)}>{t('action.download')}</Button>,
                <Button key="delete" size="small" danger onClick={() => deleteRemoteEntry(entry)}>{t('action.delete')}</Button>,
              ].filter(Boolean)}
              onDoubleClick={() => {
                if (entry.isDir) loadFiles(entry.path);
                if (!entry.isDir) openRemoteFileEditor(entry);
              }}
            >
              <List.Item.Meta
                avatar={<span className="provider-icon">{entry.isDir ? <FolderOpenOutlined /> : <CodeOutlined />}</span>}
                title={entry.name}
                description={`${entry.mode} · ${entry.size} · ${entry.modTime}`}
              />
            </List.Item>
          )}
        />
      </Card>
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

  const renderSettings = () => (
    <div className="workspace-page narrow">
      <div className="page-header">
        <div>
          <Text type="secondary">{t('nav.settings')}</Text>
          <Title level={3}>{t('section.preferences')}</Title>
        </div>
      </div>
      <Space direction="vertical" size={14} className="settings-stack">
        <Card title={t('settings.interface')}>
          <Form layout="vertical">
            <Form.Item label={t('field.locale')}>
              <Select
                value={currentLocale}
                options={availableLocales().map((locale) => ({ value: locale, label: locale }))}
                onChange={(locale) => {
                  setLocale(locale);
                  window.location.reload();
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
            <Text type="secondary">{t('settings.languageHint')}</Text>
          </Form>
        </Card>

        <Card title={t('settings.terminal')}>
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
        </Card>

        <Card title={t('settings.workspace')}>
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
            <Alert
              type="info"
              showIcon
              message={workspaceSummary
                ? `${t('settings.workspaceSnapshot')}: ${workspaceSummary.count} · ${workspaceSummary.updatedAt}`
                : t('message.noWorkspaceSnapshot')}
            />
            <Space wrap>
              <Button icon={<SaveOutlined />} onClick={saveWorkspace}>{t('action.saveWorkspace')}</Button>
              <Button icon={<ReloadOutlined />} onClick={() => restoreWorkspace()}>{t('action.restoreWorkspace')}</Button>
              <Button danger icon={<DeleteOutlined />} onClick={clearWorkspaceSnapshot}>{t('action.clearWorkspace')}</Button>
            </Space>
          </Space>
        </Card>
      </Space>
    </div>
  );

  const startTunnel = async () => {
    const values = await tunnelForm.validateFields();
    const info = await TunnelAPI.Start({
      name: values.name || 'Tunnel',
      sshHost: values.sshHost,
      sshPort: values.sshPort || 22,
      sshUser: values.sshUser,
      sshPassword: values.sshPassword || '',
      localHost: values.localHost || '127.0.0.1',
      localPort: values.localPort,
      remoteHost: values.remoteHost,
      remotePort: values.remotePort,
    });
    setTunnels((current) => [...current, info]);
    message.success(t('message.tunnelStarted'));
  };

  const stopTunnel = async (id) => {
    await TunnelAPI.Stop(id);
    setTunnels((current) => current.filter((item) => item.id !== id));
    message.success(t('message.tunnelStopped'));
  };

  const renderTunnels = () => (
    <div className="workspace-page">
      <div className="page-header">
        <div>
          <Text type="secondary">{t('nav.tunnels')}</Text>
          <Title level={3}>{t('section.tunnels')}</Title>
        </div>
      </div>
      <Card>
        <Form form={tunnelForm} layout="inline" className="file-browser-form" initialValues={{ sshPort: 22, localHost: '127.0.0.1' }}>
          <Form.Item name="name" label={t('field.name')}>
            <Input />
          </Form.Item>
          <Form.Item name="sshHost" label={t('field.host')} rules={[{ required: true, message: t('validation.required') }]}>
            <Input placeholder={t('placeholder.host')} />
          </Form.Item>
          <Form.Item name="sshPort" label={t('field.port')}>
            <InputNumber min={1} max={65535} />
          </Form.Item>
          <Form.Item name="sshUser" label={t('field.username')} rules={[{ required: true, message: t('validation.required') }]}>
            <Input />
          </Form.Item>
          <Form.Item name="sshPassword" label={t('field.password')}>
            <Input.Password />
          </Form.Item>
          <Form.Item name="localHost" label={t('field.localHost')}>
            <Input />
          </Form.Item>
          <Form.Item name="localPort" label={t('field.localPort')} rules={[{ required: true, message: t('validation.required') }]}>
            <InputNumber min={1} max={65535} />
          </Form.Item>
          <Form.Item name="remoteHost" label={t('field.remoteHost')} rules={[{ required: true, message: t('validation.required') }]}>
            <Input />
          </Form.Item>
          <Form.Item name="remotePort" label={t('field.remotePort')} rules={[{ required: true, message: t('validation.required') }]}>
            <InputNumber min={1} max={65535} />
          </Form.Item>
          <Form.Item>
            <Button type="primary" onClick={startTunnel}>{t('action.create')}</Button>
          </Form.Item>
        </Form>
        <List
          className="profile-list"
          dataSource={tunnels}
          renderItem={(item) => (
            <List.Item actions={[<Button key="stop" danger size="small" onClick={() => stopTunnel(item.id)}>{t('action.delete')}</Button>]}>
              <List.Item.Meta title={item.name} description={`${item.localAddr} -> ${item.remoteAddr} via ${item.sshAddr}`} />
            </List.Item>
          )}
        />
      </Card>
    </div>
  );

  const renderContent = () => {
    if (selectedNav === 'connections') return renderConnections();
    if (selectedNav === 'files') return renderFiles();
    if (selectedNav === 'tunnels') return renderTunnels();
    if (selectedNav === 'extensions') return renderExtensions();
    if (selectedNav === 'settings') return renderSettings();
    return renderSessions();
  };

  const isDarkTheme = resolveAppTheme(settings.appTheme) === 'dark';
  const paletteItems = buildPaletteItems({
    profiles,
    quickCommands,
    providers,
    setSelectedNav,
    openDrawer,
    openProfile,
    runQuickCommand,
    setCommandsOpen,
    setSettingsOpen,
    saveWorkspace,
    restoreWorkspace,
  });
  const visiblePaletteItems = filterPaletteItems(paletteItems, paletteQuery);

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
    <Layout className={`app-shell theme-${isDarkTheme ? 'dark' : 'light'}${focusMode ? ' focus-mode' : ''}`}>
      <Sider width={248} className="workspace-sidebar">
        <div className="brand-block">
          <div className="brand-mark"><ThunderboltOutlined /></div>
          <div>
            <Title level={4}>{t('app.title')}</Title>
            <Text type="secondary">{t('app.subtitle')}</Text>
          </div>
        </div>

        <Menu
          className="workspace-nav"
          mode="inline"
          selectedKeys={[selectedNav]}
          onSelect={({ key }) => setSelectedNav(key)}
          items={[
            { key: 'connections', icon: <CloudServerOutlined />, label: t('nav.connections') },
            { key: 'sessions', icon: <CodeOutlined />, label: t('nav.sessions') },
            { key: 'files', icon: <FolderOpenOutlined />, label: t('nav.files') },
            { key: 'tunnels', icon: <ApiOutlined />, label: t('nav.tunnels') },
            { key: 'extensions', icon: <AppstoreAddOutlined />, label: t('nav.extensions') },
            { key: 'settings', icon: <SettingOutlined />, label: t('nav.settings') },
          ]}
        />

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
        </div>

        <div className="sidebar-section sidebar-fill">
          <div className="section-title">{t('section.activeSessions')}</div>
          {sessions.length === 0 ? (
            <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={t('empty.noSessions')} />
          ) : (
            <List
              size="small"
              dataSource={sessions}
              renderItem={(session) => (
                <List.Item
                  className={session.id === activeKey ? 'session-row active' : 'session-row'}
                  onClick={() => {
                    setSelectedNav('sessions');
                    setActiveKey(session.id);
                  }}
                >
                  <Space>
                    <Badge status={session.status === 'connected' ? 'success' : session.status === 'closed' ? 'default' : 'processing'} />
                    <span>{session.label}</span>
                  </Space>
                </List.Item>
              )}
            />
          )}
        </div>
      </Sider>

      <Layout className="main-layout">
        <div className="topbar">
          <Space className="topbar-command-group">
            <Button type="primary" icon={<PlusOutlined />} onClick={() => openDrawer()}>
              {t('action.newTerminal')}
            </Button>
            <Button icon={<CloudServerOutlined />} onClick={() => openDrawer('ssh')}>
              {t('action.quickSsh')}
            </Button>
            <Button icon={<CodeOutlined />} onClick={() => setCommandsOpen(true)}>
              {t('action.commands')}
            </Button>
            <Button icon={<ThunderboltOutlined />} onClick={() => setPaletteOpen(true)}>
              {t('action.commandPalette')}
            </Button>
            {sessions.length > 0 && (
              <Button onClick={() => setSessionView(sessionView === 'tabs' ? 'grid' : 'tabs')}>
                {sessionView === 'tabs' ? t('action.grid') : t('action.tabs')}
              </Button>
            )}
            {sessions.length > 0 && (
              <Tooltip title={focusMode ? t('action.exitFocus') : t('action.focusMode')}>
                <Button
                  icon={focusMode ? <FullscreenExitOutlined /> : <FullscreenOutlined />}
                  onClick={() => setFocusMode((current) => !current)}
                />
              </Tooltip>
            )}
            <Tooltip title={t('action.saveWorkspace')}>
              <Button icon={<SaveOutlined />} onClick={saveWorkspace} />
            </Tooltip>
            <Tooltip title={t('action.restoreWorkspace')}>
              <Button icon={<ReloadOutlined />} onClick={() => restoreWorkspace()} />
            </Tooltip>
            {activeKey && (
              <>
                <Tooltip title={t('action.renameSession')}>
                  <Button icon={<EditOutlined />} onClick={() => openRenameSession()} />
                </Tooltip>
                <Tooltip title={t('action.reconnect')}>
                  <Button icon={<ReloadOutlined />} onClick={() => reconnectSession()} />
                </Tooltip>
              </>
            )}
            {sessions.length > 0 && (
              <Tooltip title={t('action.closeAll')}>
                <Button danger icon={<DeleteOutlined />} onClick={closeAllSessions} />
              </Tooltip>
            )}
          </Space>
          <Space className="topbar-actions">
            {activeKey && (
              <>
                <Input.Search
                  className="terminal-search"
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
                <Button onClick={() => findInTerminal('previous')} disabled={!terminalSearch.trim()}>{t('action.findPrevious')}</Button>
                <Button onClick={() => findInTerminal('next')} disabled={!terminalSearch.trim()}>{t('action.findNext')}</Button>
              </>
            )}
            <Tooltip title={t('action.language')}>
              <Button icon={<GlobalOutlined />} onClick={() => setSettingsOpen(true)} />
            </Tooltip>
            <Tooltip title={t('nav.extensions')}>
              <Button icon={<AppstoreAddOutlined />} onClick={() => setSelectedNav('extensions')} />
            </Tooltip>
            <Tooltip title={t('nav.settings')}>
              <Button icon={<SettingOutlined />} onClick={() => setSelectedNav('settings')} />
            </Tooltip>
          </Space>
        </div>

        <Content className="content-area">
          {renderContent()}
        </Content>

        <div className="statusbar">
          <span>{t('status.sessions')}: {sessions.length}</span>
          <span>{t('status.providers')}: {providers.length}</span>
          <span>{t('status.branch')}: core</span>
        </div>
      </Layout>

      <Modal
        title={t('drawer.commandPalette')}
        open={paletteOpen}
        footer={null}
        width={620}
        className="command-palette-modal"
        onCancel={() => {
          setPaletteOpen(false);
          setPaletteQuery('');
        }}
      >
        <Input
          autoFocus
          value={paletteQuery}
          onChange={(event) => setPaletteQuery(event.target.value)}
          onPressEnter={() => {
            if (visiblePaletteItems[0]) runPaletteAction(visiblePaletteItems[0]);
          }}
          placeholder={t('placeholder.commandPalette')}
        />
        <List
          className="command-palette-list"
          dataSource={visiblePaletteItems.slice(0, 12)}
          locale={{ emptyText: t('empty.noCommands') }}
          renderItem={(item) => (
            <List.Item className="command-palette-row" onClick={() => runPaletteAction(item)}>
              <List.Item.Meta
                avatar={<span className="provider-icon">{item.icon}</span>}
                title={item.title}
                description={`${item.group} · ${item.description}`}
              />
            </List.Item>
          )}
        />
      </Modal>

      <Drawer
        title={t('drawer.newTerminal')}
        width={420}
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        extra={(
          <Space>
            <Button onClick={() => setDrawerOpen(false)}>{t('action.cancel')}</Button>
            <Button type="primary" onClick={createSession}>{t('action.create')}</Button>
          </Space>
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
            <Form.Item name="shell" label={t('field.shell')}>
              <Input placeholder={t('placeholder.shell')} />
            </Form.Item>
          )}
          {newType === 'ssh' && (
            <>
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
                  <Form.Item name="privateKey" label={t('field.privateKey')} rules={[{ required: true, message: t('validation.required') }]}>
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
            </>
          )}
          <Form.Item name="saveProfile" valuePropName="checked">
            <Checkbox>{t('field.saveProfile')}</Checkbox>
          </Form.Item>
        </Form>
      </Drawer>

      <Drawer
        title={t('drawer.settings')}
        width={360}
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
      >
        {renderSettings()}
      </Drawer>
      <Drawer
        title={t('drawer.commands')}
        width={420}
        open={commandsOpen}
        onClose={() => setCommandsOpen(false)}
      >
        <Form form={commandForm} layout="vertical" className="quick-command-form">
          <Form.Item name="name" label={t('field.name')} rules={[{ required: true, message: t('validation.required') }]}>
            <Input />
          </Form.Item>
          <Form.Item name="command" label={t('field.command')} rules={[{ required: true, message: t('validation.required') }]}>
            <Input.TextArea rows={3} />
          </Form.Item>
          <Button type="primary" onClick={addQuickCommand}>{t('action.addCommand')}</Button>
        </Form>
        <Divider />
        <List
          dataSource={quickCommands}
          renderItem={(item) => (
            <List.Item
              actions={[
                <Button key="run" size="small" type="primary" onClick={() => runQuickCommand(item.command)}>{t('action.run')}</Button>,
                <Button key="copy" size="small" onClick={() => navigator.clipboard?.writeText(item.command)}>{t('action.copy')}</Button>,
                <Button key="delete" size="small" danger onClick={() => deleteQuickCommand(item.id)}>{t('action.delete')}</Button>,
              ]}
            >
              <List.Item.Meta title={item.name} description={<code>{item.command}</code>} />
            </List.Item>
          )}
        />
      </Drawer>
      <Drawer
        title={t('drawer.renameSession')}
        width={360}
        open={renameOpen}
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
  ];
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

function ProviderCard({ provider, openDrawer }) {
  return (
    <button className="provider-card" onClick={() => openDrawer(provider.type)}>
      <span>{providerIcons[provider.type] || <CodeOutlined />}</span>
      <strong>{providerLabel(provider)}</strong>
      <small>{provider.category === 'builtin' ? t('provider.category.builtin') : t('provider.category.extension')}</small>
    </button>
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
    auth: {
      username: profile.auth?.username || '',
      authType: profile.auth?.authType || 'password',
      jumpUsername: profile.auth?.jumpUsername || '',
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
    return parsed.filter((item) => item?.name && item?.command).map((item) => ({
      id: item.id || (crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`),
      name: item.name,
      command: item.command,
    }));
  } catch {
    return defaultQuickCommands();
  }
}

function persistQuickCommands(commands) {
  localStorage.setItem(commandStorageKey, JSON.stringify(commands));
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

  const profileItems = actions.profiles.map((profile) => ({
    id: `profile:${profile.id}`,
    group: t('palette.group.connections'),
    title: profile.displayName,
    description: profileDescription(profile),
    icon: providerIcons[profile.providerType] || <CodeOutlined />,
    keywords: `${profile.displayName} ${profile.group || ''} ${profileDescription(profile)}`,
    run: () => actions.openProfile(profile),
  }));

  const quickCommandItems = actions.quickCommands.map((command) => ({
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
      id: 'commands:manage',
      group: t('palette.group.commands'),
      title: t('action.commands'),
      description: t('section.quickCommands'),
      icon: <ThunderboltOutlined />,
      keywords: 'quick commands manage',
      run: () => actions.setCommandsOpen(true),
    },
  ];

  return [...navigation, ...providerItems, ...profileItems, ...quickCommandItems, ...workspaceItems];
}

function filterPaletteItems(items, query) {
  const keyword = query.trim().toLowerCase();
  if (!keyword) return items;
  return items.filter((item) => (
    item.title?.toLowerCase().includes(keyword)
    || item.description?.toLowerCase().includes(keyword)
    || item.group?.toLowerCase().includes(keyword)
    || item.keywords?.toLowerCase().includes(keyword)
  ));
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

function saveProfile(profiles, request, editingProfileId = '') {
  const profile = {
    id: editingProfileId || (crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}`),
    providerType: request.providerType,
    displayName: request.displayName,
    group: request.group || '',
    config: request.config,
    auth: {
      username: request.auth?.username || '',
      authType: request.auth?.authType || 'password',
      jumpUsername: request.auth?.jumpUsername || '',
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

function uniqueProfileGroups(profiles) {
  return [...new Set(profiles.map((profile) => profile.group).filter(Boolean))].sort((left, right) => left.localeCompare(right));
}

function filteredProfiles(profiles, query, group = 'all') {
  const keyword = query.trim().toLowerCase();
  return profiles.filter((profile) => {
    const groupMatched = group === 'all' || (profile.group || '') === group;
    if (!groupMatched) return false;
    if (!keyword) return true;
    return (
      profile.displayName?.toLowerCase().includes(keyword)
      || profile.group?.toLowerCase().includes(keyword)
      || profile.providerType?.toLowerCase().includes(keyword)
      || profile.config?.host?.toLowerCase().includes(keyword)
      || profile.auth?.username?.toLowerCase().includes(keyword)
    );
  });
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
  return {
    ...defaultSettings,
    ...settings,
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
      },
    };
  }

  return {
    providerType: type,
    displayName,
    group: values.group || '',
    config: {
      shell: values.shell || '',
    },
    auth: {},
  };
}

export default App;
