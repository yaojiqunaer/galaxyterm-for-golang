import assert from 'node:assert/strict';

const storage = new Map();
globalThis.localStorage = {
  getItem: (key) => storage.get(key) || null,
  setItem: (key, value) => storage.set(key, value),
};
Object.defineProperty(globalThis, 'navigator', {
  configurable: true,
  value: { language: 'en-US' },
});

const { currentLocale, setLocale, t } = await import('./i18n.js');

assert.equal(currentLocale(), 'en-US');
assert.equal(t('nav.sessions'), 'Sessions');
assert.equal(t('error.app.title'), 'GalaxyTerm could not render this workspace');
assert.equal(t('action.sessionDetails'), 'Session details');
assert.equal(t('section.connectionDetails'), 'Connection details');
assert.equal(t('terminal.error.details'), 'Error details');
assert.equal(t('terminal.error.recoveryHint'), 'Check the connection and retry. Copy the error or open the audit record when more detail is needed.');
assert.equal(t('operation.error.reason.network'), 'Network connection failed');
assert.equal(t('operation.error.suggestion.authentication'), 'Review the username, authentication method, and saved credential before trying again.');
assert.equal(t('terminal.status.preparing'), 'Preparing terminal');
assert.equal(t('action.restoreClosedSession'), 'Reopen closed session');
assert.equal(t('session.empty.restoreAvailable', { count: 3, updatedAt: '12:00' }), 'Restore 3 saved sessions from 12:00');
assert.equal(t('session.empty.restoreUnavailable'), 'No saved workspace is available yet');
assert.equal(t('palette.reason.noWorkspaceSession'), 'Open at least one session before saving a workspace.');
assert.equal(t('palette.reason.noWorkspaceSnapshot'), 'Save a workspace before restoring or clearing it.');
assert.equal(t('message.workspaceRestoreSummary', { existing: 2, restored: 3, skipped: 1 }), 'Restored 3 sessions, kept 2 already open, and skipped 1');
assert.equal(t('message.workspaceAlreadyOpen', { count: 2 }), 'All 2 workspace sessions are already open');
assert.equal(t('palette.recentHint'), 'Recently used actions appear first');
assert.equal(t('palette.keyboardHint'), '↑↓ select · Enter run · Esc close');
assert.equal(t('replay.state.playing'), 'Playing');
assert.equal(t('action.seekBackward5'), 'Back 5 seconds');
assert.equal(t('action.seekForward5'), 'Forward 5 seconds');
assert.equal(t('action.expandReplay'), 'Expand replay');
assert.equal(t('action.collapseReplay'), 'Restore replay');
assert.equal(t('action.stop'), 'Stop');
assert.equal(t('action.resetShortcuts'), 'Reset shortcuts');
assert.equal(t('settings.actionShortcuts'), 'Action shortcuts');
assert.equal(t('settings.shortcutBindingHint'), 'Choosing an assigned key swaps the two actions.');
assert.equal(t('message.shortcutsReset'), 'Shortcuts restored to defaults');
assert.equal(t('action.toggleSidebar'), 'Toggle sidebar');
assert.equal(t('field.sidebarMode'), 'Sidebar');
assert.equal(t('sidebar.auto'), 'Auto');
assert.equal(t('settings.sidebarModeHint'), 'Auto collapses the sidebar when the window is narrow.');
assert.equal(t('placeholder.defaultWorkingDirectory'), 'For example /Users/me/project; blank uses your home directory');
assert.equal(t('action.configureTerminal'), 'Configure terminal');
assert.equal(t('action.copySessionTarget'), 'Copy session target');
assert.equal(t('action.findExtension'), 'Find extension');
assert.equal(t('action.disable'), 'Disable');
assert.equal(t('action.openFiles'), 'Open files');
assert.equal(t('action.saveConnection'), 'Save connection');
assert.equal(t('action.updateCredential'), 'Update credential');
assert.equal(t('field.savedConnection'), 'Saved connection');
assert.equal(t('file.savedCredentialActive'), 'Credentials are stored securely and will be used for this connection.');
assert.equal(t('connection.status.fileReady.title'), 'File location ready');
assert.equal(t('hint.connectionListKeyboard'), '↑↓ select · Enter open/focus · Shift+Enter new');
assert.equal(t('action.moveToGroup'), 'Move to Group');
assert.equal(t('confirm.removeConnectionGroupContent', { count: 3 }), 'Its 3 connections move to Ungrouped. Connection settings and credentials are kept.');
assert.equal(t('connection.group.mergeHint', { name: 'Production' }), '“Production” already exists. Confirm to merge into that group.');
assert.equal(t('connection.hint.secondaryOpenNew'), 'Use + to start another connection');
assert.equal(t('placeholder.searchExtensions'), 'Search extensions, providers, or capabilities');
assert.equal(t('action.protectSession'), 'Protect session');
assert.equal(t('action.unprotectSession'), 'Remove session protection');
assert.equal(t('palette.reason.protectedSession'), 'Remove session protection before closing it.');
assert.equal(t('palette.reason.noClosableSession'), 'Only protected sessions match this action.');
assert.equal(t('palette.reason.noSessionTarget'), 'This session does not expose a copyable target.');
assert.equal(t('confirm.closeAllSessionsProtectedContent', { count: 1, protectedCount: 2 }), 'Close 1 unprotected sessions after saving their audit records; keep 2 protected sessions open.');
assert.equal(t('message.terminalStartFailed'), 'Failed to start terminal');
assert.equal(t('confirm.deleteAuditRecordTitle'), 'Delete this recording?');
assert.equal(t('confirm.clearAuditRecordsContent', { count: 12 }), 'All 12 recordings and their audit events will be permanently removed.');
assert.equal(t('confirm.uninstallExtensionContent', { name: 'SFTP', version: '1.2.0' }), 'SFTP 1.2.0 and its providers will be removed. Saved connections are kept.');
assert.equal(t('confirm.disableExtensionTitle', { name: 'SFTP' }), 'Disable SFTP?');
assert.equal(t('confirm.disableExtensionImpactContent', {
  connectionCount: 2,
  name: 'SFTP',
  sessionCount: 1,
}), 'Affected: 2 saved connections and 1 active sessions. Existing sessions stay open, but new sessions cannot start until SFTP is enabled again.');
assert.equal(t('confirm.uninstallExtensionImpactContent', {
  connectionCount: 2,
  name: 'SFTP',
  sessionCount: 1,
  version: '1.2.0',
}), 'Removing SFTP 1.2.0 affects 2 saved connections and 1 active sessions. Active sessions may be interrupted; saved connections remain but cannot reopen until the provider is installed again.');
assert.equal(t('extension.usage.connections', { count: 2 }), '2 connections');
assert.equal(t('confirm.deleteExtensionSourceContent', { name: 'Official', url: 'https://example.com/index.json' }), 'Official · https://example.com/index.json. Installed extensions are not removed.');
assert.equal(t('confirm.stopTunnelContent', { name: 'Database', route: '127.0.0.1:3307 → mysql:3306' }), 'Database · 127.0.0.1:3307 → mysql:3306. Connections using this tunnel will be interrupted.');
assert.equal(t('replay.keyboardHint'), 'Space/K play or pause · Left/Right 5s · Home/End');
assert.equal(t('replay.eventProgress', { current: 3, total: 8 }), '3 / 8 output events');
assert.equal(t('replay.seekEvent', { time: '0:05.0', type: 'command' }), 'Seek to 0:05.0: command');
assert.equal(t('replay.eventUnavailable', { type: 'legacy' }), 'legacy is not linked to this recording');
assert.equal(t('session.status.error'), 'Error');
assert.equal(t('locale.en-US'), 'English');
assert.equal(t('locale.zh-CN'), 'Simplified Chinese');

setLocale('zh-CN');
assert.equal(currentLocale(), 'zh-CN');
assert.equal(t('nav.sessions'), '会话');
assert.equal(t('error.app.title'), 'GalaxyTerm 无法显示当前工作区');
assert.equal(t('action.sessionDetails'), '会话详情');
assert.equal(t('section.connectionDetails'), '连接详情');
assert.equal(t('terminal.error.details'), '错误详情');
assert.equal(t('terminal.error.recoveryHint'), '检查连接配置和网络后重试；需要进一步排查时，可复制错误或打开审计记录。');
assert.equal(t('operation.error.reason.network'), '网络连接失败');
assert.equal(t('operation.error.suggestion.authentication'), '请检查用户名、认证方式和已保存凭据，修正后再试。');
assert.equal(t('terminal.status.preparing'), '正在准备终端');
assert.equal(t('action.restoreClosedSession'), '恢复最近关闭的会话');
assert.equal(t('session.empty.restoreAvailable', { count: 3, updatedAt: '12:00' }), '恢复 12:00 保存的 3 个会话');
assert.equal(t('session.empty.restoreUnavailable'), '目前还没有可恢复的工作区');
assert.equal(t('palette.reason.noWorkspaceSession'), '请先打开至少一个会话，再保存工作区。');
assert.equal(t('palette.reason.noWorkspaceSnapshot'), '请先保存工作区，再执行恢复或清理。');
assert.equal(t('message.workspaceRestoreSummary', { existing: 2, restored: 3, skipped: 1 }), '已恢复 3 个会话，2 个已打开，跳过 1 个');
assert.equal(t('message.workspaceAlreadyOpen', { count: 2 }), '工作区中的 2 个会话已经打开');
assert.equal(t('palette.recentHint'), '最近使用的操作会优先显示');
assert.equal(t('palette.keyboardHint'), '↑↓ 选择 · Enter 执行 · Esc 关闭');
assert.equal(t('replay.state.playing'), '播放中');
assert.equal(t('action.seekBackward5'), '后退 5 秒');
assert.equal(t('action.seekForward5'), '前进 5 秒');
assert.equal(t('action.expandReplay'), '展开回放');
assert.equal(t('action.collapseReplay'), '还原回放');
assert.equal(t('action.stop'), '停止');
assert.equal(t('action.resetShortcuts'), '恢复默认快捷键');
assert.equal(t('settings.actionShortcuts'), '动作快捷键');
assert.equal(t('settings.shortcutBindingHint'), '选择已占用按键时，将自动交换两个动作的快捷键。');
assert.equal(t('message.shortcutsReset'), '快捷键已恢复默认');
assert.equal(t('action.toggleSidebar'), '切换侧边栏');
assert.equal(t('field.sidebarMode'), '侧边栏');
assert.equal(t('sidebar.auto'), '自动');
assert.equal(t('settings.sidebarModeHint'), '自动模式会在窗口较窄时收起侧边栏。');
assert.equal(t('placeholder.defaultWorkingDirectory'), '例如 /Users/me/project；留空使用用户主目录');
assert.equal(t('action.configureTerminal'), '配置终端');
assert.equal(t('action.copySessionTarget'), '复制会话目标');
assert.equal(t('action.findExtension'), '查找扩展');
assert.equal(t('action.disable'), '停用');
assert.equal(t('action.openFiles'), '打开文件');
assert.equal(t('action.saveConnection'), '保存连接');
assert.equal(t('action.updateCredential'), '更新凭据');
assert.equal(t('field.savedConnection'), '已保存连接');
assert.equal(t('file.savedCredentialActive'), '凭据已安全保存，打开此连接时会自动使用。');
assert.equal(t('connection.status.fileReady.title'), '文件位置已就绪');
assert.equal(t('hint.connectionListKeyboard'), '↑↓ 选择 · Enter 打开/定位 · Shift+Enter 新开');
assert.equal(t('action.moveToGroup'), '移动到分组');
assert.equal(t('confirm.removeConnectionGroupContent', { count: 3 }), '分组中的 3 个连接会移动到“未分组”，连接配置和凭据不会删除。');
assert.equal(t('connection.group.mergeHint', { name: '生产' }), '“生产”已存在，确认后会合并到该分组。');
assert.equal(t('connection.hint.secondaryOpenNew'), '使用 + 新开一个连接');
assert.equal(t('placeholder.searchExtensions'), '搜索扩展、Provider 或能力');
assert.equal(t('action.protectSession'), '保护会话');
assert.equal(t('action.unprotectSession'), '取消会话保护');
assert.equal(t('palette.reason.protectedSession'), '请先取消会话保护，再关闭该会话。');
assert.equal(t('palette.reason.noClosableSession'), '符合条件的会话均受保护。');
assert.equal(t('palette.reason.noSessionTarget'), '当前会话没有可复制的目标信息。');
assert.equal(t('confirm.closeAllSessionsProtectedContent', { count: 1, protectedCount: 2 }), '将关闭 1 个未保护会话并保存审计记录；2 个受保护会话保持打开。');
assert.equal(t('message.terminalStartFailed'), '启动终端失败');
assert.equal(t('confirm.deleteAuditRecordTitle'), '删除这条录屏？');
assert.equal(t('confirm.clearAuditRecordsContent', { count: 12 }), '将永久删除全部 12 条录屏及其审计事件。');
assert.equal(t('confirm.uninstallExtensionContent', { name: 'SFTP', version: '1.2.0' }), '将移除 SFTP 1.2.0 及其提供的终端类型；已保存连接会保留。');
assert.equal(t('confirm.disableExtensionTitle', { name: 'SFTP' }), '停用 SFTP？');
assert.equal(t('confirm.disableExtensionImpactContent', {
  connectionCount: 2,
  name: 'SFTP',
  sessionCount: 1,
}), '将影响 2 个保存连接和 1 个活动会话。已有会话保持打开，但重新启用 SFTP 前无法创建新会话。');
assert.equal(t('confirm.uninstallExtensionImpactContent', {
  connectionCount: 2,
  name: 'SFTP',
  sessionCount: 1,
  version: '1.2.0',
}), '卸载 SFTP 1.2.0 将影响 2 个保存连接和 1 个活动会话。活动会话可能中断；保存连接会保留，但重新安装 Provider 前无法再次打开。');
assert.equal(t('extension.usage.connections', { count: 2 }), '2 个连接');
assert.equal(t('confirm.deleteExtensionSourceContent', { name: '官方源', url: 'https://example.com/index.json' }), '官方源 · https://example.com/index.json。已安装扩展不会被删除。');
assert.equal(t('confirm.stopTunnelContent', { name: '数据库', route: '127.0.0.1:3307 → mysql:3306' }), '数据库 · 127.0.0.1:3307 → mysql:3306。正在使用此隧道的连接会中断。');
assert.equal(t('replay.keyboardHint'), 'Space/K 播放或暂停 · 左右键 5 秒 · Home/End');
assert.equal(t('replay.eventProgress', { current: 3, total: 8 }), '已回放 3 / 8 帧');
assert.equal(t('replay.seekEvent', { time: '0:05.0', type: 'command' }), '定位到 0:05.0：command');
assert.equal(t('replay.eventUnavailable', { type: 'legacy' }), 'legacy 未关联到此录屏');
assert.equal(t('session.status.error'), '异常');
assert.equal(t('locale.en-US'), 'English');
assert.equal(t('locale.zh-CN'), '简体中文');
assert.equal(t('label.defaultShell'), '默认 Shell');
assert.equal(t('filter.allProviders'), '全部类型');
assert.equal(t('metric.builtinProviders'), '内置终端类型');
assert.equal(t('section.installedProviders'), '已安装终端类型');
assert.equal(t('extension.sftp'), 'SFTP 文件扩展');
assert.equal(t('file.noProviderHint'), '安装 SFTP、FTP、S3 或兼容的文件协议扩展后即可浏览远程文件。');
[
  'operation.error.reason.unavailable',
  'operation.error.suggestion.unavailable',
  'placeholder.auditSearch',
].forEach((key) => assert.doesNotMatch(t(key), /Provider/, `${key} must use user-facing Chinese terminology`));

setLocale('en-US');
assert.equal(currentLocale(), 'en-US');
assert.equal(t('nav.sessions'), 'Sessions');
assert.equal(t('confirm.closeAllSessionsContent', { count: 2 }), '2 sessions will be closed after saving their audit records.');
