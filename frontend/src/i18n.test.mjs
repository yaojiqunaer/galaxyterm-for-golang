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

setLocale('zh-CN');
assert.equal(currentLocale(), 'zh-CN');
assert.equal(t('nav.sessions'), '会话');
assert.equal(t('error.app.title'), 'GalaxyTerm 无法显示当前工作区');
assert.equal(t('action.sessionDetails'), '会话详情');

setLocale('en-US');
assert.equal(currentLocale(), 'en-US');
assert.equal(t('nav.sessions'), 'Sessions');
assert.equal(t('confirm.closeAllSessionsContent', { count: 2 }), '2 sessions will be closed after saving their audit records.');
