import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const source = await readFile(new URL('./App.jsx', import.meta.url), 'utf8');
const mainSource = await readFile(new URL('./main.jsx', import.meta.url), 'utf8');
const styles = await readFile(new URL('../style.scss', import.meta.url), 'utf8');
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
  source.includes("const TerminalPane = lazy(() => import('./components/TerminalPane.jsx'));")
    && source.includes('<Suspense fallback={<TerminalLoadingState />}>')
    && !source.includes("import TerminalPane from './components/TerminalPane.jsx';"),
  'the xterm runtime must load only when a terminal session is first rendered',
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

console.log('app structure tests passed');
