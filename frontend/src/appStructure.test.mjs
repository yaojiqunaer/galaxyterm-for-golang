import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const source = await readFile(new URL('./App.jsx', import.meta.url), 'utf8');
const mainGoSource = await readFile(new URL('../../main.go', import.meta.url), 'utf8');
const mainSource = await readFile(new URL('./main.jsx', import.meta.url), 'utf8');
const indexSource = await readFile(new URL('../index.html', import.meta.url), 'utf8');
const styles = await readFile(new URL('../style.scss', import.meta.url), 'utf8');
const viteConfig = await readFile(new URL('../vite.config.js', import.meta.url), 'utf8');
const replaySource = await readFile(new URL('./components/AuditReplayPlayer.jsx', import.meta.url), 'utf8');
const terminalPaneSource = await readFile(new URL('./components/TerminalPane.jsx', import.meta.url), 'utf8');
const savedSshProfileSource = await readFile(new URL('./components/SavedSSHProfileSelect.jsx', import.meta.url), 'utf8');
const activeSessionDeclaration = source.indexOf('const activeSession =');
const firstActiveSessionUsage = source.indexOf('activeSession?.providerType');

assert.notEqual(activeSessionDeclaration, -1, 'App must derive the active session');
assert.notEqual(firstActiveSessionUsage, -1, 'App must use the active session provider scope');
assert.ok(
  activeSessionDeclaration < firstActiveSessionUsage,
  'activeSession must be initialized before any render-time hook dependency reads it',
);

assert.ok(
  /@media \(max-width: 1280px\)[\s\S]*?\.connection-manager-layout,\s*\.connection-manager-layout\.no-detail\s*\{\s*grid-template-columns:\s*minmax\(0, 1fr\)/.test(styles),
  'the compact connection layout must override both populated and empty workbench grids',
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
  !source.includes('<div className="statusbar">')
    && !/\.statusbar\s*\{/.test(styles),
  'the app shell must not reserve a redundant debug footer below terminal status',
);

assert.ok(
  /<Sider[\s\S]*?breakpoint="lg"[\s\S]*?collapsed=\{sidebarCompact\}[\s\S]*?collapsedWidth=\{68\}/.test(source),
  'the workspace sidebar must collapse before narrow desktop layouts become crowded',
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
    && source.includes("document.title = t('app.title');")
    && source.includes("label: t(`locale.${locale}`, locale)"),
  'runtime locale changes must update document metadata and present readable language names',
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
  source.includes('className="topbar-new-terminal"')
    && source.includes('className="command-palette-label"')
    && source.includes('className="command-palette-shortcut"'),
  'topbar primary commands must expose responsive label hooks',
);
assert.ok(
  /@media \(max-width: 860px\)[\s\S]*?\.topbar-new-terminal[\s\S]*?\.command-palette-label/.test(styles),
  'narrow workspaces must collapse primary topbar labels without hiding their commands',
);
assert.ok(
  source.includes('className={`terminal-status-fact session-context-status-fact')
    && source.includes('className={`session-recording-indicator')
    && source.includes('className={`session-audit-indicator'),
  'session context, recording, and audit state must share the terminal status rail',
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
  /\{terminalSearch\.trim\(\)\s*&&\s*\([\s\S]*?action\.findPrevious[\s\S]*?action\.findNext[\s\S]*?\)\}/.test(source),
  'terminal result navigation must only appear while a search query is active',
);
assert.ok(
  /\{activeKey\s*&&\s*selectedNav\s*===\s*'sessions'\s*&&\s*\([\s\S]*?className="terminal-search"/.test(source),
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
  2,
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
  viteConfig.includes("return 'xterm-runtime';")
    && viteConfig.indexOf("return 'xterm-runtime';") < viteConfig.indexOf("return 'vendor-runtime';"),
  'production chunking must keep xterm out of the eagerly preloaded vendor runtime',
);
assert.ok(
  source.includes('const terminalSearchRef = useRef(null);')
    && source.includes("key === 'f' && !event.shiftKey && activeKey && selectedNav === 'sessions'")
    && source.includes('ref={terminalSearchRef}'),
  'Cmd/Ctrl+F must focus terminal output search only inside the session workspace',
);
assert.ok(
  source.includes("window.addEventListener('keydown', handleKeydown, true);")
    && source.includes("window.removeEventListener('keydown', handleKeydown, true);"),
  'global terminal shortcuts must observe xterm key events in the capture phase',
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
  source.includes("key === 'w' && !event.shiftKey && activeKey && selectedNav === 'sessions'")
    && source.includes('confirmRemoveSession(activeKey);'),
  'Cmd/Ctrl+W must close the active terminal only inside the session workspace',
);
assert.ok(
  source.includes('restorableSessionCount: closedSessions.length')
    && source.includes("if (action === 'restoreClosed') restoreLastClosedSession();"),
  'the command palette must expose recently closed session recovery when available',
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
  source.includes('buildRemoteFileActions(entry, selectedFileProvider.capabilities)')
    && source.includes('await FilesAPI.Rename')
    && source.includes('const confirmDeleteRemoteEntry = (entry) =>')
    && source.includes("title: t('confirm.deleteRemoteEntryTitle')"),
  'remote file rows must expose capability-driven actions, safe rename, and destructive confirmation',
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
  source.includes("selectedFileProvider.protocol === 'sftp'")
    && source.includes('resolveSelectedSshProfile(fileProfileId)'),
  'the SFTP extension must retain saved SSH profile reuse without making it a core protocol implementation',
);
assert.ok(
  source.includes('<FileProviderFormFields provider={selectedFileProvider} />')
    && source.includes('buildFileProviderFormValues(nextProvider)')
    && source.includes('config: values.config || {}')
    && source.includes('auth: values.auth || {}'),
  'non-SFTP file providers must contribute connection fields without protocol-specific core UI changes',
);
assert.ok(
  source.includes("const openConnectionDrawer = (type = terminalDefaults.defaultProviderType) => openDrawer(type, null, 'connection');")
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
  !terminalPaneSource.includes('const connectingText')
    && !terminalPaneSource.includes('term.current.write(connectingText)'),
  'connection progress must stay in structured status instead of polluting terminal output and recordings',
);
assert.ok(
  source.includes('sessionRecordingIndicatorLabel(recordingFact)')
    && source.includes('sessionAuditIndicatorLabel(auditSummary)')
    && styles.includes('.session-capture-indicator-label'),
  'recording and audit state must remain readable without relying on icon hover tooltips',
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
  source.includes("if (resolvedIntent !== 'session') setSelectedProfileId('');"),
  'opening a connection editor must dismiss the compact connection detail drawer',
);

console.log('app structure tests passed');
