import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Badge,
  Button,
  Card,
  Checkbox,
  Divider,
  Drawer,
  Empty,
  Form,
  Input,
  InputNumber,
  Layout,
  List,
  Menu,
  Select,
  Space,
  Tabs,
  Tag,
  Tooltip,
  Typography,
  message,
} from 'antd';
import {
  ApiOutlined,
  AppstoreAddOutlined,
  CloudServerOutlined,
  CodeOutlined,
  DatabaseOutlined,
  FolderOpenOutlined,
  GlobalOutlined,
  LaptopOutlined,
  PlusOutlined,
  SettingOutlined,
  ThunderboltOutlined,
} from '@ant-design/icons';
import TerminalPane from './components/TerminalPane.jsx';
import * as ExtensionsAPI from '../wailsjs/go/extensions/API.js';
import * as FilesAPI from '../wailsjs/go/files/API.js';
import * as SessionAPI from '../wailsjs/go/session/API.js';
import { availableLocales, currentLocale, setLocale, t } from './i18n.js';

const { Sider, Content } = Layout;
const { Text, Title } = Typography;

const profileStorageKey = 'galaxyterm.connectionProfiles';

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
  const [installedExtensions, setInstalledExtensions] = useState([]);
  const [activeKey, setActiveKey] = useState('');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [commandsOpen, setCommandsOpen] = useState(false);
  const [selectedNav, setSelectedNav] = useState('connections');
  const [profileQuery, setProfileQuery] = useState('');
  const [newType, setNewType] = useState('local');
  const [fileEntries, setFileEntries] = useState([]);
  const [fileLoading, setFileLoading] = useState(false);
  const [mkdirOpen, setMkdirOpen] = useState(false);
  const [mkdirName, setMkdirName] = useState('');
  const [sshAuthType, setSshAuthType] = useState('password');
  const [form] = Form.useForm();
  const [fileForm] = Form.useForm();
  const terminalRefs = useRef({});
  const quickCommands = useMemo(() => defaultQuickCommands(), []);

  useEffect(() => {
    SessionAPI.ListProviders()
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
    ExtensionsAPI.ListInstalled()
      .then((items) => setInstalledExtensions(Array.isArray(items) ? items : []))
      .catch(() => setInstalledExtensions([]));
  }, []);

  useEffect(() => {
    if (activeKey && terminalRefs.current[activeKey]?.fit) {
      setTimeout(() => terminalRefs.current[activeKey]?.fit(), 0);
    }
  }, [activeKey]);

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

  const openDrawer = (type = providers[0]?.type || 'local', profile = null) => {
    const providerType = profile?.providerType || type;
    setNewType(providerType);
    form.setFieldsValue({
      displayName: profile?.displayName || '',
      host: profile?.config?.host || '',
      port: profile?.config?.port || 22,
      username: profile?.auth?.username || '',
      password: '',
      authType: profile?.auth?.authType || 'password',
      privateKey: '',
      passphrase: '',
      shell: profile?.config?.shell || '',
      saveProfile: false,
    });
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
      const nextProfiles = saveProfile(profiles, request);
      setProfiles(nextProfiles);
      message.success(t('message.profileSaved'));
    }

    setSessions((current) => [...current, { id, label, providerType: newType, request, status: 'connecting' }]);
    setActiveKey(id);
    setSelectedNav('sessions');
    setDrawerOpen(false);
    message.success(t('terminal.status.connecting'));
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

  const updateSessionStatus = (sessionId, status) => {
    setSessions((current) => current.map((item) => (
      item.backendSessionId === sessionId || item.id === sessionId ? { ...item, status } : item
    )));
  };

  const deleteProfile = (profileId) => {
    const nextProfiles = profiles.filter((profile) => profile.id !== profileId);
    persistProfiles(nextProfiles);
    setProfiles(nextProfiles);
    message.success(t('message.profileDeleted'));
  };

  const runQuickCommand = (command) => {
    const activeTerminal = terminalRefs.current[activeKey];
    if (!activeTerminal?.send) {
      message.warning(t('message.noActiveSession'));
      return;
    }
    activeTerminal.send(command.endsWith('\n') ? command : `${command}\n`);
    setCommandsOpen(false);
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
          ref={(el) => {
            terminalRefs.current[session.id] = el;
          }}
          request={session.request}
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

      <div className="page-header compact">
        <Title level={4}>{t('section.savedConnections')}</Title>
      </div>
      <Input.Search
        className="profile-search"
        allowClear
        value={profileQuery}
        onChange={(event) => setProfileQuery(event.target.value)}
        placeholder={t('nav.connections')}
      />
      {filteredProfiles(profiles, profileQuery).length === 0 ? (
        <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={t('empty.noConnections')} />
      ) : (
        <List
          className="profile-list"
          dataSource={filteredProfiles(profiles, profileQuery)}
          renderItem={(profile) => (
            <List.Item
              actions={[
                <Button key="open" size="small" onClick={() => openDrawer(profile.providerType, profile)}>{t('action.open')}</Button>,
                <Button key="delete" size="small" danger onClick={() => deleteProfile(profile.id)}>{t('action.delete')}</Button>,
              ]}
            >
              <List.Item.Meta
                avatar={<span className="provider-icon">{providerIcons[profile.providerType] || <CodeOutlined />}</span>}
                title={profile.displayName}
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
          <Button icon={<FolderOpenOutlined />} onClick={registerDemoExtension}>{t('action.installOffline')}</Button>
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
              <List.Item>
                <List.Item.Meta title={extension.name} description={`${extension.id} · ${extension.version}`} />
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
          <Button onClick={() => setMkdirOpen(true)}>{t('action.mkdir')}</Button>
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
                !entry.isDir && <Button key="download" size="small" onClick={() => downloadRemoteFile(entry)}>{t('action.download')}</Button>,
                <Button key="delete" size="small" danger onClick={() => deleteRemoteEntry(entry)}>{t('action.delete')}</Button>,
              ].filter(Boolean)}
              onDoubleClick={() => {
                if (entry.isDir) loadFiles(entry.path);
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
      <Card>
        <Form layout="vertical">
          <Form.Item label={t('field.locale')}>
            <Select
              defaultValue={currentLocale}
              options={availableLocales().map((locale) => ({ value: locale, label: locale }))}
              onChange={(locale) => {
                setLocale(locale);
                window.location.reload();
              }}
            />
          </Form.Item>
          <Text type="secondary">{t('settings.languageHint')}</Text>
        </Form>
      </Card>
    </div>
  );

  const renderContent = () => {
    if (selectedNav === 'connections') return renderConnections();
    if (selectedNav === 'files') return renderFiles();
    if (selectedNav === 'extensions') return renderExtensions();
    if (selectedNav === 'settings') return renderSettings();
    return renderSessions();
  };

  return (
    <Layout className="app-shell">
      <Sider width={272} className="workspace-sidebar">
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
          <Space>
            <Button type="primary" icon={<PlusOutlined />} onClick={() => openDrawer()}>
              {t('action.newTerminal')}
            </Button>
            <Button icon={<CloudServerOutlined />} onClick={() => openDrawer('ssh')}>
              {t('action.quickSsh')}
            </Button>
            <Button icon={<CodeOutlined />} onClick={() => setCommandsOpen(true)}>
              {t('action.commands')}
            </Button>
          </Space>
          <Space className="topbar-actions">
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
        <List
          dataSource={quickCommands}
          renderItem={(item) => (
            <List.Item
              actions={[
                <Button key="run" size="small" type="primary" onClick={() => runQuickCommand(item.command)}>{t('action.run')}</Button>,
                <Button key="copy" size="small" onClick={() => navigator.clipboard?.writeText(item.command)}>{t('action.copy')}</Button>,
              ]}
            >
              <List.Item.Meta title={item.name} description={<code>{item.command}</code>} />
            </List.Item>
          )}
        />
      </Drawer>
    </Layout>
  );
}

function defaultQuickCommands() {
  return [
    { name: 'List files', command: 'ls -lah' },
    { name: 'Disk usage', command: 'df -h' },
    { name: 'Memory usage', command: 'free -m' },
    { name: 'Current directory', command: 'pwd' },
    { name: 'Network ports', command: 'netstat -tunlp' },
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
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function persistProfiles(profiles) {
  localStorage.setItem(profileStorageKey, JSON.stringify(profiles));
}

function saveProfile(profiles, request) {
  const profile = {
    id: crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}`,
    providerType: request.providerType,
    displayName: request.displayName,
    config: request.config,
    auth: {
      username: request.auth?.username || '',
      authType: request.auth?.authType || 'password',
    },
  };
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

function filteredProfiles(profiles, query) {
  const keyword = query.trim().toLowerCase();
  if (!keyword) return profiles;
  return profiles.filter((profile) => (
    profile.displayName?.toLowerCase().includes(keyword)
    || profile.providerType?.toLowerCase().includes(keyword)
    || profile.config?.host?.toLowerCase().includes(keyword)
    || profile.auth?.username?.toLowerCase().includes(keyword)
  ));
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
      config: {
        host: values.host,
        port: values.port || 22,
      },
      auth: {
        username: values.username,
        authType: values.authType || 'password',
        password: values.password || '',
        privateKey: values.privateKey || '',
        passphrase: values.passphrase || '',
      },
    };
  }

  return {
    providerType: type,
    displayName,
    config: {
      shell: values.shell || '',
    },
    auth: {},
  };
}

export default App;
