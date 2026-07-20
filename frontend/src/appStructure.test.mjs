import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const source = await readFile(new URL('./App.jsx', import.meta.url), 'utf8');
const mainGoSource = await readFile(new URL('../../main.go', import.meta.url), 'utf8');
const mainSource = await readFile(new URL('./main.jsx', import.meta.url), 'utf8');
const indexSource = await readFile(new URL('../index.html', import.meta.url), 'utf8');
const styles = await readFile(new URL('../style.scss', import.meta.url), 'utf8');
const viteConfig = await readFile(new URL('../vite.config.js', import.meta.url), 'utf8');
const replaySource = await readFile(new URL('./components/AuditReplayPlayer.jsx', import.meta.url), 'utf8');
const commandPaletteSource = await readFile(new URL('./components/CommandPalette.jsx', import.meta.url), 'utf8');
const connectionGroupDialogSource = await readFile(new URL('./components/ConnectionGroupDialog.jsx', import.meta.url), 'utf8').catch(() => '');
const terminalPaneSource = await readFile(new URL('./components/TerminalPane.jsx', import.meta.url), 'utf8');
const terminalSearchControlSource = await readFile(new URL('./components/TerminalSearchControl.jsx', import.meta.url), 'utf8').catch(() => '');
const terminalSearchSource = await readFile(new URL('./terminalSearch.js', import.meta.url), 'utf8').catch(() => '');
const workspaceStateSource = await readFile(new URL('./workspaceState.js', import.meta.url), 'utf8');
const savedSshProfileSource = await readFile(new URL('./components/SavedSSHProfileSelect.jsx', import.meta.url), 'utf8');
const activeSessionDeclaration = source.indexOf('const activeSession =');
const firstActiveSessionUsage = source.indexOf('activeSession?.providerType');
const providersDeclaration = source.indexOf('const providers =');
const desktopWindowTitleDeclaration = source.indexOf('const desktopWindowTitle =');

assert.notEqual(activeSessionDeclaration, -1, 'App must derive the active session');
assert.notEqual(firstActiveSessionUsage, -1, 'App must use the active session provider scope');
assert.ok(
  activeSessionDeclaration < firstActiveSessionUsage,
  'activeSession must be initialized before any render-time hook dependency reads it',
);
assert.ok(
  providersDeclaration >= 0 && providersDeclaration < desktopWindowTitleDeclaration,
  'providers must be initialized before the desktop window title derives its provider label',
);

assert.ok(
  source.includes('const compactConnectionDetail = screens.xxl !== true;')
    && /@media \(max-width: 1599px\)[\s\S]*?\.connection-manager-layout,\s*\.connection-manager-layout\.no-detail\s*\{[\s\S]*?grid-template-columns:\s*190px minmax\(0, 1fr\)/.test(styles)
    && /@media \(max-width: 960px\)[\s\S]*?\.connection-manager-layout,\s*\.connection-manager-layout\.no-detail\s*\{[\s\S]*?grid-template-columns:\s*minmax\(0, 1fr\)/.test(styles)
    && !/\.connection-detail-panel\s*\{[^}]*order:\s*-1;/.test(styles),
  'connection details, group navigation, and list columns must use aligned responsive breakpoints',
);

assert.ok(
  source.includes("const selectedProfile = explicitlySelectedProfile || (compactConnectionDetail ? null : visibleProfiles[0] || null);")
    && source.includes('aria-label={t(\'action.manage\')}')
    && !source.includes("<Button size=\"small\" icon={<MoreOutlined />} onClick={(event) => event.stopPropagation()}>{t('action.manage')}</Button>"),
  'compact connection lists must expose an icon menu without keeping an invisible default selection',
);
assert.ok(
  source.includes("const [connectionDetailProfileId, setConnectionDetailProfileId] = useState('');")
    && source.includes('const connectionDetailProfile = visibleProfiles.find((profile) => profile.id === connectionDetailProfileId) || null;')
    && source.includes("if (!compactConnectionDetail || selectedNav !== 'connections'")
    && source.includes('Boolean(connectionDetailProfile)')
    && source.includes('renderConnectionProfilePreview(connectionDetailProfile)'),
  'compact connection details must not reuse keyboard selection as drawer visibility state',
);
assert.ok(
  source.includes('const runConnectionProfileNewAction = (profile) => {')
    && source.includes('if (event.shiftKey) runConnectionProfileNewAction(selectedProfile);')
    && /const handleConnectionListKeyDown = \(event\) => \{\s*if \(isInteractiveControl\(event\.target\)\) return;/.test(source)
    && /onDoubleClick=\{\(event\) => \{\s*if \(isInteractiveControl\(event\.target\)\) return;\s*runConnectionProfileNewAction\(profile\);/.test(source)
    && source.includes("if (action === 'connect') runConnectionProfileNewAction(profile);")
    && source.includes('buildConnectionProfileLaunchModel({'),
  'connection double-click and Shift+Enter must explicitly open a new target instead of refocusing an existing session',
);

assert.ok(
  /\.connection-groups-panel,\s*\.connection-detail-panel\s*\{[\s\S]*?position:\s*sticky;[\s\S]*?top:\s*12px;/.test(styles)
    && /\.connection-group-nav\s*\{[\s\S]*?overflow-y:\s*auto;/.test(styles)
    && /@media \(max-width: 960px\)[\s\S]*?\.connection-groups-panel\s*\{[\s\S]*?position:\s*static;/.test(styles),
  'connection groups and wide details must stay available while long profile lists scroll',
);

assert.ok(
  source.includes("action !== 'connect' || primaryAction.action === 'focus'")
    && source.includes('launchModel.secondary && (')
    && source.includes('runConnectionProfileLaunchAction(launchModel.secondary, profile)')
    && source.includes(": 'action.newTerminal'"),
  'profiles with active sessions must expose both focus-existing and open-new actions',
);

assert.ok(
  /\.content-area\s*\{[\s\S]*?display:\s*grid;[\s\S]*?grid-template-rows:\s*auto minmax\(0, 1fr\)/.test(styles),
  'desktop bridge notices must reserve space above the persistent page layers',
);

assert.ok(
  /\.content-page-layer,\s*\.session-page-layer\s*\{[\s\S]*?grid-column:\s*1;[\s\S]*?grid-row:\s*2;/.test(styles),
  'content and session layers must share the remaining content grid row',
);
assert.ok(
  source.includes('const contentPageRef = useRef(null);')
    && source.includes('const contentPageScrollPositionsRef = useRef(new Map());')
    && source.includes('const previousContentPageRef = useRef(selectedNav);')
    && source.includes('ref={contentPageRef}')
    && /useLayoutEffect\(\(\) => \{[\s\S]*?contentPageScrollPositionsRef[\s\S]*?layer\.scrollTop[\s\S]*?\}, \[selectedNav\]\);/.test(source),
  'workspace pages must restore independent scroll positions instead of inheriting the previous page offset',
);
assert.ok(
  source.includes('buildWorkspaceRestorePlan(snapshot, sessions, {')
    && source.includes('workspaceRestoringRef.current')
    && source.includes('workspaceStartupHandledRef.current')
    && source.includes('workspaceHadSessionsRef.current')
    && source.includes('if (!workspaceHydrated || !settings.autoSaveWorkspace) return;')
    && source.includes('if (!clearPersistedWorkspaceSnapshot()) return;')
    && !source.includes('!settings.autoSaveWorkspace || sessions.length === 0')
    && source.includes('return profileToRequest(profile);')
    && source.includes("profile.providerType === 'ssh' && !profile.auth?.credentialRef")
    && source.includes('request: await resolveCredentialRequest(entry.request)')
    && workspaceStateSource.includes('currentByFingerprint.get(fingerprint)?.shift()')
    && workspaceStateSource.match(/request: sanitizeWorkspaceRequest\(session\.request\)/g)?.length >= 2,
  'workspace restore must clear stale empty snapshots, rebuild saved profiles, and match duplicate sessions by count',
);
assert.equal(
  source.match(/\{renderTerminalPane\(session\)\}/g)?.length,
  1,
  'each live terminal must have one stable render site across tabs and split view',
);
assert.ok(
  source.includes('className={`terminal-pane-deck view-${sessionView}`}')
    && source.includes('className={`terminal-pane-slot${session.id === activeKey ? \' active\' : \'\'}`}')
    && source.includes('tabBarExtraContent={sessionToolbarActions}'),
  'session presentation modes must share one persistent pane deck and tab-bar toolbar',
);
assert.ok(
  terminalPaneSource.includes('focus: () => {')
    && terminalPaneSource.includes('term.current?.focus();')
    && source.includes('const focusTerminalSession = (sessionId = activeKey) => {')
    && source.includes('const activateSession = (sessionId) => {')
    && source.includes('onChange={activateSession}')
    && source.includes('onTabClick={focusTerminalSession}'),
  'session navigation must return keyboard focus to the selected terminal without another canvas click',
);
assert.ok(
  source.includes("if (!activeKey || selectedNav !== 'sessions') return undefined;")
    && source.includes('window.requestAnimationFrame(() => {')
    && source.includes('terminalRefs.current[activeKey]?.focus?.();')
    && source.includes('if (isInteractiveControl(event.target)) return;')
    && !source.includes('onContextMenu={() => setActiveKey(session.id)}'),
  'terminal focus restoration must stay inside the visible session page and preserve inactive-tab context menus',
);
assert.ok(
  !source.includes('<div className="statusbar">')
    && !/\.statusbar\s*\{/.test(styles),
  'the app shell must not reserve a redundant debug footer below terminal status',
);

assert.ok(
  /<Sider[\s\S]*?breakpoint="lg"[\s\S]*?collapsed=\{sidebarCompact\}[\s\S]*?collapsedWidth=\{68\}/.test(source),
  'the workspace sidebar must collapse before narrow desktop layouts become crowded',
);
assert.ok(
  source.includes("sidebarMode: 'auto',")
    && source.includes('sidebarMode: normalizeSidebarMode(settings.sidebarMode),')
    && source.includes('const sidebarCompact = resolveSidebarCompact(settings.sidebarMode, screens.lg === false);')
    && source.includes("value={settings.sidebarMode || defaultSettings.sidebarMode}")
    && source.includes("{ value: 'auto', label: t('sidebar.auto') }")
    && source.includes("{ value: 'expanded', label: t('sidebar.expanded') }")
    && source.includes("{ value: 'compact', label: t('sidebar.compact') }"),
  'sidebar layout preference must support responsive auto mode and persisted explicit modes',
);
assert.ok(
  source.includes("configurableShortcutAction === 'toggleSidebar'")
    && source.includes('icon={sidebarCompact ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}')
    && source.includes("sidebarMode: sidebarCompact ? 'expanded' : 'compact'")
    && source.includes("aria-label={t(sidebarCompact ? 'action.expandSidebar' : 'action.collapseSidebar')}"),
  'the sidebar must be discoverable from the topbar and the configurable keyboard router',
);
assert.ok(!styles.includes('min-width: 900px'), 'the app shell must not force a viewport wider than the desktop window');
assert.ok(
  styles.includes('.workspace-sidebar:not(.ant-layout-sider-collapsed)'),
  'legacy narrow sidebar sizing must not override the collapsed rail width',
);
assert.ok(
  /<AppErrorBoundary>\s*<App\s*\/>\s*<\/AppErrorBoundary>/.test(mainSource),
  'the application root must recover from render failures instead of showing a blank window',
);
assert.ok(
  mainGoSource.includes('mac.TitleBarHiddenInset()')
    && mainGoSource.includes('mac.DefaultAppearance')
    && !mainGoSource.includes('mac.TitleBarDefault()'),
  'macOS must integrate native traffic-light controls into the application chrome',
);
assert.ok(
  mainSource.includes('syncDesktopPlatform(document.documentElement);')
    && /html\[data-platform='darwin'\][\s\S]*?--wails-draggable:\s*drag/.test(styles)
    && /html\[data-platform='darwin'\][\s\S]*?\.workspace-sidebar[\s\S]*?padding-top:\s*28px/.test(styles),
  'the webview must reserve a draggable macOS traffic-light safe area without affecting other platforms',
);
assert.ok(
  source.includes('syncDesktopWindowTheme(settings.appTheme);')
    && source.includes('document.documentElement.style.colorScheme = resolvedTheme;'),
  'application theme changes must update both native window chrome and webview controls',
);
assert.ok(
  indexSource.includes('<link rel="icon" href="/favicon.svg" type="image/svg+xml">')
    && indexSource.includes('<title>GalaxyTerm</title>'),
  'the desktop webview must expose GalaxyTerm branding without a missing favicon request',
);
assert.ok(
  source.includes('document.documentElement.lang = locale;')
    && source.includes('buildDesktopWindowTitle(activeSession')
    && source.includes('syncDesktopWindowTitle(desktopWindowTitle);')
    && source.includes("label: t(`locale.${locale}`, locale)"),
  'runtime locale and active-session changes must update desktop metadata and present readable language names',
);
assert.ok(
  !source.includes('session-switcher-list') && !source.includes('session-filter-bar'),
  'the workspace must not duplicate persistent session tabs with a second filter and switcher stack',
);
assert.ok(
  source.includes('<SessionToolbarActions model={sessionToolbarModel}'),
  'session management must use the compact toolbar action model',
);
assert.ok(
  source.includes("const [sidebarSessionQuery, setSidebarSessionQuery] = useState('');")
    && source.includes('buildSessionSidebarState(sessions, {')
    && source.includes('allowClear')
    && source.includes("placeholder={t('placeholder.searchSessions')}")
    && source.includes('activateSession(sidebarSessions[0].id);'),
  'the active-session sidebar must provide compact search without changing session lifetime',
);
assert.ok(
  source.includes('await SessionAPI.TestProvider(request);')
    && source.includes('const [connectionTestResult, setConnectionTestResult] = useState(null);')
    && source.includes('className="connection-test-result"')
    && source.includes('onValuesChange={() => setConnectionTestResult(null)}'),
  'extension connection tests must run the real provider and keep a visible result until form values change',
);
assert.ok(
  source.includes('buildTerminalProviderSummary(selectedProvider)')
    && source.includes('selectedProviderSummary.extensionVersion')
    && source.includes("aria-label={t('action.manageExtension')}")
    && styles.includes('.drawer-provider-meta'),
  'the connection drawer must identify extension source, version, and capabilities',
);
assert.ok(
  source.includes('const buildConnectionProfileActionMenu = (profile) => {')
    && source.match(/menu=\{buildConnectionProfileActionMenu\(profile\)\}/g)?.length >= 3
    && source.includes('className="provider-row-activate"')
    && source.includes('className="quick-profile-activate"')
    && source.includes('className="quick-profile-menu"')
    && /className="quick-profile-activate"[\s\S]*?onClick=\{\(\) => runConnectionProfilePrimaryAction\(profile\)\}/.test(source),
  'quick terminals and saved connections must expose native keyboard actions and the shared profile menu',
);
assert.ok(
  source.includes("import ConnectionGroupDialog from './components/ConnectionGroupDialog.jsx';")
    && source.includes('<ConnectionGroupDialog')
    && source.includes('buildConnectionGroupFilter(')
    && source.includes('resolveConnectionGroupFilter(')
    && source.includes("key: 'moveGroup'")
    && source.includes('className="connection-group-nav-activate"')
    && source.includes('className="connection-group-nav-menu"')
    && source.includes("trigger={['contextMenu']}")
    && connectionGroupDialogSource.includes('maxLength={80}')
    && connectionGroupDialogSource.includes("t('connection.group.mergeHint'"),
  'connection groups must support collision-safe filters, profile moves, and discoverable management actions',
);
assert.ok(
  source.includes('const buildSessionActionMenu = (session) => {')
    && source.match(/menu=\{buildSessionActionMenu\(session\)\}/g)?.length >= 2
    && source.includes("aria-label={t('action.sessionActions')}")
    && source.includes("aria-current={session.id === activeKey ? 'page' : undefined}")
    && source.includes('className="session-row-activate"')
    && source.includes("onDrop={(event) => dropSessionAt(event, session.id, 'y')}")
    && source.includes('const detail = identityDisplay?.identity || identityDisplay?.provider || statusLabel;'),
  'session tabs and sidebar rows must share one discoverable management menu',
);
assert.ok(
  source.includes('hideAdd={false}')
    && source.includes('addIcon={<PlusOutlined />}')
    && source.includes("if (action === 'add') openDrawer();"),
  'session tabs must expose a familiar new-terminal button through the existing drawer flow',
);
assert.ok(
  source.includes('icon: sessionTabActionIcon(action.key)'),
  'session toolbar overflow actions must use semantic icons, including reconnect',
);
assert.ok(
  /\.terminal-tabs \.ant-tabs-nav-add\s*\{[\s\S]*?width:\s*32px;[\s\S]*?height:\s*32px;/.test(styles),
  'the terminal tab add button must remain a stable compact icon target',
);
assert.ok(
  /@media \(max-width: 1200px\)[\s\S]*?\.session-toolbar-context\s*\{[\s\S]*?display:\s*none[\s\S]*?\.session-toolbar-actions\s*\{[\s\S]*?border-left:\s*0/.test(styles),
  'non-fullscreen session workspaces must prioritize tab titles over duplicated context',
);
assert.ok(
  source.includes('className="topbar-new-terminal"')
    && source.includes('className="command-palette-label"')
    && source.includes('className="command-palette-shortcut"'),
  'topbar primary commands must expose responsive label hooks',
);
assert.ok(
  source.includes("onClick={() => launchDefaultTerminal()}")
    && source.includes('className="topbar-new-terminal-group"')
    && source.includes('className="topbar-new-terminal-menu"')
    && source.includes("aria-label={t('action.configureTerminal')}"),
  'the topbar must pair one-click default terminal creation with an adjacent configuration menu',
);
assert.ok(
  source.includes('buildDefaultTerminalLaunch({')
    && source.includes('const launchDefaultTerminal = async (providerType = terminalDefaults.defaultProviderType) => {')
    && source.includes("if (launch.kind === 'configure') {")
    && source.includes('await startProfileRequests([launch.request]);')
    && source.includes("workingDirectory: type === 'local'")
    && source.includes("showOperationError('message.terminalStartFailed', error")
    && source.includes("if (configurableShortcutAction === 'newTerminal')")
    && source.includes('launchDefaultTerminal();'),
  'default terminal entry points must share one safe direct-launch plan with structured recovery',
);
assert.ok(
  commandPaletteSource.includes('afterOpenChange={(nextOpen) => {')
    && commandPaletteSource.includes("inputRef.current?.focus({ cursor: 'all' })")
    && commandPaletteSource.includes('aria-activedescendant={activeItemId}')
    && commandPaletteSource.includes('scrollIntoView?.({ block: \'nearest\' })')
    && commandPaletteSource.includes('role="listbox"')
    && commandPaletteSource.includes('role="option"'),
  'the command palette must keep focus, selection, and active results synchronized for keyboard use',
);
assert.ok(
  source.includes("import CommandPalette from './components/CommandPalette.jsx';")
    && source.includes('<CommandPalette')
    && source.includes('recentIds={paletteRecentIds}')
    && source.includes('recordPaletteRecent(')
    && source.includes('persistPaletteRecentIds(')
    && !source.includes('className="command-palette-modal"'),
  'the command palette must use a focused component with persisted recent actions',
);
assert.ok(
  source.includes('resolveTabSessionAction,')
    && source.includes('const tabSessionAction = resolveTabSessionAction(event);')
    && source.includes('resolveRelativeSessionIndex(sessionIds, activeKey, tabSessionAction)'),
  'Ctrl+Tab must cycle sessions even while the terminal input owns focus',
);
assert.ok(
  source.includes("t(`session.status.${sessionStatusLabel(session)}`)")
    && !source.includes('sessionStatusLabel(session.status)'),
  'command palette session rows must show the real localized lifecycle state',
);
assert.ok(
  source.includes("const [extensionQuery, setExtensionQuery] = useState('');")
    && source.includes("const [extensionScope, setExtensionScope] = useState('all');")
    && source.includes('const visibleExtensionWorkspace = useMemo(() => filterExtensionWorkspace({')
    && source.includes("if (action.action === 'findExtension')")
    && source.includes('openExtensionsForProvider(profile.providerType);')
    && source.includes('runUnavailableProfile: (profile) => actions.openExtensionsForProvider(profile.providerType)')
    && source.includes('value={extensionQuery}')
    && source.includes('value={extensionScope}'),
  'extension discovery must be searchable and unavailable connections must lead to their provider',
);
assert.ok(
  source.includes('const extensionUsageById = useMemo(() => Object.fromEntries(')
    && source.includes('buildExtensionUsageImpact(extension, { profiles, sessions })')
    && source.includes('confirmToggleExtensionEnabled(extension, checked)')
    && source.includes("contentKey: 'confirm.disableExtensionImpactContent'")
    && source.includes("impact.hasImpact ? 'confirm.uninstallExtensionImpactContent' : 'confirm.uninstallExtensionContent'"),
  'extension disable and uninstall actions must expose their saved-connection and active-session impact',
);
assert.ok(
  source.includes('onClick={() => launchDefaultTerminal(provider.type)}')
    && source.includes('openDefaultTerminal={launchDefaultTerminal}')
    && source.includes("onClick={() => openDefaultTerminal('local')}")
    && source.includes("if (action === 'newLocalTerminal') launchDefaultTerminal('local');")
    && source.includes("if (action === 'local') launchDefaultTerminal('local');"),
  'sidebar, empty session, palette, and keyboard launch paths must stay behaviorally consistent',
);
assert.ok(
  /@media \(max-width: 1200px\)[\s\S]*?\.topbar-new-terminal[\s\S]*?\.command-palette-label/.test(styles),
  'narrow workspaces must collapse primary topbar labels without hiding their commands',
);
assert.ok(
  /@media \(max-width: 1320px\)[\s\S]*?\.topbar-secondary-action\s*\{[\s\S]*?display:\s*none/.test(styles),
  'non-fullscreen desktop windows must remove secondary topbar width before the shell can overflow',
);
assert.ok(
  source.includes('className={`terminal-status-fact session-context-status-fact')
    && source.includes('className={`session-recording-indicator')
    && source.includes('className={`session-audit-indicator'),
  'session context, recording, and audit state must share the terminal status rail',
);
assert.ok(
  source.includes('buildProviderRuntimeState(session.providerType')
    && source.includes('providerRuntime={providerRuntime}')
    && source.includes('onManageProvider={() => openProviderExtension(providerRuntime)}')
    && source.includes('className={`provider-runtime-indicator tone-${providerRuntime.tone}`}')
    && source.includes("setExtensionScope(runtimeState.status === 'missing' ? 'all' : 'installed')"),
  'active sessions must disclose their provider runtime and link extension-backed sessions to management',
);
assert.ok(
  /@media \(max-width: 860px\)[\s\S]*?\.session-context-status-fact\.fact-target[\s\S]*?\.session-context-status-fact\.fact-user[\s\S]*?display:\s*none/.test(styles),
  'narrow session workspaces must hide secondary context before status and recovery controls',
);
assert.ok(
  source.includes('Grid.useBreakpoint()')
    && source.includes('className="connection-detail-drawer"')
    && source.includes("selectedNav === 'connections' && compactConnectionDetail"),
  'compact connection workspaces must keep the list in place and open profile details in a drawer',
);
assert.ok(
  source.includes('buildTerminalErrorDetail')
    && source.includes('className="terminal-error-details"')
    && source.includes('className="terminal-recovery-label"'),
  'terminal failures must use a structured detail disclosure and compact recovery labels',
);
assert.ok(
  source.includes('<TerminalSearchControl')
    && source.includes('result={activeTerminalSearchResult}')
    && source.includes("onFindPrevious={() => findInTerminal('previous')}")
    && source.includes("onFindNext={() => findInTerminal('next')}"),
  'terminal search must use a focused control with result feedback and explicit navigation',
);
assert.ok(
  /\{activeKey\s*&&\s*selectedNav\s*===\s*'sessions'\s*&&\s*\([\s\S]*?<TerminalSearchControl/.test(source),
  'terminal output search must stay inside the visible session workspace instead of acting on a hidden terminal',
);
assert.ok(
  source.includes('const [messageApi, messageContextHolder] = message.useMessage();')
    && source.includes('{messageContextHolder}')
    && !/\bmessage\.(?:success|error|warning|info)\(/.test(source),
  'user feedback must use a theme-aware message context instead of the static API',
);
assert.ok(
  source.includes('const [notificationApi, notificationContextHolder] = notification.useNotification();')
    && source.includes('{notificationContextHolder}')
    && source.includes('const showOperationError =')
    && source.includes('<OperationErrorDescription model={model} />')
    && source.includes('writeClipboardText(model.detail)')
    && source.includes("{t('action.copyError')}"),
  'recoverable operation failures must use one theme-aware structured notification path',
);
assert.ok(
  source.includes("showOperationError('message.connectionTestFailed', error, { retry: testConnection })")
    && source.includes("showOperationError('message.extensionInstallFailed', error, {")
    && source.includes("scope: 'extension'")
    && source.includes("showOperationError('message.fileListFailed', error, {")
    && source.includes('retry: () => loadFiles(overridePath)')
    && source.includes("showOperationError('message.tunnelFailed', error, {")
    && !source.includes("messageApi.error(`${t('message.connectionTestFailed')}: ${error}`)")
    && !source.includes("messageApi.error(`${t('message.extensionInstallFailed')}: ${error}`)")
    && !source.includes("messageApi.error(`${t('message.fileListFailed')}: ${error}`)")
    && !source.includes("messageApi.error(`${t('message.tunnelFailed')}: ${error}`)"),
  'connection, extension, file, and tunnel failures must expose structured recovery instead of raw error toasts',
);
assert.ok(
  source.includes("showOperationError('message.credentialFailed', error")
    && source.includes("showOperationError('message.profileImportFailed', error")
    && !source.includes("messageApi.error(`${t('message.credentialFailed')}: ${error}`)")
    && !source.includes("messageApi.error(`${t('message.profileImportFailed')}: ${error}`)"),
  'credential and profile import failures must use the same structured operation feedback',
);
assert.ok(
  source.includes('const [modalApi, modalContextHolder] = Modal.useModal();')
    && source.includes('{modalContextHolder}')
    && !source.includes('Modal.confirm({'),
  'confirmation dialogs must use the theme-aware modal context instead of the static API',
);
assert.equal(
  source.match(/className="tooltip-dropdown-trigger"/g)?.length,
  3,
  'tooltip-wrapped dropdowns must expose stable DOM triggers for focus and popup positioning',
);
assert.ok(
  /\.tooltip-dropdown-trigger\s*\{[\s\S]*?display:\s*inline-flex/.test(styles),
  'tooltip dropdown trigger wrappers must not alter toolbar layout',
);
assert.ok(
  source.includes("const TerminalPane = lazy(() => import('./components/TerminalPane.jsx'));")
    && source.includes('<Suspense fallback={<TerminalLoadingState />}>')
    && !source.includes("import TerminalPane from './components/TerminalPane.jsx';"),
  'the xterm runtime must load only when a terminal session is first rendered',
);
assert.ok(
  source.includes("const AuditReplayPlayer = lazy(() => import('./components/AuditReplayPlayer.jsx'));")
    && source.includes('<Suspense fallback={<ReplayLoadingState />}>')
    && !source.includes('function AuditReplayPlayer({ record })'),
  'the recording player must be isolated and load its terminal runtime only when replay opens',
);
assert.ok(
  replaySource.includes("import { Terminal } from '@xterm/xterm';")
    && replaySource.includes('requestAnimationFrame')
    && replaySource.includes('disableStdin: true')
    && replaySource.includes('terminal.write(output)'),
  'recordings must use a read-only xterm renderer and a frame-based playback clock',
);
assert.ok(
  replaySource.includes('replayPlaybackState({')
    && replaySource.includes('seekReplayTime(current, parsedCast.duration, offset)')
    && replaySource.includes("window.addEventListener('keydown', handleReplayKeyDown);")
    && replaySource.includes("event.code === 'Space'")
    && replaySource.includes("event.key === 'ArrowLeft'")
    && replaySource.includes("event.key === 'ArrowRight'")
    && replaySource.includes("aria-label={t('action.seekBackward5')}")
    && replaySource.includes("aria-label={t('action.seekForward5')}")
    && replaySource.includes("target?.closest?.('.audit-replay-terminal')")
    && replaySource.includes('className={`audit-player-state tone-${playbackState}`}')
    && replaySource.includes("t('replay.eventProgress'"),
  'recording replay must expose video-like keyboard transport, playback state, and frame progress',
);
assert.ok(
  /\.audit-player-state\s*\{[\s\S]*?font-size:\s*11px;/.test(styles)
    && /\.audit-player-state\.tone-playing\s*\{[\s\S]*?color:\s*var\(--success\)/.test(styles),
  'recording playback state must remain compact and visually distinct',
);
assert.ok(
  replaySource.includes('findActiveAuditEventIndex(')
    && replaySource.includes('resolveAuditReplayTime(')
    && replaySource.includes('auditTimelineRef')
    && replaySource.includes("scrollIntoView({ block: 'nearest' })")
    && replaySource.includes('aria-current={active ? \'true\' : undefined}')
    && replaySource.includes('onClick={() => seek(item.replayTime)}')
    && !source.includes('className="audit-timeline-section"'),
  'audit events must be keyboard-accessible replay markers owned by the replay component',
);
assert.ok(
  /\.audit-timeline-event-button\s*\{[\s\S]*?cursor:\s*pointer/.test(styles)
    && /\.audit-timeline-event-button\.is-active\s*\{[\s\S]*?background:/.test(styles),
  'linked audit events must have clear hover and current-playhead states',
);
assert.ok(
  source.includes('const [replayExpanded, setReplayExpanded] = useState(false);')
    && source.includes("width={screens.md === false || replayExpanded ? '100%' : 920}")
    && source.includes("aria-label={t(replayExpanded ? 'action.collapseReplay' : 'action.expandReplay')}")
    && source.includes('replayExpanded ? <FullscreenExitOutlined /> : <FullscreenOutlined />')
    && source.includes('className={`audit-replay-drawer${replayExpanded ? \' is-expanded\' : \'\'}`}'),
  'recording replay must expand to the full workspace and restore without leaving the drawer',
);
assert.ok(
  /\.audit-replay-drawer\.is-expanded\s+\.audit-replay-stage\s*\{[\s\S]*?max-height:\s*72vh/.test(styles),
  'expanded recording replay must use the additional vertical workspace',
);
assert.ok(
  viteConfig.includes("return 'xterm-runtime';")
    && viteConfig.indexOf("return 'xterm-runtime';") < viteConfig.indexOf("return 'vendor-runtime';"),
  'production chunking must keep xterm out of the eagerly preloaded vendor runtime',
);
assert.ok(
  source.includes('const terminalSearchRef = useRef(null);')
    && source.includes("configurableShortcutAction === 'search'")
    && source.includes('terminalSearchRef.current?.select?.();')
    && source.includes('const closeTerminalSearch = () => {')
    && source.includes('ref={terminalSearchRef}'),
  'terminal search must select the current query and return focus to the terminal on Escape',
);
assert.ok(
  source.includes('const [terminalSearchResults, setTerminalSearchResults] = useState({});')
    && source.includes('onSearchResultsChange={(result) => updateTerminalSearchResult(session.id, result)}')
    && /useEffect\(\(\) => \{[\s\S]*?terminalSearch\.trim\(\)[\s\S]*?findNext\?\./.test(source),
  'terminal search must keep result state per session and reapply the query after session changes',
);
assert.ok(
  source.includes('terminalSearchQueriesRef.current[activeKey] === requestKey')
    && source.includes('if (searchResult === undefined)')
    && source.includes('delete terminalSearchQueriesRef.current[activeKey]'),
  'terminal search must not advance again on unrelated status changes and must retry when xterm is not ready',
);
assert.ok(
  terminalPaneSource.includes('searchAddon.current.onDidChangeResults')
    && terminalPaneSource.includes('onSearchResultsChange')
    && terminalPaneSource.includes('terminalSearchOptions'),
  'terminal panes must expose xterm result changes and search with decorations enabled',
);
assert.ok(
  source.includes('terminalSearchRequestKey(terminalSearch, terminalSearchPreferences)')
    && source.includes('validateTerminalSearchQuery(keyword, terminalSearchPreferences)')
    && terminalSearchControlSource.includes('<Popover')
    && terminalSearchControlSource.includes('<Checkbox'),
  'terminal search must isolate option-aware requests and expose compact case, word, and regex controls',
);
assert.ok(
  terminalPaneSource.includes("import { WebLinksAddon } from '@xterm/addon-web-links';")
    && terminalPaneSource.includes('if (!shouldActivateTerminalLink(event)) return;')
    && terminalPaneSource.includes('runtime.BrowserOpenURL(safeUri)')
    && terminalPaneSource.includes('term.current.onScroll')
    && terminalPaneSource.includes('term.current?.scrollToBottom()')
    && terminalPaneSource.includes('className="terminal-scroll-bottom"'),
  'terminal panes must safely open modifier-clicked web links and offer recovery from historical scrolling',
);
assert.ok(
  terminalSearchControlSource.includes('aria-live="polite"')
    && terminalSearchControlSource.includes('resolveTerminalSearchKeyAction(event)')
    && terminalSearchSource.includes("event.key === 'Enter'")
    && terminalSearchSource.includes('event.shiftKey')
    && terminalSearchSource.includes("event.key === 'Escape'"),
  'terminal search feedback must be announced and support Enter, Shift+Enter, and Escape',
);
assert.ok(
  source.includes("window.addEventListener('keydown', handleKeydown, true);")
    && source.includes("window.removeEventListener('keydown', handleKeydown, true);"),
  'global terminal shortcuts must observe xterm key events in the capture phase',
);
assert.ok(
  source.includes("if (isEditableTarget(event.target) && !isTerminalInputTarget(event.target)) return;")
    && source.indexOf("if (isEditableTarget(event.target) && !isTerminalInputTarget(event.target)) return;")
      < source.indexOf('const configurableShortcutAction = resolveConfigurableShortcutAction(event, settings);'),
  'global shortcuts must stop at editable controls before routing actions while remaining available in xterm',
);
assert.ok(
  source.includes('shortcutBindings: defaultShortcutBindings(),')
    && source.includes('shortcutBindings: normalizeShortcutBindings(settings.shortcutBindings),')
    && source.includes('const configurableShortcutAction = resolveConfigurableShortcutAction(event, settings);')
    && source.includes("configurableShortcutAction === 'newTerminal'")
    && source.includes("configurableShortcutAction === 'quickCommands'")
    && source.includes("configurableShortcutAction === 'commandPalette'")
    && source.includes("configurableShortcutAction === 'closeSession'")
    && source.includes("configurableShortcutAction === 'search'")
    && source.includes("configurableShortcutAction === 'reconnect'")
    && source.includes("configurableShortcutAction === 'toggleSidebar'"),
  'high-frequency global shortcuts must resolve from normalized persisted bindings',
);
assert.ok(
  source.includes('const shortcutEditorRows = useMemo(')
    && source.includes('const shortcutKeyOptions = useMemo(')
    && source.includes('updateShortcutBinding(current.shortcutBindings, row.action, value)')
    && source.includes('shortcutBindings: defaultShortcutBindings()')
    && source.includes("messageApi.success(t('message.shortcutsReset'))")
    && /shortcutEditorRows\s*\n\s*\.find\(\(row\) => row\.action === 'commandPalette'\)\?\.shortcut/.test(source),
  'shortcut settings, reset behavior, help, and topbar hints must share one binding model',
);
assert.ok(
  /\.settings-shortcut-editor-grid\s*\{[\s\S]*?grid-template-columns:\s*repeat\(2,\s*minmax\(0,\s*1fr\)\)/.test(styles)
    && /@media \(max-width:\s*720px\)[\s\S]*?\.settings-shortcut-editor-grid\s*\{[\s\S]*?grid-template-columns:\s*1fr/.test(styles),
  'shortcut editor must use two columns when space allows and collapse cleanly on narrow windows',
);
assert.ok(
  /\.shortcut-group-grid\s*\{[\s\S]*?grid-template-columns:\s*repeat\(auto-fit,\s*minmax\(280px,\s*1fr\)\)/.test(styles)
    && /\.shortcut-group code\s*\{[\s\S]*?white-space:\s*nowrap/.test(styles),
  'shortcut reference groups must keep long key combinations readable without wrapping',
);
assert.ok(
  source.includes('const [closedSessions, setClosedSessions] = useState([]);')
    && source.includes("key === 't' && event.shiftKey")
    && source.includes("key: 'restoreClosed'")
    && source.includes('restoreLastClosedSession'),
  'recently closed sessions must be restorable from the menu and Cmd/Ctrl+Shift+T',
);
assert.ok(
  source.includes('workspaceSnapshot={buildWorkspaceSnapshotSummary(workspaceSummary)}')
    && source.includes('disabled={!workspaceSnapshot.hasSnapshot}')
    && source.includes("workspaceSnapshot.hasSnapshot ? 'session.empty.restoreAvailable' : 'session.empty.restoreUnavailable'"),
  'the empty session workspace must only offer restore when a real snapshot exists and explain its state',
);
assert.ok(
  /\.session-empty-panel \.ant-typography\s*\{[\s\S]*?color:\s*var\(--terminal-text\)/.test(styles)
    && /\.session-empty-panel \.ant-typography-secondary\s*\{[\s\S]*?color:\s*color-mix/.test(styles),
  'terminal-toned empty states must retain readable text in both app themes',
);
assert.ok(
  source.includes("configurableShortcutAction === 'closeSession'")
    && source.includes("if (activeKey && selectedNav === 'sessions') confirmRemoveSession(activeKey);"),
  'the configured close shortcut must close the active terminal only inside the session workspace',
);
assert.ok(
  source.includes('const sessionClosePlans = useMemo(() => ({')
    && source.includes("buildSessionClosePlan(sessions, { mode: 'closed' })")
    && source.includes("buildSessionClosePlan(sessions, { keepSessionId: activeKey, mode: 'others' })")
    && source.includes('closable: !session.protected')
    && workspaceStateSource.includes('protected: Boolean(session.protected)')
    && source.includes('toggleSessionProtection(current, sessionId)')
    && source.includes('display.protected &&')
    && /\.session-protection-icon\s*\{/.test(styles),
  'protected sessions must stay visible, resist close actions, and survive workspace snapshots',
);
assert.ok(
  source.includes('const sessionDisplayLabels = useMemo(() => buildSessionDisplayLabels(sessions), [sessions]);')
    && source.includes('const sessionIdentityDisplays = useMemo(() => Object.fromEntries(')
    && source.includes('displayName: sessionDisplayLabels[activeSession.id]')
    && source.includes('displayName={sessionDisplayLabels[session.id]}')
    && source.includes('identityDisplay={sessionIdentityDisplays[session.id]}')
    && source.includes('onCopyTarget={() => copySessionTarget(activeSession)}')
    && source.includes("if (action === 'copyTarget') copySessionTarget(session);")
    && source.includes("if (action === 'copySessionTarget') copySessionTarget();")
    && source.includes("copyTarget: () => copySessionTarget(),")
    && source.includes('activeSessionHasTarget: Boolean(sessionIdentityDisplays[activeKey]?.copyValue)')
    && /\.session-toolbar-context-copy\.ant-btn\s*\{/.test(styles),
  'all session surfaces must share disambiguated names and one safe copy-target action',
);
assert.ok(
  source.includes('restorableSessionCount: closedSessions.length')
    && source.includes("if (action === 'restoreClosed') restoreLastClosedSession();"),
  'the command palette must expose recently closed session recovery when available',
);
assert.ok(
  source.includes('const workspaceActionState = buildWorkspaceActionState({')
    && source.includes('if (workspaceActionState.save.disabled)')
    && source.includes('disabled: workspaceActionState.save.disabled')
    && source.includes('disabled: workspaceActionState.restore.disabled')
    && source.includes('action={workspaceActionState.clear}')
    && source.includes('action={workspaceActionState.restore}')
    && source.includes('action={workspaceActionState.save}'),
  'workspace menu, palette, and settings actions must share truthful availability state',
);
assert.ok(
  source.includes("const openLanguageSettings = () => {")
    && source.includes("setSettingsSection('interface');")
    && source.includes('openLanguageSettings,')
    && source.includes('run: actions.openLanguageSettings'),
  'language entry points must open the interface settings section directly',
);
assert.ok(
  source.includes('resolveSessionShortcutNumber(sessionIds, session.id)')
    && !source.includes('{index < 9 && <Text code>{index + 1}</Text>}'),
  'sidebar shortcut badges must describe the actual numbered session action after active-first sorting',
);
assert.ok(
  source.includes('buildEnabledFileProviders(installedExtensions, settings.disabledExtensionIds)')
    && source.includes('providerType: selectedFileProvider.type')
    && source.includes("fileProviderSupports(selectedFileProvider, 'write')")
    && source.includes("fileProviderSupports(selectedFileProvider, 'delete')")
    && source.includes("fileProviderSupports(selectedFileProvider, 'rename')"),
  'remote files must resolve installed file providers and hide unsupported operations by capability',
);
assert.ok(
  source.includes("fileProviderSupports(selectedFileProvider, 'upload')")
    && source.includes("fileProviderSupports(selectedFileProvider, 'download')"),
  'native file transfers must be negotiated independently from text read and write capabilities',
);
assert.ok(
  source.includes('buildRemoteFileActions(entry, selectedFileProvider.capabilities)')
    && source.includes('await FilesAPI.Rename')
    && source.includes('const confirmDeleteRemoteEntry = (entry) =>')
    && source.includes("title: t('confirm.deleteRemoteEntryTitle')"),
  'remote file rows must expose capability-driven actions, safe rename, and destructive confirmation',
);
assert.ok(
  source.includes('const requestDangerousAction = ({')
    && source.includes('if (settings.confirmDangerousActions === false) return onConfirm();')
    && source.includes('const confirmDeleteAuditRecord = (record) => requestDangerousAction({')
    && source.includes('const confirmClearAuditRecords = () => requestDangerousAction({')
    && source.includes('const confirmUninstallExtension = (extension) => {')
    && source.includes('return requestDangerousAction({')
    && source.includes('const confirmDeleteExtensionSource = (source) => requestDangerousAction({')
    && source.includes('const confirmDeleteQuickCommand = (command) => requestDangerousAction({')
    && source.includes('const confirmStopTunnel = (tunnel, display) => requestDangerousAction({'),
  'persistent data removal, extension uninstall, and tunnel stop must share the dangerous-action preference',
);
assert.ok(
  source.includes('onClick={() => confirmDeleteAuditRecord(record)}')
    && source.includes('onClick={confirmClearAuditRecords}')
    && source.includes('onClick={() => confirmUninstallExtension(extension)}')
    && source.includes('onClick={() => confirmDeleteExtensionSource(source)}')
    && source.includes('onClick={() => confirmDeleteQuickCommand(item)}')
    && source.includes('onClick={() => confirmStopTunnel(item, display)}')
    && source.includes("{t('action.stop')}</Button>"),
  'all destructive controls must call their contextual confirmation wrapper',
);
assert.ok(
  source.includes('buildRemoteFileView(fileEntries, { query: fileQuery, sortBy: fileSort })')
    && source.includes('ref={fileSearchRef}')
    && source.includes("selectedNav === 'files'")
    && source.includes("t('file.visibleCount'")
    && source.includes("fileView.filtered ? 'file.emptyFilteredTitle' : 'empty.noFiles'"),
  'remote files must support provider-neutral filtering, sorting, result counts, and keyboard search focus',
);
assert.ok(
  source.includes('await FilesAPI.UploadWithID(req, transferId)')
    && source.includes('await FilesAPI.DownloadWithID(req, entry.name, transferId)')
    && source.includes('await FilesAPI.CancelTransfer(transfer.id)')
    && source.includes('runtime.EventsOn(`files:transfer:${transferId}`')
    && source.includes('<Progress')
    && source.includes("t('action.newTextFile')")
    && !source.includes('new Blob([content], { type: \'application/octet-stream\' })'),
  'remote files must expose real native transfer progress and cancellation while retaining text-file creation',
);
assert.ok(
  source.includes('language: openLanguageSettings')
    && source.includes("{ key: 'language', icon: <GlobalOutlined />, label: t('action.language') }")
    && (source.match(/className="topbar-utility-action"/g) || []).length === 4
    && /@media \(max-width: 1200px\)[\s\S]*?\.topbar-utility-action\s*\{[\s\S]*?display:\s*none/.test(styles),
  'narrow topbars must move duplicate utility actions into the discoverable workspace menu',
);
assert.ok(
  source.includes('await ExtensionsAPI.InstallOfflineFromDialog()')
    && !source.includes('extensionPackagePath')
    && !source.includes("title={t('drawer.installExtension')}"),
  'offline extension installation must use a native package picker instead of a manual absolute-path form',
);
assert.ok(
  source.includes('const [extensionOfflineInstalling, setExtensionOfflineInstalling] = useState(false)')
    && source.includes("const [extensionUninstallingId, setExtensionUninstallingId] = useState('')")
    && source.includes('const extensionOperationBusy = extensionOfflineInstalling')
    && source.includes('loading={extensionUninstallingId === extension.id}'),
  'extension mutations must expose precise busy state and prevent concurrent registry writes',
);
assert.ok(
  source.includes('await DesktopAPI.SelectSSHConfig()')
    && source.includes('setSshConfigContent(selection.content)')
    && source.includes('loading={sshConfigLoading}')
    && source.includes('className="ssh-config-import-editor"'),
  'SSH Config import must combine a native file picker with editable preview before profile creation',
);
assert.ok(
  source.includes("selectedFileProvider.protocol === 'sftp'")
    && source.includes('resolveSelectedSshProfile(fileProfileId)'),
  'the SFTP extension must retain saved SSH profile reuse without making it a core protocol implementation',
);
assert.ok(
  source.includes('<FileProviderFormFields')
    && source.includes('provider={selectedFileProvider}')
    && source.includes('buildFileProviderFormValues(nextProvider)')
    && source.includes('buildFileProviderConfigValues(selectedFileProvider, values.config || {})')
    && source.includes('buildFileProviderAuthValues(selectedFileProvider, values.auth || {})'),
  'non-SFTP file providers must contribute connection fields without protocol-specific core UI changes',
);
assert.ok(
  source.includes('const saveFileConnectionProfile = async () =>')
    && source.includes('await CredentialsAPI.SaveProviderCredential({')
    && source.includes('const resolveStoredProviderCredential = async (profile) =>')
    && source.includes('await CredentialsAPI.ResolveProviderCredential({ auth: profile.auth })')
    && source.includes("profile.kind === 'file'")
    && source.includes('openFileConnectionProfile(profile)'),
  'file-provider profiles must be reusable from connection management without persisting plugin secrets in profile data',
);
assert.ok(
  source.includes('const openFileProvider = (providerType = \'\') =>')
    && source.includes('const fileProviderItems = actions.fileProviders.map((provider) => ({')
    && source.includes('run: () => actions.openFileProvider(provider.type)'),
  'file providers must be directly discoverable from the command palette without entering a terminal-only drawer',
);
assert.ok(
  source.includes('const openConnectionDrawer = (')
    && source.includes("group = '',")
    && source.includes("openDrawer(type, null, 'connection', group)")
    && source.includes("group: profile?.group || initialGroup")
    && source.includes('saveProfile: resolveProfileSaveDefault({ intent, profile })')
    && source.includes("terminalDrawerIntent === 'session'")
    && source.includes("terminalDrawerIntent === 'edit'"),
  'connection entry points must save profiles by default while transient terminal entry points remain optional',
);
assert.ok(
  source.includes('synchronizeSessionTerminalStatus')
    && source.includes('const updateTerminalStatus = (sessionId, status, revision) =>')
    && source.includes('synchronizeSessionTerminalStatus(current, sessionId, status, revision)')
    && source.includes('updateTerminalStatus(session.id, status, session.revision || 0)'),
  'terminal lifecycle changes must update the matching current session without accepting stale reconnect events',
);
assert.ok(
  terminalPaneSource.includes('interrupt: () =>')
    && terminalPaneSource.includes("SessionAPI.Send(sessionId.current, '\\u0003')")
    && source.includes('onInterrupt={() => interruptSession(session.id)}'),
  'running terminal commands must expose a provider-neutral PTY interrupt through each terminal frame',
);
assert.ok(
  terminalPaneSource.includes('const callbacksRef = useRef({')
    && terminalPaneSource.includes('callbacksRef.current = {')
    && terminalPaneSource.includes('callbacksRef.current.onCommandSubmitted?.(command)')
    && terminalPaneSource.includes('callbacksRef.current.onConfirmPaste?.(risk)')
    && terminalPaneSource.includes('callbacksRef.current.onStatusChange')
    && terminalPaneSource.includes('callbacksRef.current.onAuditEvent?.(')
    && terminalPaneSource.includes('callbacksRef.current.onSessionCreated?.(createdSessionId)')
    && terminalPaneSource.includes('callbacksRef.current.onSessionClosed?.(createdSessionId)'),
  'persistent terminals must dispatch through current callbacks instead of retaining initial app state',
);
assert.ok(
  !terminalPaneSource.includes('const connectingText')
    && !terminalPaneSource.includes('term.current.write(connectingText)'),
  'connection progress must stay in structured status instead of polluting terminal output and recordings',
);
assert.ok(
  source.includes('sessionRecordingIndicatorLabel(recordingFact)')
    && source.includes('sessionAuditIndicatorLabel(auditSummary)')
    && /className=\{`session-recording-indicator[\s\S]{0,240}?onClick=\{onOpenAudit\}/.test(source)
    && /className=\{`session-audit-indicator[\s\S]{0,240}?onClick=\{onOpenAudit\}/.test(source)
    && styles.includes('.session-capture-indicator-label'),
  'recording and audit state must remain readable and open the current session record',
);
assert.ok(
  source.includes("const [auditSessionFilter, setAuditSessionFilter] = useState('all');")
    && source.includes('sessionId: auditSessionFilter,')
    && source.includes("setAuditSessionFilter(sessionId || 'all');")
    && source.includes('className="audit-session-filter"')
    && source.includes('options={auditSessionOptions}'),
  'audit navigation must filter records by the exact session instead of relying on duplicate-prone labels',
);
assert.ok(
  source.includes('upsertAuditSessionRecord(loadAuditRecords(), record)')
    && source.includes('id: buildAuditCaptureID(session),')
    && source.includes('revision: session.revision || 0,')
    && source.includes('if (finalize && updateSession) {')
    && source.includes('saveAuditRecord(session.id, { finalize: true })')
    && source.includes("if (status === 'closed') saveAuditRecord(sessionId, { finalize: true });")
    && source.includes('auditRecordSaved: false,')
    && /const duplicateSession[\s\S]{0,500}?auditEvents:\s*\[\],[\s\S]{0,80}?auditRecordSaved:\s*false,[\s\S]{0,80}?revision:\s*0/.test(source)
    && source.includes('className="audit-live-session-strip"')
    && source.includes('disabled={auditWorkspaceSummary.finalized}')
    && source.includes('saveCurrentAuditSnapshot(auditWorkspaceSession.id)')
    && source.includes("window.addEventListener('beforeunload', finalizeOpenAuditRecords)")
    && source.includes("window.removeEventListener('beforeunload', finalizeOpenAuditRecords)")
    && source.includes('saveAuditRecordRef.current?.(session.id, { finalize: true, updateSession: false })'),
  'audit snapshots must update the current connection segment while close and reconnect finalize complete recordings',
);
assert.ok(
  source.includes('persistAuditRecordSet(localStorage, auditRecordStorageKey, records, options)')
    && source.includes('const nextRecords = upsertAuditSessionRecord(loadAuditRecords(), record);')
    && source.includes('persistAuditRecords(nextRecords, { preferredId: nextRecord.id })')
    && source.includes('if (!persistence.preferredStored)')
    && source.includes("t('message.auditRecordStorageFailed')")
    && source.includes("t('message.auditRecordsPruned'")
    && source.includes('if (!persistence.persisted)'),
  'audit storage pressure must degrade explicitly without blocking session lifecycle actions',
);
assert.ok(
  /\.terminal-status-fact\s*\{[\s\S]*?border:\s*0;[\s\S]*?border-radius:\s*0;[\s\S]*?background:\s*transparent;/.test(styles)
    && /\.terminal-status-fact\.fact-status::before\s*\{[\s\S]*?border-radius:\s*50%;/.test(styles)
    && /\.session-audit-indicator,\s*\.session-recording-indicator,\s*\.provider-runtime-indicator\s*\{[\s\S]*?border:\s*0;[\s\S]*?background:\s*transparent;/.test(styles),
  'terminal status should use a quiet desktop status strip instead of stacked pill controls',
);
assert.ok(
  terminalPaneSource.includes('onConfirmPaste')
    && terminalPaneSource.includes('buildTerminalPasteRisk')
    && !terminalPaneSource.includes('window.confirm')
    && source.includes('pasteConfirmationPending.current')
    && source.includes('confirmation?.destroy()'),
  'all risky paste entry points must use the shared theme-aware confirmation without exposing raw content',
);
assert.ok(
  source.includes('className="settings-drawer"')
    && source.includes("width={screens.sm === false ? '100%' : 560}"),
  'settings must use a readable drawer width and fill very narrow windows',
);
assert.ok(
  /\.settings-drawer \.ant-drawer-body\s*\{\s*padding:\s*0;/.test(styles),
  'settings drawer content must avoid nesting page and drawer padding',
);
assert.ok(
  /\.bridge-alert\s*\{[\s\S]*?margin:\s*10px 12px 8px;/.test(styles),
  'the web preview notice must leave space before scrollable page content',
);
assert.equal(
  source.match(/<SavedSSHProfileSelect/g)?.length,
  2,
  'remote files and tunnels must reuse the same saved SSH connection selector',
);
assert.ok(
  source.includes('resolveSelectedSshProfile')
    && source.includes('const submitPlan = buildTerminalSubmitPlan({')
    && source.includes('sshAuthType')
    && source.includes('sshPrivateKey')
    && source.includes("const [fileProfileId, setFileProfileId] = useState('');")
    && source.includes("const [tunnelProfileId, setTunnelProfileId] = useState('');")
    && source.includes('name: fields.displayName,')
    && !source.includes("Form.useWatch('profileId'"),
  'remote tools must resolve credentials on demand, support both auth modes, and refresh profile-derived names',
);
assert.ok(
  savedSshProfileSource.includes('buildSavedSshConnections')
    && savedSshProfileSource.includes('optionRender')
    && savedSshProfileSource.includes('onManageConnections')
    && savedSshProfileSource.includes('value={value || null}'),
  'the shared SSH selector must expose searchable rich options and a connection management route',
);
assert.ok(
  source.includes("const createSession = async (action = 'create')")
    && source.includes("createSession('save')")
    && source.includes("createSession('saveAndOpen')")
    && source.includes('if (!submitPlan.openSession) return;'),
  'connection management must support save-only without starting a terminal and retain save-and-open',
);
assert.ok(
  source.includes('className="terminal-drawer"')
    && source.includes('className="terminal-drawer-footer"')
    && /\.terminal-drawer-footer\s*\{[\s\S]*?justify-content:\s*space-between;/.test(styles),
  'terminal form actions must use a stable footer instead of crowding the drawer title',
);
assert.ok(
  /createSession\('saveAndOpen'\)[\s\S]*?\{t\('action\.saveAndOpen'\)\}/.test(source),
  'save-and-open must use a visible command label instead of an ambiguous icon-only action',
);
assert.ok(
  /if \(resolvedIntent !== 'session'\) \{[\s\S]*?setSelectedProfileId\(''\);[\s\S]*?setConnectionDetailProfileId\(''\);[\s\S]*?\}/.test(source),
  'opening a connection editor must dismiss the compact connection detail drawer',
);

console.log('app structure tests passed');
