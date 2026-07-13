import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const source = await readFile(new URL('./App.jsx', import.meta.url), 'utf8');
const mainSource = await readFile(new URL('./main.jsx', import.meta.url), 'utf8');
const indexSource = await readFile(new URL('../index.html', import.meta.url), 'utf8');
const styles = await readFile(new URL('../style.scss', import.meta.url), 'utf8');
const viteConfig = await readFile(new URL('../vite.config.js', import.meta.url), 'utf8');
const replaySource = await readFile(new URL('./components/AuditReplayPlayer.jsx', import.meta.url), 'utf8');
const terminalPaneSource = await readFile(new URL('./components/TerminalPane.jsx', import.meta.url), 'utf8');
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
  source.includes('className="session-strip-details"')
    && source.includes('className="session-strip-detail-list"'),
  'session context must remain available through a compact details control',
);
assert.ok(
  /@media \(max-width: 860px\)[\s\S]*?\.session-strip-facts\s*\{[\s\S]*?display:\s*none[\s\S]*?\.session-strip-details(?:\.ant-btn)?\s*\{[\s\S]*?display:\s*inline-flex/.test(styles),
  'narrow session workspaces must replace clipped fact pills with the details control',
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
  source.includes('const [messageApi, messageContextHolder] = message.useMessage();')
    && source.includes('{messageContextHolder}')
    && !/\bmessage\.(?:success|error|warning|info)\(/.test(source),
  'user feedback must use a theme-aware message context instead of the static API',
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

console.log('app structure tests passed');
