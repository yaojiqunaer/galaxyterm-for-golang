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
assert.equal(t('session.status.error'), '异常');
assert.equal(t('locale.en-US'), 'English');
assert.equal(t('locale.zh-CN'), '简体中文');

setLocale('en-US');
assert.equal(currentLocale(), 'en-US');
assert.equal(t('nav.sessions'), 'Sessions');
assert.equal(t('confirm.closeAllSessionsContent', { count: 2 }), '2 sessions will be closed after saving their audit records.');
